// --- Classe Cibernético: Kairo "Glitch" ---
// Netrunner de rua. Os golpes infectam o inimigo com Corrupção; com 5 de Corrupção o implante dele entra em
// Pane (estouro de dano, 3 s sem especial e sem defesa). A ultimate abre uma fenda na muralha que separa a
// rede do mundo e deixa vazar a IA vermelha presa do outro lado.

// Toque de dados (golpe)
const KAIRO_PUNCH_DAMAGE = 9;
// Quickhack (golpe forte, quando pronto): mira sozinho, liga uma linha de dados e dá o choque depois
const KAIRO_HACK_RANGE = 330;
const KAIRO_HACK_DELAY = 30;          // passos entre travar a mira e o choque
const KAIRO_HACK_DAMAGE = 18;         // atravessa a defesa
const KAIRO_HACK_STACKS = 2;
const KAIRO_HACK_COOLDOWN = 150;      // sem o quickhack pronto, o golpe forte é um soco forte normal
// Corrupção e Pane
const CORRUPTION_MAX = 5;
const CORRUPTION_DURATION = 300;      // a Corrupção some 5 s depois do último acerto
const PANE_DAMAGE = 25;
const PANE_DURATION = 180;            // 3 s sem especial e sem defesa
// Ultimate: Rompendo a Muralha
const KAIRO_BREACH_COST = 160;
const KAIRO_BREACH_DURATION = 240;    // 4 s flutuando
const KAIRO_BREACH_RADIUS = 170;
const KAIRO_BREACH_TICK = 30;
const KAIRO_BREACH_TICK_DAMAGE = 7;
const KAIRO_BREACH_PULL = 0.9;        // puxão por passo na direção dele
const KAIRO_GHOST_TIMES = [0, 0, 72, 144]; // quando sai cada fantasma de dados
const KAIRO_GHOST_DAMAGE = 20;
const KAIRO_GHOST_SPEED = 5.5;
const KAIRO_GHOST_LIFE = 180;
const GLITCH_PALETTE = ['#0a0004', '#2a0008', '#6a0010', '#c0182a', '#ff2a3d', '#ff8a96', '#ffffff'];

let kairoLinks = [];   // quickhacks travados: { owner, target, t }
let dataGhosts = [];   // fantasmas de dados da ultimate

// --- Corrupção ---
function addCorruption(target, stacks, source) {
    if (!alive(target) || target.isInsideOpponent || target.paneTimer > 0) return;
    target.corruption = Math.min(CORRUPTION_MAX, (target.corruption || 0) + stacks);
    target.corruptionTimer = CORRUPTION_DURATION;
    if (target.corruption >= CORRUPTION_MAX) triggerPane(target, source);
}

function triggerPane(target, source) {
    target.corruption = 0;
    target.corruptionTimer = 0;
    target.paneTimer = PANE_DURATION;
    target.isDefending = false;
    target.isPreparingDefense = false;
    target.takeDamage(PANE_DAMAGE, { unblockable: true, sound: 'kairo_pane' }, source);
    floatingTexts.push(new FloatingText(target.x, target.y - target.height - 22, 'PANE!', '#ff2a3d'));
    if (window.pixelFx) pixelFx.spawn('zap-hit', { x: target.x, y: target.chestY, scale: 1, palette: GLITCH_PALETTE, seed: Math.floor(Math.random() * 1000) });
    for (let i = 0; i < 10; i++) particles.push(new Particle(target.x + (Math.random() - 0.5) * 30, target.chestY + (Math.random() - 0.5) * 30, i % 2 ? '#ff2a3d' : '#15151d', 0));
    screenShake = Math.max(screenShake, 4);
}

Object.assign(Fighter.prototype, {
    // Quickhack: trava no inimigo mais perto dentro do alcance. Sem ninguém no alcance, não gasta nada.
    startQuickhack() {
        const target = enemiesOf(this).filter(e => !e.isInsideOpponent && distance(this, e) <= KAIRO_HACK_RANGE)
            .sort((a, b) => distance(this, a) - distance(this, b))[0];
        if (!target) return false;
        this.hackCooldown = KAIRO_HACK_COOLDOWN;
        this.target = target;
        kairoLinks.push({ owner: this, target, t: KAIRO_HACK_DELAY });
        sfx.play('kairo_hack');
        return true;
    },

    // Rompendo a Muralha: flutua, a tela falha em vermelho e preto, a área em volta queima e puxa,
    // e fantasmas de dados saem caçando os inimigos
    startBreach() {
        this.isAttacking = false;
        if (this.breachTimer > 0 || this.energy < KAIRO_BREACH_COST || this.specialCooldown > 0) return;
        this.energy -= KAIRO_BREACH_COST;
        this.specialCooldown = KAIRO_BREACH_DURATION;
        this.breachTimer = KAIRO_BREACH_DURATION;
        this.breachTick = 0;
        this.spriteForm = 'breach';
        this.poseSpecial();
        floatingTexts.push(new FloatingText(this.x, this.y - this.height - 22, 'ROMPENDO A MURALHA', '#ff2a3d'));
        screenShake = Math.max(screenShake, 8);
        sfx.play('kairo_special');
        if (window.pixelFx) pixelFx.spawn('shadow-tendrils', { x: this.x, y: this.y, scale: 1, palette: GLITCH_PALETTE, seed: Math.floor(Math.random() * 1000) });
    },
});

function spawnDataGhost(owner) {
    const angle = Math.random() * Math.PI * 2;
    dataGhosts.push({
        owner, x: owner.x + Math.cos(angle) * 30, y: owner.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2, life: KAIRO_GHOST_LIFE, phase: Math.random() * 6, done: false,
    });
}

// Chamado a cada passo da luta
function updateKairo() {
    for (const f of fighters) {
        if (f.corruptionTimer > 0 && --f.corruptionTimer === 0) f.corruption = 0;
        if (f.hackCooldown > 0) f.hackCooldown--;
        if (f.paneTimer > 0) {
            f.paneTimer--;
            f.isDefending = false;
            f.isPreparingDefense = false;
        }
        if (f.breachTimer > 0) updateBreach(f);
    }

    // Quickhacks travados: a linha segura até o choque; longe demais ou alvo caído, a conexão cai
    for (const link of kairoLinks) {
        const { owner, target } = link;
        if (!alive(owner) || !alive(target) || target.isInsideOpponent || distance(owner, target) > KAIRO_HACK_RANGE * 1.4) { link.done = true; continue; }
        if (--link.t > 0) continue;
        link.done = true;
        target.takeDamage(KAIRO_HACK_DAMAGE, { unblockable: true, sound: 'kairo_pane' }, owner);
        owner.energy = Math.min(owner.maxEnergy, owner.energy + 12);
        if (window.pixelFx) pixelFx.spawn('zap-hit', { x: target.x, y: target.chestY, scale: 0.7, palette: GLITCH_PALETTE, seed: Math.floor(Math.random() * 1000) });
        addCorruption(target, KAIRO_HACK_STACKS, owner);
    }
    kairoLinks = kairoLinks.filter(l => !l.done);

    // Fantasmas de dados: perseguem o inimigo mais perto e explodem nele
    for (const g of dataGhosts) {
        g.life--;
        g.phase += 0.3;
        const prey = alive(g.owner) ? enemiesOf(g.owner).filter(e => !e.isInsideOpponent)
            .sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0] : null;
        if (!prey || g.life <= 0) { g.done = true; continue; }
        const dir = normalize(prey.x - g.x, prey.y - g.y);
        g.vx += (dir.x * KAIRO_GHOST_SPEED - g.vx) * 0.12;
        g.vy += (dir.y * KAIRO_GHOST_SPEED - g.vy) * 0.12;
        g.x += g.vx;
        g.y += g.vy;
        if (Math.hypot(prey.x - g.x, prey.y - g.y) < prey.radius + 10) {
            g.done = true;
            prey.takeDamage(KAIRO_GHOST_DAMAGE, { unblockable: true, sound: 'kairo_pane' }, g.owner);
            addCorruption(prey, 1, g.owner);
            if (window.pixelFx) pixelFx.spawn('zap-hit', { x: prey.x, y: prey.chestY, scale: 0.8, palette: GLITCH_PALETTE, seed: Math.floor(Math.random() * 1000) });
        }
    }
    dataGhosts = dataGhosts.filter(g => !g.done);
}

function updateBreach(f) {
    const age = KAIRO_BREACH_DURATION - f.breachTimer;
    f.breachTimer--;
    // Flutuando (o corpo sobe e balança) e sem ser empurrado
    f.z = 14 + Math.sin(age * 0.12) * 3;
    f.vz = 0;
    f.kbx = 0; f.kby = 0;
    if (KAIRO_GHOST_TIMES.includes(age)) for (const t of KAIRO_GHOST_TIMES) if (t === age) spawnDataGhost(f);
    const inside = enemiesOf(f).filter(e => !e.isInsideOpponent && distance(f, e) < KAIRO_BREACH_RADIUS);
    for (const e of inside) {
        // puxão constante para dentro da fenda
        const dir = directionTo(e, f);
        if (e.characterType !== 'anchor' && !(e.breachTimer > 0)) { e.x += dir.x * KAIRO_BREACH_PULL; e.y += dir.y * KAIRO_BREACH_PULL; }
    }
    if (++f.breachTick >= KAIRO_BREACH_TICK) {
        f.breachTick = 0;
        for (const e of inside) {
            e.takeDamage(KAIRO_BREACH_TICK_DAMAGE, { unblockable: true, sound: 'hit' }, f);
            addCorruption(e, 1, f);
        }
    }
    if (f.breachTimer <= 0) {
        f.spriteForm = null;
        f.z = 0;
    }
}

// --- Desenho ---
const GLITCH_GLYPHS = '01#/\\<>{}[]=+*%$&';

function drawKairo() {
    for (const f of fighters) {
        if (!alive(f)) continue;
        if (f.breachTimer > 0) drawBreachAura(f);
    }
    for (const link of kairoLinks) drawHackLink(link);
    for (const g of dataGhosts) drawDataGhost(g);
    for (const f of fighters) {
        if (!alive(f)) continue;
        if (f.corruption > 0) drawCorruptionPips(f);
        if (f.paneTimer > 0) drawPaneMark(f);
    }
}

// Linha de dados piscando entre o Kairo e o alvo, com símbolos correndo por ela
function drawHackLink(link) {
    const { owner, target } = link;
    const ax = owner.x, ay = owner.chestY - owner.z, bx = target.x, by = target.chestY - target.z;
    const steps = 12, progress = 1 - link.t / KAIRO_HACK_DELAY;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 42, 61, ${0.5 + 0.5 * Math.random()})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        ctx.lineTo(ax + (bx - ax) * t + (Math.random() - 0.5) * 6, ay + (by - ay) * t + (Math.random() - 0.5) * 6);
    }
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8a96';
    for (let i = 0; i < 4; i++) {
        const t = (progress + i / 4) % 1;
        ctx.fillText(GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)], ax + (bx - ax) * t, ay + (by - ay) * t - 4);
    }
    // mira travando no alvo
    const r = 16 + 10 * (1 - progress);
    ctx.strokeStyle = '#ff2a3d';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - r / 2, by - r / 2, r, r);
    ctx.restore();
}

// Fantasma de dados: um rosto de pixels vermelho, meio transparente, deixando código para trás
function drawDataGhost(g) {
    const bob = Math.sin(g.phase) * 3, x = Math.round(g.x), y = Math.round(g.y - 34 + bob);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ff2a3d';
    ctx.fillRect(x - 7, y - 8, 14, 12);
    ctx.fillRect(x - 5, y + 4, 3, 4); ctx.fillRect(x + 2, y + 4, 3, 4); // pontas de baixo
    ctx.fillStyle = '#15151d';
    ctx.fillRect(x - 4, y - 4, 3, 3); ctx.fillRect(x + 1, y - 4, 3, 3);  // olhos
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 3, y - 3, 1, 1); ctx.fillRect(x + 2, y - 3, 1, 1);
    // rastro de código
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.5 - i * 0.12;
        ctx.fillText(GLITCH_GLYPHS[(Math.floor(g.phase * 2) + i) % GLITCH_GLYPHS.length], x - g.vx * i * 3, y - g.vy * i * 3 + 2);
    }
    ctx.restore();
}

// Fenda aberta: anel no chão com código girando, rachaduras e a tela falhando em faixas
function drawBreachAura(f) {
    const age = KAIRO_BREACH_DURATION - f.breachTimer;
    const fade = Math.min(1, f.breachTimer / 30, age / 10);
    ctx.save();
    ctx.globalAlpha = 0.25 * fade;
    ctx.fillStyle = '#2a0008';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, KAIRO_BREACH_RADIUS, KAIRO_BREACH_RADIUS * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = '#ff2a3d';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = -age * 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8a96';
    for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2 + age * 0.02;
        ctx.fillText(GLITCH_GLYPHS[(i * 7 + Math.floor(age / 4)) % GLITCH_GLYPHS.length], f.x + Math.cos(a) * KAIRO_BREACH_RADIUS * 0.92, f.y + Math.sin(a) * KAIRO_BREACH_RADIUS * 0.5);
    }
    // faixas de glitch atravessando a arena
    ctx.globalAlpha = 0.18 * fade;
    for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.5) continue;
        const y = arena.top + Math.random() * (arena.bottom - arena.top);
        ctx.fillStyle = Math.random() < 0.5 ? '#ff2a3d' : '#000000';
        ctx.fillRect(arena.left, y, arena.right - arena.left, 2 + Math.random() * 6);
    }
    ctx.restore();
}

// Corrupção: até 5 quadradinhos vermelhos em cima da cabeça
function drawCorruptionPips(f) {
    const y = f.y - f.height - 14 - f.z, w = 6, gap = 2, total = CORRUPTION_MAX * (w + gap) - gap;
    ctx.save();
    for (let i = 0; i < CORRUPTION_MAX; i++) {
        ctx.fillStyle = i < f.corruption ? '#ff2a3d' : 'rgba(20, 0, 6, 0.6)';
        ctx.fillRect(f.x - total / 2 + i * (w + gap), y, w, w);
    }
    ctx.restore();
}

// Pane: o lutador "falha" — faixas deslocadas e o aviso piscando
function drawPaneMark(f) {
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = Math.floor(f.paneTimer / 6) % 2 ? '#ff2a3d' : '#ffffff';
    ctx.fillText(`PANE ${Math.ceil(f.paneTimer / 60)}s`, f.x + (Math.random() - 0.5) * 3, f.y - f.height - 18 - f.z);
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 2; i++) {
        ctx.fillStyle = i ? '#ff2a3d' : '#00e5ff';
        ctx.fillRect(f.x - 16 + (Math.random() - 0.5) * 8, f.y - f.height * Math.random() - f.z, 32, 2);
    }
    ctx.restore();
}
