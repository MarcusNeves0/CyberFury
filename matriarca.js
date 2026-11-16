// --- Chefão: MATRIARCA ---
// Uma inteligência artificial que tomou conta da arena: um núcleo flutuante com anéis girando, cabos pendurados
// e um rosto de pixels numa tela. Enquanto as torres de escudo estiverem de pé, ela não sente nada: o time
// derruba as torres, ela cai exposta por alguns segundos e depois reinicia com torres novas.
// Ataques (todos avisam no chão): feixes de laser em linha, drones que caçam e explodem, pulso de glitch
// (inverte os controles) e, na fúria, o hack: quem ficar no círculo vira contra o próprio time por 5 s.
// A abertura: a tela dá glitch, um terminal digita o aviso, um feixe desce do céu e ela se monta dentro dele.
// Usa os avisos, efeitos e o placar do boss.js.

const MATRI_HP = 720;             // vida por lutador no time dos jogadores
const MATRI_RADIUS = 40;
const MATRI_HEIGHT = 170;
const MATRI_SCALE = 3;            // 1 pixel do desenho = 3 pixels do mundo
const MATRI_HOVER = 46;           // altura em que ela flutua
const MATRI_SPEED = 1.2;
// Por fase (vida acima de 2/3, acima de 1/3, fúria)
const MATRI_PYLONS = [3, 3, 4];   // torres de escudo em cada ciclo
const MATRI_POWER = [1, 1.1, 1.22];
const MATRI_TELL = [1, 0.88, 0.76];
const MATRI_REST = [70, 55, 42];
const MATRI_PYLON_HP = 115;       // vida de cada torre, por lutador no time dos jogadores
const MATRI_PYLON_RISE = 40;      // passos subindo do chão (imune)
const MATRI_EXPOSED = 480;        // 8 s exposta depois que a última torre cai
const MATRI_REBOOT = 120;         // reiniciando ao mudar de fase (imune)
// Ataques
const MATRI_BEAM = { tell: 50, w: 24, ticks: 4, every: 6, damage: 14, fan: 0.45 };
const MATRI_DRONES = { tell: 30, count: [2, 3, 4], max: 6, speed: 2.3, life: 240, lock: 38, r: 55, damage: 42 };
const MATRI_GLITCH = { tell: 46, r: 190, damage: 30, time: 150 };
const MATRI_HACK = { tell: 64, lock: 18, r: 52, time: 300, cooldown: 600 };

let matriDrones = [];
let matriFx = { beams: [], glitch: 0 };

// --- Desenho em pixel art (usa as funções cg* do boss.js) ---
const MATRI_PAL = { K: '#0c0818', D: '#1a1530', M: '#2c2650', P: '#4a3f80', p: '#8a7fd0', S: '#061018', C: '#3ff6ff', c: '#1a8aa0', G: '#ff2aff', g: '#8a1a8a' };
const MATRI_FURY = { ...MATRI_PAL, C: '#ff3b5c', c: '#8a1428', G: '#ff3b3b', g: '#7a1010' };

function cgMatriCore() {
    const g = cgGrid(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const d = Math.hypot(x - 15.5, y - 15.5);
        if (d < 14.5) g[y][x] = d > 12.5 ? 'P' : 'M';
        if (d < 14.5 && d > 11.5 && x + y < 24) g[y][x] = 'p';              // brilho em cima à esquerda
        if (d < 14.5 && d > 12.5 && x + y > 40) g[y][x] = 'D';              // sombra embaixo à direita
    }
    cgRect(g, 7, 9, 24, 21, 'D');                                            // moldura da tela
    cgRect(g, 8, 10, 23, 20, 'S');                                           // tela do rosto
    cgPx(g, [[4, 13], [4, 16], [4, 19], [27, 13], [27, 16], [27, 19]], 'C'); // portas acesas dos lados
    cgPx(g, [[14, 1], [15, 0], [16, 0], [17, 1]], 'G');                      // coroa
    cgRect(g, 15, 1, 16, 3, 'p');
    cgPx(g, [[9, 3], [22, 3]], 'G');
    for (let x = 10; x <= 21; x += 3) cgRect(g, x, 27, x + 1, 29, 'D');      // encaixes dos cabos
    return cgOutline(g);
}

let matriArtCache = null;
function matriArt() {
    if (matriArtCache) return matriArtCache;
    const core = cgMatriCore();
    matriArtCache = { core: cgCanvas(core, MATRI_PAL), fury: cgCanvas(core, MATRI_FURY) };
    return matriArtCache;
}

// Rosto na tela (coordenadas da grade do núcleo); expr: neutral, angry, smile, hurt, closed
function drawMatriFace(g, expr, look, color, dim) {
    const px = (x, y, w = 1, h = 1) => g.fillRect(x, y, w, h);
    g.fillStyle = color;
    const lx = Math.max(-1, Math.min(1, Math.round(look || 0)));
    if (expr === 'closed') { px(10 + lx, 14, 4); px(18 + lx, 14, 4); return; }
    if (expr === 'hurt') {
        for (let i = 0; i < 3; i++) { px(10 + i, 12 + i); px(12 - i, 12 + i); px(18 + i, 12 + i); px(20 - i, 12 + i); }
        g.fillStyle = dim;
        px(12, 18); px(13, 17); px(14, 18); px(15, 17); px(16, 18); px(17, 17); px(18, 18);
        return;
    }
    if (expr === 'smile') {
        px(10 + lx, 14); px(11 + lx, 13); px(12 + lx, 14);
        px(18 + lx, 14); px(19 + lx, 13); px(20 + lx, 14);
        g.fillStyle = dim;
        px(12, 17); px(13, 18, 6); px(19, 17);
        return;
    }
    px(10 + lx, 12, 3, 3); px(18 + lx, 12, 3, 3);                         // olhos
    if (expr === 'angry') {
        g.fillStyle = MATRI_PAL.S;
        px(12 + lx, 12); px(18 + lx, 12);                                 // canto de dentro mais baixo: bravo
        g.fillStyle = dim;
        px(12, 18, 8);
    } else {
        g.fillStyle = dim;
        px(13, 18, 6);
    }
}

// --- Torre de escudo (é um "lutador" do time dela: os golpes, os tiros e a mira de todo mundo já funcionam nela) ---
class MatriPylon extends Fighter {
    constructor(x, y, hp, boss) {
        super(x, y, 'Torre de escudo', 'pylon', 1, 'ai');
        this.isPylon = true;
        this.boss = boss;
        this.radius = 18;
        this.height = 74;
        this.maxHealth = hp;
        this.health = hp;
        this.energy = 0;
        this.maxEnergy = 1;
        this.rise = MATRI_PYLON_RISE;
        this.anim = Math.floor(Math.random() * 100);
    }
    get chestY() { return this.y - 40; }
    push() { }
    heal() { return 0; }
    takeDamage(damage, effect = {}, attacker = null) {
        if (this.rise > 0) return true;
        return super.takeDamage(damage, effect, attacker);
    }
    update() {
        this.anim++;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.rise > 0) {
            this.rise--;
            if (this.rise % 4 === 0) particles.push(new Particle(this.x + (Math.random() - 0.5) * 30, this.y, '#6b6f80', 0, { x: (Math.random() - 0.5) * 2, y: -1 - Math.random() * 2 }));
        }
        // Máquina: fogo, veneno, maldição e sangramento não pegam na torre
        this.burnDuration = 0; this.poisonStacks = 0; this.poisonDuration = 0;
        this.curseStacks = 0; this.curseDuration = 0; this.bleedStacks = 0; this.bleedDuration = 0;
        this.isParalyzed = false; this.paralysisTimer = 0; this.slowTimer = 0; this.heldBy = null;
        this.kbx = 0; this.kby = 0;
        this.moveX = 0; this.moveY = 0;
    }
    draw() {
        const k = this.isDead ? Math.max(0, this.deathTimer / DEATH_DURATION) : 1;
        if (k <= 0) return;
        const sink = this.rise > 0 ? Math.round((this.rise / MATRI_PYLON_RISE) * 70) : this.isDead ? Math.round((1 - k) * 20) : 0;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.rect(this.x - 40, this.y - 200, 80, 202); ctx.clip(); // sobe de dentro do chão
        const x = Math.round(this.x), y = Math.round(this.y) + sink;
        if (this.hitFlash > 0 && this.hitFlash % 4 >= 2) ctx.filter = 'brightness(2.2)';
        const R = (c, x0, y0, w, h) => { ctx.fillStyle = c; ctx.fillRect(x0, y0, w, h); };
        R(MATRI_PAL.K, x - 17, y - 14, 34, 16); R(MATRI_PAL.D, x - 15, y - 12, 30, 12); R(MATRI_PAL.P, x - 15, y - 12, 30, 3); // base
        R(MATRI_PAL.K, x - 9, y - 62, 18, 52); R(MATRI_PAL.M, x - 7, y - 60, 14, 48); R(MATRI_PAL.p, x - 7, y - 60, 3, 48);    // coluna
        const glow = 0.6 + 0.4 * Math.sin(this.anim * 0.12);
        for (let i = 0; i < 4; i++) R(i % 2 ? MATRI_PAL.c : MATRI_PAL.C, x - 3, y - 54 + i * 11, 6, 4);                           // luzes
        // Cristal no topo (aceso enquanto a torre vive)
        ctx.globalAlpha = k * (this.isDead ? 0.3 : 1);
        R(MATRI_PAL.K, x - 9, y - 80, 18, 18);
        ctx.fillStyle = MATRI_PAL.C;
        ctx.beginPath(); ctx.moveTo(x, y - 80); ctx.lineTo(x + 8, y - 71); ctx.lineTo(x, y - 62); ctx.lineTo(x - 8, y - 71); ctx.fill();
        ctx.globalAlpha = k * glow * (this.isDead ? 0.2 : 0.8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 2, y - 76, 3, 8);
        ctx.restore();
        // Barrinha de vida em cima (as torres não têm cartão no placar)
        if (!this.isDead && this.rise <= 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(this.x - 16, this.y - 92, 32, 5);
            ctx.fillStyle = MATRI_PAL.C;
            ctx.fillRect(this.x - 15, this.y - 91, 30 * Math.max(0, this.health / this.maxHealth), 3);
        }
    }
    drawDefeat() { this.draw(); }
}

// --- A chefe ---
class Matriarca extends Fighter {
    constructor(x, y, teamSize) {
        super(x, y, 'Matriarca', 'matriarca', 1, 'ai');
        this.isBoss = true;
        this.isMatriarca = true;
        this.teamSize = teamSize;
        this.radius = MATRI_RADIUS;
        this.height = MATRI_HEIGHT;
        this.maxHealth = MATRI_HP * teamSize;
        this.health = this.maxHealth;
        this.energy = 0;
        this.maxEnergy = 1;
        this.z = MATRI_HOVER;
        this.pylons = [];
        this.exposed = 0;
        this.reboot = 0;
        this.lastPhase = 0;
        this.act = null;
        this.rest = 60;
        this.anim = 0;
        this.turn = 0;
        this.hackCooldown = 300;
        this.retarget = 0;
        this.face = 'neutral';
        this.faceTimer = 0;
        this.look = 0;
        this.shieldHit = 0;
        this.wanderTimer = 0;
        this.wanderTo = null;
        this.introHidden = false;
        this.build = { reveal: 1, rings: 1, cables: 1, eyes: 1 }; // abertura: partes se montando (0 a 1)
        this.facing = -1;
        this.cleaned = false;
    }

    get phase() { const k = this.health / this.maxHealth; return k > 2 / 3 ? 0 : k > 1 / 3 ? 1 : 2; }
    get shielded() { return this.pylons.some(p => alive(p)); }
    get chestY() { return this.y - this.z - 50; }

    push(direction, force) {
        this.kbx += direction.x * force * 0.05;
        this.kby += direction.y * force * 0.05;
    }

    takeDamage(damage, effect = {}, attacker = null) {
        if (this.isDead) return false;
        if (bossIntro || this.reboot > 0 || this.shielded) {
            this.shieldHit = 8;
            if (this.anim % 14 === 0) floatingTexts.push(new FloatingText(this.x, this.y - this.z - 110, this.shielded ? 'ESCUDO' : 'IMUNE', '#3ff6ff'));
            return true;
        }
        return super.takeDamage(damage, effect, attacker);
    }

    loseHealth(amount, attacker) {
        if (this.isDead || this.shielded || this.reboot > 0) return; // o escudo segura até o dano contínuo
        super.loseHealth(amount, attacker);
        if (this.health > 0 && this.phase > this.lastPhase) this.phaseChange(); // só avança (um healer hackeado pode curá-la)
    }

    heal() { return 0; } // máquina: nem um healer hackeado conserta ela

    setFace(expr, time) { this.face = expr; this.faceTimer = time; }

    // Mudou de fase: reinicia (imune), a tela dá glitch e volta com mais torres
    phaseChange() {
        this.lastPhase = this.phase;
        this.cancelAction();
        this.exposed = 0;
        this.reboot = MATRI_REBOOT;
        this.setFace('hurt', MATRI_REBOOT);
        matriFx.glitch = 30;
        sfx.play('matri_glitch');
        screenShake = Math.max(screenShake, 8);
        announcer.call('REINICIANDO...', {
            color: '#ff2aff', priority: 3,
            sub: this.phase === 2 ? 'MODO FÚRIA: ELA VAI HACKEAR VOCÊS!' : 'MAIS TORRES DE ESCUDO!',
        });
    }

    // Torres novas subindo do chão, espalhadas pela arena
    raisePylons(instant = false) {
        const n = MATRI_PYLONS[this.phase];
        const cx = (arena.left + arena.right) / 2, cy = (arena.top + arena.bottom) / 2;
        const rx = (arena.right - arena.left) * 0.3, ry = (arena.bottom - arena.top) * 0.32;
        const start = Math.random() * Math.PI * 2;
        this.pylons = [];
        for (let i = 0; i < n; i++) {
            let spot = null;
            for (let tries = 0; tries < 20 && !spot; tries++) {
                const ang = start + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                const d = 0.75 + Math.random() * 0.25;
                const s = { x: cx + Math.cos(ang) * rx * d, y: cy + Math.sin(ang) * ry * d };
                if (!obstacles.some(o => circleHitsObstacle(s.x, s.y, 30, o)) && !fighters.some(f => alive(f) && distance(f, s) < 50)) spot = s;
            }
            if (!spot) spot = freeSpot(30);
            const p = new MatriPylon(spot.x, spot.y, MATRI_PYLON_HP * this.teamSize, this);
            if (instant) p.rise = 0;
            fighters.push(p);
            this.pylons.push(p);
        }
        sfx.play('matri_shield');
        this.setFace('smile', 60);
    }

    face2(t) { if (t && Math.abs(t.x - this.x) > 8) this.facing = t.x > this.x ? 1 : -1; }

    update() {
        this.anim++;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.shieldHit > 0) this.shieldHit--;
        this.handleStatusEffects();
        this.slowTimer = 0;
        this.heldBy = null;
        this.isParalyzed = false; this.paralysisTimer = 0; // é uma máquina flutuando: não fica atordoada
        this.x += this.kbx; this.y += this.kby;
        this.kbx *= 0.8; this.kby *= 0.8;
        this.moveX = 0; this.moveY = 0;
        const hover = this.exposed > 0 ? MATRI_HOVER * 0.3 : MATRI_HOVER;
        this.z += (hover + Math.sin(this.anim * 0.05) * 5 - this.z) * 0.1;
        if (this.faceTimer > 0) this.faceTimer--;
        else this.face = this.phase === 2 ? 'angry' : 'neutral';
        if (this.retarget > 0) this.retarget--;
        if (!alive(this.target) || this.retarget <= 0) { this.target = nearestEnemy(this) || this.target; this.retarget = 200; }
        if (alive(this.target)) this.look = Math.max(-1, Math.min(1, (this.target.x - this.x) / 120)) * this.facing;

        // Começo da luta sem abertura (ou depois dela): sobe as torres
        if (!this.pylons.length && !this.exposed && !this.reboot) { this.raisePylons(); return; }
        if (this.reboot > 0) {
            if (--this.reboot === 0) this.raisePylons();
            return;
        }
        // A última torre caiu: escudo desliga e ela fica exposta
        if (!this.shielded && this.exposed <= 0) {
            this.cancelAction();
            this.exposed = MATRI_EXPOSED;
            this.setFace('hurt', MATRI_EXPOSED);
            sfx.play('matri_break');
            screenShake = Math.max(screenShake, 6);
            announcer.call('ESCUDO CAIU!', { color: '#3ff6ff', priority: 2, sub: 'ATAQUEM A MATRIARCA!' });
        }
        if (this.exposed > 0) {
            if (this.anim % 6 === 0) particles.push(new Particle(this.x + (Math.random() - 0.5) * 60, this.chestY + (Math.random() - 0.5) * 40, Math.random() < 0.5 ? '#3ff6ff' : '#ff2aff', 0));
            if (--this.exposed === 0) { this.reboot = 40; this.setFace('angry', 80); }
            return;
        }
        if (this.hackCooldown > 0) this.hackCooldown--;
        if (this.act) { this.runAction(); return; }
        this.drift();
        if (this.rest > 0) { this.rest--; return; }
        this.chooseAction();
    }

    // Flutua mantendo distância do alvo (ela ataca de longe)
    drift() {
        const t = this.target;
        if (!alive(t)) return;
        if (--this.wanderTimer <= 0 || !this.wanderTo) {
            this.wanderTimer = 200 + Math.random() * 120;
            const away = directionTo(t, this);
            const ang = Math.atan2(away.y || 0.01, away.x) + (Math.random() - 0.5) * 1.6;
            this.wanderTo = {
                x: Math.max(arena.left + 70, Math.min(arena.right - 70, t.x + Math.cos(ang) * 240)),
                y: Math.max(arena.top + 50, Math.min(arena.bottom - 30, t.y + Math.sin(ang) * 200)),
            };
        }
        const d = distance(this, this.wanderTo);
        if (d > 6) {
            const dir = directionTo(this, this.wanderTo);
            const sp = MATRI_SPEED * (this.phase === 2 ? 1.3 : 1);
            this.x += dir.x * sp; this.y += dir.y * sp;
            this.moveX = dir.x * sp; this.moveY = dir.y * sp;
        }
        this.face2(t);
    }

    chooseAction() {
        const t = this.target;
        if (!alive(t)) return;
        const near = enemiesOf(this).filter(e => distance(this, e) < MATRI_GLITCH.r).length;
        const team = fighters.filter(f => alive(f) && f.team === 0 && !f.isPylon).length;
        if (this.phase === 2 && this.hackCooldown <= 0 && team >= 2) { this.startAction('hack', t); return; }
        if (near >= 1 && Math.random() < 0.5) { this.startAction('glitch', t); return; }
        const drones = this.turn++ % 2 === 0 && matriDrones.length < MATRI_DRONES.max;
        this.startAction(drones ? 'drones' : 'beam', t);
    }

    warn(w) {
        const warning = { owner: this, timer: this.act.tell, max: this.act.tell, ...w };
        bossWarnings.push(warning);
        this.act.warns.push(warning);
        return warning;
    }

    // Comprimento da faixa até a borda da arena
    laneToEdge(angle) {
        let len = 0;
        const c = Math.cos(angle), s = Math.sin(angle);
        while (len < 1400) {
            const x = this.x + c * len, y = this.y + s * len;
            if (x < arena.left - 10 || x > arena.right + 10 || y < arena.top - 10 || y > arena.bottom + 10) break;
            len += 10;
        }
        return len;
    }

    startAction(kind, t) {
        const base = { beam: MATRI_BEAM, drones: MATRI_DRONES, glitch: MATRI_GLITCH, hack: MATRI_HACK }[kind];
        const tell = Math.round(base.tell * MATRI_TELL[this.phase]);
        const dir = directionTo(this, t);
        const angle = Math.atan2(dir.y, dir.x);
        this.face2(t);
        this.act = { kind, t: 0, tell, angle, target: t, warns: [], lanes: [] };
        this.setFace(kind === 'hack' ? 'smile' : 'angry', tell + 20);
        if (kind === 'beam') {
            const angles = this.phase >= 1 ? [angle - MATRI_BEAM.fan, angle, angle + MATRI_BEAM.fan] : [angle];
            for (const a of angles) this.act.lanes.push(this.warn({ shape: 'lane', x: this.x, y: this.y, angle: a, len: this.laneToEdge(a), w: MATRI_BEAM.w, color: '#ff2aff' }));
            sfx.play('matri_charge');
        } else if (kind === 'drones') {
            sfx.play('matri_drone');
        } else if (kind === 'glitch') {
            this.warn({ shape: 'circle', x: this.x, y: this.y, r: MATRI_GLITCH.r, color: '#b06bff' });
            sfx.play('matri_charge');
        } else if (kind === 'hack') {
            this.warn({ shape: 'circle', x: t.x, y: t.y, r: MATRI_HACK.r, color: '#ff2aff', follow: t, label: '🧿!' });
            sfx.play('matri_hack');
        }
    }

    cancelAction() {
        if (this.act) bossWarnings = bossWarnings.filter(w => !this.act.warns.includes(w));
        this.act = null;
    }

    endAction() {
        this.cancelAction();
        this.rest = Math.round(MATRI_REST[this.phase] * (0.7 + Math.random() * 0.6));
    }

    strike(e, damage, effect, pushDir, force) {
        const defended = e.takeDamage(Math.round(damage * MATRI_POWER[this.phase]), effect, this);
        if (pushDir && force) e.push(pushDir, defended ? force * 0.4 : force);
        return defended;
    }

    runAction() {
        const a = this.act;
        a.t++;
        for (const w of a.warns) {
            if (w.follow && alive(w.follow) && a.t < a.tell - MATRI_HACK.lock) { w.x = w.follow.x; w.y = w.follow.y; }
            if (w.timer > 0) w.timer--;
        }
        if (a.t === a.tell) bossWarnings = bossWarnings.filter(w => !a.warns.includes(w));
        const fire = a.t === a.tell, after = a.t - a.tell;
        if (a.kind === 'beam') {
            const dur = MATRI_BEAM.ticks * MATRI_BEAM.every;
            if (fire) {
                sfx.play('matri_laser');
                screenShake = Math.max(screenShake, 4);
                for (const l of a.lanes) matriFx.beams.push({ x: l.x, y: l.y, angle: l.angle, len: l.len, w: l.w, life: dur, max: dur, from: this });
            }
            if (after >= 0 && after < dur && after % MATRI_BEAM.every === 0) {
                for (const e of enemiesOf(this)) {
                    if (a.lanes.some(l => inBossShape(l, e))) this.strike(e, MATRI_BEAM.damage, { sound: 'hit' });
                }
            }
            if (after >= dur + 12) this.endAction();
        } else if (a.kind === 'drones') {
            if (fire) {
                const n = MATRI_DRONES.count[this.phase];
                for (let i = 0; i < n && matriDrones.length < MATRI_DRONES.max; i++) {
                    const ang = (i / n) * Math.PI * 2;
                    matriDrones.push({ x: this.x + Math.cos(ang) * 40, y: this.y + Math.sin(ang) * 20, z: this.z + 20, t: 0, state: 'hunt', owner: this, phase: Math.random() * 6 });
                }
            }
            if (after >= 16) this.endAction();
        } else if (a.kind === 'glitch') {
            if (fire) {
                sfx.play('matri_glitch');
                matriFx.glitch = 12;
                bossFx.rings.push({ x: this.x, y: this.y, life: 22, max: 22, color: '#b06bff', r: MATRI_GLITCH.r });
                const zone = { shape: 'circle', x: this.x, y: this.y, r: MATRI_GLITCH.r };
                for (const e of enemiesOf(this)) {
                    if (!inBossShape(zone, e)) continue;
                    if (!this.strike(e, MATRI_GLITCH.damage, { sound: 'hit' }, directionTo(this, e), 6)) {
                        e.glitchTimer = MATRI_GLITCH.time;
                        floatingTexts.push(new FloatingText(e.x, e.y - e.height - 16, 'GLITCH!', '#b06bff'));
                    }
                }
            }
            if (after >= 18) this.endAction();
        } else if (a.kind === 'hack') {
            if (fire) {
                const w = a.warns[0];
                const team = fighters.filter(f => alive(f) && f.team === 0 && !f.isPylon).length;
                const victim = enemiesOf(this).filter(e => !e.isPylon && inBossShape(w, e)).sort((p, q) => distance(w, p) - distance(w, q))[0];
                bossFx.rings.push({ x: w.x, y: w.y, life: 18, max: 18, color: '#ff2aff', r: MATRI_HACK.r });
                if (victim && team >= 2) {
                    hackFighter(victim, MATRI_HACK.time);
                    this.setFace('smile', 90);
                    sfx.play('kairo_pane');
                }
                this.hackCooldown = MATRI_HACK.cooldown;
            }
            if (after >= 20) this.endAction();
        }
    }

    draw() {
        if (this.introHidden) return;
        const dying = this.isDead;
        const k = dying ? Math.max(0, this.deathTimer / DEATH_DURATION) : 1;
        const B = this.build;
        const cx = Math.round(this.x), cy = Math.round(this.y - this.z - 50 + (dying ? (1 - k) * 40 : 0));
        const fury = this.phase === 2 && !dying;
        const main = fury ? '#ff3b5c' : '#3ff6ff', accent = fury ? '#ff3b3b' : '#ff2aff';
        ctx.save();
        ctx.globalAlpha = k;
        // Sombra no chão
        ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 46, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = TEAM_COLORS[1];
        ctx.globalAlpha = 0.3 * k;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 50, 14, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = k;
        // Linhas de energia das torres até ela (por trás do núcleo)
        if (this.shielded && !dying) {
            for (const p of this.pylons) {
                if (!alive(p) || p.rise > 0) continue;
                ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.anim * 0.3);
                ctx.strokeStyle = '#3ff6ff';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(p.x, p.y - 72); ctx.lineTo(cx, cy); ctx.stroke();
                const t = (this.anim * 0.04) % 1;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(p.x + (cx - p.x) * t - 2, p.y - 72 + (cy - p.y + 72) * t - 2, 4, 4);
            }
            ctx.globalAlpha = k;
        }
        // Cabos pendurados, balançando
        const cables = 5, len = 64 * B.cables;
        for (let i = 0; i < cables; i++) {
            const bx = cx + (i - 2) * 9;
            const by = cy + 40;
            for (let s = 0; s < len; s += 6) {
                const sway = Math.sin(this.anim * 0.06 + i * 1.3 + s * 0.05) * (s / 10);
                ctx.fillStyle = MATRI_PAL.K;
                ctx.fillRect(Math.round(bx + sway) - 3, by + s - 1, 7, 8);
                ctx.fillStyle = (s / 6) % 3 === 0 ? main : MATRI_PAL.M;
                ctx.fillRect(Math.round(bx + sway) - 2, by + s, 5, 6);
            }
        }
        // Anéis: a metade de trás antes do núcleo, a da frente depois
        const ring = (front, R, tilt, speed, color) => {
            if (B.rings <= 0) return;
            const n = 26, rot = this.anim * speed;
            for (let i = 0; i < n; i++) {
                const ang = rot + (i / n) * Math.PI * 2;
                const s = Math.sin(ang);
                if ((s >= 0) !== front) continue;
                const x = cx + Math.cos(ang) * R * B.rings, y = cy + s * R * tilt * B.rings;
                ctx.fillStyle = MATRI_PAL.K;
                ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 7, 7);
                ctx.fillStyle = i % 2 ? color : MATRI_PAL.P;
                ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
            }
        };
        ring(false, 70, 0.32, 0.03, main);
        ring(false, 58, 0.5, -0.045, accent);
        // Núcleo (aparece linha por linha na abertura)
        ctx.save();
        if (B.reveal < 1) { ctx.beginPath(); ctx.rect(cx - 60, cy - 50, 120, 100 * B.reveal); ctx.clip(); }
        const jitter = this.exposed > 0 || matriFx.glitch > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
        ctx.translate(cx - 48 + jitter, cy - 48);
        ctx.scale(MATRI_SCALE, MATRI_SCALE);
        ctx.imageSmoothingEnabled = false;
        if (this.hitFlash > 0 && this.hitFlash % 4 >= 2) ctx.filter = 'brightness(2)';
        if (dying) ctx.filter = 'grayscale(0.8) brightness(0.6)';
        const A = matriArt();
        ctx.drawImage(fury ? A.fury : A.core, -1, -1);
        if (B.eyes > 0) {
            const expr = B.eyes < 1 ? 'closed' : dying ? 'hurt' : this.face;
            drawMatriFace(ctx, expr, this.look, main, fury ? '#8a1428' : '#1a8aa0');
        }
        ctx.restore();
        ring(true, 70, 0.32, 0.03, main);
        ring(true, 58, 0.5, -0.045, accent);
        // Escudo: bolha e as linhas de energia vindo das torres
        if (this.shielded && !dying) {
            ctx.globalAlpha = 0.14 + (this.shieldHit > 0 ? 0.2 : 0);
            ctx.fillStyle = '#3ff6ff';
            ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.6 + (this.shieldHit > 0 ? 0.4 : 0);
            ctx.strokeStyle = '#3ff6ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i <= 6; i++) {
                const ang = (i / 6) * Math.PI * 2 + this.anim * 0.01;
                const x = cx + Math.cos(ang) * 84, y = cy + Math.sin(ang) * 84;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        // Exposta: contador em cima
        if (this.exposed > 0 && !dying) {
            ctx.globalAlpha = 1;
            ctx.font = 'bold 14px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#0a0614';
            const txt = `EXPOSTA ${(this.exposed / 60).toFixed(1)}s`;
            ctx.strokeText(txt, cx, cy - 72);
            ctx.fillStyle = '#ffd23f';
            ctx.fillText(txt, cx, cy - 72);
        }
        ctx.restore();
    }
    drawDefeat() { this.draw(); }
}

// Silhueta (para efeitos que envolvem o corpo, como o choque do Spark)
characterArt.matriarca = (g, x, y, w, h) => {
    const sc = Math.min((w * 2) / 34, h / 34);
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(x + w / 2 - 16 * sc, y + h - 34 * sc);
    g.scale(sc, sc);
    g.drawImage(matriArt().core, 0, 0);
    g.restore();
};
characterArt.pylon = (g, x, y, w, h) => {
    g.fillStyle = MATRI_PAL.M;
    g.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.8);
};

// --- Hack: o lutador vira contra o próprio time por um tempo (controlado pela IA) ---
function hackFighter(f, time) {
    f.hackTimer = time;
    f.hackHome = f.team;
    f.team = 1;
    f.target = null;
    f.isDefending = false;
    if (f.isPlayer) {
        f.hackWasPlayer = true;
        f.isPlayer = false;
        f.keys = { up: false, down: false, left: false, right: false };
        f.padMove = { x: 0, y: 0 };
        f.hackAI = new AI(f);
        f.hackAI.start();
        aiControllers.push(f.hackAI);
    }
    floatingTexts.push(new FloatingText(f.x, f.y - f.height - 18, 'HACKEADO!', '#ff2aff'));
    for (let i = 0; i < 14; i++) particles.push(new Particle(f.x, f.chestY, i % 2 ? '#ff2aff' : '#3ff6ff', 0));
}

function unhackFighter(f) {
    if (f.hackHome === undefined) return;
    f.team = f.hackHome;
    f.hackHome = undefined;
    f.hackTimer = 0;
    f.target = null;
    if (f.hackWasPlayer) {
        f.hackWasPlayer = false;
        f.isPlayer = true;
        f.aiMove = { x: 0, y: 0 };
        if (f.hackAI) { f.hackAI.stop(); aiControllers = aiControllers.filter(a => a !== f.hackAI); f.hackAI = null; }
    }
    if (alive(f)) floatingTexts.push(new FloatingText(f.x, f.y - f.height - 18, 'LIBERTADO', '#3ff6ff'));
}

// --- Mundo: drones, hacks, torres caídas e a limpeza quando ela cai ---
function updateMatriWorld() {
    const boss = bossOf();
    if (!boss || !boss.isMatriarca) return;
    if (matriFx.glitch > 0) matriFx.glitch--;
    for (const b of matriFx.beams) b.life--;
    matriFx.beams = matriFx.beams.filter(b => b.life > 0);
    // Ela caiu: as torres caem juntas, os drones somem e todo mundo é libertado
    if (boss.isDead && !boss.cleaned) {
        boss.cleaned = true;
        for (const p of boss.pylons) if (alive(p)) p.health = 0;
        matriDrones = [];
        bossWarnings = [];
    }
    for (const f of fighters) {
        if (f.hackHome === undefined) continue;
        if (f.hackTimer > 0) f.hackTimer--;
        if (f.hackTimer <= 0 || f.isDead || !alive(boss)) unhackFighter(f);
    }
    // Drones: caçam o inimigo mais perto, travam (círculo no chão) e explodem
    for (const d of matriDrones) {
        d.t++;
        d.phase += 0.2;
        if (d.state === 'hunt') {
            const e = enemiesOf(boss).filter(f => !f.isPylon).sort((p, q) => distance(d, p) - distance(d, q))[0];
            if (e) {
                const dir = directionTo(d, e);
                d.x += dir.x * MATRI_DRONES.speed; d.y += dir.y * MATRI_DRONES.speed;
            }
            d.z += (30 - d.z) * 0.05;
            if ((e && distance(d, e) < 50) || d.t > MATRI_DRONES.life) {
                d.state = 'lock';
                d.lock = MATRI_DRONES.lock;
                d.warn = { owner: boss, shape: 'circle', x: d.x, y: d.y, r: MATRI_DRONES.r, timer: d.lock, max: d.lock, color: '#ff4d6d' };
                bossWarnings.push(d.warn);
                sfx.play('turret_shot');
            }
        } else {
            d.warn.timer--;
            if (--d.lock <= 0) {
                bossWarnings = bossWarnings.filter(w => w !== d.warn);
                d.dead = true;
                sfx.play('explosion');
                bossFx.rings.push({ x: d.x, y: d.y, life: 16, max: 16, color: '#ff4d6d', r: MATRI_DRONES.r });
                for (let i = 0; i < 14; i++) particles.push(new Particle(d.x, d.y - d.z, i % 2 ? '#ff4d6d' : '#ffd23f', 0));
                for (const e of enemiesOf(boss)) {
                    if (inBossShape(d.warn, e)) boss.strike(e, MATRI_DRONES.damage, { sound: 'hit_heavy' }, directionTo(d, e), 6);
                }
            }
        }
    }
    matriDrones = matriDrones.filter(d => !d.dead);
    // Torres que já caíram e sumiram saem da lista
    fighters = fighters.filter(f => !(f.isPylon && f.isDead && f.deathTimer <= 0));
}

// --- Desenho: feixes, drones e quem está com glitch ou hackeado ---
function drawMatriEffects() {
    for (const b of matriFx.beams) {
        const k = b.life / b.max;
        const w = b.w * (0.6 + 0.4 * Math.sin(b.life * 1.3) ** 2);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.globalAlpha = 0.35 * k + 0.2;
        ctx.fillStyle = '#ff2aff';
        ctx.fillRect(0, -w, b.len, w * 2);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffb3ff';
        ctx.fillRect(0, -w * 0.45, b.len, w * 0.9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -w * 0.15, b.len, w * 0.3);
        ctx.restore();
        // a luz desce do núcleo até o chão onde o feixe começa
        if (alive(b.from)) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#ff2aff';
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(b.from.x, b.from.chestY); ctx.lineTo(b.x, b.y); ctx.stroke();
            ctx.restore();
        }
    }
    for (const d of matriDrones) {
        const x = Math.round(d.x), y = Math.round(d.y - d.z + Math.sin(d.phase) * 3);
        const blink = d.state === 'lock' && d.lock % 8 < 4;
        ctx.fillStyle = 'rgba(5, 0, 15, 0.4)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = MATRI_PAL.K; ctx.fillRect(x - 9, y - 9, 18, 18);
        ctx.fillStyle = MATRI_PAL.M; ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.fillStyle = MATRI_PAL.p; ctx.fillRect(x - 7, y - 7, 14, 3);
        ctx.fillStyle = blink ? '#ffffff' : d.state === 'lock' ? '#ff4d6d' : '#ff2aff';
        ctx.fillRect(x - 3, y - 2, 6, 5);                                               // olho
        ctx.fillStyle = MATRI_PAL.c;
        const prop = Math.sin(d.t * 0.9) * 10;
        ctx.fillRect(x - prop, y - 12, prop * 2 || 1, 2);                               // hélice
    }
    for (const f of fighters) {
        if (!alive(f) || !(f.glitchTimer > 0 || f.hackTimer > 0)) continue;
        const hacked = f.hackTimer > 0;
        ctx.save();
        for (let i = 0; i < (hacked ? 5 : 3); i++) {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = Math.random() < 0.5 ? '#ff2aff' : '#3ff6ff';
            ctx.fillRect(f.x - 18 + Math.random() * 22, f.y - f.z - Math.random() * f.height, 8 + Math.random() * 14, 2 + Math.random() * 3);
        }
        if (hacked) {
            ctx.globalAlpha = 1;
            ctx.font = 'bold 11px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#0a0614';
            const txt = `HACKEADO ${(f.hackTimer / 60).toFixed(1)}`;
            ctx.strokeText(txt, f.x, f.y - f.z - f.height - 22);
            ctx.fillStyle = '#ff2aff';
            ctx.fillText(txt, f.x, f.y - f.z - f.height - 22);
        }
        ctx.restore();
    }
}

// Por cima de tudo: tela "quebrando" em faixas (glitch). Só pinta faixas por cima: copiar a própria tela
// (como era antes) obriga o navegador a esperar a placa de vídeo e dava trancos na troca de fase.
function drawMatriGlitch(amount) {
    if (amount <= 0) return;
    ctx.save();
    const n = Math.min(10, 3 + amount / 3);
    for (let i = 0; i < n; i++) {
        const y = Math.random() * WORLD_H, hh = 3 + Math.random() * 22, dx = (Math.random() - 0.5) * 60;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#05000f';
        ctx.fillRect(dx, y, WORLD_W, hh);                       // faixa "deslocada" escura
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = i % 2 ? '#ff2aff' : '#3ff6ff';
        ctx.fillRect(dx + (i % 2 ? 4 : -4), y, WORLD_W, 2);     // borda colorida (aberração de cor)
    }
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ['#ff2aff', '#3ff6ff', '#ffffff'][i];
        ctx.fillRect(0, Math.random() * WORLD_H, WORLD_W, 2 + Math.random() * 8);
    }
    ctx.restore();
}

// --- Abertura: "download completo" ---
const MINTRO = { glitch: 40, type: 40, beam: 112, build: 170, eyes: 230, burst: 262, pylons: 285, end: 360 };
const MINTRO_LINES = ['> CONEXÃO NÃO AUTORIZADA DETECTADA...', '> INICIANDO PROTOCOLO MATRIARCA'];

function startMatriIntro(boss) {
    bossIntro = { kind: 'matriarca', t: 0, boss, padArmed: false, glyphs: [] };
    boss.introHidden = true;
    boss.build = { reveal: 0, rings: 0, cables: 0, eyes: 0 };
    hud.style.visibility = 'hidden';
    if (mapState) mapState.banner = 0;
}

function updateMatriIntro() {
    const I = bossIntro, b = I.boss, t = ++I.t;
    const pressed = getGamepads().some(p => p.buttons.some(btn => btn.pressed));
    if (!pressed) I.padArmed = true;
    if (t > 20 && (I.skip || (I.padArmed && pressed))) { finishMatriIntro(); return; }
    if (t === 1 || t === 24) { sfx.play('matri_glitch'); matriFx.glitch = 14; }
    if (t < MINTRO.glitch) screenShake = Math.max(screenShake, 2);
    // Terminal digitando (um bipe a cada letra, de vez em quando)
    if (t >= MINTRO.type && t < MINTRO.beam && t % 4 === 0) sfx.play('menu_move');
    // Feixe descendo do céu, com dados subindo por ele
    if (t === MINTRO.beam) sfx.play('matri_beam');
    if (t >= MINTRO.beam && t < MINTRO.burst) {
        for (let i = 0; i < 2; i++) I.glyphs.push({ x: b.x + (Math.random() - 0.5) * 50, y: b.y + Math.random() * 10, vy: -2 - Math.random() * 3, ch: Math.random() < 0.5 ? '0' : '1', life: 50 });
    }
    for (const gl of I.glyphs) { gl.y += gl.vy; gl.life--; }
    I.glyphs = I.glyphs.filter(gl => gl.life > 0);
    // Montagem: núcleo linha por linha, depois os anéis, depois os cabos
    if (t === MINTRO.build) { b.introHidden = false; sfx.play('matri_boot'); }
    if (t >= MINTRO.build) {
        const s = t - MINTRO.build;
        b.build.reveal = Math.min(1, s / 26);
        b.build.rings = Math.max(0, Math.min(1, (s - 20) / 20));
        b.build.cables = Math.max(0, Math.min(1, (s - 34) / 22));
    }
    // Olhos abrindo e olhando para cada lutador
    if (t === MINTRO.eyes) { b.build.eyes = 0.5; sfx.play('heal'); }
    if (t === MINTRO.eyes + 8) b.build.eyes = 1;
    if (t > MINTRO.eyes + 8 && t < MINTRO.burst) {
        const team = fighters.filter(f => f.team === 0);
        const who = team[Math.floor((t - MINTRO.eyes - 8) / 10) % Math.max(1, team.length)];
        b.face = 'neutral';
        if (who) b.look = Math.max(-1, Math.min(1, (who.x - b.x) / 120)) * b.facing;
    }
    if (t === MINTRO.burst - 6) { b.face = 'smile'; b.faceTimer = 120; }
    // O feixe explode numa onda de luz
    if (t === MINTRO.burst) {
        sfx.play('matri_shield');
        screenShake = 10;
        I.flash = 1;
        bossFx.rings.push({ x: b.x, y: b.y, life: 36, max: 36, color: '#3ff6ff', r: 420 });
    }
    if (I.flash > 0) I.flash = Math.max(0, I.flash - 0.04);
    // Torres de escudo subindo
    if (t === MINTRO.pylons) b.raisePylons();
    for (const p of b.pylons) p.update();
    b.anim++;
    if (t >= MINTRO.end) finishMatriIntro();

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    floatingTexts.forEach(f => f.update());
    floatingTexts = floatingTexts.filter(f => f.life > 0);
    if (window.pixelFx) pixelFx.update();
    for (const r of bossFx.rings) r.life--;
    bossFx.rings = bossFx.rings.filter(r => r.life > 0);
    if (matriFx.glitch > 0) matriFx.glitch--;
    screenShake = screenShake > 0.3 ? screenShake * 0.88 : 0;
}

function finishMatriIntro() {
    const b = bossIntro.boss;
    b.introHidden = false;
    b.build = { reveal: 1, rings: 1, cables: 1, eyes: 1 };
    if (!b.pylons.length) b.raisePylons(true);
    for (const p of b.pylons) p.rise = 0;
    bossIntro = null;
    hud.style.visibility = '';
    b.rest = 60;
    if (mapState) mapState.banner = 150;
    announcer.onStart();
}

function drawMatriIntroOverlay() {
    const I = bossIntro, b = I.boss, t = I.t;
    const cx = (arena.left + arena.right) / 2;
    ctx.save();
    // Feixe de luz do céu até ela
    if (t >= MINTRO.beam && t < MINTRO.burst + 6) {
        const grow = Math.min(1, (t - MINTRO.beam) / 30);
        const w = 6 + grow * 54 + Math.sin(t * 0.5) * 4;
        const reach = Math.min(1, (t - MINTRO.beam) / 14);
        const bottom = b.y - (b.y) * (1 - reach);
        const grad = ctx.createLinearGradient(b.x - w, 0, b.x + w, 0);
        grad.addColorStop(0, 'rgba(63, 246, 255, 0)');
        grad.addColorStop(0.5, 'rgba(200, 255, 255, 0.85)');
        grad.addColorStop(1, 'rgba(63, 246, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - w, 0, w * 2, bottom);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#3ff6ff';
        ctx.beginPath(); ctx.ellipse(b.x, b.y, w * 1.4, w * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    for (const gl of I.glyphs) {
        ctx.globalAlpha = gl.life / 50;
        ctx.fillStyle = '#d8ffff';
        ctx.fillText(gl.ch, gl.x, gl.y);
    }
    ctx.globalAlpha = 1;
    // Faixas de cinema
    const bar = Math.min(1, t / 20) * 50;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD_W, bar);
    ctx.fillRect(0, WORLD_H - bar, WORLD_W, bar);
    // Terminal digitando
    if (t >= MINTRO.type && t < MINTRO.burst) {
        const chars = Math.floor((t - MINTRO.type) / 1.5);
        let left = chars;
        ctx.textAlign = 'left';
        ctx.font = 'bold 20px monospace';
        const x0 = cx - 230, y0 = arena.top + 70;
        ctx.fillStyle = 'rgba(0, 10, 12, 0.75)';
        ctx.fillRect(x0 - 14, y0 - 28, 488, 74);
        ctx.strokeStyle = '#3ff6ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 - 14, y0 - 28, 488, 74);
        MINTRO_LINES.forEach((line, i) => {
            const shown = line.slice(0, Math.max(0, left));
            left -= line.length;
            ctx.fillStyle = i === 1 ? '#ff2aff' : '#3ff6ff';
            ctx.fillText(shown + (left < 0 && left > -line.length - 1 && t % 20 < 10 ? '█' : ''), x0, y0 + i * 30);
        });
    }
    // Clarão e o nome
    if (I.flash > 0) {
        ctx.globalAlpha = I.flash * 0.8;
        ctx.fillStyle = '#e8ffff';
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    if (t >= MINTRO.burst) {
        const a = t - MINTRO.burst;
        const pop = a < 8 ? 1.5 - a / 16 : 1;
        ctx.globalAlpha = Math.min(1, a / 6);
        ctx.textAlign = 'center';
        ctx.translate(cx, arena.top + 90);
        ctx.scale(pop, pop);
        ctx.font = 'bold 64px Orbitron, sans-serif';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#0a0614';
        ctx.strokeText('MATRIARCA', 0, 0);
        ctx.shadowColor = '#ff2aff';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ff2aff';
        ctx.fillText('MATRIARCA', 0, 0);
        ctx.shadowBlur = 0;
        ctx.font = 'bold 18px Orbitron, sans-serif';
        ctx.lineWidth = 5;
        ctx.strokeText('A MENTE DA REDE', 0, 32);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('A MENTE DA REDE', 0, 32);
        ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    }
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'center';
    ctx.font = '14px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('qualquer tecla para pular', cx, WORLD_H - 20);
    ctx.restore();
}

// --- Placar: uma barra de vida e o estado do escudo ---
function buildMatriHud(boss, column) {
    const card = makeEl('div', 'boss-hud matri-hud', column);
    const title = makeEl('div', 'boss-title', card);
    makeEl('span', 'boss-name', title).innerText = 'MATRIARCA';
    const phase = makeEl('span', 'boss-phase', title);
    const bar = makeEl('div', 'boss-head-bar matri-bar', card);
    const fill = makeEl('div', 'boss-head-fill', bar);
    const shield = makeEl('div', 'matri-shield', card);
    boss.bossHud = { phase, fill, shield };
}

function updateMatriHud(boss) {
    const H = boss.bossHud;
    setIfChanged(H.phase, 'innerText', boss.isDead ? 'DERROTADA' : ['FASE 1', 'FASE 2', 'FASE 3 · FÚRIA'][boss.phase]);
    setIfChanged(H.fill.style, 'width', `${Math.max(0, boss.health / boss.maxHealth) * 100}%`);
    const up = boss.pylons.filter(p => alive(p)).length;
    const text = boss.isDead ? '' : boss.reboot > 0 ? '⟳ REINICIANDO...' : boss.exposed > 0 ? `⚠ EXPOSTA: ${(boss.exposed / 60).toFixed(1)}s` : `🛡 ESCUDO: ${up} ${up === 1 ? 'torre' : 'torres'}`;
    setIfChanged(H.shield, 'innerText', text);
}
