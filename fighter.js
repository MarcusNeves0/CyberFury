// Lutador
// A classe Fighter: andar, atacar, defender, levar dano, status e desenho.
// As ultimates ficam em specials.js (adicionadas à classe por lá).

class Fighter {
    // controller: 'p1' / 'p2' (humanos) ou 'ai'
    constructor(x, y, name, characterType, team, controller) {
        this.characterType = characterType;
        this.name = name;
        this.team = team;
        this.controller = controller;
        this.isPlayer = controller !== 'ai';
        this.keymap = null; // definido em startGame para humanos no teclado
        this.gamepadIndex = null; // definido em startGame para humanos no controle
        this.padMove = { x: 0, y: 0 }; // analógico (pode ser menor que 1 para andar devagar)
        this.padPressed = {}; // botões apertados no quadro anterior
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
        this.walkPhase = 0;     // avança conforme anda; define o quadro da caminhada
        this.walkFrame = null;  // 0-3 andando, null parado
        this.spriteFrame = null; // força 'attack' ou 'idle' durante as animações de golpe
        this.attackAge = 0;     // passos desde o início do golpe
        this.attackWindup = 0;  // passos de preparação antes do golpe acertar
        this.landSquash = 0;    // achatamento ao cair no chão depois de um salto
        this.specialPoseTimer = 0; // mostra a pose de especial por meio segundo
        this.deathTimer = 0;    // animação de derrota (cai e some)
        this.isCelebrating = false; // pose de vitória no zoom final
        this.kbx = 0;   // empurrão (decai sozinho)
        this.kby = 0;
        this.aim = { x: team === 0 ? 1 : -1, y: 0 }; // direção da mira
        this.facing = team === 0 ? 1 : -1;            // lado para onde o sprite olha

        this.maxHealth = HEALTH_BY_CHARACTER[characterType] || MAX_HEALTH;
        this.health = this.maxHealth;
        this.maxEnergy = maxEnergyFor(characterType); // barra cheia = ultimate pronta
        this.energy = Math.round(this.maxEnergy * 0.3);
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
        this.channelingDamage = SPARK_CHAIN_START_DAMAGE;
        this.isDashing = false;
        this.dashDir = null;
        this.dashLeft = 0;
        this.consecutivePunchCounter = 0;
        this.attackSpeedMultiplier = 1;
        this.kenjiComboTimer = 0;
        this.ballCount = (this.characterType === 'craque') ? 4 : 0;
        this.maxBallCount = 7; // máximo na mão, contando as que voltam e as que ele pega do chão
        this.isBladeDancing = false;
        this.bladeDanceHitCount = 0;
        this.bladeDanceLock = null;  // inimigo em que a dança grudou
        this.bladeDanceDamageTaken = 0; // dano levado durante a dança (interrompe ao passar do limite)
        this.bladeDanceAngle = 0;
        this.bladeDanceTick = 0;
        this.hitFlash = 0;
        this.specialCooldown = 0;

        // Zarek
        this.zarekCharge = 0;
        this.zarekForm = null; // null (normal), 'red' ou 'blue'
        this.isInsideOpponent = false;
        this.zarekHost = null; // em quem o Zarek entrou
        this.zarekUltTimer = 0;

        // Healers
        this.healedTotal = 0; // quanto este lutador já curou na partida
        this.stats = { dealt: 0, taken: 0, kos: 0 }; // estatísticas da tela de fim de luta
        this.lastAttacker = null; // quem bateu por último (recebe o abate e o dano contínuo)
        this.healTick = 0;
        this.celestiaUltTimer = 0;
        this.auraDisplayRadius = CELESTIA_AURA_RADIUS; // anima o crescimento da área

        // Nyx
        this.nyxLinkEnemy = null;
        this.nyxLinkAlly = null;
        this.nyxLinkTimer = 0;

        // Veneno (Mamba)
        this.poisonStacks = 0;
        this.poisonDuration = 0;
        this.poisonTick = 0;

        // Mamba: nuvem tóxica
        this.mambaCloudTimer = 0;
        this.mambaCloudTick = 0;

        // IA: torreta inimiga que está tentando quebrar (a mira vai nela em vez do lutador)
        this.focusTurret = null;

        // Roxy
        this.adrenaline = 0;       // 0 a 1
        this.adrenalineTimer = 0;
        this.frenzyTimer = 0;
        this.frenzyFireCooldown = 0;
        if (characterType === 'roxy') {
            this.height = Math.round(FIGHTER_HEIGHT * ROXY_HEIGHT);
            this.radius = 14;
        }
        if (characterType === 'aspas') this.height = Math.round(FIGHTER_HEIGHT * ASPAS_HEIGHT);
        this.shadowBonus = 0;        // Aspas: soldados a mais no exército (+1 por inimigo derrotado)

        // Weaver / teia
        this.slowTimer = 0;          // grudado na teia: anda na metade da velocidade
        this.spiderSenseCooldown = 0;
        this.pullTarget = null;      // inimigo sendo puxado pela teia
        this.pullTimer = 0;
        this.kickTarget = null;      // chute automático logo depois do puxão
        this.kickTimer = 0;

        // Rhino
        this.rhinoRun = 0;           // passos correndo sem parar (embalo)
        this.rhinoChargeLeft = 0;    // distância que falta no Estouro
        this.rhinoChargeDir = null;
        this.rhinoChargeHits = null;

        // Anchor
        this.hookTarget = null;      // inimigo enganchado (o Anchor voa até ele)
        this.hookTimer = 0;

        // Capitã Sina: Roleta da Sina
        this.sinaSpinTimer = 0;      // girando (passos que faltam)
        this.sinaResult = null;      // 'pistol', 'shark' ou 'boat' (sorteado ao começar o giro)
        this.sinaResultTimer = 0;    // resultado ainda à mostra em cima da cabeça
        this.sinaSpinFinal = 0;      // ângulo em que a roleta vai parar
        this.sinaMisses = 0;         // giros seguidos sem barco (proteção contra azar)
        this.sinaPistolShots = 0;    // tiros da pistola que faltam
        this.sinaPistolTimer = 0;
        this.sinaUltWasReady = false; // o papagaio grita quando a roleta fica pronta

        // Coleone: Enterrada
        this.dunkTarget = null;      // inimigo que ele vai agarrar (e depois carrega)
        this.dunkPhase = null;       // 'rush' (correndo para agarrar), 'air' (voando com ele) ou 'ball' (enterrando só a bola)
        this.dunkBallThrown = false;
        this.dunkTimer = 0;
        this.dunkDir = null;
        this.dunkHoop = null;        // cesta holográfica onde ele vai enterrar
        this.heldBy = null;          // agarrado pelo Coleone: vira a bola
        this.heldSpin = 0;           // giro de quem está sendo carregado

        // Bershow: Armadura da Fúria
        this.armorClose = 0;         // visor fechando (antes do Corte Devastador)
        this.furyTimer = 0;          // armadura fechada: sem atordoamento nem empurrão, golpes rápidos, cura batendo
        this.spriteForm = null;      // 'fury' troca a paleta do sprite (rosto coberto, rachaduras acesas)
    }

    applyPoison(stacks) {
        this.poisonStacks = Math.min(POISON_MAX_STACKS, this.poisonStacks + stacks);
        this.poisonDuration = POISON_DURATION;
    }

    // Atiradores: o golpe básico é um tiro com mira automática
    shoot(strong) {
        if (this.characterType === 'roxy') {
            // Alterna as mãos; segurando, as duas pistolas disparam juntas
            const base = leadAim(this, 14);
            const baseAngle = Math.atan2(base.y, base.x);
            const shots = strong ? [-0.07, 0.07] : [(Math.random() - 0.5) * 0.16];
            for (const spread of shots) {
                const angle = baseAngle + spread;
                projectiles.push(new Projectile(this, 'pistol_shot', strong ? ROXY_DOUBLE_DAMAGE : ROXY_SHOT_DAMAGE, { x: Math.cos(angle), y: Math.sin(angle) }, 14));
            }
            sfx.play('pistol_shot');
            return;
        }
        if (this.characterType === 'mamba') {
            projectiles.push(new Projectile(this, 'mamba_shot', strong ? MAMBA_STRONG_DAMAGE : MAMBA_SHOT_DAMAGE, leadAim(this, 16), 16));
            sfx.play('mamba_shot');
        } else {
            // Gear: um prego; o tiro forte solta três em leque
            const base = leadAim(this, 12);
            const angles = strong ? [-0.22, 0, 0.22] : [0];
            for (const a of angles) {
                const angle = Math.atan2(base.y, base.x) + a;
                projectiles.push(new Projectile(this, 'nail', GEAR_NAIL_DAMAGE, { x: Math.cos(angle), y: Math.sin(angle) }, 12));
            }
            sfx.play('gear_shot');
        }
    }

    // Altura do peito na tela (para projéteis, raios e efeitos)
    get chestY() {
        return this.y - this.z - this.height * 0.55;
    }

    draw() {
        // Zarek dentro do oponente fica invisível (a foice em cima da cabeça é desenhada à parte)
        if (this.isInsideOpponent) return;
        if (this.isDead) { this.drawDefeat(); return; }

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

        // --- Animação ---
        const isWalking = Math.hypot(this.moveX, this.moveY) > 0.3 && this.walkFrame !== null;
        // Andando: o corpo sobe um pixel quando as pernas se cruzam; parado: respiração lenta
        let bob = isWalking
            ? (this.walkFrame % 2 === 1 ? 2 : 0)
            : Math.round((Math.sin(Date.now() / 300 + fighters.indexOf(this) * 1.5) + 1));
        if (this.isCelebrating) bob = Math.round(Math.abs(Math.sin(Date.now() / 140)) * 10); // pulinhos de vitória
        const shake = this.hitFlash > 0 ? (Math.random() - 0.5) * 4 : 0;
        const ranged = SHOOTERS.includes(this.characterType) || this.characterType === 'craque';
        const isMeleeStrike = this.isAttacking && !ranged && (this.attackType === 'punch' || this.attackType === 'strong_punch');
        let lean = 0, squashX = 1, squashY = 1, ghost = false;
        this.spriteFrame = null;
        if (isMeleeStrike && this.attackWindup > 0) {
            // Preparação: puxa o corpo para trás
            this.spriteFrame = 'idle';
            lean = this.attackType === 'strong_punch' ? -5 : -3;
            squashX = 0.95; squashY = 1.04;
        } else if (isMeleeStrike) {
            // Impacto e recuperação: avança e volta aos poucos, com um rastro nos primeiros quadros
            const strikeAge = this.attackAge - (this.attackType === 'strong_punch' ? 4 : 2);
            this.spriteFrame = 'attack';
            lean = Math.max(1, 6 - strikeAge * 0.6);
            ghost = strikeAge < 5;
        } else if (this.isAttacking && ranged && (this.attackType === 'punch' || this.attackType === 'strong_punch')) {
            // Atiradores: coice para trás logo depois do tiro
            this.spriteFrame = this.attackAge < 10 ? 'attack' : 'idle';
            lean = this.attackAge < 4 ? -3 : 0;
        }
        if (this.isChargingPunch && this.punchHeld > 4) {
            // Carregando o soco forte: se encolhe
            const charge = Math.min(1, this.punchHeld / STRONG_PUNCH_HOLD);
            squashX = 1 + 0.07 * charge; squashY = 1 - 0.08 * charge;
            lean = -2 * charge;
        }
        if (this.landSquash > 0) { squashX = 1.1; squashY = 0.88; }
        // Especiais: pose de poder; investidas e canalizações usam o quadro de golpe
        const special = this.specialPoseTimer > 0 || this.isCelebrating;
        if (special && !isMeleeStrike) this.spriteFrame = 'special';
        if (this.isDashing || this.isBladeDancing || this.isChannelingSpecial || this.dunkPhase === 'rush') this.spriteFrame = 'attack';
        if (this.frenzyTimer > 0 && this.specialPoseTimer <= 0) this.spriteFrame = 'attack'; // Frenesi: pistolas sempre apontadas
        if (!isWalking && this.spriteFrame === null) this.spriteFrame = 'idle';
        if (special) {
            // Brilho em volta do corpo enquanto solta o poder
            const glow = ctx.createRadialGradient(this.x, this.chestY, 4, this.x, this.chestY, 42);
            const color = this.isCelebrating ? '255, 230, 120' : this.team === 0 ? '0, 255, 255' : '255, 77, 255';
            const strength = this.isCelebrating ? 0.35 : 0.45 * (this.specialPoseTimer / 30);
            glow.addColorStop(0, `rgba(${color}, ${strength})`);
            glow.addColorStop(1, `rgba(${color}, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.x, this.chestY, 42, 0, Math.PI * 2);
            ctx.fill();
        }
        if (this.furyTimer > 0 || this.armorClose > 0) {
            // Armadura da Fúria: aura vermelha pulsando
            const pulse = 0.3 + Math.sin(Date.now() / 90) * 0.1;
            const aura = ctx.createRadialGradient(this.x, this.chestY, 6, this.x, this.chestY, 48);
            aura.addColorStop(0, `rgba(255, 30, 40, ${pulse})`);
            aura.addColorStop(1, 'rgba(255, 30, 40, 0)');
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(this.x, this.chestY, 48, 0, Math.PI * 2);
            ctx.fill();
        }
        // Levando dano: inclina para trás
        const hurtTilt = this.hitFlash > 0 ? -0.14 * (this.hitFlash / 12) : 0;

        ctx.save();
        ctx.translate(this.x + shake + lean * this.facing, this.y - this.z - bob);
        if (this.facing === -1) ctx.scale(-1, 1);
        ctx.rotate(hurtTilt);
        if (this.heldSpin) {
            // Carregado pelo Coleone: gira em volta do meio do corpo
            ctx.translate(0, -this.height / 2);
            ctx.rotate(this.heldSpin);
            ctx.translate(0, this.height / 2);
        }
        ctx.scale(squashX, squashY);
        const possessor = fighters.find(f => f.isInsideOpponent && f.zarekHost === this);
        if (this.hitFlash > 0 && this.hitFlash % 4 < 2) {
            ctx.filter = 'brightness(3) saturate(0)';
        } else if (possessor) {
            // Contorno pulsando na cor da forma enquanto o Zarek está dentro
            const glow = 2 + Math.round((Math.sin(Date.now() / 80) + 1) * 2);
            ctx.filter = `drop-shadow(0 0 ${glow}px ${zarekFormColor(possessor.zarekForm)})`;
        } else if (this.isChargingPunch && this.punchHeld > 6) {
            ctx.filter = `drop-shadow(0 0 ${Math.min(6, this.punchHeld / 4)}px #fff3a0)`;
        }
        const drawArt = characterArt[this.characterType];
        if (drawArt && ghost) {
            // Rastro do golpe: uma cópia transparente um pouco atrás
            ctx.save();
            ctx.globalAlpha = 0.3;
            drawArt(ctx, -this.height / 4 - 7, -this.height, this.height / 2, this.height, this);
            ctx.restore();
        }
        if (drawArt) drawArt(ctx, -this.height / 4, -this.height, this.height / 2, this.height, this);
        ctx.restore();

        const headY = this.y - this.z - this.height - 8;

        // Golpe: arco na direção da mira (só depois da preparação)
        if (this.attackTimer > 0 && this.attackWindup === 0 && this.attackType !== 'special') {
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
        ctx.fillRect(this.x - 20, headY - 5, 40 * (this.health / this.maxHealth), 4);

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

    // Pose de especial com brilho, por meio segundo
    poseSpecial() {
        this.specialPoseTimer = 30;
    }

    // Derrota: tomba para trás e vai sumindo
    drawDefeat() {
        if (this.deathTimer <= 0) return;
        const progress = 1 - this.deathTimer / DEATH_DURATION;
        const drawArt = characterArt[this.characterType];
        this.spriteFrame = 'idle';
        ctx.save();
        ctx.globalAlpha = this.deathTimer < 25 ? this.deathTimer / 25 : 1;
        ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
        ctx.beginPath();
        ctx.ellipse(this.x - this.facing * 24 * Math.min(1, progress * 2), this.y, 26, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(this.x, this.y - Math.sin(Math.min(1, progress * 2) * Math.PI) * 10); // quica de leve ao cair
        if (this.facing === -1) ctx.scale(-1, 1);
        ctx.rotate(-Math.min(1, progress * 2.2) * Math.PI / 2);
        ctx.filter = 'grayscale(0.6) brightness(0.8)';
        if (drawArt) drawArt(ctx, -this.height / 4, -this.height, this.height / 2, this.height, this);
        ctx.restore();
    }

    update() {
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.specialCooldown > 0) this.specialCooldown--;
        if (this.specialPoseTimer > 0) this.specialPoseTimer--;
        if (this.slowTimer > 0) this.slowTimer--;
        if (this.spiderSenseCooldown > 0) this.spiderSenseCooldown--;
        if (this.dunkHoop && --this.dunkHoop.life <= 0) this.dunkHoop = null;
        if (this.furyTimer > 0 && --this.furyTimer === 0) this.spriteForm = null; // a armadura volta a abrir

        // Agarrado pelo Coleone: quem mexe nele é o Coleone (se o Coleone cair, ele é solto)
        if (this.heldBy && (!alive(this.heldBy) || this.heldBy.dunkTarget !== this)) {
            this.heldBy = null;
            this.heldSpin = 0;
        }
        if (this.heldBy) return;

        if (this.isInsideOpponent) {
            this.updateZarekUltimate();
            return;
        }

        // Altura (saltos e arremessos são só visuais); o Anchor nunca sai do chão
        if (this.characterType === 'anchor' && this.vz > 0) this.vz = 0;
        if (this.z > 0 || this.vz !== 0) {
            this.vz -= 0.7;
            this.z += this.vz;
            if (this.z <= 0) { this.z = 0; this.vz = 0; this.landSquash = 6; }
        }
        if (this.landSquash > 0) this.landSquash--;
        if (this.isAttacking) this.attackAge++;

        // Empurrões
        this.x += this.kbx;
        this.y += this.kby;
        this.kbx *= 0.82;
        this.kby *= 0.82;

        // Mira automática no alvo (ou na torreta que a IA está quebrando)
        const opponent = this.target;
        if (this.focusTurret && this.focusTurret.done) this.focusTurret = null;
        const aimAt = this.focusTurret || opponent;
        if (aimAt) {
            this.aim = directionTo(this, aimAt);
            if (Math.abs(this.aim.x) > 0.05) this.facing = this.aim.x > 0 ? 1 : -1;
        }
        this.moveX = 0;
        this.moveY = 0;

        // Enterrada: depois de começar, nada interrompe (nem atordoamento)
        if (this.dunkTarget || this.dunkPhase) {
            this.updateColeoneDunk();
            return;
        }
        // Bershow: parado enquanto o visor fecha; com a armadura fechada, nada o atordoa
        if (this.armorClose > 0) {
            this.updateBershowClose();
            return;
        }
        if (this.furyTimer > 0) this.isParalyzed = false;

        if (this.isBladeDancing) {
            this.updateBladeDance();
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
            this.updateKenjiDash();
            return;
        }
        if (this.rhinoChargeLeft > 0) {
            this.updateRhinoCharge();
            return;
        }
        if (this.hookTarget) {
            this.updateAnchorHook();
            return;
        }

        // Movimento em 8 direções (mais lento atacando; parado defendendo)
        let move = { x: 0, y: 0 };
        if (this.isPlayer && this.gamepadIndex !== null) {
            move = this.padMove;
        } else if (this.isPlayer) {
            move = normalize((this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0), (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0));
        } else {
            move = this.aiMove;
        }
        const baseSpeed = MOVE_SPEED * (this.characterType === 'roxy' ? ROXY_SPEED
            : this.zarekForm === 'blue' ? ZAREK_BLUE_SPEED
            : this.characterType === 'aegis' ? AEGIS_SPEED
            : this.characterType === 'rhino' && this.rhinoRun >= RHINO_RUN_STEPS ? RHINO_RUN_SPEED : 1);
        // Atirando, a Roxy quase não perde velocidade (ela corre e atira)
        const attackSlow = this.characterType === 'roxy' ? 0.85 : 0.5;
        const webbed = this.slowTimer > 0 ? 0.5 : 1; // grudado na teia: metade da velocidade
        const possessed = isPossessed(this) ? ZAREK_POSSESS_SLOW : 1; // Zarek dentro do corpo: anda devagar
        const speed = this.isDefending ? 0 : (this.isAttacking ? baseSpeed * attackSlow : baseSpeed) * webbed * possessed;
        this.moveX = move.x * speed;
        this.moveY = move.y * speed;
        this.x += this.moveX;
        this.y += this.moveY;

        // Caminhada: o ritmo dos passos acompanha a velocidade; a cada pé no chão, uma poeirinha
        const moving = Math.hypot(this.moveX, this.moveY);
        if (moving > 0.3) {
            const before = this.walkFrame;
            this.walkPhase += moving * 0.045;
            this.walkFrame = Math.floor(this.walkPhase) % 4;
            if (this.walkFrame !== before && (this.walkFrame === 0 || this.walkFrame === 2)) spawnStepDust(this);
        } else {
            this.walkFrame = null;
            this.walkPhase = 0;
        }
        if (!opponent && Math.abs(move.x) > 0.05) this.facing = move.x > 0 ? 1 : -1;
        if (this.characterType === 'rhino') {
            const wasCharged = this.rhinoRun >= RHINO_RUN_STEPS;
            if (moving > 0.3 && !this.isAttacking) this.rhinoRun++;
            else if (moving <= 0.3 && !this.isAttacking) this.rhinoRun = 0; // parou: perde o embalo
            if (!wasCharged && this.rhinoRun >= RHINO_RUN_STEPS) floatingTexts.push(new FloatingText(this.x, this.y - this.height - 14, 'EMBALO!', '#ff8a2a'));
        }

        // Segurar o soco carrega o soco forte
        if (this.isChargingPunch) {
            this.punchHeld++;
            if (this.punchHeld >= STRONG_PUNCH_HOLD) {
                this.isChargingPunch = false;
                this.attack('strong_punch');
            }
        }

        if (this.attackWindup > 0) {
            this.attackWindup--; // ainda puxando o braço: o golpe só acerta depois
        } else if (this.attackTimer > 0) {
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

        if (this.characterType === 'kenji' && this.kenjiComboTimer > 0) {
            this.kenjiComboTimer--;
            if (this.kenjiComboTimer <= 0) {
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

    // Tira vida e anota nas estatísticas (dano causado de quem bateu, dano sofrido de quem levou)
    loseHealth(amount, attacker) {
        if (TANKS.includes(this.characterType)) amount *= 1 - TANK_ARMOR; // armadura de tanque
        const lost = Math.max(0, Math.min(amount, this.health));
        this.health -= amount;
        this.stats.taken += lost;
        if (attacker && attacker !== this && attacker.stats) {
            attacker.stats.dealt += lost;
            this.lastAttacker = attacker;
        }
    }

    handleStatusEffects() {
        if (this.burnDuration > 0) {
            this.burnDuration--;
            this.burnTick++;
            if (this.burnTick >= 60) {
                this.loseHealth(9, this.lastAttacker);
                this.burnTick = 0;
                particles.push(new Particle(this.x + (Math.random() - 0.5) * 24, this.chestY, 'orange', 0));
            }
        }

        if (this.curseDuration > 0) {
            this.curseDuration--;
            this.curseTick++;
            if (this.curseTick >= 60) {
                if (this.cursedBy) {
                    this.loseHealth(9 * this.curseStacks, this.cursedBy);
                    if (alive(this.cursedBy)) {
                        this.cursedBy.health = Math.min(this.cursedBy.maxHealth, this.cursedBy.health + (5 * this.curseStacks));
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

        if (this.poisonDuration > 0) {
            this.poisonDuration--;
            this.poisonTick++;
            if (this.poisonTick >= 60) {
                this.loseHealth(POISON_DAMAGE * this.poisonStacks, this.lastAttacker);
                this.poisonTick = 0;
                for (let i = 0; i < 3; i++) particles.push(new Particle(this.x + (Math.random() - 0.5) * 24, this.chestY, '#4cff7a', 0, { x: 0, y: -1.5 }));
            }
            if (this.poisonDuration === 0) this.poisonStacks = 0;
        }

        if (this.bleedDuration > 0) {
            this.bleedDuration--;
            this.bleedTick++;
            if (this.bleedTick >= 60) {
                this.loseHealth(BLEED_DAMAGE * this.bleedStacks, this.lastAttacker);
                this.bleedTick = 0;
                particles.push(new Particle(this.x + (Math.random() - 0.5) * 24, this.chestY, 'red', 0));
            }
            if (this.bleedDuration === 0) {
                this.bleedStacks = 0;
            }
        }
    }

    // Recupera vida (sem passar do máximo) e mostra o número verde subindo
    heal(amount, healer) {
        if (this.isDead || this.isInsideOpponent) return 0;
        const healed = Math.min(amount, this.maxHealth - this.health);
        if (healed <= 0) return 0;
        this.health += healed;
        if (healer) healer.healedTotal += healed;
        floatingTexts.push(new FloatingText(this.x, this.y - this.z - this.height - 16, `+${Math.round(healed)}`, '#6dff8a'));
        return healed;
    }

    applyCurse(attacker) {
        this.cursedBy = attacker;
        this.curseStacks = Math.min(3, this.curseStacks + 1);
        this.curseDuration = 300; // 5 segundos
    }

    // Empurra numa direção (o empurrão decai sozinho, ~5x a força em pixels)
    push(direction, force) {
        if (this.characterType === 'anchor') return; // Anchor: plantado no chão
        if (this.furyTimer > 0 || this.armorClose > 0) return; // Bershow com a armadura fechada
        this.kbx += direction.x * force;
        this.kby += direction.y * force;
    }

    // attacker: quem causou o dano (usado pela barra do Zarek e pela maldição)
    takeDamage(damage, effect = {}, attacker = null) {
        if (this.isInsideOpponent || this.isDead) return false; // Zarek dentro do oponente não pode ser atingido

        // Sentido aranha: às vezes o Weaver percebe o golpe a tempo e desvia sozinho
        if (this.characterType === 'weaver' && !effect.unblockable && this.spiderSenseCooldown <= 0 && Math.random() < SPIDER_SENSE_CHANCE) {
            this.spiderSenseCooldown = SPIDER_SENSE_COOLDOWN;
            const away = attacker ? directionTo(attacker, this) : { x: 0, y: 1 };
            this.push({ x: -away.y, y: away.x }, Math.random() < 0.5 ? 6 : -6); // pulinho para o lado
            floatingTexts.push(new FloatingText(this.x, this.y - this.height - 14, '!', '#ffe34a'));
            sfx.play('spider_sense');
            return true;
        }

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
        if (damage >= 25) screenShake = Math.max(screenShake, Math.min(8, damage / 9));
        if (this.isChannelingSpecial) this.stopChanneling(); // levar dano quebra o choque
        // Akane grudada: se o time da vítima bater forte nela, a dança é interrompida
        if (this.isBladeDancing && this.bladeDanceLock) {
            this.bladeDanceDamageTaken += damage;
            if (this.bladeDanceDamageTaken >= AKANE_INTERRUPT_DAMAGE) {
                this.endBladeDance();
                floatingTexts.push(new FloatingText(this.x, this.y - this.height - 16, 'INTERROMPIDA!', '#ffd23f'));
            }
        }

        // Barra do Zarek: só golpes que causam dano de verdade contam (bloqueio e dano contínuo não)
        if (this.characterType === 'zarek') addZarekCharge(this, ZAREK_CHARGE_ON_HURT);
        if (attacker && attacker.characterType === 'zarek') addZarekCharge(attacker, ZAREK_CHARGE_ON_HIT);
        this.loseHealth(damage, attacker);
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
        if (this.attackCooldown > 0 || this.isParalyzed || this.isDefending || this.isDashing || this.isBladeDancing || this.isInsideOpponent || this.isDead) return;

        this.isAttacking = true;
        this.attackType = type;
        this.attackHit = false;
        this.attackAge = 0;
        this.attackWindup = 0;

        switch (type) {
            case 'punch':
                if (SHOOTERS.includes(this.characterType)) {
                    this.attackCooldown = this.characterType === 'mamba' ? 28
                        : this.characterType === 'roxy' ? Math.round(ROXY_FIRE_INTERVAL / (1 + 0.5 * this.adrenaline))
                        : 16;
                    this.shoot(false);
                    break;
                }
                if (this.characterType === 'craque') {
                    // O "soco" do Craque é um chute de bola
                    if (this.ballCount <= 0) { this.isAttacking = false; return; }
                    this.attackCooldown = 14;
                    this.ballCount--;
                    sfx.play('craque_kick');
                    projectiles.push(new Projectile(this, 'football', 20, leadAim(this, 11), 11));
                    break;
                }
                if (this.characterType === 'bershow') {
                    this.attackCooldown = this.furyTimer > 0 ? BERSHOW_ARMOR_SWORD_COOLDOWN : BERSHOW_SWORD_COOLDOWN;
                    this.attackTimer = 8;
                    sfx.play('swing_heavy');
                } else if (this.characterType === 'jack' || this.characterType === 'akane' || this.characterType === 'fenris' || this.characterType === 'zarek' || this.characterType === 'anchor') {
                    this.attackCooldown = 30;
                    this.attackTimer = 8;
                    sfx.play('blade_swing');
                } else {
                    this.attackCooldown = (this.characterType === 'weaver' ? WEAVER_PUNCH_COOLDOWN : this.characterType === 'sina' ? SINA_KNIFE_COOLDOWN
                        : this.characterType === 'aspas' ? ASPAS_DAGGER_COOLDOWN : 20) / this.attackSpeedMultiplier;
                    this.attackTimer = 6;
                    sfx.play(['kaze', 'sina', 'aspas'].includes(this.characterType) ? 'blade_swing' : 'swing');
                }
                this.attackWindup = 2; // puxa o braço por um instante antes de acertar
                break;
            case 'strong_punch':
                if (this.characterType === 'weaver') {
                    // Weaver: o "soco forte" é uma bolinha de teia que deixa o alvo lento
                    this.attackCooldown = 40;
                    projectiles.push(new Projectile(this, 'web', WEB_DAMAGE, leadAim(this, 11), 11));
                    sfx.play('web_shot');
                    break;
                }
                if (SHOOTERS.includes(this.characterType)) {
                    this.attackCooldown = this.characterType === 'roxy' ? 20 : 45;
                    this.shoot(true);
                    break;
                }
                this.attackCooldown = this.characterType === 'bershow' && this.furyTimer > 0 ? 30 : 45;
                this.attackTimer = 8;
                this.attackWindup = 4; // o soco forte puxa mais o braço
                if (this.characterType === 'sina') this.push(this.aim, SINA_STAB_LUNGE); // estocada: dá um passo à frente
                if (this.characterType === 'aspas') this.shadowStep(); // some e reaparece atrás do alvo
                sfx.play(isBladeUser(this) ? 'blade_swing' : 'swing_heavy');
                break;
            case 'special':
                // Possuído pelo Zarek: não consegue usar o especial
                if (isPossessed(this)) { this.isAttacking = false; return; }
                if (this.characterType === 'spark') {
                    return;
                }
                if (this.characterType === 'zarek') {
                    this.startZarekUltimate();
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
                if (this.characterType === 'nyx') {
                    this.startNyxLink();
                    return;
                }
                if (this.characterType === 'mamba') {
                    this.startMambaCloud();
                    return;
                }
                if (this.characterType === 'gear') {
                    this.placeTurret();
                    return;
                }
                if (this.characterType === 'roxy') {
                    this.startFrenzy();
                    return;
                }
                if (this.characterType === 'weaver') {
                    this.startWeaverPull();
                    return;
                }
                if (this.characterType === 'aegis') {
                    this.startAegisWall();
                    return;
                }
                if (this.characterType === 'rhino') {
                    this.startRhinoCharge();
                    return;
                }
                if (this.characterType === 'anchor') {
                    this.startAnchorHook();
                    return;
                }
                if (this.characterType === 'sina') {
                    this.startSinaRoulette();
                    return;
                }
                if (this.characterType === 'coleone') {
                    this.startColeoneDunk();
                    return;
                }
                if (this.characterType === 'bershow') {
                    this.startBershowArmor();
                    return;
                }
                if (this.characterType === 'aspas') {
                    this.summonShadowArmy();
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
                this.poseSpecial();

                sfx.play(`${this.characterType}_special`);

                if (this.characterType === 'titan') {
                    projectiles.push(new Projectile(this, 'rocket_punch', 55, leadAim(this, 10), 10));
                    createParticleEffect(this, 'special');
                } else if (this.characterType === 'hades') {
                    // Círculo de fogo no chão onde o alvo vai estar; explode depois do aviso
                    const spot = predictPosition(this.target, HADES_WARNING_FRAMES * 0.6);
                    hazards.push({ x: spot.x, y: spot.y, radius: HADES_RADIUS, timer: HADES_WARNING_FRAMES, owner: this });
                } else if (this.characterType === 'jack') {
                    projectiles.push(new Projectile(this, 'pumpkin', 30, leadAim(this, 6), 6));
                } else if (this.characterType === 'kaze') {
                    projectiles.push(new Projectile(this, 'tornado', 90, leadAim(this, 8), 8));
                } else if (this.characterType === 'kenji') {
                    this.isDashing = true;
                    this.dashDir = leadAim(this, 16);
                    this.dashLeft = 400;
                } else if (this.characterType === 'craque') {
                    // Bolas soltas pela arena? Puxa todas de volta. Se não houver, ganha uma bola nova.
                    if (!this.recallBalls() && this.ballCount < this.maxBallCount) {
                        this.ballCount++;
                    }
                    this.isAttacking = false;
                } else if (this.characterType === 'akane') {
                    this.isBladeDancing = true;
                    this.bladeDanceHitCount = 0;
                    this.bladeDanceLock = null;
                    this.dashDir = { ...this.aim };
                    this.dashLeft = 420;
                } else if (this.characterType === 'fenris') {
                    this.vz = 12; // salta
                    setTimeout(() => {
                        for (let i = 0; i < 5; i++) {
                            setTimeout(() => {
                                // Cada lâmina mira no inimigo atual (se ele ainda estiver de pé)
                                if (gameState !== 'FIGHT' || this.isDead || !alive(this.target)) return;
                                projectiles.push(new Projectile(this, 'fenris_blade', 70, leadAim(this, 8), 8));
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

    // Quem está focando uma torreta acerta ela primeiro
    const focus = attacker.focusTurret;
    if (focus && !focus.done && inArc(focus.x, focus.y, focus.radius)) {
        focus.takeHit(attacker.attackType === 'strong_punch' ? 35 : 15);
        attacker.attackHit = true;
        return;
    }
    const defender = enemiesOf(attacker).find(e => !e.isInsideOpponent && inArc(e.x, e.y, e.radius));
    if (!defender) {
        const turret = turrets.find(t => t.team !== attacker.team && inArc(t.x, t.y, t.radius));
        if (turret) {
            turret.takeHit(attacker.attackType === 'strong_punch' ? 35 : 15);
            attacker.attackHit = true;
            return;
        }
        const box = obstacles.find(o => o.hp !== undefined && inArc(obstacleCenter(o).x, obstacleCenter(o).y, isRound(o) ? o.r : 14));
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
            damage = (attacker.characterType === 'akane') ? 14 : (attacker.characterType === 'nyx') ? NYX_PUNCH_DAMAGE : (attacker.characterType === 'kaze') ? KAZE_PUNCH_DAMAGE : (attacker.characterType === 'weaver') ? WEAVER_PUNCH_DAMAGE : (attacker.characterType === 'kenji') ? KENJI_PUNCH_DAMAGE : (attacker.characterType === 'aegis') ? AEGIS_PUNCH_DAMAGE : (attacker.characterType === 'rhino') ? RHINO_PUNCH_DAMAGE : (attacker.characterType === 'anchor') ? ANCHOR_PUNCH_DAMAGE : (attacker.characterType === 'sina') ? SINA_KNIFE_DAMAGE : (attacker.characterType === 'coleone') ? COLEONE_PUNCH_DAMAGE : (attacker.characterType === 'bershow') ? BERSHOW_SWORD_DAMAGE : (attacker.characterType === 'aspas') ? ASPAS_DAGGER_DAMAGE : 10;
            if (attacker.zarekForm === 'red') damage = 12;
            if (attacker.zarekForm === 'blue') damage = ZAREK_BLUE_PUNCH;
            if (attacker.characterType === 'akane') {
                attacker.health = Math.min(attacker.maxHealth, attacker.health + 8);
            }
            if (attacker.characterType === 'hades') { effect.type = 'burn'; }
            if (attacker.characterType === 'jack') {
                attacker.cursePunchCounter++;
                if (attacker.cursePunchCounter >= 2) {
                    defender.applyCurse(attacker);
                    attacker.cursePunchCounter = 0;
                }
            }
            if (attacker.characterType === 'kaze') {
                attacker.bleedPunchCounter++;
                if (attacker.bleedPunchCounter >= 3) {
                    effect.type = 'bleed';
                    attacker.bleedPunchCounter = 0;
                }
            }
            if (attacker.characterType === 'kenji') {
                attacker.consecutivePunchCounter++;
                attacker.attackSpeedMultiplier = Math.min(KENJI_MAX_COMBO_SPEED, 1 + (attacker.consecutivePunchCounter - 1));
                attacker.kenjiComboTimer = 120; // 2 segundos
                createParticleEffect(defender, 'kenji_punch', { x: defender.x, y: defender.chestY, count: attacker.consecutivePunchCounter });
            }
            break;
        case 'strong_punch':
            damage = (attacker.zarekForm === 'red') ? 30 : (attacker.zarekForm === 'blue') ? ZAREK_BLUE_STRONG : 25;
            if (attacker.characterType === 'titan') damage = 35; // braço robótico: lento, mas pesado
            if (attacker.characterType === 'anchor') damage = 40; // âncora com as duas mãos
            if (attacker.characterType === 'sina') damage = SINA_STAB_DAMAGE; // estocada com a faca
            if (attacker.characterType === 'coleone') damage = COLEONE_STRONG_DAMAGE; // toco que manda para longe
            if (attacker.characterType === 'bershow') damage = BERSHOW_STRONG_DAMAGE; // espadão com as duas mãos
            if (attacker.characterType === 'aspas') damage = ASPAS_STEP_DAMAGE; // corte pelas costas
            if (attacker.characterType === 'hades') { effect.type = 'burn'; }
            if (attacker.characterType === 'jack') { defender.applyCurse(attacker); }
            break;
    }

    // Rhino com embalo: o golpe tira mais e empurra forte (e gasta o embalo)
    const rhinoCharged = attacker.characterType === 'rhino' && attacker.rhinoRun >= RHINO_RUN_STEPS;
    if (rhinoCharged) { damage += RHINO_RUN_BONUS; attacker.rhinoRun = 0; }
    // Bershow: o espadão acerta todos dentro do arco, e a Fúria aumenta o dano conforme a vida dele cai
    let targets = [defender];
    if (attacker.characterType === 'bershow') {
        targets = enemiesOf(attacker).filter(e => !e.isInsideOpponent && inArc(e.x, e.y, e.radius));
        damage = Math.round(damage * bershowRage(attacker));
    }
    for (const target of targets) {
        const defended = target.takeDamage(damage, effect, attacker);
        if (defended) {
            attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 7.5);
        } else if (damage > 0) {
            attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 15);
            const pushForce = rhinoCharged ? 12 : attacker.characterType === 'aegis' ? 6
                : attacker.characterType === 'coleone' && attacker.attackType === 'strong_punch' ? 9 // toco: manda para longe
                : attacker.attackType === 'strong_punch' ? 4 : 1.5;
            target.push(attacker.aim, pushForce);
            // Nyx: cada acerto rouba vida e manda um orbe para o aliado mais ferido
            if (attacker.characterType === 'nyx') {
                lifeOrbs.push(new LifeOrb(target, attacker, attacker.attackType === 'strong_punch' ? NYX_STRONG_HEAL : NYX_PUNCH_HEAL));
            }
            // Bershow com a armadura fechada: cura parte do dano de cada golpe
            if (attacker.furyTimer > 0) attacker.heal(damage * BERSHOW_ARMOR_LIFESTEAL, null);
        }
    }
    attacker.attackHit = true;
}

// Energia gasta pelo especial de cada personagem (Spark, Zarek e healers têm regras próprias)
function specialCost(characterType) {
    return {
        akane: 150, fenris: 220, craque: 150, kaze: 100, kenji: 75, jack: 55, titan: 22,
        zarek: ZAREK_ULT_COST, celestia: CELESTIA_ULT_COST, flora: FLORA_FLOWER_COST, nyx: NYX_LINK_COST,
        mamba: MAMBA_CLOUD_COST, gear: GEAR_TURRET_COST, roxy: ROXY_FRENZY_COST, weaver: WEAVER_PULL_COST,
        aegis: AEGIS_WALL_COST, rhino: RHINO_CHARGE_COST, anchor: ANCHOR_HOOK_COST, sina: SINA_ULT_COST,
        coleone: COLEONE_DUNK_COST, bershow: BERSHOW_ARMOR_COST, aspas: ASPAS_ARMY_COST,
    }[characterType] || 45;
}

// Tamanho da barra de energia: o custo da ultimate (barra cheia = pronta). O Gear guarda energia
// para as 3 torretas, a Flora para 2 flores; o Spark só precisa de um pouco para ligar o choque.
function maxEnergyFor(characterType) {
    if (characterType === 'gear') return GEAR_TURRET_COST * GEAR_MAX_TURRETS;
    if (characterType === 'flora') return FLORA_FLOWER_COST * 2;
    if (characterType === 'spark') return 100;
    return specialCost(characterType);
}

// Ultimate pronta para usar agora (energia e trava curta)
function ultReady(fighter) {
    return fighter.energy >= specialCost(fighter.characterType) && fighter.specialCooldown <= 0;
}

// Quem luta de longe (atiradores, Craque e Flora)
function isRangedFighter(fighter) {
    return SHOOTERS.includes(fighter.characterType) || ['craque', 'flora'].includes(fighter.characterType);
}

function isBladeUser(fighter) {
    return ['jack', 'akane', 'fenris', 'kaze', 'zarek', 'sina', 'bershow', 'aspas'].includes(fighter.characterType);
}

// Bershow: Fúria — quanto menos vida, mais dano (até +50% com a vida quase no fim)
function bershowRage(fighter) {
    return 1 + BERSHOW_RAGE_MAX * (1 - Math.max(0, fighter.health) / fighter.maxHealth);
}
