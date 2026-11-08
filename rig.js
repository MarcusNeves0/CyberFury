// --- Esqueleto dos sprites (rig) ---
// Em vez de só dois desenhos (parado e golpe), o lutador é recortado em peças (braços, coxas, canelas, arma)
// presas em articulações (ombro, quadril, joelho). Cada quadro gira e move as peças em volta das articulações,
// então nada "sai" do corpo e dá para ter quantos quadros quiser: respiração, passada, chute, coice do tiro.
//
// Para girar pixel art sem serrilhar, a peça é ampliada 8x com Scale2x (que arredonda as diagonais), girada
// e lida de volta na grade original (a mesma ideia do RotSprite). Os quadros são montados na primeira vez
// que aparecem e guardados.
//
// def.rig = {
//   rigs: { main: {                       // um ou mais esqueletos (a Mamba tem um com a arma baixa e outro mirando)
//     base: 'idle' | 'attack',            // desenho de onde sai o corpo
//     parts: { nome: { from, rects: [[x0, y0, x1, y1, cores?], ...], colors?, pivot: [x, y], parent?, z } },
//     patch: [{ from, rects, colors? }],  // tapa no corpo os buracos deixados pelas peças
//   } },
//   anims: { idle, walk, punch, strong_punch: { frames, steps?, period?, pose(t) } },
//   walkLegs: ['perna', ...],             // peças que continuam andando enquanto ataca (atirar correndo)
// }
// rects: retângulos recortados (x1 e y1 de fora); com cores, só entram pixels dessas cores (e o contorno deles).
// z negativo: atrás do corpo. pose(t) devolve { rig?, dx, dy, peça: [giro em graus, dx, dy] ou null (escondida) }.

const RIG_UP = 8; // ampliação usada para girar

function rigGrid(def, which) {
    let rows = which === 'idle' ? def.idle : spriteVariant(def.idle, def[which]);
    // Sprites desenhados em 32x32 são ampliados para 64 antes (como no jogo)
    if (!def.size) rows = upscaleRows(rows);
    const size = def.size || HD_SIZE;
    return Array.from({ length: size }, (_, y) => (rows[y] || '').padEnd(size, '.').slice(0, size).split(''));
}

// Scale2x numa grade retangular
function rigScale2x(g) {
    const h = g.length, w = g[0].length;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : g[y][x];
    const out = Array.from({ length: h * 2 }, () => Array(w * 2).fill('.'));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
        out[y * 2][x * 2] = (C === A && C !== D && A !== B) ? A : P;
        out[y * 2][x * 2 + 1] = (A === B && A !== C && B !== D) ? B : P;
        out[y * 2 + 1][x * 2] = (D === C && D !== B && C !== A) ? C : P;
        out[y * 2 + 1][x * 2 + 1] = (B === D && B !== A && D !== C) ? D : P;
    }
    return out;
}

// Fecha o contorno: espaço vazio encostado numa cor ganha a linha escura (onde a peça foi cortada do corpo)
function rigCloseOutline(g) {
    const h = g.length, w = g[0].length;
    const out = g.map(r => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (g[y][x] !== '.') continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const c = (g[y + dy] || [])[x + dx];
            if (c && c !== '.' && c !== 'K') { out[y][x] = 'K'; break; }
        }
    }
    return out;
}

function rigMask(grid, part) {
    const size = grid.length;
    const mask = new Uint8Array(size * size);
    for (const [x0, y0, x1, y1, rectColors] of part.rects) {
        const colors = rectColors || part.colors;
        const inRect = (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
        for (let y = Math.max(0, y0); y < Math.min(size, y1); y++) for (let x = Math.max(0, x0); x < Math.min(size, x1); x++) {
            const c = grid[y][x];
            if (c === '.') continue;
            if (colors && !colors.includes(c)) {
                // contorno: entra se encostar numa cor da peça
                if (c !== 'K') continue;
                let near = false;
                for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const n = (grid[y + dy] || [])[x + dx];
                    if (n && colors.includes(n) && inRect(x + dx, y + dy)) { near = true; break; }
                }
                if (!near) continue;
            }
            mask[y * size + x] = 1;
        }
    }
    return mask;
}

function buildRig(def, rig) {
    const size = def.size || HD_SIZE;
    const base = rig.base || 'idle';
    const grids = {};
    const gridOf = name => grids[name] || (grids[name] = rigGrid(def, name));
    const parts = {};
    for (const [name, p] of Object.entries(rig.parts)) {
        const grid = gridOf(p.from || 'idle');
        const mask = rigMask(grid, p);
        let x0 = size, y0 = size, x1 = -1, y1 = -1;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mask[y * size + x]) {
            x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
        // recorte com 1 de folga, para o contorno fechado caber
        const bx = x0 - 1, by = y0 - 1, w = x1 - x0 + 3, h = y1 - y0 + 3;
        let sub = Array.from({ length: h }, (_, j) => Array.from({ length: w }, (_, i) => {
            const x = bx + i, y = by + j;
            return x >= 0 && y >= 0 && x < size && y < size && mask[y * size + x] ? grid[y][x] : '.';
        }));
        sub = rigCloseOutline(sub);
        let up = sub;
        for (let k = 1; k < RIG_UP; k *= 2) up = rigScale2x(up);
        parts[name] = { ...p, name, mask, bx, by, w, h, sub, up, z: p.z || 0 };
    }
    // Corpo: o desenho base sem as peças, com os buracos tapados
    let body = gridOf(base).map(r => r.slice());
    for (const p of Object.values(parts)) {
        if ((p.from || 'idle') !== base) continue;
        for (let i = 0; i < size * size; i++) if (p.mask[i]) body[Math.floor(i / size)][i % size] = '.';
    }
    for (const patch of rig.patch || []) {
        const src = gridOf(patch.from);
        const taken = Object.values(parts).filter(p => (p.from || 'idle') === patch.from).map(p => p.mask);
        for (const [x0, y0, x1, y1] of patch.rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            if (body[y][x] !== '.' || src[y][x] === '.' || taken.some(m => m[y * size + x])) continue;
            if (patch.colors && !patch.colors.includes(src[y][x])) continue;
            body[y][x] = src[y][x];
        }
    }
    body = rigCloseOutline(body);
    const order = Object.values(parts).sort((a, b) => a.z - b.z);
    return { size, parts, order, body };
}

// Matriz 2D [a, b, c, d, e, f]: (x, y) -> (a x + c y + e, b x + d y + f)
const rigMul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
function rigLocal(pivot, deg, dx, dy) {
    const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const [px, py] = pivot;
    // T(pivot + d) · R · T(-pivot)
    return [c, s, -s, c, px + dx - (c * px - s * py), py + dy - (s * px + c * py)];
}
function rigInvert(m) {
    const det = m[0] * m[3] - m[1] * m[2];
    const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
    return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

// Monta um quadro (grade de letras da paleta) a partir de uma pose
function renderRigPose(built, pose) {
    const { size, parts, order } = built;
    const out = Array.from({ length: size }, () => Array(size).fill('.'));
    const root = [1, 0, 0, 1, Math.round(pose.dx || 0), Math.round(pose.dy || 0)];
    const worlds = {};
    const worldOf = p => {
        if (worlds[p.name]) return worlds[p.name];
        const v = Array.isArray(pose[p.name]) ? pose[p.name] : [0, 0, 0];
        const parent = p.parent ? worldOf(parts[p.parent]) : root;
        return (worlds[p.name] = rigMul(parent, rigLocal(p.pivot, v[0] || 0, v[1] || 0, v[2] || 0)));
    };
    const stamp = (src, ox, oy) => {
        for (let y = 0; y < src.length; y++) for (let x = 0; x < src[0].length; x++) {
            const c = src[y][x], X = x + ox, Y = y + oy;
            if (c !== '.' && X >= 0 && Y >= 0 && X < size && Y < size) out[Y][X] = c;
        }
    };
    const drawPart = p => {
        if (pose[p.name] === null) return; // peça escondida nesta pose
        const m = worldOf(p);
        // Sem giro e com deslocamento inteiro: cópia direta (fica idêntico ao desenho original)
        if (Math.abs(m[1]) < 1e-6 && Math.abs(m[2]) < 1e-6 && Math.abs(m[4] - Math.round(m[4])) < 1e-6 && Math.abs(m[5] - Math.round(m[5])) < 1e-6) {
            stamp(p.sub, p.bx + Math.round(m[4]), p.by + Math.round(m[5]));
            return;
        }
        const inv = rigInvert(m);
        // área de destino: cantos do recorte transformados
        let minX = size, minY = size, maxX = 0, maxY = 0;
        for (const [cx, cy] of [[p.bx, p.by], [p.bx + p.w, p.by], [p.bx, p.by + p.h], [p.bx + p.w, p.by + p.h]]) {
            const X = m[0] * cx + m[2] * cy + m[4], Y = m[1] * cx + m[3] * cy + m[5];
            minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y); maxY = Math.max(maxY, Y);
        }
        for (let Y = Math.max(0, Math.floor(minY)); Y < Math.min(size, Math.ceil(maxY)); Y++) {
            for (let X = Math.max(0, Math.floor(minX)); X < Math.min(size, Math.ceil(maxX)); X++) {
                const sx = inv[0] * (X + 0.5) + inv[2] * (Y + 0.5) + inv[4];
                const sy = inv[1] * (X + 0.5) + inv[3] * (Y + 0.5) + inv[5];
                const u = Math.floor((sx - p.bx) * RIG_UP), v = Math.floor((sy - p.by) * RIG_UP);
                const c = (p.up[v] || [])[u];
                if (c && c !== '.') out[Y][X] = c;
            }
        }
    };
    for (const p of order) if (p.z < 0) drawPart(p);
    stamp(built.body, Math.round(pose.dx || 0), Math.round(pose.dy || 0));
    for (const p of order) if (p.z >= 0) drawPart(p);
    return out.map(r => r.join(''));
}

// --- Animação por quadros-chave ---
// keys: [{ t: 0..1, ...pose }]; entre duas chaves os valores andam com suavização (sai devagar, chega devagar).
// Peça null numa chave fica escondida até a próxima chave.
function rigKeys(keys) {
    const ease = u => u * u * (3 - 2 * u);
    // cada chave herda o que a anterior tinha e ela não diz
    keys = keys.map((k, i, all) => i ? Object.assign({}, ...all.slice(0, i), k) : k);
    return t => {
        let i = 0;
        while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
        const a = keys[i], b = keys[i + 1] || a;
        const u = b.t > a.t ? ease(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))) : 0;
        const pose = {};
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
            if (k === 't') continue;
            const va = a[k], vb = b[k] === undefined ? va : b[k];
            if (va === null || va === undefined) { pose[k] = va === null ? null : vb; continue; }
            if (typeof va === 'string') { pose[k] = va; continue; }
            if (typeof va === 'number') { pose[k] = va + ((typeof vb === 'number' ? vb : va) - va) * u; continue; }
            const vB = vb === null ? va : vb;
            pose[k] = va.map((x, j) => x + ((vB[j] ?? x) - x) * u);
        }
        return pose;
    };
}

// Arredonda a pose (giros de 1 grau, deslocamentos inteiros) para quadros parecidos virarem o mesmo
function rigPoseKey(pose) {
    return Object.keys(pose).sort().map(k => {
        const v = pose[k];
        if (v === null) return `${k}:x`;
        if (typeof v === 'string') return `${k}:${v}`;
        if (typeof v === 'number') return `${k}:${Math.round(v)}`;
        return `${k}:${Math.round(v[0])},${Math.round(v[1] || 0)},${Math.round(v[2] || 0)}`;
    }).join('|');
}

// Escolhe a pose do lutador agora. Devolve null para usar os sprites de sempre (especial, investidas...).
function rigPoseFor(rig, f) {
    if (!f || f.spriteFrame === 'special' || f.isCelebrating) return null;
    const A = rig.anims;
    const walking = f.walkFrame !== null && f.walkFrame !== undefined &&
        (f.moveX === undefined || Math.hypot(f.moveX, f.moveY) > 0.3);
    const walkT = walking ? (f.walkPhase !== undefined ? f.walkPhase / 4 : f.walkFrame / 4) % 1 : 0;
    const quant = (t, n) => Math.floor(t * n) / n;
    if (f.isAttacking && A[f.attackType]) {
        const anim = A[f.attackType];
        const t = Math.min(0.999, (f.attackAge || 0) / anim.steps);
        const pose = { ...anim.pose(quant(t, anim.frames)) };
        if (walking && rig.walkLegs) {
            const legs = A.walk.pose(quant(walkT, A.walk.frames));
            for (const k of rig.walkLegs) if (legs[k] !== undefined) pose[k] = legs[k];
        }
        return pose;
    }
    if (f.spriteFrame === 'attack') return null;
    if (walking) return A.walk.pose(quant(walkT, A.walk.frames));
    const seed = (typeof fighters !== 'undefined' && fighters.indexOf(f) >= 0 ? fighters.indexOf(f) : 0) * 0.37;
    const t = ((Date.now() / A.idle.period) + seed) % 1;
    return A.idle.pose(quant(t, A.idle.frames));
}

// =====================================================================
// El Craque: braços, coxas, canelas e a bola no pé
// =====================================================================
pixelCharacters.craque.rig = {
    rigs: {
        main: {
            parts: {
                backArm: { rects: [[12, 20, 20, 26], [11, 26, 17, 38]], pivot: [16, 23], z: -3 },
                backThigh: { rects: [[20, 41, 28, 48]], pivot: [24, 41], z: -2 },
                backShin: { rects: [[19, 47, 30, 64]], pivot: [24, 47], parent: 'backThigh', z: -2.1 },
                frontThigh: { rects: [[34, 41, 42, 48]], pivot: [38, 41], z: -1 },
                frontShin: { rects: [[33, 47, 44, 64]], pivot: [38, 47], parent: 'frontThigh', z: -1.1 },
                ball: { rects: [[45, 53, 58, 64]], pivot: [51, 58], z: 0.5 },
                frontArm: { rects: [[43, 20, 51, 38]], pivot: [46, 23], z: 1 },
            },
        },
    },
    anims: {
        // Parado: braços balançando de leve com a respiração
        idle: {
            frames: 8, period: 1800,
            pose: t => { const s = Math.sin(t * Math.PI * 2); return { backArm: [3 * s], frontArm: [-3 * s] }; },
        },
        // Passada: coxas indo e voltando do quadril, joelho dobrando na perna que vem para a frente,
        // braços no sentido contrário e o corpo subindo quando as pernas se cruzam
        walk: {
            frames: 8,
            pose: t => {
                const s = Math.sin(t * Math.PI * 2), c = Math.cos(t * Math.PI * 2);
                return {
                    dy: -Math.round(Math.abs(c)),
                    backThigh: [22 * s], backShin: [34 * Math.max(0, -c)],
                    frontThigh: [-22 * s], frontShin: [34 * Math.max(0, c)],
                    backArm: [-16 * s], frontArm: [16 * s],
                };
            },
        },
        // Chute: a perna da frente vem do joelho dobrado e estica para a frente; a bola sai do pé;
        // braços abrem para equilibrar e a perna volta ao chão aos poucos
        punch: {
            steps: 14, frames: 14,
            pose: rigKeys([
                { t: 0, dx: -1, frontThigh: [-30], frontShin: [45], backThigh: [8], backShin: [0], backArm: [-20], frontArm: [20], ball: [0, 0, 0] },
                { t: 0.08, frontThigh: [-78], frontShin: [4], backArm: [-35], frontArm: [30], ball: null },
                { t: 0.3, frontThigh: [-84], frontShin: [0] },
                { t: 0.6, dx: 0, frontThigh: [-35], frontShin: [30], backArm: [-10], frontArm: [10], backThigh: [4] },
                { t: 0.85, frontThigh: [-6], frontShin: [8], backArm: [0], frontArm: [0], backThigh: [0], ball: [0, 0, 0] },
                { t: 1, frontThigh: [0], frontShin: [0] },
            ]),
        },
        // Chute forte: puxa a perna lá atrás (preparação), solta um chute alto e segura um instante
        strong_punch: {
            steps: 45, frames: 45,
            pose: rigKeys([
                { t: 0, dx: -2, frontThigh: [24], frontShin: [60], backThigh: [-6], backShin: [0], backArm: [15], frontArm: [-25] },
                { t: 0.085, frontThigh: [36], frontShin: [80] },
                { t: 0.13, dx: 0, frontThigh: [-50], frontShin: [35], backArm: [-30], frontArm: [30] },
                { t: 0.18, dx: 1, frontThigh: [-100], frontShin: [-5], backThigh: [10], backArm: [-40], frontArm: [35] },
                { t: 0.36, frontThigh: [-95], frontShin: [0] },
                { t: 0.62, dx: 0, frontThigh: [-40], frontShin: [30], backArm: [-10], frontArm: [10], backThigh: [3] },
                { t: 0.86, frontThigh: [-5], frontShin: [6], backArm: [0], frontArm: [0], backThigh: [0] },
                { t: 1, frontThigh: [0], frontShin: [0] },
            ]),
        },
    },
};

// =====================================================================
// Mamba: o rifle sobe até o ombro, dá coice a cada tiro e desce devagar; as pernas andam sob o casaco
// =====================================================================
const MAMBA_LEGS = {
    backLeg: { rects: [[19, 48, 30, 64]], pivot: [24, 44], z: -1 },
    frontLeg: { rects: [[33, 48, 44, 64]], pivot: [38, 44], z: -1.1 },
};
pixelCharacters.mamba.rig = {
    rigs: {
        // Rifle na altura do quadril (parada e andando)
        low: {
            base: 'idle',
            parts: {
                ...MAMBA_LEGS,
                gun: { rects: [[26, 25, 64, 40, 'GgLV']], pivot: [30, 31], z: 1 },
            },
            patch: [{ from: 'attack', rects: [[26, 25, 44, 41]], colors: 'CcHhb' }],
        },
        // Rifle no ombro, mirando
        high: {
            base: 'attack',
            parts: {
                ...MAMBA_LEGS,
                gun: { from: 'attack', rects: [[26, 19, 64, 34, 'GgLVB']], pivot: [30, 26], z: 1 },
            },
            patch: [{ from: 'idle', rects: [[26, 19, 44, 34]], colors: 'CcHhbK' }],
        },
    },
    walkLegs: ['backLeg', 'frontLeg'],
    anims: {
        idle: {
            frames: 8, period: 2000,
            pose: t => ({ rig: 'low', gun: [-1.5 * Math.sin(t * Math.PI * 2)] }),
        },
        walk: {
            frames: 8,
            pose: t => {
                const s = Math.sin(t * Math.PI * 2), c = Math.cos(t * Math.PI * 2);
                return {
                    rig: 'low', dy: -Math.round(Math.abs(c)),
                    backLeg: [16 * s, 0, -2 * Math.max(0, -c)], frontLeg: [-16 * s, 0, -2 * Math.max(0, c)],
                    gun: [2 * c],
                };
            },
        },
        // Tiro: já no ombro, coice para trás e para cima, volta, segura a mira e baixa o rifle
        punch: {
            steps: 28, frames: 28,
            pose: rigKeys([
                { t: 0, rig: 'high', dx: -1, gun: [-8, -3, 0] },
                { t: 0.05, gun: [-5, -2, 0] },
                { t: 0.14, dx: 0, gun: [-2, -1, 0] },
                { t: 0.25, gun: [0, 0, 0] },
                { t: 0.62, gun: [0, 0, 0] },
                { t: 0.63, rig: 'low', gun: [-12, 0, -5] },
                { t: 0.85, gun: [-3, 0, -1] },
                { t: 1, gun: [0, 0, 0] },
            ]),
        },
        // Tiro forte: coice bem maior, o corpo vai junto
        strong_punch: {
            steps: 45, frames: 45,
            pose: rigKeys([
                { t: 0, rig: 'high', dx: -3, gun: [-14, -5, -1] },
                { t: 0.04, dx: -2, gun: [-10, -4, -1] },
                { t: 0.12, dx: -1, gun: [-4, -2, 0] },
                { t: 0.22, dx: 0, gun: [0, 0, 0] },
                { t: 0.7, gun: [0, 0, 0] },
                { t: 0.71, rig: 'low', gun: [-12, 0, -5] },
                { t: 0.9, gun: [-3, 0, -1] },
                { t: 1, gun: [0, 0, 0] },
            ]),
        },
    },
};

// =====================================================================
// Esqueleto automático para os outros lutadores
// =====================================================================
// Usa o que cada sprite já informa: a linha onde começam as pernas (LEG_START) e a área do braço da frente
// (SPECIAL_POSE). Cada perna vira coxa + canela (joelho no meio); o braço gira no ombro.
// Golpe corpo a corpo: puxa o braço para trás (preparação), entra o desenho de golpe com um tranco para a
// frente e o braço volta passando um pouco do ponto. Atiradores: coice e o braço baixando devagar.
const RIG_SHOOTERS = ['gear', 'roxy'];

function autoRig(type) {
    const def = pixelCharacters[type];
    const k = def.size ? 1 : 2, size = def.size || HD_SIZE;
    const grid = rigGrid(def, 'idle');
    const legStart = (def.legStart || 20) * k;
    const split = Math.floor(size * 15 / 32), weapons = Math.floor(size * 22 / 32);
    const area = SPECIAL_POSE[type] && !['zarek', 'celestia', 'aspas'].includes(type) ? SPECIAL_POSE[type] : null;
    const arm = area ? [area.x0 * k, area.y0 * k, area.x1 * k, area.y1 * k] : null;

    // Uma perna: coxa e canela, com o quadril no meio das colunas ocupadas
    const legParts = (side, x0, x1, z) => {
        let minX = size, maxX = -1, maxY = -1;
        for (let y = legStart; y < size; y++) for (let x = x0; x < x1; x++) {
            if (grid[y][x] !== '.') { minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        }
        if (maxX < 0) return {};
        const hipX = Math.round((minX + maxX + 1) / 2), len = maxY - legStart;
        if (len < 10) return { [side + 'Thigh']: { rects: [[x0, legStart, x1, size]], pivot: [hipX, legStart], z } };
        const knee = legStart + Math.round(len * 0.45);
        return {
            [side + 'Thigh']: { rects: [[x0, legStart, x1, knee + 1]], pivot: [hipX, legStart], z },
            [side + 'Shin']: { rects: [[x0, knee, x1, size]], pivot: [hipX, knee], parent: side + 'Thigh', z: z - 0.1 },
        };
    };
    const legs = from => {
        const front = legParts('front', split, weapons, -1);
        const back = legParts('back', 0, split, -2);
        const all = { ...back, ...front };
        for (const p of Object.values(all)) p.from = from;
        return all;
    };
    const rigs = {
        main: { base: 'idle', parts: { ...legs('idle') } },
        hit: { base: 'attack', parts: legs('attack') },
    };
    if (arm) {
        // Braço que desce além da cintura (espada pendurada): abaixo das pernas só entra o que fica fora delas
        const [x0, y0, x1, y1] = arm;
        const rects = y1 > legStart
            ? [[x0, y0, x1, legStart], [Math.max(x0, weapons), legStart, x1, y1]]
            : [arm];
        rigs.main.parts.frontArm = { rects, pivot: [x0 + 2 * k, y0 + 2 * k], z: 1 };
    }
    // Coleone anda sem a bola na mão: a passada usa o quadro de andar
    if (def.walk) rigs.walk = { base: 'walk', parts: legs('walk') };
    const walkRig = def.walk ? 'walk' : 'main';

    const ranged = RIG_SHOOTERS.includes(type);
    const anims = {
        idle: { frames: 8, period: 1800, pose: t => ({ frontArm: [2 * Math.sin(t * Math.PI * 2)] }) },
        walk: {
            frames: 8,
            pose: t => {
                const s = Math.sin(t * Math.PI * 2), c = Math.cos(t * Math.PI * 2);
                return {
                    rig: walkRig, dy: -Math.round(Math.abs(c)),
                    backThigh: [20 * s], backShin: [30 * Math.max(0, -c)],
                    frontThigh: [-20 * s], frontShin: [30 * Math.max(0, c)],
                    frontArm: [9 * s],
                };
            },
        },
        punch: ranged ? {
            // Tiro: coice no quadro de mira, depois o braço baixa devagar
            steps: 20, frames: 20,
            pose: rigKeys([
                { t: 0, rig: 'hit', dx: -2 },
                { t: 0.1, dx: -1 },
                { t: 0.3, dx: 0 },
                { t: 0.55, rig: 'main', frontArm: [-14] },
                { t: 0.8, frontArm: [-3] },
                { t: 1, frontArm: [0] },
            ]),
        } : {
            steps: 22, frames: 22,
            pose: rigKeys([
                { t: 0, rig: 'main', dx: -1, frontArm: [18] },   // preparação (2 passos)
                { t: 0.09, rig: 'hit', dx: 2 },                  // golpe: desenho de ataque com tranco
                { t: 0.3, dx: 1 },
                { t: 0.45, rig: 'main', dx: 0, frontArm: [-12] }, // passa do ponto e volta
                { t: 0.7, frontArm: [-2] },
                { t: 1, frontArm: [0] },
            ]),
        },
        strong_punch: ranged ? {
            steps: 30, frames: 30,
            pose: rigKeys([
                { t: 0, rig: 'hit', dx: -4 },
                { t: 0.08, dx: -2 },
                { t: 0.25, dx: 0 },
                { t: 0.55, rig: 'main', frontArm: [-16] },
                { t: 0.8, frontArm: [-4] },
                { t: 1, frontArm: [0] },
            ]),
        } : {
            steps: 34, frames: 34,
            pose: rigKeys([
                { t: 0, rig: 'main', dx: -1, frontArm: [14] },
                { t: 0.1, dx: -2, frontArm: [28] },             // preparação maior (4 passos)
                { t: 0.13, rig: 'hit', dx: 3 },
                { t: 0.35, dx: 1 },
                { t: 0.5, rig: 'main', dx: 0, frontArm: [-15] },
                { t: 0.75, frontArm: [-3] },
                { t: 1, frontArm: [0] },
            ]),
        },
    };
    return { rigs, anims, walkLegs: ['backThigh', 'backShin', 'frontThigh', 'frontShin'] };
}

for (const type of Object.keys(LEG_START)) {
    if (!pixelCharacters[type].rig) pixelCharacters[type].rig = autoRig(type);
}

// --- Pré-montagem ---
// No começo da luta, monta aos poucos (alguns quadros por passo) a passada e os golpes de quem está lutando,
// para o primeiro passo ou golpe não dar um tranquinho montando quadro na hora.
const rigWarmJobs = [];
const rigWarmCanvas = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
function rigWarm(list) {
    rigWarmJobs.length = 0;
    for (const f of list) {
        const def = pixelCharacters[f.characterType];
        if (!def || !def.rig || !characterArt[f.characterType]) continue;
        const base = { characterType: f.characterType, zarekForm: f.zarekForm, spriteForm: f.spriteForm, moveX: 1, moveY: 0, spriteFrame: null };
        const walk = def.rig.anims.walk;
        for (let i = 0; i < walk.frames; i++) rigWarmJobs.push({ ...base, walkFrame: 0, walkPhase: (i + 0.5) * 4 / walk.frames });
        for (const type of ['punch', 'strong_punch']) {
            const anim = def.rig.anims[type];
            if (!anim) continue;
            for (let age = 0; age < anim.steps; age++) rigWarmJobs.push({ ...base, walkFrame: null, isAttacking: true, attackType: type, attackAge: age });
        }
    }
}
function rigWarmTick(budget = 3) {
    for (let n = 0; n < budget && rigWarmJobs.length; n++) {
        const job = rigWarmJobs.shift();
        try { characterArt[job.characterType](rigWarmCanvas, 0, 0, 1, 1, job); } catch (e) { /* só aquecimento */ }
    }
}
