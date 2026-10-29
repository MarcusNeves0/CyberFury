// Cybernetic Fury — configurações
// Elementos da página, estado da partida, lista de personagens, teclas e
// todos os números de balanceamento (vida, dano, custos, recargas).
// Todos os arquivos do jogo são carregados em ordem pelo index.html e compartilham estas variáveis.

// --- Configurações Iniciais ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const hubScreen = document.getElementById('hub-screen');
const selectionScreen = document.getElementById('character-selection');
const selectionTitle = document.getElementById('selection-title');
const loadingScreen = document.getElementById('loading-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const winText = document.getElementById('win-text');
const matchStatsEl = document.getElementById('match-stats');
const restartButton = document.getElementById('restart-button');
const rematchButton = document.getElementById('rematch-button');
const hud = document.getElementById('hud');

// O jogo inteiro roda num "mundo" fixo de 1280x720 e é escalado para o tamanho da tela
const WORLD_W = 1280, WORLD_H = 720;
let canvasWidth, canvasHeight, viewScale = 1;
let gameLoopId;
let gameState = 'MENU'; // MENU, SELECT, FIGHT, GAMEOVER

// --- Partida ---
// mode: '1v1' | '2v2' | '3v3'; vs: 'ai' (você vs IA) | 'pvp' (P1 vs P2 no mesmo teclado)
// inputs: cada humano joga no teclado ou num controle (index = qual controle o navegador detectou)
const match = {
    mode: '1v1', vs: 'ai', map: 'random', picks: [],
    inputs: { p1: { type: 'keyboard', index: null, name: '' }, p2: { type: 'keyboard', index: null, name: '' } },
};
const teamSizeOf = mode => Number(mode[0]);
const TEAM_COLORS = ['#00ffff', '#ff4dff'];
const TEAM_NAMES = ['TIME CIANO', 'TIME ROSA'];

const CHARACTERS = [
    { id: 'titan', name: 'Titan' },
    { id: 'spark', name: 'Spark' },
    { id: 'hades', name: 'Hades' },
    { id: 'jack', name: 'Jack' },
    { id: 'kaze', name: 'Kaze' },
    { id: 'kenji', name: 'Kenji' },
    { id: 'craque', name: 'El Craque' },
    { id: 'akane', name: 'Akane' },
    { id: 'fenris', name: 'Fenris' },
    { id: 'zarek', name: 'Zarek' },
    { id: 'celestia', name: 'Celestia' },
    { id: 'flora', name: 'Flora' },
    { id: 'nyx', name: 'Nyx' },
    { id: 'mamba', name: 'Mamba' },
    { id: 'gear', name: 'Gear' },
    { id: 'roxy', name: 'Roxy' },
    { id: 'weaver', name: 'Weaver' },
    { id: 'aegis', name: 'Aegis' },
    { id: 'rhino', name: 'Rhino' },
    { id: 'anchor', name: 'Anchor' },
    { id: 'sina', name: 'Capitã Sina' },
];

// Teclas (cada ação aceita uma lista). Contra a IA o jogador pode andar com WASD ou setas;
// no P1 vs P2 cada um fica com um lado do teclado. Segurar o soco solta o soco forte.
const KEYMAPS = {
    solo: { up: ['w', 'arrowup'], down: ['s', 'arrowdown'], left: ['a', 'arrowleft'], right: ['d', 'arrowright'], punch: ['j'], special: ['k'], defend: ['l'] },
    p1: { up: ['w'], down: ['s'], left: ['a'], right: ['d'], punch: ['f'], special: ['g'], defend: ['h'] },
    p2: { up: ['arrowup'], down: ['arrowdown'], left: ['arrowleft'], right: ['arrowright'], punch: ['k'], special: ['l'], defend: ['ç', ';'] },
};

// Botões do controle (mapeamento padrão do navegador; num PS5: 0 = ✕, 1 = ◯, 2 = □, 3 = △, 4 = L1, 5 = R1)
// Na luta: □ soco, △/R1 especial, ◯/L1 defesa. Nos menus: ✕ confirma, ◯ volta.
const PAD_BUTTONS = { punch: [2], defend: [1, 4], special: [3, 5] };
const PAD_CONFIRM = 0, PAD_BACK = 1;
const PAD_DPAD = { up: 12, down: 13, left: 14, right: 15 };
const STICK_DEADZONE = 0.25;

// --- Entidades do Jogo ---
let fighters = [], aiControllers = [], particles = [], projectiles = [];
let obstacles = [], groundBalls = [];
let hazards = []; // áreas no chão que explodem depois de um aviso (Hades)
let screenShake = 0; // tremor da tela nos golpes pesados (diminui sozinho)
const DEATH_DURATION = 60; // 1 segundo caindo e sumindo
let shockwaves = []; // anéis visuais das ondas de choque do Titan
let walls = []; // Muralhas do Aegis
const TITAN_SHOCKWAVE_RADIUS = 75;
const TITAN_SHOCKWAVE_DAMAGE = 25;
let arena = { left: 0, top: 0, right: WORLD_W, bottom: WORLD_H };

const AI_DECISION_STEPS = 18;  // a IA decide a cada 18 passos (0,3 s de jogo)
const FIGHTER_RADIUS = 16;     // "pé" do lutador no chão (colisão)
const FIGHTER_HEIGHT = 64;     // altura do sprite
const MOVE_SPEED = 3.4;        // pixels por passo
const PUNCH_REACH = 46;        // alcance do soco (a partir da borda do lutador)
const BLADE_REACH = 60;        // alcance de lâminas
const STRONG_PUNCH_HOLD = 22;  // passos segurando o soco para sair o soco forte
const SPARK_CHAIN_RANGE = 340; // alcance máximo da corrente elétrica do Spark
const SPARK_CHAIN_START_DAMAGE = 4; // dano do primeiro segundo do choque (depois dobra: 4, 8, 16...)
const KAZE_PUNCH_DAMAGE = 20;   // corte da lâmina do Kaze
const KENJI_PUNCH_DAMAGE = 14;     // soco do Kenji (o combo acelera os socos)
const KENJI_MAX_COMBO_SPEED = 7;   // o combo deixa os socos até 7x mais rápidos
const BLEED_DAMAGE = 14;         // sangramento: por segundo, por acúmulo (máximo 3 acúmulos)
const AKANE_CUTS = 7;          // cortes da Dança das Sete Lâminas
const AKANE_CUT_DAMAGE = 25;   // dano de cada corte (175 no total)
const AKANE_CUT_INTERVAL = 8;  // passos entre um corte e outro (~0,13 s)
const AKANE_INTERRUPT_DAMAGE = 100; // levando isso de dano durante a dança, ela é interrompida
const HADES_RANGE = 320;       // alcance da explosão do Hades
const HADES_RADIUS = 60;       // tamanho do círculo de fogo
const HADES_WARNING_FRAMES = 36; // 0,6 s de aviso antes de explodir
const HADES_DAMAGE = 90;
const AIM_ERROR = 0.08;        // erro aleatório da mira com previsão (radianos), para não ser perfeita

// Zarek
const ZAREK_CHARGE_MAX = 200;      // barra de transformação
const ZAREK_CHARGE_ON_HIT = 4;     // ganha ao acertar
const ZAREK_CHARGE_ON_HURT = 3;    // ganha ao levar dano
const ZAREK_ULT_COST = 120;        // energia da ultimate
const ZAREK_ULT_COOLDOWN = 360;    // 6 segundos entre ultimates
const ZAREK_ULT_DURATION = 90;     // 1,5 segundo dentro do oponente
const ZAREK_ULT_RANGE = 260;       // distância máxima para entrar no oponente
const ZAREK_ULT_DAMAGE = 120;      // dano base da ultimate (forma vermelha: 3x)
const ZAREK_RED_ULT_HEAL = 0.5;    // Rubra: a ultimate cura 50% do dano causado
const ZAREK_BLUE_ULT_RANGE = 400;  // Umbral: ultimate de mais longe
const ZAREK_BLUE_SPEED = 1.15;     // Umbral: 15% mais rápido
const ZAREK_BLUE_PUNCH = 13;       // Umbral: golpes mais fortes (normal: 10 / 25)
const ZAREK_BLUE_STRONG = 30;
const ZAREK_BLUE_ULT_DAMAGE = 150; // Umbral: ultimate mais forte (normal: 120)
const ZAREK_POSSESS_SLOW = 0.5;    // possuído anda na metade da velocidade (e não usa especial)

// Healers
const CELESTIA_AURA_RADIUS = 130;     // área de cura permanente ao redor dela
const CELESTIA_HEAL_ALLY = 15;        // cura por segundo em cada aliado dentro da área
const CELESTIA_HEAL_SELF = 9;         // cura por segundo nela mesma
const CELESTIA_ULT_MULTIPLIER = 3;    // ultimate: área 3x maior
const CELESTIA_ULT_DURATION = 360;    // 6 segundos
const CELESTIA_ULT_COST = 150;
const CELESTIA_ULT_COOLDOWN = 600;    // 10 segundos
const FLORA_FLOWER_COST = 100;        // energia por flor (~1 flor a cada 3,3 s)
const FLORA_HEAL = 90;                // cura da flor num aliado
const FLORA_SELF_HEAL = 40;           // cura da flor quando volta para ela (sem aliados)
const NYX_PUNCH_DAMAGE = 12;          // garras um pouco mais fortes que um soco comum
const NYX_PUNCH_HEAL = 15;            // cada acerto manda um orbe que cura isso no aliado mais ferido
const NYX_STRONG_HEAL = 35;           // orbe do soco forte
const NYX_LINK_COST = 120;            // Laço de Sangue
const NYX_LINK_COOLDOWN = 480;        // 8 segundos
const NYX_LINK_DURATION = 180;        // 3 segundos
const NYX_LINK_RANGE = 300;           // alcance para prender o inimigo (arrebenta um pouco além)
const NYX_LINK_TICK = 10;             // a cada meio segundo: inimigo perde isso, aliado recupera isso (20/s)
// Atiradores: o golpe básico é um tiro
const SHOOTERS = ['mamba', 'gear', 'roxy'];
// Roxy: duas pistolas, adrenalina e Frenesi
const ROXY_SHOT_DAMAGE = 7;
const ROXY_DOUBLE_DAMAGE = 9;        // segurar o tiro: as duas pistolas juntas
const ROXY_FIRE_INTERVAL = 8;        // passos entre tiros (~0,13 s), antes da adrenalina
const ROXY_SPEED = 1.15;             // anda 15% mais rápido
const ROXY_HEIGHT = 0.85;            // é desenhada menor que os outros
const ROXY_ADRENALINE_PER_HIT = 0.1; // cada acerto; 1 = adrenalina máxima (+50% de velocidade de tiro)
const ROXY_ADRENALINE_HOLD = 60;     // 1 s sem acertar zera a adrenalina
const ROXY_FRENZY_COST = 120;
const ROXY_FRENZY_COOLDOWN = 480;    // 8 segundos
const ROXY_FRENZY_DURATION = 180;    // 3 segundos atirando sozinha, no dobro da velocidade
// Weaver: teia que deixa lento, sentido aranha e Puxão
const WEB_DAMAGE = 25;
const WEAVER_PUNCH_DAMAGE = 30;      // combo rápido de socos e chutes
const WEB_SLOW_DURATION = 120;        // 2 segundos com 50% da velocidade
const SPIDER_SENSE_CHANCE = 0.25;     // chance de desviar sozinho de um golpe ou tiro
const SPIDER_SENSE_COOLDOWN = 180;    // 3 segundos
const WEAVER_PULL_COST = 100;
const WEAVER_PULL_COOLDOWN = 360;     // 6 segundos
const WEAVER_PULL_RANGE = 380;
const WEAVER_PULL_SPEED = 18;         // pixels por passo enquanto o alvo é puxado
const WEAVER_PULL_DAMAGE = 35;
const WEAVER_PULL_STUN = 48;          // 0,8 s atordoado ao chegar (dá tempo de bater)
const WEAVER_KICK_DELAY = 12;         // ~0,2 s depois de puxar, chute para cima automático
const WEAVER_KICK_DAMAGE = 30;
const WEAVER_PUNCH_COOLDOWN = 16;     // combo mais rápido que o soco comum (20)
// Tanques: recebem menos dano de tudo (golpes, tiros e dano contínuo)
const TANKS = ['aegis', 'rhino', 'anchor'];
const TANK_ARMOR = 0.2;
// Aegis: escudo que segura tiros e Muralha de energia
const AEGIS_SPEED = 0.85;           // pesado: anda um pouco mais devagar
const AEGIS_PUNCH_DAMAGE = 28;      // pancada com o escudo (empurra)
const AEGIS_SHIELD_REACH = 38;      // defendendo, segura os tiros que passam na frente do escudo
const AEGIS_WALL_COST = 100;
const AEGIS_WALL_COOLDOWN = 480;    // 8 segundos
const AEGIS_WALL_DURATION = 240;    // a parede dura 4 segundos
const AEGIS_WALL_LENGTH = 150;
const AEGIS_WALL_TICK_DAMAGE = 12;  // quem encosta na Muralha leva dano a cada 0,5 s
const AEGIS_WALL_DISTANCE = 60;     // distância da parede até o Aegis
// Rhino: embalo correndo e Estouro (disparada pela arena)
const RHINO_PUNCH_DAMAGE = 24;
const RHINO_RUN_STEPS = 60;           // 1 s correndo sem parar para pegar embalo
const RHINO_RUN_SPEED = 1.25;         // com embalo: 25% mais rápido
const RHINO_RUN_BONUS = 10;           // com embalo: o próximo golpe tira +10 e empurra forte
const RHINO_CHARGE_COST = 120;
const RHINO_CHARGE_COOLDOWN = 420;    // 7 segundos
const RHINO_CHARGE_DISTANCE = 520;
const RHINO_CHARGE_SPEED = 12;
const RHINO_CHARGE_DAMAGE = 90;
const RHINO_CHARGE_STUN = 40;
// Anchor: não sai do lugar com empurrões e Gancho (a corrente leva o Anchor até o inimigo)
const ANCHOR_PUNCH_DAMAGE = 28;       // golpe de âncora: lento e pesado
const ANCHOR_HOOK_COST = 100;
const ANCHOR_HOOK_COOLDOWN = 420;     // 7 segundos
const ANCHOR_HOOK_RANGE = 380;
const ANCHOR_HOOK_SPEED = 20;         // pixels por passo voando atrás da âncora
const ANCHOR_HOOK_DAMAGE = 60;
const ANCHOR_HOOK_STUN = 90;          // 1,5 s atordoado quando ele chega
// Capitã Sina: faca rápida e a Roleta da Sina (pistola, tubarão ou o raro barco de água)
const SINA_KNIFE_DAMAGE = 20;
const SINA_KNIFE_COOLDOWN = 14;       // cortes mais rápidos que o soco comum (20)
const SINA_STAB_DAMAGE = 35;          // soco forte: estocada com um passo à frente
const SINA_STAB_LUNGE = 5;
const SINA_ULT_COST = 100;
const SINA_ULT_COOLDOWN = 360;        // 6 segundos
const SINA_SPIN_FRAMES = 60;          // a roleta gira por 1 s em cima da cabeça dela
const SINA_RESULT_FRAMES = 40;        // o resultado fica à mostra mais um pouco
const SINA_CHANCES = { pistol: 0.6, shark: 0.3, boat: 0.1 };
const SINA_PITY_AFTER = 3;            // depois de 3 giros seguidos sem barco...
const SINA_BOAT_PITY = 0.05;          // ...cada giro a mais sem barco aumenta a chance do próximo em 5%
const SINA_PISTOL_SHOTS = 4;
const SINA_PISTOL_DAMAGE = 25;
const SINA_PISTOL_INTERVAL = 8;       // passos entre os tiros
const SINA_SHARK_DAMAGE = 130;        // atravessa e empurra todos no caminho
const SINA_SHARK_SPEED = 9;
const SINA_BOAT_DAMAGE = 300;
const SINA_BOAT_RADIUS = 110;
const SINA_BOAT_STUN = 72;            // 1,2 s atordoado
const SINA_BOAT_WARNING = 48;         // 0,8 s de sombra no chão antes de cair
const SINA_BOAT_RANGE = 420;
let sinaBoats = [];
const MAMBA_SHOT_DAMAGE = 22;
const MAMBA_STRONG_DAMAGE = 45;
const MAMBA_POISON_CHANCE = 0.2;      // 20% dos tiros envenenam
// Ultimate da Mamba: nuvem tóxica que anda com ela e obriga quem está perto a se afastar
const MAMBA_CLOUD_COST = 120;
const MAMBA_CLOUD_COOLDOWN = 480;     // 8 segundos
const MAMBA_CLOUD_DURATION = 300;     // 5 segundos
const MAMBA_CLOUD_RADIUS = 140;
const MAMBA_CLOUD_TICK_DAMAGE = 15;   // a cada 0,5 s (30 por segundo)
const POISON_MAX_STACKS = 3;
const POISON_DAMAGE = 6;              // por segundo, por acúmulo
const POISON_DURATION = 240;          // 4 segundos
const GEAR_NAIL_DAMAGE = 12;
const GEAR_TURRET_COST = 80;
const GEAR_TURRET_COOLDOWN = 90;      // 1,5 s entre uma torreta e outra (quem limita é a energia)
const GEAR_MAX_TURRETS = 3;           // a 4ª substitui a mais antiga
const TURRET_HP = 60;                 // 4 socos (ou 2 socos fortes) para quebrar
const TURRET_DURATION = 720;          // 12 segundos
const TURRET_RANGE = 380;
const TURRET_DAMAGE = 8;
const TURRET_FIRE_INTERVAL = 30;      // um tiro a cada 0,5 s
let turrets = [];

const MAX_HEALTH = 1000;
// Perigos dos mapas
const LAB_LASER_GAP = 120;        // brecha do laser do laboratório (dá para passar por ela)
const CHOMPER_REACH = 56;         // alcance da mordida da planta carnívora
const GARDEN_PICKUP_HEAL = 120;   // cura da flor que nasce no jardim
// Vida máxima de cada personagem (tanques aguentam mais, quem ataca de longe aguenta menos)
const HEALTH_BY_CHARACTER = {
    titan: 1200, zarek: 1200, fenris: 1150, spark: 1100,
    hades: 1000, jack: 1000, kenji: 1000, akane: 950, kaze: 950, craque: 950, weaver: 950, sina: 950,
    aegis: 1600, rhino: 1450, anchor: 1450,
    mamba: 900, gear: 750, roxy: 850, celestia: 950, nyx: 950, flora: 900,
};
const HEALERS = ['celestia', 'flora', 'nyx'];
let lifeOrbs = [];
// Regra do jogo: no 2v2 e no 3v3 todo time tem pelo menos uma healer (false = sorteio livre)
const FORCE_HEALER_PER_TEAM = true;
let healingFlowers = [], floatingTexts = [];
