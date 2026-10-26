// --- Personagens em Pixel Art ---
// Cada sprite é uma grade de 32x32 caracteres. Cada caractere é uma cor da paleta ('.' = transparente).
// Linhas mais curtas que 32 são completadas com '.' à direita.
// O corpo ocupa as colunas 8 a 23 (a "caixa" do lutador); o resto é espaço para braços, armas e capas.
// O personagem sempre é desenhado virado para a direita; o jogo espelha quando precisa.
// Cada personagem tem dois quadros: 'idle' (parado) e 'attack' (golpe).
const SPRITE_SIZE = 32;
const OUTLINE = '#1a1024';

function buildSprite(rows, palette, name) {
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const sctx = canvas.getContext('2d');
    rows.forEach((row, y) => {
        if (row.length > SPRITE_SIZE) console.warn(`Sprite ${name}: linha ${y} tem ${row.length} colunas (máximo ${SPRITE_SIZE})`);
        for (let x = 0; x < row.length; x++) {
            const color = palette[row[x]];
            if (!color) continue;
            sctx.fillStyle = color;
            sctx.fillRect(x, y, 1, 1);
        }
    });
    return canvas;
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
    palette: {
        K: OUTLINE,
        O: '#ff8a1f', o: '#c4520f',                          // abóbora
        g: '#3fa34d',                                        // talo
        Y: '#ffe34a',                                        // brilho do rosto
        H: '#241b33', h: '#3a2d52',                          // moletom
        P: '#1b1626',                                        // calça
        R: '#e0263a',                                        // tênis
        B: '#c8d0e0', b: '#6b4a2b',                          // foice
    },
    idle: [
        '...............KK',
        '..............KggK',
        '..........KKKKKggKKKKK',
        '.........KOOOoOOOOOOoOK',
        '........KOOOoOOOOOOOoOOK',
        '........KOOoKYYKOKYYKoOK',
        '........KOOoOKKOOOKKOoOK',
        '........KOoOOOOYYOOOOoOK',
        '........KOoKYKYKYKYKYoOK',
        '........KoOOKYKYKYKYKOoK',
        '.........KooOOOOOOOOooK',
        '..........KKKKKKKKKKKK',
        '......KHHHKhHHHHHHHHHKHHHK',
        '......KHHHKhHHHHHHHHHKHHhK',
        '......KHHhKhHHHHHHHHHKHHhK',
        '......KHHhKhHHHHHHHHHKHHhK',
        '......KHHhKhHhhhhhhHHKHHhK',
        '......KOOOKhHHHHHHHHHKOOOK',
        '.......KKKHHHHHHHHHHHKKbK',
        '........KPPPPPPPPPPPPKbK',
        '........KPPPPPKKPPPPPKbK',
        '.........KPPPK..KPPPK.KbK',
        '.........KPPPK..KPPPK.KbBBBBK',
        '.........KPPPK..KPPPK.KKKKKBBK',
        '.........KPPPK..KPPPK......KK',
        '.........KPPPK..KPPPK',
        '.........KPPPK..KPPPK',
        '.........KPPPK..KPPPK',
        '.........KPPPK..KPPPK',
        '.........KPPPK..KPPPK',
        '........KRRRRK.KRRRRRK',
        '........KKKKKK.KKKKKKK',
    ],
    attack: {
        11: '..........KKKKKKKKKKKK.......KBK',
        12: '......KHHHKhHHHHHHHHHK......KBBK',
        13: '......KHHHKhHHHHHHHHHKHHHObbbBBK',
        14: '......KHHhKhHHHHHHHHHKKKKKKKKKK',
        17: '......KOOOKhHHHHHHHHHK',
        18: '.......KKKHHHHHHHHHHHK',
        19: '........KPPPPPPPPPPPPK',
        20: '........KPPPPPKKPPPPPK',
        21: '.........KPPPK..KPPPK',
        22: '.........KPPPK..KPPPK',
        23: '.........KPPPK..KPPPK',
        24: '.........KPPPK..KPPPK',
    },
};

// --- Genji: ninja cibernético com katana ---
pixelCharacters.genji = {
    palette: {
        K: OUTLINE,
        M: '#9aa6b8', m: '#5f6a80',                          // capacete
        V: '#39ff88',                                        // visor
        D: '#2b2f3d', d: '#1c1f29',                          // traje / partes robóticas
        S: '#f2b98f', s: '#c47f5a',                          // pele
        O: '#ff8a1f',                                        // luzes
        A: '#7fffd4', a: '#3fd6b0', b: '#3a2d52',            // katana
    },
    idle: [
        '............KKKKKKK',
        '...........KMMMMMMMK',
        '..........KMMMMMMMMMK',
        '..........KmMMMMMMMMMK',
        '..........KmMVVVVVVVVK',
        '..........KmMMMMMMMMMK',
        '..........KmmMMMKMMMK',
        '...........KmmmmmmmK',
        '............KdddddK',
        '.......KKKKDDDDDDDDDKKKKK',
        '......KSSsKSSSSDDDDDDKDDDK',
        '......KSSsKSSSSDODDDDKDDdK',
        '......KSSsKSSsSDDDDDDKDDdK',
        '......KSSsKSSSSDODDDDKDDdK',
        '......KSSsKsSSSDDDDDDKDDdK',
        '......KSSSKSSSSDODDDDKDDDK',
        '......KKKKKddddddddddKbbK',
        '........KDDDDDDDDDDDDKAK',
        '........KDDDDDDDDDDDDKAK',
        '........KDDDDDKKDDDDDKAK',
        '.........KSSsK..KDDdK.KAK',
        '.........KSSsK..KDDdK.KAK',
        '.........KSSsK..KDDdK.KAK',
        '.........KSSsK..KDDdK.KAK',
        '.........KSSsK..KDDdK.KAK',
        '.........KSSsK..KDDdK.KAK',
        '.........KSSsK..KDDdK.KaK',
        '.........KSSsK..KDDdK.KK',
        '.........KSSsK..KDDdK',
        '.........KSSsK..KDDdK',
        '........KddddK.KdddddK',
        '........KKKKKK.KKKKKKK',
    ],
    attack: {
        11: '......KSSsKSSSSDODDDDKKKKKKKKKKK',
        12: '......KSSsKSSsSDDDDDDKDDDbbAAAAK',
        13: '......KSSsKSSSSDODDDDKKKKKKKaaaK',
        14: '......KSSsKsSSSDDDDDDK',
        15: '......KSSSKSSSSDODDDDK',
        16: '......KKKKKddddddddddK',
        17: '........KDDDDDDDDDDDDK',
        18: '........KDDDDDDDDDDDDK',
        19: '........KDDDDDKKDDDDDK',
        20: '.........KSSsK..KDDdK',
        21: '.........KSSsK..KDDdK',
        22: '.........KSSsK..KDDdK',
        23: '.........KSSsK..KDDdK',
        24: '.........KSSsK..KDDdK',
        25: '.........KSSsK..KDDdK',
        26: '.........KSSsK..KDDdK',
        27: '.........KSSsK..KDDdK',
    },
};

// --- Ryu: lutador de quimono ---
pixelCharacters.ryu = {
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

// --- Don Lorenzo: atacante de futebol ---
pixelCharacters.lorenzo = {
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

// --- Malenia: a Espada de Miquella ---
pixelCharacters.malenia = {
    palette: {
        K: OUTLINE,
        A: '#d4a64a', a: '#8f6a2a', l: '#ffe08a',            // armadura dourada
        R: '#e8344a', r: '#a01c32',                          // cabelo
        S: '#f2b98f', s: '#c47f5a',                          // pele
        t: '#5a3a2a', T: '#7a3040',                          // cinto e saia
        B: '#f0e6c0',                                        // espada
    },
    idle: [
        '............KKKKKKK',
        '........KK.KAAAlAAAK',
        '.......KlaKAAAAAAAAAK',
        '......KlaaKAAAAAAAAAAK',
        '.......KaKKAKKKKKKKAK',
        '........KRRAAAAAAAAAK',
        '.......KRRRKAAAAAAAK',
        '......KRRrRRKSSSSSK',
        '.....KRRrRRRKKKKKK',
        '...KRRKKKKAAlAAAAAAKKKKK',
        '...KRrKSSSKAAAAAAAAAAKAAAK',
        '...KRrKSSsKAalAAAAlaAKAlAK',
        '...KRRKSSsKAaAAAAAAaAKAaAK',
        '...KrRKSSsKaAAAAAAAAaKAaAK',
        '...KRrKSSSKttttttttttKAAAK',
        '..KRRrKKKKTTTTTTTTTTTKaaaK',
        '..KrRRK.KTTTTTTTTTTTTKBK',
        '..KRRrK.KTTTTrTTTTTTTKBK',
        '..KRRK..KTTTTTKKTTTTTKBK',
        '...KK....KAAaK..KAAaK.KBK',
        '.........KAAaK..KAAaK.KBK',
        '.........KAAaK..KAAaK.KBK',
        '.........KAAaK..KAAaK.KBK',
        '.........KAAaK..KAAaK.KBK',
        '.........KAAaK..KAAaK.KBK',
        '.........KAAaK..KAAaK.KK',
        '.........KAAaK..KAAaK',
        '.........KAAaK..KAAaK',
        '.........KAAaK..KAAaK',
        '.........KAlaK..KAlaK',
        '........KaaaaK.KaaaaaK',
        '........KKKKKK.KKKKKKK',
    ],
    attack: {
        11: '...KRrKSSsKAalAAAAlaAKKKKKKKKKKK',
        12: '...KRRKSSsKAaAAAAAAaAKAAAaBBBBBK',
        13: '...KrRKSSsKaAAAAAAAAaKKKKKKKKKKK',
        14: '...KRrKSSSKttttttttttK',
        15: '..KRRrKKKKTTTTTTTTTTTK',
        16: '..KrRRK.KTTTTTTTTTTTTK',
        17: '..KRRrK.KTTTTrTTTTTTTK',
        18: '..KRRK..KTTTTTKKTTTTTK',
        19: '...KK....KAAaK..KAAaK',
        20: '.........KAAaK..KAAaK',
        21: '.........KAAaK..KAAaK',
        22: '.........KAAaK..KAAaK',
        23: '.........KAAaK..KAAaK',
        24: '.........KAAaK..KAAaK',
        25: '.........KAAaK..KAAaK',
    },
};

// --- Maliketh: a Besta Presa nas Sombras ---
pixelCharacters.maliketh = {
    palette: {
        K: OUTLINE,
        D: '#2a2533', d: '#18141f',                          // armadura
        M: '#f0ece4', m: '#b8b0a8',                          // juba
        E: '#ff2a2a',                                        // olho
        G: '#8f6a2a',                                        // detalhes dourados
        B: '#ff2a3a', b: '#a0101e',                          // lâmina
    },
    idle: [
        '..........KK.KK.KK',
        '.........KMMKMMKMMK',
        '........KMMMMMMMMMMK',
        '.......KMMmMMMMMMMMMK',
        '......KMMmMKDDDDDDMMK',
        '......KMmMMKDDDDEDDMK',
        '.....KMMmMMKdDDDDDDKK',
        '.....KMmMMMMMKKKKKMMK',
        '....KMMmMMmMMMMMMMMMMK',
        '....KMmMMMmMMMMMMMMmMMK',
        '....KMmDDDKdDDDDDDDDDKDDDK',
        '....KMmDdDKdDGGGGGGDDKDdDK',
        '....KmMDdDKdDDDDDDDDDKDdDK',
        '....KMmDdDKdDDDDDDDDDKDdDK',
        '....KMMDdDKdDDGGGGDDDKDdDK',
        '....KmMDDDKdDDDDDDDDDKDDDK',
        '....KKKdddKdDDDDDDDDDKdddK',
        '.......KKKdddddddddddKKKK',
        '........KDDDDDDDDDDDDKBbK',
        '........KDDDDDKKDDDDdKBbK',
        '.........KDDdK..KDDdK.KBbK',
        '.........KDDdK..KDDdK.KBbK',
        '.........KDDdK..KDDdK.KBbK',
        '.........KDDdK..KDDdK.KBbK',
        '.........KDDdK..KDDdK.KBbK',
        '.........KDDdK..KDDdK.KBbK',
        '.........KDDdK..KDDdK.KBK',
        '.........KDDdK..KDDdK.KK',
        '.........KDDdK..KDDdK',
        '.........KDDdK..KDDdK',
        '........KddddK.KdddddK',
        '........KKKKKK.KKKKKKK',
    ],
    attack: {
        11: '....KMmDdDKdDGGGGGGDDKKKKKKKKKKK',
        12: '....KmMDdDKdDDDDDDDDDKDDDBBBBBBK',
        13: '....KMmDdDKdDDDDDDDDDKKKKbbbbbbK',
        14: '....KMMDdDKdDDGGGGDDDK',
        15: '....KmMDDDKdDDDDDDDDDK',
        16: '....KKKdddKdDDDDDDDDDK',
        17: '.......KKKdddddddddddK',
        18: '........KDDDDDDDDDDDDK',
        19: '........KDDDDDKKDDDDdK',
        20: '.........KDDdK..KDDdK',
        21: '.........KDDdK..KDDdK',
        22: '.........KDDdK..KDDdK',
        23: '.........KDDdK..KDDdK',
        24: '.........KDDdK..KDDdK',
        25: '.........KDDdK..KDDdK',
        26: '.........KDDdK..KDDdK',
        27: '.........KDDdK..KDDdK',
    },
};

// --- Kayn: o ceifador das sombras, com a foice viva Rhaast ---
// Tem três formas que só trocam as cores de destaque (X/x), da lâmina (B/b) e do olho da foice (E).
pixelCharacters.kayn = {
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
        '............KKKKKK.....KKKKK',
        '...........KNnNNNNK...KBBBBBKK',
        '..........KNNNnNNNNK..KBbEBBBBK',
        '.........KNnNNNNNNNNK.KHKbbbBBBK',
        '..........KNSSSSSSSNK.KHK...KBBK',
        '..........KNSSSSSKSSK.KHK....KBK',
        '..........KnSSSSSSSSK.KHK.....KK',
        '..........KnSSSSSKKSK.KHK',
        '...........KnSSSSSSK..KHK',
        '............KAAAAK....KHK',
        '.......KKKKAAAXXAAAAKKKHK',
        '......KAAaKAAAXAAAAAAKAHAK',
        '......KAAaKAaAXAAAAaAKAHAK',
        '......KXXaKAaAAXAAAaAKXHXK',
        '......KAAaKAaAAAXAAaAKAHAK',
        '......KAAaKAaAAAAXAaAKAHAK',
        '......KSSsKxxxxxxxxxxKSHSK',
        '.......KKKAAAAAAAAAAAKKHK',
        '........KAAAAAAAAAAAAKKHK',
        '........KAAAAAKKAAAAaKKHK',
        '.........KAAaK..KAAaK.KHK',
        '.........KAAaK..KAAaK.KHK',
        '.........KAAaK..KAAaK.KHK',
        '.........KAAaK..KAAaK.KHK',
        '.........KAAaK..KAAaK.KHK',
        '.........KAAaK..KAAaK.KHK',
        '.........KAAaK..KAAaK.KHK',
        '.........KAAaK..KAAaK.KHK',
        '.........KxXxK..KxXxK.KHK',
        '.........KAAaK..KAAaK.KK',
        '........KaaaaK.KaaaaaK',
        '........KKKKKK.KKKKKKK',
    ],
    // Golpe: a foice gira para frente, com a lâmina curvando na ponta
    attack: {
        0: '............KKKKKK',
        1: '...........KNnNNNNK',
        2: '..........KNNNnNNNNK',
        3: '.........KNnNNNNNNNNK',
        4: '..........KNSSSSSSSNK',
        5: '..........KNSSSSSKSSK',
        6: '..........KnSSSSSSSSK',
        7: '..........KnSSSSSKKSK',
        8: '...........KnSSSSSSK..........KK',
        9: '............KAAAAK...........KBK',
        10: '.......KKKKAAAXXAAAAKKKKKKKKKBBK',
        11: '......KAAaKAAAXAAAAAAKAAAHHHEBBK',
        12: '......KAAaKAaAXAAAAaAKKKKKKKKbBK',
        13: '......KXXaKAaAAXAAAaAK.......KBK',
        14: '......KAAaKAaAAAXAAaAK.......KK',
        15: '......KAAaKAaAAAAXAaAK',
        16: '......KSSsKxxxxxxxxxxK',
        17: '.......KKKAAAAAAAAAAAK',
        18: '........KAAAAAAAAAAAAK',
        19: '........KAAAAAKKAAAAaK',
        20: '.........KAAaK..KAAaK',
        21: '.........KAAaK..KAAaK',
        22: '.........KAAaK..KAAaK',
        23: '.........KAAaK..KAAaK',
        24: '.........KAAaK..KAAaK',
        25: '.........KAAaK..KAAaK',
        26: '.........KAAaK..KAAaK',
        27: '.........KAAaK..KAAaK',
        28: '.........KxXxK..KxXxK',
        29: '.........KAAaK..KAAaK',
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

// Monta a função de desenho de cada personagem (os sprites são gerados na primeira vez que aparecem)
function makePixelArt(type) {
    const def = pixelCharacters[type];
    const spritesByForm = {};
    return (ctx, x, y, width, height, fighter) => {
        // Personagens com formas (Kayn) trocam a paleta conforme a forma atual
        const form = def.forms ? ((fighter && fighter.kaynForm) || 'normal') : 'normal';
        if (!spritesByForm[form]) {
            const palette = def.forms ? { ...def.palette, ...def.forms[form] } : def.palette;
            spritesByForm[form] = {
                idle: buildSprite(def.idle, palette, `${type} idle`),
                attack: buildSprite(spriteVariant(def.idle, def.attack), palette, `${type} attack`),
            };
        }
        const sprites = spritesByForm[form];
        const isStriking = fighter && fighter.isAttacking && (fighter.attackType === 'punch' || fighter.attackType === 'strong_punch');
        ctx.imageSmoothingEnabled = false;
        // Sprite tem o dobro da largura da caixa: metade da caixa sobra de cada lado
        ctx.drawImage(isStriking ? sprites.attack : sprites.idle, x - width / 2, y, width * 2, height);
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
        canvas.width = 120;
        canvas.height = 120;
        canvas.getContext('2d').imageSmoothingEnabled = false;
        drawFn(canvas.getContext('2d'), 30, 0, 60, 120, null);
    }
}
