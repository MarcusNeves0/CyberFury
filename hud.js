// Placar e fim de luta
// Barras de vida e energia, ícones de status, estatísticas e a comemoração do vencedor.

// --- Placar (HUD) ---
function makeEl(tag, className, parent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
}

function makeBar(outerClass, innerClass, parent) {
    const outer = makeEl('div', outerClass, parent);
    const fill = makeEl('div', innerClass, outer);
    const text = makeEl('span', 'bar-text', outer);
    return { outer, fill, text };
}

// Uma coluna por time e um cartão por lutador; as referências ficam guardadas em fighter.hud
function buildHUD() {
    hud.innerHTML = '';
    hud.classList.toggle('hud-compact', teamSizeOf(match.mode) > 1);
    for (const team of [0, 1]) {
        const column = makeEl('div', `team-hud team-${team}`, hud);
        for (const f of fighters.filter(f => f.team === team)) {
            const card = makeEl('div', 'player-hud', column);
            const title = makeEl('h3', '', card);
            const name = makeEl('span', '', title);
            name.innerText = f.name;
            title.appendChild(document.createTextNode(' '));
            const tag = makeEl('span', 'controller-tag', title);
            tag.innerText = f.isPlayer ? f.controller.toUpperCase() : 'IA';
            f.hud = {
                card,
                health: makeBar('health-bar-outer', 'health-bar-inner', card),
                energy: makeBar('energy-bar-outer', 'energy-bar-inner', card),
                transform: f.characterType === 'zarek' ? makeBar('transform-bar-outer', 'transform-bar-inner', card) : null,
                status: makeEl('div', 'status-effects', card),
                statusHtml: '',
            };
        }
    }
}

// Só mexe no HTML quando o valor muda (escrever todo quadro força o navegador a recalcular a página)
function setIfChanged(target, prop, value) {
    if (target[prop] !== value) target[prop] = value;
}

function updateHUD() {
    for (const f of fighters) {
        if (!f.hud) continue;
        const health = Math.ceil(f.health), energy = Math.ceil(f.energy);
        setIfChanged(f.hud.health.fill.style, 'width', (health / f.maxHealth) * 100 + '%');
        setIfChanged(f.hud.health.text, 'innerText', `${health} / ${f.maxHealth}`);
        // Barra de energia: cheia = ultimate pronta
        const ready = !f.isDead && ultReady(f);
        setIfChanged(f.hud.energy.fill.style, 'width', Math.min(100, (energy / f.maxEnergy) * 100) + '%');
        setIfChanged(f.hud.energy.text, 'innerText', ready ? 'ULTIMATE PRONTA!' : `${energy} / ${f.maxEnergy}`);
        if (f.hud.energy.fill.classList.contains('ready') !== ready) f.hud.energy.fill.classList.toggle('ready', ready);
        if (f.hud.card.classList.contains('dead') !== f.isDead) f.hud.card.classList.toggle('dead', f.isDead);
        if (f.hud.transform) updateTransformBar(f);
        updateStatusIcons(f);
    }
}

// Barra de transformação: só existe para o Zarek
function updateTransformBar(fighter) {
    const bar = fighter.hud.transform;
    setIfChanged(bar.fill.style, 'width', (fighter.zarekCharge / ZAREK_CHARGE_MAX) * 100 + '%');
    setIfChanged(bar.fill, 'className', 'transform-bar-inner' + (fighter.zarekForm ? ` form-${fighter.zarekForm}` : ''));
    setIfChanged(bar.text, 'innerText',
        fighter.zarekForm === 'red' ? 'RUBRA' :
        fighter.zarekForm === 'blue' ? 'UMBRAL' :
        `${fighter.zarekCharge} / ${ZAREK_CHARGE_MAX}`);
}

// Ícones de efeito; só reescreve o HTML quando algo muda
function updateStatusIcons(fighter) {
    let html = '';
    if (fighter.bleedStacks > 0) html += `<span class="status-icon">🩸<span class="stack-count">${fighter.bleedStacks}</span></span>`;
    if (fighter.burnDuration > 0) html += `<span class="status-icon">🌋</span>`;
    if (fighter.curseStacks > 0) html += `<span class="status-icon">💀<span class="stack-count">${fighter.curseStacks}</span></span>`;
    if (fighter.poisonStacks > 0) html += `<span class="status-icon">🧪<span class="stack-count">${fighter.poisonStacks}</span></span>`;
    if (fighter.adrenaline > 0) html += `<span class="status-icon">💗<span class="stack-count">x${(1 + 0.5 * fighter.adrenaline).toFixed(1)}</span></span>`;
    if (fighter.frenzyTimer > 0) html += `<span class="status-icon">🔥</span>`;
    if (fighter.slowTimer > 0) html += `<span class="status-icon">🕸️</span>`;
    if (isPossessed(fighter)) html += `<span class="status-icon">👁️</span>`;
    if (fighter.characterType === 'rhino' && fighter.rhinoRun >= RHINO_RUN_STEPS) html += `<span class="status-icon">🦏</span>`;
    if (fighter.characterType === 'kenji' && fighter.attackSpeedMultiplier > 1) {
        html += `<span class="status-icon">✨<span class="stack-count">x${fighter.attackSpeedMultiplier.toFixed(1)}</span></span>`;
    }
    if (fighter.characterType === 'craque') html += `<span class="status-icon">⚽️<span class="stack-count">${fighter.ballCount}</span></span>`;
    if (html !== fighter.hud.statusHtml) {
        fighter.hud.status.innerHTML = html;
        fighter.hud.statusHtml = html;
    }
}

// --- Derrota e Fim de Jogo ---
function knockOut(fighter) {
    fighter.isDead = true;
    fighter.deathTimer = DEATH_DURATION;
    const killer = fighter.lastAttacker;
    if (killer && killer.team !== fighter.team) killer.stats.kos++;
    fighter.health = 0;
    fighter.stopChanneling();
    fighter.isDefending = false;
    fighter.attackTimer = 0;
    if (fighter.isInsideOpponent && fighter.zarekHost) fighter.exitHost(fighter.zarekHost);
    turrets.filter(t => t.owner === fighter).forEach(t => t.destroy(true)); // as torretas caem junto com o Gear
    fighter.mambaCloudTimer = 0;
    // Aspas: cada inimigo derrotado reforça o próximo Exército das Sombras (a sombra dele voa até o Aspas)
    for (const aspas of fighters.filter(f => alive(f) && f.characterType === 'aspas' && f.team !== fighter.team)) {
        if (aspas.shadowBonus >= ASPAS_ARMY_BONUS_MAX) continue;
        aspas.shadowBonus++;
        floatingTexts.push(new FloatingText(aspas.x, aspas.y - aspas.height - 18, '+1 SOMBRA', '#b28cff'));
        const dx = aspas.x - fighter.x, dy = aspas.chestY - fighter.chestY;
        for (let i = 0; i < 12; i++) {
            particles.push(new Particle(fighter.x, fighter.chestY, i % 2 ? '#7a4dff' : '#1a1030', 0, { x: dx / 40 + (Math.random() - 0.5) * 2, y: dy / 40 + (Math.random() - 0.5) * 2 }));
        }
    }
    sfx.play('ko');
    for (let i = 0; i < 25; i++) {
        particles.push(new Particle(fighter.x, fighter.chestY, TEAM_COLORS[fighter.team], 0, { x: (Math.random() - 0.5) * 7, y: (Math.random() - 0.5) * 7 }));
    }
}

function checkGameOver() {
    const aliveTeams = new Set(fighters.filter(alive).map(f => f.team));
    if (aliveTeams.size > 1) return;

    gameState = 'GAMEOVER';
    aiControllers.forEach(ai => ai.stop());
    cancelAnimationFrame(gameLoopId);
    gameOverScreen.classList.remove('hidden');
    showMatchStats();

    const winningTeam = [...aliveTeams][0];
    const survivors = fighters.filter(f => alive(f) && f.team === winningTeam);
    if (winningTeam === undefined) {
        winText.innerText = 'EMPATE!';
        return;
    }
    winText.innerText = match.mode === '1v1'
        ? `${survivors[0].name.toUpperCase()} WINS!`
        : `${TEAM_NAMES[winningTeam]} VENCE!`;
    winText.style.color = match.mode === '1v1' ? '' : TEAM_COLORS[winningTeam];

    // Todo o time vencedor comemora
    survivors.forEach(f => { f.isCelebrating = true; f.isAttacking = false; f.moveX = 0; f.moveY = 0; });
    startWinnerZoom(survivors.find(f => f.isPlayer) || survivors[0]);
}

// Tabela do fim da luta: dano causado, dano sofrido, cura e abates de cada lutador (⭐ = destaque da partida)
function showMatchStats() {
    const score = f => f.stats.dealt + f.healedTotal + f.stats.kos * 150;
    const best = fighters.reduce((a, b) => (score(b) > score(a) ? b : a), fighters[0]);
    const n = v => Math.round(v);
    const rows = [...fighters].sort((a, b) => a.team - b.team).map(f => `
        <tr style="color: ${TEAM_COLORS[f.team]}">
            <td class="stats-name">${f === best ? '⭐ ' : ''}${f.name}</td>
            <td>${n(f.stats.dealt)}</td><td>${n(f.stats.taken)}</td><td>${n(f.healedTotal)}</td><td>${f.stats.kos}</td>
        </tr>`).join('');
    matchStatsEl.innerHTML = `<table>
        <thead><tr><th></th><th>Dano</th><th>Sofrido</th><th>Cura</th><th>Abates</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

let zoomFactor = 1;
let winnerToZoom = null;
let zoomLoopId = null;
function startWinnerZoom(winner) {
    winnerToZoom = winner;
    zoomFactor = 1;

    const confettiColors = ['#ff4dff', '#00ffff', '#ffe34a', '#6dff8a', '#ff7a1a'];
    function zoomLoop() {
        if (zoomFactor > 2.5) {
            winnerToZoom = null;
            cancelAnimationFrame(zoomLoopId);
            return;
        }
        zoomFactor += 0.01;

        // A luta parou, mas a queda de quem perdeu e o confete continuam
        fighters.forEach(f => { if (f.isDead && f.deathTimer > 0) f.deathTimer--; });
        if (Math.random() < 0.8) {
            const c = new Particle(winnerToZoom.x + (Math.random() - 0.5) * 120, winnerToZoom.y - 110, confettiColors[Math.floor(Math.random() * confettiColors.length)], 0,
                { x: (Math.random() - 0.5) * 2, y: 1 + Math.random() * 1.5 });
            c.radius = 1.5 + Math.random() * 1.5;
            particles.push(c);
        }
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.life > 0);

        draw();

        ctx.save();
        ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
        ctx.translate(winnerToZoom.x, winnerToZoom.chestY);
        ctx.scale(zoomFactor, zoomFactor);
        ctx.translate(-winnerToZoom.x, -winnerToZoom.chestY);
        winnerToZoom.draw();
        ctx.restore();

        zoomLoopId = requestAnimationFrame(zoomLoop);
    }
    zoomLoop();
}
