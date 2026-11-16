// --- Modo Chefão ---
// Partes comuns aos chefes (avisos no chão, efeitos, placar, montagem da partida) e o CÉRBERO-X.
// A MATRIARCA fica em matriarca.js e usa estas mesmas partes.
//
// CÉRBERO-X:
// Até 4 jogadores (e aliados da IA) no mesmo time contra um cão-robô de segurança de três cabeças.
// Cada cabeça tem a própria vida e o próprio elemento. A cabeça "acesa" (na frente) é a que leva o dano, até cair;
// os ataques especiais revezam entre os elementos das cabeças de pé. Quando uma cabeça cai, o chefe ruge e as
// outras ficam mais fortes (fases).
// Todos os golpes dele avisam no chão antes de acertar: quem sai da área não leva dano.
// A luta começa com a abertura: o chão racha, os olhos acendem no buraco e ele salta para fora.

const BOSS_TEAM_MIN = 3;          // o time dos jogadores tem pelo menos 3 lutadores (o resto é IA aliada)
const BOSS_MAX_HUMANS = 4;
const CERB_SCALE = 2;             // 1 pixel do desenho = 2 pixels do mundo
const CERB_RADIUS = 46;
const CERB_HEIGHT = 120;
const CERB_HEAD_HP = 900;         // vida de cada cabeça, por lutador no time dos jogadores
// Por fase (3, 2 e 1 cabeça de pé)
const CERB_SPEED = [1.5, 1.8, 2.2];
const CERB_POWER = [0.95, 1.06, 1.18];  // multiplica o dano dos golpes
const CERB_ARMOR = [0, 0.1, 0.2]; // dano a menos que ele recebe
const CERB_TELL = [0.9, 0.82, 0.72];   // tempo de aviso (mais curto nas fases finais)
const CERB_REST = [55, 45, 34];     // descanso entre ataques
const CERB_FURY_CHAIN = 0.3;
const CERB_HUNT = 0.3;              // chance de escolher o inimigo mais ferido como alvo        // fúria: chance de emendar outro ataque na hora
const CERB_ROAR = 120;              // rugido ao perder uma cabeça (fica imune)
const CERB_ELEMENT_COOLDOWN = 260;
const CERB_STAGGER = 35, CERB_STAGGER_IMMUNE = 420; // atordoamentos viram um tropeço curto
// Ataques: aviso (passos), alcance e dano
const CERB_BITE = { tell: 34, r: 125, half: 0.8, damage: 68, push: 8 };
const CERB_STOMP = { tell: 50, r: 150, damage: 63, push: 12 };
const CERB_CHARGE = { tell: 55, len: 430, w: 46, speed: 13, damage: 80, push: 12, chance: 0.25 }; // chance: em quem está longe
const CERB_FIRE = { tell: 42, r: 250, half: 0.5, duration: 48, tick: 8, damage: 14 };
const CERB_ICE = { tell: 55, r: 58, damage: 54, slow: 150 };
const CERB_VOLT = { tell: 50, lock: 16, r: 50, damage: [50, 40, 32], jump: 180, stun: 24 };

// Cabeças, de trás para a frente. at: canto do desenho da cabeça; neck: onde o pescoço sai do corpo
const CERB_HEADS = [
    { id: 'volt', name: 'ELÉTRICA', icon: '⚡', color: '#ffe600', pal: { E: '#ffe600', e: '#a88400', L: '#fffbc2' }, at: [58, 0], neck: [56, 24] },
    { id: 'fire', name: 'DE FOGO', icon: '🔥', color: '#ff7a1a', pal: { E: '#ff7a1a', e: '#b8380c', L: '#ffe08a' }, at: [72, 14], neck: [64, 26] },
    { id: 'ice', name: 'DE GELO', icon: '❄️', color: '#5fe8ff', pal: { E: '#5fe8ff', e: '#1a7fb0', L: '#e8fdff' }, at: [62, 30], neck: [62, 32] },
];

let bossIntro = null;     // abertura em andamento
let bossWarnings = [];    // avisos no chão
let bossFx = { flames: [], bolts: [], spikes: [], rings: [] };
let bossCrater = null;    // buraco de onde ele saiu (fica no chão)
let bossFightSteps = 0;   // duração da luta (aparece no fim)

// --- Desenho em pixel art (feito por código, como os lutadores) ---
const CERB_PAL = { K: '#120c1a', D: '#1d212c', M: '#323848', P: '#4c5569', p: '#7d88a2', R: '#ff2a3a', r: '#8a1020', T: '#ecebf2', W: '#ffffff' };

function cgGrid(w, h) { return Array.from({ length: h }, () => Array(w).fill('.')); }
function cgRect(g, x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && x >= 0 && x < g[y].length) g[y][x] = c;
}
function cgPx(g, pts, c) { for (const [x, y] of pts) if (g[y] && x >= 0 && x < g[y].length) g[y][x] = c; }
// Contorno escuro de 1 pixel em volta (a grade cresce 1 pixel de cada lado)
function cgOutline(g) {
    const h = g.length + 2, w = g[0].length + 2;
    const out = cgGrid(w, h);
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) out[y + 1][x + 1] = g[y][x];
    const filled = (x, y) => out[y] && out[y][x] && !'.kK'.includes(out[y][x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (out[y][x] !== '.') continue;
        if (filled(x + 1, y) || filled(x - 1, y) || filled(x, y + 1) || filled(x, y - 1)) out[y][x] = 'k';
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (out[y][x] === 'k') out[y][x] = 'K';
    return out;
}
function cgCanvas(grid, pal) {
    const h = grid.length, w = grid[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const col = pal[grid[y][x]];
        if (!col) continue;
        const i = (y * w + x) * 4;
        img.data[i] = parseInt(col.slice(1, 3), 16);
        img.data[i + 1] = parseInt(col.slice(3, 5), 16);
        img.data[i + 2] = parseInt(col.slice(5, 7), 16);
        img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
}
// Paleta "desligada" (cabeça destruída): tudo escuro e acinzentado
function cgDim(pal) {
    const out = {};
    for (const [k, v] of Object.entries(pal)) {
        if (k === 'K') { out[k] = v; continue; }
        const r = parseInt(v.slice(1, 3), 16), g = parseInt(v.slice(3, 5), 16), b = parseInt(v.slice(5, 7), 16);
        const grey = (r + g + b) / 3;
        const mix = c => Math.round((c * 0.25 + grey * 0.75) * 0.55).toString(16).padStart(2, '0');
        out[k] = `#${mix(r)}${mix(g)}${mix(b)}`;
    }
    return out;
}

function cgLeg() {
    const g = cgGrid(12, 28);
    cgRect(g, 2, 0, 9, 11, 'P'); cgRect(g, 2, 0, 3, 11, 'M'); cgRect(g, 7, 1, 8, 4, 'p');    // coxa
    cgRect(g, 3, 11, 8, 13, 'D'); cgPx(g, [[5, 12], [6, 12]], 'R');                            // joelho
    cgRect(g, 4, 14, 8, 22, 'M'); cgRect(g, 7, 15, 8, 21, 'P');                                 // canela
    cgRect(g, 1, 23, 10, 26, 'P'); cgRect(g, 1, 25, 10, 26, 'M');                               // pata
    cgPx(g, [[11, 25], [11, 26], [9, 27], [11, 27]], 'T');                                      // garras
    return cgOutline(g);
}

function cgBody() {
    const g = cgGrid(62, 28);
    cgRect(g, 6, 7, 57, 24, 'M');
    cgPx(g, [[6, 7], [57, 7], [6, 24], [57, 24]], '.');
    cgRect(g, 8, 5, 54, 9, 'P'); cgRect(g, 10, 5, 52, 5, 'p');                       // placas de cima
    for (let x = 12; x <= 48; x += 7) {                                               // espinhos na coluna
        cgPx(g, [[x, 4], [x + 1, 4], [x + 2, 4], [x + 1, 3], [x + 2, 3]], 'D');
        cgPx(g, [[x + 2, 2]], 'R');
    }
    cgRect(g, 40, 8, 55, 20, 'P'); cgRect(g, 40, 8, 41, 20, 'p'); cgRect(g, 54, 9, 55, 19, 'M'); // ombro
    cgRect(g, 55, 10, 59, 22, 'P'); cgRect(g, 58, 11, 59, 21, 'M');                  // peito
    cgRect(g, 6, 9, 18, 21, 'P'); cgRect(g, 6, 9, 7, 21, 'p');                       // quadril
    for (let x = 21; x <= 37; x += 4) cgPx(g, [[x, 13], [x + 1, 13]], 'R');           // luzes do lado
    cgRect(g, 22, 17, 37, 18, 'D');
    for (let x = 23; x <= 36; x += 3) cgPx(g, [[x, 17]], 'K');                         // respiros
    cgRect(g, 10, 21, 52, 24, 'D');                                                    // barriga
    cgPx(g, [[46, 12], [49, 15], [10, 12], [14, 17]], 'p');                            // parafusos
    return cgOutline(g);
}

function cgTail() {
    const g = cgGrid(22, 22);
    for (let i = 0; i < 7; i++) {
        const cx = Math.round(19 - i * 2.4), cy = Math.round(18 - i * 2 - (i > 3 ? (i - 3) * 0.6 : 0));
        cgRect(g, cx - 1, cy - 1, cx + 1, cy + 1, i % 2 ? 'M' : 'P');
        cgPx(g, [[cx, cy - 1]], 'p');
    }
    cgRect(g, 1, 1, 3, 3, 'R'); cgPx(g, [[2, 2]], 'W');                                 // ponta acesa
    return cgOutline(g);
}

function cgHead(id) {
    const g = cgGrid(32, 22);
    for (let y = 0; y < 8; y++) cgRect(g, 5, y, 5 + Math.floor(y * 0.6) + 1, y, 'P'); // orelha
    cgPx(g, [[6, 4], [6, 5], [7, 6]], 'r');
    cgRect(g, 3, 7, 17, 17, 'M');                                                      // crânio
    cgRect(g, 4, 6, 16, 9, 'P'); cgRect(g, 6, 6, 14, 6, 'p');
    cgRect(g, 11, 9, 17, 9, 'D');                                                      // sobrancelha
    cgRect(g, 12, 10, 15, 11, 'E'); cgPx(g, [[15, 10]], 'L');                         // olho
    cgRect(g, 16, 10, 28, 15, 'M'); cgRect(g, 16, 10, 28, 11, 'P');                   // focinho
    cgRect(g, 28, 10, 30, 12, 'D');                                                    // nariz
    cgRect(g, 5, 12, 10, 16, 'P'); cgPx(g, [[7, 14]], 'R');                           // bochecha
    for (let x = 18; x <= 27; x += 2) cgPx(g, [[x, 16]], 'T');                         // dentes de cima
    cgPx(g, [[19, 17], [26, 17]], 'T');                                                // presas
    cgRect(g, 0, 15, 5, 20, 'D'); cgPx(g, [[2, 17], [2, 19]], 'R');                   // coleira
    if (id === 'fire') {
        cgRect(g, 6, 9, 9, 10, 'E'); cgPx(g, [[7, 9], [8, 10]], 'L');                 // respiros de fogo
        cgPx(g, [[8, 5], [10, 4], [12, 5], [11, 4], [9, 4]], 'E'); cgPx(g, [[10, 3]], 'L'); // crista
        cgRect(g, 17, 12, 26, 12, 'e');
    } else if (id === 'ice') {
        cgPx(g, [[7, 5], [7, 4], [8, 3]], 'L');                                        // cristais
        cgPx(g, [[11, 5], [11, 4], [12, 3], [12, 2]], 'E');
        cgPx(g, [[14, 5], [15, 4]], 'L');
        cgRect(g, 5, 12, 10, 13, 'E');
    } else {
        cgRect(g, 9, 1, 9, 6, 'D'); cgPx(g, [[9, 0], [9, 2], [9, 4]], 'E');           // antena
        cgRect(g, 17, 12, 26, 12, 'E'); cgPx(g, [[20, 13], [23, 13]], 'e');
    }
    return cgOutline(g);
}

function cgJaw() {
    const g = cgGrid(22, 6);
    cgRect(g, 0, 1, 19, 3, 'D'); cgRect(g, 0, 3, 17, 4, 'M');
    for (let x = 6; x <= 18; x += 2) cgPx(g, [[x, 0]], 'T');
    return cgOutline(g);
}

let cerbArtCache = null;
function cerbArt() {
    if (cerbArtCache) return cerbArtCache;
    const far = { ...CERB_PAL, P: CERB_PAL.M, M: CERB_PAL.D, p: CERB_PAL.P };
    const dead = cgDim(CERB_PAL);
    const leg = cgLeg();
    cerbArtCache = {
        legNear: cgCanvas(leg, CERB_PAL), legFar: cgCanvas(leg, far),
        body: cgCanvas(cgBody(), CERB_PAL), tail: cgCanvas(cgTail(), CERB_PAL),
        heads: CERB_HEADS.map(h => cgCanvas(cgHead(h.id), { ...CERB_PAL, ...h.pal })),
        headsDead: CERB_HEADS.map(h => cgCanvas(cgHead(h.id), cgDim({ ...CERB_PAL, ...h.pal }))),
        jaw: cgCanvas(cgJaw(), CERB_PAL), jawDead: cgCanvas(cgJaw(), dead),
    };
    return cerbArtCache;
}

// Monta o cão inteiro numa pose. Coordenadas da grade com a origem no pé (centro), olhando para a direita.
function drawCerberoPose(g, P) {
    const A = cerbArt();
    const at = (img, gx, gy) => g.drawImage(img, gx - 53, gy - 67); // -1 do contorno
    at(A.tail, 0, 10 + P.bodyDy + Math.round(Math.sin(P.t * 0.08)));
    at(A.legFar, 24 + P.legs[0].dx, 36 + P.legs[0].dy);
    at(A.legFar, 56 + P.legs[1].dx, 36 + P.legs[1].dy);
    at(A.body, 12, 18 + P.bodyDy);
    at(A.legNear, 16 + P.legs[2].dx, 38 + P.legs[2].dy);
    at(A.legNear, 50 + P.legs[3].dx, 38 + P.legs[3].dy);
    for (let i = 0; i < CERB_HEADS.length; i++) drawCerberoHead(g, A, i, P.heads[i], P);
}

function drawCerberoNeck(g, x0, y0, x1, y1, dead) {
    const pts = [];
    for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        pts.push({ x: Math.round(x0 + (x1 - x0) * t), y: Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 3) });
    }
    g.fillStyle = CERB_PAL.K;
    for (const p of pts) g.fillRect(p.x - 3 - 52, p.y - 3 - 66, 7, 7);
    g.fillStyle = dead ? '#24242c' : CERB_PAL.M;
    for (const p of pts) g.fillRect(p.x - 2 - 52, p.y - 2 - 66, 5, 5);
    g.fillStyle = dead ? '#30303a' : CERB_PAL.P;
    for (const p of pts) g.fillRect(p.x - 2 - 52, p.y - 2 - 66, 5, 2);
    g.fillStyle = dead ? '#3a1018' : CERB_PAL.R;
    pts.forEach((p, i) => { if (i % 2) g.fillRect(p.x - 52, p.y + 1 - 66, 1, 1); });
}

function drawCerberoHead(g, A, i, hp, P) {
    const H = CERB_HEADS[i];
    const hx = H.at[0] + hp.dx, hy = H.at[1] + hp.dy + P.bodyDy;
    drawCerberoNeck(g, H.neck[0], H.neck[1] + P.bodyDy, hx + 3, hy + 17, hp.dead);
    // Cabeça acesa: brilho da cor do elemento atrás dela
    if (hp.glow && !hp.dead) {
        const cx = hx + 14 - 52, cy = hy + 10 - 66;
        const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 24);
        grad.addColorStop(0, H.color + '88');
        grad.addColorStop(1, H.color + '00');
        g.fillStyle = grad;
        g.fillRect(cx - 24, cy - 24, 48, 48);
    }
    const open = Math.max(0, Math.round(hp.open * 5));
    if (open > 0) {
        g.fillStyle = hp.dead ? '#20161c' : hp.breath ? H.color : '#5a0a14';
        g.fillRect(hx + 14 - 52, hy + 15 - 66, 14, open + 1);
        if (hp.breath && !hp.dead) { g.fillStyle = H.pal.L; g.fillRect(hx + 18 - 52, hy + 16 - 66, 9, Math.max(1, open - 1)); }
    }
    g.drawImage(hp.dead ? A.jawDead : A.jaw, hx + 9 - Math.round(hp.open * 1.5) - 53, hy + 15 + open - 67);
    g.drawImage(hp.dead ? A.headsDead[i] : A.heads[i], hx - 53, hy - 67);
}

// Pose parada (para a silhueta usada por efeitos como o choque do Spark)
const CERB_IDLE_POSE = { t: 0, bodyDy: 0, legs: [0, 1, 2, 3].map(() => ({ dx: 0, dy: 0 })), heads: CERB_HEADS.map(() => ({ dx: 0, dy: 0, open: 0.2 })) };
// characterArt: desenha o sprite numa caixa (largura 2w a partir de x - w/2, altura h), igual aos lutadores
characterArt.cerbero = (g, x, y, w, h) => {
    const sc = Math.min((w * 2) / 108, h / 68);
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(x + w / 2, y + h);
    g.scale(sc, sc);
    drawCerberoPose(g, CERB_IDLE_POSE);
    g.restore();
};

// --- Geometria dos avisos ---
function bossAngleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
}
// O lutador f está dentro da área w? (pad: folga a mais)
function inBossShape(w, f, pad = 0) {
    const r = (f.radius || 0) + pad;
    const dx = f.x - w.x, dy = f.y - w.y, d = Math.hypot(dx, dy);
    if (w.shape === 'circle') return d <= w.r + r;
    if (w.shape === 'cone') return d <= w.r + r && (d < 34 || bossAngleDiff(Math.atan2(dy, dx), w.angle) <= w.half + r / Math.max(d, 1));
    if (w.shape === 'lane') {
        const c = Math.cos(w.angle), s = Math.sin(w.angle);
        const along = dx * c + dy * s, perp = Math.abs(-dx * s + dy * c);
        return along >= -r && along <= w.len + r && perp <= w.w + r;
    }
    return false;
}
// Para onde fugir de um aviso (a IA aliada usa)
function bossDangerFor(f) {
    for (const w of bossWarnings) {
        if (w.owner.team === f.team || !inBossShape(w, f, 14)) continue;
        if (w.shape === 'circle') {
            // Raio marcado no próprio lutador: se espalha (longe dos aliados), senão sai do círculo
            if (w.spread && w.follow === f) {
                const ally = fighters.filter(a => alive(a) && a !== f && a.team === f.team).sort((a, b) => distance(f, a) - distance(f, b))[0];
                if (ally && distance(f, ally) < CERB_VOLT.jump + 20) return directionTo(ally, f);
            }
            const away = directionTo(w, f);
            return away.x || away.y ? away : { x: 0, y: 1 };
        }
        // Cone e faixa: sai pelo lado mais perto
        const c = Math.cos(w.angle), s = Math.sin(w.angle);
        const side = -(f.x - w.x) * s + (f.y - w.y) * c >= 0 ? 1 : -1;
        return { x: -s * side, y: c * side };
    }
    return null;
}

// --- O chefe ---
class Cerbero extends Fighter {
    constructor(x, y, teamSize) {
        super(x, y, 'Cérbero-X', 'cerbero', 1, 'ai');
        this.isBoss = true;
        this.radius = CERB_RADIUS;
        this.height = CERB_HEIGHT;
        const hp = CERB_HEAD_HP * teamSize;
        this.heads = CERB_HEADS.map(h => ({ id: h.id, hp, max: hp, dead: false }));
        this.maxHealth = hp * this.heads.length;
        this.health = this.maxHealth;
        this.energy = 0;
        this.maxEnergy = 1;
        this.active = Math.floor(Math.random() * 3); // cabeça acesa (leva o dano); sorteada a cada luta
        this.elementTurn = 0;          // vez de qual elemento no próximo ataque especial
        this.act = null;               // ataque em andamento
        this.rest = 60;
        this.elementCooldown = 150;
        this.roarTimer = 0;
        this.staggerTimer = 0;
        this.staggerImmune = 0;
        this.retarget = 0;
        this.chargeRoll = 1;
        this.anim = 0;
        this.sink = 0;                 // abertura: quanto ainda está dentro do buraco
        this.introHidden = false;
        this.introRoar = 0;
        this.facing = -1;
        this.aim = { x: -1, y: 0 };
    }

    get phase() { return 3 - this.heads.filter(h => !h.dead).length; } // 0, 1 ou 2 (fúria)
    get chestY() { return this.y - this.z - 64; }

    // Não se mexe com empurrões (só um pouquinho)
    push(direction, force) {
        this.kbx += direction.x * force * 0.08;
        this.kby += direction.y * force * 0.08;
    }

    takeDamage(damage, effect = {}, attacker = null) {
        if (this.isDead) return false;
        if (this.roarTimer > 0 || bossIntro) {
            if (this.anim % 12 === 0) floatingTexts.push(new FloatingText(this.x, this.y - this.height - 10, 'IMUNE', '#9aa3b8'));
            return true;
        }
        return super.takeDamage(damage, effect, attacker);
    }

    // O dano vai para a cabeça acesa (com a blindagem da fase); a vida total é a soma das cabeças
    loseHealth(amount, attacker) {
        if (this.isDead || this.roarTimer > 0) return;
        const before = this.health;
        super.loseHealth(amount * (1 - CERB_ARMOR[this.phase]), attacker);
        const lost = before - this.health;
        if (lost > 0) {
            let head = this.heads[this.active];
            if (head.dead) head = this.heads.find(h => !h.dead);
            if (head) {
                head.hp -= lost;
                if (head.hp <= 0) { head.hp = 0; this.loseHead(head); }
            }
        }
        this.health = this.heads.reduce((s, h) => s + h.hp, 0);
    }

    loseHead(head) {
        head.dead = true;
        const i = this.heads.indexOf(head), H = CERB_HEADS[i];
        const p = this.headPoint(i);
        sfx.play('explosion');
        screenShake = Math.max(screenShake, 12);
        for (let n = 0; n < 30; n++) particles.push(new Particle(p.x, p.y, n % 3 ? H.color : '#ffffff', 0, { x: (Math.random() - 0.5) * 9, y: (Math.random() - 0.8) * 8 }));
        if (window.pixelFx) pixelFx.spawn('crit-hit', { x: p.x, y: p.y + 20, flip: this.facing < 0, height: 30, palette: 'neon', seed: Math.floor(Math.random() * 1000) });
        const left = this.heads.filter(h => !h.dead);
        if (!left.length) return; // era a última: o K.O. vem pelo jogo
        this.cancelAction();
        this.roarTimer = CERB_ROAR;
        if (this.heads[this.active].dead) {
            this.active = this.heads.indexOf(left[Math.floor(Math.random() * left.length)]);
            const N = CERB_HEADS[this.active];
            floatingTexts.push(new FloatingText(this.x, this.y - this.height - 18, `${N.icon} CABEÇA ${N.name} NA FRENTE`, N.color));
        }
        announcer.call(`CABEÇA ${H.name} DESTRUÍDA!`, {
            color: H.color, priority: 3,
            sub: left.length === 1 ? 'FÚRIA: A ÚLTIMA CABEÇA ENLOUQUECEU!' : 'AS OUTRAS CABEÇAS FICAM MAIS FORTES!',
        });
    }

    // Ponto do focinho de uma cabeça no mundo
    headPoint(i) {
        const H = CERB_HEADS[i];
        return { x: this.x + this.facing * (H.at[0] + 24 - 52) * CERB_SCALE, y: this.y - this.z + (H.at[1] + 12 - 66) * CERB_SCALE };
    }

    face(t) {
        if (t && Math.abs(t.x - this.x) > 8) this.facing = t.x > this.x ? 1 : -1;
    }

    update() {
        this.anim++;
        if (this.hitFlash > 0) this.hitFlash--;
        this.handleStatusEffects();
        this.slowTimer = 0;
        this.heldBy = null;
        // Atordoamento vira um tropeço curto (e depois fica um tempo imune)
        if (this.isParalyzed) {
            this.isParalyzed = false;
            this.paralysisTimer = 0;
            if (this.staggerImmune <= 0 && this.roarTimer <= 0) this.stagger();
        }
        if (this.staggerImmune > 0) this.staggerImmune--;
        this.x += this.kbx; this.y += this.kby;
        this.kbx *= 0.8; this.kby *= 0.8;
        this.moveX = 0; this.moveY = 0;
        if (this.retarget > 0) this.retarget--;
        // Alvo: o mais perto, mas às vezes caça quem está mais ferido
        if (!alive(this.target) || this.retarget <= 0) {
            const weakest = enemiesOf(this).sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];
            this.target = (Math.random() < CERB_HUNT && weakest) || nearestEnemy(this) || this.target;
            this.retarget = 180;
        }

        if (this.roarTimer > 0) { this.updateRoar(); return; }
        if (this.staggerTimer > 0) { this.staggerTimer--; return; }
        if (this.elementCooldown > 0) this.elementCooldown--;
        if (this.act) { this.runAction(); return; }
        if (this.rest > 0) { this.rest--; this.chase(0.75); return; }
        this.chooseAction();
    }

    updateRoar() {
        this.roarTimer--;
        if (this.roarTimer === CERB_ROAR - 24) {
            sfx.play('boss_roar');
            screenShake = Math.max(screenShake, 10);
            bossFx.rings.push({ x: this.x, y: this.y, life: 30, max: 30, color: '#ff3b3b' });
            // Onda do rugido: empurra todo mundo para longe (sem dano)
            for (const e of enemiesOf(this)) {
                if (distance(this, e) < 240) e.push(directionTo(this, e), 14);
            }
        }
        if (this.roarTimer === 0) this.rest = 30;
    }

    stagger() {
        this.cancelAction();
        this.staggerTimer = CERB_STAGGER;
        this.staggerImmune = CERB_STAGGER_IMMUNE;
        floatingTexts.push(new FloatingText(this.x, this.y - this.height - 14, 'TROPEÇOU!', '#ffd23f'));
    }

    // Próximo elemento do rodízio (só cabeças de pé)
    nextElement() {
        const up = this.heads.map((h, i) => i).filter(i => !this.heads[i].dead);
        return up[this.elementTurn % up.length];
    }

    // Anda até o alvo, parando na distância da mordida
    chase(speedFactor) {
        const t = this.target;
        if (!alive(t)) return;
        const d = distance(this, t);
        const want = this.radius + t.radius + 26;
        if (d > want) {
            const dir = directionTo(this, t);
            const sp = CERB_SPEED[this.phase] * speedFactor;
            this.x += dir.x * sp; this.y += dir.y * sp;
            this.moveX = dir.x * sp; this.moveY = dir.y * sp;
            this.walkPhase += sp * 0.05;
            this.aim = dir;
        }
        this.face(t);
    }

    chooseAction() {
        const t = this.target;
        if (!alive(t)) return;
        const d = distance(this, t);
        const near = enemiesOf(this).filter(e => distance(this, e) < 170).length;
        const elem = this.nextElement(), head = CERB_HEADS[elem];
        // Investida em quem fica lá atrás (atiradores e healers não ficam seguros longe dele)
        const far = enemiesOf(this).sort((a, b) => distance(this, b) - distance(this, a))[0];
        if (far && distance(this, far) > 230 && this.chargeRoll < CERB_CHARGE.chance) { this.chargeRoll = 1; this.startAction('charge', far); return; }
        this.chargeRoll = 1; // sorteia uma vez por ciclo (no fim de cada ataque)
        let kind = null;
        if (this.elementCooldown <= 0 && Math.random() < 0.6 && (head.id !== 'fire' || d < CERB_FIRE.r)) { kind = head.id; this.elementTurn++; }
        else if (near >= 2 && Math.random() < 0.5) kind = 'stomp';
        else if (d < this.radius + t.radius + 60) kind = Math.random() < 0.75 ? 'bite' : 'stomp';
        if (!kind) { this.chase(1); return; }
        this.startAction(kind, t);
    }

    warn(w) {
        const tell = this.act.tell;
        const warning = { owner: this, timer: tell, max: tell, ...w };
        bossWarnings.push(warning);
        this.act.warns.push(warning);
        return warning;
    }

    startAction(kind, t) {
        const base = { bite: CERB_BITE, stomp: CERB_STOMP, charge: CERB_CHARGE, fire: CERB_FIRE, ice: CERB_ICE, volt: CERB_VOLT }[kind];
        const tell = Math.round(base.tell * CERB_TELL[this.phase]);
        this.face(t);
        const dir = directionTo(this, t);
        const angle = Math.atan2(dir.y, dir.x);
        this.aim = dir;
        // head: qual cabeça faz o ataque (o elemento é da cabeça dele; mordida e o resto, a da frente)
        const head = ['fire', 'ice', 'volt'].includes(kind) ? CERB_HEADS.findIndex(H => H.id === kind) : this.active;
        this.act = { kind, t: 0, tell, dir, angle, target: t, warns: [], hit: new Set(), head };
        if (kind === 'bite') {
            this.warn({ shape: 'cone', x: this.x, y: this.y, angle, half: CERB_BITE.half, r: CERB_BITE.r, color: '#ff3b3b' });
            sfx.play('boss_growl');
        } else if (kind === 'stomp') {
            this.warn({ shape: 'circle', x: this.x, y: this.y, r: CERB_STOMP.r, color: '#ff3b3b' });
            sfx.play('boss_growl');
        } else if (kind === 'charge') {
            const len = Math.min(CERB_CHARGE.len, this.laneLength(dir));
            this.act.len = len;
            this.warn({ shape: 'lane', x: this.x, y: this.y, angle, len, w: CERB_CHARGE.w, color: '#ff3b3b' });
            sfx.play('boss_growl');
        } else if (kind === 'fire') {
            this.warn({ shape: 'cone', x: this.x, y: this.y, angle, half: CERB_FIRE.half, r: CERB_FIRE.r, color: '#ff7a1a' });
            sfx.play('boss_growl');
        } else if (kind === 'ice') {
            for (const e of enemiesOf(this).slice(0, 3)) this.warn({ shape: 'circle', x: e.x, y: e.y, r: CERB_ICE.r, color: '#5fe8ff' });
            sfx.play('boss_roar');
        } else if (kind === 'volt') {
            this.warn({ shape: 'circle', x: t.x, y: t.y, r: CERB_VOLT.r, color: '#ffe600', follow: t, spread: true });
            sfx.play('boss_growl');
        }
    }

    // Até onde dá para correr nessa direção sem sair da arena
    laneLength(dir) {
        let len = 0;
        while (len < CERB_CHARGE.len) {
            const x = this.x + dir.x * (len + 10), y = this.y + dir.y * (len + 10);
            if (x < arena.left || x > arena.right || y < arena.top || y > arena.bottom) break;
            len += 10;
        }
        return Math.max(60, len);
    }

    cancelAction() {
        if (this.act) bossWarnings = bossWarnings.filter(w => !this.act.warns.includes(w));
        this.act = null;
        this.z = 0;
    }

    endAction() {
        const kind = this.act.kind;
        this.cancelAction();
        this.rest = Math.round(CERB_REST[this.phase] * (0.7 + Math.random() * 0.6));
        this.chargeRoll = Math.random();
        if (['fire', 'ice', 'volt'].includes(kind)) this.elementCooldown = Math.round(CERB_ELEMENT_COOLDOWN * (this.phase ? 0.8 : 1));
        if (this.phase === 2 && Math.random() < CERB_FURY_CHAIN) this.rest = 8; // fúria: emenda outro ataque
    }

    // Golpe do chefe num inimigo (com o multiplicador da fase)
    strike(e, damage, effect, pushDir, force) {
        const defended = e.takeDamage(Math.round(damage * CERB_POWER[this.phase]), effect, this);
        if (pushDir && force) e.push(pushDir, defended ? force * 0.4 : force);
        return defended;
    }

    runAction() {
        const a = this.act;
        a.t++;
        // Volt: o círculo acompanha o alvo até travar no lugar, um pouco antes do raio cair
        for (const w of a.warns) {
            if (w.follow && alive(w.follow) && a.t < a.tell - CERB_VOLT.lock) { w.x = w.follow.x; w.y = w.follow.y; }
            if (w.timer > 0) w.timer--;
        }
        if (a.t === a.tell) bossWarnings = bossWarnings.filter(w => !a.warns.includes(w));
        const fire = a.t === a.tell;
        const after = a.t - a.tell;
        if (a.kind === 'bite') {
            if (fire) {
                const zone = { shape: 'cone', x: this.x, y: this.y, angle: a.angle, half: CERB_BITE.half, r: CERB_BITE.r };
                this.x += a.dir.x * 16; this.y += a.dir.y * 16;
                sfx.play('boss_bite');
                const p = this.headPoint(a.head);
                if (window.pixelFx) pixelFx.spawn('claw-swipe', { x: p.x, y: this.y, flip: this.facing < 0, palette: 'blood', seed: Math.floor(Math.random() * 1000) });
                for (const e of enemiesOf(this)) if (inBossShape(zone, e)) this.strike(e, CERB_BITE.damage, { sound: 'hit_heavy' }, a.dir, CERB_BITE.push);
            }
            if (after >= 18) this.endAction();
        } else if (a.kind === 'stomp') {
            if (a.t < a.tell) this.z = Math.round(Math.min(1, a.t / (a.tell * 0.7)) * 16);
            if (fire) {
                this.z = 0;
                sfx.play('boss_slam');
                screenShake = Math.max(screenShake, 10);
                bossFx.rings.push({ x: this.x, y: this.y, life: 24, max: 24, color: '#ffb36b', r: CERB_STOMP.r });
                if (window.pixelFx) pixelFx.spawn('ground-slam', { x: this.x, y: this.y, palette: 'ember', seed: Math.floor(Math.random() * 1000) });
                const zone = { shape: 'circle', x: this.x, y: this.y, r: CERB_STOMP.r };
                for (const e of enemiesOf(this)) if (inBossShape(zone, e)) this.strike(e, CERB_STOMP.damage, { sound: 'hit_heavy' }, directionTo(this, e), CERB_STOMP.push);
            }
            if (after >= 22) this.endAction();
        } else if (a.kind === 'charge') {
            if (after >= 0 && a.len > 0) {
                const step = Math.min(CERB_CHARGE.speed, a.len);
                this.x += a.dir.x * step; this.y += a.dir.y * step;
                this.moveX = a.dir.x * step; this.moveY = a.dir.y * step;
                this.walkPhase += 0.6;
                a.len -= step;
                if (after % 3 === 0) particles.push(new Particle(this.x - a.dir.x * 40, this.y, '#6b6f80', 0, { x: -a.dir.x * 2 + (Math.random() - 0.5), y: -1 - Math.random() }));
                for (const e of enemiesOf(this)) {
                    if (a.hit.has(e) || distance(this, e) > this.radius + e.radius + 6) continue;
                    a.hit.add(e);
                    const side = -(e.x - this.x) * a.dir.y + (e.y - this.y) * a.dir.x >= 0 ? 1 : -1;
                    this.strike(e, CERB_CHARGE.damage, { sound: 'hit_heavy' }, { x: -a.dir.y * side, y: a.dir.x * side }, CERB_CHARGE.push);
                    screenShake = Math.max(screenShake, 7);
                }
                if (after === 0) sfx.play('swing_heavy');
                if (a.len <= 0) { a.stopAt = after; screenShake = Math.max(screenShake, 5); sfx.play('boss_slam'); }
            }
            if (a.stopAt !== undefined && after >= a.stopAt + 16) this.endAction();
        } else if (a.kind === 'fire') {
            if (fire) sfx.play('boss_fire');
            if (after >= 0 && after < CERB_FIRE.duration) {
                const p = this.headPoint(a.head);
                for (let n = 0; n < 5; n++) {
                    const ang = a.angle + (Math.random() - 0.5) * CERB_FIRE.half * 2, sp = 5 + Math.random() * 3;
                    bossFx.flames.push({ x: p.x, y: p.y + 20, gy: this.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: CERB_FIRE.r / sp });
                }
                if (after % CERB_FIRE.tick === 0) {
                    const zone = { shape: 'cone', x: this.x, y: this.y, angle: a.angle, half: CERB_FIRE.half, r: CERB_FIRE.r };
                    for (const e of enemiesOf(this)) if (inBossShape(zone, e)) this.strike(e, CERB_FIRE.damage, { type: 'burn', sound: 'hit' });
                }
            }
            if (after >= CERB_FIRE.duration + 14) this.endAction();
        } else if (a.kind === 'ice') {
            if (fire) {
                sfx.play('boss_ice');
                screenShake = Math.max(screenShake, 6);
                for (const w of a.warns) {
                    for (let n = 0; n < 7; n++) bossFx.spikes.push({ x: w.x + (Math.random() - 0.5) * w.r * 1.4, y: w.y + (Math.random() - 0.5) * w.r * 0.8, h: 18 + Math.random() * 22, life: 0, max: 46 });
                    for (let n = 0; n < 10; n++) particles.push(new Particle(w.x, w.y - 10, n % 2 ? '#5fe8ff' : '#e8fdff', 0, { x: (Math.random() - 0.5) * 6, y: -Math.random() * 5 }));
                    for (const e of enemiesOf(this)) {
                        if (a.hit.has(e) || !inBossShape(w, e)) continue;
                        a.hit.add(e);
                        if (!this.strike(e, CERB_ICE.damage, { sound: 'hit_heavy' })) e.slowTimer = Math.max(e.slowTimer, CERB_ICE.slow);
                    }
                }
            }
            if (after >= 20) this.endAction();
        } else if (a.kind === 'volt') {
            if (fire) this.voltStrike(a.warns[0]);
            if (after >= 22) this.endAction();
        }
    }

    // Raio: cai no círculo marcado e pula para os aliados que estiverem perto (se espalhar evita)
    voltStrike(w) {
        sfx.play('boss_volt');
        screenShake = Math.max(screenShake, 6);
        let from = this.headPoint(this.act.head);
        const sky = { x: w.x, y: w.y - 260 };
        bossFx.bolts.push({ pts: boltPath(sky, { x: w.x, y: w.y - 30 }), life: 14 });
        bossFx.rings.push({ x: w.x, y: w.y, life: 16, max: 16, color: '#ffe600', r: CERB_VOLT.r });
        const hit = new Set();
        let cur = enemiesOf(this).filter(e => inBossShape(w, e)).sort((a, b) => distance(w, a) - distance(w, b))[0];
        for (let i = 0; cur && i < CERB_VOLT.damage.length; i++) {
            hit.add(cur);
            const to = { x: cur.x, y: cur.chestY };
            if (i > 0) bossFx.bolts.push({ pts: boltPath(from, to), life: 14 });
            if (!this.strike(cur, CERB_VOLT.damage[i], { sound: 'hit' })) {
                cur.isParalyzed = true;
                cur.paralysisTimer = Math.max(cur.paralysisTimer || 0, CERB_VOLT.stun);
            }
            if (window.pixelFx) pixelFx.spawn('zap-hit', { x: cur.x, y: cur.y, flip: false, height: Math.round((cur.y - cur.chestY) / 2), palette: 'electric', seed: Math.floor(Math.random() * 1000) });
            from = to;
            const last = cur;
            cur = enemiesOf(this).filter(e => !hit.has(e) && distance(last, e) <= CERB_VOLT.jump).sort((a, b) => distance(last, a) - distance(last, b))[0];
        }
    }

    // --- Pose de cada quadro (a partir do estado) ---
    pose() {
        const t = this.anim;
        const a = this.act;
        const walking = Math.hypot(this.moveX, this.moveY) > 0.2;
        const ph = this.walkPhase * Math.PI;
        const legs = [0, 1, 2, 3].map(i => {
            const off = i === 0 || i === 3 ? 0 : Math.PI;
            return walking ? { dx: Math.round(Math.cos(ph + off) * 2), dy: -Math.round(Math.max(0, Math.sin(ph + off)) * 3) } : { dx: 0, dy: 0 };
        });
        const bodyDy = walking ? Math.round(Math.abs(Math.sin(ph))) : Math.round(Math.sin(t * 0.05));
        const roaring = this.roarTimer > 0 && this.roarTimer < CERB_ROAR - 16 || this.introRoar > 0;
        const heads = this.heads.map((h, i) => {
            if (h.dead) return { dx: -2, dy: 5, open: 0.6, dead: true };
            const p = { dx: 0, dy: Math.round(Math.sin(t * 0.06 + i * 2.1)), open: 0.15 + 0.15 * Math.sin(t * 0.2 + i), glow: i === this.active, breath: false };
            if (p.glow) p.dx += 2;
            if (roaring) { p.open = 1; p.dy -= 3; p.dx += Math.round(Math.random() * 2 - 1); return p; }
            if (this.staggerTimer > 0) { p.dy += 4; p.open = 0.3; return p; }
            if (!a) return p;
            const k = Math.min(1, a.t / a.tell), pre = a.t < a.tell, after = a.t - a.tell;
            if (a.kind === 'bite' && i === a.head) {
                if (pre) { p.dx -= Math.round(3 * k); p.open = 0.8 * k; } else if (after < 8) { p.dx += 8; p.open = 0; }
            } else if (a.kind === 'fire' && i === a.head) {
                if (pre) { p.dx -= 2; p.dy -= 2; p.open = 0.5; p.breath = true; } else if (after < CERB_FIRE.duration) { p.open = 1; p.dx += 3; p.breath = true; }
            } else if (a.kind === 'ice') {
                if (pre) { p.dy -= Math.round(3 * k); p.open = 0.8; }
            } else if (a.kind === 'volt' && i === a.head) {
                p.dy -= 3; p.open = 0.6; p.breath = pre;
            } else if (a.kind === 'stomp' && pre) {
                p.dy -= 2;
            } else if (a.kind === 'charge') {
                p.dy += 3; p.dx += 3; p.open = 0.4;
            }
            return p;
        });
        return { t, legs, bodyDy, heads };
    }

    draw() {
        if (this.introHidden) return;
        const dying = this.isDead;
        const k = dying ? Math.max(0, this.deathTimer / DEATH_DURATION) : 1;
        ctx.save();
        ctx.globalAlpha = k;
        // Sombra e anel vermelho no chão
        const sh = Math.max(0.5, 1 - this.z / 120);
        ctx.fillStyle = 'rgba(5, 0, 15, 0.55)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 74 * sh, 18 * sh, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!dying && !this.sink) {
            ctx.strokeStyle = TEAM_COLORS[this.team];
            ctx.globalAlpha = 0.3 * k;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, 78, 20, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = k;
        }
        // Fúria: aura vermelha pulsando
        if (!dying && this.phase === 2) {
            const r = 90 + Math.sin(this.anim * 0.2) * 8;
            const grad = ctx.createRadialGradient(this.x, this.y - 60, 10, this.x, this.y - 60, r);
            grad.addColorStop(0, 'rgba(255, 40, 40, 0.28)');
            grad.addColorStop(1, 'rgba(255, 40, 40, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(this.x - r, this.y - 60 - r, r * 2, r * 2);
        }
        // Saindo do buraco: só aparece o que está acima da borda da frente
        if (this.sink > 0 && bossCrater) {
            ctx.beginPath();
            ctx.rect(this.x - 260, this.y - 400, 520, 400 + bossCrater.ry * 0.6);
            ctx.clip();
        }
        ctx.translate(Math.round(this.x), Math.round(this.y - this.z + (dying ? (1 - k) * 16 : 0) + this.sink));
        ctx.scale(this.facing * CERB_SCALE, CERB_SCALE);
        ctx.imageSmoothingEnabled = false;
        if (this.hitFlash > 0 && this.hitFlash % 4 >= 2) ctx.filter = 'brightness(2.2)';
        if (dying) ctx.filter = 'grayscale(0.7) brightness(0.7)';
        const P = this.pose();
        if (dying) P.heads.forEach(h => { h.dead = true; });
        drawCerberoPose(ctx, P);
        ctx.restore();
        // Tropeço: estrelinhas girando em cima
        if (this.staggerTimer > 0) {
            ctx.save();
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            for (let i = 0; i < 3; i++) {
                const ang = this.anim * 0.15 + i * 2.1;
                ctx.fillText('⭐', this.x + Math.cos(ang) * 40, this.y - this.height + Math.sin(ang) * 8);
            }
            ctx.restore();
        }
    }

    // Derrota: o desenho normal já cuida (some escurecendo)
    drawDefeat() { this.draw(); }
}

// Raio em zigue-zague de a até b
function boltPath(a, b) {
    const pts = [{ x: a.x, y: a.y }];
    const n = 7;
    for (let i = 1; i < n; i++) {
        const t = i / n;
        pts.push({ x: a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 22, y: a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 22 });
    }
    pts.push({ x: b.x, y: b.y });
    return pts;
}

// --- Montagem da partida ---
function createBossFighters() {
    const players = activePlayers();
    const size = Math.max(BOSS_TEAM_MIN, players.length);
    const byId = id => CHARACTERS.find(c => c.id === id);
    const pool = CHARACTERS.filter(c => !match.picks.includes(c.id)).sort(() => Math.random() - 0.5);
    const team = players.map((p, i) => ({ char: byId(match.picks[i]), controller: p }));
    // Com vaga sobrando e sem healer no time, um aliado healer vem junto
    if (team.length < size && !team.some(m => HEALERS.includes(m.char.id))) {
        const h = pool.findIndex(c => HEALERS.includes(c.id));
        if (h >= 0) team.push({ char: pool.splice(h, 1)[0], controller: 'ai' });
    }
    while (team.length < size) team.push({ char: pool.pop(), controller: 'ai' });
    fighters = [];
    const h = arena.bottom - arena.top, w = arena.right - arena.left;
    team.forEach((m, i) => {
        const f = new Fighter(arena.left + 70, arena.top + h * (i + 1) / (team.length + 1), m.char.name, m.char.id, 0, m.controller);
        attachInput(f, m.controller);
        fighters.push(f);
    });
    const id = match.bossId === 'random' ? BOSS_IDS[Math.floor(Math.random() * BOSS_IDS.length)] : match.bossId;
    const Boss = id === 'matriarca' ? Matriarca : Cerbero;
    const boss = new Boss(arena.left + w * 0.62, (arena.top + arena.bottom) / 2, team.length);
    fighters.push(boss);
    // Silhuetas dos efeitos de corpo já prontas antes da luta (calcular no meio dela dava um tranco)
    if (window.pixelFx) { fxActor(boss); if (boss.isMatriarca) fxActor({ characterType: 'pylon', height: 74 }); } // a torre (74) também cai no tamanho de lutador
}
const BOSS_IDS = ['cerbero', 'matriarca'];
const BOSS_NAMES = { cerbero: 'Cérbero-X', matriarca: 'Matriarca', random: 'chefe sorteado' };

function bossOf() { return fighters.find(f => f.isBoss); }

function resetBossMode() {
    bossIntro = null;
    bossWarnings = [];
    bossFx = { flames: [], bolts: [], spikes: [], rings: [] };
    bossCrater = null;
    bossFightSteps = 0;
    matriDrones = [];
    matriFx = { beams: [], glitch: 0 };
    if (typeof hud !== 'undefined') hud.style.visibility = '';
}

// Depois de tudo se mexer: efeitos do chefe e o relógio da luta
function updateBossWorld() {
    if (!match.boss) return;
    bossFightSteps++;
    for (const f of bossFx.flames) { f.x += f.vx; f.y += f.vy; f.life++; }
    bossFx.flames = bossFx.flames.filter(f => f.life < f.max);
    for (const b of bossFx.bolts) b.life--;
    bossFx.bolts = bossFx.bolts.filter(b => b.life > 0);
    for (const s of bossFx.spikes) s.life++;
    bossFx.spikes = bossFx.spikes.filter(s => s.life < s.max);
    for (const r of bossFx.rings) r.life--;
    bossFx.rings = bossFx.rings.filter(r => r.life > 0);
    if (bossCrater && bossCrater.glow > 0.25) bossCrater.glow -= 0.002;
    updateMatriWorld();
}

// --- Abertura: o chão treme, racha, os olhos acendem no buraco e ele salta para fora ---
const INTRO = { cracks: 48, hole: 96, eyes: [104, 114, 124], rise: 136, jump: 160, end: 300 };

function startBossIntro() {
    const boss = bossOf();
    if (!boss) { announcer.onStart(); return; }
    if (boss.isMatriarca) { startMatriIntro(boss); return; }
    const hole = { x: boss.x + 60, y: boss.y - 4 };
    bossCrater = { x: hole.x, y: hole.y, rx: 0, ry: 0, crack: 0, glow: 1, cracks: [] };
    for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
        const len = 70 + Math.random() * 90;
        const pts = [{ x: 0, y: 0 }];
        for (let s = 1; s <= 5; s++) {
            const r = (s / 5) * len;
            pts.push({ x: Math.cos(ang) * r + (Math.random() - 0.5) * 14, y: (Math.sin(ang) * r + (Math.random() - 0.5) * 14) * 0.45 });
        }
        bossCrater.cracks.push(pts);
    }
    bossIntro = { t: 0, boss, hole, land: { x: boss.x, y: boss.y }, padArmed: false, landed: 0 };
    boss.x = hole.x; boss.y = hole.y;
    boss.introHidden = true;
    hud.style.visibility = 'hidden';
    if (mapState) mapState.banner = 0; // o nome do mapa aparece depois, quando a luta começa
}

function updateBossIntro() {
    if (bossIntro.kind === 'matriarca') { updateMatriIntro(); return; }
    const I = bossIntro, b = I.boss, t = ++I.t, C = bossCrater;
    // Pular: qualquer tecla (ou botão do controle, depois de soltar o da seleção)
    const pads = getGamepads();
    const pressed = pads.some(p => p.buttons.some(btn => btn.pressed));
    if (!pressed) I.padArmed = true;
    if (t > 20 && (I.skip || (I.padArmed && pressed))) { finishBossIntro(); return; }

    if (t < INTRO.jump) screenShake = Math.max(screenShake, Math.min(5, t / 22));
    if (t === 1 || t === 70) sfx.play('boss_rumble');
    if (t < INTRO.hole && t % 5 === 0) {
        const r = Math.random() * 60;
        const ang = Math.random() * Math.PI * 2;
        particles.push(new Particle(I.hole.x + Math.cos(ang) * r, I.hole.y + Math.sin(ang) * r * 0.4, '#6b6f80', 0, { x: (Math.random() - 0.5) * 2, y: -2 - Math.random() * 3 }));
    }
    if (t === INTRO.cracks) sfx.play('boss_crack');
    if (t >= INTRO.cracks) C.crack = Math.min(1, (t - INTRO.cracks) / (INTRO.hole - INTRO.cracks));
    if (t % 4 === 0 && t >= INTRO.cracks && t < INTRO.jump) {
        const pts = C.cracks[Math.floor(Math.random() * C.cracks.length)];
        const p = pts[Math.floor(Math.random() * pts.length * C.crack)] || pts[0];
        particles.push(new Particle(C.x + p.x, C.y + p.y, Math.random() < 0.5 ? '#ff3b3b' : '#ffb36b', 0, { x: (Math.random() - 0.5) * 3, y: -1 - Math.random() * 3 }));
    }
    if (t === INTRO.hole) {
        sfx.play('explosion');
        screenShake = 9;
        for (let i = 0; i < 30; i++) particles.push(new Particle(C.x + (Math.random() - 0.5) * 80, C.y, i % 3 ? '#4a4e5c' : '#8a8fa0', 0, { x: (Math.random() - 0.5) * 8, y: -2 - Math.random() * 7 }));
    }
    if (t >= INTRO.hole) { const k = Math.min(1, (t - INTRO.hole) / 12); C.rx = 78 * k; C.ry = 26 * k; }
    if (INTRO.eyes.includes(t)) sfx.play('boss_growl');
    // Subindo de dentro do buraco
    if (t === INTRO.rise) { b.introHidden = false; b.sink = 120; b.facing = -1; }
    if (t > INTRO.rise && t < INTRO.jump) b.sink = Math.round(120 * (1 - (t - INTRO.rise) / (INTRO.jump - INTRO.rise)) ** 1.5);
    // Salto para fora do buraco, caindo na frente dele
    if (t === INTRO.jump) { b.sink = 0; b.vz = 11; I.from = { x: b.x, y: b.y }; sfx.play('swing_heavy'); }
    if (t > INTRO.jump && !I.landed) {
        b.vz -= 0.55;
        b.z = Math.max(0, b.z + b.vz);
        const k = Math.min(1, (t - INTRO.jump) / 40);
        b.x = I.from.x + (I.land.x - I.from.x) * k;
        b.y = I.from.y + (I.land.y - I.from.y) * k;
        b.walkPhase += 0.2;
        b.moveX = -1;
        if (b.z <= 0 && t > INTRO.jump + 4) {
            b.z = 0; b.vz = 0; b.moveX = 0;
            I.landed = t;
            screenShake = 14;
            sfx.play('boss_slam');
            bossFx.rings.push({ x: b.x, y: b.y, life: 30, max: 30, color: '#c9cbd6', r: 200 });
            if (window.pixelFx) pixelFx.spawn('heavy-landing', { x: b.x, y: b.y, palette: 'ember', scale: 2, seed: Math.floor(Math.random() * 1000) });
            for (let i = 0; i < 40; i++) particles.push(new Particle(b.x + (Math.random() - 0.5) * 140, b.y, '#8a8fa0', 0, { x: (Math.random() - 0.5) * 10, y: -Math.random() * 4 }));
        }
    }
    // Rugido: as três cabeças soltam o próprio elemento para cima
    if (I.landed && t === I.landed + 14) {
        b.introRoar = 70;
        sfx.play('boss_roar');
        screenShake = 10;
        b.heads.forEach((h, i) => {
            const p = b.headPoint(i), H = CERB_HEADS[i];
            if (H.id === 'volt') bossFx.bolts.push({ pts: boltPath(p, { x: p.x + (Math.random() - 0.5) * 40, y: p.y - 240 }), life: 26 });
            for (let n = 0; n < 26; n++) particles.push(new Particle(p.x, p.y, n % 3 ? H.color : H.pal.L, 0, { x: (Math.random() - 0.5) * 3, y: -4 - Math.random() * 6 }));
        });
    }
    if (b.introRoar > 0) b.introRoar--;
    b.anim++;
    if (I.landed && t >= I.landed + 100) finishBossIntro();

    // O resto do mundo que precisa continuar animando
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    floatingTexts.forEach(f => f.update());
    floatingTexts = floatingTexts.filter(f => f.life > 0);
    if (window.pixelFx) pixelFx.update();
    for (const r of bossFx.rings) r.life--;
    bossFx.rings = bossFx.rings.filter(r => r.life > 0);
    for (const bo of bossFx.bolts) bo.life--;
    bossFx.bolts = bossFx.bolts.filter(bo => bo.life > 0);
    screenShake = screenShake > 0.3 ? screenShake * 0.88 : 0;
}

function finishBossIntro() {
    if (bossIntro.kind === 'matriarca') { finishMatriIntro(); return; }
    const I = bossIntro, b = I.boss;
    b.x = I.land.x; b.y = I.land.y; b.z = 0; b.vz = 0; b.sink = 0; b.introHidden = false; b.introRoar = 0;
    b.facing = -1;
    if (bossCrater) { bossCrater.crack = 1; bossCrater.rx = 78; bossCrater.ry = 26; }
    bossIntro = null;
    hud.style.visibility = '';
    b.rest = 50;
    if (mapState) mapState.banner = 150;
    announcer.onStart();
}

window.addEventListener('keydown', () => { if (bossIntro) bossIntro.skip = true; });

// --- Desenho ---
// No chão: o buraco e as rachaduras acesas
function drawBossGround() {
    const C = bossCrater;
    if (!C) return;
    ctx.save();
    if (C.crack > 0) {
        ctx.lineCap = 'round';
        for (const pts of C.cracks) {
            const n = Math.max(1, Math.round((pts.length - 1) * C.crack));
            for (const [width, color, alpha] of [[7, '#ff2a3a', 0.25 * C.glow], [3, '#ff5a3a', 0.9 * C.glow + 0.1], [1, '#ffd0a0', 0.8 * C.glow]]) {
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(C.x + pts[0].x, C.y + pts[0].y);
                for (let i = 1; i <= n; i++) ctx.lineTo(C.x + pts[i].x, C.y + pts[i].y);
                ctx.stroke();
            }
        }
    }
    if (C.rx > 0) {
        ctx.globalAlpha = 1;
        // borda de pedra, fundo escuro e brilho vermelho lá embaixo
        ctx.fillStyle = '#3a3d48';
        ctx.beginPath(); ctx.ellipse(C.x, C.y, C.rx + 8, C.ry + 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#07040c';
        ctx.beginPath(); ctx.ellipse(C.x, C.y + 2, C.rx, C.ry, 0, 0, Math.PI * 2); ctx.fill();
        const glow = ctx.createRadialGradient(C.x, C.y + 6, 2, C.x, C.y + 6, C.rx);
        glow.addColorStop(0, `rgba(255, 40, 30, ${0.45 * C.glow})`);
        glow.addColorStop(1, 'rgba(255, 40, 30, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.ellipse(C.x, C.y + 2, C.rx, C.ry, 0, 0, Math.PI * 2); ctx.fill();
        // Olhos acendendo lá dentro, um par por cabeça
        if (bossIntro && bossIntro.t < INTRO.rise) {
            const offs = [[-30, -4], [0, -9], [28, -1]];
            INTRO.eyes.forEach((at, i) => {
                if (bossIntro.t < at) return;
                const blink = (bossIntro.t - at) % 50 < 3;
                if (blink) return;
                const H = CERB_HEADS[i];
                ctx.fillStyle = H.color;
                ctx.shadowColor = H.color;
                ctx.shadowBlur = 10;
                const [ox, oy] = offs[i];
                ctx.fillRect(C.x + ox - 8, C.y + oy, 5, 3);
                ctx.fillRect(C.x + ox + 3, C.y + oy, 5, 3);
                ctx.shadowBlur = 0;
            });
        }
    }
    ctx.restore();
}

// Avisos no chão: a área pisca e vai enchendo até o golpe
function drawBossWarnings() {
    for (const w of bossWarnings) {
        const k = 1 - w.timer / w.max;
        ctx.save();
        ctx.fillStyle = w.color;
        ctx.strokeStyle = w.color;
        const shape = (scale) => {
            ctx.beginPath();
            if (w.shape === 'circle') ctx.arc(w.x, w.y, w.r * scale, 0, Math.PI * 2); // redondo: é a área exata do golpe
            else if (w.shape === 'cone') { ctx.moveTo(w.x, w.y); ctx.arc(w.x, w.y, w.r * scale, w.angle - w.half, w.angle + w.half); ctx.closePath(); }
            else if (w.shape === 'lane') {
                ctx.save();
                ctx.translate(w.x, w.y); ctx.rotate(w.angle);
                ctx.rect(0, -w.w, w.len * scale, w.w * 2);
                ctx.restore();
            }
        };
        ctx.globalAlpha = 0.12 + 0.1 * Math.sin(Date.now() / 60) ** 2;
        shape(1); ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -Date.now() / 30;
        shape(1); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.28;
        shape(k); ctx.fill();
        // Raio: "!" em cima de quem está marcado
        if (w.follow && alive(w.follow)) {
            ctx.globalAlpha = 1;
            ctx.font = 'bold 22px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#0a0614';
            ctx.strokeText(w.label || '⚡!', w.follow.x, w.follow.y - w.follow.height - 26);
            ctx.fillText(w.label || '⚡!', w.follow.x, w.follow.y - w.follow.height - 26);
        }
        ctx.restore();
    }
}

// Por cima dos lutadores: fogo, raios, espinhos de gelo e anéis de impacto
function drawBossEffects() {
    drawMatriEffects();
    if (!bossFx.flames.length && !bossFx.bolts.length && !bossFx.spikes.length && !bossFx.rings.length) return;
    ctx.save();
    for (const s of bossFx.spikes) {
        const k = s.life < 6 ? s.life / 6 : 1, fade = s.life > s.max - 12 ? (s.max - s.life) / 12 : 1;
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#1a7fb0';
        ctx.beginPath(); ctx.moveTo(s.x - 7, s.y); ctx.lineTo(s.x, s.y - s.h * k); ctx.lineTo(s.x + 7, s.y); ctx.fill();
        ctx.fillStyle = '#5fe8ff';
        ctx.beginPath(); ctx.moveTo(s.x - 3, s.y); ctx.lineTo(s.x, s.y - s.h * k); ctx.lineTo(s.x + 5, s.y); ctx.fill();
        ctx.fillStyle = '#e8fdff';
        ctx.fillRect(s.x - 1, s.y - s.h * k * 0.8, 2, s.h * k * 0.5);
    }
    for (const f of bossFx.flames) {
        const k = f.life / f.max;
        const size = 8 + k * 26;
        ctx.globalAlpha = 0.85 * (1 - k * 0.7);
        ctx.fillStyle = k < 0.3 ? '#fff3a0' : k < 0.6 ? '#ff9a1a' : '#d0300c';
        // a chama desce do focinho até o chão enquanto avança
        const y = f.y + (f.gy - f.y) * Math.min(1, k * 2.5);
        ctx.fillRect(Math.round(f.x - size / 2), Math.round(y - size), Math.round(size), Math.round(size));
    }
    for (const b of bossFx.bolts) {
        ctx.globalAlpha = Math.min(1, b.life / 6);
        for (const [width, color] of [[7, 'rgba(255, 230, 0, 0.35)'], [3, '#ffe600'], [1, '#ffffff']]) {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(b.pts[0].x, b.pts[0].y);
            for (const p of b.pts.slice(1)) ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }
    }
    for (const r of bossFx.rings) {
        const k = 1 - r.life / r.max, radius = (r.r || 120) * (0.3 + k * 0.9);
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, radius, radius * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

// Por cima de tudo durante a abertura: nome do chefe e a dica para pular
function drawBossIntroOverlay() {
    const I = bossIntro;
    if (!I) { drawMatriGlitch(matriFx.glitch); return; }
    if (I.kind === 'matriarca') { drawMatriIntroOverlay(); drawMatriGlitch(matriFx.glitch); return; }
    const cx = (arena.left + arena.right) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    // faixas pretas de cinema
    const bar = Math.min(1, I.t / 20) * 50;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WORLD_W, bar);
    ctx.fillRect(0, WORLD_H - bar, WORLD_W, bar);
    if (I.landed && I.t >= I.landed + 14) {
        const a = I.t - I.landed - 14;
        const pop = a < 8 ? 1.5 - a / 16 : 1;
        ctx.globalAlpha = Math.min(1, a / 6);
        ctx.translate(cx, arena.top + 90);
        ctx.scale(pop, pop);
        ctx.font = 'bold 64px Orbitron, sans-serif';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#0a0614';
        ctx.strokeText('CÉRBERO-X', 0, 0);
        ctx.shadowColor = '#ff2a3a';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ff3b3b';
        ctx.fillText('CÉRBERO-X', 0, 0);
        ctx.shadowBlur = 0;
        ctx.font = 'bold 18px Orbitron, sans-serif';
        ctx.lineWidth = 5;
        ctx.strokeText('CÃO DE GUARDA DO SETOR 0', 0, 32);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('CÃO DE GUARDA DO SETOR 0', 0, 32);
        ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    }
    ctx.globalAlpha = 0.7;
    ctx.font = '14px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('qualquer tecla para pular', cx, WORLD_H - 20);
    ctx.restore();
}

// --- Placar do chefe: uma barra por cabeça, no lugar do time rosa ---
function buildBossHud(boss, column) {
    if (boss.isMatriarca) { buildMatriHud(boss, column); return; }
    const card = makeEl('div', 'boss-hud', column);
    const title = makeEl('div', 'boss-title', card);
    makeEl('span', 'boss-name', title).innerText = 'CÉRBERO-X';
    const phase = makeEl('span', 'boss-phase', title);
    const heads = makeEl('div', 'boss-heads', card);
    const rows = CERB_HEADS.map(H => {
        const row = makeEl('div', 'boss-head', heads);
        row.style.setProperty('--head-color', H.color);
        makeEl('span', 'boss-head-name', row).innerText = `${H.icon} ${H.name}`;
        const bar = makeEl('div', 'boss-head-bar', row);
        return { row, fill: makeEl('div', 'boss-head-fill', bar), cls: '' };
    });
    boss.bossHud = { phase, rows, phaseText: '' };
}

function updateBossHud() {
    const boss = bossOf();
    if (!boss || !boss.bossHud) return;
    if (boss.isMatriarca) { updateMatriHud(boss); return; }
    const H = boss.bossHud;
    const text = boss.isDead ? 'DERROTADO' : ['FASE 1', 'FASE 2 · BLINDADO', 'FASE 3 · FÚRIA'][boss.phase];
    setIfChanged(H.phase, 'innerText', text);
    boss.heads.forEach((h, i) => {
        const r = H.rows[i];
        setIfChanged(r.fill.style, 'width', `${(h.hp / h.max) * 100}%`);
        const cls = 'boss-head' + (h.dead ? ' dead' : i === boss.active ? ' active' : '');
        if (cls !== r.cls) { r.row.className = cls; r.cls = cls; }
    });
}
