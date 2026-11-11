// --- Classe Cibernético: Vex ---
// Ex-entregadora de rua com o Cronodrive na coluna: quando ele liga, o mundo fica em câmera lenta para os
// inimigos (e os tiros deles), enquanto ela continua na velocidade normal, deixando cópias coloridas para trás.

// Lâminas térmicas (golpe): rápidas e de dano baixo
const VEX_PUNCH_DAMAGE = 7;
const VEX_BLADE_COOLDOWN = 12;
// Passo fantasma (golpe forte, quando pronto): atravessa o inimigo cortando e para atrás dele
const VEX_STEP_RANGE = 170;
const VEX_STEP_STEPS = 7;          // passos que o avanço leva
const VEX_STEP_DAMAGE = 28;
const VEX_STEP_COOLDOWN = 120;     // sem o passo pronto, o golpe forte é um corte forte normal
// Cronodrive (ultimate)
const VEX_DRIVE_COST = 200;
const VEX_DRIVE_DURATION = 240;    // 4 s
const VEX_DRIVE_SLOW = 4;          // inimigos agem 1 a cada 4 passos (25% da velocidade)
const VEX_TRAIL_COLORS = ['#00f0ff', '#ff2aff', '#ffe600', '#b6ff2a'];

let cronoDrive = null;   // { owner, timer, tick }
let vexTrail = [];       // cópias coloridas deixadas para trás

// Este passo o objeto (lutador, torreta, tiro...) fica parado? Só os do time inimigo da Vex, durante o
// Cronodrive, e só em 3 de cada 4 passos.
function timeFrozen(thing) {
    if (!cronoDrive || !thing) return false;
    const team = thing.team !== undefined ? thing.team : thing.owner && thing.owner.team;
    return team !== undefined && team !== cronoDrive.owner.team && cronoDrive.tick % VEX_DRIVE_SLOW !== 0;
}
// Efeitos soltos (números de dano, partículas) também ficam lentos: os números "congelam" no ar
function effectsFrozen() {
    return !!cronoDrive && cronoDrive.tick % VEX_DRIVE_SLOW !== 0;
}

Object.assign(Fighter.prototype, {
    // Passo fantasma: avança atravessando o inimigo mais perto (dentro do alcance) e corta no caminho
    startPhaseStep() {
        const target = enemiesOf(this).filter(e => !e.isInsideOpponent && distance(this, e) <= VEX_STEP_RANGE)
            .sort((a, b) => distance(this, a) - distance(this, b))[0];
        if (!target) return false;
        const dir = directionTo(this, target);
        const gap = this.radius + target.radius + 12;
        const to = {
            x: Math.max(arena.left, Math.min(arena.right, target.x + dir.x * gap)),
            y: Math.max(arena.top, Math.min(arena.bottom, target.y + dir.y * gap)),
        };
        this.phaseStep = { from: { x: this.x, y: this.y }, to, t: 0, hit: false, target };
        this.phaseCooldown = VEX_STEP_COOLDOWN;
        this.target = target;
        sfx.play('vex_step');
        return true;
    },

    // Cronodrive: liga o implante; o mundo desacelera para os inimigos por 4 s
    startCronodrive() {
        this.isAttacking = false;
        if (cronoDrive || this.energy < VEX_DRIVE_COST || this.specialCooldown > 0) return;
        this.energy -= VEX_DRIVE_COST;
        this.specialCooldown = VEX_DRIVE_DURATION;
        cronoDrive = { owner: this, timer: VEX_DRIVE_DURATION, tick: 0 };
        this.spriteForm = 'drive';
        this.poseSpecial();
        floatingTexts.push(new FloatingText(this.x, this.y - this.height - 22, 'CRONODRIVE', '#b6ff2a'));
        screenShake = Math.max(screenShake, 5);
        sfx.play('vex_special');
    },
});

function endCronodrive() {
    if (!cronoDrive) return;
    const owner = cronoDrive.owner;
    cronoDrive = null;
    owner.spriteForm = null;
    sfx.play('vex_drive_end');
    screenShake = Math.max(screenShake, 4);
    // O tempo volta: todo o dano guardado cai de uma vez em cada inimigo
    let released = false;
    for (const f of fighters) {
        const pending = Math.round(f.cronoPending || 0);
        f.cronoPending = 0;
        if (pending <= 0 || f.isDead) continue;
        released = true;
        f.releasingCrono = true;
        f.loseHealth(pending, owner);
        f.releasingCrono = false;
        f.hitFlash = 12;
        floatingTexts.push(new FloatingText(f.x, f.y - f.z - f.height - 24, `-${pending}`, '#ff3b6b'));
        if (window.pixelFx) pixelFx.spawn('crit-hit', { x: f.x, y: f.y - f.z, flip: owner.x > f.x, height: Math.round((f.y - f.chestY) / 2), palette: 'neon', seed: Math.floor(Math.random() * 1000) });
        for (let i = 0; i < 12; i++) particles.push(new Particle(f.x + (Math.random() - 0.5) * 30, f.chestY + (Math.random() - 0.5) * 30, VEX_TRAIL_COLORS[i % 4], 0));
    }
    if (released) { sfx.play('hit_heavy'); hitStop = HIT_STOP + 2; screenShake = Math.max(screenShake, 9); }
}

// Começo de cada passo: o relógio do Cronodrive e as recargas da Vex
function updateVex() {
    if (cronoDrive) {
        cronoDrive.tick++;
        if (--cronoDrive.timer <= 0 || !alive(cronoDrive.owner)) endCronodrive();
    }
    for (const f of fighters) if (f.phaseCooldown > 0) f.phaseCooldown--;
    for (const c of vexTrail) c.life--;
    vexTrail = vexTrail.filter(c => c.life > 0);
}

// Depois do movimento: o avanço do passo fantasma e as cópias do rastro
function updateVexAfterMove() {
    for (const f of fighters) {
        if (!alive(f) || f.characterType !== 'vex') { if (f.phaseStep) f.phaseStep = null; continue; }
        const s = f.phaseStep;
        if (s) {
            s.t++;
            const k = Math.min(1, s.t / VEX_STEP_STEPS);
            f.x = s.from.x + (s.to.x - s.from.x) * k;
            f.y = s.from.y + (s.to.y - s.from.y) * k;
            f.kbx = 0; f.kby = 0;
            if (!s.hit && k >= 0.5) {
                s.hit = true;
                if (alive(s.target) && distance(f, s.target) < 70) {
                    const defended = s.target.takeDamage(VEX_STEP_DAMAGE, { sound: 'blade_hit' }, f);
                    f.energy = Math.min(f.maxEnergy, f.energy + (defended ? 7.5 : 15));
                    if (!defended && window.pixelFx) pixelFx.spawn('sword-slash', { x: s.target.x, y: s.target.y, flip: s.to.x < s.from.x, palette: 'ember', seed: Math.floor(Math.random() * 1000) });
                }
            }
            if (k >= 1) {
                f.phaseStep = null;
                if (alive(s.target)) { f.aim = directionTo(f, s.target); if (Math.abs(f.aim.x) > 0.05) f.facing = f.aim.x > 0 ? 1 : -1; }
            }
        }
        // Rastro: no Cronodrive ou no passo fantasma, uma cópia colorida a cada poucos passos
        const driving = cronoDrive && cronoDrive.owner === f;
        if ((driving && cronoDrive.tick % 3 === 0) || (s && s.t % 2 === 0)) addVexGhost(f);
    }
}

// Cópia do sprite da Vex como está agora, tingida de uma cor do rastro
function addVexGhost(f) {
    if (typeof document === 'undefined' || !characterArt.vex) return;
    const h = f.height;
    const canvas = document.createElement('canvas');
    canvas.width = h; canvas.height = h;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    characterArt.vex(g, h / 4, 0, h / 2, h, f);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = 0.65;
    g.fillStyle = VEX_TRAIL_COLORS[(f.trailIndex = ((f.trailIndex || 0) + 1) % VEX_TRAIL_COLORS.length)];
    g.fillRect(0, 0, h, h);
    vexTrail.push({ canvas, x: f.x, y: f.y, z: f.z, facing: f.facing, life: 24, max: 24 });
}

// --- Desenho ---
// Cópias atrás dos lutadores
function drawVexTrail() {
    for (const c of vexTrail) {
        const h = c.canvas.height;
        ctx.save();
        ctx.globalAlpha = 0.6 * c.life / c.max;
        ctx.translate(c.x, c.y - c.z);
        if (c.facing === -1) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(c.canvas, -h / 2, -h, h, h);
        ctx.restore();
    }
}

// Por cima de tudo: a arena fica fria e com linhas, e o relógio do Cronodrive aparece em cima dela
function drawCronodrive() {
    if (!cronoDrive) return;
    const age = VEX_DRIVE_DURATION - cronoDrive.timer;
    const fade = Math.min(1, age / 12, cronoDrive.timer / 20);
    const w = arena.right - arena.left, h = arena.bottom - arena.top;
    ctx.save();
    ctx.globalAlpha = 0.16 * fade;
    ctx.fillStyle = '#2a7fff';
    ctx.fillRect(arena.left, arena.top, w, h);
    ctx.globalAlpha = 0.08 * fade;
    ctx.fillStyle = '#000000';
    for (let y = arena.top + (age % 6); y < arena.bottom; y += 6) ctx.fillRect(arena.left, y, w, 2);
    // borda limão pulsando
    ctx.globalAlpha = (0.5 + 0.3 * Math.sin(age * 0.3)) * fade;
    ctx.strokeStyle = '#b6ff2a';
    ctx.lineWidth = 3;
    ctx.strokeRect(arena.left + 2, arena.top + 2, w - 4, h - 4);
    const o = cronoDrive.owner;
    ctx.globalAlpha = fade;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b6ff2a';
    ctx.fillText(`${(cronoDrive.timer / 60).toFixed(1)}s`, o.x, o.y - o.z - o.height - 26);
    // Dano guardado em cada inimigo: número congelado em cima da cabeça, crescendo a cada golpe, tremendo de leve
    for (const f of fighters) {
        if (!(f.cronoPending > 0) || f.isDead) continue;
        const size = Math.min(26, 13 + f.cronoPending / 12);
        const x = f.x + (Math.random() - 0.5) * 2, y = f.y - f.z - f.height - 22;
        ctx.globalAlpha = 1;
        ctx.font = `bold ${Math.round(size)}px monospace`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0a0614';
        ctx.strokeText(`${Math.round(f.cronoPending)}`, x, y);
        ctx.fillStyle = cronoDrive.tick % 8 < 4 ? '#b6ff2a' : '#00f0ff';
        ctx.fillText(`${Math.round(f.cronoPending)}`, x, y);
    }
    ctx.restore();
}
