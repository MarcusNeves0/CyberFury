// Lógica do jogo. Depende de characters.js (characterArt, drawThumbnails) e audio.js (sounds).

window.onload = () => {
    // --- Configurações Iniciais ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gameContainer = document.getElementById('game-container');
    const selectionScreen = document.getElementById('character-selection');
    const loadingScreen = document.getElementById('loading-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const winText = document.getElementById('win-text');
    const restartButton = document.getElementById('restart-button');

    let canvasWidth, canvasHeight;
    let gameLoopId;
    let gameState = 'SELECT'; // SELECT, FIGHT, GAMEOVER

    // --- Entidades do Jogo ---
    let player1, player2, particles = [], projectiles = [];
    const gravity = 0.7;
    let floorY;
    let groundFootball = null;
    let giantBall = null;

    // --- Redimensionamento do Canvas ---
    function resizeCanvas() {
        canvasWidth = gameContainer.clientWidth;
        canvasHeight = gameContainer.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        floorY = canvasHeight * 0.9;

        if (gameState !== 'SELECT') {
            drawBackground();
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- Classes do Jogo ---

    class Projectile {
        constructor(x, y, direction, shooter, type, damage) {
            this.shooter = shooter;
            this.type = type;
            this.damage = damage;
            this.hitTargets = [];

            if (type === 'pumpkin') {
                this.width = 120;
                this.height = 120;
            } else {
                this.width = 40;
                this.height = 40;
            }

            this.position = { x: x, y: y };
            this.velocity = { x: direction * 8, y: 0 };
            this.direction = direction;
            this.isReturning = false;
        }

        draw() {
            let fontSize = 40;
            if (this.type === 'pumpkin') {
                fontSize = 120;
            }
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textBaseline = 'middle';

            ctx.save();
            ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);

            if (this.type === 'rocket_punch') {
                if (this.direction === -1) {
                    ctx.scale(-1, 1);
                }
                ctx.fillText('🚀', -this.width / 2, 0);
            } else if (this.type === 'pumpkin') {
                ctx.fillText('🎃', -this.width / 2, 0);
            } else if (this.type === 'tornado') {
                ctx.fillText('🌪️', -this.width / 2, 0);
            } else if (this.type === 'football') {
                ctx.fillText('⚽️', -this.width / 2, 0);
            } else if (this.type === 'maliketh_blade') {
                ctx.font = `30px sans-serif`;
                ctx.fillText('💥💥💥', -this.width / 2, 0);
            }

            ctx.restore();
        }

        update() {
            if (this.isReturning) {
                const dx = this.shooter.position.x + this.shooter.width / 2 - (this.position.x + this.width / 2);
                const dy = this.shooter.position.y + this.shooter.height / 2 - (this.position.y + this.height / 2);
                const angle = Math.atan2(dy, dx);
                const returnSpeed = 4; // Velocidade de retorno reduzida
                this.velocity.x = Math.cos(angle) * returnSpeed;
                this.velocity.y = Math.sin(angle) * returnSpeed;
            }
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
        }
    }

    class GiantBall {
        constructor(x, y, direction, owner) {
            this.owner = owner;
            this.position = { x, y };
            this.velocity = { x: direction * 2 };
            this.width = 120;
            this.height = 120;
            this.health = 4;
            this.damageTick = 0;
        }

        update(opponent) {
            this.position.x += this.velocity.x;

            if (this.position.x + this.width > canvasWidth || this.position.x < 0) {
                this.velocity.x *= -1;
            }

            if (isColliding(this, opponent)) {
                opponent.position.x += this.velocity.x;
                this.damageTick++;
                if (this.damageTick >= 60) {
                    opponent.takeDamage(80);
                    this.damageTick = 0;
                }

                if (opponent.position.x <= 0 || opponent.position.x + opponent.width >= canvasWidth) {
                    this.explode(opponent);
                }
            }
        }

        draw() {
            ctx.font = '120px sans-serif';
            ctx.fillText('⚽️', this.position.x, this.position.y);
        }

        takeDamage() {
            this.health--;
            if (this.health <= 0) {
                this.explode(null);
            }
        }

        explode(opponent) {
            if (opponent) {
                opponent.takeDamage(200);
            }
            createParticleEffect(null, 'pumpkin_explosion', { x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 });
            giantBall = null;
        }
    }

    class Fighter {
        constructor(x, y, color, name, isPlayer, characterType) {
            this.characterType = characterType;
            this.name = name;
            this.isPlayer = isPlayer;
            this.width = 60;
            this.height = 120;
            this.position = { x, y };
            this.velocity = { x: 0, y: 0 };
            this.color = color;
            this.health = 1000;
            this.energy = 50;
            this.maxEnergy = 1000;
            this.isJumping = false;
            this.isAttacking = false;
            this.attackBox = { position: { x: 0, y: 0 }, width: 0, height: 0, type: null, active: false, hit: false };
            this.attackCooldown = 0;
            this.direction = (x < canvasWidth / 2) ? 1 : -1;
            this.keys = { left: false, right: false, up: false, down: false };

            this.lastTap = { key: null, time: 0 };
            this.doubleTapped = false;

            this.aiVelocityX = 0;
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
            this.channelingTick = 0;
            this.channelingDamage = 1;
            this.isDashing = false;
            this.consecutivePunchCounter = 0;
            this.attackSpeedMultiplier = 1;
            this.ryuComboTimer = 0;
            this.ballCount = (this.characterType === 'lorenzo') ? 1 : 0;
            this.maxBallCount = 5;
            this.isWaterfowlDancing = false;
            this.waterfowlHitCount = 0;
        }

        draw() {
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            if (this.direction === -1) {
                ctx.scale(-1, 1);
                ctx.translate(-this.width, 0);
            }

            const drawArt = characterArt[this.characterType];
            if (drawArt) drawArt(ctx, 0, 0, this.width, this.height, this);

            ctx.restore();

            // Efeitos Visuais de Status
            if (this.isDefending) {
                ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, this.width, 0, Math.PI * 2);
                ctx.fill();
            }

            if (this.isParalyzed) {
                ctx.font = '40px sans-serif';
                ctx.fillText('💫', this.position.x + this.width / 4, this.position.y - 10);
            }
        }

        update(opponent) {
            if (this.isWaterfowlDancing) {
                const dashSpeed = 15 * this.direction;
                this.position.x += dashSpeed;
                createParticleEffect(this, 'sword_slash');
                if (isColliding(this, opponent) && !this.attackBox.hit) {
                    opponent.isParalyzed = true;
                    opponent.paralysisTimer = 10;
                    opponent.takeDamage(20);
                    this.health = Math.min(1000, this.health + 6);
                    this.waterfowlHitCount++;
                    this.attackBox.hit = true;
                    setTimeout(() => { this.attackBox.hit = false; }, 10);
                }
                if (this.waterfowlHitCount >= 7 || Math.abs(this.position.x - this.dashStartX) >= canvasWidth / 1.5) {
                    this.isWaterfowlDancing = false;
                    opponent.isParalyzed = false;
                }
                return;
            }

            this.direction = (opponent.position.x > this.position.x) ? 1 : -1;

            if (this.isParalyzed) {
                this.paralysisTimer--;
                if (this.paralysisTimer <= 0) {
                    this.isParalyzed = false;
                }
                return;
            }

            if (this.isDashing) {
                const dashSpeed = 20 * this.direction;
                this.position.x += dashSpeed;
                createParticleEffect(this, 'dash_fire');
                if (isColliding(this, opponent)) {
                    opponent.velocity.y = -20;
                    opponent.takeDamage(50);
                    createParticleEffect(opponent, 'ground_explosion', { x: opponent.position.x, y: opponent.position.y + opponent.height, count: 20, color: 'orange' });
                    this.isDashing = false;
                }
                if (Math.abs(this.position.x - this.dashStartX) >= canvasWidth / 2) {
                    this.isDashing = false;
                }
                return;
            }

            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;

            if (this.position.y + this.height + this.velocity.y < floorY) {
                this.velocity.y += gravity;
                this.isJumping = true;
            } else {
                this.velocity.y = 0;
                this.position.y = floorY - this.height;
                this.isJumping = false;
            }

            if (this.position.x < 0) this.position.x = 0;
            if (this.position.x + this.width > canvasWidth) this.position.x = canvasWidth - this.width;

            this.velocity.x = 0;
            if (this.isPlayer && !this.isAttacking && !this.isDefending) {
                if (this.keys.left) this.velocity.x = -5;
                if (this.keys.right) this.velocity.x = 5;
            } else if (!this.isPlayer) {
                this.velocity.x = this.aiVelocityX;
            }

            if (this.attackCooldown > 0) {
                this.attackCooldown--;
            } else {
                this.isAttacking = false;
                this.attackBox.active = false;
                this.attackBox.hit = false;
            }

            if (this.attackBox.active) {
                this.attackBox.position.x = this.position.x + (this.direction === 1 ? this.width : -this.attackBox.width);
                this.attackBox.position.y = this.position.y + this.height / 3;
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

            this.handleStatusEffects(opponent);
            if (this.characterType === 'spark') {
                this.handleSparkSpecial(opponent);
            }

            // Regeneração de energia
            this.energy = Math.min(this.maxEnergy, this.energy + 0.5);
        }

        handleStatusEffects(opponent) {
            if (this.burnDuration > 0) {
                this.burnDuration--;
                this.burnTick++;
                if (this.burnTick >= 60) {
                    this.health -= 9;
                    this.burnTick = 0;
                    particles.push(new Particle(this.position.x + Math.random() * this.width, this.position.y + Math.random() * this.height, 'orange', 0));
                }
            }

            if (this.curseDuration > 0) {
                this.curseDuration--;
                this.curseTick++;
                if (this.curseTick >= 60) {
                    if (this.cursedBy) {
                        this.health -= 9 * this.curseStacks;
                        this.cursedBy.health = Math.min(1000, this.cursedBy.health + (5 * this.curseStacks));
                        particles.push(new Particle(this.position.x + Math.random() * this.width, this.position.y + Math.random() * this.height, 'purple', 0));
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
                    particles.push(new Particle(this.position.x + Math.random() * this.width, this.position.y + Math.random() * this.height, 'red', 0));
                }
                if (this.bleedDuration === 0) {
                    this.bleedStacks = 0;
                }
            }
        }

        handleSparkSpecial(opponent) {
            if (!this.isChannelingSpecial) {
                return;
            }

            if (this.energy > 0) {
                this.channelingTick++;

                if (this.channelingTick % 15 === 0) {
                    this.energy -= 1;
                }

                if (this.channelingTick > 0 && this.channelingTick % 60 === 0) {
                    opponent.takeDamage(this.channelingDamage);
                    this.channelingDamage *= 2;
                }
                sounds.spark.special.triggerAttackRelease("8n");

            } else {
                this.isChannelingSpecial = false;
                this.channelingDamage = 1;
                this.channelingTick = 0;
            }
        }

        applyCurse(attacker) {
            this.cursedBy = attacker;
            this.curseStacks = Math.min(8, this.curseStacks + 1);
            this.curseDuration = 300; // 5 segundos
        }

        takeDamage(damage, effect = {}) {
            if (this.isDefending) {
                const effectiveDamage = (this.characterType === 'spark' || this.characterType === 'titan') ? damage * 0.5 : damage;
                this.defenseHealth -= effectiveDamage;
                this.position.x -= this.direction * 15;
                if (this.defenseHealth <= 0) {
                    this.isDefending = false;
                    this.isPreparingDefense = false;
                    this.isParalyzed = true;
                    this.paralysisTimer = 180;
                    this.defenseResetCooldown = 120;
                    sounds.defenseBreak.triggerAttackRelease("C3", "8n");
                }
                return true;
            }

            this.health -= damage;
            if (effect.type === 'burn') { this.burnDuration = 180; }
            if (effect.type === 'curse') { this.applyCurse(effect.attacker); }
            if (effect.type === 'bleed') {
                this.bleedStacks = Math.min(3, this.bleedStacks + 1);
                this.bleedDuration = 240; // 4 segundos
            }
            if (this.health < 0) this.health = 0;

            return false;
        }

        attack(type) {
            if (this.attackCooldown > 0 || this.isParalyzed || this.isDefending || this.isDashing || this.isWaterfowlDancing) return;

            this.isAttacking = true;
            this.attackBox.type = type;

            switch (type) {
                case 'punch':
                    if (this.characterType === 'lorenzo' && this.ballCount <= 0) { this.isAttacking = false; return; }

                    if (this.characterType === 'jack' || this.characterType === 'malenia' || this.characterType === 'maliketh') {
                        this.attackCooldown = 30;
                        this.attackBox.active = true;
                        this.attackBox.width = 90; // Lâmina maior
                        this.attackBox.height = 30;
                        sounds.jack.punch.triggerAttackRelease("E3", "8n");
                    } else {
                        this.attackCooldown = 20 / this.attackSpeedMultiplier;
                        this.attackBox.active = true;
                        this.attackBox.width = 70;
                        this.attackBox.height = 30;
                        if (this.characterType === 'spark') sounds.spark.punch.triggerAttackRelease("C5", "8n");
                        else if (this.characterType === 'titan') sounds.titan.punch.triggerAttackRelease(200, "8n");
                        else if (this.characterType === 'hades') sounds.hades.punch.triggerAttackRelease("A2", "8n");
                        else if (this.characterType === 'genji') sounds.genji.punch.triggerAttackRelease("G4", "16n");
                        else if (this.characterType === 'ryu') sounds.ryu.punch.triggerAttackRelease("C4", "16n");
                        else if (this.characterType === 'lorenzo') {
                            this.ballCount--;
                            const projectileY = this.position.y + this.height / 2;
                            const projectileX = this.position.x + (this.direction === 1 ? this.width : -40);
                            projectiles.push(new Projectile(projectileX, projectileY, this.direction, this, 'football', 10));
                        }
                    }
                    break;
                case 'strong_punch':
                    this.attackCooldown = 45;
                    this.attackBox.active = true;
                    this.attackBox.width = 90;
                    this.attackBox.height = 40;
                    if (this.characterType === 'spark') sounds.spark.strong_punch.triggerAttackRelease("C4", "4n");
                    else if (this.characterType === 'titan') sounds.titan.strong_punch.triggerAttackRelease(150, "4n");
                    else if (this.characterType === 'hades') sounds.hades.strong_punch.triggerAttackRelease("A1", "4n");
                    else if (this.characterType === 'jack') sounds.jack.strong_punch.triggerAttackRelease("E2", "4n");
                    else if (this.characterType === 'genji') sounds.genji.strong_punch.triggerAttackRelease("G3", "4n");
                    else if (this.characterType === 'ryu') sounds.ryu.strong_punch.triggerAttackRelease("C3", "4n");
                    break;
                case 'special':
                    if (this.characterType === 'spark') {
                        return;
                    }
                    const energyCost = (this.characterType === 'malenia' || this.characterType === 'maliketh') ? 300 : (this.characterType === 'lorenzo') ? 400 : (this.characterType === 'genji' || this.characterType === 'ryu' ? 100 : 45);
                    if (this.energy < energyCost) { this.isAttacking = false; return; }
                    this.energy -= energyCost;
                    this.attackCooldown = 60;

                    const projectileY = this.position.y + this.height / 3;
                    const projectileX = this.position.x + (this.direction === 1 ? this.width : -40);

                    if (this.characterType === 'titan') {
                        sounds.titan.special.triggerAttackRelease("2n");
                        projectiles.push(new Projectile(projectileX, projectileY, this.direction, this, 'rocket_punch', 30));
                        createParticleEffect(this, 'special');
                    } else if (this.characterType === 'hades') {
                        sounds.hades.special.triggerAttackRelease("2n");
                        const opponent = this.isPlayer ? player2 : player1;
                        opponent.takeDamage(70, { type: 'burn' });
                        createParticleEffect(opponent, 'ground_explosion', { x: opponent.position.x, y: opponent.position.y + opponent.height, count: 20 });
                    } else if (this.characterType === 'jack') {
                        sounds.jack.special.triggerAttackRelease("C3", "2n");
                        projectiles.push(new Projectile(projectileX, projectileY, this.direction, this, 'pumpkin', 30));
                    } else if (this.characterType === 'genji') {
                        sounds.genji.special.triggerAttackRelease("2n");
                        projectiles.push(new Projectile(projectileX, projectileY, this.direction, this, 'tornado', 70));
                    } else if (this.characterType === 'ryu') {
                        sounds.ryu.special.triggerAttackRelease("1n");
                        this.isDashing = true;
                        this.dashStartX = this.position.x;
                    } else if (this.characterType === 'lorenzo') {
                        if (this.ballCount < this.maxBallCount) {
                            this.ballCount++;
                        }
                        this.isAttacking = false;
                    } else if (this.characterType === 'malenia') {
                        this.isWaterfowlDancing = true;
                        this.waterfowlHitCount = 0;
                        this.dashStartX = this.position.x;
                    } else if (this.characterType === 'maliketh') {
                        this.velocity.y = -20;
                        setTimeout(() => {
                            for (let i = 0; i < 5; i++) {
                                setTimeout(() => {
                                    const opponent = this.isPlayer ? player2 : player1;
                                    const angle = Math.atan2(opponent.position.y - this.position.y, opponent.position.x - this.position.x);
                                    const speed = 8;
                                    const p = new Projectile(this.position.x, this.position.y, this.direction, this, 'maliketh_blade', 70);
                                    p.velocity.x = Math.cos(angle) * speed;
                                    p.velocity.y = Math.sin(angle) * speed;
                                    projectiles.push(p);
                                }, i * 200);
                            }
                        }, 500);
                    }
                    break;
            }
        }
    }

    function createParticleEffect(fighter, type, extraParams = {}) {
        let count = 0;
        let color = extraParams.color || 'orange';

        if (type === 'special' && fighter && fighter.characterType === 'titan') {
            color = 'rgba(255, 100, 0, 0.8)';
            count = 15;
        } else if (type === 'pumpkin_explosion') {
            color = 'rgba(255, 100, 0, 0.8)';
            count = 30;
        } else if (type === 'ground_explosion') {
            count = extraParams.count || 20;
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(
                    extraParams.x + (Math.random() - 0.5) * (fighter ? fighter.width : 50),
                    extraParams.y,
                    'hades_fire',
                    0,
                    { x: (Math.random() - 0.5) * 2, y: -(Math.random() * 6 + 3) }
                ));
            }
            return;
        } else if (type === 'dash_fire') {
            particles.push(new Particle(fighter.position.x + fighter.width / 2, fighter.position.y + fighter.height / 2, 'red', 0, { x: -fighter.direction * 3, y: (Math.random() - 0.5) * 2 }));
            return;
        } else if (type === 'ryu_punch') {
            count = extraParams.count || 1;
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(extraParams.x, extraParams.y, 'ryu_star', 0, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }));
            }
            return;
        } else if (type === 'sword_slash') {
            particles.push(new Particle(fighter.position.x + fighter.width / 2, fighter.position.y + fighter.height / 2, '#c0c0c0', 0, { x: fighter.direction * 5, y: (Math.random() - 0.5) * 5 }));
            return;
        }

        for (let i = 0; i < count; i++) {
            particles.push(new Particle(
                extraParams.x || (fighter.position.x + fighter.width / 2),
                extraParams.y || (fighter.position.y + fighter.height / 2),
                color,
                fighter.direction
            ));
        }
    }

    class Particle {
        constructor(x, y, color, direction, customVelocity) {
            this.position = { x, y };
            this.velocity = customVelocity || {
                x: (Math.random() - 0.5) * 8,
                y: (Math.random() - 0.5) * 8
            };
            this.radius = Math.random() * 4 + 2;
            this.color = color;
            this.life = 100;
        }

        draw() {
            if (this.color === 'hades_fire') {
                ctx.font = `${this.radius * 6}px sans-serif`;
                ctx.fillText('🔥', this.position.x, this.position.y);
            } else if (this.color === 'ryu_star') {
                ctx.font = `${this.radius * 4}px sans-serif`;
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

    class AI {
        constructor(fighter, opponent) {
            this.fighter = fighter;
            this.opponent = opponent;
            this.state = 'IDLE';
            this.decisionInterval = null;
        }

        start() {
            this.decisionInterval = setInterval(() => this.makeDecision(), 300); // A IA toma decisões mais rápido
        }

        stop() {
            if (this.decisionInterval) clearInterval(this.decisionInterval);
            this.fighter.aiVelocityX = 0;
        }

        makeDecision() {
            if (gameState !== 'FIGHT' || this.fighter.isParalyzed) return;

            const distance = Math.abs(this.fighter.position.x - this.opponent.position.x);
            const canUseSpecial = this.fighter.energy >= 45;

            this.fighter.aiVelocityX = 0;
            this.fighter.isDefending = false;

            // Ação defensiva (menos provável)
            if (this.opponent.isAttacking && distance < 150 && Math.random() < 0.5 && this.fighter.defenseResetCooldown <= 0) {
                this.fighter.isDefending = true;
                return;
            }

            // Ações ofensivas (mais prováveis)
            if (canUseSpecial && distance < 300 && Math.random() < 0.7) {
                this.fighter.attack('special');
                return;
            }

            if (distance < 100 && Math.random() < 0.9) {
                this.fighter.attack('punch');
                return;
            }

            // Se não atacar, move-se em direção ao jogador
            if (!this.fighter.isAttacking) {
                this.fighter.aiVelocityX = this.fighter.direction * 3;
            }
        }
    }

    let aiController;

    function isColliding(rect1, rect2) {
        return (
            rect1.position.x < rect2.position.x + rect2.width &&
            rect1.position.x + rect1.width > rect2.position.x &&
            rect1.position.y < rect2.position.y + rect2.height &&
            rect1.position.y + rect1.height > rect2.position.y
        );
    }

    function updateHUD() {
        if (!player1 || !player2) return;
        document.getElementById('p1-name').innerText = player1.name;
        document.getElementById('p1-health').style.width = (player1.health / 1000) * 100 + '%';
        document.getElementById('p1-energy').style.width = (player1.energy / 1000) * 100 + '%';
        document.getElementById('p1-health-text').innerText = `${Math.ceil(player1.health)} / 1000`;
        document.getElementById('p1-energy-text').innerText = `${Math.ceil(player1.energy)} / 1000`;
        updateStatusIcons(player1, document.getElementById('p1-status-effects'));

        document.getElementById('p2-name').innerText = player2.name;
        document.getElementById('p2-health').style.width = (player2.health / 1000) * 100 + '%';
        document.getElementById('p2-energy').style.width = (player2.energy / 1000) * 100 + '%';
        document.getElementById('p2-health-text').innerText = `${Math.ceil(player2.health)} / 1000`;
        document.getElementById('p2-energy-text').innerText = `${Math.ceil(player2.energy)} / 1000`;
        updateStatusIcons(player2, document.getElementById('p2-status-effects'));
    }

    function updateStatusIcons(player, container) {
        container.innerHTML = '';
        if (player.bleedStacks > 0) {
            const bleedIcon = document.createElement('span');
            bleedIcon.className = 'status-icon';
            bleedIcon.innerHTML = `🩸<span class="stack-count">${player.bleedStacks}</span>`;
            container.appendChild(bleedIcon);
        }
        if (player.burnDuration > 0) {
            const burnIcon = document.createElement('span');
            burnIcon.className = 'status-icon';
            burnIcon.innerText = '🌋';
            container.appendChild(burnIcon);
        }
        if (player.curseStacks > 0) {
            const curseIcon = document.createElement('span');
            curseIcon.className = 'status-icon';
            curseIcon.innerHTML = `💀<span class="stack-count">${player.curseStacks}</span>`;
            container.appendChild(curseIcon);
        }
        if (player.characterType === 'ryu' && player.attackSpeedMultiplier > 1) {
            const speedIcon = document.createElement('span');
            speedIcon.className = 'status-icon';
            speedIcon.innerHTML = `✨<span class="stack-count">x${player.attackSpeedMultiplier.toFixed(1)}</span>`;
            container.appendChild(speedIcon);
        }
        if (player.characterType === 'lorenzo') {
            const ballIcon = document.createElement('span');
            ballIcon.className = 'status-icon';
            ballIcon.innerHTML = `⚽️<span class="stack-count">${player.ballCount}</span>`;
            container.appendChild(ballIcon);
        }
    }

    function checkGameOver() {
        if (!player1 || !player2) return;
        if (player1.health <= 0 || player2.health <= 0) {
            gameState = 'GAMEOVER';
            aiController.stop();
            cancelAnimationFrame(gameLoopId);
            gameOverScreen.classList.remove('hidden');

            const winner = player1.health > 0 ? player1 : player2;
            winText.innerText = `${winner.name.toUpperCase()} WINS!`;

            startWinnerZoom(winner);
        }
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
            ctx.translate(winnerToZoom.position.x + winnerToZoom.width / 2, winnerToZoom.position.y + winnerToZoom.height / 2);
            ctx.scale(zoomFactor, zoomFactor);
            ctx.translate(-(winnerToZoom.position.x + winnerToZoom.width / 2), -(winnerToZoom.position.y + winnerToZoom.height / 2));
            winnerToZoom.draw();
            ctx.restore();

            zoomLoopId = requestAnimationFrame(zoomLoop);
        }
        zoomLoop();
    }

    function drawBackground() {
        const skyGradient = ctx.createLinearGradient(0, 0, 0, floorY);
        skyGradient.addColorStop(0, '#1c1c2c');
        skyGradient.addColorStop(1, '#3a3a5a');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvasWidth, floorY);

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 15; j++) {
                ctx.fillStyle = `rgba(50, 50, 70, ${0.5 - i * 0.1})`;
                const x = j * (canvasWidth / 14);
                const h = (Math.random() * 200 + 100) / (i + 1);
                ctx.fillRect(x, floorY - h, canvasWidth / 15, h);
            }
        }

        ctx.fillStyle = '#333';
        ctx.fillRect(0, floorY, canvasWidth, canvasHeight - floorY);

        const gateWidth = canvasWidth * 0.3;
        const gateHeight = canvasHeight * 0.6;
        const gateX = canvasWidth / 2 - gateWidth / 2;
        const gateY = floorY - gateHeight;

        ctx.fillStyle = '#c0392b';
        ctx.fillRect(gateX, gateY, 30, gateHeight);
        ctx.fillRect(gateX + gateWidth - 30, gateY, 30, gateHeight);
        ctx.beginPath();
        ctx.moveTo(gateX - 20, gateY + 20);
        ctx.lineTo(gateX + gateWidth + 20, gateY + 20);
        ctx.lineTo(gateX + gateWidth, gateY);
        ctx.lineTo(gateX, gateY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.fillRect(gateX, gateY - 10, gateWidth, 10);
    }

    function handleFighterCollision() {
        if (!player1 || !player2) return;

        const p1Bottom = player1.position.y + player1.height;
        const p2Bottom = player2.position.y + player2.height;

        if (p1Bottom > player2.position.y && player1.position.y < p2Bottom) {
            const dx = (player1.position.x + player1.width / 2) - (player2.position.x + player2.width / 2);
            const combinedHalfWidths = player1.width / 2 + player2.width / 2;
            const overlapX = combinedHalfWidths - Math.abs(dx);

            if (overlapX > 0) {
                const pushback = overlapX / 2;
                if (dx > 0) {
                    player1.position.x += pushback;
                    player2.position.x -= pushback;
                } else {
                    player1.position.x -= pushback;
                    player2.position.x += pushback;
                }
            }
        }
    }

    function checkMeleeCollision(attacker, defender) {
        if (!attacker.attackBox.active || attacker.attackBox.hit) return;

        if (isColliding(attacker.attackBox, defender)) {
            let damage = 0;
            let effect = {};
            switch (attacker.attackBox.type) {
                case 'punch':
                    damage = (attacker.characterType === 'malenia') ? 9 : 10;
                    if (attacker.characterType === 'malenia') {
                        attacker.health = Math.min(1000, attacker.health + 6);
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
                        createParticleEffect(defender, 'ryu_punch', { x: defender.position.x + defender.width / 2, y: defender.position.y + defender.height / 2, count: attacker.consecutivePunchCounter });
                    }
                    break;
                case 'strong_punch':
                    damage = 25;
                    if (attacker.characterType === 'hades') { effect.type = 'burn'; }
                    if (attacker.characterType === 'jack') { defender.applyCurse(attacker); }
                    break;
            }

            const defended = defender.takeDamage(damage, effect);
            if (defended) {
                attacker.energy = Math.min(1000, attacker.energy + 7.5);
            } else if (damage > 0) {
                attacker.energy = Math.min(1000, attacker.energy + 15);
            }
            attacker.attackBox.hit = true;
        }
    }

    function gameLoop() {
        if (gameState !== 'FIGHT') return;

        gameLoopId = requestAnimationFrame(gameLoop);

        if (player1) player1.update(player2);
        if (player2) player2.update(player1);

        if (!giantBall) {
            handleFighterCollision();
        }

        particles.forEach((p, index) => {
            p.update();
            if (p.life <= 0) particles.splice(index, 1);
        });

        projectiles.forEach((projectile, index) => {
            projectile.update();
            const target = projectile.shooter === player1 ? player2 : player1;

            if (!projectile.hitTargets.includes(target) && isColliding(projectile, target)) {

                if (projectile.type === 'tornado' && !target.isDefending) {
                    projectile.shooter.isSpecialAttacking = true;
                    target.isParalyzed = true;

                    const teleportX = target.position.x - projectile.shooter.width;
                    projectile.shooter.position.x = teleportX;

                    projectile.shooter.velocity.y = -20;
                    target.velocity.y = -20;

                    setTimeout(() => {
                        target.takeDamage(projectile.damage);
                        projectile.shooter.isSpecialAttacking = false;
                        target.isParalyzed = false;
                    }, 500);
                    projectiles.splice(index, 1);
                    return;

                } else if (projectile.type !== 'tornado' || target.isDefending) {
                    target.takeDamage(projectile.damage);
                }

                if (projectile.type === 'pumpkin') {
                    target.applyCurse(projectile.shooter);
                    projectiles.splice(index, 1);
                } else if (projectile.type === 'football') {
                    projectile.velocity.x *= -0.7;
                    projectile.isReturning = true;
                    projectile.hitTargets.push(target);
                }

                if (projectile.type !== 'football') {
                    projectiles.splice(index, 1);
                }
                return;
            }

            if (projectile.type === 'football' && projectile.isReturning && isColliding(projectile, projectile.shooter)) {
                projectile.shooter.ballCount++;
                projectiles.splice(index, 1);
                return;
            }

            if (projectile.position.x + projectile.width > canvasWidth || projectile.position.x < 0) {
                if (projectile.type === 'football') {
                    if (!projectile.isReturning) {
                        groundFootball = { position: { ...projectile.position }, width: projectile.width, height: projectile.height };
                        projectiles.splice(index, 1);
                    } else {
                        projectile.velocity.x *= -1; // Ricocheteia ao voltar
                    }
                } else {
                    projectiles.splice(index, 1);
                }
            }
        });

        if (groundFootball && isColliding(player1, groundFootball)) {
            player1.ballCount++;
            groundFootball = null;
        }

        checkMeleeCollision(player1, player2);
        checkMeleeCollision(player2, player1);

        if (giantBall) {
            const opponent = giantBall.owner === player1 ? player2 : player1;
            giantBall.update(opponent);
            if (giantBall && opponent.attackBox.active && !opponent.attackBox.hit && isColliding(opponent.attackBox, giantBall)) {
                giantBall.takeDamage();
                opponent.attackBox.hit = true;
            }
        }

        draw();
        updateHUD();
        checkGameOver();
    }

    function draw() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawBackground();
        if (player1) player1.draw();
        if (player2) player2.draw();

        if (player1 && player1.isChannelingSpecial) drawLightningChain(player1, player2);
        if (player2 && player2.isChannelingSpecial) drawLightningChain(player2, player1);

        particles.forEach(p => p.draw());
        projectiles.forEach(p => p.draw());
        if (giantBall) giantBall.draw();
        if (groundFootball) {
            ctx.font = `40px sans-serif`;
            ctx.fillText('⚽️', groundFootball.position.x, groundFootball.position.y + groundFootball.height);
        }
    }

    function drawLightningChain(attacker, defender) {
        const startX = attacker.position.x + attacker.width / 2;
        const startY = attacker.position.y + attacker.height / 2;
        const endX = defender.position.x + defender.width / 2;
        const endY = defender.position.y + defender.height / 2;

        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const segments = Math.floor(distance / 20);

        ctx.font = '20px sans-serif';

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const x = startX + dx * t + (Math.random() - 0.5) * 10;
            const y = startY + dy * t + (Math.random() - 0.5) * 10;
            ctx.fillText('⚡️', x, y);
        }
    }

    // --- Controles de Eventos ---
    window.addEventListener('keydown', (e) => {
        if (gameState !== 'FIGHT' || !player1 || !player1.isPlayer) return;

        const key = e.key.toLowerCase();
        const now = Date.now();

        switch (key) {
            case 'a':
                player1.keys.left = true;
                if (player1.direction === -1) {
                    if (player1.lastTap.key === 'a' && now - player1.lastTap.time < 300) {
                        player1.doubleTapped = true;
                        player1.lastTap.key = null;
                        setTimeout(() => { if (player1) player1.doubleTapped = false; }, 300);
                    }
                }
                player1.lastTap = { key: 'a', time: now };
                break;
            case 'd':
                player1.keys.right = true;
                if (player1.direction === 1) {
                    if (player1.lastTap.key === 'd' && now - player1.lastTap.time < 300) {
                        player1.doubleTapped = true;
                        player1.lastTap.key = null;
                        setTimeout(() => { if (player1) player1.doubleTapped = false; }, 300);
                    }
                }
                player1.lastTap = { key: 'd', time: now };
                break;
            case ' ': // Espaço para pular
                if (!player1.isJumping) {
                    player1.velocity.y = -20;
                    player1.isJumping = true;
                }
                break;
            case 's':
                if (!player1.isDefending && !player1.isParalyzed && player1.defenseResetCooldown <= 0) {
                    player1.isPreparingDefense = true;
                    player1.defenseActivationTimer = 30; // 0.5s
                }
                break;
        }

        switch (key) {
            case 'arrowleft':
                if (player1.doubleTapped) {
                    player1.attack('strong_punch');
                } else {
                    player1.attack('punch');
                }
                player1.doubleTapped = false;
                break;
            case 'arrowright':
                if (player1.characterType === 'spark') {
                    player1.isChannelingSpecial = true;
                } else {
                    player1.attack('special');
                }
                player1.doubleTapped = false;
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (gameState !== 'FIGHT' || !player1 || !player1.isPlayer) return;

        switch (e.key.toLowerCase()) {
            case 'a': player1.keys.left = false; break;
            case 'd': player1.keys.right = false; break;
            case 's':
                player1.isPreparingDefense = false;
                if (player1.isDefending) {
                    player1.defenseResetCooldown = 120; // 2s cooldown
                }
                player1.isDefending = false;
                break;
            case 'arrowright':
                if (player1.characterType === 'spark') {
                    player1.isChannelingSpecial = false;
                    player1.channelingDamage = 1;
                    player1.channelingTick = 0;
                }
                break;
        }
    });

    // --- Lógica da Tela de Seleção ---
    function setupSelectionScreen() {
        drawThumbnails();
        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                startGame(card.id.replace('select-', ''));
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

    // --- Início do Jogo ---
    async function startGame(playerChoice) {
        try {
            await Tone.start();
            console.log("Contexto de áudio iniciado.");
        } catch (e) {
            console.error("Erro ao iniciar áudio", e);
        }

        selectionScreen.classList.add('hidden');
        loadingScreen.classList.remove('hidden');

        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            const characters = [
                { id: 'titan', name: 'Titan', type: 'titan' },
                { id: 'spark', name: 'Spark', type: 'spark' },
                { id: 'hades', name: 'Hades', type: 'hades' },
                { id: 'jack', name: 'Jack', type: 'jack' },
                { id: 'genji', name: 'Genji', type: 'genji' },
                { id: 'ryu', name: 'Ryu', type: 'ryu' },
                { id: 'lorenzo', name: 'Don Lorenzo', type: 'lorenzo' },
                { id: 'malenia', name: 'Malenia', type: 'malenia' },
                { id: 'maliketh', name: 'Maliketh', type: 'maliketh' }
            ];

            const playerConfig = characters.find(c => c.id === playerChoice);
            const opponentPool = characters.filter(c => c.id !== playerChoice);
            const opponentConfig = opponentPool[Math.floor(Math.random() * opponentPool.length)];

            player1 = new Fighter(canvasWidth * 0.2, floorY - 120, {}, playerConfig.name, true, playerConfig.type);
            player2 = new Fighter(canvasWidth * 0.8 - 50, floorY - 120, {}, opponentConfig.name, false, opponentConfig.type);

            aiController = new AI(player2, player1);
            aiController.start();

            gameState = 'FIGHT';
            gameLoop();
        }, 5000);
    }

    function resetGame() {
        cancelAnimationFrame(gameLoopId);
        cancelAnimationFrame(zoomLoopId);
        if (aiController) aiController.stop();

        selectionScreen.classList.remove('hidden');
        gameOverScreen.classList.add('hidden');

        player1 = null;
        player2 = null;

        particles = [];
        projectiles = [];
        giantBall = null;
        gameState = 'SELECT';
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawBackground();
    }

    restartButton.addEventListener('click', resetGame);
    drawBackground();
    setupSelectionScreen();
};
