// Cybernetic Fury — laço principal
// Física, o passo do jogo (60 por segundo), o desenho de cada quadro e o início/fim das partidas.
// Depende de todos os outros arquivos (ordem no index.html).

// --- Física ---
// Mantém todos dentro da arena, fora dos obstáculos e sem sobrepor uns aos outros
function resolveCollisions() {
    const solid = fighters.filter(f => alive(f) && !f.isInsideOpponent && !f.heldBy); // quem o Coleone carrega não colide
    for (let i = 0; i < solid.length; i++) {
        for (let j = i + 1; j < solid.length; j++) {
            const a = solid[i], b = solid[j];
            const d = distance(a, b);
            const overlap = a.radius + b.radius - d;
            if (overlap > 0) {
                const dir = d > 0 ? { x: (a.x - b.x) / d, y: (a.y - b.y) / d } : { x: 1, y: 0 };
                a.x += dir.x * overlap / 2; a.y += dir.y * overlap / 2;
                b.x -= dir.x * overlap / 2; b.y -= dir.y * overlap / 2;
            }
        }
    }
    for (const f of solid) {
        // Torretas são sólidas
        for (const t of turrets) {
            const d = Math.hypot(f.x - t.x, f.y - t.y);
            const overlap = f.radius + t.radius - d;
            if (overlap > 0 && d > 0) { f.x += (f.x - t.x) / d * overlap; f.y += (f.y - t.y) / d * overlap; }
        }
        for (const o of obstacles) {
            if (isRound(o)) {
                const d = Math.hypot(f.x - o.x, f.y - o.y);
                const overlap = f.radius + o.r - d;
                if (overlap > 0 && d > 0) { f.x += (f.x - o.x) / d * overlap; f.y += (f.y - o.y) / d * overlap; }
            } else {
                const p = closestPointOnRect(f.x, f.y, o);
                const d = Math.hypot(f.x - p.x, f.y - p.y);
                const overlap = f.radius - d;
                if (overlap > 0) {
                    if (d > 0) { f.x += (f.x - p.x) / d * overlap; f.y += (f.y - p.y) / d * overlap; }
                    else f.y = o.y - f.radius; // centro dentro da caixa: empurra para cima
                }
            }
        }
        f.x = Math.max(arena.left, Math.min(arena.right, f.x));
        f.y = Math.max(arena.top, Math.min(arena.bottom, f.y));
    }
}

// --- Laço Principal ---
// A lógica roda sempre a 60 passos por segundo, não importa a taxa de quadros do monitor
const STEP_MS = 1000 / 60;
let lastFrameTime = null, timeAccumulator = 0;

function step() {
    // Tribunal do Cangeras: a luta inteira fica congelada enquanto o julgamento acontece
    if (courtSession) {
        updateCourt();
        updatePhones();
        return;
    }
    // Congela no impacto do soco forte (só alguns passos)
    if (hitStop > 0) {
        hitStop--;
        updatePhones();
        return;
    }
    aiControllers.forEach(ai => ai.tick());
    // Humanos sempre miram no inimigo mais próximo; a IA escolhe o alvo, mas troca se ele cair
    for (const f of fighters) {
        if (!alive(f)) continue;
        if (f.isPlayer || !alive(f.target)) f.target = nearestEnemy(f);
    }
    for (const f of fighters) {
        if (alive(f)) f.update();
    }

    resolveCollisions();

    // Curas: área da Celestia (passiva, funciona até atordoada) e flores da Flora
    for (const f of fighters) {
        if (alive(f) && f.characterType === 'celestia') f.updateCelestiaAura();
    }
    healingFlowers.forEach(flower => flower.update());
    healingFlowers = healingFlowers.filter(flower => !flower.done);
    for (const f of fighters) {
        if (alive(f) && f.characterType === 'nyx') f.updateNyxLink();
        if (alive(f) && f.characterType === 'mamba') f.updateMambaCloud();
        if (alive(f) && f.characterType === 'roxy') f.updateRoxy();
        if (alive(f) && f.characterType === 'weaver') { f.updateWeaverPull(); f.updateWeaverKick(); }
        if (alive(f) && f.characterType === 'sina') f.updateSina();
    }
    turrets.forEach(t => t.update());
    turrets = turrets.filter(t => !t.done);
    shadowSoldiers.forEach(s => s.update());
    shadowSoldiers = shadowSoldiers.filter(s => !s.done);
    lifeOrbs.forEach(orb => orb.update());
    lifeOrbs = lifeOrbs.filter(orb => !orb.done);
    updatePhones();
    floatingTexts.forEach(t => t.update());
    floatingTexts = floatingTexts.filter(t => t.life > 0);

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);

    updateProjectiles();
    updateKairo();
    updateWalls();
    updateHazards();
    updateSinaBoats();
    updateColeoneBalls();
    if (window.pixelFx) pixelFx.update();
    bershowSlashes.forEach(s => s.life--);
    bershowSlashes = bershowSlashes.filter(s => s.life > 0);
    updateMap();
    shockwaves.forEach(w => w.life--);
    shockwaves = shockwaves.filter(w => w.life > 0);
    screenShake = screenShake > 0.3 ? screenShake * 0.85 : 0;

    if (training) updateTraining();
    announcer.update();
    for (const f of fighters) {
        if (!f.isDead && f.health <= 0) knockOut(f);
        else if (f.isDead && f.deathTimer > 0) f.deathTimer--;
    }

    checkGameOver();
}

function gameLoop(now) {
    if (gameState !== 'FIGHT') return;
    gameLoopId = requestAnimationFrame(gameLoop);

    pollGamepads();
    if (lastFrameTime === null) lastFrameTime = now;
    timeAccumulator += Math.min(250, now - lastFrameTime); // evita "pular" muito tempo após a aba voltar
    // Nunca recupera mais que 1/4 de segundo de uma vez: um quadro lento não vira uma bola de neve de passos
    timeAccumulator = Math.min(timeAccumulator, 250);
    lastFrameTime = now;
    while (timeAccumulator >= STEP_MS && gameState === 'FIGHT') {
        // O passo conta mesmo se der erro (antes o tempo acumulava e o jogo travava tentando recuperar)
        timeAccumulator -= STEP_MS;
        try { step(); } catch (e) { reportError(e); }
    }

    try { draw(); } catch (e) { reportError(e); }
    try { updateHUD(); } catch (e) { reportError(e); }
}

// Um erro no meio da luta não trava mais o jogo: ele segue e o erro aparece num aviso pequeno no canto
// (para mandar um print). O mesmo erro só aparece uma vez a cada 10 s.
let lastErrorShown = { text: '', at: 0 };
function reportError(e) {
    const text = `${e && e.message || e}`;
    const where = ((e && e.stack) || '').split('\n').slice(1, 3).map(l => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' ← ');
    console.error('Erro no jogo:', e);
    if (text === lastErrorShown.text && Date.now() - lastErrorShown.at < 10000) return;
    lastErrorShown = { text, at: Date.now() };
    let box = document.getElementById('error-toast');
    if (!box) {
        box = document.createElement('div');
        box.id = 'error-toast';
        box.className = 'error-toast';
        document.body.appendChild(box);
    }
    box.innerText = `⚠ Erro (o jogo continuou): ${text}\n${where}`;
    box.classList.add('show');
    clearTimeout(box.hideTimer);
    box.hideTimer = setTimeout(() => box.classList.remove('show'), 12000);
}
window.addEventListener('error', e => reportError(e.error || e.message));

function draw() {
    rigWarmTick();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    if (screenShake > 0) ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    ctx.imageSmoothingEnabled = false;
    drawArenaFloor();
    drawMapGround();

    // Áreas de cura, avisos de explosão e bolas no chão ficam por baixo de tudo
    fighters.forEach(f => { if (alive(f) && f.characterType === 'celestia') drawCelestiaAura(f); });
    drawHazards();
    drawSinaBoatShadows();
    drawShockwaves();
    drawWalls();
    fighters.forEach(f => { if (alive(f) && f.mambaCloudTimer > 0) drawMambaCloud(f); });
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    groundBalls.forEach(ball => ctx.fillText('⚽️', ball.x, ball.y));
    ctx.textAlign = 'start';
    fighters.forEach(f => { if (f.dunkHoop) drawDunkHoop(f.dunkHoop); });

    // Quem está mais embaixo na tela é desenhado na frente
    const drawables = [
        ...obstacles.map(o => ({ y: isRound(o) ? o.y : o.y + o.h, draw: () => drawObstacle(o) })),
        ...bushes.map(b => ({ y: b.y + b.r * 0.4, draw: () => drawBush(b) })),
        ...fighters.map(f => ({ y: f.y, draw: () => {
            // Dentro do arbusto: meio transparente (e o arbusto é desenhado por cima)
            if (mapId === 'garden' && alive(f) && inBush(f)) { ctx.globalAlpha = 0.5; f.draw(); ctx.globalAlpha = 1; } else f.draw();
        } })),
        ...turrets.map(t => ({ y: t.y, draw: () => t.draw() })),
        ...shadowSoldiers.map(s => ({ y: s.y, draw: () => s.draw() })),
    ].sort((a, b) => a.y - b.y);
    drawables.forEach(d => d.draw());

    for (const f of fighters) {
        if (f.isInsideOpponent && alive(f.zarekHost)) drawZarekMark(f, f.zarekHost);
        // Choque do Spark: com a pixelfx o raio é um efeito; sem ela, a corrente de ⚡ de antes
        if (alive(f) && f.isChannelingSpecial && alive(f.channelTarget) && !window.pixelFx) drawLightningChain(f, f.channelTarget);
        if (alive(f) && f.nyxLinkTimer > 0 && alive(f.nyxLinkEnemy)) drawNyxLink(f);
        if (alive(f) && f.pullTarget && alive(f.pullTarget)) drawWebLine(f, f.pullTarget);
        if (alive(f) && f.hookTarget && alive(f.hookTarget)) drawAnchorChain(f, f.hookTarget);
    }
    lifeOrbs.forEach(orb => orb.draw());

    projectiles.forEach(p => p.draw());
    drawKairo();
    if (window.pixelFx) pixelFx.draw(ctx); // efeitos de pixel art (pixelfx)
    coleoneBalls.forEach(drawColeoneBall);
    drawBershowSlashes();
    particles.forEach(p => p.draw());
    drawSinaBoatShips();
    fighters.forEach(f => { if (alive(f) && f.characterType === 'sina') drawSinaRoulette(f); });
    healingFlowers.forEach(flower => flower.draw());
    fighters.forEach(f => { if (alive(f) && f.sentenceTimer > 0) drawSentenceMark(f); });
    floatingTexts.forEach(t => t.draw());
    drawMapOverlay();
    announcer.draw();
    if (courtSession) drawCourt(courtSession);
}

function drawLightningChain(attacker, defender) {
    const startX = attacker.x, startY = attacker.chestY;
    const dx = defender.x - startX, dy = defender.chestY - startY;
    const segments = Math.floor(Math.hypot(dx, dy) / 18);

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        ctx.fillText('⚡️', startX + dx * t + (Math.random() - 0.5) * 8, startY + dy * t + (Math.random() - 0.5) * 8);
    }
    ctx.textAlign = 'start';
}

// --- Início do Jogo ---
// Monta os dois times: cada humano com o personagem escolhido, o resto sorteado sem repetir
function createFighters() {
    if (match.training) { createTrainingFighters(); return; }
    const teamSize = teamSizeOf(match.mode);
    const pool = CHARACTERS.filter(c => !match.picks.includes(c.id)).sort(() => Math.random() - 0.5);
    const byId = id => CHARACTERS.find(c => c.id === id);
    const teams = [[], []];
    // Cada humano entra no time que escolheu no HUB, com o lutador que escolheu na seleção
    activePlayers().forEach((player, i) => teams[teamOf(player)].push({ char: byId(match.picks[i]), controller: player }));
    // Em 2v2 e 3v3, cada time recebe pelo menos uma healer (sorteada entre as que sobraram)
    if (FORCE_HEALER_PER_TEAM && teamSize > 1) {
        for (const team of teams) {
            // Time já lotado de humanos (ou com healer) fica como está
            if (team.length >= teamSize || team.some(m => HEALERS.includes(m.char.id))) continue;
            const healerIndex = pool.findIndex(c => HEALERS.includes(c.id));
            if (healerIndex >= 0) team.push({ char: pool.splice(healerIndex, 1)[0], controller: 'ai' });
        }
    }
    for (const team of teams) {
        while (team.length < teamSize) team.push({ char: pool.pop(), controller: 'ai' });
    }

    fighters = [];
    const h = arena.bottom - arena.top;
    teams.forEach((members, team) => {
        members.forEach((member, i) => {
            // Time 0 nasce à esquerda, time 1 à direita, espalhados na vertical
            const x = team === 0 ? arena.left + 60 : arena.right - 60;
            const y = arena.top + h * (i + 1) / (members.length + 1);
            const f = new Fighter(x, y, member.char.name, member.char.id, team, member.controller);
            if (member.controller !== 'ai') {
                const input = match.inputs[member.controller];
                if (input.type === 'gamepad' && input.index !== null) {
                    f.gamepadIndex = input.index;
                } else if (input.type === 'phone') {
                    f.onPhone = true; // os comandos chegam pelo phone.js
                } else {
                    // Dois jogadores no teclado dividem as teclas; sozinho no teclado usa o esquema completo
                    f.keymap = keymapFor(member.controller);
                }
            }
            fighters.push(f);
        });
    });
}

// --- Treino ---
// Você contra um boneco parado no meio da arena. Ninguém morre (a vida volta depois de 2 s sem apanhar),
// sua energia fica sempre cheia e a luta não acaba: sai pelos botões da barra de treino.
let training = null;

function createTrainingFighters() {
    const player = activePlayers()[0];
    const char = CHARACTERS.find(c => c.id === match.picks[0]);
    const dummyId = char.id === TRAINING_DUMMY ? TRAINING_DUMMY_SPARE : TRAINING_DUMMY;
    const dummyChar = CHARACTERS.find(c => c.id === dummyId);
    const w = arena.right - arena.left, y = (arena.top + arena.bottom) / 2;
    const me = new Fighter(arena.left + w * 0.3, y, char.name, char.id, 0, player);
    const input = match.inputs[player];
    if (input.type === 'gamepad' && input.index !== null) me.gamepadIndex = input.index;
    else if (input.type === 'phone') me.onPhone = true;
    else me.keymap = keymapFor(player);
    const dummy = new Fighter(arena.left + w * 0.62, y, 'Boneco de treino', dummyChar.id, 1, 'ai');
    dummy.isDummy = true; // sem IA: fica parado apanhando
    fighters = [me, dummy];
    training = { dummy, comboStart: 0, best: 0 };
}

function updateTraining() {
    for (const f of fighters) {
        // Energia infinita (as recargas das habilidades continuam valendo); o boneco não usa a dele
        f.energy = f.isDummy ? 0 : f.maxEnergy;
        // Ninguém morre; depois de 2 s sem apanhar, a vida volta inteira
        if (f.trainingTaken === undefined) f.trainingTaken = f.stats.taken;
        if (f.stats.taken > f.trainingTaken) { f.trainingTaken = f.stats.taken; f.trainingQuiet = 0; }
        else f.trainingQuiet = (f.trainingQuiet || 0) + 1;
        if (f.health < 1) f.health = 1;
        if (f.trainingQuiet === TRAINING_RESET) f.health = f.maxHealth;
    }
    // Contador de dano no boneco: soma a sequência de golpes; zera depois de 2 s parado
    const d = training.dummy;
    if (d.trainingQuiet === TRAINING_RESET) training.comboStart = d.stats.taken;
    const combo = Math.round(d.stats.taken - training.comboStart);
    training.best = Math.max(training.best, combo);
    setIfChanged(training.comboEl, 'innerText', `Dano no boneco: ${combo}`);
    setIfChanged(training.bestEl, 'innerText', `Maior sequência: ${training.best}`);
}

// Barra em cima da arena: dano no boneco e os botões para trocar de lutador ou sair
function buildTrainingBar() {
    const bar = makeEl('div', 'training-bar', document.getElementById('game-container'));
    makeEl('span', 'training-tag', bar).innerText = '🎯 TREINO · energia infinita';
    training.comboEl = makeEl('span', 'training-combo', bar);
    training.bestEl = makeEl('span', 'training-best', bar);
    const swap = makeEl('button', 'training-button', bar);
    swap.innerText = '↺ Trocar lutador';
    swap.addEventListener('click', () => { stopMatch(); match.picks = []; openSelection(); });
    const leave = makeEl('button', 'training-button', bar);
    leave.innerText = '✕ Sair do treino';
    leave.addEventListener('click', goToMenu);
}

async function startGame() {
    try {
        await Tone.start();
        console.log("Contexto de áudio iniciado.");
    } catch (e) {
        console.error("Erro ao iniciar áudio", e);
    }

    renderControls();
    showScreen(loadingScreen);

    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        particles = [];
        projectiles = [];
        healingFlowers = [];
        floatingTexts = [];
        groundBalls = [];
        courtSession = null;
        hitStop = 0;
        if (window.pixelFx) pixelFx.clear();
        setupArena();
        createFighters();
        announceFightersToPhones();
        buildHUD();
        if (match.training) buildTrainingBar();

        aiControllers = fighters.filter(f => !f.isPlayer && !f.isDummy).map(f => new AI(f));
        aiControllers.forEach(ai => ai.start());

        gameState = 'FIGHT';
        announcer.onStart();
        rigWarm(fighters); // monta os quadros de passada e golpe aos poucos (rig.js)
        lastFrameTime = null;
        timeAccumulator = 0;
        gameLoopId = requestAnimationFrame(gameLoop);
    }, 3000);
}

function stopMatch() {
    cancelAnimationFrame(gameLoopId);
    cancelAnimationFrame(zoomLoopId);
    aiControllers.forEach(ai => ai.stop());
    aiControllers = [];
    fighters = [];
    particles = [];
    projectiles = [];
    healingFlowers = [];
    floatingTexts = [];
    groundBalls = [];
    hazards = [];
    sinaBoats = [];
    coleoneBalls = [];
    bershowSlashes = [];
    kairoLinks = [];
    dataGhosts = [];
    shadowSoldiers = [];
    walls = [];
    lifeOrbs = [];
    turrets = [];
    hud.innerHTML = '';
    document.querySelectorAll('.training-bar').forEach(el => el.remove());
    training = null;
    winText.innerText = '';
    matchStatsEl.innerHTML = '';
    winText.style.color = '';
}

function goToMenu() {
    stopMatch();
    gameState = 'MENU';
    showScreen(hubScreen);
    drawMenuBackground();
}

// Revanche: mesmo modo e mesmos lutadores escolhidos, aliados/inimigos sorteados de novo
function rematch() {
    stopMatch();
    startGame();
}

restartButton.addEventListener('click', goToMenu);
rematchButton.addEventListener('click', rematch);

// --- Controle de Volume (lembra a escolha do jogador) ---
function setupVolumeControl() {
    const slider = document.getElementById('volume-slider');
    const icon = document.getElementById('volume-icon');
    const label = document.getElementById('volume-value');
    let lastVolume = 70;

    try {
        const saved = localStorage.getItem('cyberfury-volume');
        if (saved !== null) slider.value = saved;
    } catch (e) { /* sem localStorage: usa o padrão */ }

    function applyVolume() {
        const value = Number(slider.value);
        sfx.setVolume(value / 100);
        label.innerText = `${value}%`;
        icon.innerText = value === 0 ? '🔇' : value < 40 ? '🔉' : '🔊';
        if (value > 0) lastVolume = value;
        try { localStorage.setItem('cyberfury-volume', value); } catch (e) { }
    }

    // Sons gravados ou sintetizados (os de antes), para comparar; lembra a escolha
    const mode = document.getElementById('sfx-mode');
    try { sfx.recorded = localStorage.getItem('cyberfury-sfx') !== 'synth'; } catch (e) { }
    function applyMode() {
        mode.innerText = sfx.recorded ? '🎧 Gravados' : '🎹 Sintetizados';
        mode.classList.toggle('off', !sfx.recorded);
        try { localStorage.setItem('cyberfury-sfx', sfx.recorded ? 'recorded' : 'synth'); } catch (e) { }
    }
    mode.addEventListener('click', () => {
        sfx.recorded = !sfx.recorded;
        applyMode();
        sfx.play('hit_heavy'); // amostra na hora, para ouvir a diferença
        mode.blur();
    });
    applyMode();
    sfx.preload();

    slider.addEventListener('input', applyVolume);
    // Tira o foco do controle para as teclas voltarem a controlar o lutador
    slider.addEventListener('change', () => slider.blur());
    icon.addEventListener('click', () => {
        slider.value = Number(slider.value) === 0 ? lastVolume : 0;
        applyVolume();
        icon.blur();
    });
    applyVolume();
}

window.onload = () => {
    resizeCanvas();
    setupVolumeControl();
    setupHub();
    setupSelectionScreen();
    setupPhones();
};
