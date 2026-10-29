// --- Personagens em Pixel Art ---
// Cada sprite é uma grade de 32x32 caracteres (ou 48x48 / 64x64 quando o personagem define size). Cada caractere é uma cor da paleta ('.' = transparente).
// Linhas mais curtas que 32 são completadas com '.' à direita.
// O corpo ocupa as colunas 8 a 23 (a "caixa" do lutador); o resto é espaço para braços, armas e capas.
// O personagem sempre é desenhado virado para a direita; o jogo espelha quando precisa.
// Cada personagem desenha dois quadros à mão: 'idle' (parado) e 'attack' (golpe).
// Os 4 quadros de caminhada são gerados sozinhos a partir do 'idle' (ver buildWalkFrames).
const SPRITE_SIZE = 32;
const OUTLINE = '#1a1024';

// Caminhada gerada a partir do sprite parado: separa a parte de baixo em perna de trás
// (colunas 0-14) e perna da frente (colunas 15-21) e mexe cada uma, alternando os passos.
// As colunas 22+ (armas penduradas, cajados) ficam paradas.
// legStart: linha onde começam as pernas (personagens de vestido/saia mexem só os pés).
const WALK_POSES = [
    { back: { dx: -1, dy: 0 }, front: { dx: 1, dy: -1 } }, // perna da frente adiantada e levantada
    { back: { dx: 0, dy: 0 }, front: { dx: 0, dy: 0 } },   // pernas passando uma pela outra
    { back: { dx: 1, dy: -1 }, front: { dx: -1, dy: 0 } }, // perna de trás adiantada e levantada
    { back: { dx: 0, dy: 0 }, front: { dx: 0, dy: 0 } },
];

// size: tamanho da grade (32 padrão; sprites mais detalhados usam 48). As colunas e o passo crescem junto.
function buildWalkFrames(idle, legStart, size = SPRITE_SIZE) {
    const k = size / SPRITE_SIZE;
    const split = Math.floor(15 * k), weapons = Math.floor(22 * k);
    const step = d => Math.sign(d) * Math.round(Math.abs(d) * k);
    const legHeight = size - legStart;
    return WALK_POSES.map(pose => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const g = canvas.getContext('2d');
        g.drawImage(idle, 0, 0, size, legStart, 0, 0, size, legStart);                                    // corpo
        g.drawImage(idle, weapons, legStart, size - weapons, legHeight, weapons, legStart, size - weapons, legHeight); // armas penduradas
        g.drawImage(idle, 0, legStart, split, legHeight, step(pose.back.dx), legStart + step(pose.back.dy), split, legHeight);
        g.drawImage(idle, split, legStart, weapons - split, legHeight, split + step(pose.front.dx), legStart + step(pose.front.dy), weapons - split, legHeight);
        return canvas;
    });
}

function buildSprite(rows, palette, name, size = SPRITE_SIZE) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const sctx = canvas.getContext('2d');
    rows.forEach((row, y) => {
        if (row.length > size) console.warn(`Sprite ${name}: linha ${y} tem ${row.length} colunas (máximo ${size})`);
        for (let x = 0; x < row.length; x++) {
            const color = palette[row[x]];
            if (!color) continue;
            sctx.fillStyle = color;
            sctx.fillRect(x, y, 1, 1);
        }
    });
    return canvas;
}

// --- Ampliação 32 -> 64 ---
// Sprites desenhados em 32x32 são ampliados para 64x64 com Scale2x (arredonda curvas e diagonais
// em vez de virar blocos 2x2) e depois o contorno 'K', que dobrou de grossura, volta a ter 1 pixel.
const HD_SIZE = 64;

function scale2x(rows, n) {
    const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n) ? '.' : ((rows[y] || '')[x] || '.');
    const out = Array.from({ length: n * 2 }, () => Array(n * 2).fill('.'));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
        out[y * 2][x * 2] = (C === A && C !== D && A !== B) ? A : P;
        out[y * 2][x * 2 + 1] = (A === B && A !== C && B !== D) ? B : P;
        out[y * 2 + 1][x * 2] = (D === C && D !== B && C !== A) ? C : P;
        out[y * 2 + 1][x * 2 + 1] = (B === D && B !== A && D !== C) ? D : P;
    }
    return out;
}

// Afina linhas de contorno de 2 pixels: o lado que encosta numa cor vira essa cor
function thinOutline(grid) {
    const n = grid.length;
    const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n) ? '.' : grid[y][x];
    const isColor = c => c !== '.' && c !== 'K';
    const out = grid.map(row => row.slice());
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (grid[y][x] !== 'K') continue;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            const ahead = at(x + dx, y + dy), behind = at(x - dx, y - dy);
            // Linha interna (cor dos dois lados) ou contorno externo (fundo depois do outro K)
            const thick = behind === 'K' && (dx + dy > 0 || at(x - 2 * dx, y - 2 * dy) === '.');
            if (isColor(ahead) && thick) { out[y][x] = ahead; break; }
        }
    }
    return out.map(row => row.join(''));
}

function upscaleRows(rows) {
    return thinOutline(scale2x(rows, SPRITE_SIZE));
}

// Cria um quadro a partir de outro, trocando só as linhas indicadas
function spriteVariant(baseRows, overrides) {
    return baseRows.map((row, i) => overrides[i] !== undefined ? overrides[i] : row);
}

const pixelCharacters = {};

// --- Titan: lutador de rua com braço robótico ---
pixelCharacters.titan = {
    palette: {
        K: OUTLINE,
        S: '#f2b98f', s: '#c47f5a', h: '#ffdcbc',          // pele
        R: '#ff2e63', r: '#a3123f',                          // boné
        B: '#2f6bff', b: '#1b3a99', W: '#e8f0ff',            // short
        G: '#b9c3d6', g: '#646d88', C: '#3ff6ff',            // braço robótico + luz
        D: '#3b2a63',                                        // tênis
    },
    idle: [
        '............KKKKKKK',
        '...........KRRRRRRRK',
        '..........KRRRRRhRRRK',
        '..........KrrrrrrrrrRRRK',
        '..........KSSSSSSSSSKKK',
        '..........KSSSSSSKSSK',
        '..........KsSSSSSSSSSK',
        '..........KsSSSSSKKKSK',
        '...........KsSSSSSSSK',
        '............KsSSSSK',
        '.......KKKKsSSSSSSSSKKKKK',
        '......KsSSKsSSSSSSSSSKgGGGK',
        '......KsSSKsShSSSSSSSKgGCGK',
        '......KsSSKsSsSSsSSSSKgGGGK',
        '......KsSSKsSSSSSSSSSKggGgK',
        '......KsSSKssSSsSSSsSKgGGGK',
        '......KSSSKsSSSSSSSSsKgGGGK',
        '......KhSSKssSSsSSSssKGCGGK',
        '.......KKKBBBBBBBBBBBKGGGGK',
        '........KWBBBBBBBBBBBKgggK',
        '........KWBBBBbBBBBBBK',
        '........KWBBBBbbBBBBBK',
        '........KWBBBBKKBBBBbK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KsSsK..KsSsK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '........KDDDDK.KDDDDDK',
        '........KKKKKK.KKKKKKK',
    ],
    attack: {
        11: '......KsSSKsSSSSSSSSSKKKKKKKKK',
        12: '......KsSSKsShSSSSSSSKgGGGGGGCK',
        13: '......KsSSKsSsSSsSSSSKgggggggGCK',
        14: '......KsSSKsSSSSSSSSSKKKKKKKKKK',
        15: '......KsSSKssSSsSSSsSK',
        16: '......KSSSKsSSSSSSSSsK',
        17: '......KhSSKssSSsSSSssK',
        18: '.......KKKBBBBBBBBBBBK',
        19: '........KWBBBBBBBBBBBK',
    },
};

// --- Spark: robô de segurança com capa ---
pixelCharacters.spark = {
    palette: {
        K: OUTLINE,
        H: '#1d1630', h: '#3a2d5c',                          // capuz e capa
        L: '#9aa3b8', l: '#d8e0f0', M: '#4a4f63', m: '#2e3142', // metal
        E: '#ff2a2a',                                        // visor
        O: '#ff8c1a', Y: '#ffd23f',                          // núcleo de energia
        R: '#e0263a',                                        // tênis
    },
    idle: [
        '............KKKKKKK',
        '...........KHHHHHHHK',
        '..........KHHLLLLLHHK',
        '..........KHLlLLLLLLHK',
        '..........KHLEEEEEELHK',
        '..........KHLLLLLLLLHK',
        '..........KHHLmmmmLHHK',
        '...........KHHLLLLHHK',
        '............KKMMMMKK',
        '....KHHKKKKLLLLLLLLLKKKKK',
        '...KHHhLLLKLlLLLLLLLLKLLLK',
        '...KHHhMLMKLLLOOOOLLLKMLMK',
        '...KHhHMLMKLLOYYYYOLLKMLMK',
        '...KHHhMLMKLLOYYYYOLLKMLMK',
        '...KHhHMLMKLLLOOOOLLLKMLMK',
        '...KHHhMMMKMMMMMMMMMMKMMMK',
        '...KHhHLLLKmmmmmmmmmmKLLLK',
        '..KHHhK.KMMMMMMMMMMMMK',
        '..KHhHK.KMMMMMKKMMMMMK',
        '.KHHhK...KLLmK..KLLmK',
        '.KHhHK...KLLmK..KLLmK',
        'KHHhK....KMMMK..KMMMK',
        'KHhHK....KLLmK..KLLmK',
        'KKKKK....KLLmK..KLLmK',
        '.........KLLmK..KLLmK',
        '.........KMMMK..KMMMK',
        '.........KLLmK..KLLmK',
        '.........KLLmK..KLLmK',
        '.........KLLmK..KLLmK',
        '.........KLLmK..KLLmK',
        '........KRRRRK.KRRRRRK',
        '........KKKKKK.KKKKKKK',
    ],
    attack: {
        10: '...KHHhLLLKLlLLLLLLLLKKKKKKKKK',
        11: '...KHHhMLMKLLLOOOOLLLKMLMLMLMOYK',
        12: '...KHhHMLMKLLOYYYYOLLKMLMLMLMYYK',
        13: '...KHHhMLMKLLOYYYYOLLKKKKKKKKKKK',
        14: '...KHhHMLMKLLLOOOOLLLK',
        15: '...KHHhMMMKMMMMMMMMMMK',
        16: '...KHhHLLLKmmmmmmmmmmK',
    },
};

// --- Hades: guerreiro de punhos flamejantes ---
pixelCharacters.hades = {
    palette: {
        K: OUTLINE,
        S: '#8d5524', s: '#5e3818', h: '#b8743f',          // pele
        N: '#151018',                                        // cabelo
        P: '#3a3a4a', p: '#24242e',                          // calça
        k: '#2a1a12',                                        // cinto e botas
        F: '#ff7a1a', f: '#ffd23f',                          // fogo
    },
    idle: [
        '............K.K.K.K',
        '...........KNKNKNKNK',
        '..........KNNNNNNNNNK',
        '..........KNNNNNNNNNNK',
        '..........KNSSSSSSSSK',
        '..........KNSSSSSKSSK',
        '..........KsSSSSSSSSSK',
        '..........KsSSSSSKKKSK',
        '...........KsSSSSSSSK',
        '............KsSSSSK',
        '.......KKKKsSSSSSSSSKKKKK',
        '......KsSSKsSSSSSSSSSKsSSK',
        '......KsSSKsShSSSSSSSKsSSK',
        '......KsSSKsSsSSsSSSSKsSSK',
        '......KsSSKsSSSSSSSSSKsSSK',
        '.....KfFfKKssSSsSSSsSKfFfK',
        '.....KFfFfKsSSSSSSSSsKFfFfK',
        '......KFFFKssSSsSSSssKFFFK',
        '.......KKKkkkkkkkkkkkKKKK',
        '........KPPPPPPPPPPPPK',
        '........KPPPPPpPPPPPPK',
        '........KPPPPPKKPPPPpK',
        '.........KPPpK..KPPpK',
        '.........KPPpK..KPPpK',
        '.........KPPpK..KPPpK',
        '.........KPPpK..KPPpK',
        '.........KPPpK..KPPpK',
        '.........KPPpK..KPPpK',
        '.........KPPpK..KPPpK',
        '.........KPPpK..KPPpK',
        '........KkkkkK.KkkkkkK',
        '........KKKKKK.KKKKKKK',
    ],
    attack: {
        11: '......KsSSKsSSSSSSSSSKKKKKKKKfFK',
        12: '......KsSSKsShSSSSSSSKsSSSKFfFfK',
        13: '......KsSSKsSsSSsSSSSKssssKFfFfK',
        14: '......KsSSKsSSSSSSSSSKKKKKKKKFFK',
        15: '.....KfFfKKssSSsSSSsSK',
        16: '.....KFfFfKsSSSSSSSSsK',
        17: '......KFFFKssSSsSSSssK',
    },
};

// --- Jack: amaldiçoado com cabeça de abóbora e foice ---
pixelCharacters.jack = {
    size: 64,
    palette: {
        K: OUTLINE,
        O: '#ff8a1f', o: '#c4520f',                          // abóbora
        g: '#3fa34d',                                        // talo
        Y: '#ffe34a',                                        // brilho do rosto
        H: '#241b33', h: '#3a2d52',                          // moletom
        P: '#1b1626',                                        // calça
        R: '#e0263a',                                        // tênis
        B: '#c8d0e0', b: '#6b4a2b',                          // foice
        W: '#f4f6fb',                                        // arma
    },
    idle: [
        '...............................KK',
        '.............................KKggKK',
        '.............................KggggK',
        '............................KgggggK',
        '.....................KKKKKKKKgggggKKKKKKKKK',
        '...................KKOOOOOooOgggggOOOOOOooOKK',
        '...................OOOOOOOooOOOOOOOOOOOOooOOO',
        '.................KOOOOOOOoooOOOOOOOOOOOOooOOOOK',
        '.................KOOOOOOoooOOOOOOOOOOOOOooOOOOK',
        '................KOOOOOOoooOOOOOOOOOOOOOOoooOOOOK',
        '................KOOOOOOooKYYYYKOOOKYYYYYKooOOOOK',
        '................KOOOOOooKKYYYKKOOOOKYYYKKoooOOOK',
        '................KOOOOOooOOOKKOOOOOOOOKKOOOooOOOK',
        '................KOOOOoooOOOOOOOOOOOOOOOOOOooOOOK',
        '................KOOOoooOOOOOOOOYYOOOOOOOOOooOOOK',
        '................KOOOooOOOOOOOYYYYYOOOOOOOOooOOOK',
        '................KOOOooKYYYKYYYKYYYKYYYKYYYooOOOK',
        '................KOOoOoOYYYYYYYYYYYYYYYYYYYoOoOOK',
        '................KooOOOOOYYYYKYYYKYYYKYYYYKOOOooK',
        '.................KooOOOOOKYYOYYYOYYYOYYYKOOOooK',
        '.................KoooooOOOOOOOOOOOOOOOOOooooooK',
        '...................oooooOOOOOOOOOOOOOOOOooooo',
        '...................KKKKKKKKKKKKKKKKKKKKKKKKKK',
        '....................KKKhHHHHHHHHHHHHHHHHHKKK',
        '.............KHHHHHHKKhhHHHHHHHHHHHHHHHHHHKHHHHHHHK',
        '............KHHHHHHHKhhhHHHHHHHHHHHHHHHHHHKHHHHHHHHK',
        '............KHHHHHHHKhhhHHHHHHHHHHHHHHHHHHKHHHHHHhhK',
        '............KHHHHHHHKhhhHHHHHHHHHHHHHHHHHHKHHHHHhhhK',
        '............KHHHHHHhKhhhHHHHHHHHHHHHHHHHHHKHHHHHhhhK',
        '............KHHHHHhhKhhhHHHHHHHHHHHHHHHHHHKHHHHHhhhK',
        '............KHHHHHhhKhhhHHHHHHHHHHHHHHHHHHKHHHHHhhhK',
        '............KHHHHHhhKhhhHHHHHHHHHHHHHHHHHHKHHKKKhhhK',
        '............KHHHHHhhKhhhHHhhhhhhhhhhhhHHHHKHHKhhKhhK',
        '............KHHHHHhhKhhhHHhhhhhhhhhhhhHHHHKHHKbbKhhK',
        '............KOOOOOOOKhhhHHHHHHHHHHHHHHHHHHKOOKbbKOOK',
        '.............KOOOOOKKhhHHHHHHHHHHHHHHHHHHHKKOKbbKOK',
        '.............KKKKKKKHHHHHHHHHHHHHHHHHHHHHHKKKKhhKKK...........K',
        '.................KKHHHHHHHHHHHHHHHHHHHHHHHK..KbbK.............K',
        '................KKPPPPPPPPPPPPPPPPPPPPPPPPK..KbbK.............K',
        '................KPPPPPPPPPPPPPPPPPPPPPPPPPK..KbbK............KK',
        '................KPPPPPPPPPPPPPPPPPPPPPPPPPK..KhhK............KK',
        '.................KPPPPPPPPPKPKKPPPPPPPPPPKK..KbbK............KK',
        '.................KPPPPPPPPPPK..KPPPPPPPPPK...KbbK...........KBK',
        '..................KPPPPPPPPK....KPPPPPPPPK...KbbK...........KWK',
        '..................KPPPPPPPPK....KPPPPPPPPK...KhhK..........KBK',
        '..................KPPPPPPPPK....KPPPPPPPPK...KbbK..........KBK',
        '..................KPPPPPPPPK....KPPPPPPPPK...KbbK.........KBWK',
        '..................KPPPPPPPPK....KPPPPPPPPK...KKbK........KBBK',
        '..................KPPPPPPPPK....KPPPPPPPPK..KKBKKKK...KKKBBWK',
        '..................KPPPPPPPPK....KPPPPPPPPK.KBBBBBBBKKKBBBBBK',
        '..................KPPPPPPPPK....KPPPPPPPPK.KBBBBBBBBBBBBBBK',
        '..................KPPPPPPPPK....KPPPPPPPPK.KBBBBBBBBBBBBWK',
        '..................KPPPPPPPPK....KPPPPPPPPK.KWBBBBBBBBBWKK',
        '..................KPPPPPPPPK....KPPPPPPPPK..KKWWWWWWKKK',
        '..................KPPPPPPPPK....KPPPPPPPPK....KKKKKK',
        '..................KPPPPPPPPK....KPPPPPPPPK',
        '..................KPPPPPPPPK....KPPPPPPPPK',
        '..................KPPPPPPPPK....KPPPPPPPPK',
        '..................KPPPPPPPPK....KPPPPPPPPK',
        '.................KRPPPPPPPPK...KRPPPPPPPRRK',
        '.................KRRRRRRRRRK...KRRRRRRRRRRK',
        '................KRRRRRRRRKKK..KRRRRRRRRRRRRK',
        '................KKRRRRRRRK....KKRRRRRRRRRRKK',
        '.................KKKKKKKKK.....KKKKKKKKKKKK',
    ],
    attack: {
        13: '................KOOOOoooOOOOOOOOOOOOOOOOOOooOOOK.....KKKKK',
        14: '................KOOOoooOOOOOOOOYYOOOOOOOOOooOOOK....KWBBBWKK',
        15: '................KOOOooOOOOOOOYYYYYOOOOOOOOooOOOK....KBBBBBBWK',
        16: '................KOOOooKYYYKYYYKYYYKYYYKYYYooOOOK...KWBBBBBBBBK',
        17: '................KOOoOoOYYYYYYYYYYYYYYYYYYYoOoOOK....KBBBBBBBBWK',
        18: '................KooOOOOOYYYYKYYYKYYYKYYYYKOOOooK....KBBBBBBBBBK',
        19: '.................KooOOOOOKYYOYYYOYYYOYYYKOOOooK....KbKKKKKKKBBK',
        20: '.................KoooooOOOOOOOOOOOOOOOOOooooooK....KhhhK....KBWK',
        21: '...................oooooOOOOOOOOOOOOOOOOooooo.....KbbbK.....KBWK',
        22: '...................KKKKKKKKKKKKKKKKKKKKKKKKKK....KbbbK.......KWK',
        23: '....................KKKhHHHHHHHHHHHHHHHHHKK.....KbbbK........KWK',
        24: '.............KHHHHHHKKhhHHHHHHHHHHHHHHHHHHKK....KhhhK........KWK',
        25: '............KHHHHHHHKhhhHHHHHHHHHHHHHHHHHHHK...KbbbK.........KWK',
        26: '............KHHHHHHHKhhhHHHHHHHHHHHHHHHHHHKHHHHHKbKOK........KK',
        27: '............KHHHHHHHKhhhHHHHHHHHHHHHHHHHHHKKHHHHHKOOK........KK',
        28: '............KHHHHHHhKhhhHHHHHHHHHHHHHHHHHHKKKKKKKKKKK........KK',
        29: '............KHHHHHhhKhhhHHHHHHHHHHHHHHHHHHKKKHHHhKK..........KK',
        30: '............KHHHHHhhKhhhHHHHHHHHHHHHHHHHHHKKHHHHhhKK.........KK',
        31: '............KHHHHHhhKhhhHHHHHHHHHHHHHHHHHHKHHHHHhhhK',
        32: '............KHHHHHhhKhhhHHhhhhhhhhhhhhHHHHKHHHHHhhhK',
        33: '............KHHHHHhhKhhhHHhhhhhhhhhhhhHHHHKHHHHHhhK',
        34: '............KOOOOOOOKhhhHHHHHHHHHHHHHHHHHHHK',
        35: '.............KOOOOOKKhhHHHHHHHHHHHHHHHHHHHHK',
        36: '.............KKKKKKKHHHHHHHHHHHHHHHHHHHHHHHK',
        37: '.................KKHHHHHHHHHHHHHHHHHHHHHHHHK',
        38: '................KKPPPPPPPPPPPPPPPPPPPPPPPPPK',
        39: '................KPPPPPPPPPPPPPPPPPPPPPPPPPPK',
        40: '................KPPPPPPPPPPPPPPPPPPPPPPPPPPK',
        41: '.................KPPPPPPPPPKPKKPPPPPPPPPPPK',
        42: '.................KPPPPPPPPPPK..KPPPPPPPPPPK',
        43: '..................KPPPPPPPPK....KPPPPPPPPK',
        44: '..................KPPPPPPPPK....KPPPPPPPPK',
        45: '..................KPPPPPPPPK....KPPPPPPPPK',
        46: '..................KPPPPPPPPK....KPPPPPPPPK',
        47: '..................KPPPPPPPPK....KPPPPPPPPK',
        48: '..................KPPPPPPPPK....KPPPPPPPPK',
        49: '..................KPPPPPPPPK....KPPPPPPPPK',
        50: '..................KPPPPPPPPK....KPPPPPPPPK',
        51: '..................KPPPPPPPPK....KPPPPPPPPK',
        52: '..................KPPPPPPPPK....KPPPPPPPPK',
        53: '..................KPPPPPPPPK....KPPPPPPPPK',
        54: '..................KPPPPPPPPK....KPPPPPPPPK',
    },
};

// --- Kaze: ninja cibernético com katana ---
pixelCharacters.kaze = {
    size: 64,
    palette: {
        K: OUTLINE,
        M: '#9aa6b8', m: '#5f6a80',                          // capacete
        V: '#39ff88',                                        // visor
        D: '#2b2f3d', d: '#1c1f29',                          // traje / partes robóticas
        S: '#f2b98f', s: '#c47f5a',                          // pele
        O: '#ff8a1f',                                        // luzes
        A: '#7fffd4', a: '#3fd6b0', b: '#3a2d52',            // katana
        T: '#c9cfd9',                                        // arma
        W: '#eafff8',                                        // arma
    },
    idle: [
        '.........................KKKKKKKKKKKK',
        '.......................KKMMMMMMMMMMMMKK',
        '.......................MMMMMMMMMMMMMMMM',
        '.....................KMMMMMMMMMMMMMMMMMMK',
        '.....................KMMMMMMMMMMMMMMMMMMM',
        '....................KMMMMMMMMMMMMMMMMMMMMMK',
        '....................KmmMMMMMMMMMMMMMMMMMMMK',
        '....................KmmmMMMMMMMMMMMMMMMMMMMK',
        '....................KmmmMMVVVVVVVVVVVVVVVVVK',
        '....................KmmmMMVVVVVVVVVVVVVVVVVK',
        '....................KmmmMMMMMMMMMMMMMMMMMMMK',
        '....................KmmmmMMMMMMMMMMMMMMMMMK',
        '....................KmmmmMMMMMMMKMMMMMMMMMK',
        '.....................KmmmmmMMMMMmMMMMMMMM',
        '.....................KmmmmmmmmmmmmmmmmKKK',
        '.......................mmmmmmmmmmmmmmmK',
        '.......................KKdddddddddddKKK',
        '........................DdddddddddddDD',
        '...............KKKKKKDDDDDDDDDDDDDDDDDDDKK..KKKKK',
        '.............KKSSSsKKDDDDDDDDDDDDDDDDDDDDKKKKDDDDKK',
        '.............KSSSSssKSSSSSSSSDDDDDDDDDDDDDKKDDDDDDK',
        '............KSSSSSssKSSSSSSSSSDDDDDDDDDDDDKDDDDDDDDK',
        '............KSSSSSssKSSSSSSSSSDDOODDDDDDDDKDDDDDDddK',
        '............KSSSSSssKSSSSSSSSSDDOODDDDDDDDKDDDDDdddK',
        '............KSSSSSssKSSSSSssSSDDDDDDDDDDDDKDDDDDdddK',
        '............KSSSSSssKSSSSSssSSDDDDDDDDDDDDKDDDDDdddK',
        '............KSSSSSssKSSSSSSSSSDDOODDDDDDDDKDDDDDdddK',
        '............KSSSSSssKSSSSSSSSSDDOODDDDDDDDKDDDDDdddK',
        '............KSSSSSssKsssSSSSSSDDDDDDDDDDDDKDDDDDdddK',
        '............KSSSSSSsKsssSSSSSSDDDDDDDDDDDDKDDKKKDddK',
        '............KSSSSSSSKSSSSSSSSSDDOODDDDDDDDKDKTbbKDDK',
        '............KKSSSSSKKSSSSSSSSSDDOODDDDDDDDKDKbbTKDK',
        '.............KKKKKKKKdddddddddddddddddddddKKKKTbKKK',
        '.................KKDDdddddddddddddddddddddK..KbbK',
        '................KKDDDDDDDDDDDDDDDDDDDDDDDDK..KbTK',
        '................KDDDDDDDDDDDDDDDDDDDDDDDDDK..KTbK',
        '................KDDDDDDDDDDDDDDDDDDDDDDDDDK..KbbK',
        '................KDDDDDDDDDDDDDDDDDDDDDDDDDK..KbTK',
        '................KDDDDDDDDDDDDDDDDDDDDDDDDDK..KKKKK',
        '.................KDDDDDDDDDKDKKDDDDDDDDDDKKKKKWaaKKK',
        '.................KKSSSSSssKKK..KDDDDDDDddK.KKWAAaaKK',
        '..................KSSSSSsssK....KDDDDDdddK..KWAAaaK',
        '..................KSSSSSsssK....KDDDDDdddK..KWAAaaK',
        '..................KSSSSSsssK....KDDDDDdddK...KAAaaK',
        '..................KSSSSSsssK....KDDDDDdddK...KAAaaK',
        '..................KSSSSSsssK....KDDDDDdddK...KWAaaK',
        '..................KSSSSSsssK....KDDDDDdddK...KWAaaK',
        '..................KSSSSSsssK....KDDDDDdddK...KWAaaK',
        '..................KSSSSSsssK....KDDDDDdddK....KAaaK',
        '..................KSSSSSsssK....KDDDDDdddK....KWAaK',
        '..................KSSSSSsssK....KDDDDDdddK....KWAaK',
        '..................KSSSSSsssK....KDDDDDdddK....KWAaK',
        '..................KSSSSSsssK....KDDDDDdddK.....KAaK',
        '..................KSSSSSsssK....KDDDDDdddK.....KWaaK',
        '..................KSSSSSsssK....KDDDDDdddK.....KWaaK',
        '..................KSSSSSsssK....KDDDDDdddK.....KWAaK',
        '..................KSSSSSsssK....KDDDDDdddK......KWaK',
        '..................KSSSSSsssK....KDDDDDdddK......KWaK',
        '..................KSSSSSsssK....KDDDDDdddK......KWaK',
        '.................KdSSSSSsssK...KdDDDDdddddK......KWK',
        '.................KdddddddddK...KddddddddddK......KWaK',
        '................KddddddddKKK..KddddddddddddK......KaK',
        '................KKdddddddK....KKddddddddddKK......KaK',
        '.................KKKKKKKKK.....KKKKKKKKKKKK.......KKK',
    ],
    attack: {
        0: '.........................KKKKKKKKKKKK.........................KK',
        1: '.......................KKMMMMMMMMMMMMKK......................KWK',
        2: '.......................MMMMMMMMMMMMMMMM......................KaK',
        3: '.....................KMMMMMMMMMMMMMMMMMMK...................KWaK',
        4: '.....................KMMMMMMMMMMMMMMMMMMM...................KWaK',
        5: '....................KMMMMMMMMMMMMMMMMMMMMMK................KWaK',
        6: '....................KmmMMMMMMMMMMMMMMMMMMMK................KWaK',
        7: '....................KmmmMMMMMMMMMMMMMMMMMMMK..............KWAaK',
        8: '....................KmmmMMVVVVVVVVVVVVVVVVVK..............KWaK',
        9: '....................KmmmMMVVVVVVVVVVVVVVVVVK.............KWAaK',
        10: '....................KmmmMMMMMMMMMMMMMMMMMMMK.............KWaaK',
        11: '....................KmmmmMMMMMMMMMMMMMMMMMK.............KWAaaK',
        12: '....................KmmmmMMMMMMMKMMMMMMMMMK.............KWAaK',
        13: '.....................KmmmmmMMMMMmMMMMMMMM..............KWAaaK',
        14: '.....................KmmmmmmmmmmmmmmmmKKK..............KWAaaK',
        15: '.......................mmmmmmmmmmmmmmmK...............KWAaaK',
        16: '.......................KKdddddddddddKKK...............KAAaaK',
        17: '........................DdddddddddddDD...............KWAAaaK',
        18: '...............KKKKKKDDDDDDDDDDDDDDDDDDDKK.KKKKKK..KKKAAaaK',
        19: '.............KKSSSsKKDDDDDDDDDDDDDDDDDDDDKKKDDDDDKKKKWAAaaK',
        20: '.............KSSSSssKSSSSSSSSDDDDDDDDDDDDDKDDDDDDDKKKWAaaaK',
        21: '............KSSSSSssKSSSSSSSSSDDDDDDDDDDDDKDDDDDDDKKKWAaaK',
        22: '............KSSSSSssKSSSSSSSSSDDOODDDDDDDDKKKKKKKKKbbKaaaK',
        23: '............KSSSSSssKSSSSSSSSSDDOODDDDDDDDKKDDDDDKbbTbKKK',
        24: '............KSSSSSssKSSSSSssSSDDDDDDDDDDDDKDDDDDKbbTbK.KTK',
        25: '............KSSSSSssKSSSSSssSSDDDDDDDDDDDDKDDDDKbbTbK...K',
        26: '............KSSSSSssKSSSSSSSSSDDOODDDDDDDDKKKDDDKTKK',
        27: '............KSSSSSssKSSSSSSSSSDDOODDDDDDDDK.KKKKKKK',
        28: '............KSSSSSssKsssSSSSSSDDDDDDDDDDDDKK',
        29: '............KSSSSSSsKsssSSSSSSDDDDDDDDDDDDDK',
        30: '............KSSSSSSSKSSSSSSSSSDDOODDDDDDDDDK',
        31: '............KKSSSSSKKSSSSSSSSSDDOODDDDDDDDDK',
        32: '.............KKKKKKKKddddddddddddddddddddddK',
        33: '.................KKDDddddddddddddddddddddddK',
        34: '................KKDDDDDDDDDDDDDDDDDDDDDDDDDK',
        35: '................KDDDDDDDDDDDDDDDDDDDDDDDDDDK',
        36: '................KDDDDDDDDDDDDDDDDDDDDDDDDDDK',
        37: '................KDDDDDDDDDDDDDDDDDDDDDDDDDDK',
        38: '................KDDDDDDDDDDDDDDDDDDDDDDDDDDK',
        39: '.................KDDDDDDDDDKDKKDDDDDDDDDDDK',
        40: '.................KKSSSSSssKKK..KDDDDDDDdKKK',
        41: '..................KSSSSSsssK....KDDDDDdddK',
        42: '..................KSSSSSsssK....KDDDDDdddK',
        43: '..................KSSSSSsssK....KDDDDDdddK',
        44: '..................KSSSSSsssK....KDDDDDdddK',
        45: '..................KSSSSSsssK....KDDDDDdddK',
        46: '..................KSSSSSsssK....KDDDDDdddK',
        47: '..................KSSSSSsssK....KDDDDDdddK',
        48: '..................KSSSSSsssK....KDDDDDdddK',
        49: '..................KSSSSSsssK....KDDDDDdddK',
        50: '..................KSSSSSsssK....KDDDDDdddK',
        51: '..................KSSSSSsssK....KDDDDDdddK',
        52: '..................KSSSSSsssK....KDDDDDdddK',
        53: '..................KSSSSSsssK....KDDDDDdddK',
        54: '..................KSSSSSsssK....KDDDDDdddK',
        55: '..................KSSSSSsssK....KDDDDDdddK',
        56: '..................KSSSSSsssK....KDDDDDdddK',
        57: '..................KSSSSSsssK....KDDDDDdddK',
        58: '..................KSSSSSsssK....KDDDDDdddK',
        59: '.................KdSSSSSsssK...KdDDDDdddddK',
        60: '.................KdddddddddK...KddddddddddK',
        61: '................KddddddddKKK..KddddddddddddK',
        62: '................KKdddddddK....KKddddddddddKK',
        63: '.................KKKKKKKKK.....KKKKKKKKKKKK',
    },
};

// --- Kenji: lutador de quimono ---
pixelCharacters.kenji = {
    palette: {
        K: OUTLINE,
        S: '#f2b98f', s: '#c47f5a',                          // pele
        N: '#2a1a1a',                                        // cabelo
        R: '#e8213a', r: '#a3123f',                          // faixa
        W: '#f4f4f8', w: '#c9c9d9',                          // quimono
        k: '#2a2440',                                        // faixa da cintura
    },
    idle: [
        '............KKKKKKK',
        '...........KNNNNNNNK',
        '..........KNNNNNNNNNK',
        '.......KRRKRRRRRRRRRRK',
        '........KrKSSSSSSSSSK',
        '..........KSSSSSSKSSK',
        '..........KsSSSSSSSSSK',
        '..........KsSSSSSKKKSK',
        '...........KsSSSSSSSK',
        '............KsSSSSK',
        '.......KKKKWWWSSSWWWKKKKK',
        '......KwWWKwWWWSSWWWWKWWWK',
        '......KwWWKwWWWWSWWWWKWWwK',
        '......KwWWKwWWWWWWWWWKWWwK',
        '......KwWWKwWWWWWWWWWKWwwK',
        '......KSSSKkkkkkkkkkkKSSSK',
        '......KSSsKwWWWWkWWWWKSSsK',
        '......KKKKKwWWWWWWWWWKKKKK',
        '........KwWWWWWWWWWWWK',
        '........KwWWWWWwWWWWWK',
        '........KwWWWWKKWWWWwK',
        '.........KwWWK..KWWwK',
        '.........KwWWK..KWWwK',
        '.........KwWWK..KWWwK',
        '.........KwWWK..KWWwK',
        '.........KwWWK..KWWwK',
        '.........KwWWK..KWWwK',
        '.........KwWWK..KWWwK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '........KSSSSK.KSSSSSK',
        '........KKKKKK.KKKKKKK',
    ],
    attack: {
        11: '......KwWWKwWWWSSWWWWKKKKKKKKK',
        12: '......KwWWKwWWWWSWWWWKWWWWWSSSK',
        13: '......KwWWKwWWWWWWWWWKwwwwwSSSK',
        14: '......KwWWKwWWWWWWWWWKKKKKKKKK',
        15: '......KSSSKkkkkkkkkkkK',
        16: '......KSSsKwWWWWkWWWWK',
        17: '......KKKKKwWWWWWWWWWK',
    },
};

// --- El Craque: atacante de futebol ---
pixelCharacters.craque = {
    palette: {
        K: OUTLINE,
        S: '#f2b98f', s: '#c47f5a',                          // pele
        N: '#1a1012',                                        // cabelo
        W: '#f4f4f8', w: '#c9c9d9',                          // camisa e meião
        U: '#2f6bff', u: '#1b3a99',                          // rosa e short
        D: '#111111',                                        // chuteira
    },
    idle: [
        '............KKKKKKK',
        '...........KNNNNNNNK',
        '..........KNNNNNNNNNK',
        '..........KNNNNNNNNNNK',
        '..........KNSSSSSSSSK',
        '..........KNSSSSSKSSK',
        '..........KsSSSSSSSSSK',
        '..........KsSSSSSKKKSK',
        '...........KsSSSSSSSK',
        '............KsSSSSK',
        '.......KKKKWWWWWWWWWKKKKK',
        '......KwWWKwWWWWWWWWWKWWWK',
        '......KwWWKwWUUWWWWWWKWWwK',
        '......KSSsKwWUuWWWWWWKSSsK',
        '......KSSsKwWWWWWWWWWKSSsK',
        '......KSSsKwWWWWWWWWWKSSsK',
        '......KSSSKwWWWWWWWWWKSSSK',
        '.......KKKUUUUUUUUUUUK',
        '........KUUUUUUUUUUUUK',
        '........KUUUUUKKUUUUuK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KWWwK..KWWwK',
        '.........KWWwK..KWWwK',
        '.........KWWwK..KWWwK',
        '.........KWWwK..KWWwK',
        '.........KWWwK..KWWwK',
        '.........KWWwK..KWWwK',
        '........KDDDDK.KDDDDDK',
        '........KKKKKK.KKKKKKK',
    ],
    // Chute: a perna da frente sobe esticada
    attack: {
        20: '.........KSSsK..KSSSSSSWWWWDDK',
        21: '.........KSSsK..KsssssswwwwDDDK',
        22: '.........KSSsK..KKKKKKKKKKKKKKK',
        23: '.........KSSsK',
        24: '.........KWWwK',
        25: '.........KWWwK',
        26: '.........KWWwK',
        27: '.........KWWwK',
        28: '.........KWWwK',
        29: '.........KWWwK',
        30: '........KDDDDK',
        31: '........KKKKKK',
    },
};

// --- Akane: a Lâmina Carmesim ---
pixelCharacters.akane = {
    size: 64,
    palette: {
        K: OUTLINE,
        A: '#d4a64a', a: '#8f6a2a', l: '#ffe08a',            // armadura dourada
        R: '#e8344a', r: '#a01c32',                          // cabelo
        S: '#f2b98f', s: '#c47f5a',                          // pele
        t: '#5a3a2a', T: '#7a3040',                          // cinto e saia
        B: '#e2e8f0',                                        // espada
        b: '#9aa4b8',                                        // arma
    },
    idle: [
        '.........................KKKKKKKKKKKK',
        '.......................KKAAAAAllAAAAAKK',
        '.................KK....AAAAAAAllAAAAAAA',
        '...............KKlaK..KAAAAAAAllAAAAAAAAK',
        '...............lllaaKKAAAAAAAAAAAAAAAAAAA',
        '.............KlllaaaKAAAAAAAAAAAAAAAAAAAAAK',
        '............KllllaaaKAAAAAAAAAAAAAAAAAAAAAAK',
        '............KlllaaaKKAAAAAAAAAAAAAAAAAAAAAAK',
        '.............KKaaaaKKAAAKKKKKKKKKKKKKAAAAAK',
        '...............KaaKRRAAAAAAAAAAAAAAAAAAAAK',
        '................KKRRRRAAAAAAAAAAAAAAAAAAAK',
        '................KRRRRRAAAAAAAAAAAAAAAAAAK',
        '...............KRRRRRRKAAAAAAAAAAAAAAAAAK',
        '.............KRRRRRRRRRKAAAAAAAAAAAAAAA',
        '.............RRRRRrrRRRRKSSSSSSSSSSSKKK',
        '...........KRRRRRrrrRRRRKKSSSSSSSSSSK',
        '...........RRRRRrrrRRRRRKKKKKKKKKKKKK',
        '..........KRRRRRrrRRRRRRllAAAAAAAAAA',
        '.......KRRRKRKKKKKKAAAAAllAAAAAAAAAAAAKKKK..KKK',
        '......KRRRRRKKKSSSSKAAAAllAAAAAAAAAAAAAAAKKKKAAK',
        '......KRRRRrKKSSSSSSAAAAAAAAAAAAAAAAAAAAAAKKAAAAAAK',
        '......KRRRrrKSSSSSSSKAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAK',
        '......KRRRrrKSSSSSSsKAAAAallAAAAAAAAllaAAAKAAAllAAAK',
        '......KRRRRrKSSSSSssKAAAaallAAAAAAAAllaaAAKAAAllAAAK',
        '......KRRRRRKSSSSSssKAAAaaAAAAAAAAAAAAaaAAKAAAaaAAAK',
        '......KRRRRRKSSSSSssKAAaaaAAAAAAAAAAAAaaaAKAAAaaAAAK',
        '......KrrrRRKSSSSSssKaaAaAAAAAAAAAAAAAAaAaKAAAaaAAAK',
        '......KrrrrRKSSSSSSsKaaaAAAAAAAAAAAAAAAAaaKAAAaaAAAK',
        '......KRRrRrKSSSSSSSKtttttttttttttttttttttKAAAAAAAAK',
        '.....KRRRRrrKKSSSSSKKtttttttttttttttttttttKAAKKKAAAK',
        '.....KRRRRrrKKKSKKKTTTTTTTTTTTTTTTTTTTTTTTKaaKKKaaaK',
        '....KRRRRRRrKKKKKKTTTTTTTTTTTTTTTTTTTTTTTTKaaKttKaK',
        '....KrrrRRRRRK..KKTTTTTTTTTTTTTTTTTTTTTTTTKKKKttK',
        '....KrrrRRRRRK..KTTTTTTTTTTTTTTTTTTTTTTTTTK..KttK',
        '....KRRRRRRrrK..KTTTTTTTTTrrTTTTTTTTTTTTTTK..KttK',
        '....KRRRRRrrK...KTTTTTTTTTrrTTTTTTTTTTTTTTK..KttK',
        '....KRRRRRKKK...KTTTTTTTTTTTTTTTTTTTTTTTTTK..KttK',
        '.....KRRRRK......KTTTTTTTTTKTKKTTTTTTTTTTKK..KttK',
        '.....KKRRKK......KKAAAAAaaKKK..KKAAAAAaaKKKKKKKKKKKKK',
        '.......KK.........KAAAAAaaaK....KAAAAAaaKlllKRBBBKlllK',
        '..................KAAAAAaaaK....KAAAAAaaKKKKKBBBBKKKK',
        '..................KAAAAAaaaK....KAAAAAaaaK.KRBBBBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK..KBBBBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK..KBBBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK..KBBBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK..KBBBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK..KRBBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK..KRBBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KBbBK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KBbBK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KBbBK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KBbBK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KRbBK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KRBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK....KBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK....KBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK....KBBK',
        '..................KAAAAAaaaK....KAAAAAaaaK....KBBK',
        '..................KAAAAlaaaK....KAAAAlaaaK....KRBK',
        '.................KaAAAlaaaaK...KaAAAlaaaaaK...KRBK',
        '.................KaaaaaaaaaK...KaaaaaaaaaaK....KBK',
        '................KaaaaaaaaKKK..KaaaaaaaaaaaaK...KK',
        '................KKaaaaaaaK....KKaaaaaaaaaaKK...KK',
        '.................KKKKKKKKK.....KKKKKKKKKKKK....KK',
    ],
    attack: {
        1: '.......................KKAAAAAllAAAAAKK.......................KK',
        2: '.................KK....AAAAAAAllAAAAAAA......................KRK',
        3: '...............KKlaK..KAAAAAAAllAAAAAAAAK....................KBK',
        4: '...............lllaaKKAAAAAAAAAAAAAAAAAAA...................KRBK',
        5: '.............KlllaaaKAAAAAAAAAAAAAAAAAAAAAK.................KBK',
        6: '............KllllaaaKAAAAAAAAAAAAAAAAAAAAAAK...............KRBK',
        7: '............KlllaaaKKAAAAAAAAAAAAAAAAAAAAAAK...............KBBK',
        8: '.............KKaaaaKKAAAKKKKKKKKKKKKKAAAAAK...............KBBK',
        9: '...............KaaKRRAAAAAAAAAAAAAAAAAAAAK...............KRBBK',
        10: '................KKRRRRAAAAAAAAAAAAAAAAAAAK...............KBbBK',
        11: '................KRRRRRAAAAAAAAAAAAAAAAAAK...............KRBBK',
        12: '...............KRRRRRRKAAAAAAAAAAAAAAAAAK...............KBbBK',
        13: '.............KRRRRRRRRRKAAAAAAAAAAAAAAA................KRBBBK',
        14: '.............RRRRRrrRRRRKSSSSSSSSSSSKKK...............KRBbBBK',
        15: '...........KRRRRRrrrRRRRKKSSSSSSSSSSK.................KBBBBK',
        16: '...........RRRRRrrrRRRRRKKKKKKKKKKKKK................KRBBBBK',
        17: '..........KRRRRRrrRRRRRRllAAAAAAAAAA.............KK..KBBBBBK',
        18: '.......KRRRKRKKKKKKAAAAAllAAAAAAAAAAAAKKKK.KKKK..KlKKRBBBBK',
        19: '......KRRRRRKKKSSSSKAAAAllAAAAAAAAAAAAAAAKKKAAAK.KlKRBBbBBK',
        20: '......KRRRRrKKSSSSSSAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAKKRBBBBBK',
        21: '......KRRRrrKSSSSSSSKAAAAAAAAAAAAAAAAAAAAAKAAAAAAKKKRBbBBK',
        22: '......KRRRrrKSSSSSSsKAAAAallAAAAAAAAllaAAAKKKKKKKKKtKBBBBK',
        23: '......KRRRRrKSSSSSssKAAAaallAAAAAAAAllaaAAKKAAAAAKttKKKKK',
        24: '......KRRRRRKSSSSSssKAAAaaAAAAAAAAAAAAaaAAKAAAAAKttttKKllK',
        25: '......KRRRRRKSSSSSssKAAaaaAAAAAAAAAAAAaaaAKAAAAKtttKK..KlK',
        26: '......KrrrRRKSSSSSssKaaAaAAAAAAAAAAAAAAaAaKKKAAAKtKaK...K',
        27: '......KrrrrRKSSSSSSsKaaaAAAAAAAAAAAAAAAAaaK.KKKKKKKKK',
        28: '......KRRrRrKSSSSSSSKtttttttttttttttttttttKK',
        29: '.....KRRRRrrKKSSSSSKKttttttttttttttttttttttK',
        30: '.....KRRRRrrKKKSKKKTTTTTTTTTTTTTTTTTTTTTTTTK',
        31: '....KRRRRRRrKKKKKKTTTTTTTTTTTTTTTTTTTTTTTTTK',
        32: '....KrrrRRRRRK..KKTTTTTTTTTTTTTTTTTTTTTTTTTK',
        33: '....KrrrRRRRRK..KTTTTTTTTTTTTTTTTTTTTTTTTTTK',
        34: '....KRRRRRRrrK..KTTTTTTTTTrrTTTTTTTTTTTTTTTK',
        35: '....KRRRRRrrK...KTTTTTTTTTrrTTTTTTTTTTTTTTTK',
        36: '....KRRRRRKKK...KTTTTTTTTTTTTTTTTTTTTTTTTTTK',
        37: '.....KRRRRK......KTTTTTTTTTKTKKTTTTTTTTTTTK',
        38: '.....KKRRKK......KKAAAAAaaKKK..KKAAAAAaaKKK',
        39: '.......KK.........KAAAAAaaaK....KAAAAAaaaK',
        40: '..................KAAAAAaaaK....KAAAAAaaaK',
        41: '..................KAAAAAaaaK....KAAAAAaaaK',
        42: '..................KAAAAAaaaK....KAAAAAaaaK',
        43: '..................KAAAAAaaaK....KAAAAAaaaK',
        44: '..................KAAAAAaaaK....KAAAAAaaaK',
        45: '..................KAAAAAaaaK....KAAAAAaaaK',
        46: '..................KAAAAAaaaK....KAAAAAaaaK',
        47: '..................KAAAAAaaaK....KAAAAAaaaK',
        48: '..................KAAAAAaaaK....KAAAAAaaaK',
        49: '..................KAAAAAaaaK....KAAAAAaaaK',
        50: '..................KAAAAAaaaK....KAAAAAaaaK',
        51: '..................KAAAAAaaaK....KAAAAAaaaK',
        52: '..................KAAAAAaaaK....KAAAAAaaaK',
        53: '..................KAAAAAaaaK....KAAAAAaaaK',
        54: '..................KAAAAAaaaK....KAAAAAaaaK',
        55: '..................KAAAAAaaaK....KAAAAAaaaK',
        56: '..................KAAAAAaaaK....KAAAAAaaaK',
        57: '..................KAAAAAaaaK....KAAAAAaaaK',
        58: '..................KAAAAlaaaK....KAAAAlaaaK',
        59: '.................KaAAAlaaaaK...KaAAAlaaaaaK',
        60: '.................KaaaaaaaaaK...KaaaaaaaaaaK',
        61: '................KaaaaaaaaKKK..KaaaaaaaaaaaaK',
        62: '................KKaaaaaaaK....KKaaaaaaaaaaKK',
        63: '.................KKKKKKKKK.....KKKKKKKKKKKK',
    },
};

// --- Fenris: a fera das sombras ---
pixelCharacters.fenris = {
    size: 64,
    palette: {
        K: OUTLINE,
        D: '#2a2533', d: '#18141f',                          // armadura
        M: '#f0ece4', m: '#b8b0a8',                          // juba
        E: '#ff2a2a',                                        // olho
        G: '#8f6a2a',                                        // detalhes dourados
        B: '#ff2a3a', b: '#a0101e',                          // lâmina
        r: '#ff8a8a',                                        // arma
    },
    idle: [
        '.....................KK....KK....KK',
        '...................KKMMK..KMMK..KMMKK',
        '...................MMMMMKKMMMMKKMMMMM',
        '.................KMMMMMMMMMMMMMMMMMMMMK',
        '.................MMMMMMMMMMMMMMMMMMMMMM',
        '...............KMMMMMMMMMMMMMMMMMMMMMMMMK',
        '...............MMMMMmmMMMMMMMMMMMMMMMMMMK',
        '.............KMMMMMmmmMMMMMMMMMMMMMMMMMMMK',
        '.............KMMMMmmmMMKDDDDDDDDDDDMMMMMMK',
        '............KMMMMmmmMMKDDDDDDDDDDDDDDMMMMK',
        '............KMMMmmmMMMKDDDDDDDDDEEDDDMMMMK',
        '...........KMMMMmmMMMMKDDDDDDDDDEEDDDDMKKK',
        '...........KMMMMmmMMMMMddDDDDDDDDDDDDDKK',
        '..........KMMMMmmmMMMMMMddDDDDDDDDDDDDMKKK',
        '..........KMMMmmmMMMMMMMMMKKKKKKKKKMMMMMMK',
        '.........KMMMMmmMMMMMMMMMMMMMMMMMMMMMMMMMMK',
        '.........KMMMMmmMMMMmmMMMMMMMMMMMMMMMMMMMMM',
        '........KMMMMmmmMMMMmmMMMMMMMMMMMMMMMMMMMMMMK',
        '........KMMMmmmMMMMMmmMMMMMMMMMMMMMMMMmmMMMMK',
        '........KMMMmmMMMMMMmmMMMMMMMMMMMMMMMMmmMMMMMK',
        '........KMMMmmDDDDDDKdddDDDDDDDDDDDDDDDDDDKKDDDDDDK',
        '........KMMMmmDDDDDDKdddDDDDDDDDDDDDDDDDDDKDDDDDDDDK',
        '........KMMMmmDDddDDKdddDDGGGGGGGGGGGGDDDDKDDDddDDDK',
        '........KMMmMmDDddDDKdddDDGGGGGGGGGGGGDDDDKDDDddDDDK',
        '........KmmmMMDDddDDKdddDDDDDDDDDDDDDDDDDDKDDDddDDDK',
        '........KmmmMMDDddDDKdddDDDDDDDDDDDDDDDDDDKDDDddDDDK',
        '........KMMmmmDDddDDKdddDDDDDDDDDDDDDDDDDDKDDDddDDDK',
        '........KMMMmmDDddDDKdddDDDDDDDDDDDDDDDDDDKDDDddDDDK',
        '........KMMMMMDDddDDKdddDDDDGGGGGGGGDDDDDDKDDDddDDDK',
        '........KMMMMMDDddDDKdddDDDDGGGGGGGGDDDDDDKDDKKKDDDK',
        '........KmmMMMDDDDDDKdddDDDDDDDDDDDDDDDDDDKDDKddKDDK',
        '........KKmmMMDDDDDDKdddDDDDDDDDDDDDDDDDDDKDDKddKDDK',
        '.........KKmMdddddddKdddDDDDDDDDDDDDDDDDDDKddKddKddK',
        '..........KKKKdddddKKddddDDDDDDDDDDDDDDDDDKKdKddKdK',
        '.............KKKKKddddddddddddddddddddddddKKKKddKKK',
        '.................KKdddddddddddddddddddddddK..KKKK',
        '................KKDDDDDDDDDDDDDDDDDDDDDDKKKKKrBbbKKKKK',
        '................KDDDDDDDDDDDDDDDDDDDDDDKGGGKBBBbbbKGGGK',
        '................KDDDDDDDDDDDDDDDDDDDDDDKGGKrBBBbbbbKGGK',
        '.................KDDDDDDDDDKDKKDDDDDDDDdKKKBBBBbbbbKKK',
        '.................KDDDDDDDdKKK..KDDDDDDDddKKBBBBbbbbK',
        '..................KDDDDDdddK....KDDDDDdddKKrBBBbbbbK',
        '..................KDDDDDdddK....KDDDDDdddK.KBBBbbbbK',
        '..................KDDDDDdddK....KDDDDDdddK.KBBBbbbbK',
        '..................KDDDDDdddK....KDDDDDdddK.KBBBbbbbK',
        '..................KDDDDDdddK....KDDDDDdddK.KrBBBbbbK',
        '..................KDDDDDdddK....KDDDDDdddK..KBBBbbbK',
        '..................KDDDDDdddK....KDDDDDdddK..KBBBbbbK',
        '..................KDDDDDdddK....KDDDDDdddK..KBBBbbK',
        '..................KDDDDDdddK....KDDDDDdddK..KrBBbbK',
        '..................KDDDDDdddK....KDDDDDdddK...KBBbbK',
        '..................KDDDDDdddK....KDDDDDdddK...KBBbbK',
        '..................KDDDDDdddK....KDDDDDdddK...KrBbbbK',
        '..................KDDDDDdddK....KDDDDDdddK....KBBbbK',
        '..................KDDDDDdddK....KDDDDDdddK....KBBbbK',
        '..................KDDDDDdddK....KDDDDDdddK....KBBbbK',
        '..................KDDDDDdddK....KDDDDDdddK.....KBbbK',
        '..................KDDDDDdddK....KDDDDDdddK.....KBbbK',
        '..................KDDDDDdddK....KDDDDDdddK.....KBbbK',
        '.................KdDDDDddddK...KdDDDDdddddK.....KBbK',
        '.................KdddddddddK...KddddddddddK.....KBbK',
        '................KddddddddKKK..KddddddddddddK....KBbK',
        '................KKdddddddK....KKddddddddddKK.....KbK',
        '.................KKKKKKKKK.....KKKKKKKKKKKK......KKK',
    ],
    attack: {
        0: '.....................KK....KK....KK...........................KK',
        1: '...................KKMMK..KMMK..KMMKK........................KrK',
        2: '...................MMMMMKKMMMMKKMMMMM........................KBK',
        3: '.................KMMMMMMMMMMMMMMMMMMMMK.....................KBbK',
        4: '.................MMMMMMMMMMMMMMMMMMMMMM....................KrBbK',
        5: '...............KMMMMMMMMMMMMMMMMMMMMMMMMK..................KBbK',
        6: '...............MMMMMmmMMMMMMMMMMMMMMMMMMK.................KrBbK',
        7: '.............KMMMMMmmmMMMMMMMMMMMMMMMMMMMK...............KrBbbK',
        8: '.............KMMMMmmmMMKDDDDDDDDDDDMMMMMMK...............KBBbbK',
        9: '............KMMMMmmmMMKDDDDDDDDDDDDDDMMMMK..............KrBbbK',
        10: '............KMMMmmmMMMKDDDDDDDDDEEDDDMMMMK..............KBBbbK',
        11: '...........KMMMMmmMMMMKDDDDDDDDDEEDDDDMKKK.............KBBBbbK',
        12: '...........KMMMMmmMMMMMddDDDDDDDDDDDDDKK..............KrBBbbK',
        13: '..........KMMMMmmmMMMMMMddDDDDDDDDDDDDMKKK............KBBBbbK',
        14: '..........KMMMmmmMMMMMMMMMKKKKKKKKKMMMMMMK...........KrBBbbbK',
        15: '.........KMMMMmmMMMMMMMMMMMMMMMMMMMMMMMMMMK..........KBBBbbbK',
        16: '.........KMMMMmmMMMMmmMMMMMMMMMMMMMMMMMMMMM.........KBBBbbbK',
        17: '........KMMMMmmmMMMMmmMMMMMMMMMMMMMMMMMMMMMMK...KKKKrBBBbbbK',
        18: '........KMMMmmmMMMMMmmMMMMMMMMMMMMMMMMmmMMMMK...KGGKBBBBbbbK',
        19: '........KMMMmmMMMMMMmmMMMMMMMMMMMMMMMMmmMMMMDK...KKrBBBbbbbK',
        20: '........KMMMmmDDDDDDKdddDDDDDDDDDDDDDDDDDDKDDDDDDDKBBBBbbbK',
        21: '........KMMMmmDDDDDDKdddDDDDDDDDDDDDDDDDDDKDDDDDDKKBBBbbbbK',
        22: '........KMMMmmDDddDDKdddDDGGGGGGGGGGGGDDDDKKKKKKKKKrBBbbbbK',
        23: '........KMMmMmDDddDDKdddDDGGGGGGGGGGGGDDDDKKDDDDDKdKBbbbbK',
        24: '........KmmmMMDDddDDKdddDDDDDDDDDDDDDDDDDDKDDDDDKdddKKbKKK',
        25: '........KmmmMMDDddDDKdddDDDDDDDDDDDDDDDDDDKDDDDKdddK..KGGK',
        26: '........KMMmmmDDddDDKdddDDDDDDDDDDDDDDDDDDKKKDDDKdK....KKK',
        27: '........KMMMmmDDddDDKdddDDDDDDDDDDDDDDDDDDK.KKKKKK',
        28: '........KMMMMMDDddDDKdddDDDDGGGGGGGGDDDDDDKK',
        29: '........KMMMMMDDddDDKdddDDDDGGGGGGGGDDDDDDDK',
        30: '........KmmMMMDDDDDDKdddDDDDDDDDDDDDDDDDDDDK',
        31: '........KKmmMMDDDDDDKdddDDDDDDDDDDDDDDDDDDDK',
        32: '.........KKmMdddddddKdddDDDDDDDDDDDDDDDDDDDK',
        33: '..........KKKKdddddKKddddDDDDDDDDDDDDDDDDDDK',
        34: '.............KKKKKdddddddddddddddddddddddddK',
        35: '.................KKddddddddddddddddddddddddK',
        36: '................KKDDDDDDDDDDDDDDDDDDDDDDDDDK',
        37: '................KDDDDDDDDDDDDDDDDDDDDDDDDDDK',
        38: '................KDDDDDDDDDDDDDDDDDDDDDDDDddK',
        39: '.................KDDDDDDDDDKDKKDDDDDDDDdddK',
        40: '.................KDDDDDDDdKKK..KDDDDDDDdddK',
        41: '..................KDDDDDdddK....KDDDDDdddK',
        42: '..................KDDDDDdddK....KDDDDDdddK',
        43: '..................KDDDDDdddK....KDDDDDdddK',
        44: '..................KDDDDDdddK....KDDDDDdddK',
        45: '..................KDDDDDdddK....KDDDDDdddK',
        46: '..................KDDDDDdddK....KDDDDDdddK',
        47: '..................KDDDDDdddK....KDDDDDdddK',
        48: '..................KDDDDDdddK....KDDDDDdddK',
        49: '..................KDDDDDdddK....KDDDDDdddK',
        50: '..................KDDDDDdddK....KDDDDDdddK',
        51: '..................KDDDDDdddK....KDDDDDdddK',
        52: '..................KDDDDDdddK....KDDDDDdddK',
        53: '..................KDDDDDdddK....KDDDDDdddK',
        54: '..................KDDDDDdddK....KDDDDDdddK',
        55: '..................KDDDDDdddK....KDDDDDdddK',
        56: '..................KDDDDDdddK....KDDDDDdddK',
        57: '..................KDDDDDdddK....KDDDDDdddK',
        58: '..................KDDDDDdddK....KDDDDDdddK',
        59: '.................KdDDDDddddK...KdDDDDdddddK',
        60: '.................KdddddddddK...KddddddddddK',
        61: '................KddddddddKKK..KddddddddddddK',
        62: '................KKdddddddK....KKddddddddddKK',
        63: '.................KKKKKKKKK.....KKKKKKKKKKKK',
    },
};

// --- Zarek: o ceifador das sombras, com a foice viva ---
// Tem três formas que só trocam as cores de destaque (X/x), da lâmina (B/b) e do olho da foice (E).
pixelCharacters.zarek = {
    size: 64,
    palette: {
        K: OUTLINE,
        A: '#2b2540', a: '#1a1528',                          // armadura
        S: '#e8c3a6', s: '#b88d74',                          // pele
        N: '#2a2140', n: '#43365e',                          // cabelo
        H: '#4a3a2a',                                        // cabo da foice
    },
    forms: {
        normal: { X: '#8a8fa8', x: '#4a4f63', B: '#c8cede', b: '#7d849c', E: '#ff2a3a' },
        red:    { X: '#e8213a', x: '#8a1020', B: '#ff3b4a', b: '#a0101e', E: '#ffd23f' },
        blue:   { X: '#3fb8ff', x: '#1b4f99', B: '#5fd0ff', b: '#1f5fa8', E: '#c8f0ff' },
    },
    idle: [
        '.........................KKKKKKKKKK',
        '.......................KKNnnNNNNNNNKK.........KKKKKKKKKK',
        '.......................NNNnnNNNNNNNNN.......KKKBBBBBBBBBKK',
        '.....................KNNNNnnnNNNNNNNNNK....KBBBBBBBBBBBBBBK',
        '.....................NNNNNNnnnNNNNNNNNN...KBBBBBKKbbBBBBBBBK',
        '...................KNNNNNNNNnnNNNNNNNNNNK.KBBBBbKEKbbbbbBBBK',
        '..................KNNNnnNNNNNNNNNNNNNNNNK.KBBbbbKKKKKKKKbBBBK',
        '..................KNNNnnNNNNNNNNNNNNNNNNNKKbbbbbbKK.....KbbBK',
        '...................KNNNNNSSSSSSSSSSSSNNNNK.KbbbbK........KbBBK',
        '....................KNNNSSSSSSSSSSSSSSSNNK..KKKKK.........KbBK',
        '....................KNNNSSSSSSSSSSKSSSSSSK...KHHK..........KbK',
        '....................KNNNSSSSSSSSSSSSSSSSSK...KHHK..........KbK',
        '....................KnnnSSSSSSSSSSSSSSSSSK...KHHK...........KBK',
        '....................KnnnSSSSSSSSSSSSSSSSSK...KHHK...........KbK',
        '....................KnnnSSSSSSSSSSKKKSSSSK...KHHK............KK',
        '.....................KnnnSSSSSSSSSSSSSSSK....KHHK............KK',
        '.....................KnnnSSSSSSSSSSSSSSSK....KHHK............KK',
        '.......................nnnSSSSSSSSSSSSK......KHHK.............K',
        '.......................KKAAAAAAAAAAK.........KHHK.............K',
        '........................AAAAAAAAAAAA.........KHHK.............K',
        '...............KKKKKKAAAAAAAAXXXAAAAAAAAKK...KHHKK',
        '.............KKAAAaKKAAAAAAAXXXXAAAAAAAAAKKKKKHKAKK',
        '.............KAAAAaaKAAAAAAAXXXAAAAAAAAAAAKKAAKKAAK',
        '............KAAAAAaaKAAAAAAAXXAAAAAAAAAAAAKAAAKKAAAK',
        '............KAAAAAaaKAAAaaAAXXAAAAAAAAaaAAKAAAKKAAAK',
        '............KAAAAAaaKAAAaaAAXXXAAAAAAAaaAAKAAAKKAAAK',
        '............KXXXXXaaKAAAaaAAAXXXAAAAAAaaAAKXXXKKXXXK',
        '............KXXXXXaaKAAAaaAAAAXXXAAAAAaaAAKXXXKKXXXK',
        '............KAAAAAaaKAAAaaAAAAAXXXAAAAaaAAKAAAKKAAAK',
        '............KAAAAAaaKAAAaaAAAAAAXXXAAAaaAAKAAAKKAAAK',
        '............KAAAAAaaKAAAaaAAAAAAAXXXAAaaAAKAAAKKAAAK',
        '............KAAAAAaaKAAAaaAAAAAAAAXXAAaaAAKAAAKKAAAK',
        '............KSSSSSssKxxxxxxxxxxxxxxxxxxxxxKSSSKKSSSK',
        '.............KSSSSsKKxxxxxxxxxxxxxxxxxxxxxKKSSKKSSK',
        '.............KKKKKKAAAAAAAAAAAAAAAAAAAAAAAKKKKHHKKK',
        '.................KAAAAAAAAAAAAAAAAAAAAAAAAK..KHHK',
        '................KKAAAAAAAAAAAAAAAAAAAAAAAAK..KHHK',
        '................KAAAAAAAAAAAAAAAAAAAAAAAAAK..KHHK',
        '................KAAAAAAAAAAAAAAAAAAAAAAAAaK..KHHK',
        '.................KAAAAAAAAAKAKKAAAAAAAAaaKK..KHHK',
        '.................KAAAAAAAaKKK..KAAAAAAAaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '..................KxxxXXxxxK....KxxxXXxxxK...KHHK',
        '..................KxxxXXxxxK....KxxxXXxxxK...KHHK',
        '..................KAAAAAaaaK....KAAAAAaaaK...KHHK',
        '.................KaAAAAaaaaK...KaAAAAaaaaa...KHHK',
        '.................KaaaaaaaaaK...KaaaaaaaaaaK..KHHK',
        '................KaaaaaaaaKKK..KaaaaaaaaaaaaK.KHHK',
        '................KKaaaaaaaK....KKaaaaaaaaaaKK.KHHK',
        '.................KKKKKKKKK.....KKKKKKKKKKKK...KK',
    ],
    attack: {
        1: '.......................KKNnnNNNNNNNKK',
        2: '.......................NNNnnNNNNNNNNN',
        3: '.....................KNNNNnnnNNNNNNNNNK',
        4: '.....................NNNNNNnnnNNNNNNNNN',
        5: '...................KNNNNNNNNnnNNNNNNNNNNK',
        6: '..................KNNNnnNNNNNNNNNNNNNNNNK',
        7: '..................KNNNnnNNNNNNNNNNNNNNNNNK',
        8: '...................KNNNNNSSSSSSSSSSSSNNNNK',
        9: '....................KNNNSSSSSSSSSSSSSSSNNK',
        10: '....................KNNNSSSSSSSSSSKSSSSSSK..........KKKKKKK',
        11: '....................KNNNSSSSSSSSSSSSSSSSSK.........KBBBBBBBKK',
        12: '....................KnnnSSSSSSSSSSSSSSSSSK........KBBBBBBBBBBK',
        13: '....................KnnnSSSSSSSSSSSSSSSSSK........KBBBBKKBBBBK',
        14: '....................KnnnSSSSSSSSSSKKKSSSSK........KBBBKEEKBBBBK',
        15: '.....................KnnnSSSSSSSSSSSSSSSK.........KbBBKEEKbBBBK',
        16: '.....................KnnnSSSSSSSSSSSSSSSK..........KbbbKKKKbBBK',
        17: '.......................nnnSSSSSSSSSSSSK............KKKKK...KbBBK',
        18: '.......................KKAAAAAAAAAAK..............KHHHK....KbBBK',
        19: '........................AAAAAAAAAAAA.............KHHHK......KBBK',
        20: '...............KKKKKKAAAAAAAAXXXAAAAAAAAKK.KKKKKKKKHK.......KbBK',
        21: '.............KKAAAaKKAAAAAAAXXXXAAAAAAAAAKKKAAAAAAKK........KbBK',
        22: '.............KAAAAaaKAAAAAAAXXXAAAAAAAAAAAKAAAAAAAK..........KBK',
        23: '............KAAAAAaaKAAAAAAAXXAAAAAAAAAAAAKAAAAAAAK..........KBK',
        24: '............KAAAAAaaKAAAaaAAXXAAAAAAAAaaAAKKKAAAAAK..........KBK',
        25: '............KAAAAAaaKAAAaaAAXXXAAAAAAAaaAAKKKKKKKKK..........KBK',
        26: '............KXXXXXaaKAAAaaAAAXXXAAAAAAaaAAKKHHK..............KK',
        27: '............KXXXXXaaKAAAaaAAAAXXXAAAAAaaAAAKHK...............KK',
        28: '............KAAAAAaaKAAAaaAAAAAXXXAAAAaaAAAKK................KK',
        29: '............KAAAAAaaKAAAaaAAAAAAXXXAAAaaAAAK.................KK',
        30: '............KAAAAAaaKAAAaaAAAAAAAXXXAAaaAAAK.................KK',
        31: '............KAAAAAaaKAAAaaAAAAAAAAXXAAaaAAAK.................KK',
        32: '............KSSSSSssKxxxxxxxxxxxxxxxxxxxxxxK',
        33: '.............KSSSSsKKxxxxxxxxxxxxxxxxxxxxxxK',
        34: '.............KKKKKKAAAAAAAAAAAAAAAAAAAAAAAAK',
        35: '.................KAAAAAAAAAAAAAAAAAAAAAAAAAK',
        36: '................KKAAAAAAAAAAAAAAAAAAAAAAAAAK',
        37: '................KAAAAAAAAAAAAAAAAAAAAAAAAAAK',
        38: '................KAAAAAAAAAAAAAAAAAAAAAAAAaaK',
        39: '.................KAAAAAAAAAKAKKAAAAAAAAaaaK',
        40: '.................KAAAAAAAaKKK..KAAAAAAAaaaK',
        41: '..................KAAAAAaaaK....KAAAAAaaaK',
        42: '..................KAAAAAaaaK....KAAAAAaaaK',
        43: '..................KAAAAAaaaK....KAAAAAaaaK',
        44: '..................KAAAAAaaaK....KAAAAAaaaK',
        45: '..................KAAAAAaaaK....KAAAAAaaaK',
        46: '..................KAAAAAaaaK....KAAAAAaaaK',
        47: '..................KAAAAAaaaK....KAAAAAaaaK',
        48: '..................KAAAAAaaaK....KAAAAAaaaK',
        49: '..................KAAAAAaaaK....KAAAAAaaaK',
        50: '..................KAAAAAaaaK....KAAAAAaaaK',
        51: '..................KAAAAAaaaK....KAAAAAaaaK',
        52: '..................KAAAAAaaaK....KAAAAAaaaK',
        53: '..................KAAAAAaaaK....KAAAAAaaaK',
        54: '..................KAAAAAaaaK....KAAAAAaaaK',
        55: '..................KAAAAAaaaK....KAAAAAaaaK',
        56: '..................KxxxXXxxxK....KxxxXXxxxK',
        57: '..................KxxxXXxxxK....KxxxXXxxxK',
        58: '..................KAAAAAaaaK....KAAAAAaaaK',
        59: '.................KaAAAAaaaaK...KaAAAAaaaaaK',
        60: '.................KaaaaaaaaaK...KaaaaaaaaaaK',
        61: '................KaaaaaaaaKKK..KaaaaaaaaaaaaK',
        62: '................KKaaaaaaaK....KKaaaaaaaaaaKK',
        63: '.................KKKKKKKKK.....KKKKKKKKKKKK',
    },
};

// --- Celestia: curandeira celestial com auréola e cajado de estrela ---
pixelCharacters.celestia = {
    palette: {
        K: OUTLINE,
        W: '#f4f0ff', w: '#c9c0e6',                          // vestido
        G: '#ffd24a', g: '#b8902a',                          // dourado
        Y: '#fff3a0',                                        // auréola e estrela
        H: '#9fdcff', h: '#5aa8e0',                          // cabelo
        S: '#f6d2b8', s: '#d0a080',                          // pele
        E: '#3a2d6b',                                        // olho
    },
    idle: [
        '............KYYYYYK....Y',
        '...........KKKKKKKKK..YYY',
        '..........KHHHHHHHHHKYYYYY',
        '.........KHHhHHHHHHHHK.YYY',
        '.........KHhSSSSSSSHHKY.Y',
        '.........KHhSSSSSESSHKKGK',
        '.........KHhSSSSSSSSHKKGK',
        '.........KHhsSSSSSSSHKKGK',
        '........KHHHHKsSSSSK..KGK',
        '........KHHhHKKSSKK...KGK',
        '.....KHKKKKWWWGGWWWWKKKGK',
        '....KHKWWwKWWWWGWWWWWKSGSK',
        '....KHKWWwKWWWGGGWWWWKWGWK',
        '....KhKWWwKwWWWGWWWWwKWGWK',
        '....KHKSSsKwWWWGWWWWwKWGWK',
        '....KHKKKKKGGGGGGGGGGKKGK',
        '.....KK..KWWWWWWWWWWWKKGK',
        '........KWWWWWWwWWWWWKKGK',
        '........KWWWWWwWWWWWWKKGK',
        '.......KWWWWWWwWWWWWWKKGK',
        '.......KWWWWWwWWWWWWWKKGK',
        '......KWWWWWwWWWWWWWWKKGK',
        '......KWWWWwWWWWWWWWWKKGK',
        '.....KWWWWwWWWWWWWWWWKKGK',
        '.....KWWWwWWWWWWWWWWWKKGK',
        '.....KGGGGGGGGGGGGGGGKKGK',
        '.....KWWWWWWWWWWWWWWWKKGK',
        '.....KwWWWwWWWWwWWWWwKKGK',
        '.....KGGGGGGGGGGGGGGGKKGK',
        '......KKKKKKKKKKKKKKK.KGK',
        '..........KSSK.KSSK...KK',
        '..........KKKK.KKKK',
    ],
    // Soco: braço estendido para frente
    attack: {
        11: '....KHKWWwKWWWWGWWWWWKKKKKKKKK',
        12: '....KHKWWwKWWWGGGWWWWKWWWWWSSK',
        13: '....KhKWWwKwWWWGWWWWwKwwwwwSSK',
        14: '....KHKSSsKwWWWGWWWWwKKKKKKKKK',
    },
};

// --- Flora: druida da natureza com coroa de flores ---
pixelCharacters.flora = {
    palette: {
        K: OUTLINE,
        L: '#4cc96a', l: '#2a7d42', G: '#9cf09a',            // folhas do vestido
        P: '#ff7ac0', Y: '#ffe34a',                          // flores da coroa
        N: '#a8502a', n: '#6e2f17',                          // cabelo
        S: '#f2c7a0', s: '#c48e66',                          // pele
        E: '#2a5a2a',                                        // olho
        V: '#3a6a2a',                                        // cipós
    },
    idle: [
        '............KKKKKKKK',
        '...........KNNNNNNNNK',
        '..........KPYPLPYPLPYK',
        '..........KNnNNNNNNNNK',
        '..........KNnSSSSSSSNK',
        '..........KNnSSSSSESNK',
        '..........KNnSSSSSSSSK',
        '..........KNnsSSSSSSSK',
        '.........KNNNNKsSSSSK',
        '.........KNnNNKKSSKK',
        '.....KNKKKKLLLLPLLLLKKKKK',
        '....KNKSSsKLlLLGLLLlLKSSSK',
        '....KNKVVVKLlLGGGLLlLKVVVK',
        '....KnKSSsKLlLLGLLLlLKSSsK',
        '....KNKSSsKlLLLLLLLLlKSSsK',
        '....KNKSSSKVVVVVVVVVVKSSSK',
        '.....KK..KLLGLLLLGLLLK',
        '........KLLlLLLGLLLlLK',
        '........KLlLLGLLLLlLLK',
        '.......KLLLlLLLLGLLlLK',
        '.......KlLLLGLLLlLLLLK',
        '......KLLGLLlLLLGLLlLK',
        '......KLLKLLKLLKLLKLLK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KVVVK..KVVVK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '........KllllK.KlllllK',
        '........KKKKKK.KKKKKKK',
    ],
    // Soco: braço com cipó estendido para frente
    attack: {
        11: '....KNKSSsKLlLLGLLLlLKKKKKKKK',
        12: '....KNKVVVKLlLGGGLLlLKVVVVVSSK',
        13: '....KnKSSsKLlLLGLLLlLKSSSSSSSK',
        14: '....KNKSSsKlLLLLLLLLlKKKKKKKKK',
        15: '....KNKSSSKVVVVVVVVVVK',
    },
};

// --- Nyx: vampira cyberpunk que rouba vida para o time ---
pixelCharacters.nyx = {
    palette: {
        K: OUTLINE,
        N: '#120c1c', n: '#2a1f3a',                          // cabelo
        S: '#e8dcef', s: '#b8a8c8',                          // pele pálida
        E: '#ff2a4a',                                        // olhos
        R: '#ff2a4a', r: '#8a1020',                          // vermelho neon (forro e garras)
        C: '#1a1424', c: '#2c2238',                          // sobretudo
        G: '#c9a46a',                                        // broche
    },
    idle: [
        '............KKKKKKK',
        '...........KNNNNNNNK',
        '..........KNNnNNNNNNK',
        '.........KNNnNNNNNNNNK',
        '.........KNnSSSSSSSSK',
        '.........KNnSSSSSESSK',
        '.........KNnSSSSSSSSK',
        '.........KNnsSSRSSSSK',
        '.........KNNKsSSSSSK',
        '........KRRKKKSSSKKKRRK',
        '....KNNKKKKCCCRRRCCCKKKKK',
        '....KNKCCcKCCRCCCCRCCKCCCK',
        '....KNKCCcKCRCCGGCCRCKCCcK',
        '....KnKCCcKCRCCCCCCRCKCCcK',
        '....KNKSSsKCRCCCCCCRCKSSsK',
        '....KNKRKRKCRCCCCCCRCKRKRK',
        '....KKK...KCRCCCCCCRCK',
        '........KCCRCCCCCCRCCK',
        '........KCCRCCCCCCRCCK',
        '........KCCRCCKKCCRCCK',
        '........KCRCCK..KCCRCK',
        '........KCRCcK..KcCRCK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '........KNNNNK.KNNNNNK',
        '........KKKKKK.KKKKKKK',
    ],
    // Golpe: garras vermelhas para frente
    attack: {
        11: '....KNKCCcKCCRCCCCRCCKKKKKKKKK',
        12: '....KNKCCcKCRCCGGCCRCKCCCCCSSRK',
        13: '....KnKCCcKCRCCCCCCRCKcccccSSRRK',
        14: '....KNKSSsKCRCCCCCCRCKKKKKKKKKKK',
        15: '....KNKRKRKCRCCCCCCRCK',
    },
};

// --- Mamba: sniper de capuz e máscara de gás, com rifle venenoso ---
pixelCharacters.mamba = {
    palette: {
        K: OUTLINE,
        H: '#1f3a2a', h: '#2f5a3e',                          // capuz
        M: '#5a6270', m: '#3a4050',                          // máscara de gás
        L: '#6dff8a',                                        // lentes brilhando
        C: '#26302c', c: '#18201c',                          // sobretudo
        G: '#8a94a8', g: '#4a5060',                          // rifle
        V: '#4cff7a',                                        // detalhes de veneno
        Y: '#fff3a0',                                        // clarão do tiro
        B: '#111111',                                        // botas
    },
    idle: [
        '............KKKKKKK',
        '...........KHHHHHHHK',
        '..........KHHhHHHHHHK',
        '..........KHhMMMMMMMHK',
        '..........KHhMLLMLLMHK',
        '..........KHhMMMMMMMHK',
        '..........KHhMmMmMmMHK',
        '...........KHMMMMMMHK',
        '............KmMMMmK',
        '...........KKCCCCCCKK',
        '.......KKKKCCCCCCCCCKKKKK',
        '......KCCcKCCCCVCCCCCKCCCK',
        '......KCCcKCCCCCCCCCCKGGGGGGGGK',
        '......KCCcKCCCCCCCCCCKgGGgGGGGVK',
        '......KCCcKCCCCCCCCCCKKKKKKKKKK',
        '......KcccKCCCCCCCCCCK',
        '......KKKKKccccccccccK',
        '........KCCCCCCCCCCCCK',
        '........KCCCCCCCCCCCCK',
        '........KCCCCCKKCCCCCK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KVccK..KVccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '.........KcccK..KcccK',
        '........KBBBBK.KBBBBBK',
        '........KKKKKK.KKKKKKK',
    ],
    // Tiro: clarão na ponta do rifle
    attack: {
        12: '......KCCcKCCCCCCCCCCKGGGGGGGGKY',
        13: '......KCCcKCCCCCCCCCCKgGGgGGGVYY',
        14: '......KCCcKCCCCCCCCCCKKKKKKKKKKY',
    },
};

// --- Gear: engenheiro de macacão com braço mecânico ---
pixelCharacters.gear = {
    palette: {
        K: OUTLINE,
        O: '#ff8a1f', o: '#c4520f',                          // macacão
        Y: '#ffd23f', y: '#c99a1a',                          // capacete
        S: '#f2b98f', s: '#c47f5a',                          // pele
        G: '#3ff6ff',                                        // óculos e luz da arma
        M: '#9aa3b8', m: '#5a6270',                          // braço mecânico
        W: '#e8e8e8',                                        // camiseta
        B: '#3a2a1a',                                        // botas
    },
    idle: [
        '............KKKKKKK',
        '...........KYYYYYYYK',
        '..........KYYyYYYYYYK',
        '..........KyyyyyyyyyK',
        '..........KSGGGKGGGSK',
        '..........KSSSSSSKSSK',
        '..........KsSSSSSSSSSK',
        '..........KsSSSSSKKKSK',
        '...........KsSSSSSSSK',
        '............KsSSSSK',
        '.......KKKKOOWWWWWOOKKKKK',
        '......KSSsKOOOWWWOOOOKMMMK',
        '......KSSsKOOOOOOOOOOKMmMK',
        '......KSSsKOoOOOOOOoOKMmMK',
        '......KSSsKOoOOYYOOoOKMmMK',
        '......KSSSKOoOOOOOOoOKmMmK',
        '......KKKKKOOOOOOOOOOKMMMK',
        '........KOOOOOOOOOOOOK',
        '........KOOOOOOOOOOOOK',
        '........KOOOOOKKOOOOOK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '.........KOOoK..KOOoK',
        '........KBBBBK.KBBBBBK',
        '........KKKKKK.KKKKKKK',
    ],
    // Tiro: braço mecânico esticado com a pistola de pregos
    attack: {
        11: '......KSSsKOOOWWWOOOOKKKKKKKKK',
        12: '......KSSsKOOOOOOOOOOKMMMmmmmMK',
        13: '......KSSsKOoOOOOOOoOKMmMMMMMGYK',
        14: '......KSSsKOoOOYYOOoOKKKKKKKKKK',
        15: '......KSSSKOoOOOOOOoOK',
        16: '......KKKKKOOOOOOOOOOK',
    },
};

// --- Roxy: baixinha caótica com duas pistolas rosa (desenhada um pouco menor no jogo) ---
pixelCharacters.roxy = {
    palette: {
        K: OUTLINE,
        T: '#3ff0c8', t: '#1fa88a',                          // cabelo verde-água
        S: '#f6d2c0', s: '#c99a86',                          // pele
        E: '#ff4fa3',                                        // olhos
        P: '#ff4fa3', p: '#b02a6e',                          // rosa neon (braços cibernéticos e pistolas)
        J: '#1c1a22', j: '#2e2a38',                          // jaqueta e short
        W: '#f4f4f8',                                        // blusa
        Y: '#fff3a0',                                        // clarão do tiro
    },
    idle: [
        '............KKKKKKK',
        '...........KTTTTTTTK',
        '......KK..KTTTtTTTTTK.KK',
        '.....KTTK.KTtTTTTTTTK.KTTK',
        '.....KTtK.KTSSSSSSSTK.KTtK',
        '.....KTtK.KTSSSSSESTK.KTtK',
        '....KTTtK.KSSSSSSSSSK.KTtTK',
        '....KTtTK.KsSSSSSPSSK.KTtTK',
        '....KTTK...KsSSSSSK...KTTK',
        '.....KK.....KSSSK.....KK',
        '.......KKKKJJJWWWJJJKKKKK',
        '......KpPPKJJJWWWJJJJKpPPK',
        '......KpPPKJJJWPWJJJJKpPPK',
        '......KpPPKJjJWWWJjJJKpPPK',
        '......KpPpKJjJJJJJjJJKpPpK',
        '......KSSsKJJJJJJJJJJKSSsK',
        '......KPPKKjjjjjjjjjjKKPPK',
        '......KPpKKjjjjjjjjjjKKPpK',
        '.......KK.KjjjjKKjjjjK.KK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KSSsK..KSSsK',
        '.........KPPpK..KPPpK',
        '.........KJJjK..KJJjK',
        '.........KJJjK..KJJjK',
        '.........KJJjK..KJJjK',
        '.........KJJjK..KJJjK',
        '.........KJJjK..KJJjK',
        '.........KJJjK..KJJjK',
        '.........KJJjK..KJJjK',
        '........KPPPPK.KPPPPPK',
        '........KKKKKK.KKKKKKK',
    ],
    // Tiro: as duas pistolas apontadas para frente, com clarão
    attack: {
        11: '......KpPPKJJJWWWJJJJKKKKKKKKK',
        12: '......KpPPKJJJWPWJJJJKpPPPPPPYK',
        13: '......KpPPKJjJWWWJjJJKKKKKKKKKK',
        14: '......KSSsKJjJJJJJjJJKpPPPPPPYK',
        15: '......KSSsKJJJJJJJJJJKKKKKKKKK',
        16: '......KKKKKjjjjjjjjjjK',
        17: '......KKKKKjjjjjjjjjjK',
        18: '.......KK.KjjjjKKjjjjK',
    },
};

// --- Weaver: acrobata cyberpunk com lançadores de teia (traje preto com teia neon) ---
pixelCharacters.weaver = {
    size: 64, // sprite bem detalhado (64x64)
    palette: {
        K: OUTLINE,
        B: '#15131c', b: '#262233',                          // traje
        C: '#3ff6ff', c: '#1a8aa0',                          // linhas de teia neon
        L: '#e8fbff', w: '#9fd8e8',                          // lentes da máscara
        P: '#a050ff', p: '#7a3ad0',                          // emblema de aranha
        G: '#8a94a8', g: '#4a5266',                          // lançadores de teia
    },
    idle: [
        '',
        '...........................KKKKKKKKKK',
        '.........................KKCBBBBBBBBCKK',
        '........................KBBBCCCBBCCCBBBK',
        '.......................KBBCCCBBBBBBCCCBBK',
        '......................KBBCKKKKBBBBKKKKCBBK',
        '.....................KbBKLLLLLKBBKLLLLLKBBK',
        '.....................KKKLLLLLLKKKKLLLLLLKKK',
        '.....................KKLLLLLLLKKKKLLLLLLLKK',
        '.....................KLLLLLLLLKBBKLLLLLLLLK',
        '....................KKLLLLLLLKKBBKKLLLLLLLKK',
        '.....................KwwwwwwKKBBBBKKwwwwwwK',
        '.....................KwwwwwKBBBBBBBBKwwwwwK',
        '.....................KKKKKBBBBBBBBBBBBKKKKK',
        '.....................KbBCBBBBBBBBBBBBBBCBBK',
        '......................KBBCBBBBBBBBBBBBCBBK',
        '.......................KBBCCCBBBBBBCCCBBK',
        '........................KBBBCCCBBCCCBBBK',
        '.........................KKCBBBBBBBBCKK',
        '...........................KKKKKKKKKK',
        '...........................KbbbbbbbbK',
        '......................KKKKKKbbbbbbbbKKKKKK',
        '............KKKKKKKK..KBBBBKKKKKKKKKKBCBCK..KKKKKKKK',
        '............KbBCBBBKKKbBpBBBBBCBBBBBBBBpBBKKKbBCBBCK',
        '............KbBBCBCKKbCBBppBBCPPPPBBBppBCBBKKbCBBBBK',
        '............KbBBBCBKKbbCBBBpCBPPPPBBpCBBBCBKKCBBBBBK',
        '............KbBBCBCKKbbBCBBCpBPPPPBpCBBBBBCKKbCBBBBK',
        '............KbBCBBBKKbbBBCCBBpPPPPpCBBBBBBBKKbBCBBCK',
        '............KCCBBBBKKbbBBCCBpBPPPPCpBBBBBBBKKbBBCCBK',
        '............KCCBBBBKKbbBCBBpBBPPPPBBpBBBBBCKKbBBCCBK',
        '............KbBCBBBKKbbCBppBCBPPPPBBBppBBCBKKbBCBBCK',
        '............KGGGGGGKKbCBpBBBBCPPPPBBBBCpCBBKKGGGGGGK',
        '............KGGGCGGKKCbBBBBBBBCPPBBBBBBCBBBKKGGGCGGK',
        '............KGGGGGGKKbCBBBBBBCBCBBBBBBCBCBBKKGGGGGGK',
        '............KggggggKKKKKKKKKKKKKKKKKKKKKKKKKKggggggK',
        '............KbbbbbbKKccccccccccccccccccccccKKbbbbbbK',
        '............KbbbbbbKKbbBBBBBBBBBBBBBBBBBBBBKKbbbbbbK',
        '............KKKKKKKKKbbBBBBBBBBBBBBBBBBBBBBKKKKKKKKK',
        '....................KKKKKKKKKKKKKKKKKKKKKKKK',
        '.....................KBCBBBBbK...KBCBBBBbK',
        '.....................KBBCBBBbK...KBBCBBBbK',
        '.....................KBBBCBBbK...KBBBCBBbK',
        '.....................KBCBBBBbK...KBCBBBBbK',
        '.....................KBBCBBBbK...KBBCBBBbK',
        '.....................KBBBCBBbK...KBBBCBBbK',
        '.....................KBCBBBBbK...KBCBBBBbK',
        '.....................KbbbbbbbK...KbbbbbbbK',
        '.....................KbbbbbbbK...KbbbbbbbK',
        '.....................KbbbbbbbK...KbbbbbbbK',
        '.....................KBBCBBBbK...KBBCBBBbK',
        '.....................KBBBCBBbK...KBBBCBBbK',
        '.....................KBCBBBBbK...KBCBBBBbK',
        '.....................KBBCBBBbK...KBBCBBBbK',
        '.....................KBBBCBBbK...KBBBCBBbK',
        '.....................KBCBBBBbK...KBCBBBBbK',
        '.....................KBBCBBBbK...KBBCBBBbK',
        '.....................KBBBCBBbK...KBBBCBBbK',
        '.....................KBCBBBBbK...KBCBBBBbK',
        '....................KKKKKKKKKKK.KKKKKKKKKKK',
        '....................KcccccccccK.KcccccccccK',
        '....................KbbbbbbbbbK.KbbbbbbbbbK',
        '....................KbbbbbbbbbK.KbbbbbbbbbK',
        '....................KbbbbbbbbbK.KbbbbbbbbbK',
        '....................KKKKKKKKKKK.KKKKKKKKKKK',
    ],
    // Golpe: braço esticado com o lançador de teia
    attack: {
        22: '............KKKKKKKK..KBBBBKKKKKKKKKKBCBCK',
        23: '............KbBCBBBKKKbBpBBBBBCBBBBBBBBpBBKK',
        24: '............KbBBCBCKKbCBBppBBCPPPPBBBppBCBBK',
        25: '............KbBBBCBKKbbCBBBpCBPPPPBBpCBBBCBK',
        26: '............KbBBCBCKKbbBCBBCpBPPPPBpCBBBBBCK',
        27: '............KbBCBBBKKbbBBCCBBpPPPPpCBBBBBBBKKKKKKKKKKKKKKKKKKK',
        28: '............KCCBBBBKKbbBBCCBpBPPPPCpBBBBBBBKCBBCBCBBCBGGGGbbbK',
        29: '............KCCBBBBKKbbBCBBpBBPPPPBBpBBBBBCKBCCBBBCCBBGGGGbbbKC',
        30: '............KbBCBBBKKbbCBppBCBPPPPBBBppBBCBKBCCBBBCCBBGGCGbbbKCC',
        31: '............KGGGGGGKKbCBpBBBBCPPPPBBBBCpCBBKCBBCBCBBCBGGGGbbbKC',
        32: '............KGGGCGGKKCbBBBBBBBCPPBBBBBBCBBBKBBBBCBBBBCGGGGbbbK',
        33: '............KGGGGGGKKbCBBBBBBCBCBBBBBBCBCBBKKKKKKKKKKKKKKKKKKK',
        34: '............KggggggKKKKKKKKKKKKKKKKKKKKKKKKK',
        35: '............KbbbbbbKKccccccccccccccccccccccK',
        36: '............KbbbbbbKKbbBBBBBBBBBBBBBBBBBBBBK',
        37: '............KKKKKKKKKbbBBBBBBBBBBBBBBBBBBBBK',
    },
};

// --- Aegis: policial de choque com escudo de energia (tanque) ---
pixelCharacters.aegis = {
    size: 64,
    palette: { K: OUTLINE, B: '#25336b', n: '#18214a', A: '#3d5199', V: '#3ff6ff', v: '#1a8aa0', S: '#4aa8ff', s: '#2a6fd0', W: '#cfeaff', Y: '#ffd23f', G: '#8a94a8' },
    idle: [
        '',
        '...........................KKKKKKKKKK',
        '.........................KKAAAAAAAAAAKK',
        '........................KAAAAAAAAAAAAAAK',
        '.......................KBBBBBBBBBBBBBBBBK',
        '......................KnBBBBBBBBBBBBBBBBBK',
        '.....................KnnBBBBBBBBBBBBBBBBBBK',
        '.....................KnnBBBBBBBBBBBBBBBBBBK',
        '.....................KnVVVVVVVVVVVVVVVVVVVK',
        '.....................KnVVVVVVVVVVVVVVVVVVVK',
        '....................KnnVVVVVVVVVVVVVVVVVVVVK',
        '.....................KnVVVVVVVVVVVVVVVVVVVK',
        '.....................KnvvvvvvvvvvvvvvvvvvvK',
        '.....................KnnBBBBBBBBBBBBBBBBBBK',
        '.....................KnnBBBBBBBBBBBBBBBBBBK',
        '......................KnBBBBBBBBBBBBBBBBBK.....KKKKKKK',
        '.......................KBBBBBBBBBBBBBBBBK....KKsssssssKK',
        '................K.......KBBBBBBBBBBBBBBK...KKSSSSSSSSSSSK',
        '.............KKKAKKK.....KKBBBBBBBBBBKK...KAKWSSSSSSSSSSK',
        '............KAAAAAAAKKKKKKKKKKKKKKKKKKKKKKAKsWSSSSSSSSSSsK',
        '...........KAAAAAAAAAKAAAAAKnnnnnnnnKAAAAKAKsWWSSSSSSSSSsK',
        '...........KAAAAAAAAAKABABBKKKKKKKKKKBBBKAAKsSWSSSSSSSSSsK',
        '..........KAAAAAAAAAAAKABBBBBBBBABBBYBBBBKAKsSWWSSSSSSSSsK',
        '..........KKAAAAAAAAAKABBBBBBBBABBBYYYBBAKAKsSSWSSSSSSSSsK',
        '..........KKAAAAAAAAAKABBBBBBBABBBYYYYYABAKKsSSWWSSSSSSSsK',
        '..........KnKAAAAAAAKAABBBBBBABBBBBYYYABBAAKsSSSWSSSSSSSsK',
        '..........KnBKKKAKKKnAABBBBBABBBBBBBYABBBAAKsSSSWWSSSSSSsK',
        '..........KnBBBBKnnnnnnnnnnnnnnnnnnnnnnnnnnKsSSSSWSSSSSSsK',
        '..........KnBBBBKnnnnAABBBABBBBBBBBABBBBBAAKsSSSSWWSSSSSsK',
        '..........KnBBBBKnnnnAABBABBBBBBBBABBBBBBAAKsSSSSSWSSSSSsK',
        '..........KnBBBBKnnnnAABABBBBBBBBABBBBBBBAAKsSSSSWWWSSSSsK',
        '..........KnBBBBBKnnnAAABBBBBBBBABBBBBBBBAAKsSSSWWWWWSSSsK',
        '..........KnBBBBBKnnnAAAAAAAAAAAAAAAAAAAAAAKsSSWWWWWWWSSsK',
        '..........KnBBBBBKKKnAAAAAAAAAAAAAAAAAAAAAAKsSSWWWWWWWSSsK',
        '..........KnBBBBBKKnKKKKKKKKKKKKKKKKKKKKKKKKsSSWWWWWWWSSsK',
        '..........KnnnnnnKKGGGGGGGGGGGGGGGGGGGGGGGGKsSSWWWWWWWSSsK',
        '..........KnnnnnnKKnnnnnnnnnnnnnnnnnnnnnnnnKsSSWWWWWWWWSsK',
        '..........KnnnnnnKKnnnnnnnnnnnnnnnnnnnnnnnnKsSSSWWWWWSWSsK',
        '..........KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKsSSSSWWWSSWWsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSWsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSWsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSSsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSSsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSSsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSSsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSSsK',
        '....................KAAAAAAAAK...KAAAAAAAAKKsSSSSSSSSSSSsK',
        '....................KAAAAAAAAK...KAAAAAAAAKKsSSSSSSSSSSSsK',
        '....................KAAAAAAAAK...KAAAAAAAAKKsSSSSSSSSSSSsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSSsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSSsK',
        '....................KnBBBBBBBK...KnBBBBBBBKKsSSSSSSSSSSSsK',
        '....................KnBBBBBBBK...KnBBBBBBBK.KSSSSSSSSSSSK',
        '....................KnBBBBBBBK...KnBBBBBBBK.KSSSSSSSSSSSK',
        '....................KnBBBBBBBK...KnBBBBBBBK..KKsssssssKK',
        '....................KnBBBBBBBK...KnBBBBBBBK....KKKKKKK',
        '....................KKKKKKKKKK...KKKKKKKKKK',
        '....................KAAAAAAAAAK..KAAAAAAAAAK',
        '...................KnnnnnnnnnnnKKnnnnnnnnnnnK',
        '...................KnnnnnnnnnnnKKnnnnnnnnnnnK',
        '...................KnnnnnnnnnnnKKnnnnnnnnnnnK',
        '...................KnnnnnnnnnnnKKnnnnnnnnnnnK',
        '....................KnnnnnnnnnK..KnnnnnnnnnK',
        '.....................KKKKKKKKK....KKKKKKKKK',
    ],
    attack: {
        15: '......................KnBBBBBBBBBBBBBBBBBK..........KKKKKKK',
        16: '.......................KBBBBBBBBBBBBBBBBK.....K...KKsssssssKK',
        17: '................K.......KBBBBBBBBBBBBBBK...KKKAKKKSSSSSSSSSSSK',
        18: '.............KKKAKKK.....KKBBBBBBBBBBKK...KAAAAAAKWSSSSSSSSSSK',
        19: '............KAAAAAAAKKKKKKKKKKKKKKKKKKKKKKAAAAAAKsWSSSSSSSSSSsK',
        20: '...........KAAAAAAAAAKAAAAAKnnnnnnnnKAAAAKAAAAAAKsWWSSSSSSSSSsK',
        21: '...........KAAAAAAAAAKABABBKKKKKKKKKKBBBKAAAAAAAKsSWSSSSSSSSSsK',
        22: '..........KAAAAAAAAAAAKABBBBBBBBABBBYBBBBKAAAAAAKsSWWSSSSSSSSsK',
        23: '..........KKAAAAAAAAAKABBBBBBBBABBBYYYBBAKAAAAAAKsSSWSSSSSSSSsK',
        24: '..........KKAAAAAAAAAKABBBBBBBABBBYYYYYABAKAAAAAKsSSWWSSSSSSSsK',
        25: '..........KnKAAAAAAAKAABBBBBBABBBBBYYYABBAAKKKAKKsSSSWSSSSSSSsK',
        26: '..........KnBKKKAKKKnAABBBBBABBBBBBBYABBKKKKKKKKKsSSSWWSSSSSSsK',
        27: '..........KnBBBBKnnnnnnnnnnnnnnnnnnnnnnnKBBBBBBnKsSSSSWSSSSSSsK',
        28: '..........KnBBBBKnnnnAABBBABBBBBBBBABBBBKBBBBBBnKsSSSSWWSSSSSsK',
        29: '..........KnBBBBKnnnnAABBABBBBBBBBABBBBBKBBBBBBnKsSSSSSWSSSSSsK',
        30: '..........KnBBBBKnnnnAABABBBBBBBBABBBBBBKBBBBBBnKsSSSSWWWSSSSsK',
        31: '..........KnBBBBBKnnnAAABBBBBBBBABBBBBBBKBBBBBBnKsSSSWWWWWSSSsK',
        32: '..........KnBBBBBKnnnAAAAAAAAAAAAAAAAAAAKKKKKKKKKsSSWWWWWWWSSsK',
        33: '..........KnBBBBBKKKnAAAAAAAAAAAAAAAAAAAAAAAKK..KsSSWWWWWWWSSsK',
        34: '..........KnBBBBBKKnKKKKKKKKKKKKKKKKKKKKKKKKnK..KsSSWWWWWWWSSsK',
        35: '..........KnnnnnnKKGGGGGGGGGGGGGGGGGGGGGGGGGGK..KsSSWWWWWWWSSsK',
        36: '..........KnnnnnnKKnnnnnnnnnnnnnnnnnnnnnnnnnnK..KsSSWWWWWWWWSsK',
        37: '..........KnnnnnnKKnnnnnnnnnnnnnnnnnnnnnnnnnnK..KsSSSWWWWWSWSsK',
        38: '..........KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..KsSSSSWWWSSWWsK',
        39: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSWsK',
        40: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSWsK',
        41: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSSsK',
        42: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSSsK',
        43: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSSsK',
        44: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSSsK',
        45: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSSsK',
        46: '....................KAAAAAAAAK...KAAAAAAAAK.....KsSSSSSSSSSSSsK',
        47: '....................KAAAAAAAAK...KAAAAAAAAK.....KsSSSSSSSSSSSsK',
        48: '....................KAAAAAAAAK...KAAAAAAAAK.....KsSSSSSSSSSSSsK',
        49: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSSsK',
        50: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSSsK',
        51: '....................KnBBBBBBBK...KnBBBBBBBK.....KsSSSSSSSSSSSsK',
        52: '....................KnBBBBBBBK...KnBBBBBBBK......KSSSSSSSSSSSK',
        53: '....................KnBBBBBBBK...KnBBBBBBBK......KSSSSSSSSSSSK',
        54: '....................KnBBBBBBBK...KnBBBBBBBK.......KKsssssssKK',
        55: '....................KnBBBBBBBK...KnBBBBBBBK.........KKKKKKK',
    },
};

// --- Rhino: mercenário com armadura de rinoceronte (tanque de atropelo) ---
pixelCharacters.rhino = {
    size: 64,
    palette: { K: OUTLINE, R: '#6b6f7a', r: '#474b55', h: '#9aa0ad', H: '#efe6cc', O: '#ff8a2a', o: '#b35a12', E: '#ff3b3b', D: '#2b2e35', B: '#6b6f7a' },
    idle: [
        '...........................K',
        '..........................KRK',
        '.........................KRRRK',
        '.........................KRRRKK............KKKKKKK',
        '.........................KKKKKhKKKKK.......KHHHHHK',
        '........................KhhhhhhhhhhhK......KHHHHHK',
        '......................KKRRRRRRRRRRRRRKK....KHHHHK',
        '.....................KrrRRRRRRRRRRRRRRRK...KHHHK',
        '.....................KrrRRRRRRRRRRRRREEK..KHHHK',
        '....................KrrrRRRRRRRRRRRREEEEK.KHHHK',
        '....................KrrrRRRRRRRRRRRRREERK.KHHK',
        '....................KrrrRRRRRRRRRRRRRRRRRKKhKK',
        '...................KrrrrRRRRRRRRRRRRRRRRRRKKRK',
        '....................KrrrRRRRRRRRRRRRRRRRRKKKRK',
        '....................KrrrRRRRRRRRRRRRRRRRRRRRRK',
        '....................KrrrRRRRRRRRRRRRRRRRRRRRRK',
        '.....................KrrRRRRRRRRRRRRRRRRRRRRRK',
        '...............K.....KrrrrrrrrrrrrrrrrrrrrrrrK.K',
        '............KKKhKKK...KKrrrrrrrrrrrrrrrrrrrrrKKhKKK',
        '...........KhhhhhhhK....KrrrrrrrrrrrKKKKKKKKKKhhhhhK',
        '..........KhhhhhhhhhKKKKKKKKKKrKKKKKKKKKKKKhhhhhhhhhK',
        '..........KRRRRRRRRRKRRRRRRRRRKRRRRRRRRRRRKRRRRRRRRRK',
        '.........KRRRRRRRRRRRKRRRRRRRRRRRRRRRRRRRKRRKKKKKKKKKK',
        '..........KRRRRRRRRRKRRRRRRRooooooooRRRRRRKRKrRRRRRRK',
        '..........KRRRRRRRRRKrrrrrrroOOOOOOorrrrrrKRKrRRRRRRK',
        '..........KKRRRRRRRKrRRRRRRRoOOOOOOoRRRRRRRKKrRRRRRRK',
        '..........KrKKKRKKKrrRRRRRRRoOOOOOOoRRRRRRRRKrRRRRRRK',
        '..........KrrRRKKrrrrRRRRRRRoOOOOOOoRRRRRRRRKrRRRRRRK',
        '..........KrrRRRKrrrrrrrrrrroOOOOOOorrrrrrrrKrRRRRRRK',
        '..........KrrRRRKrrrrRRRRRRRoOOOOOOoRRRRRRRRKrRRRRRRK',
        '..........KrrRRRRKrrrRRRRRRRooooooooRRRRRRRRKrRRRRRRK',
        '..........KrrRRRRKrrrRRRRRRRRRRRRRRRRRRRRRRRKrRRRRRRK',
        '..........KrrRRRRKrrrrrrrrrrrrrrrrrrrrrrrrrrKrRRRRRRK',
        '..........KDDDDDDDKKKRRRRRRRRRRRRRRRRRRRRRRKKDDDDDDDK',
        '..........KDDDDDDDKrrKKKKKKKKKKKKKKKKKKKKKKrKDDDDDDDK',
        '..........KDDDDDDDKOOOOOOOOOOOOOOOOOOOOOOOOOKDDDDDDDK',
        '..........KDDDDDDDKrrrrrrrrrrrrrrrrrrrrrrrrrKDDDDDDDK',
        '..........KKKKKKKKKrrrrrrrrrrrrrrrrrrrrrrrrrKKKKKKKKK',
        '..................KKKKKKKKKKKKKKKKKKKKKKKKKKKK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KhhhhhhhhK...KhhhhhhhhK',
        '....................KhhhhhhhhK...KhhhhhhhhK',
        '....................KhhhhhhhhK...KhhhhhhhhK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KrRRRRRRRK...KrRRRRRRRK',
        '....................KKKKKKKKKK...KKKKKKKKKK',
        '....................KhhhhhhhhhK..KhhhhhhhhhK',
        '...................KDDDDDDDDDDDKKDDDDDDDDDDDK',
        '...................KDDDDDDDDDDDKKDDDDDDDDDDDK',
        '...................KDDDDDDDDDDDKKDDDDDDDDDDDK',
        '...................KDDDDDDDDDDDKKDDDDDDDDDDDK',
        '....................KDDDDDDDDDK..KDDDDDDDDDK',
        '.....................KKKKKKKKK....KKKKKKKKK',
    ],
    attack: {
        22: '.........KRRRRRRRRRRRKRRRRRRRRRRRRRRRRRRRKRRRRRRRRRRRK',
        23: '..........KRRRRRRRRRKRRRRRRRooooooooRRRRRRKRRRRRRRRRK',
        24: '..........KRRRRRRRRRKrrrrrrroOOOOOOorrrrrrKRRRRRRRRRK',
        25: '..........KKRRRRRRRKrRRRRRRRoOOOOOOoRRRRRRRKKKKKKKKKKKKKKKKKKK',
        26: '..........KrKKKRKKKrrRRRRRRRoOOOOOOoRRRRRRRRKRRRRRRRRRRRDDDDDK',
        27: '..........KrrRRKKrrrrRRRRRRRoOOOOOOoRRRRRRRRKRRRRRRRRRRRDDDDDK',
        28: '..........KrrRRRKrrrrrrrrrrroOOOOOOorrrrrrrrKRRRRRRRRRRRDDDDDK',
        29: '..........KrrRRRKrrrrRRRRRRRoOOOOOOoRRRRRRRRKRRRRRRRRRRRDDDDDK',
        30: '..........KrrRRRRKrrrRRRRRRRooooooooRRRRRRRRKRRRRRRRRRRRDDDDDK',
        31: '..........KrrRRRRKrrrRRRRRRRRRRRRRRRRRRRRRRRKKKKKKKKKKKKKKKKKK',
        32: '..........KrrRRRRKrrrrrrrrrrrrrrrrrrrrrrrrrrrrK',
        33: '..........KDDDDDDDKKKRRRRRRRRRRRRRRRRRRRRRRKKK',
        34: '..........KDDDDDDDKrrKKKKKKKKKKKKKKKKKKKKKKrrK',
        35: '..........KDDDDDDDKOOOOOOOOOOOOOOOOOOOOOOOOOOK',
        36: '..........KDDDDDDDKrrrrrrrrrrrrrrrrrrrrrrrrrrK',
        37: '..........KKKKKKKKKrrrrrrrrrrrrrrrrrrrrrrrrrrK',
    },
};

// --- Anchor: marinheiro ciborgue com âncora e corrente (tanque) ---
pixelCharacters.anchor = {
    size: 64,
    palette: { K: OUTLINE, N: '#1d2b4a', n: '#131c33', W: '#e8eef8', w: '#2f4f8f', C: '#f2f2f2', c: '#1a1a1a', S: '#e0a87e', s: '#b07a55', B: '#8a5a35', b: '#6b4426', I: '#8a94a8', i: '#4a5266', L: '#c0c8d8', E: '#3ff6ff' },
    idle: [
        '',
        '.......................KKKKKKKKKKKKKKKKK',
        '.......................KCCCCCCCCCCCCCCCK',
        '.....................KKCCCCCCCCCCCCCCCCCKK',
        '.....................KcccccccccccccccccccK',
        '.....................KKKKKKKKKKKKKKKKKKKKKKKKKK',
        '........................KSSSSSSSSSSSKKKKKKKKKKK',
        '.......................KsSSSSSSSSSSSSSSSK',
        '......................KssSSSSSSSSSSSSSSSSK.........KKK',
        '......................KssSSSSSSSSSSSEEESSK........KIIIK',
        '......................KssSSSSSSSSSSSEEESSK.......KI...IK',
        '......................KssSSSSSSSSSSSEEESSK.......KI...IK',
        '.....................KsssSSSSSSSSSSSSSSSSSK......KI...IK',
        '......................KssSSSSSSSSSSSSSSSsK........KIIIK',
        '......................KssSSSSSSSSSSSSSSSSK.........KKK',
        '......................KBBbBBBbBBBbBBBbBBBK.........KIK',
        '......................KBbBBBbBBBbBBBbBBBbK.........KIK',
        '................K......KBBBbBBBbBBBbBBBbK.....K....KIK',
        '.............KKKNKKK....KBbBBBbBBBbBBBbK...KKKNKKKKKKKKKKK',
        '............KNNNNNNNK....KBBBbBBBbBBBbK...KNNNNKIIIIIIIIIK',
        '...........KNNNNNNNNNKKKKKKKKBBBbBBKKKKKKKNNNNNKKKKKKKKKKK',
        '...........KNNNNNNNNNKNNNnwKsKKKKKKsKwnNNKNNNNNNNNNKIK',
        '..........KNNNNNNNNNNNKNNnWKKKKKKKKKKWnNKNNNKKKKKKKKIK',
        '..........KKNNNNNNNNNKNNNnWWWWWWWWWWWWnNNKNNKnNNNNKKIK',
        '..........KKNNNNNNNNNKNNNnwwwwwwwwwwwwnNNKNNKnNNNNKKIK',
        '..........KnKNNNNNNNKNNNNnWWWWWWWWWWWWnNNNKNKnNNNNKKIK',
        '..........KnNKKKNKKKnNNNNnWWWWWWWWWWWWnNNNNKKnNNNNKKIK',
        '..........KnNNNNKnnnnNNNNnwwwwwwwwwwwwnNNNNNKnNNNNKKIK',
        '..........KnNNNNKnnnnNNNNnWWWWWWWWWWWWnNNNNNKnNNNNKKIK',
        '..........KnNNNNKnnnnNNNNnWWWWWWWWWWWWnNNNNNKnNNNNKKIK',
        '..........KnNNNNKnnnnNNNNnwwwwwwwwwwwwnNNNNNKnNNNNKKIK',
        '..........KnNNNNKnnnnNNNNnWWWWWWWWWWWWnNNNNNKnNNNNKKIK',
        '..........KnNNNNKnnnnNNNNnWWWWWWWWWWWWnNNNNNKnNNNNKKIK',
        '..........KnNNNNKnnnnNNNNnwwwwwwwwwwwwnNNNNNKnNNNNKKIK',
        '..........KSSSSSKnnnnNNNNnWWWWWWWWWWWWnNNNNNKSSSSSKKIK',
        '..........KSSSSSSKnnnnnnnnnnnnnnnnnnnnnnnnnnKSSSSSKKIK',
        '..........KSSSSSSKnnnnnnnnnnnnnnnnnnnnnnnnnnKSSSSSKKIK',
        '..........KKKKKKKKKKnnnnnnnnnnnnnnnnnnnnnnnnKKKKKKKKIK',
        '....................KKKKKKKKKKKKKKKKKKKKKKKK.......KIK',
        '....................KKnnnnnnnK...KKnnnnnnnK........KIK',
        '....................KKnnnnnnnK...KKnnnnnnnK........KIK',
        '....................KKnnnnnnnK...KKnnnnnnnKKKK.....KIK.....KKKK',
        '....................KKnnnnnnnK...KKnnnnnnnKLLK.....KIK.....KLLK',
        '....................KKnnnnnnnK...KKnnnnnnnKLLK.....KIK.....KLLK',
        '....................KKnnnnnnnK...KKnnnnnnnKLLK.....KIK.....KLLK',
        '....................KKnnnnnnnK...KKnnnnnnnKLLK.....KIK.....KLLK',
        '....................KNNNNNNNNK...KNNNNNNNNKKKKK....KIK....KKKKK',
        '....................KNNNNNNNNK...KNNNNNNNNK.KIK....KIK....KIK',
        '....................KNNNNNNNNK...KNNNNNNNNK.KIK....KIK....KIK',
        '....................KKnnnnnnnK...KKnnnnnnnK..KIK...KIK...KIK',
        '....................KKnnnnnnnK...KKnnnnnnnK..KKIKK.KIK.KKIKK',
        '....................KKnnnnnnnK...KKnnnnnnnK....KIIKKKKKIIK',
        '....................KKnnnnnnnK...KKnnnnnnnK.....KKKKIKKKK',
        '....................KKnnnnnnnK...KKnnnnnnnK.........K',
        '....................KKnnnnnnnK...KKnnnnnnnK',
        '....................KKnnnnnnnK...KKnnnnnnnK',
        '....................KKKKKKKKKK...KKKKKKKKKK',
        '....................KNNNNNNNNNK..KNNNNNNNNNK',
        '...................KcccccccccccKKcccccccccccK',
        '...................KcccccccccccKKcccccccccccK',
        '...................KcccccccccccKKcccccccccccK',
        '...................KcccccccccccKKcccccccccccK',
        '....................KcccccccccK..KcccccccccK',
        '.....................KKKKKKKKK....KKKKKKKKK',
    ],
    attack: {
        8: '......................KssSSSSSSSSSSSSSSSSK',
        9: '......................KssSSSSSSSSSSSEEESSK',
        10: '......................KssSSSSSSSSSSSEEESSK',
        11: '......................KssSSSSSSSSSSSEEESSK',
        12: '.....................KsssSSSSSSSSSSSSSSSSSK',
        13: '......................KssSSSSSSSSSSSSSSSsK',
        14: '......................KssSSSSSSSSSSSSSSSSK',
        15: '......................KBBbBBBbBBBbBBBbBBBK',
        16: '......................KBbBBBbBBBbBBBbBBBbK',
        17: '................K......KBBBbBBBbBBBbBBBbK.....K',
        18: '.............KKKNKKK....KBbBBBbBBBbBBBbK...KKKNKKK',
        19: '............KNNNNNNNK....KBBBbBBBbBBBbK...KNNNNNNNK...LLLL',
        20: '...........KNNNNNNNNNKKKKKKKKBBBbBBKKKKKKKNNNNNNNNNK..LLLL',
        21: '...........KNNNNNNNNNKNNNnwKsKKKKKKsKwnNNKNNNNNNNNNK..LLLL',
        22: '..........KNNNNNNNNNNNKNNnWKKKKKKKKKKWnNKNNNNNNNNNNNK.LLLLKK',
        23: '..........KKNNNNNNNNNKNNNnWWWWWWWWWWWWnNNKNNNNNNNNNK....KKIIK',
        24: '..........KKNNNNNNNNNKNNNnwwwwwwwwwwwwnNNKNNNNNNNNKKK.....KKIK',
        25: '..........KnKNNNNNNNKNNNNnWWWWWWWWWWWWnNNNKNNNNNNNKIK.......KIK',
        26: '..........KnNKKKNKKKnNNNNnWWWWWWWWWWWWnNNNKKKKKKKKKIK.......KIK',
        27: '..........KnNNNNKnnnnNNNNnwwwwwwwwwwwwnNNNKNNNSSK.KIK........KK',
        28: '..........KnNNNNKnnnnNNNNnWWWWWWWWWWWWnNNNKNNNKKKKKIKKKKKKKKKKK',
        29: '..........KnNNNNKnnnnNNNNnWWWWWWWWWWWWnNNNKNNNKIIIKIKIIIIIIIIKIK',
        30: '..........KnNNNNKnnnnNNNNnwwwwwwwwwwwwnNNNKNNNKKKKKIKKKKKKKKKKK',
        31: '..........KnNNNNKnnnnNNNNnWWWWWWWWWWWWnNNNKNNNSSK.KIK........KK',
        32: '..........KnNNNNKnnnnNNNNnWWWWWWWWWWWWnNNNKKKKKKK.KIK.......KIK',
        33: '..........KnNNNNKnnnnNNNNnwwwwwwwwwwwwnNNNNNNNNK..KIK.......KIK',
        34: '..........KSSSSSKnnnnNNNNnWWWWWWWWWWWWnNNNNNNNNK..KKK.....KKIK',
        35: '..........KSSSSSSKnnnnnnnnnnnnnnnnnnnnnnnnnnnnK.........KKIIK',
        36: '..........KSSSSSSKnnnnnnnnnnnnnnnnnnnnnnnnnnnnK.......LLLLKK',
        37: '..........KKKKKKKKKKnnnnnnnnnnnnnnnnnnnnnnnnKK........LLLL',
        38: '....................KKKKKKKKKKKKKKKKKKKKKKKK..........LLLL',
        39: '....................KKnnnnnnnK...KKnnnnnnnK...........LLLL',
        40: '....................KKnnnnnnnK...KKnnnnnnnK',
        41: '....................KKnnnnnnnK...KKnnnnnnnK',
        42: '....................KKnnnnnnnK...KKnnnnnnnK',
        43: '....................KKnnnnnnnK...KKnnnnnnnK',
        44: '....................KKnnnnnnnK...KKnnnnnnnK',
        45: '....................KKnnnnnnnK...KKnnnnnnnK',
        46: '....................KNNNNNNNNK...KNNNNNNNNK',
        47: '....................KNNNNNNNNK...KNNNNNNNNK',
        48: '....................KNNNNNNNNK...KNNNNNNNNK',
        49: '....................KKnnnnnnnK...KKnnnnnnnK',
        50: '....................KKnnnnnnnK...KKnnnnnnnK',
        51: '....................KKnnnnnnnK...KKnnnnnnnK',
        52: '....................KKnnnnnnnK...KKnnnnnnnK',
        53: '....................KKnnnnnnnK...KKnnnnnnnK',
    },
};

// --- Capitã Sina: pirata apostadora com faca, chapéu vermelho e papagaio no ombro ---
pixelCharacters.sina = {
    size: 64,
    palette: { K: OUTLINE, G: '#2e9e5b', g: '#1d6b3c', W: '#f2ead8', w: '#cfc3a6', Y: '#ffd23f', b: '#5a3418', B: '#7a4a24', R: '#d6283a', r: '#8f1424', S: '#f0c09a', s: '#c98f6a', H: '#4a1f14', h: '#2e130c', E: '#1a1024', P: '#3b2a20', p: '#2a1d16', D: '#2a1a12', d: '#5a3a24', M: '#d8e0ea', A: '#2f7bff', a: '#1a4fb0', y: '#ffe34a', O: '#ffb020' },
    idle: [
        '',
        '.............................KKKKKKK',
        '..........................KKKRRRRRRRKKK',
        '.........................KrRRRRRRRRRRRRK',
        '...............K........KrrRRRRRRRRRRRRRK........K',
        '...............KK.......KrrRRRRRRRRRRRRRK.......KK',
        '...............KrK.....KKKKKKKKKKKKKKKKKKK.....KrK',
        '.............KKKrRKKKKKRRRRRRRRRRRRRRRRRRRKKKKKRrK',
        '............KAAAKRRKrrRRRRRRRRRRRRRRRRRRRRRRRKRRrK',
        '...........KAAAEAKKKKKRRRRRRRRRRRRRRRRRRRRRKKKKKKK',
        '...........KAAAAAKOKKKKYYYYYYYYYYYYYYYYYYYKKKKK',
        '...........KAAAAAKK....KKKKKKKKKKKKKKKKKKK',
        '...........KKAAAKK.....KHHsssSSSSSSSSSSSSK',
        '..........KAAKKKKK.....KHHsssSSSSSSSSEESSK',
        '..........KAAAAAK...KKKHHHsssSSSSSSSSEESSSK',
        '.........KAAAAAAAK.KHHHKHHsssSSSSSSSSEESSK',
        '.........KAAAAyyyKKhHHHKHHsssSSSSSSSSSSSSK',
        '.........KAAAAyyyKKhHHHKHHsssSSSSSSSSSSSSK',
        '.........KAAAAyyyKhhHHHHKHsssSSSSSSSSSSSK',
        '.........KAAAAyyyKhhHHHHKHsssSSSSSSSrrrSK.....K',
        '..........KAAAyyKKKKHHHHHKsssSSSSSSSSSSK...KKKYKKK',
        '..........KAAAyyKYYYKHHHHHKKsSSSSSSSSKK...KYYYYYYYK',
        '.........KKKKAKKGGGGGKKKKKKKKKKKSKKKKKKKKKGGGGGGGGGK',
        '.........KaKGKGGGGGGGKGGGGGgKKKKKKKKgGGGGKGGGGGGGGGK',
        '........KaaKGGGGGGGGGGKGGGYgWWWWWWWWgYGGKGGGKKKKKKKGK',
        '........KaaKGGGGGGGGGKGGGGGgWWwwwwWWgGGGGKGGKgGGGGKK',
        '........KaaKGGGGGGGGGKGGGGGgWWWWWWWWgGGGGKGGKgGGGGKK',
        '.......KaaaKKGGGGGGGKGGGGGYgWWWWWWWWgYGGGGKGKgGGGGK',
        '.......KaaKKgKKKGKKKgGGGGGGgWWwwwwWWgGGGGGGKKgGGGGK',
        '......KaaaKKgGGGKggggGGGGGGgWWWWWWWWgGGGGGGGKgGGGGK',
        '......KaaaKKgGGGKggggGGGGGYgWWWWWWWWgYGGGGGGKgGGGGK',
        '......KaaK.KgGGGKggggGGGGGGgWWwwwwWWgGGGGGGGKgGGGGK',
        '......KaaK.KgGGGKggggGGGGGGgWWWWWWWWgGGGGGGGKgGGGGK',
        '......KKK..KgGGGKggggGGGGGGgWWWWWWWWgGGGGGGGKgGGGGK',
        '...........KgGGGKbbbbbbbbbbbbbYYYYbbbbbbbbbbKSKKKKK',
        '...........KgGGGKbbbbbbbbbbbbbYYYYbbbbbbbbbbKSKBBBK',
        '...........KSSSSKbbbbbbbbbbbbbYYYYbbbbbbbbbbKSKBBBK',
        '...........KSSSKgKgggGGGGGGgGGGGGGGGgGGGGGGGKKKBBBK',
        '...........KKKKKgKgggGGGGGGgGGGGGGGGgGGGGGGGKKKKKKKKK',
        '...............KggKKgGGGGGGgGGGGGGGGgGGGGGGGKKKKKKKKK',
        '..............KgggggKKKKKKKKKKKKKKKKKKKKKKKKGGKKKKK',
        '..............KgggggKpPPPPPKGGGGGGKpPPPPPKGGGGKMWMK',
        '..............KgggggKpPPPPPKGGGGGGKpPPPPPKGGGGKMWMK',
        '.............KggggggKpPPPPPKGGGGGGKpPPPPPKGGGGKMWMK',
        '.............KggggggKpPPPPPKGGGGGGKpPPPPPKGGGGKMWMK',
        '.............KKKKKKKKpPPPPPKKKKKKKKpPPPPPKKKKKKMWMK',
        '....................KpPPPPPK......KpPPPPPK....KMWMK',
        '....................KpPPPPPK......KpPPPPPK....KMWMK',
        '....................KpPPPPPK......KpPPPPPK....KMWMK',
        '....................KKKKKKKK......KKKKKKKK.....KWK',
        '....................KdddddddK.....KdddddddK.....K',
        '...................KdddddddddK...KdddddddddK....K',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '...................KBBBBBBBBBK...KBBBBBBBBBK',
        '...................KDDDDDDDDDK...KDDDDDDDDDK',
        '....................KDDDDDDDK.....KDDDDDDDK',
        '.....................KKKKKKK.......KKKKKKK',
    ],
    attack: {
        24: '........KaaKGGGGGGGGGGKGGGYgWWWWWWWWgYGGKGGGGGGGGGGGKKK',
        25: '........KaaKGGGGGGGGGKGGGGGgWWwwwwWWgGGGGKGGGGGGGGGK.KK',
        26: '........KaaKGGGGGGGGGKGGGGGgWWWWWWWWgGGGGKKKKKKKKKKKKKK',
        27: '.......KaaaKKGGGGGGGKGGGGGYgWWWWWWWWgYGGGGKGGGGGSSKBBKKKKKKKKK',
        28: '.......KaaKKgKKKGKKKgGGGGGGgWWwwwwWWgGGGGGKGGGGGSSKBBKKKWWWWWWK',
        29: '......KaaaKKgGGGKggggGGGGGGgWWWWWWWWgGGGGGKGGGGGSSKBBKKKMMMMMMK',
        30: '......KaaaKKgGGGKggggGGGGGYgWWWWWWWWgYGGGGKGGGGGSSKBBKKKKKKKKK',
        31: '......KaaK.KgGGGKggggGGGGGGgWWwwwwWWgGGGGGKKKKKKKKKKKKK',
        32: '......KaaK.KgGGGKggggGGGGGGgWWWWWWWWgGGGGGGGGGGK.....KK',
        33: '......KKK..KgGGGKggggGGGGGGgWWWWWWWWgGGGGGGGGGGK.....KK',
        34: '...........KgGGGKbbbbbbbbbbbbbYYYYbbbbbbbbbbbbbK',
        35: '...........KgGGGKbbbbbbbbbbbbbYYYYbbbbbbbbbbbbbK',
        36: '...........KSSSSKbbbbbbbbbbbbbYYYYbbbbbbbbbbbbbK',
        37: '...........KSSSKgKgggGGGGGGgGGGGGGGGgGGGGGGGGGKGK',
        38: '...........KKKKKgKgggGGGGGGgGGGGGGGGgGGGGGGGGGKGK',
        39: '...............KggKKgGGGGGGgGGGGGGGGgGGGGGGGKKGGK',
        40: '..............KgggggKKKKKKKKKKKKKKKKKKKKKKKKGGGGGK',
        41: '..............KgggggKpPPPPPKGGGGGGKpPPPPPKGGGGGGGK',
        42: '..............KgggggKpPPPPPKGGGGGGKpPPPPPKGGGGGGGK',
        43: '.............KggggggKpPPPPPKGGGGGGKpPPPPPKGGGGGGGGK',
        44: '.............KggggggKpPPPPPKGGGGGGKpPPPPPKGGGGGGGGK',
        45: '.............KKKKKKKKpPPPPPKKKKKKKKpPPPPPKKKKKKKKKK',
        46: '....................KpPPPPPK......KpPPPPPK',
        47: '....................KpPPPPPK......KpPPPPPK',
        48: '....................KpPPPPPK......KpPPPPPK',
        49: '....................KKKKKKKK......KKKKKKKK',
        50: '....................KdddddddK.....KdddddddK',
        51: '...................KdddddddddK...KdddddddddK',
    },
};

// --- Pose de especial ---
// Gerada a partir do sprite parado: recorta o braço da frente (e a arma, se estiver nele)
// e cola mais para cima, como se o personagem erguesse o braço para soltar o poder.
// area: retângulo recortado (colunas x0..x1-1, linhas y0..y1-1); lift: quantas linhas sobe.
function raisedPose(rows, { x0, x1, y0, y1, lift }, size = SPRITE_SIZE) {
    const grid = Array.from({ length: size }, (_, y) => (rows[y] || '').padEnd(size, '.').split(''));
    const out = grid.map(row => row.slice());
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out[y][x] = '.';
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const c = grid[y][x];
        if (c !== '.' && y - lift >= 0) out[y - lift][x] = c;
    }
    return out.map(row => row.join('').replace(/\.+$/, ''));
}

// Área do braço (e arma) de cada personagem para a pose de especial
const SPECIAL_POSE = {
    titan: { x0: 22, x1: 28, y0: 10, y1: 20, lift: 8 },
    spark: { x0: 22, x1: 32, y0: 10, y1: 17, lift: 7 },
    hades: { x0: 22, x1: 28, y0: 10, y1: 18, lift: 8 },
    jack: { x0: 42, x1: 64, y0: 22, y1: 58, lift: 16 }, // grade 64x64
    kaze: { x0: 42, x1: 56, y0: 18, y1: 64, lift: 16 }, // grade 64x64
    kenji: { x0: 22, x1: 27, y0: 10, y1: 17, lift: 7 },
    craque: { x0: 22, x1: 27, y0: 10, y1: 17, lift: 7 },
    akane: { x0: 42, x1: 56, y0: 18, y1: 64, lift: 16 }, // grade 64x64
    fenris: { x0: 40, x1: 58, y0: 20, y1: 64, lift: 16 }, // grade 64x64
    flora: { x0: 22, x1: 27, y0: 10, y1: 17, lift: 7 },
    nyx: { x0: 22, x1: 27, y0: 10, y1: 17, lift: 7 },
    mamba: { x0: 22, x1: 32, y0: 10, y1: 16, lift: 6 },
    gear: { x0: 22, x1: 27, y0: 10, y1: 18, lift: 7 },
    roxy: { x0: 22, x1: 27, y0: 10, y1: 18, lift: 7 },
    weaver: { x0: 44, x1: 52, y0: 22, y1: 38, lift: 15 }, // grade 64x64
    aegis: { x0: 43, x1: 58, y0: 15, y1: 56, lift: 8 }, // grade 64x64
    rhino: { x0: 44, x1: 53, y0: 22, y1: 38, lift: 14 }, // grade 64x64
    anchor: { x0: 43, x1: 61, y0: 7, y1: 54, lift: 6 }, // grade 64x64
    sina: { x0: 42, x1: 56, y0: 24, y1: 52, lift: 12 }, // grade 64x64
};

// Linha onde as pernas se separam em cada sprite (abaixo do short, da saia ou do casaco)
const LEG_START = {
    titan: 23, spark: 19, hades: 22, jack: 42, kaze: 40, kenji: 21, craque: 20, akane: 38,
    fenris: 40, zarek: 40, celestia: 30, flora: 23, nyx: 22, mamba: 20, gear: 20, roxy: 19, weaver: 37, aegis: 37, rhino: 37, anchor: 37, sina: 46,
};
for (const [type, row] of Object.entries(LEG_START)) pixelCharacters[type].legStart = row;
for (const [type, area] of Object.entries(SPECIAL_POSE)) {
    pixelCharacters[type].special = raisedPose(pixelCharacters[type].idle, area, pixelCharacters[type].size);
}
// Zarek e Celestia: foice e cajado já vão até o topo do quadro; a pose de especial é o braço estendido
for (const type of ['zarek', 'celestia']) {
    pixelCharacters[type].special = spriteVariant(pixelCharacters[type].idle, pixelCharacters[type].attack);
}

// Monta a função de desenho de cada personagem (os sprites são gerados na primeira vez que aparecem).
// Quadro escolhido: golpe (se estiver acertando), passo da caminhada (se estiver andando) ou parado.
// fighter.spriteFrame pode forçar 'attack' ou 'idle' (usado pelas animações de golpe do jogo).
function makePixelArt(type) {
    const def = pixelCharacters[type];
    const spritesByForm = {};
    return (ctx, x, y, width, height, fighter) => {
        // Personagens com formas (Zarek) trocam a paleta conforme a forma atual
        const form = def.forms ? ((fighter && fighter.zarekForm) || 'normal') : 'normal';
        if (!spritesByForm[form]) {
            const palette = def.forms ? { ...def.palette, ...def.forms[form] } : def.palette;
            // Sprites em 32x32 são ampliados para 64x64; os desenhados em 64 entram direto
            const hd = !def.size;
            const size = hd ? HD_SIZE : def.size;
            const frame = rows => hd ? upscaleRows(rows) : rows;
            const legStart = (def.legStart || 20) * (hd ? 2 : 1);
            const idle = buildSprite(frame(def.idle), palette, `${type} idle`, size);
            spritesByForm[form] = {
                idle,
                attack: buildSprite(frame(spriteVariant(def.idle, def.attack)), palette, `${type} attack`, size),
                walk: buildWalkFrames(idle, legStart, size),
                special: buildSprite(frame(def.special || def.idle), palette, `${type} special`, size),
            };
        }
        const sprites = spritesByForm[form];
        let sprite = sprites.idle;
        if (fighter && fighter.spriteFrame === 'attack') sprite = sprites.attack;
        else if (fighter && fighter.spriteFrame === 'special') sprite = sprites.special;
        else if (fighter && fighter.spriteFrame !== 'idle' && fighter.walkFrame !== null && fighter.walkFrame !== undefined) sprite = sprites.walk[fighter.walkFrame];
        ctx.imageSmoothingEnabled = false;
        // Sprite tem o dobro da largura da caixa: metade da caixa sobra de cada lado
        ctx.drawImage(sprite, x - width / 2, y, width * 2, height);
    };
}

// Mapa tipo de personagem -> função de desenho (usado pelo jogo e pelas miniaturas)
const characterArt = {};
for (const type of Object.keys(pixelCharacters)) {
    characterArt[type] = makePixelArt(type);
}

function drawThumbnails() {
    for (const [name, drawFn] of Object.entries(characterArt)) {
        const canvas = document.getElementById(`${name}-thumbnail`);
        // Retrato: só cabeça e tronco (o sprite é desenhado maior e cortado embaixo)
        canvas.width = 96;
        canvas.height = 96;
        canvas.getContext('2d').imageSmoothingEnabled = false;
        drawFn(canvas.getContext('2d'), 8, 4, 80, 160, null);
    }
}
