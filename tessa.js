// --- Corpo a corpo: Tessa "Ponto" ---
// Costureira clandestina de implantes que briga com uma tesoura de alfaiate gigante.
// - Tesourada (golpe): corte rápido que prende um FIO de linha no inimigo (até 4; somem se ela parar de acertar).
// - Tesourada em X (golpe forte): a tesoura abre enquanto ela segura e fecha num X; quem está bem no cruzamento
//   das lâminas leva o CORTE CERTO (mais dano). Com 3 fios ou mais, ela PUXA A LINHA: dano extra por fio e o
//   inimigo vem arrastado para perto dela.
// - Bastidor (defesa): tiro que bate no tecido fica preso e devolve um fio para quem atirou.
// - Ziguezague (ultimate): 3 avanços em zigue-zague, de inimigo em inimigo, cortando e deixando um rastro de
//   linha; no fim ela puxa a linha, a costura se fecha e explode em todos que estão no caminho
//   (cada fio preso no inimigo aumenta a explosão nele).

// Tesourada
const TESSA_PUNCH_DAMAGE = 10;
const TESSA_SNIP_COOLDOWN = 15;
// Fios
const TESSA_MAX_THREADS = 4;
const TESSA_THREAD_DURATION = 300;   // 5 s sem renovar e os fios soltam
// Tesourada em X
const TESSA_X_DAMAGE = 24;
const TESSA_X_SWEET_DAMAGE = 36;     // no cruzamento das lâminas
const TESSA_X_SWEET_AHEAD = 40;      // distância do cruzamento à borda dela
const TESSA_X_SWEET_SIZE = 18;       // folga em volta do cruzamento
const TESSA_PULL_MIN = 3;            // fios para puxar a linha
const TESSA_PULL_PER_THREAD = 7;
const TESSA_PULL_FORCE = 9;
// Ziguezague
const TESSA_ZIG_COST = 160;
const TESSA_ZIG_RANGE = 230;         // alcance de cada avanço (a partir de onde ela está)
const TESSA_ZIG_HOPS = 3;
const TESSA_ZIG_STEPS = 8;           // passos que cada avanço leva
const TESSA_ZIG_PAUSE = 3;           // respiro entre um avanço e outro
const TESSA_ZIG_SIDE = 26;           // desvio para o lado (o "zigue" e o "zague")
const TESSA_ZIG_CUT = 20;
const TESSA_ZIG_PULL = 16;           // passos puxando a linha antes da explosão
const TESSA_ZIG_WIDTH = 30;          // largura da costura que explode
const TESSA_ZIG_BLAST = 50;
const TESSA_ZIG_PER_THREAD = 12;
const TESSA_COLORS = ['#4ff2ff', '#ff5fa8', '#ffffff'];

let tessaSeams = []; // costuras explodindo (só desenho): { points, life, max }

// --- Esqueleto: tesourão de duas mãos ---
// Ela segura a tesoura na diagonal, à frente do corpo, como uma tesoura de poda gigante: a mão de trás no
// cabo de cima, a da frente no cabo de baixo. O sprite separa as duas metades em letras próprias
// (metade A: lâmina de cima + cabo de baixo; metade B: lâmina de baixo + cabo de cima) e os dois braços.
// Cada metade gira no parafuso e cada braço gira no ombro acompanhando a mão no cabo: para abrir, os braços
// se afastam; para cortar, as mãos se juntam. Giro negativo na metade A abre (a lâmina de cima sobe).
// Medidas do desenho (as mesmas do gerador do sprite): parado, a tesoura fica 24° aberta; A +12 / B -12 fecha.
const TESSA_RIG = {
    pivot: [46.5, 33.5],
    shoulderBack: [23.5, 25.5],
    shoulderFront: [41.5, 25.5],
    handAngleA: 124,   // direção do cabo de baixo (mão da frente) no desenho parado
    handAngleB: 196,   // direção do cabo de cima (mão de trás)
    handDist: 10,      // distância do parafuso até a mão no cabo
    tip: [62.5, 27.5], // ponta das lâminas
};
(() => {
    const R = TESSA_RIG;
    const rig = autoRig('tessa'); // pernas e passada do esqueleto automático
    delete rig.rigs.main.parts.frontArm;
    Object.assign(rig.rigs.main.parts, {
        halfB: { rects: [[28, 14, 64, 50, 'XxYQ']], pivot: R.pivot, z: 0.5 },
        backArm: { rects: [[16, 18, 44, 42, 'GJZ']], pivot: R.shoulderBack, z: 0.6 },
        halfA: { rects: [[28, 14, 64, 50, 'MmWP']], pivot: R.pivot, z: 0.7 },
        frontArm: { rects: [[30, 18, 50, 48, 'EFUu']], pivot: R.shoulderFront, z: 0.8 },
        screw: { rects: [[42, 29, 50, 37, 'Cc']], pivot: R.pivot, z: 0.9 },
    });
    // Quanto o braço gira no ombro para a mão continuar no cabo depois de a metade girar
    const deg = r => r * 180 / Math.PI;
    const follow = (shoulder, handAngle, spin) => {
        const hand = a => [R.pivot[0] + R.handDist * Math.cos(a * Math.PI / 180), R.pivot[1] + R.handDist * Math.sin(a * Math.PI / 180)];
        const [x0, y0] = hand(handAngle), [x1, y1] = hand(handAngle + spin);
        return deg(Math.atan2(y1 - shoulder[1], x1 - shoulder[0]) - Math.atan2(y0 - shoulder[1], x0 - shoulder[0]));
    };
    // a: giro da metade A (lâmina de cima), b: da metade B; os braços vão junto
    const snip = (a, b) => ({
        halfA: [a], halfB: [b],
        frontArm: [follow(R.shoulderFront, R.handAngleA, a)],
        backArm: [follow(R.shoulderBack, R.handAngleB, b)],
    });
    const OPEN = 16, SHUT = 13; // escancarada (além do parado) e fechada (um pouco além de encostar)
    const walk = rig.anims.walk.pose;
    rig.anims = {
        ...rig.anims,
        // Parada: a tesoura "respira", abrindo e fechando um tiquinho
        idle: { frames: 8, period: 1600, pose: t => snip(-2 * Math.sin(t * Math.PI * 2), 2 * Math.sin(t * Math.PI * 2)) },
        // Andando: as pernas do esqueleto automático, a tesoura firme nas mãos
        walk: { frames: 8, pose: t => { const p = walk(t); return { dy: p.dy, backThigh: p.backThigh, backShin: p.backShin, frontThigh: p.frontThigh, frontShin: p.frontShin, ...snip(-3 * Math.sin(t * Math.PI * 2), 3 * Math.sin(t * Math.PI * 2)) }; } },
        // Tesourada: abre os braços e junta as mãos num corte seco (o golpe acerta entre os passos 2 e 8)
        punch: {
            steps: 15, frames: 15,
            pose: rigKeys([
                { t: 0, dx: -1, ...snip(-12, 12) },
                { t: 0.13, dx: 2, ...snip(SHUT, -SHUT) },
                { t: 0.35, dx: 1, ...snip(SHUT - 1, -SHUT + 1) },
                { t: 0.65, dx: 0, ...snip(0, 0) },
                { t: 1, ...snip(0, 0) },
            ]),
        },
        // Tesourada em X: já vem escancarada do carregamento e fecha com tudo, com um tranco para a frente
        strong_punch: {
            steps: 40, frames: 40,
            pose: rigKeys([
                { t: 0, dx: -2, ...snip(-OPEN, OPEN) },
                { t: 0.1, dx: 3, ...snip(SHUT + 1, -SHUT - 1) },
                { t: 0.32, dx: 2, ...snip(SHUT, -SHUT) },
                { t: 0.6, dx: 0, ...snip(0, 0) },
                { t: 1, ...snip(0, 0) },
            ]),
        },
    };
    const legsWalking = f => {
        if (f.walkFrame === null || f.walkFrame === undefined || Math.hypot(f.moveX || 0, f.moveY || 0) <= 0.3) return {};
        const p = walk(Math.floor(((f.walkPhase || 0) / 4 % 1) * 8) / 8);
        return { dy: p.dy, backThigh: p.backThigh, backShin: p.backShin, frontThigh: p.frontThigh, frontShin: p.frontShin };
    };
    rig.custom = f => {
        // Ziguezague: aberta no avanço, fecha no corte; puxando a linha, escancarada
        const z = f.zigzag;
        if (z) {
            if (z.pull > 0) return snip(-OPEN - 2, OPEN + 2);
            if (z.pause > 0) return snip(4, -4);
            const k = z.hop_t / TESSA_ZIG_STEPS;
            return k < 0.45 ? { dx: 1, ...snip(-OPEN, OPEN) } : { dx: 2, ...snip(SHUT, -SHUT) };
        }
        // Segurando o golpe: os braços vão abrindo a tesoura até escancarar (6 aberturas, para guardar poucos quadros)
        if (f.isChargingPunch && !f.isAttacking && (f.punchHeld || 0) > 3) {
            const k = Math.round(Math.min(1, f.punchHeld / STRONG_PUNCH_HOLD) * 6) / 6;
            return { ...legsWalking(f), dx: -Math.round(k * 2), ...snip(-OPEN * k, OPEN * k) };
        }
        return null;
    };
    pixelCharacters.tessa.rig = rig;
})();

// Brilho do corte na ponta das lâminas quando a tesoura fecha (ponto do sprite -> mundo)
function tessaBladeTip(f) {
    const h = f.height;
    return { x: f.x + f.facing * (TESSA_RIG.tip[0] / 64 - 0.5) * h, y: f.y - f.z - h + (TESSA_RIG.tip[1] / 64) * h };
}

// Prende fios no alvo (o mais recente a costurar fica como dono)
function addTessaThreads(target, tessa, n = 1) {
    if (!alive(target) || target === tessa || target.team === tessa.team) return;
    const t = target.tessaThreads && target.tessaThreads.from === tessa ? target.tessaThreads : { count: 0, from: tessa };
    t.count = Math.min(TESSA_MAX_THREADS, t.count + n);
    t.timer = TESSA_THREAD_DURATION;
    target.tessaThreads = t;
}

function tessaThreadsOn(target, tessa) {
    const t = target && target.tessaThreads;
    return t && t.from === tessa ? t.count : 0;
}

// Ponto onde as lâminas se cruzam na Tesourada em X
function tessaSweetSpot(f) {
    const ahead = f.radius + TESSA_X_SWEET_AHEAD;
    return { x: f.x + f.aim.x * ahead, y: f.y + f.aim.y * ahead };
}

// Dano da Tesourada em X (chamado pelo tryMelee antes do golpe)
function tessaStrongDamage(attacker, defender) {
    const spot = tessaSweetSpot(attacker);
    const sweet = Math.hypot(defender.x - spot.x, defender.y - spot.y) < defender.radius + TESSA_X_SWEET_SIZE;
    attacker.tessaSweet = sweet;
    const threads = tessaThreadsOn(defender, attacker);
    attacker.tessaPull = threads >= TESSA_PULL_MIN ? threads : 0;
    return (sweet ? TESSA_X_SWEET_DAMAGE : TESSA_X_DAMAGE) + attacker.tessaPull * TESSA_PULL_PER_THREAD;
}

// Depois que o golpe da Tessa acertou de verdade (não defendido)
function tessaOnHit(attacker, target) {
    if (attacker.attackType === 'punch') {
        addTessaThreads(target, attacker, 1);
        return;
    }
    if (attacker.attackType !== 'strong_punch') return;
    if (attacker.tessaSweet) {
        floatingTexts.push(new FloatingText(target.x, target.y - target.z - target.height - 30, 'CORTE CERTO!', '#4ff2ff'));
        if (window.pixelFx) pixelFx.spawn('crit-hit', { x: target.x, y: target.y - target.z, flip: attacker.x > target.x, height: Math.round((target.y - target.chestY) / 2), palette: 'cyber', seed: Math.floor(Math.random() * 1000) });
    }
    if (attacker.tessaPull) {
        // Puxa a linha: os fios esticam e o inimigo vem arrastado
        target.tessaThreads = null;
        target.push(directionTo(target, attacker), TESSA_PULL_FORCE + 4); // +4 compensa o empurrão normal do golpe
        floatingTexts.push(new FloatingText(attacker.x, attacker.y - attacker.height - 18, 'PUXOU A LINHA!', '#ff5fa8'));
        tessaSeams.push({ points: [{ x: attacker.x, y: attacker.chestY }, { x: target.x, y: target.chestY }], life: 14, max: 14 });
        sfx.play('tessa_pull');
    }
    attacker.tessaSweet = false;
    attacker.tessaPull = 0;
}

// Bastidor: tiro que bate na Tessa defendendo fica preso no tecido e devolve um fio para quem atirou
function tessaCatchShot(target, shooter) {
    if (!target || target.characterType !== 'tessa' || !target.isDefending || !alive(shooter) || shooter.isTurret) return;
    addTessaThreads(shooter, target, 1);
    floatingTexts.push(new FloatingText(target.x, target.y - target.height - 14, 'PRESO!', '#4ff2ff'));
}

Object.assign(Fighter.prototype, {
    // Ziguezague: só gasta a energia se houver alguém no alcance do primeiro avanço
    startZigzag() {
        this.isAttacking = false;
        if (this.zigzag || this.energy < TESSA_ZIG_COST || this.specialCooldown > 0) return;
        if (!this.nextZigTarget(new Set())) return;
        this.energy -= TESSA_ZIG_COST;
        this.specialCooldown = 60;
        this.attackCooldown = 15;
        this.zigzag = { hop: 0, hop_t: 0, pause: 0, from: null, to: null, target: null, side: Math.random() < 0.5 ? 1 : -1,
            cut: new Set(), trail: [{ x: this.x, y: this.y }], pull: 0, hit: false };
        this.spriteForm = 'zigue';
        this.poseSpecial();
        floatingTexts.push(new FloatingText(this.x, this.y - this.z - this.height - 22, 'ZIGUEZAGUE!', '#ff5fa8'));
        sfx.play('tessa_special');
        this.beginZigHop();
    },

    // Próximo alvo: o inimigo mais perto que ainda não levou corte nesta ultimate (se todos levaram, o mais perto)
    nextZigTarget(cut) {
        const inRange = enemiesOf(this).filter(e => !e.isInsideOpponent && distance(this, e) <= TESSA_ZIG_RANGE)
            .sort((a, b) => distance(this, a) - distance(this, b));
        return inRange.find(e => !cut.has(e)) || inRange[0] || null;
    },

    beginZigHop() {
        const z = this.zigzag;
        const target = this.nextZigTarget(z.cut);
        if (!target) { z.pull = TESSA_ZIG_PULL; return; } // ninguém mais no alcance: já puxa a linha
        const dir = directionTo(this, target);
        const gap = this.radius + target.radius + 14;
        z.side = -z.side; // alterna o lado: zigue, zague
        const to = {
            x: target.x + dir.x * gap - dir.y * TESSA_ZIG_SIDE * z.side,
            y: target.y + dir.y * gap + dir.x * TESSA_ZIG_SIDE * z.side,
        };
        to.x = Math.max(arena.left + this.radius, Math.min(arena.right - this.radius, to.x));
        to.y = Math.max(arena.top + this.radius, Math.min(arena.bottom - this.radius, to.y));
        z.from = { x: this.x, y: this.y };
        z.to = to;
        z.target = target;
        z.hop_t = 0;
        z.hit = false;
        this.target = target;
        this.facing = to.x >= this.x ? 1 : -1;
        sfx.play('tessa_dash');
    },
});

// Explosão da costura: dano em todos os inimigos perto de qualquer trecho do rastro
function tessaSeamBlast(f) {
    const z = f.zigzag;
    const pts = z.trail;
    const nearSeam = e => {
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const dx = b.x - a.x, dy = b.y - a.y;
            const len2 = dx * dx + dy * dy || 1;
            const k = Math.max(0, Math.min(1, ((e.x - a.x) * dx + (e.y - a.y) * dy) / len2));
            if (Math.hypot(e.x - (a.x + dx * k), e.y - (a.y + dy * k)) < TESSA_ZIG_WIDTH + e.radius) return true;
        }
        return false;
    };
    let any = false;
    for (const e of enemiesOf(f)) {
        if (e.isInsideOpponent || !nearSeam(e)) continue;
        const threads = tessaThreadsOn(e, f);
        const damage = TESSA_ZIG_BLAST + threads * TESSA_ZIG_PER_THREAD;
        const defended = e.takeDamage(damage, { sound: 'blade_hit' }, f);
        if (defended) continue;
        any = true;
        e.tessaThreads = null;
        if (threads) floatingTexts.push(new FloatingText(e.x, e.y - e.z - e.height - 30, threads >= TESSA_MAX_THREADS ? 'ARREMATE!' : `+${threads} FIOS`, '#4ff2ff'));
        if (window.pixelFx) pixelFx.spawn('crit-hit', { x: e.x, y: e.y - e.z, flip: f.x > e.x, height: Math.round((e.y - e.chestY) / 2), palette: 'candy', seed: Math.floor(Math.random() * 1000) });
    }
    // Retalhos e faíscas ao longo de toda a costura
    for (let i = 1; i < pts.length; i++) {
        for (let k = 0; k < 6; k++) {
            const t = Math.random();
            particles.push(new Particle(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t - 14, TESSA_COLORS[k % 3], 0));
        }
    }
    tessaSeams.push({ points: pts.map(p => ({ x: p.x, y: p.y - 12 })), life: 22, max: 22, blast: true });
    sfx.play('tessa_blast');
    screenShake = Math.max(screenShake, any ? 9 : 5);
    if (any) hitStop = HIT_STOP + 2;
}

function endZigzag(f) {
    f.zigzag = null;
    f.spriteForm = null;
    f.kbx = 0; f.kby = 0;
}

// Depois do movimento: avanços da ultimate e o tempo dos fios
function updateTessa() {
    for (const f of fighters) {
        const t = f.tessaThreads;
        if (t && (--t.timer <= 0 || !alive(t.from) || f.isDead)) f.tessaThreads = null;
    }
    for (const s of tessaSeams) s.life--;
    tessaSeams = tessaSeams.filter(s => s.life > 0);

    for (const f of fighters) {
        const z = f.zigzag;
        if (!z) continue;
        if (!alive(f) || f.characterType !== 'tessa') { endZigzag(f); continue; }
        if (typeof timeFrozen === 'function' && timeFrozen(f)) continue; // Cronodrive da Vex: ela também fica lenta
        f.kbx = 0; f.kby = 0;
        f.isParalyzed = false; // começou, vai até o fim (como a enterrada do Coleone)

        // Puxando a linha: a costura brilha e depois explode
        if (z.pull > 0) {
            if (--z.pull === 0) { tessaSeamBlast(f); endZigzag(f); }
            continue;
        }
        if (z.pause > 0) { z.pause--; if (z.pause === 0) f.beginZigHop(); continue; }

        z.hop_t++;
        const k = Math.min(1, z.hop_t / TESSA_ZIG_STEPS);
        f.x = z.from.x + (z.to.x - z.from.x) * k;
        f.y = z.from.y + (z.to.y - z.from.y) * k;
        if (z.hop_t % 2 === 0) particles.push(new Particle(f.x, f.chestY, TESSA_COLORS[z.hop_t % 3], 0, { x: 0, y: -0.4 }));
        if (!z.hit && k >= 0.5) {
            z.hit = true;
            const target = z.target;
            if (alive(target) && distance(f, target) < 80) {
                z.cut.add(target);
                const defended = target.takeDamage(TESSA_ZIG_CUT, { sound: 'blade_hit' }, f);
                if (!defended) {
                    addTessaThreads(target, f, 1); // cada corte da ultimate também prende um fio
                    if (window.pixelFx) pixelFx.spawn('sword-slash', { x: target.x, y: target.y, flip: z.to.x < z.from.x, palette: 'cyber', seed: Math.floor(Math.random() * 1000) });
                }
            }
        }
        if (k >= 1) {
            z.trail.push({ x: f.x, y: f.y });
            z.hop++;
            if (z.hop >= TESSA_ZIG_HOPS) { z.pull = TESSA_ZIG_PULL; sfx.play('tessa_pull'); }
            else z.pause = TESSA_ZIG_PAUSE;
        }
    }
}

// --- Desenho ---
// Fios presos (do inimigo até a mão da Tessa), a mira da Tesourada em X e o rastro da ultimate
function drawTessa() {
    const now = performance.now() / 1000;
    ctx.save();
    ctx.lineCap = 'round';
    // Fios presos nos inimigos
    for (const f of fighters) {
        const t = f.tessaThreads;
        if (!t || !alive(f) || !alive(t.from)) continue;
        const from = t.from;
        const fade = Math.min(1, t.timer / 40);
        for (let i = 0; i < t.count; i++) {
            const off = (i - (t.count - 1) / 2) * 3;
            const sag = 10 + 4 * Math.sin(now * 3 + i);
            const ax = from.x + from.facing * 10, ay = from.chestY + off;
            const bx = f.x, by = f.chestY + off;
            ctx.globalAlpha = 0.55 * fade;
            ctx.strokeStyle = i % 2 ? '#ff5fa8' : '#4ff2ff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by);
            ctx.stroke();
        }
        // Contador em cima da cabeça: um ponto por fio
        ctx.globalAlpha = fade;
        for (let i = 0; i < TESSA_MAX_THREADS; i++) {
            ctx.fillStyle = i < t.count ? (t.count >= TESSA_PULL_MIN ? '#ff5fa8' : '#4ff2ff') : 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(f.x - 13 + i * 7, f.y - f.z - f.height - 20, 5, 3);
        }
    }

    for (const f of fighters) {
        if (!alive(f) || f.characterType !== 'tessa') continue;
        // Carregando a Tesourada em X: a tesoura abre e marca o cruzamento no chão
        if (f.isChargingPunch && f.punchHeld > 4) {
            const open = Math.min(1, f.punchHeld / STRONG_PUNCH_HOLD);
            const spot = tessaSweetSpot(f);
            const r = 6 + 10 * open;
            ctx.globalAlpha = 0.35 + 0.45 * open;
            ctx.strokeStyle = open >= 1 ? '#ffffff' : '#4ff2ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(spot.x - r, spot.y - r * 0.6); ctx.lineTo(spot.x + r, spot.y + r * 0.6);
            ctx.moveTo(spot.x - r, spot.y + r * 0.6); ctx.lineTo(spot.x + r, spot.y - r * 0.6);
            ctx.stroke();
        }
        // Tesoura fechando: um estalo de luz em X na ponta das lâminas
        const snapAge = f.isAttacking && (f.attackType === 'punch' || f.attackType === 'strong_punch') ? f.attackAge - (f.attackType === 'punch' ? 2 : 4) : -1;
        if (snapAge >= 0 && snapAge < 7) {
            const tip = tessaBladeTip(f);
            const k = snapAge / 7, big = f.attackType === 'strong_punch' ? 1.6 : 1;
            const r = (4 + 8 * k) * big;
            ctx.globalAlpha = 1 - k;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tip.x - r, tip.y - r * 0.5); ctx.lineTo(tip.x + r, tip.y + r * 0.5);
            ctx.moveTo(tip.x - r, tip.y + r * 0.5); ctx.lineTo(tip.x + r, tip.y - r * 0.5);
            ctx.stroke();
            ctx.strokeStyle = f.attackType === 'strong_punch' ? '#ff5fa8' : '#4ff2ff';
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y - r * 0.8); ctx.lineTo(tip.x, tip.y + r * 0.8);
            ctx.stroke();
        }
        // Rastro da ultimate: linha tracejada (pontos de costura) seguindo os avanços
        const z = f.zigzag;
        if (z) {
            const pts = z.trail.concat(z.pull > 0 ? [] : [{ x: f.x, y: f.y }]);
            const pulling = z.pull > 0 ? 1 - z.pull / TESSA_ZIG_PULL : 0;
            ctx.globalAlpha = 0.9;
            ctx.setLineDash([7, 5]);
            ctx.lineDashOffset = -now * 40;
            ctx.strokeStyle = pulling ? (Math.floor(now * 20) % 2 ? '#ffffff' : '#ff5fa8') : '#4ff2ff';
            ctx.lineWidth = 3 + pulling * 4;
            ctx.beginPath();
            pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y - 12) : ctx.moveTo(p.x, p.y - 12));
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Costuras explodindo / linha esticando
    for (const s of tessaSeams) {
        const k = s.life / s.max;
        ctx.globalAlpha = k;
        ctx.strokeStyle = s.blast ? '#ffffff' : '#ff5fa8';
        ctx.lineWidth = s.blast ? 4 + 10 * (1 - k) : 2;
        ctx.beginPath();
        s.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.stroke();
        if (s.blast) {
            ctx.strokeStyle = '#4ff2ff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    ctx.restore();
}
