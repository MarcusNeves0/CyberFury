// Lógica do jogo (arena vista de cima, estilo Brawl Stars).
// Depende de characters.js (characterArt, drawThumbnails) e audio.js (sfx).

window.onload = () => {
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
    const match = { mode: '1v1', vs: 'ai', picks: [] };
    const teamSizeOf = mode => Number(mode[0]);
    const TEAM_COLORS = ['#00ffff', '#ff4dff'];
    const TEAM_NAMES = ['TIME CIANO', 'TIME ROSA'];

    const CHARACTERS = [
        { id: 'titan', name: 'Titan' },
        { id: 'spark', name: 'Spark' },
        { id: 'hades', name: 'Hades' },
        { id: 'jack', name: 'Jack' },
        { id: 'genji', name: 'Genji' },
        { id: 'ryu', name: 'Ryu' },
        { id: 'lorenzo', name: 'Don Lorenzo' },
        { id: 'malenia', name: 'Malenia' },
        { id: 'maliketh', name: 'Maliketh' },
        { id: 'kayn', name: 'Kayn' },
        { id: 'celestia', name: 'Celestia' },
        { id: 'flora', name: 'Flora' },
    ];

    // Teclas (cada ação aceita uma lista). Contra a IA o jogador pode andar com WASD ou setas;
    // no P1 vs P2 cada um fica com um lado do teclado. Segurar o soco solta o soco forte.
    const KEYMAPS = {
        solo: { up: ['w', 'arrowup'], down: ['s', 'arrowdown'], left: ['a', 'arrowleft'], right: ['d', 'arrowright'], punch: ['j'], special: ['k'], defend: ['l'] },
        p1: { up: ['w'], down: ['s'], left: ['a'], right: ['d'], punch: ['f'], special: ['g'], defend: ['h'] },
        p2: { up: ['arrowup'], down: ['arrowdown'], left: ['arrowleft'], right: ['arrowright'], punch: ['k'], special: ['l'], defend: ['ç', ';'] },
    };

    // --- Entidades do Jogo ---
    let fighters = [], aiControllers = [], particles = [], projectiles = [];
    let obstacles = [], groundBalls = [];
    let arena = { left: 0, top: 0, right: WORLD_W, bottom: WORLD_H };

    const FIGHTER_RADIUS = 16;     // "pé" do lutador no chão (colisão)
    const FIGHTER_HEIGHT = 64;     // altura do sprite
    const MOVE_SPEED = 3.4;        // pixels por passo
    const PUNCH_REACH = 46;        // alcance do soco (a partir da borda do lutador)
    const BLADE_REACH = 60;        // alcance de lâminas
    const STRONG_PUNCH_HOLD = 22;  // passos segurando o soco para sair o soco forte
    const SPARK_CHAIN_RANGE = 300; // alcance máximo da corrente elétrica do Spark
    const HADES_RANGE = 320;       // alcance da explosão do Hades

    // Kayn
    const KAYN_CHARGE_MAX = 200;      // barra de transformação
    const KAYN_CHARGE_ON_HIT = 4;     // ganha ao acertar
    const KAYN_CHARGE_ON_HURT = 3;    // ganha ao levar dano
    const KAYN_ULT_COST = 150;        // energia da ultimate
    const KAYN_ULT_COOLDOWN = 480;    // 8 segundos entre ultimates
    const KAYN_ULT_DURATION = 90;     // 1,5 segundo dentro do oponente
    const KAYN_ULT_RANGE = 220;       // distância máxima para entrar no oponente
    const KAYN_ULT_DAMAGE = 60;       // dano base da ultimate (forma vermelha: 3x)

    // Healers
    const CELESTIA_AURA_RADIUS = 130;     // área de cura permanente ao redor dela
    const CELESTIA_HEAL_ALLY = 9;         // cura por segundo em cada aliado dentro da área
    const CELESTIA_HEAL_SELF = 5;         // cura por segundo nela mesma
    const CELESTIA_ULT_MULTIPLIER = 3;    // ultimate: área 3x maior
    const CELESTIA_ULT_DURATION = 360;    // 6 segundos
    const CELESTIA_ULT_COST = 150;
    const CELESTIA_ULT_COOLDOWN = 600;    // 10 segundos
    const FLORA_FLOWER_COST = 100;        // energia por flor (~1 flor a cada 3,3 s)
    const FLORA_HEAL = 90;                // cura da flor num aliado
    const FLORA_SELF_HEAL = 40;           // cura da flor quando volta para ela (sem aliados)
    const MAX_HEALTH = 1000;
    const HEALERS = ['celestia', 'flora'];
    // TESTE: coloca pelo menos uma healer em cada time no 2v2/3v3. Mude para false para voltar ao sorteio livre.
    const FORCE_HEALER_PER_TEAM = true;
    let healingFlowers = [], floatingTexts = [];

    // --- Redimensionamento do Canvas ---
    function resizeCanvas() {
        canvasWidth = gameContainer.clientWidth;
        canvasHeight = gameContainer.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        viewScale = canvasWidth / WORLD_W;
        if (gameState === 'FIGHT' || gameState === 'GAMEOVER') draw();
        else drawMenuBackground();
    }
    window.addEventListener('resize', resizeCanvas);

    // --- Geometria ---
    const alive = f => f && !f.isDead;
    const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    function normalize(x, y) {
        const length = Math.hypot(x, y);
        return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
    }
    const directionTo = (from, to) => normalize(to.x - from.x, to.y - from.y);

    function enemiesOf(fighter) {
        return fighters.filter(f => alive(f) && f.team !== fighter.team);
    }

    function nearestEnemy(fighter) {
        let best = null, bestDistance = Infinity;
        for (const enemy of enemiesOf(fighter)) {
            const d = distance(fighter, enemy);
            if (d < bestDistance) { best = enemy; bestDistance = d; }
        }
        return best;
    }

    // Ponto mais próximo de um retângulo (para colisões com caixas)
    function closestPointOnRect(px, py, rect) {
        return {
            x: Math.max(rect.x, Math.min(px, rect.x + rect.w)),
            y: Math.max(rect.y, Math.min(py, rect.y + rect.h)),
        };
    }

    function circleHitsObstacle(x, y, radius, obstacle) {
        if (obstacle.kind === 'tree') return Math.hypot(x - obstacle.x, y - obstacle.y) < radius + obstacle.r;
        const p = closestPointOnRect(x, y, obstacle);
        return Math.hypot(x - p.x, y - p.y) < radius;
    }

    // --- Arena e Obstáculos ---
    // Posições em frações da arena, espelhadas para os dois lados ficarem justos
    const LAYOUTS = {
        duel: {
            bounds: { left: 200, top: 130, right: 1080, bottom: 690 },
            trees: [[0.5, 0.18], [0.5, 0.84]],
            boxes: [[0.3, 0.42], [0.7, 0.58], [0.3, 0.7], [0.7, 0.3]],
        },
        team: {
            bounds: { left: 40, top: 120, right: 1240, bottom: 700 },
            trees: [[0.5, 0.16], [0.5, 0.86], [0.24, 0.28], [0.76, 0.72], [0.24, 0.76], [0.76, 0.24]],
            boxes: [[0.4, 0.42], [0.6, 0.58], [0.4, 0.62], [0.6, 0.38], [0.14, 0.5], [0.86, 0.5]],
        },
    };

    function setupArena() {
        const layout = match.mode === '1v1' ? LAYOUTS.duel : LAYOUTS.team;
        arena = { ...layout.bounds };
        const w = arena.right - arena.left, h = arena.bottom - arena.top;
        obstacles = [];
        for (const [fx, fy] of layout.trees) {
            obstacles.push({ kind: 'tree', x: arena.left + fx * w, y: arena.top + fy * h, r: 18 });
        }
        for (const [fx, fy] of layout.boxes) {
            obstacles.push({ kind: 'box', x: arena.left + fx * w - 17, y: arena.top + fy * h - 13, w: 34, h: 26, hp: 80 });
        }
        floorCache = null;
    }

    // Caixa de papelão leva dano e quebra
    function damageBox(box, damage) {
        box.hp -= damage;
        sfx.play('hit');
        if (box.hp > 0) return;
        obstacles = obstacles.filter(o => o !== box);
        for (let i = 0; i < 18; i++) {
            particles.push(new Particle(box.x + box.w / 2, box.y + box.h / 2, i % 2 ? '#b07a45' : '#8a5a2e', 0));
        }
    }

    // --- Classes do Jogo ---

    // Projétil que anda pelo chão (é desenhado na altura do peito)
    class Projectile {
        constructor(shooter, type, damage, direction, speed = 9) {
            this.shooter = shooter;
            this.type = type;
            this.damage = damage;
            this.x = shooter.x + direction.x * (FIGHTER_RADIUS + 6);
            this.y = shooter.y + direction.y * (FIGHTER_RADIUS + 6);
            this.vx = direction.x * speed;
            this.vy = direction.y * speed;
            this.radius = { pumpkin: 22, rocket_punch: 14, tornado: 16, football: 10, maliketh_blade: 10 }[type] || 12;
            this.life = type === 'football' ? 200 : 150;
            this.bounces = 0;
            this.isReturning = false;
            this.done = false;
        }

        // Bola do Lorenzo: quica em paredes e obstáculos; os outros projéteis somem
        bounceOrBreak(normalX, normalY) {
            if (this.type !== 'football' || this.isReturning) { this.done = true; return; }
            if (normalX) this.vx = Math.abs(this.vx) * normalX;
            if (normalY) this.vy = Math.abs(this.vy) * normalY;
            this.bounces++;
            sfx.play('lorenzo_kick');
        }

        update() {
            this.life--;
            if (this.isReturning) {
                // Volta para o Lorenzo
                const dir = directionTo(this, this.shooter);
                this.vx = dir.x * 7;
                this.vy = dir.y * 7;
                if (!alive(this.shooter) || distance(this, this.shooter) < 24) {
                    if (alive(this.shooter)) this.shooter.ballCount = Math.min(this.shooter.maxBallCount, this.shooter.ballCount + 1);
                    this.done = true;
                    return;
                }
            }
            this.x += this.vx;
            this.y += this.vy;

            if (this.isReturning) return;
            if (this.life <= 0) {
                // Bola que perdeu força fica no chão para o Lorenzo buscar
                if (this.type === 'football') groundBalls.push({ x: this.x, y: this.y });
                this.done = true;
                return;
            }

            // Paredes da arena
            if (this.x < arena.left) { this.x = arena.left; this.bounceOrBreak(1, 0); }
            if (this.x > arena.right) { this.x = arena.right; this.bounceOrBreak(-1, 0); }
            if (this.y < arena.top) { this.y = arena.top; this.bounceOrBreak(0, 1); }
            if (this.y > arena.bottom) { this.y = arena.bottom; this.bounceOrBreak(0, -1); }
            if (this.done) return;

            // Obstáculos: árvores bloqueiam, caixas bloqueiam e levam dano
            for (const o of obstacles) {
                if (!circleHitsObstacle(this.x, this.y, this.radius, o)) continue;
                if (o.kind === 'box') damageBox(o, this.damage);
                const center = o.kind === 'tree' ? o : { x: o.x + o.w / 2, y: o.y + o.h / 2 };
                const away = normalize(this.x - center.x, this.y - center.y);
                if (this.type === 'football') {
                    // Reflete a bola na direção oposta ao obstáculo
                    const dot = this.vx * away.x + this.vy * away.y;
                    this.vx -= 2 * dot * away.x;
                    this.vy -= 2 * dot * away.y;
                    this.bounces++;
                } else {
                    this.done = true;
                    for (let i = 0; i < 6; i++) particles.push(new Particle(this.x, this.y - 30, '#ffb347', 0));
                }
                break;
            }
            if (this.type === 'football' && this.bounces > 3) {
                groundBalls.push({ x: this.x, y: this.y });
                this.done = true;
            }
        }

        draw() {
            const size = this.type === 'pumpkin' ? 44 : this.type === 'maliketh_blade' ? 22 : 30;
            ctx.save();
            ctx.translate(this.x, this.y - 30);
            ctx.font = `${size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (this.type === 'rocket_punch') {
                // O emoji do foguete aponta para cima-direita; gira para a direção do voo
                ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 4);
                ctx.fillText('🚀', 0, 0);
            } else if (this.type === 'pumpkin') {
                ctx.fillText('🎃', 0, 0);
            } else if (this.type === 'tornado') {
                ctx.fillText('🌪️', 0, 0);
            } else if (this.type === 'football') {
                ctx.fillText('⚽️', 0, 0);
            } else if (this.type === 'maliketh_blade') {
                ctx.fillText('💥', 0, 0);
            }
            ctx.restore();
        }
    }

    class Fighter {
        // controller: 'p1' / 'p2' (humanos) ou 'ai'
        constructor(x, y, name, characterType, team, controller) {
            this.characterType = characterType;
            this.name = name;
            this.team = team;
            this.controller = controller;
            this.isPlayer = controller !== 'ai';
            this.keymap = null; // definido em startGame para humanos
            this.target = null; // inimigo atual (mais próximo, ou escolhido pela IA)
            this.isDead = false;

            // Posição = ponto no chão sob os pés
            this.x = x;
            this.y = y;
            this.radius = FIGHTER_RADIUS;
            this.height = FIGHTER_HEIGHT;
            this.z = 0;   // altura no ar (só visual: arremessos, saltos)
            this.vz = 0;
            this.moveX = 0; // movimento deste passo (para animação)
            this.moveY = 0;
            this.kbx = 0;   // empurrão (decai sozinho)
            this.kby = 0;
            this.aim = { x: team === 0 ? 1 : -1, y: 0 }; // direção da mira
            this.facing = team === 0 ? 1 : -1;            // lado para onde o sprite olha

            this.health = MAX_HEALTH;
            this.energy = 50;
            this.maxEnergy = 1000;
            this.isAttacking = false;
            this.attackType = null;
            this.attackTimer = 0;   // passos em que o golpe ainda pode acertar
            this.attackHit = false;
            this.attackCooldown = 0;
            this.keys = { up: false, down: false, left: false, right: false };
            this.isChargingPunch = false;
            this.punchHeld = 0;

            this.aiMove = { x: 0, y: 0 };
            // Status Effects
            this.burnDuration = 0;
            this.burnTick = 0;
            this.curseStacks = 0;
            this.curseDuration = 0;
            this.curseTick = 0;
            this.cursedBy = null;
            this.bleedStacks = 0;
            this.bleedDuration = 0;
            this.bleedTick = 0;
            this.bleedPunchCounter = 0;
            this.cursePunchCounter = 0;

            // Defense
            this.isPreparingDefense = false;
            this.defenseActivationTimer = 0;
            this.isDefending = false;
            this.defenseHealth = 50;
            this.defenseResetCooldown = 0;
            this.isParalyzed = false;
            this.paralysisTimer = 0;

            // Character-Specific Mechanics
            this.isChannelingSpecial = false;
            this.channelTarget = null;
            this.channelingTick = 0;
            this.channelingDamage = 1;
            this.isDashing = false;
            this.dashDir = null;
            this.dashLeft = 0;
            this.consecutivePunchCounter = 0;
            this.attackSpeedMultiplier = 1;
            this.ryuComboTimer = 0;
            this.ballCount = (this.characterType === 'lorenzo') ? 3 : 0;
            this.maxBallCount = 7; // máximo na mão, contando as que voltam e as que ele pega do chão
            this.isWaterfowlDancing = false;
            this.waterfowlHitCount = 0;
            this.waterfowlHits = new Map(); // inimigo -> passos até poder cortar de novo
            this.hitFlash = 0;
            this.specialCooldown = 0;

            // Kayn
            this.kaynCharge = 0;
            this.kaynForm = null; // null (normal), 'red' ou 'blue'
            this.isInsideOpponent = false;
            this.kaynHost = null; // em quem o Kayn entrou
            this.kaynUltTimer = 0;

            // Healers
            this.healedTotal = 0; // quanto este lutador já curou na partida
            this.healTick = 0;
            this.celestiaUltTimer = 0;
            this.auraDisplayRadius = CELESTIA_AURA_RADIUS; // anima o crescimento da área
        }

        // Altura do peito na tela (para projéteis, raios e efeitos)
        get chestY() {
            return this.y - this.z - this.height * 0.55;
        }

        draw() {
            // Kayn dentro do oponente fica invisível (a foice em cima da cabeça é desenhada à parte)
            if (this.isInsideOpponent || this.isDead) return;

            // Sombra e anel do time no chão (estilo Brawl Stars)
            const shadowScale = Math.max(0.4, 1 - this.z / 120);
            ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, 20 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
            // Brilho feito com um traço largo translúcido por baixo (shadowBlur é caro a cada quadro)
            ctx.save();
            ctx.strokeStyle = TEAM_COLORS[this.team];
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, 22, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Respiração parado, balanço andando, tremor ao levar dano
            const isWalking = Math.hypot(this.moveX, this.moveY) > 0.1;
            const time = Date.now() / (isWalking ? 90 : 300) + fighters.indexOf(this) * 1.5;
            const bob = Math.round((Math.sin(time) + 1) * (isWalking ? 1.5 : 1));
            const shake = this.hitFlash > 0 ? (Math.random() - 0.5) * 4 : 0;
            const lean = this.isAttacking ? 3 * this.facing : 0;

            ctx.save();
            ctx.translate(this.x + shake + lean, this.y - this.z - bob);
            if (this.facing === -1) ctx.scale(-1, 1);
            const possessor = fighters.find(f => f.isInsideOpponent && f.kaynHost === this);
            if (this.hitFlash > 0 && this.hitFlash % 4 < 2) {
                ctx.filter = 'brightness(3) saturate(0)';
            } else if (possessor) {
                // Contorno pulsando na cor da forma enquanto o Kayn está dentro
                const glow = 2 + Math.round((Math.sin(Date.now() / 80) + 1) * 2);
                ctx.filter = `drop-shadow(0 0 ${glow}px ${kaynFormColor(possessor.kaynForm)})`;
            } else if (this.isChargingPunch && this.punchHeld > 6) {
                ctx.filter = `drop-shadow(0 0 ${Math.min(6, this.punchHeld / 4)}px #fff3a0)`;
            }
            const drawArt = characterArt[this.characterType];
            if (drawArt) drawArt(ctx, -this.height / 4, -this.height, this.height / 2, this.height, this);
            ctx.restore();

            const headY = this.y - this.z - this.height - 8;

            // Golpe: arco na direção da mira
            if (this.attackTimer > 0 && this.attackType !== 'special') {
                const reach = (isBladeUser(this) ? BLADE_REACH : PUNCH_REACH) + this.radius;
                const angle = Math.atan2(this.aim.y, this.aim.x);
                ctx.save();
                ctx.strokeStyle = this.attackType === 'strong_punch' ? 'rgba(255, 220, 120, 0.85)' : 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = this.attackType === 'strong_punch' ? 5 : 3;
                ctx.beginPath();
                ctx.ellipse(this.x, this.y - 12, reach, reach * 0.6, 0, angle - 0.9, angle + 0.9);
                ctx.stroke();
                ctx.restore();
            }

            if (this.isDefending) {
                ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(this.x, this.chestY, 30, 0, Math.PI * 2);
                ctx.fill();
            }

            // Barrinha de vida em cima da cabeça
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(this.x - 21, headY - 6, 42, 6);
            ctx.fillStyle = TEAM_COLORS[this.team];
            ctx.fillRect(this.x - 20, headY - 5, 40 * (this.health / MAX_HEALTH), 4);

            if (this.isPlayer) {
                ctx.save();
                ctx.font = 'bold 12px Orbitron, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = TEAM_COLORS[this.team];
                ctx.fillText(this.controller.toUpperCase(), this.x, headY - 10);
                ctx.restore();
            }

            if (this.isParalyzed) {
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('💫', this.x, headY - 12);
                ctx.textAlign = 'start';
            }
        }

        update() {
            if (this.hitFlash > 0) this.hitFlash--;
            if (this.specialCooldown > 0) this.specialCooldown--;

            if (this.isInsideOpponent) {
                this.updateKaynUltimate();
                return;
            }

            // Altura (saltos e arremessos são só visuais)
            if (this.z > 0 || this.vz !== 0) {
                this.vz -= 0.7;
                this.z += this.vz;
                if (this.z <= 0) { this.z = 0; this.vz = 0; }
            }

            // Empurrões
            this.x += this.kbx;
            this.y += this.kby;
            this.kbx *= 0.82;
            this.kby *= 0.82;

            // Mira automática no alvo
            const opponent = this.target;
            if (opponent) {
                this.aim = directionTo(this, opponent);
                if (Math.abs(this.aim.x) > 0.05) this.facing = this.aim.x > 0 ? 1 : -1;
            }
            this.moveX = 0;
            this.moveY = 0;

            if (this.isWaterfowlDancing) {
                this.updateWaterfowl();
                return;
            }

            if (this.isParalyzed) {
                this.paralysisTimer--;
                if (this.paralysisTimer <= 0) {
                    this.isParalyzed = false;
                }
                return;
            }

            if (this.isDashing) {
                this.updateRyuDash();
                return;
            }

            // Movimento em 8 direções (mais lento atacando; parado defendendo)
            let move = { x: 0, y: 0 };
            if (this.isPlayer) {
                move = normalize((this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0), (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0));
            } else {
                move = this.aiMove;
            }
            const speed = this.isDefending ? 0 : this.isAttacking ? MOVE_SPEED * 0.5 : MOVE_SPEED;
            this.moveX = move.x * speed;
            this.moveY = move.y * speed;
            this.x += this.moveX;
            this.y += this.moveY;
            if (!opponent && Math.abs(move.x) > 0.05) this.facing = move.x > 0 ? 1 : -1;

            // Segurar o soco carrega o soco forte
            if (this.isChargingPunch) {
                this.punchHeld++;
                if (this.punchHeld >= STRONG_PUNCH_HOLD) {
                    this.isChargingPunch = false;
                    this.attack('strong_punch');
                }
            }

            if (this.attackTimer > 0) {
                this.attackTimer--;
                if (!this.attackHit) tryMelee(this);
            }

            if (this.attackCooldown > 0) {
                this.attackCooldown--;
            } else {
                this.isAttacking = false;
            }

            if (this.isPreparingDefense && !this.isDefending) {
                this.defenseActivationTimer--;
                if (this.defenseActivationTimer <= 0) {
                    this.isDefending = true;
                }
            }

            if (this.defenseResetCooldown > 0) {
                this.defenseResetCooldown--;
                if (this.defenseResetCooldown <= 0) {
                    this.defenseHealth = 50;
                }
            }

            if (this.characterType === 'ryu' && this.ryuComboTimer > 0) {
                this.ryuComboTimer--;
                if (this.ryuComboTimer <= 0) {
                    this.consecutivePunchCounter = 0;
                    this.attackSpeedMultiplier = 1;
                }
            }

            this.handleStatusEffects();
            if (this.characterType === 'spark') {
                this.handleSparkSpecial();
            }

            // Regeneração de energia
            this.energy = Math.min(this.maxEnergy, this.energy + 0.5);
        }

        // Malenia: atravessa a arena cortando todo inimigo no caminho
        updateWaterfowl() {
            const step = 13;
            this.x += this.dashDir.x * step;
            this.y += this.dashDir.y * step;
            this.dashLeft -= step;
            createParticleEffect(this, 'sword_slash');
            for (const [enemy, wait] of this.waterfowlHits) this.waterfowlHits.set(enemy, wait - 1);
            for (const enemy of enemiesOf(this)) {
                if (distance(this, enemy) > this.radius + enemy.radius + 14) continue;
                if ((this.waterfowlHits.get(enemy) || 0) > 0) continue;
                enemy.isParalyzed = true;
                enemy.paralysisTimer = 10;
                enemy.takeDamage(20, { sound: 'blade_hit' }, this);
                this.health = Math.min(MAX_HEALTH, this.health + 6);
                this.waterfowlHitCount++;
                this.waterfowlHits.set(enemy, 6);
            }
            const hitWall = this.x <= arena.left || this.x >= arena.right || this.y <= arena.top || this.y >= arena.bottom;
            if (this.waterfowlHitCount >= 7 || this.dashLeft <= 0 || hitWall) this.isWaterfowlDancing = false;
        }

        // Ryu: avança em linha reta e explode no primeiro inimigo
        updateRyuDash() {
            const step = 16;
            this.x += this.dashDir.x * step;
            this.y += this.dashDir.y * step;
            this.dashLeft -= step;
            createParticleEffect(this, 'dash_fire');
            const hit = enemiesOf(this).find(enemy => !enemy.isInsideOpponent && distance(this, enemy) < this.radius + enemy.radius + 8);
            if (hit) {
                hit.vz = 9; // joga para cima
                hit.takeDamage(50, {}, this);
                hit.isParalyzed = true;
                hit.paralysisTimer = Math.max(hit.paralysisTimer, 20);
                createParticleEffect(hit, 'ground_explosion', { x: hit.x, y: hit.y, count: 20 });
                this.isDashing = false;
            }
            const hitWall = this.x <= arena.left || this.x >= arena.right || this.y <= arena.top || this.y >= arena.bottom;
            if (this.dashLeft <= 0 || hitWall) this.isDashing = false;
        }

        handleStatusEffects() {
            if (this.burnDuration > 0) {
                this.burnDuration--;
                this.burnTick++;
                if (this.burnTick >= 60) {
                    this.health -= 9;
                    this.burnTick = 0;
                    particles.push(new Particle(this.x + (Math.random() - 0.5) * 24, this.chestY, 'orange', 0));
                }
            }

            if (this.curseDuration > 0) {
                this.curseDuration--;
                this.curseTick++;
                if (this.curseTick >= 60) {
                    if (this.cursedBy) {
                        this.health -= 9 * this.curseStacks;
                        if (alive(this.cursedBy)) {
                            this.cursedBy.health = Math.min(MAX_HEALTH, this.cursedBy.health + (5 * this.curseStacks));
                        }
                        particles.push(new Particle(this.x + (Math.random() - 0.5) * 24, this.chestY, 'purple', 0));
                    }
                    this.curseTick = 0;
                }
                if (this.curseDuration === 0) {
                    this.curseStacks = 0;
                    this.cursedBy = null;
                }
            }

            if (this.bleedDuration > 0) {
                this.bleedDuration--;
                this.bleedTick++;
                if (this.bleedTick >= 60) {
                    this.health -= 8 * this.bleedStacks;
                    this.bleedTick = 0;
                    particles.push(new Particle(this.x + (Math.random() - 0.5) * 24, this.chestY, 'red', 0));
                }
                if (this.bleedDuration === 0) {
                    this.bleedStacks = 0;
                }
            }
        }

        handleSparkSpecial() {
            if (!this.isChannelingSpecial) {
                return;
            }

            // A corrente prende no alvo de quando começou
            if (!alive(this.channelTarget)) this.channelTarget = this.target;
            const opponent = this.channelTarget;

            // A corrente arrebenta se o oponente sair do alcance
            if (!opponent || distance(this, opponent) > SPARK_CHAIN_RANGE) {
                this.stopChanneling();
                return;
            }

            if (this.energy > 0) {
                this.channelingTick++;

                if (this.channelingTick % 15 === 0) {
                    this.energy -= 1;
                }

                if (this.channelingTick > 0 && this.channelingTick % 60 === 0) {
                    opponent.takeDamage(this.channelingDamage, {}, this);
                    this.channelingDamage *= 2;
                }
                if (this.channelingTick % 6 === 0) sfx.play('spark_zap');

            } else {
                this.stopChanneling();
            }
        }

        // Interrompe o choque do Spark e zera o dano acumulado
        stopChanneling() {
            this.isChannelingSpecial = false;
            this.channelTarget = null;
            this.channelingDamage = 1;
            this.channelingTick = 0;
        }

        // Ultimate do Kayn: entra no corpo do oponente, fica 1,5 s invulnerável e sai causando dano
        startKaynUltimate() {
            this.isAttacking = false;
            const opponent = this.target;
            if (!opponent) return;
            const alreadyPossessed = fighters.some(f => f.isInsideOpponent && f.kaynHost === opponent);
            if (this.energy < KAYN_ULT_COST || this.specialCooldown > 0 || distance(this, opponent) > KAYN_ULT_RANGE || alreadyPossessed) return;

            this.energy -= KAYN_ULT_COST;
            this.specialCooldown = KAYN_ULT_COOLDOWN;
            this.isInsideOpponent = true;
            this.kaynHost = opponent;
            this.kaynUltTimer = KAYN_ULT_DURATION;
            sfx.play('kayn_special');

            // Fumaça onde ele estava e um rastro sombrio voando até o oponente
            for (let i = 0; i < 25; i++) {
                particles.push(new Particle(this.x + (Math.random() - 0.5) * 30, this.chestY + (Math.random() - 0.5) * 40, 'rgba(40, 20, 70, 0.9)', 0,
                    { x: (opponent.x - this.x) / 30 + (Math.random() - 0.5) * 2, y: (opponent.chestY - this.chestY) / 30 + (Math.random() - 0.5) * 2 }));
            }
        }

        // Sai do corpo do hospedeiro, pelo lado com mais espaço
        exitHost(host) {
            this.isInsideOpponent = false;
            this.kaynHost = null;
            const side = host.x < (arena.left + arena.right) / 2 ? 1 : -1;
            this.x = host.x + side * (host.radius + this.radius + 8);
            this.y = host.y;
            this.z = 0;
            this.vz = 0;
        }

        updateKaynUltimate() {
            const opponent = this.kaynHost;
            // Hospedeiro derrotado enquanto o Kayn estava dentro: só sai, sem dano
            if (!alive(opponent)) {
                this.exitHost(opponent || this);
                return;
            }

            // Segue o oponente por dentro
            this.x = opponent.x;
            this.y = opponent.y;
            this.kaynUltTimer--;
            if (this.kaynUltTimer > 0) return;

            this.exitHost(opponent);

            // A ultimate não pode ser bloqueada: ele está saindo de dentro do oponente
            const hit = { unblockable: true, sound: 'kayn_exit' };
            if (this.kaynForm === 'red') {
                opponent.takeDamage(KAYN_ULT_DAMAGE * 3, hit, this);
            } else if (this.kaynForm === 'blue') {
                opponent.takeDamage(KAYN_ULT_DAMAGE, hit, this);
                opponent.bleedStacks = 3; // sangramento máximo
                opponent.bleedDuration = 240;
            } else {
                opponent.takeDamage(KAYN_ULT_DAMAGE, hit, this);
            }

            // Corte em X na cor da forma
            const color = kaynFormColor(this.kaynForm);
            for (let i = 0; i < 30; i++) {
                const t = (Math.random() - 0.5) * 2;
                const diagonal = i % 2 === 0 ? 1 : -1;
                particles.push(new Particle(opponent.x + t * 35, opponent.chestY + t * 35 * diagonal, color, 0, { x: t * 5, y: t * 5 * diagonal }));
            }
        }

        // Recupera vida (sem passar do máximo) e mostra o número verde subindo
        heal(amount, healer) {
            if (this.isDead || this.isInsideOpponent) return 0;
            const healed = Math.min(amount, MAX_HEALTH - this.health);
            if (healed <= 0) return 0;
            this.health += healed;
            if (healer) healer.healedTotal += healed;
            floatingTexts.push(new FloatingText(this.x, this.y - this.z - this.height - 16, `+${Math.round(healed)}`, '#6dff8a'));
            return healed;
        }

        // Raio atual da área de cura da Celestia
        auraRadius() {
            return this.celestiaUltTimer > 0 ? CELESTIA_AURA_RADIUS * CELESTIA_ULT_MULTIPLIER : CELESTIA_AURA_RADIUS;
        }

        // Celestia: a cada segundo cura todos os aliados dentro da área (e um pouco a si mesma)
        updateCelestiaAura() {
            if (this.celestiaUltTimer > 0) this.celestiaUltTimer--;
            this.auraDisplayRadius += (this.auraRadius() - this.auraDisplayRadius) * 0.08;
            this.healTick++;
            if (this.healTick < 60) return;
            this.healTick = 0;
            const radius = this.auraRadius();
            for (const ally of fighters) {
                if (!alive(ally) || ally.team !== this.team) continue;
                if (ally === this) ally.heal(CELESTIA_HEAL_SELF, this);
                else if (distance(this, ally) <= radius) ally.heal(CELESTIA_HEAL_ALLY, this);
            }
        }

        startCelestiaUltimate() {
            this.isAttacking = false;
            if (this.energy < CELESTIA_ULT_COST || this.specialCooldown > 0) return;
            this.energy -= CELESTIA_ULT_COST;
            this.specialCooldown = CELESTIA_ULT_COOLDOWN;
            this.celestiaUltTimer = CELESTIA_ULT_DURATION;
            sfx.play('celestia_special');
            for (let i = 0; i < 36; i++) {
                const angle = (i / 36) * Math.PI * 2;
                particles.push(new Particle(this.x, this.chestY, '#ffe98a', 0, { x: Math.cos(angle) * 7, y: Math.sin(angle) * 7 }));
            }
        }

        // Flora: joga uma flor que voa até o aliado mais próximo (ou volta para ela, se estiver sozinha)
        throwHealingFlower() {
            this.isAttacking = false;
            if (this.energy < FLORA_FLOWER_COST || this.specialCooldown > 0) return;
            this.energy -= FLORA_FLOWER_COST;
            this.specialCooldown = 60;
            this.attackCooldown = 15;
            this.isAttacking = true;
            sfx.play('flora_special');
            healingFlowers.push(new HealingFlower(this));
        }

        applyCurse(attacker) {
            this.cursedBy = attacker;
            this.curseStacks = Math.min(3, this.curseStacks + 1);
            this.curseDuration = 300; // 5 segundos
        }

        // Empurra numa direção (o empurrão decai sozinho, ~5x a força em pixels)
        push(direction, force) {
            this.kbx += direction.x * force;
            this.kby += direction.y * force;
        }

        // attacker: quem causou o dano (usado pela barra do Kayn e pela maldição)
        takeDamage(damage, effect = {}, attacker = null) {
            if (this.isInsideOpponent || this.isDead) return false; // Kayn dentro do oponente não pode ser atingido

            if (this.isDefending && !effect.unblockable) {
                const effectiveDamage = (this.characterType === 'spark' || this.characterType === 'titan') ? damage * 0.5 : damage;
                this.defenseHealth -= effectiveDamage;
                if (attacker) this.push(directionTo(attacker, this), 3);
                if (this.defenseHealth <= 0) {
                    this.isDefending = false;
                    this.isPreparingDefense = false;
                    this.isParalyzed = true;
                    this.paralysisTimer = 180;
                    this.defenseResetCooldown = 120;
                    sfx.play('defense_break');
                } else {
                    sfx.play('block');
                }
                return true;
            }

            sfx.play(effect.sound || (damage >= 25 ? 'hit_heavy' : 'hit'));
            this.hitFlash = 12;
            if (this.isChannelingSpecial) this.stopChanneling(); // levar dano quebra o choque

            // Barra do Kayn: só golpes que causam dano de verdade contam (bloqueio e dano contínuo não)
            if (this.characterType === 'kayn') addKaynCharge(this, KAYN_CHARGE_ON_HURT);
            if (attacker && attacker.characterType === 'kayn') addKaynCharge(attacker, KAYN_CHARGE_ON_HIT);
            this.health -= damage;
            if (effect.type === 'burn') { this.burnDuration = 180; }
            if (effect.type === 'curse') { this.applyCurse(attacker); }
            if (effect.type === 'bleed') {
                this.bleedStacks = Math.min(3, this.bleedStacks + 1);
                this.bleedDuration = 240; // 4 segundos
            }
            if (this.health < 0) this.health = 0;

            return false;
        }

        attack(type) {
            if (this.attackCooldown > 0 || this.isParalyzed || this.isDefending || this.isDashing || this.isWaterfowlDancing || this.isInsideOpponent || this.isDead) return;

            this.isAttacking = true;
            this.attackType = type;
            this.attackHit = false;

            switch (type) {
                case 'punch':
                    if (this.characterType === 'lorenzo') {
                        // O "soco" do Lorenzo é um chute de bola
                        if (this.ballCount <= 0) { this.isAttacking = false; return; }
                        this.attackCooldown = 20;
                        this.ballCount--;
                        sfx.play('lorenzo_kick');
                        projectiles.push(new Projectile(this, 'football', 14, this.aim, 8));
                        break;
                    }
                    if (this.characterType === 'jack' || this.characterType === 'malenia' || this.characterType === 'maliketh' || this.characterType === 'kayn') {
                        this.attackCooldown = 30;
                        this.attackTimer = 8;
                        sfx.play('blade_swing');
                    } else {
                        this.attackCooldown = 20 / this.attackSpeedMultiplier;
                        this.attackTimer = 6;
                        sfx.play(this.characterType === 'genji' ? 'blade_swing' : 'swing');
                    }
                    break;
                case 'strong_punch':
                    this.attackCooldown = 45;
                    this.attackTimer = 8;
                    sfx.play(isBladeUser(this) ? 'blade_swing' : 'swing_heavy');
                    break;
                case 'special':
                    if (this.characterType === 'spark') {
                        return;
                    }
                    if (this.characterType === 'kayn') {
                        this.startKaynUltimate();
                        return;
                    }
                    if (this.characterType === 'celestia') {
                        this.startCelestiaUltimate();
                        return;
                    }
                    if (this.characterType === 'flora') {
                        this.throwHealingFlower();
                        return;
                    }
                    const energyCost = specialCost(this.characterType);
                    if (this.energy < energyCost || this.specialCooldown > 0) { this.isAttacking = false; return; }
                    // A explosão do Hades precisa de um alvo por perto (senão não gasta energia)
                    if (this.characterType === 'hades' && (!this.target || distance(this, this.target) > HADES_RANGE)) { this.isAttacking = false; return; }
                    this.energy -= energyCost;
                    // Recuperação curta (o lutador volta a se mexer logo) e recarga própria do especial
                    this.attackCooldown = 15;
                    this.specialCooldown = 60;

                    sfx.play(`${this.characterType}_special`);

                    if (this.characterType === 'titan') {
                        projectiles.push(new Projectile(this, 'rocket_punch', 55, this.aim, 10));
                        createParticleEffect(this, 'special');
                    } else if (this.characterType === 'hades') {
                        const opponent = this.target;
                        opponent.takeDamage(70, { type: 'burn' }, this);
                        createParticleEffect(opponent, 'ground_explosion', { x: opponent.x, y: opponent.y, count: 20 });
                    } else if (this.characterType === 'jack') {
                        projectiles.push(new Projectile(this, 'pumpkin', 30, this.aim, 6));
                    } else if (this.characterType === 'genji') {
                        projectiles.push(new Projectile(this, 'tornado', 70, this.aim, 8));
                    } else if (this.characterType === 'ryu') {
                        this.isDashing = true;
                        this.dashDir = { ...this.aim };
                        this.dashLeft = 320;
                    } else if (this.characterType === 'lorenzo') {
                        if (this.ballCount < this.maxBallCount) {
                            this.ballCount++;
                        }
                        this.isAttacking = false;
                    } else if (this.characterType === 'malenia') {
                        this.isWaterfowlDancing = true;
                        this.waterfowlHitCount = 0;
                        this.waterfowlHits.clear();
                        this.dashDir = { ...this.aim };
                        this.dashLeft = 420;
                    } else if (this.characterType === 'maliketh') {
                        this.vz = 12; // salta
                        setTimeout(() => {
                            for (let i = 0; i < 5; i++) {
                                setTimeout(() => {
                                    // Cada lâmina mira no inimigo atual (se ele ainda estiver de pé)
                                    if (gameState !== 'FIGHT' || this.isDead || !alive(this.target)) return;
                                    projectiles.push(new Projectile(this, 'maliketh_blade', 70, directionTo(this, this.target), 8));
                                    sfx.play('blade_swing');
                                }, i * 200);
                            }
                        }, 500);
                    }
                    break;
            }
        }
    }

    // Golpe corpo a corpo: acerta o primeiro inimigo dentro do arco à frente (na direção da mira).
    // Se não houver inimigo, pode acertar uma caixa de papelão.
    function tryMelee(attacker) {
        const reach = (isBladeUser(attacker) ? BLADE_REACH : PUNCH_REACH) + (attacker.attackType === 'strong_punch' ? 10 : 0);
        const inArc = (x, y, radius) => {
            const dx = x - attacker.x, dy = y - attacker.y;
            const d = Math.hypot(dx, dy);
            if (d > reach + attacker.radius + radius) return false;
            if (d < attacker.radius + radius) return true; // colado conta sempre
            return (dx * attacker.aim.x + dy * attacker.aim.y) / d > 0.25; // ~75° para cada lado
        };

        const defender = enemiesOf(attacker).find(e => !e.isInsideOpponent && inArc(e.x, e.y, e.radius));
        if (!defender) {
            const box = obstacles.find(o => o.kind === 'box' && inArc(o.x + o.w / 2, o.y + o.h / 2, 14));
            if (box) {
                damageBox(box, attacker.attackType === 'strong_punch' ? 25 : 10);
                attacker.attackHit = true;
            }
            return;
        }

        let damage = 0;
        let effect = {};
        if (isBladeUser(attacker)) effect.sound = 'blade_hit';
        switch (attacker.attackType) {
            case 'punch':
                damage = (attacker.characterType === 'malenia') ? 9 : 10;
                if (attacker.kaynForm === 'red') damage = 12;
                if (attacker.characterType === 'malenia') {
                    attacker.health = Math.min(MAX_HEALTH, attacker.health + 6);
                }
                if (attacker.characterType === 'hades') { effect.type = 'burn'; }
                if (attacker.characterType === 'jack') {
                    attacker.cursePunchCounter++;
                    if (attacker.cursePunchCounter >= 2) {
                        defender.applyCurse(attacker);
                        attacker.cursePunchCounter = 0;
                    }
                }
                if (attacker.characterType === 'genji') {
                    attacker.bleedPunchCounter++;
                    if (attacker.bleedPunchCounter >= 4) {
                        effect.type = 'bleed';
                        attacker.bleedPunchCounter = 0;
                    }
                }
                if (attacker.characterType === 'ryu') {
                    attacker.consecutivePunchCounter++;
                    attacker.attackSpeedMultiplier = Math.min(7, 1 + (attacker.consecutivePunchCounter - 1));
                    attacker.ryuComboTimer = 120; // 2 segundos
                    createParticleEffect(defender, 'ryu_punch', { x: defender.x, y: defender.chestY, count: attacker.consecutivePunchCounter });
                }
                break;
            case 'strong_punch':
                damage = (attacker.kaynForm === 'red') ? 30 : 25;
                if (attacker.characterType === 'titan') damage = 35; // braço robótico: lento, mas pesado
                if (attacker.characterType === 'hades') { effect.type = 'burn'; }
                if (attacker.characterType === 'jack') { defender.applyCurse(attacker); }
                break;
        }

        const defended = defender.takeDamage(damage, effect, attacker);
        if (defended) {
            attacker.energy = Math.min(1000, attacker.energy + 7.5);
        } else if (damage > 0) {
            attacker.energy = Math.min(1000, attacker.energy + 15);
            defender.push(attacker.aim, attacker.attackType === 'strong_punch' ? 4 : 1.5);
        }
        attacker.attackHit = true;
    }

    // Flor da Flora: voa em curva atrás do aliado mais próximo e cura ao encostar
    class HealingFlower {
        constructor(owner) {
            this.owner = owner;
            this.x = owner.x;
            this.y = owner.chestY;
            this.vx = owner.facing * 4;
            this.vy = -5; // sai para cima, depois persegue
            this.target = this.pickTarget();
            this.spin = 0;
            this.life = 240; // 4 segundos no máximo
            this.done = false;
        }

        // Aliado vivo mais próximo; se não houver, a própria Flora
        pickTarget() {
            const allies = fighters.filter(f => alive(f) && f.team === this.owner.team && f !== this.owner);
            if (!allies.length) return this.owner;
            return allies.reduce((best, f) => distance(this.owner, f) < distance(this.owner, best) ? f : best);
        }

        update() {
            this.life--;
            this.spin += 0.2;
            if (!alive(this.target)) this.target = this.pickTarget();
            if (!alive(this.target) || this.life <= 0) { this.done = true; return; }

            const tx = this.target.x, ty = this.target.chestY;
            const dx = tx - this.x, dy = ty - this.y;
            const d = Math.hypot(dx, dy);
            // Vira aos poucos na direção do alvo (por isso faz curva)
            const speed = 8;
            this.vx += (dx / d * speed - this.vx) * 0.12;
            this.vy += (dy / d * speed - this.vy) * 0.12;
            this.x += this.vx;
            this.y += this.vy;

            if (d < 24) {
                const amount = this.target === this.owner ? FLORA_SELF_HEAL : FLORA_HEAL;
                if (this.target.heal(amount, this.owner) > 0) sfx.play('heal');
                // Pétalas e brilhos verdes ao desabrochar
                for (let i = 0; i < 18; i++) {
                    const angle = (i / 18) * Math.PI * 2;
                    particles.push(new Particle(tx, ty, i % 2 ? '#ff7ac0' : '#6dff8a', 0, { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 }));
                }
                this.done = true;
            }
            // Rastro de pétalas
            if (this.life % 4 === 0) {
                particles.push(new Particle(this.x, this.y, 'rgba(255, 122, 192, 0.7)', 0, { x: -this.vx * 0.1, y: 0.4 }));
            }
        }

        draw() {
            drawFlower(this.x, this.y, 8, this.spin, '#ff7ac0', '#ffe34a');
        }
    }

    // Número que sobe e some (ex.: "+60" verde na cura)
    class FloatingText {
        constructor(x, y, text, color) {
            this.x = x + (Math.random() - 0.5) * 16;
            this.y = y;
            this.text = text;
            this.color = color;
            this.life = 50;
        }

        update() {
            this.y -= 0.7;
            this.life--;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.life / 50);
            ctx.font = 'bold 14px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#0a0a14';
            ctx.strokeText(this.text, this.x, this.y);
            ctx.fillStyle = this.color;
            ctx.fillText(this.text, this.x, this.y);
            ctx.restore();
        }
    }

    // Flor de 5 pétalas (usada na flor da Flora e na área da Celestia)
    function drawFlower(x, y, size, rotation, petalColor, centerColor) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillStyle = petalColor;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * size * 0.55, Math.sin(angle) * size * 0.55, size * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = centerColor;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Área de cura da Celestia: círculo dourado no chão com 6 flores de lótus girando na borda
    function drawCelestiaAura(celestia) {
        const radius = celestia.auraDisplayRadius;
        const ult = celestia.celestiaUltTimer > 0;

        ctx.save();
        ctx.fillStyle = ult ? 'rgba(255, 233, 138, 0.10)' : 'rgba(255, 233, 138, 0.06)';
        ctx.beginPath();
        ctx.arc(celestia.x, celestia.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 210, 74, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -Date.now() / 60;
        ctx.stroke();
        ctx.restore();

        const turn = Date.now() / (ult ? 500 : 1200);
        for (let i = 0; i < 6; i++) {
            const angle = turn + (i / 6) * Math.PI * 2;
            drawFlower(celestia.x + Math.cos(angle) * radius, celestia.y + Math.sin(angle) * radius, 9, -turn * 2, '#fffaf0', '#ffd24a');
        }
    }

    // Energia gasta pelo especial de cada personagem (Spark, Kayn e healers têm regras próprias)
    function specialCost(characterType) {
        return {
            malenia: 300, maliketh: 300, lorenzo: 150, genji: 100, ryu: 100, jack: 90,
            kayn: KAYN_ULT_COST, celestia: CELESTIA_ULT_COST, flora: FLORA_FLOWER_COST,
        }[characterType] || 45;
    }

    function isBladeUser(fighter) {
        return ['jack', 'malenia', 'maliketh', 'genji', 'kayn'].includes(fighter.characterType);
    }

    // --- Kayn: barra de transformação e formas ---
    function kaynFormColor(form) {
        if (form === 'red') return '#ff2a3a';
        if (form === 'blue') return '#3fb8ff';
        return '#b9b2d6';
    }

    function addKaynCharge(kayn, amount) {
        if (kayn.kaynForm) return; // já transformado
        kayn.kaynCharge = Math.min(KAYN_CHARGE_MAX, kayn.kaynCharge + amount);
        if (kayn.kaynCharge < KAYN_CHARGE_MAX) return;

        // Perdendo em vida -> Rhaast (vermelho, agressivo); ganhando ou empatado -> Assassino das Sombras (azul).
        // Compara com o inimigo atual (em times, o que ele está enfrentando).
        const opponent = kayn.target || nearestEnemy(kayn);
        kayn.kaynForm = opponent && kayn.health < opponent.health ? 'red' : 'blue';
        sfx.play('kayn_transform');
        const color = kaynFormColor(kayn.kaynForm);
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            particles.push(new Particle(kayn.x, kayn.chestY, color, 0, { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 }));
        }
    }

    // Foice girando em cima da cabeça do oponente enquanto o Kayn está dentro dele
    function drawKaynMark(kayn, host) {
        const color = kaynFormColor(kayn.kaynForm);
        const progress = 1 - kayn.kaynUltTimer / KAYN_ULT_DURATION; // 0 -> 1
        const cx = host.x;
        const cy = host.y - host.z - host.height - 32 + Math.sin(Date.now() / 150) * 3;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(0.75, 0.75);
        ctx.rotate(Date.now() / (220 - progress * 160)); // gira cada vez mais rápido
        ctx.shadowColor = color;
        ctx.shadowBlur = 6 + progress * 14;

        // Cabo
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-16, 14);
        ctx.lineTo(12, -12);
        ctx.stroke();

        // Lâmina curva
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(12, -12);
        ctx.quadraticCurveTo(30, -34, -4, -30);
        ctx.quadraticCurveTo(20, -24, 12, -12);
        ctx.fill();

        // Olho de Rhaast
        ctx.fillStyle = kayn.kaynForm === 'red' ? '#ffd23f' : '#ff2a3a';
        ctx.fillRect(9, -16, 4, 4);
        ctx.restore();

        // Anel que se fecha mostrando quanto tempo falta para ele sair
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - progress));
        ctx.stroke();
        ctx.restore();
    }

    function createParticleEffect(fighter, type, extraParams = {}) {
        if (type === 'special' && fighter.characterType === 'titan') {
            for (let i = 0; i < 15; i++) particles.push(new Particle(fighter.x, fighter.chestY, 'rgba(255, 100, 0, 0.8)', 0));
        } else if (type === 'ground_explosion') {
            const count = extraParams.count || 20;
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(
                    extraParams.x + (Math.random() - 0.5) * 40,
                    extraParams.y,
                    'hades_fire',
                    0,
                    { x: (Math.random() - 0.5) * 2, y: -(Math.random() * 5 + 2) }
                ));
            }
        } else if (type === 'dash_fire') {
            particles.push(new Particle(fighter.x, fighter.chestY, 'red', 0, { x: -fighter.dashDir.x * 3, y: -fighter.dashDir.y * 3 + (Math.random() - 0.5) * 2 }));
        } else if (type === 'ryu_punch') {
            const count = extraParams.count || 1;
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(extraParams.x, extraParams.y, 'ryu_star', 0, { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }));
            }
        } else if (type === 'sword_slash') {
            particles.push(new Particle(fighter.x, fighter.chestY, '#c0c0c0', 0, { x: fighter.dashDir.x * 4, y: fighter.dashDir.y * 4 + (Math.random() - 0.5) * 3 }));
        }
    }

    class Particle {
        constructor(x, y, color, direction, customVelocity) {
            this.position = { x, y };
            this.velocity = customVelocity || {
                x: (Math.random() - 0.5) * 6,
                y: (Math.random() - 0.5) * 6
            };
            this.radius = Math.random() * 3 + 1.5;
            this.color = color;
            this.life = 100;
        }

        draw() {
            if (this.color === 'hades_fire') {
                ctx.font = `${Math.round(this.radius * 5)}px sans-serif`;
                ctx.fillText('🔥', this.position.x, this.position.y);
            } else if (this.color === 'ryu_star') {
                ctx.font = `${Math.round(this.radius * 4)}px sans-serif`;
                ctx.fillText('✨', this.position.x, this.position.y);
            } else {
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        update() {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.life -= 3;
        }
    }

    // --- IA ---
    class AI {
        constructor(fighter) {
            this.fighter = fighter;
            this.decisionInterval = null;
            this.strafeSign = Math.random() < 0.5 ? 1 : -1;
        }

        start() {
            this.decisionInterval = setInterval(() => this.makeDecision(), 300); // A IA toma decisões mais rápido
        }

        stop() {
            if (this.decisionInterval) clearInterval(this.decisionInterval);
            this.fighter.aiMove = { x: 0, y: 0 };
        }

        // Escolhe o alvo: o inimigo mais próximo, mas troca por um inimigo quase morto que esteja perto
        chooseTarget() {
            const me = this.fighter;
            const nearest = nearestEnemy(me);
            if (!nearest) return null;
            const nearestDistance = distance(me, nearest);
            const finisher = enemiesOf(me).find(e => e.health < 250 && distance(me, e) < nearestDistance + 150);
            return finisher || nearest;
        }

        // Anda numa direção desviando de obstáculos e sem empilhar nos aliados
        steer(direction) {
            const me = this.fighter;
            let dir = normalize(direction.x, direction.y);
            // Obstáculo logo à frente: contorna pelo lado
            const ahead = { x: me.x + dir.x * 40, y: me.y + dir.y * 40 };
            const blocking = obstacles.find(o => circleHitsObstacle(ahead.x, ahead.y, me.radius + 4, o));
            if (blocking) {
                const center = blocking.kind === 'tree' ? blocking : { x: blocking.x + blocking.w / 2, y: blocking.y + blocking.h / 2 };
                const side = (center.x - me.x) * dir.y - (center.y - me.y) * dir.x > 0 ? -1 : 1;
                dir = normalize(dir.x + -dir.y * side * 1.5, dir.y + dir.x * side * 1.5);
            }
            // Afasta um pouco dos aliados muito perto
            for (const ally of fighters) {
                if (ally === me || !alive(ally) || ally.team !== me.team) continue;
                const d = distance(me, ally);
                if (d < 50 && d > 0) {
                    dir.x += (me.x - ally.x) / d * 0.6;
                    dir.y += (me.y - ally.y) / d * 0.6;
                }
            }
            me.aiMove = normalize(dir.x, dir.y);
        }

        moveToward(point) { this.steer({ x: point.x - this.fighter.x, y: point.y - this.fighter.y }); }
        moveAway(point) { this.steer({ x: this.fighter.x - point.x, y: this.fighter.y - point.y }); }

        // Anda de lado em volta do alvo (fica mais difícil de acertar)
        strafe(around) {
            const dir = directionTo(this.fighter, around);
            this.steer({ x: -dir.y * this.strafeSign, y: dir.x * this.strafeSign });
        }

        makeDecision() {
            const me = this.fighter;
            if (gameState !== 'FIGHT' || me.isDead || me.isParalyzed || me.isInsideOpponent) return;

            me.target = this.chooseTarget();
            const opponent = me.target;
            if (!opponent) { me.aiMove = { x: 0, y: 0 }; return; }

            const d = distance(me, opponent);
            const meleeRange = (isBladeUser(me) ? BLADE_REACH : PUNCH_REACH) + me.radius + opponent.radius - 6;
            // Só tenta o especial se tiver a energia de verdade (antes tentava com 45 e perdia a vez)
            const canUseSpecial = !['kayn', 'celestia', 'flora', 'spark'].includes(me.characterType) &&
                me.energy >= specialCost(me.characterType) && me.specialCooldown <= 0;
            if (Math.random() < 0.1) this.strafeSign *= -1;

            me.aiMove = { x: 0, y: 0 };
            me.isDefending = false;

            // Ação defensiva (menos provável)
            if (opponent.isAttacking && d < 120 && Math.random() < 0.5 && me.defenseResetCooldown <= 0) {
                me.isDefending = true;
                return;
            }

            // Healers: primeiro cuidar do time, depois lutar
            const allies = fighters.filter(f => alive(f) && f.team === me.team && f !== me);
            if (me.characterType === 'flora') {
                // Joga a flor quando alguém do time (ou ela, se estiver sozinha) está abaixo de 80% de vida
                const needsHeal = allies.length ? allies.some(a => a.health < MAX_HEALTH * 0.8) : me.health < MAX_HEALTH * 0.8;
                if (needsHeal && me.energy >= FLORA_FLOWER_COST && me.specialCooldown <= 0) {
                    me.attack('special');
                    return;
                }
            }
            if (me.characterType === 'celestia') {
                // Ultimate quando 2+ do time (contando ela) estão abaixo de 50%; no 1v1, quando ela está
                const team = [me, ...allies];
                const hurt = team.filter(f => f.health < MAX_HEALTH * 0.5).length;
                if (hurt >= Math.min(2, team.length) && me.energy >= CELESTIA_ULT_COST && me.specialCooldown <= 0) {
                    me.attack('special');
                    return;
                }
                // Fica perto do aliado mais machucado para ele ficar dentro da área
                const mostHurt = allies.filter(a => a.health < MAX_HEALTH * 0.85).sort((a, b) => a.health - b.health)[0];
                if (mostHurt && distance(me, mostHurt) > me.auraRadius() * 0.6) {
                    this.moveToward(mostHurt);
                    return;
                }
            }

            // Spark: o choque dobra de dano a cada segundo segurado (1, 2, 4, 8...), então vale segurar.
            // Ele arrebenta se o Spark levar dano ou se o oponente sair do alcance (handleSparkSpecial),
            // por isso a IA só liga dentro do alcance e, canalizando, mantém distância e defende.
            if (me.characterType === 'spark') {
                if (!me.isChannelingSpecial && me.energy >= 20 && d < SPARK_CHAIN_RANGE * 0.8) {
                    me.isChannelingSpecial = true;
                    me.channelTarget = opponent;
                }
                if (me.isChannelingSpecial) {
                    const chained = me.channelTarget || opponent;
                    const chainDistance = distance(me, chained);
                    if (chained.isAttacking && chainDistance < 120 && me.defenseResetCooldown <= 0) {
                        me.isDefending = true; // bloquear não quebra o choque
                    } else if (chainDistance < 110) {
                        this.moveAway(chained); // recua para não levar soco
                    } else if (chainDistance > SPARK_CHAIN_RANGE * 0.7) {
                        this.moveToward(chained); // aproxima para não perder o alcance
                    } else {
                        this.strafe(chained);
                    }
                    return;
                }
            }

            // Kayn: a ultimate é invulnerável e não pode ser bloqueada, então usa sempre que estiver pronta
            // e no alcance. Antes de transformar, a barra enche com trocação, então prefere ficar colado.
            if (me.characterType === 'kayn') {
                const ultReady = me.energy >= KAYN_ULT_COST && me.specialCooldown <= 0;
                if (ultReady && d < KAYN_ULT_RANGE * 0.9) {
                    me.attack('special');
                    return;
                }
            }

            // Lorenzo joga de longe: chuta bola enquanto tiver, mantendo distância; o especial (bola nova) só quando faltar
            if (me.characterType === 'lorenzo') {
                if (me.ballCount > 0 && d < 320) {
                    me.attack('punch');
                    if (d < 120) this.moveAway(opponent); else this.strafe(opponent);
                    return;
                }
                if (me.ballCount < 2 && canUseSpecial) {
                    me.attack('special');
                    return;
                }
                const ball = groundBalls.slice().sort((a, b) => distance(me, a) - distance(me, b))[0];
                if (me.ballCount === 0 && ball) {
                    this.moveToward(ball); // vai buscar bola no chão
                    return;
                }
            }

            // Ações ofensivas (mais prováveis)
            if (canUseSpecial && me.characterType !== 'lorenzo' && d < 280 && Math.random() < 0.7) {
                me.attack('special');
                return;
            }

            if (d < meleeRange && Math.random() < 0.9) {
                me.attack('punch');
                this.strafe(opponent);
                return;
            }

            // Se não atacar, vai na direção do alvo
            this.moveToward(opponent);
        }
    }

    // --- Placar (HUD) ---
    function makeEl(tag, className, parent) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (parent) parent.appendChild(el);
        return el;
    }

    function makeBar(outerClass, innerClass, parent) {
        const outer = makeEl('div', outerClass, parent);
        const fill = makeEl('div', innerClass, outer);
        const text = makeEl('span', 'bar-text', outer);
        return { outer, fill, text };
    }

    // Uma coluna por time e um cartão por lutador; as referências ficam guardadas em fighter.hud
    function buildHUD() {
        hud.innerHTML = '';
        hud.classList.toggle('hud-compact', teamSizeOf(match.mode) > 1);
        for (const team of [0, 1]) {
            const column = makeEl('div', `team-hud team-${team}`, hud);
            for (const f of fighters.filter(f => f.team === team)) {
                const card = makeEl('div', 'player-hud', column);
                const title = makeEl('h3', '', card);
                const name = makeEl('span', '', title);
                name.innerText = f.name;
                title.appendChild(document.createTextNode(' '));
                const tag = makeEl('span', 'controller-tag', title);
                tag.innerText = f.isPlayer ? f.controller.toUpperCase() : 'IA';
                f.hud = {
                    card,
                    health: makeBar('health-bar-outer', 'health-bar-inner', card),
                    energy: makeBar('energy-bar-outer', 'energy-bar-inner', card),
                    transform: f.characterType === 'kayn' ? makeBar('transform-bar-outer', 'transform-bar-inner', card) : null,
                    status: makeEl('div', 'status-effects', card),
                    statusHtml: '',
                };
            }
        }
    }

    // Só mexe no HTML quando o valor muda (escrever todo quadro força o navegador a recalcular a página)
    function setIfChanged(target, prop, value) {
        if (target[prop] !== value) target[prop] = value;
    }

    function updateHUD() {
        for (const f of fighters) {
            if (!f.hud) continue;
            const health = Math.ceil(f.health), energy = Math.ceil(f.energy);
            setIfChanged(f.hud.health.fill.style, 'width', (health / MAX_HEALTH) * 100 + '%');
            setIfChanged(f.hud.health.text, 'innerText', `${health} / ${MAX_HEALTH}`);
            setIfChanged(f.hud.energy.fill.style, 'width', (energy / 1000) * 100 + '%');
            setIfChanged(f.hud.energy.text, 'innerText', `${energy} / 1000`);
            if (f.hud.card.classList.contains('dead') !== f.isDead) f.hud.card.classList.toggle('dead', f.isDead);
            if (f.hud.transform) updateTransformBar(f);
            updateStatusIcons(f);
        }
    }

    // Barra de transformação: só existe para o Kayn
    function updateTransformBar(fighter) {
        const bar = fighter.hud.transform;
        setIfChanged(bar.fill.style, 'width', (fighter.kaynCharge / KAYN_CHARGE_MAX) * 100 + '%');
        setIfChanged(bar.fill, 'className', 'transform-bar-inner' + (fighter.kaynForm ? ` form-${fighter.kaynForm}` : ''));
        setIfChanged(bar.text, 'innerText',
            fighter.kaynForm === 'red' ? 'RHAAST' :
            fighter.kaynForm === 'blue' ? 'ASSASSINO DAS SOMBRAS' :
            `${fighter.kaynCharge} / ${KAYN_CHARGE_MAX}`);
    }

    // Ícones de efeito; só reescreve o HTML quando algo muda
    function updateStatusIcons(fighter) {
        let html = '';
        if (fighter.bleedStacks > 0) html += `<span class="status-icon">🩸<span class="stack-count">${fighter.bleedStacks}</span></span>`;
        if (fighter.burnDuration > 0) html += `<span class="status-icon">🌋</span>`;
        if (fighter.curseStacks > 0) html += `<span class="status-icon">💀<span class="stack-count">${fighter.curseStacks}</span></span>`;
        if (fighter.characterType === 'ryu' && fighter.attackSpeedMultiplier > 1) {
            html += `<span class="status-icon">✨<span class="stack-count">x${fighter.attackSpeedMultiplier.toFixed(1)}</span></span>`;
        }
        if (fighter.characterType === 'lorenzo') html += `<span class="status-icon">⚽️<span class="stack-count">${fighter.ballCount}</span></span>`;
        if (html !== fighter.hud.statusHtml) {
            fighter.hud.status.innerHTML = html;
            fighter.hud.statusHtml = html;
        }
    }

    // --- Derrota e Fim de Jogo ---
    function knockOut(fighter) {
        fighter.isDead = true;
        fighter.health = 0;
        fighter.stopChanneling();
        fighter.isDefending = false;
        fighter.attackTimer = 0;
        if (fighter.isInsideOpponent && fighter.kaynHost) fighter.exitHost(fighter.kaynHost);
        sfx.play('ko');
        for (let i = 0; i < 25; i++) {
            particles.push(new Particle(fighter.x, fighter.chestY, TEAM_COLORS[fighter.team], 0, { x: (Math.random() - 0.5) * 7, y: (Math.random() - 0.5) * 7 }));
        }
    }

    function checkGameOver() {
        const aliveTeams = new Set(fighters.filter(alive).map(f => f.team));
        if (aliveTeams.size > 1) return;

        gameState = 'GAMEOVER';
        aiControllers.forEach(ai => ai.stop());
        cancelAnimationFrame(gameLoopId);
        gameOverScreen.classList.remove('hidden');

        const winningTeam = [...aliveTeams][0];
        const survivors = fighters.filter(f => alive(f) && f.team === winningTeam);
        if (winningTeam === undefined) {
            winText.innerText = 'EMPATE!';
            return;
        }
        winText.innerText = match.mode === '1v1'
            ? `${survivors[0].name.toUpperCase()} WINS!`
            : `${TEAM_NAMES[winningTeam]} VENCE!`;
        winText.style.color = match.mode === '1v1' ? '' : TEAM_COLORS[winningTeam];

        startWinnerZoom(survivors.find(f => f.isPlayer) || survivors[0]);
    }

    let zoomFactor = 1;
    let winnerToZoom = null;
    let zoomLoopId = null;
    function startWinnerZoom(winner) {
        winnerToZoom = winner;
        zoomFactor = 1;

        function zoomLoop() {
            if (zoomFactor > 2.5) {
                winnerToZoom = null;
                cancelAnimationFrame(zoomLoopId);
                return;
            }
            zoomFactor += 0.01;

            draw();

            ctx.save();
            ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
            ctx.translate(winnerToZoom.x, winnerToZoom.chestY);
            ctx.scale(zoomFactor, zoomFactor);
            ctx.translate(-winnerToZoom.x, -winnerToZoom.chestY);
            winnerToZoom.draw();
            ctx.restore();

            zoomLoopId = requestAnimationFrame(zoomLoop);
        }
        zoomLoop();
    }

    // --- Cenário ---
    // A rua neon do background.png fica no fundo dos menus
    const backgroundImage = new Image();
    backgroundImage.src = 'background.png';
    backgroundImage.onload = () => { if (gameState !== 'FIGHT' && canvasWidth) drawMenuBackground(); };

    function drawMenuBackground() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        if (!backgroundImage.complete || !backgroundImage.naturalWidth) return;
        // Recorte da imagem: usa 88% dela, deixando de fora a marca "ai" do canto inferior direito
        const sx = backgroundImage.naturalWidth * 0.02, sy = backgroundImage.naturalHeight * 0.02;
        const sw = backgroundImage.naturalWidth * 0.88, sh = backgroundImage.naturalHeight * 0.88;
        const scale = Math.max(canvasWidth / sw, canvasHeight / sh);
        const w = sw * scale, h = sh * scale;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(backgroundImage, sx, sy, sw, sh, (canvasWidth - w) / 2, canvasHeight - h, w, h);
    }

    // Chão da arena visto de cima: praça neon com piso, poças, centro marcado e muretas brilhantes.
    // Desenhado uma vez numa imagem guardada; a cada quadro só copiamos ela.
    let floorCache = null;

    function renderArenaFloor(g) {
        // Fora da arena: escuro
        g.fillStyle = '#07040f';
        g.fillRect(0, 0, WORLD_W, WORLD_H);

        const w = arena.right - arena.left, h = arena.bottom - arena.top;
        const pad = 22;

        // Piso
        g.fillStyle = '#140b28';
        g.fillRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);

        // Ladrilhos em xadrez bem sutil
        const tile = 40;
        for (let x = arena.left - pad; x < arena.right + pad; x += tile) {
            for (let y = arena.top - pad; y < arena.bottom + pad; y += tile) {
                if (((x + y) / tile) % 2 < 1) {
                    g.fillStyle = 'rgba(255, 255, 255, 0.018)';
                    g.fillRect(x, y, tile, tile);
                }
            }
        }
        g.strokeStyle = 'rgba(0, 255, 255, 0.06)';
        g.lineWidth = 1;
        for (let x = arena.left - pad; x <= arena.right + pad; x += tile) {
            g.beginPath(); g.moveTo(x, arena.top - pad); g.lineTo(x, arena.bottom + pad); g.stroke();
        }
        for (let y = arena.top - pad; y <= arena.bottom + pad; y += tile) {
            g.beginPath(); g.moveTo(arena.left - pad, y); g.lineTo(arena.right + pad, y); g.stroke();
        }

        // Áreas de nascimento de cada time
        const spawnW = Math.min(160, w * 0.18);
        g.fillStyle = 'rgba(0, 255, 255, 0.06)';
        g.fillRect(arena.left - pad, arena.top - pad, spawnW, h + pad * 2);
        g.fillStyle = 'rgba(255, 77, 255, 0.06)';
        g.fillRect(arena.right + pad - spawnW, arena.top - pad, spawnW, h + pad * 2);

        // Poças refletindo neon
        const puddles = [[0.32, 0.25, 70, 22, '255, 0, 255'], [0.7, 0.78, 80, 24, '0, 255, 255'], [0.55, 0.3, 50, 16, '0, 255, 255'], [0.42, 0.72, 55, 18, '255, 0, 255']];
        for (const [fx, fy, rx, ry, rgb] of puddles) {
            const px = arena.left + fx * w, py = arena.top + fy * h;
            const gradient = g.createRadialGradient(px, py, 2, px, py, rx);
            gradient.addColorStop(0, `rgba(${rgb}, 0.22)`);
            gradient.addColorStop(1, `rgba(${rgb}, 0)`);
            g.fillStyle = gradient;
            g.beginPath();
            g.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
            g.fill();
        }

        // Centro da arena
        const cx = arena.left + w / 2, cy = arena.top + h / 2;
        g.save();
        g.strokeStyle = 'rgba(255, 77, 255, 0.45)';
        g.shadowColor = '#ff00ff';
        g.shadowBlur = 10;
        g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy, 70, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 1.5;
        g.beginPath(); g.arc(cx, cy, 40, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(cx, arena.top - pad); g.lineTo(cx, arena.bottom + pad);
        g.strokeStyle = 'rgba(255, 77, 255, 0.18)';
        g.stroke();
        g.restore();

        // Mureta neon em volta
        g.save();
        g.strokeStyle = '#00ffff';
        g.shadowColor = '#00ffff';
        g.shadowBlur = 14;
        g.lineWidth = 4;
        g.strokeRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);
        g.strokeStyle = 'rgba(255, 77, 255, 0.7)';
        g.shadowColor = '#ff00ff';
        g.lineWidth = 1.5;
        g.strokeRect(arena.left - pad + 6, arena.top - pad + 6, w + pad * 2 - 12, h + pad * 2 - 12);
        g.restore();

        // Postes de luz nos cantos
        for (const [lx, ly] of [[arena.left - pad, arena.top - pad], [arena.right + pad, arena.top - pad], [arena.left - pad, arena.bottom + pad], [arena.right + pad, arena.bottom + pad]]) {
            const glow = g.createRadialGradient(lx, ly, 2, lx, ly, 90);
            glow.addColorStop(0, 'rgba(255, 240, 200, 0.35)');
            glow.addColorStop(1, 'rgba(255, 240, 200, 0)');
            g.fillStyle = glow;
            g.beginPath(); g.arc(lx, ly, 90, 0, Math.PI * 2); g.fill();
        }
    }

    function drawArenaFloor() {
        if (!floorCache) {
            floorCache = document.createElement('canvas');
            floorCache.width = WORLD_W;
            floorCache.height = WORLD_H;
            renderArenaFloor(floorCache.getContext('2d'));
        }
        ctx.drawImage(floorCache, 0, 0);
    }

    // Arvorezinha cyberpunk: tronco, copa redonda e luzinhas
    function drawTree(tree) {
        ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
        ctx.beginPath(); ctx.ellipse(tree.x, tree.y, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a2e1c';
        ctx.fillRect(tree.x - 4, tree.y - 18, 8, 18);
        const canopy = [[0, -34, 20, '#1f6b4a'], [-10, -28, 13, '#1a5a3f'], [10, -28, 13, '#1a5a3f'], [0, -40, 13, '#2a8a5c']];
        for (const [dx, dy, r, color] of canopy) {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(tree.x + dx, tree.y + dy, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = '#3fe0a0';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tree.x, tree.y - 34, 20, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        // Luzinhas piscando
        const blink = Math.floor(Date.now() / 400) % 2;
        ctx.fillStyle = blink ? '#ff7ac0' : '#ffe34a';
        ctx.fillRect(tree.x - 9, tree.y - 36, 3, 3);
        ctx.fillStyle = blink ? '#ffe34a' : '#00ffff';
        ctx.fillRect(tree.x + 7, tree.y - 30, 3, 3);
        ctx.fillRect(tree.x - 2, tree.y - 46, 3, 3);
    }

    // Caixa de papelão com fita; vai rachando conforme leva dano
    function drawBox(box) {
        ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
        ctx.fillRect(box.x + 3, box.y + box.h - 2, box.w, 6);
        const top = 10; // face de cima (dá volume)
        ctx.fillStyle = '#8a5a2e';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = '#b07a45';
        ctx.fillRect(box.x, box.y - top, box.w, top + 2);
        ctx.fillStyle = '#c99a5e';
        ctx.fillRect(box.x + box.w / 2 - 3, box.y - top, 6, top + 2); // fita
        ctx.fillStyle = '#a07040';
        ctx.fillRect(box.x + box.w / 2 - 3, box.y + 2, 6, box.h - 2);
        ctx.strokeStyle = '#1a1024';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y - top, box.w, box.h + top);
        if (box.hp < 55) {
            ctx.strokeStyle = 'rgba(30, 15, 5, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(box.x + 6, box.y + 4); ctx.lineTo(box.x + 12, box.y + 12); ctx.lineTo(box.x + 9, box.y + 20); ctx.stroke();
        }
        if (box.hp < 30) {
            ctx.beginPath(); ctx.moveTo(box.x + box.w - 5, box.y - 6); ctx.lineTo(box.x + box.w - 12, box.y + 6); ctx.lineTo(box.x + box.w - 7, box.y + 14); ctx.stroke();
        }
    }

    // --- Física ---
    // Mantém todos dentro da arena, fora dos obstáculos e sem sobrepor uns aos outros
    function resolveCollisions() {
        const solid = fighters.filter(f => alive(f) && !f.isInsideOpponent);
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
            for (const o of obstacles) {
                if (o.kind === 'tree') {
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

    function updateProjectiles() {
        for (const projectile of projectiles) {
            projectile.update();
            if (projectile.done || projectile.isReturning) continue;
            const target = enemiesOf(projectile.shooter).find(enemy =>
                !enemy.isInsideOpponent && distance(projectile, enemy) < projectile.radius + enemy.radius + 4);
            if (!target) continue;

            const dir = normalize(projectile.vx, projectile.vy);
            if (projectile.type === 'tornado' && !target.isDefending) {
                // Tornado: prende o alvo no ar, Genji aparece atrás dele e corta
                const shooter = projectile.shooter;
                target.isParalyzed = true;
                target.paralysisTimer = Math.max(target.paralysisTimer, 30);
                target.vz = 8;
                shooter.x = target.x - dir.x * (target.radius + shooter.radius + 6);
                shooter.y = target.y - dir.y * (target.radius + shooter.radius + 6);
                setTimeout(() => {
                    if (gameState !== 'FIGHT') return;
                    target.takeDamage(projectile.damage, {}, shooter);
                }, 500);
                projectile.done = true;
                continue;
            }

            const defended = target.takeDamage(projectile.damage, {}, projectile.shooter);
            // Soco-foguete do Titan: empurra e atordoa por 0,3 s (se não for bloqueado)
            if (projectile.type === 'rocket_punch' && !defended) {
                target.push(dir, 12);
                target.isParalyzed = true;
                target.paralysisTimer = Math.max(target.paralysisTimer, 18);
            }
            if (projectile.type === 'pumpkin') {
                sfx.play('explosion');
                target.applyCurse(projectile.shooter);
            }
            if (projectile.type === 'football') {
                projectile.isReturning = true;
            } else {
                projectile.done = true;
            }
        }
        projectiles = projectiles.filter(p => !p.done);

        // Lorenzo recolhe bolas paradas no chão
        for (const ball of groundBalls) {
            const lorenzo = fighters.find(f => alive(f) && f.characterType === 'lorenzo' && f.ballCount < f.maxBallCount && distance(f, ball) < f.radius + 12);
            if (lorenzo) { lorenzo.ballCount++; ball.taken = true; }
        }
        groundBalls = groundBalls.filter(b => !b.taken);
    }

    // --- Laço Principal ---
    // A lógica roda sempre a 60 passos por segundo, não importa a taxa de quadros do monitor
    const STEP_MS = 1000 / 60;
    let lastFrameTime = null, timeAccumulator = 0;

    function step() {
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
        floatingTexts.forEach(t => t.update());
        floatingTexts = floatingTexts.filter(t => t.life > 0);

        particles.forEach(p => p.update());
        particles = particles.filter(p => p.life > 0);

        updateProjectiles();

        for (const f of fighters) {
            if (!f.isDead && f.health <= 0) knockOut(f);
        }

        checkGameOver();
    }

    function gameLoop(now) {
        if (gameState !== 'FIGHT') return;
        gameLoopId = requestAnimationFrame(gameLoop);

        if (lastFrameTime === null) lastFrameTime = now;
        timeAccumulator += Math.min(250, now - lastFrameTime); // evita "pular" muito tempo após a aba voltar
        lastFrameTime = now;
        while (timeAccumulator >= STEP_MS && gameState === 'FIGHT') {
            step();
            timeAccumulator -= STEP_MS;
        }

        draw();
        updateHUD();
    }

    function draw() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
        ctx.imageSmoothingEnabled = false;
        drawArenaFloor();

        // Áreas de cura e bolas no chão ficam por baixo de tudo
        fighters.forEach(f => { if (alive(f) && f.characterType === 'celestia') drawCelestiaAura(f); });
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        groundBalls.forEach(ball => ctx.fillText('⚽️', ball.x, ball.y));
        ctx.textAlign = 'start';

        // Quem está mais embaixo na tela é desenhado na frente
        const drawables = [
            ...obstacles.map(o => ({ y: o.kind === 'tree' ? o.y : o.y + o.h, draw: () => o.kind === 'tree' ? drawTree(o) : drawBox(o) })),
            ...fighters.map(f => ({ y: f.y, draw: () => f.draw() })),
        ].sort((a, b) => a.y - b.y);
        drawables.forEach(d => d.draw());

        for (const f of fighters) {
            if (f.isInsideOpponent && alive(f.kaynHost)) drawKaynMark(f, f.kaynHost);
            if (alive(f) && f.isChannelingSpecial && alive(f.channelTarget)) drawLightningChain(f, f.channelTarget);
        }

        projectiles.forEach(p => p.draw());
        particles.forEach(p => p.draw());
        healingFlowers.forEach(flower => flower.draw());
        floatingTexts.forEach(t => t.draw());
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

    // --- Controles de Eventos ---
    const humanFighters = () => fighters.filter(f => f.keymap && alive(f));
    const actionFor = (keymap, key) => Object.keys(keymap).find(action => keymap[action].includes(key));

    function handleKeyDown(f, action) {
        switch (action) {
            case 'up': case 'down': case 'left': case 'right':
                f.keys[action] = true;
                return;
            case 'defend':
                if (!f.isDefending && !f.isParalyzed && f.defenseResetCooldown <= 0) {
                    f.isPreparingDefense = true;
                    f.defenseActivationTimer = 30; // 0.5s
                }
                return;
            case 'punch':
                // Toque solta o soco; segurando carrega o soco forte
                f.isChargingPunch = true;
                f.punchHeld = 0;
                return;
            case 'special':
                if (f.characterType === 'spark') {
                    if (!f.isChannelingSpecial && !f.isInsideOpponent) {
                        f.isChannelingSpecial = true;
                        f.channelTarget = f.target;
                    }
                } else {
                    f.attack('special');
                }
                return;
        }
    }

    function handleKeyUp(f, action) {
        switch (action) {
            case 'up': case 'down': case 'left': case 'right':
                f.keys[action] = false;
                return;
            case 'defend':
                f.isPreparingDefense = false;
                if (f.isDefending) {
                    f.defenseResetCooldown = 120; // 2s cooldown
                }
                f.isDefending = false;
                return;
            case 'punch':
                if (f.isChargingPunch) {
                    f.isChargingPunch = false;
                    f.attack('punch');
                }
                return;
            case 'special':
                if (f.characterType === 'spark') f.stopChanneling();
                return;
        }
    }

    window.addEventListener('keydown', (e) => {
        if (gameState !== 'FIGHT') return;
        const key = e.key.toLowerCase();
        let used = false;
        for (const f of humanFighters()) {
            const action = actionFor(f.keymap, key);
            if (!action) continue;
            used = true;
            // Repetição automática da tecla segurada é ignorada (ela reiniciava a defesa e o soco forte)
            if (!e.repeat) handleKeyDown(f, action);
        }
        if (used) e.preventDefault(); // setas e espaço não rolam a página
    });

    window.addEventListener('keyup', (e) => {
        if (gameState !== 'FIGHT') return;
        const key = e.key.toLowerCase();
        for (const f of humanFighters()) {
            const action = actionFor(f.keymap, key);
            if (action) handleKeyUp(f, action);
        }
    });

    // --- HUB: escolha de modo ---
    function showScreen(screen) {
        for (const s of [hubScreen, selectionScreen, loadingScreen, gameOverScreen]) {
            s.classList.toggle('hidden', s !== screen);
        }
    }

    function setupHub() {
        const bindGroup = (containerId, attr, apply) => {
            const buttons = document.querySelectorAll(`#${containerId} .hub-option`);
            buttons.forEach(button => button.addEventListener('click', () => {
                buttons.forEach(b => b.classList.toggle('selected', b === button));
                apply(button.dataset[attr]);
            }));
        };
        bindGroup('mode-options', 'mode', value => { match.mode = value; });
        bindGroup('vs-options', 'vs', value => { match.vs = value; });

        document.getElementById('hub-start').addEventListener('click', () => {
            match.picks = [];
            openSelection();
        });
        document.getElementById('back-to-hub').addEventListener('click', goToMenu);
    }

    // --- Lógica da Tela de Seleção ---
    function openSelection() {
        gameState = 'SELECT';
        const humans = match.vs === 'pvp' ? 2 : 1;
        const step = match.picks.length + 1;
        selectionTitle.innerText = humans === 1
            ? `${match.mode.toUpperCase()} — escolha seu lutador`
            : `${match.mode.toUpperCase()} — JOGADOR ${step}: escolha seu lutador`;
        selectionTitle.style.color = humans === 1 ? '' : TEAM_COLORS[step - 1];
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.toggle('taken', match.picks.includes(card.id.replace('select-', '')));
        });
        showScreen(selectionScreen);
    }

    function setupSelectionScreen() {
        drawThumbnails();
        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                match.picks.push(card.id.replace('select-', ''));
                const humans = match.vs === 'pvp' ? 2 : 1;
                if (match.picks.length < humans) {
                    openSelection(); // vez do jogador 2
                } else {
                    startGame();
                }
            });
            const loreTooltip = document.getElementById('lore-tooltip');
            card.addEventListener('mouseenter', (e) => {
                loreTooltip.innerText = e.currentTarget.dataset.lore;
                loreTooltip.style.display = 'block';
            });
            card.addEventListener('mouseleave', () => {
                loreTooltip.style.display = 'none';
            });
            card.addEventListener('mousemove', (e) => {
                const gameContainerRect = gameContainer.getBoundingClientRect();
                loreTooltip.style.left = `${e.clientX - gameContainerRect.left + 15}px`;
                loreTooltip.style.top = `${e.clientY - gameContainerRect.top - loreTooltip.offsetHeight - 5}px`;
            });
        });
    }

    // Texto dos controles na tela de carregamento, conforme o modo
    function renderControls() {
        const names = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', ' ': 'Espaço' };
        const keyName = list => list.map(k => names[k] || k.toUpperCase()).join(' / ');
        const list = map => `
            <p><strong>Andar:</strong> ${keyName(map.up)}, ${keyName(map.left)}, ${keyName(map.down)}, ${keyName(map.right)}</p>
            <p><strong>Soco:</strong> ${keyName(map.punch)}</p>
            <p><strong>Soco Forte:</strong> segurar ${keyName(map.punch)}</p>
            <p><strong>Especial:</strong> ${keyName(map.special)}</p>
            <p><strong>Defesa:</strong> segurar ${keyName(map.defend)}</p>`;
        const hint = '<p class="controls-hint">A mira é automática: golpes e especiais vão no inimigo mais próximo.</p>';
        document.getElementById('controls-content').innerHTML = match.vs === 'pvp'
            ? `<div class="controls-columns">
                   <div class="controls-p1"><h4>Jogador 1</h4>${list(KEYMAPS.p1)}</div>
                   <div class="controls-p2"><h4>Jogador 2</h4>${list(KEYMAPS.p2)}</div>
               </div>${hint}`
            : `<div class="controls-grid">${list(KEYMAPS.solo)}</div>${hint}`;
    }

    // --- Início do Jogo ---
    // Monta os dois times: cada humano com o personagem escolhido, o resto sorteado sem repetir
    function createFighters() {
        const teamSize = teamSizeOf(match.mode);
        const pool = CHARACTERS.filter(c => !match.picks.includes(c.id)).sort(() => Math.random() - 0.5);
        const byId = id => CHARACTERS.find(c => c.id === id);
        const teams = [[], []];
        teams[0].push({ char: byId(match.picks[0]), controller: 'p1' });
        if (match.vs === 'pvp') teams[1].push({ char: byId(match.picks[1]), controller: 'p2' });
        // Modo de teste: em 2v2 e 3v3, cada time recebe pelo menos uma healer (sorteada entre as que sobraram)
        if (FORCE_HEALER_PER_TEAM && teamSize > 1) {
            for (const team of teams) {
                if (team.some(m => HEALERS.includes(m.char.id))) continue;
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
                    f.keymap = match.vs === 'pvp' ? KEYMAPS[member.controller] : KEYMAPS.solo;
                }
                fighters.push(f);
            });
        });
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
            setupArena();
            createFighters();
            buildHUD();

            aiControllers = fighters.filter(f => !f.isPlayer).map(f => new AI(f));
            aiControllers.forEach(ai => ai.start());

            gameState = 'FIGHT';
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
        hud.innerHTML = '';
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

    resizeCanvas();
    setupVolumeControl();
    setupHub();
    setupSelectionScreen();
};
