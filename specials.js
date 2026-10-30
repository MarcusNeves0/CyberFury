// Habilidades especiais
// Ultimates de cada personagem (métodos adicionados à classe Fighter) e
// os objetos que elas criam: flores da Flora, torretas do Gear, orbes da Nyx, formas do Zarek...

'use strict'; // os métodos vieram de dentro da classe Fighter, que já era estrita

Object.assign(Fighter.prototype, {

    // Mamba: solta a nuvem tóxica, que anda com ela por 5 s (ela continua podendo andar e atirar)
    startMambaCloud() {
        this.isAttacking = false;
        if (this.energy < MAMBA_CLOUD_COST || this.specialCooldown > 0) return;
        this.energy -= MAMBA_CLOUD_COST;
        this.specialCooldown = MAMBA_CLOUD_COOLDOWN;
        this.mambaCloudTimer = MAMBA_CLOUD_DURATION;
        this.mambaCloudTick = 0;
        this.poseSpecial();
        sfx.play('mamba_special');
    },

    // A cada 0,5 s fere quem está dentro; a cada 1 s soma um acúmulo de veneno
    updateMambaCloud() {
        if (this.mambaCloudTimer <= 0) return;
        this.mambaCloudTimer--;
        this.mambaCloudTick++;
        if (this.mambaCloudTick % 30 !== 0) return;
        for (const enemy of enemiesOf(this)) {
            if (enemy.isInsideOpponent || distance(this, enemy) > MAMBA_CLOUD_RADIUS + enemy.radius) continue;
            const defended = enemy.takeDamage(MAMBA_CLOUD_TICK_DAMAGE, { sound: 'hit' }, this);
            if (!defended && this.mambaCloudTick % 60 === 0) enemy.applyPoison(1);
        }
    },

    // Roxy: Frenesi — por 3 s as duas pistolas atiram sozinhas, no dobro da velocidade,
    // cada uma no seu alvo (os dois inimigos mais próximos)
    startFrenzy() {
        this.isAttacking = false;
        if (this.energy < ROXY_FRENZY_COST || this.specialCooldown > 0) return;
        this.energy -= ROXY_FRENZY_COST;
        this.specialCooldown = ROXY_FRENZY_COOLDOWN;
        this.frenzyTimer = ROXY_FRENZY_DURATION;
        this.frenzyFireCooldown = 0;
        this.poseSpecial();
        sfx.play('roxy_special');
    },

    // Adrenalina (some depois de 1 s sem acertar) e os tiros automáticos do Frenesi
    updateRoxy() {
        if (this.adrenalineTimer > 0) this.adrenalineTimer--;
        else this.adrenaline = 0;

        if (this.frenzyTimer <= 0) return;
        this.frenzyTimer--;
        if (--this.frenzyFireCooldown > 0) return;
        // Dobro da velocidade normal, alternando as mãos
        this.frenzyFireCooldown = Math.max(2, Math.round(ROXY_FIRE_INTERVAL / 2 / (1 + 0.5 * this.adrenaline)));
        const targets = enemiesOf(this)
            .filter(e => !e.isInsideOpponent && distance(this, e) < 420)
            .sort((a, b) => distance(this, a) - distance(this, b));
        if (!targets.length) return;
        // Mão esquerda no mais próximo, mão direita no segundo (ou no mesmo, se só houver um)
        this.frenzyHand = this.frenzyHand === 0 ? 1 : 0;
        const enemy = targets[this.frenzyHand] || targets[0];
        const realTarget = this.target;
        this.target = enemy;
        const dir = leadAim(this, 14);
        this.target = realTarget;
        projectiles.push(new Projectile(this, 'pistol_shot', ROXY_SHOT_DAMAGE, dir, 14));
        sfx.play('pistol_shot');
    },

    // Weaver: lança uma teia no alvo e puxa ele até perto; chegando, o alvo leva dano e fica atordoado
    startWeaverPull() {
        this.isAttacking = false;
        const target = this.target;
        if (!alive(target) || target.isInsideOpponent || this.pullTarget) return;
        if (this.energy < WEAVER_PULL_COST || this.specialCooldown > 0 || distance(this, target) > WEAVER_PULL_RANGE) return;
        this.energy -= WEAVER_PULL_COST;
        this.specialCooldown = WEAVER_PULL_COOLDOWN;
        this.pullTarget = target;
        this.pullTimer = 40; // no máximo ~0,7 s puxando (se ficar preso num obstáculo, solta)
        this.poseSpecial();
        sfx.play('weaver_special');
    },

    updateWeaverPull() {
        const target = this.pullTarget;
        if (!target) return;
        if (!alive(target) || target.isInsideOpponent) { this.pullTarget = null; return; }
        const stopDistance = this.radius + target.radius + 10;
        const d = distance(this, target);
        this.pullTimer--;
        if (d > stopDistance && this.pullTimer > 0) {
            const dir = directionTo(target, this);
            const step = Math.min(WEAVER_PULL_SPEED, d - stopDistance);
            target.x += dir.x * step;
            target.y += dir.y * step;
            target.isParalyzed = true;
            target.paralysisTimer = Math.max(target.paralysisTimer, 2);
            return;
        }
        // Chegou: dano e atordoamento; logo depois vem o chute para cima
        target.isParalyzed = true;
        target.paralysisTimer = Math.max(target.paralysisTimer, WEAVER_PULL_STUN);
        target.takeDamage(WEAVER_PULL_DAMAGE, { unblockable: true, sound: 'hit_heavy' }, this);
        this.pullTarget = null;
        this.kickTarget = target;
        this.kickTimer = WEAVER_KICK_DELAY;
    },

    // Chute para cima depois do puxão: dano e joga o alvo no ar
    updateWeaverKick() {
        if (!this.kickTarget) return;
        if (--this.kickTimer > 0) return;
        const target = this.kickTarget;
        this.kickTarget = null;
        if (!alive(target) || target.isInsideOpponent || distance(this, target) > this.radius + target.radius + 40) return;
        this.isAttacking = true;
        this.attackType = 'strong_punch';
        this.attackAge = 4; // mostra direto o quadro do golpe (sem preparação)
        this.attackCooldown = Math.max(this.attackCooldown, 12);
        target.vz = 8;
        target.takeDamage(WEAVER_KICK_DAMAGE, { unblockable: true, sound: 'hit_heavy' }, this);
        for (let i = 0; i < 10; i++) {
            particles.push(new Particle(target.x, target.chestY, i % 2 ? '#3ff6ff' : '#e8fbff', 0, { x: (Math.random() - 0.5) * 4, y: -Math.random() * 4 }));
        }
    },

    // Aegis: Muralha — parede de energia à frente que segura tiros e deixa inimigos lentos
    startAegisWall() {
        this.isAttacking = false;
        if (this.energy < AEGIS_WALL_COST || this.specialCooldown > 0) return;
        this.energy -= AEGIS_WALL_COST;
        this.specialCooldown = AEGIS_WALL_COOLDOWN;
        const dir = this.aim;
        const cx = this.x + dir.x * AEGIS_WALL_DISTANCE, cy = this.y + dir.y * AEGIS_WALL_DISTANCE;
        const half = AEGIS_WALL_LENGTH / 2;
        walls.push({
            team: this.team, owner: this, life: AEGIS_WALL_DURATION,
            x1: cx - dir.y * half, y1: cy + dir.x * half, x2: cx + dir.y * half, y2: cy - dir.x * half,
        });
        this.poseSpecial();
        sfx.play('aegis_special');
    },

    // Rhino: Estouro — dispara em linha reta atropelando todos (quebra caixas e torretas no caminho)
    startRhinoCharge() {
        this.isAttacking = false;
        if (this.energy < RHINO_CHARGE_COST || this.specialCooldown > 0 || !this.target) return;
        this.energy -= RHINO_CHARGE_COST;
        this.specialCooldown = RHINO_CHARGE_COOLDOWN;
        this.rhinoChargeDir = leadAim(this, RHINO_CHARGE_SPEED);
        this.rhinoChargeLeft = RHINO_CHARGE_DISTANCE;
        this.rhinoChargeHits = new Set();
        this.poseSpecial();
        sfx.play('rhino_special');
    },

    updateRhinoCharge() {
        const dir = this.rhinoChargeDir;
        this.x += dir.x * RHINO_CHARGE_SPEED;
        this.y += dir.y * RHINO_CHARGE_SPEED;
        this.rhinoChargeLeft -= RHINO_CHARGE_SPEED;
        this.facing = dir.x >= 0 ? 1 : -1;
        spawnStepDust(this);
        for (const enemy of enemiesOf(this)) {
            if (enemy.isInsideOpponent || this.rhinoChargeHits.has(enemy)) continue;
            if (distance(this, enemy) > this.radius + enemy.radius + 6) continue;
            this.rhinoChargeHits.add(enemy);
            // Joga para o lado (o lado em que o inimigo já estava)
            const side = (enemy.x - this.x) * -dir.y + (enemy.y - this.y) * dir.x >= 0 ? 1 : -1;
            const defended = enemy.takeDamage(RHINO_CHARGE_DAMAGE, { sound: 'hit_heavy' }, this);
            enemy.push({ x: -dir.y * side, y: dir.x * side }, defended ? 5 : 11);
            if (!defended) {
                enemy.isParalyzed = true;
                enemy.paralysisTimer = Math.max(enemy.paralysisTimer, RHINO_CHARGE_STUN);
            }
            screenShake = Math.max(screenShake, 6);
        }
        turrets.filter(t => t.team !== this.team && !t.done && Math.hypot(t.x - this.x, t.y - this.y) < this.radius + t.radius + 4)
            .forEach(t => t.destroy(true));
        for (const box of obstacles.filter(o => o.hp !== undefined)) {
            if (circleHitsObstacle(this.x, this.y, this.radius + 4, box)) damageBox(box, 999);
        }
        const hitTree = obstacles.some(o => o.hp === undefined && circleHitsObstacle(this.x, this.y, this.radius, o));
        const hitWall = this.x <= arena.left || this.x >= arena.right || this.y <= arena.top || this.y >= arena.bottom;
        if (this.rhinoChargeLeft <= 0 || hitTree || hitWall) {
            this.rhinoChargeLeft = 0;
            if (hitTree || hitWall) screenShake = Math.max(screenShake, 4);
        }
    },

    // Anchor: Gancho — joga a âncora no inimigo e a corrente leva o Anchor até ele; chegando, atordoa
    startAnchorHook() {
        this.isAttacking = false;
        const target = this.target;
        if (!alive(target) || target.isInsideOpponent || this.hookTarget) return;
        if (this.energy < ANCHOR_HOOK_COST || this.specialCooldown > 0 || distance(this, target) > ANCHOR_HOOK_RANGE) return;
        this.energy -= ANCHOR_HOOK_COST;
        this.specialCooldown = ANCHOR_HOOK_COOLDOWN;
        this.hookTarget = target;
        this.hookTimer = 40; // no máximo ~0,7 s voando (se ficar preso num obstáculo, solta)
        this.poseSpecial();
        sfx.play('anchor_special');
    },

    updateAnchorHook() {
        const target = this.hookTarget;
        if (!alive(target) || target.isInsideOpponent) { this.hookTarget = null; return; }
        const stopDistance = this.radius + target.radius + 6;
        const d = distance(this, target);
        this.hookTimer--;
        if (d > stopDistance && this.hookTimer > 0) {
            const dir = directionTo(this, target);
            const step = Math.min(ANCHOR_HOOK_SPEED, d - stopDistance);
            this.x += dir.x * step;
            this.y += dir.y * step;
            this.facing = dir.x >= 0 ? 1 : -1;
            return;
        }
        this.hookTarget = null;
        if (d > stopDistance + 20) return; // não chegou (bateu em algo no caminho)
        // Chegou: pancada com a âncora e o inimigo fica atordoado
        target.isParalyzed = true;
        target.paralysisTimer = Math.max(target.paralysisTimer, ANCHOR_HOOK_STUN);
        target.takeDamage(ANCHOR_HOOK_DAMAGE, { unblockable: true, sound: 'hit_heavy' }, this);
        screenShake = Math.max(screenShake, 6);
        for (let i = 0; i < 14; i++) {
            particles.push(new Particle(target.x, target.chestY, i % 2 ? '#c0c8d8' : '#ffe34a', 0, { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 }));
        }
    },

    // Coleone: Enterrada — corre até o inimigo, agarra, voa com ele como se fosse a bola e enterra no chão
    // (sem ninguém perto para agarrar, salta sozinho e enterra só a bola)
    startColeoneDunk() {
        this.isAttacking = false;
        if (this.dunkPhase || this.energy < COLEONE_DUNK_COST || this.specialCooldown > 0) return;
        const target = this.target;
        this.energy -= COLEONE_DUNK_COST;
        this.specialCooldown = COLEONE_DUNK_COOLDOWN;
        if (!alive(target) || target.isInsideOpponent || target.heldBy || distance(this, target) > COLEONE_DUNK_RANGE) {
            this.startBallDunk();
            return;
        }
        this.dunkTarget = target;
        this.dunkPhase = 'rush';
        this.dunkTimer = 30; // no máximo ~0,5 s correndo (se ficar preso num obstáculo, desiste)
        sfx.play('coleone_special');
    },

    // Enterrada só com a bola: salta no lugar e, lá do alto, enterra a bola na cesta onde o alvo vai estar
    startBallDunk() {
        const target = this.target;
        const airTime = 2 * COLEONE_DUNK_JUMP / 0.7;
        let spot = alive(target) && !target.isInsideOpponent
            ? predictPosition(target, airTime / 2 + COLEONE_BALL_FALL)
            : { x: this.x + this.aim.x * 200, y: this.y + this.aim.y * 200 };
        const d = Math.hypot(spot.x - this.x, spot.y - this.y);
        if (d > COLEONE_BALL_RANGE) spot = { x: this.x + (spot.x - this.x) / d * COLEONE_BALL_RANGE, y: this.y + (spot.y - this.y) / d * COLEONE_BALL_RANGE };
        spot.x = Math.max(arena.left, Math.min(arena.right, spot.x));
        spot.y = Math.max(arena.top, Math.min(arena.bottom, spot.y));
        this.dunkPhase = 'ball';
        this.dunkTimer = 0;
        this.dunkBallThrown = false;
        this.vz = COLEONE_DUNK_JUMP;
        this.dunkHoop = { x: spot.x, y: spot.y, life: Math.round(airTime) + 40, slam: 0 };
        this.poseSpecial();
        sfx.play('coleone_grab');
    },

    updateBallDunk() {
        this.dunkTimer++;
        this.specialPoseTimer = Math.max(this.specialPoseTimer, 4); // bola erguida
        if (this.dunkHoop) this.facing = this.dunkHoop.x >= this.x ? 1 : -1;
        // No topo do salto, enterra a bola lá do alto
        if (!this.dunkBallThrown && this.vz <= 0 && this.dunkHoop) {
            this.dunkBallThrown = true;
            coleoneBalls.push({ x0: this.x + this.facing * 14, y0: this.y, z0: this.z + this.height, x: this.x, y: this.y, z: this.z + this.height,
                tx: this.dunkHoop.x, ty: this.dunkHoop.y, t: 0, owner: this });
            sfx.play('swing_heavy');
        }
        if (this.z <= 0 && this.dunkTimer > 3) this.dunkPhase = null; // voltou ao chão
    },

    updateColeoneDunk() {
        if (this.dunkPhase === 'ball') { this.updateBallDunk(); return; }
        const target = this.dunkTarget;
        if (!alive(target) || target.isInsideOpponent) { this.dropDunk(); return; }
        const airTime = 2 * COLEONE_DUNK_JUMP / 0.7; // passos no ar (sobe e desce com a gravidade normal)
        if (this.dunkPhase === 'rush') {
            const stopDistance = this.radius + target.radius + 6;
            const d = distance(this, target);
            this.dunkTimer--;
            if (d > stopDistance && this.dunkTimer > 0) {
                const dir = directionTo(this, target);
                const step = Math.min(COLEONE_DUNK_RUSH, d - stopDistance);
                this.x += dir.x * step;
                this.y += dir.y * step;
                this.facing = dir.x >= 0 ? 1 : -1;
                if (this.dunkTimer % 3 === 0) spawnStepDust(this);
                return;
            }
            if (d > stopDistance + 20) { this.dropDunk(); return; } // não chegou (bateu em algo no caminho)
            // Agarrou: salta com o inimigo nas mãos, seguindo na direção em que vinha correndo
            this.dunkPhase = 'air';
            this.dunkDir = d > 0 ? directionTo(this, target) : { ...this.aim };
            this.vz = COLEONE_DUNK_JUMP;
            this.dunkTimer = 0;
            target.heldBy = this;
            target.isDefending = false;
            target.isPreparingDefense = false;
            target.isChargingPunch = false;
            if (target.isBladeDancing) target.endBladeDance();
            if (target.isChannelingSpecial) target.stopChanneling();
            const spot = {
                x: Math.max(arena.left, Math.min(arena.right, this.x + this.dunkDir.x * COLEONE_DUNK_CARRY)),
                y: Math.max(arena.top, Math.min(arena.bottom, this.y + this.dunkDir.y * COLEONE_DUNK_CARRY)),
            };
            this.dunkHoop = { x: spot.x, y: spot.y, life: Math.round(airTime) + 30, slam: 0 };
            floatingTexts.push(new FloatingText(this.x, this.y - this.height - 16, 'PEGOU!', '#ff7a1a'));
            sfx.play('coleone_grab');
        }
        // No ar: carrega o inimigo acima da cabeça e voa até a cesta
        this.dunkTimer++;
        const speed = COLEONE_DUNK_CARRY / airTime;
        this.x += this.dunkDir.x * speed;
        this.y += this.dunkDir.y * speed;
        this.facing = this.dunkDir.x >= 0 ? 1 : -1;
        this.specialPoseTimer = Math.max(this.specialPoseTimer, 4); // braços para cima
        this.holdDunkTarget(airTime);
        if (this.z > 0 || this.dunkTimer < 3) return;
        this.slamDunk();
    },

    // Quem foi agarrado fica acima da cabeça do Coleone, virando de ponta-cabeça até o topo do salto
    holdDunkTarget(airTime) {
        const target = this.dunkTarget;
        target.x = this.x + this.facing * 4;
        target.y = this.y + 1; // um pouco à frente na ordem de desenho
        target.z = this.z + this.height * 0.8;
        target.vz = 0;
        target.kbx = 0;
        target.kby = 0;
        target.heldSpin = Math.PI * Math.min(1, this.dunkTimer / (airTime / 2)) * this.facing;
        target.isParalyzed = true;
        target.paralysisTimer = Math.max(target.paralysisTimer, 2);
    },

    // Batida no chão: dano alto em quem foi enterrado e onda de choque em volta
    slamDunk() {
        const target = this.dunkTarget;
        this.dunkTarget = null;
        this.dunkPhase = null;
        target.heldBy = null;
        target.heldSpin = 0;
        target.z = 0;
        target.vz = 5; // quica no chão
        target.x = this.x + this.dunkDir.x * (this.radius + target.radius);
        target.y = this.y + this.dunkDir.y * (this.radius + target.radius);
        target.isParalyzed = true;
        target.paralysisTimer = Math.max(target.paralysisTimer, COLEONE_DUNK_STUN);
        target.takeDamage(COLEONE_DUNK_DAMAGE, { unblockable: true, sound: 'hit_heavy' }, this);
        for (const enemy of enemiesOf(this)) {
            if (enemy === target || enemy.isInsideOpponent || distance(enemy, target) > COLEONE_SLAM_RADIUS + enemy.radius) continue;
            const defended = enemy.takeDamage(COLEONE_SLAM_DAMAGE, { sound: 'hit_heavy' }, this);
            enemy.push(directionTo(target, enemy), defended ? 4 : 9);
        }
        shockwaves.push({ x: target.x, y: target.y, life: 20, radius: COLEONE_SLAM_RADIUS });
        screenShake = Math.max(screenShake, 12);
        for (let i = 0; i < 18; i++) {
            particles.push(new Particle(target.x, target.y - 6, i % 3 ? '#ff7a1a' : '#f4f6fb', 0, { x: (Math.random() - 0.5) * 9, y: -Math.random() * 5 }));
        }
        floatingTexts.push(new FloatingText(target.x, target.y - target.height - 20, 'ENTERRADA!', '#ff7a1a'));
        if (this.dunkHoop) this.dunkHoop.slam = this.dunkHoop.life = 30; // a rede balança mais um pouco
        this.attackCooldown = Math.max(this.attackCooldown, 12);
        sfx.play('coleone_dunk');
    },

    // Desiste da enterrada (alvo sumiu ou não deu para chegar); quem estava no ar cai sozinho
    dropDunk() {
        const target = this.dunkTarget;
        if (target && target.heldBy === this) {
            target.heldBy = null;
            target.heldSpin = 0;
        }
        this.dunkTarget = null;
        this.dunkPhase = null;
        this.dunkHoop = null;
    },

    // Capitã Sina: Roleta da Sina — gira 1 s em cima da cabeça (todos veem) e sai uma das três armas.
    // O resultado é sorteado no começo; a roleta só desacelera até parar na fatia sorteada.
    startSinaRoulette() {
        this.isAttacking = false;
        if (this.sinaSpinTimer > 0 || this.energy < SINA_ULT_COST || this.specialCooldown > 0) return;
        this.energy -= SINA_ULT_COST;
        this.specialCooldown = SINA_ULT_COOLDOWN;
        // Chances deste giro: depois de vários giros sem barco, a chance dele sobe (proteção contra azar);
        // o resto fica entre pistola e tubarão na mesma proporção de sempre (2 para 1)
        const boat = Math.min(1, SINA_CHANCES.boat + Math.max(0, this.sinaMisses - SINA_PITY_AFTER) * SINA_BOAT_PITY);
        const pistolShare = SINA_CHANCES.pistol / (SINA_CHANCES.pistol + SINA_CHANCES.shark);
        const chances = { pistol: (1 - boat) * pistolShare, shark: (1 - boat) * (1 - pistolShare), boat };
        const roll = Math.random();
        this.sinaResult = roll < chances.boat ? 'boat' : roll < chances.boat + chances.pistol ? 'pistol' : 'shark';
        this.sinaMisses = this.sinaResult === 'boat' ? 0 : this.sinaMisses + 1;
        // Fatias da roleta do tamanho de cada chance; para com o ponteiro (em cima) num ponto da fatia sorteada
        let from = 0;
        this.sinaSlices = ['pistol', 'shark', 'boat'].map(type => {
            const size = chances[type] * Math.PI * 2;
            const slice = { type, from, to: from + size };
            from += size;
            return slice;
        });
        const chosen = this.sinaSlices.find(s => s.type === this.sinaResult);
        const spot = (chosen.from + chosen.to) / 2 + (Math.random() - 0.5) * (chosen.to - chosen.from) * 0.6;
        this.sinaSpinFinal = -Math.PI / 2 - spot + Math.PI * 2 * 5; // 5 voltas e para no ponteiro
        this.sinaSpinTimer = SINA_SPIN_FRAMES;
        this.sinaResultTimer = 0;
        this.poseSpecial();
        sfx.play('sina_special');
    },

    // Roda todo passo: giro da roleta, tiros da pistola e o grito do papagaio
    updateSina() {
        const ready = this.energy >= SINA_ULT_COST && this.specialCooldown <= 0 && this.sinaSpinTimer <= 0;
        if (ready && !this.sinaUltWasReady) {
            floatingTexts.push(new FloatingText(this.x, this.y - this.height - 18, '🦜 RRÁÁ!', '#ffe34a'));
            sfx.play('sina_parrot');
        }
        this.sinaUltWasReady = ready;

        if (this.sinaSpinTimer > 0) {
            this.sinaSpinTimer--;
            // "Tic" de cada fatia passando, cada vez mais espaçado
            const elapsed = SINA_SPIN_FRAMES - this.sinaSpinTimer;
            if (elapsed % (2 + Math.floor(elapsed / 10)) === 0) sfx.play('sina_tick');
            if (this.sinaSpinTimer === 0) this.resolveSinaRoulette();
        }
        if (this.sinaResultTimer > 0) this.sinaResultTimer--;

        if (this.sinaPistolShots > 0 && !this.isParalyzed && !this.isInsideOpponent) {
            if (--this.sinaPistolTimer <= 0) {
                this.sinaPistolShots--;
                this.sinaPistolTimer = SINA_PISTOL_INTERVAL;
                projectiles.push(new Projectile(this, 'sina_bullet', SINA_PISTOL_DAMAGE, leadAim(this, 15), 15));
                sfx.play('pistol_shot');
                this.specialPoseTimer = Math.max(this.specialPoseTimer, 8);
            }
        }
    },

    resolveSinaRoulette() {
        this.sinaResultTimer = SINA_RESULT_FRAMES;
        const labels = { pistol: ['🔫 PISTOLA', '#ffd23f'], shark: ['🦈 TUBARÃO!', '#4fd1ff'], boat: ['🌊 BARCO!!!', '#6aa8ff'] };
        const [text, color] = labels[this.sinaResult];
        floatingTexts.push(new FloatingText(this.x, this.y - this.height - 40, text, color));
        this.poseSpecial();
        if (this.sinaResult === 'pistol') {
            this.sinaPistolShots = SINA_PISTOL_SHOTS;
            this.sinaPistolTimer = 0;
        } else if (this.sinaResult === 'shark') {
            projectiles.push(new Projectile(this, 'shark', SINA_SHARK_DAMAGE, leadAim(this, SINA_SHARK_SPEED), SINA_SHARK_SPEED));
            sfx.play('sina_shark');
        } else {
            // Barco de água: cai onde o alvo vai estar (até o alcance máximo); a sombra avisa antes
            let spot = alive(this.target) ? predictPosition(this.target, SINA_BOAT_WARNING * 0.5) : { x: this.x + this.aim.x * 200, y: this.y + this.aim.y * 200 };
            const d = Math.hypot(spot.x - this.x, spot.y - this.y);
            if (d > SINA_BOAT_RANGE) spot = { x: this.x + (spot.x - this.x) / d * SINA_BOAT_RANGE, y: this.y + (spot.y - this.y) / d * SINA_BOAT_RANGE };
            spot.x = Math.max(arena.left, Math.min(arena.right, spot.x));
            spot.y = Math.max(arena.top, Math.min(arena.bottom, spot.y));
            sinaBoats.push({ x: spot.x, y: spot.y, timer: SINA_BOAT_WARNING, splash: 0, owner: this });
            sfx.play('sina_boat_warning');
        }
    },

    // Torretas do Gear ainda de pé, da mais antiga para a mais nova
    myTurrets() {
        return turrets.filter(t => t.owner === this && !t.done);
    },

    // Gear: coloca uma mini-torreta um pouco à frente (até 3; a 4ª substitui a mais antiga)
    placeTurret() {
        this.isAttacking = false;
        if (this.energy < GEAR_TURRET_COST || this.specialCooldown > 0) return;
        this.energy -= GEAR_TURRET_COST;
        this.specialCooldown = GEAR_TURRET_COOLDOWN;
        const mine = this.myTurrets();
        if (mine.length >= GEAR_MAX_TURRETS) mine[0].destroy(false);
        // À frente dele; se já tiver torreta ali, procura um lugar livre girando em volta
        const base = Math.atan2(this.aim.y, this.aim.x);
        let x = this.x, y = this.y;
        for (const offset of [0, 0.9, -0.9, 1.8, -1.8, Math.PI]) {
            x = Math.max(arena.left, Math.min(arena.right, this.x + Math.cos(base + offset) * 40));
            y = Math.max(arena.top, Math.min(arena.bottom, this.y + Math.sin(base + offset) * 40));
            if (!turrets.some(t => !t.done && Math.hypot(t.x - x, t.y - y) < 32)) break;
        }
        turrets.push(new Turret(this, x, y));
        this.poseSpecial();
        sfx.play('gear_special');
    },

    // Akane: corre até o alvo; ao encostar no primeiro inimigo, gruda nele e
    // gira em volta dando os 7 cortes (Dança das Sete Lâminas). Se não alcançar ninguém, erra.
    updateBladeDance() {
        const victim = this.bladeDanceLock;
        if (!victim) {
            const step = 13;
            // Persegue o alvo durante a corrida (senão quem está andando sai da frente)
            if (alive(this.target)) this.dashDir = directionTo(this, this.target);
            this.x += this.dashDir.x * step;
            this.y += this.dashDir.y * step;
            this.dashLeft -= step;
            createParticleEffect(this, 'sword_slash');
            const touched = enemiesOf(this).find(e => !e.isInsideOpponent && distance(this, e) <= this.radius + e.radius + 14);
            if (touched) {
                this.bladeDanceLock = touched;
                this.bladeDanceAngle = Math.atan2(this.y - touched.y, this.x - touched.x);
                this.bladeDanceTick = 0;
                this.bladeDanceDamageTaken = 0;
            }
            const hitWall = this.x <= arena.left || this.x >= arena.right || this.y <= arena.top || this.y >= arena.bottom;
            if (!touched && (this.dashLeft <= 0 || hitWall)) this.isBladeDancing = false;
            return;
        }

        // Grudada: gira em volta do alvo e corta a cada poucos passos
        if (!alive(victim) || victim.isInsideOpponent) { this.endBladeDance(); return; }
        this.bladeDanceAngle += 0.45;
        const orbit = victim.radius + this.radius + 6;
        this.x = victim.x + Math.cos(this.bladeDanceAngle) * orbit;
        this.y = victim.y + Math.sin(this.bladeDanceAngle) * orbit;
        this.facing = victim.x > this.x ? 1 : -1;
        // A vítima não fica atordoada: pode segurar a defesa para aparar os cortes
        this.isAttacking = true; // faz a IA da vítima perceber o ataque e tentar defender
        createParticleEffect(this, 'sword_slash');
        this.bladeDanceTick++;
        if (this.bladeDanceTick % AKANE_CUT_INTERVAL === 0) {
            const blocked = victim.takeDamage(AKANE_CUT_DAMAGE, { sound: 'blade_hit' }, this);
            if (!blocked) this.health = Math.min(this.maxHealth, this.health + 8); // corte aparado não cura
            this.bladeDanceHitCount++;
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(victim.x, victim.chestY, '#ffd86b', 0, { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 }));
            }
            if (this.bladeDanceHitCount >= AKANE_CUTS) this.endBladeDance();
        }
    },

    endBladeDance() {
        this.isBladeDancing = false;
        this.bladeDanceLock = null;
        this.isAttacking = false;
        this.x = Math.max(arena.left, Math.min(arena.right, this.x));
        this.y = Math.max(arena.top, Math.min(arena.bottom, this.y));
    },

    // Kenji: avança em linha reta e explode no primeiro inimigo
    updateKenjiDash() {
        const step = 16;
        this.x += this.dashDir.x * step;
        this.y += this.dashDir.y * step;
        this.dashLeft -= step;
        createParticleEffect(this, 'dash_fire');
        const hit = enemiesOf(this).find(enemy => !enemy.isInsideOpponent && distance(this, enemy) < this.radius + enemy.radius + 8);
        if (hit) {
            hit.vz = 9; // joga para cima
            hit.takeDamage(80, {}, this);
            hit.isParalyzed = true;
            hit.paralysisTimer = Math.max(hit.paralysisTimer, 20);
            createParticleEffect(hit, 'ground_explosion', { x: hit.x, y: hit.y, count: 20 });
            this.isDashing = false;
        }
        const hitWall = this.x <= arena.left || this.x >= arena.right || this.y <= arena.top || this.y >= arena.bottom;
        if (this.dashLeft <= 0 || hitWall) this.isDashing = false;
    },

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
    },

    // Interrompe o choque do Spark e zera o dano acumulado
    stopChanneling() {
        this.isChannelingSpecial = false;
        this.channelTarget = null;
        this.channelingDamage = SPARK_CHAIN_START_DAMAGE;
        this.channelingTick = 0;
    },

    // Ultimate do Zarek: entra no corpo do oponente, fica 1,5 s invulnerável e sai causando dano
    startZarekUltimate() {
        this.isAttacking = false;
        const opponent = this.target;
        if (!opponent) return;
        const alreadyPossessed = fighters.some(f => f.isInsideOpponent && f.zarekHost === opponent);
        if (this.energy < ZAREK_ULT_COST || this.specialCooldown > 0 || distance(this, opponent) > zarekUltRange(this) || alreadyPossessed) return;

        this.energy -= ZAREK_ULT_COST;
        this.specialCooldown = ZAREK_ULT_COOLDOWN;
        this.isInsideOpponent = true;
        this.zarekHost = opponent;
        this.zarekUltTimer = ZAREK_ULT_DURATION;
        sfx.play('zarek_special');

        // Fumaça onde ele estava e um rastro sombrio voando até o oponente
        for (let i = 0; i < 25; i++) {
            particles.push(new Particle(this.x + (Math.random() - 0.5) * 30, this.chestY + (Math.random() - 0.5) * 40, 'rgba(40, 20, 70, 0.9)', 0,
                { x: (opponent.x - this.x) / 30 + (Math.random() - 0.5) * 2, y: (opponent.chestY - this.chestY) / 30 + (Math.random() - 0.5) * 2 }));
        }
    },

    // Sai do corpo do hospedeiro, pelo lado com mais espaço
    exitHost(host) {
        this.isInsideOpponent = false;
        this.zarekHost = null;
        const side = host.x < (arena.left + arena.right) / 2 ? 1 : -1;
        this.x = host.x + side * (host.radius + this.radius + 8);
        this.y = host.y;
        this.z = 0;
        this.vz = 0;
    },

    updateZarekUltimate() {
        const opponent = this.zarekHost;
        // Hospedeiro derrotado enquanto o Zarek estava dentro: só sai, sem dano
        if (!alive(opponent)) {
            this.exitHost(opponent || this);
            return;
        }

        // Segue o oponente por dentro
        this.x = opponent.x;
        this.y = opponent.y;
        this.zarekUltTimer--;
        if (this.zarekUltTimer > 0) return;

        this.exitHost(opponent);

        // A ultimate não pode ser bloqueada: ele está saindo de dentro do oponente
        const hit = { unblockable: true, sound: 'zarek_exit' };
        if (this.zarekForm === 'red') {
            const before = opponent.health;
            opponent.takeDamage(ZAREK_ULT_DAMAGE * 3, hit, this);
            this.heal((before - opponent.health) * ZAREK_RED_ULT_HEAL);
        } else if (this.zarekForm === 'blue') {
            opponent.takeDamage(ZAREK_BLUE_ULT_DAMAGE, hit, this);
            opponent.bleedStacks = 3; // sangramento máximo
            opponent.bleedDuration = 240;
        } else {
            opponent.takeDamage(ZAREK_ULT_DAMAGE, hit, this);
        }

        // Corte em X na cor da forma
        const color = zarekFormColor(this.zarekForm);
        for (let i = 0; i < 30; i++) {
            const t = (Math.random() - 0.5) * 2;
            const diagonal = i % 2 === 0 ? 1 : -1;
            particles.push(new Particle(opponent.x + t * 35, opponent.chestY + t * 35 * diagonal, color, 0, { x: t * 5, y: t * 5 * diagonal }));
        }
    },

    // Raio atual da área de cura da Celestia
    auraRadius() {
        return this.celestiaUltTimer > 0 ? CELESTIA_AURA_RADIUS * CELESTIA_ULT_MULTIPLIER : CELESTIA_AURA_RADIUS;
    },

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
    },

    startCelestiaUltimate() {
        this.isAttacking = false;
        if (this.energy < CELESTIA_ULT_COST || this.specialCooldown > 0) return;
        this.energy -= CELESTIA_ULT_COST;
        this.specialCooldown = CELESTIA_ULT_COOLDOWN;
        this.celestiaUltTimer = CELESTIA_ULT_DURATION;
        this.poseSpecial();
        sfx.play('celestia_special');
        for (let i = 0; i < 36; i++) {
            const angle = (i / 36) * Math.PI * 2;
            particles.push(new Particle(this.x, this.chestY, '#ffe98a', 0, { x: Math.cos(angle) * 7, y: Math.sin(angle) * 7 }));
        }
    },

    // Craque: bolas paradas no chão ou quicando voltam voando até ele. Retorna se puxou alguma.
    recallBalls() {
        const recallSpeed = 13;
        let recalled = 0;
        for (const p of projectiles) {
            if (p.type === 'football' && p.shooter === this && !p.isReturning) {
                p.isReturning = true;
                p.returnSpeed = recallSpeed;
                recalled++;
            }
        }
        for (const ball of groundBalls) {
            const p = new Projectile(this, 'football', 0, { x: 1, y: 0 });
            p.x = ball.x;
            p.y = ball.y;
            p.isReturning = true;
            p.returnSpeed = recallSpeed;
            projectiles.push(p);
            recalled++;
        }
        groundBalls = [];
        if (recalled) {
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                particles.push(new Particle(this.x, this.chestY, 'rgba(120, 200, 255, 0.8)', 0, { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 }));
            }
        }
        return recalled > 0;
    },

    // Nyx: Laço de Sangue prende um inimigo a um aliado; a vida escorre de um para o outro por 3 s
    startNyxLink() {
        this.isAttacking = false;
        const enemy = this.target;
        if (!enemy || this.energy < NYX_LINK_COST || this.specialCooldown > 0 || distance(this, enemy) > NYX_LINK_RANGE) return;
        this.energy -= NYX_LINK_COST;
        this.specialCooldown = NYX_LINK_COOLDOWN;
        this.nyxLinkEnemy = enemy;
        this.nyxLinkAlly = mostHurtAlly(this);
        this.nyxLinkTimer = NYX_LINK_DURATION;
        this.poseSpecial();
        sfx.play('nyx_special');
    },

    updateNyxLink() {
        if (this.nyxLinkTimer <= 0) return;
        this.nyxLinkTimer--;
        const enemy = this.nyxLinkEnemy;
        if (!alive(enemy) || distance(this, enemy) > NYX_LINK_RANGE + 80) { this.nyxLinkTimer = 0; return; }
        if (!alive(this.nyxLinkAlly)) this.nyxLinkAlly = mostHurtAlly(this);
        if (this.nyxLinkTimer % 30 === 0) {
            enemy.takeDamage(NYX_LINK_TICK, { sound: 'hit' }, this);
            if (this.nyxLinkAlly) this.nyxLinkAlly.heal(NYX_LINK_TICK, this);
        }
    },

    // Flora: joga uma flor que voa até o aliado mais próximo (ou volta para ela, se estiver sozinha)
    throwHealingFlower() {
        this.isAttacking = false;
        if (this.energy < FLORA_FLOWER_COST || this.specialCooldown > 0) return;
        this.energy -= FLORA_FLOWER_COST;
        this.specialCooldown = 60;
        this.attackCooldown = 15;
        this.isAttacking = true;
        this.poseSpecial();
        sfx.play('flora_special');
        healingFlowers.push(new HealingFlower(this));
    },
});

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

// Torreta do Gear: atira sozinha no inimigo mais próximo; pode ser destruída
class Turret {
    constructor(owner, x, y) {
        this.owner = owner;
        this.team = owner.team;
        this.isTurret = true;
        this.x = x;
        this.y = y;
        this.z = 0;
        this.height = 30;
        this.radius = 14;
        this.hp = TURRET_HP;
        this.life = TURRET_DURATION;
        this.fireCooldown = 20;
        this.target = null;
        this.aim = { x: owner.aim.x, y: owner.aim.y };
        this.hitFlash = 0;
        this.done = false;
    }

    get chestY() { return this.y - 20; }

    update() {
        this.life--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.life <= 0) { this.destroy(false); return; }
        // Inimigo mais próximo dentro do alcance
        let best = null, bestDistance = TURRET_RANGE;
        for (const enemy of fighters) {
            if (!alive(enemy) || enemy.team === this.team || enemy.isInsideOpponent) continue;
            const d = distance(this, enemy);
            if (d < bestDistance) { best = enemy; bestDistance = d; }
        }
        this.target = best;
        if (!best) return;
        this.aim = directionTo(this, best);
        this.fireCooldown--;
        if (this.fireCooldown <= 0) {
            projectiles.push(new Projectile(this, 'turret_shot', TURRET_DAMAGE, leadAim(this, 12), 12));
            sfx.play('turret_shot');
            this.fireCooldown = TURRET_FIRE_INTERVAL;
        }
    }

    takeHit(damage) {
        this.hp -= damage;
        this.hitFlash = 8;
        sfx.play('block');
        if (this.hp <= 0) this.destroy(true);
    }

    destroy(exploded) {
        if (this.done) return;
        this.done = true;
        for (let i = 0; i < (exploded ? 20 : 8); i++) {
            particles.push(new Particle(this.x, this.y - 15, i % 2 ? '#9aa3b8' : '#3ff6ff', 0));
        }
        if (exploded) sfx.play('hit_heavy');
    }

    draw() {
        const color = TEAM_COLORS[this.team];
        // Base no chão com o anel do time
        ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 18, 7, 0, 0, Math.PI * 2); ctx.stroke();
        // Tripé
        ctx.strokeStyle = '#5a6270';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x - 10, this.y); ctx.lineTo(this.x, this.y - 14);
        ctx.moveTo(this.x + 10, this.y); ctx.lineTo(this.x, this.y - 14);
        ctx.moveTo(this.x, this.y + 3); ctx.lineTo(this.x, this.y - 14);
        ctx.stroke();
        // Cabeça girando para o alvo, com o cano
        ctx.translate(this.x, this.y - 20);
        ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#9aa3b8';
        ctx.fillRect(-9, -7, 18, 14);
        ctx.strokeStyle = '#1a1024';
        ctx.lineWidth = 2;
        ctx.strokeRect(-9, -7, 18, 14);
        ctx.rotate(Math.atan2(this.aim.y, this.aim.x));
        ctx.fillStyle = '#4a5060';
        ctx.fillRect(4, -3, 14, 6);
        ctx.fillStyle = '#3ff6ff';
        ctx.fillRect(-3, -3, 5, 5); // luz
        ctx.restore();
        // Vida e tempo restante
        const top = this.y - 36;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(this.x - 16, top, 32, 5);
        ctx.fillStyle = color;
        ctx.fillRect(this.x - 15, top + 1, 30 * Math.max(0, this.hp / TURRET_HP), 3);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(this.x - 15, top + 5, 30 * (this.life / TURRET_DURATION), 1);
    }
}

// Nuvem tóxica da Mamba: mancha verde no chão com borda pulsando e bolhas subindo
function drawMambaCloud(mamba) {
    const fade = Math.min(1, mamba.mambaCloudTimer / 30); // some aos poucos no final
    const pulse = 1 + Math.sin(Date.now() / 120) * 0.04;
    const r = MAMBA_CLOUD_RADIUS * pulse;
    ctx.save();
    const gradient = ctx.createRadialGradient(mamba.x, mamba.y, 10, mamba.x, mamba.y, r);
    gradient.addColorStop(0, `rgba(76, 255, 122, ${0.45 * fade})`);
    gradient.addColorStop(0.75, `rgba(40, 200, 80, ${0.32 * fade})`);
    gradient.addColorStop(1, `rgba(40, 200, 80, ${0.08 * fade})`);
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(mamba.x, mamba.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(130, 255, 150, ${0.95 * fade})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = Date.now() / 50;
    ctx.stroke();
    ctx.restore();
    // Bolhas tóxicas subindo de pontos aleatórios da nuvem
    if (Math.random() < 0.5) {
        const angle = Math.random() * Math.PI * 2, dist = Math.random() * MAMBA_CLOUD_RADIUS;
        particles.push(new Particle(mamba.x + Math.cos(angle) * dist, mamba.y + Math.sin(angle) * dist * 0.8, 'rgba(110, 255, 140, 0.6)', 0, { x: 0, y: -0.8 }));
    }
}

// Fio de teia esticado do Weaver até quem ele está puxando
function drawWebLine(weaver, target) {
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 251, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(weaver.x, weaver.chestY);
    ctx.lineTo(target.x, target.chestY);
    ctx.stroke();
    // Fiozinhos tremendo em volta do fio principal
    ctx.strokeStyle = 'rgba(63, 246, 255, 0.5)';
    ctx.lineWidth = 1;
    const dx = target.x - weaver.x, dy = target.chestY - weaver.chestY;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const wobble = (Math.random() - 0.5) * 6;
        ctx.lineTo(weaver.x + dx * t - dy / Math.hypot(dx, dy || 1) * wobble, weaver.chestY + dy * t + dx / Math.hypot(dx, dy || 1) * wobble);
    }
    ctx.stroke();
    ctx.restore();
}

// Aliado vivo com menor porcentagem de vida (contando quem pergunta); null se todos estão cheios
function mostHurtAlly(fighter) {
    const team = fighters.filter(f => alive(f) && f.team === fighter.team && !f.isInsideOpponent);
    const hurt = team.filter(f => f.health < f.maxHealth).sort((a, b) => a.health - b.health);
    return hurt[0] || null;
}

// Orbe de sangue da Nyx: sai de quem ela acertou e voa até o aliado mais ferido
class LifeOrb {
    constructor(from, owner, amount) {
        this.owner = owner;
        this.amount = amount;
        this.x = from.x;
        this.y = from.chestY;
        this.target = mostHurtAlly(owner);
        this.life = 120;
        this.done = !this.target; // ninguém precisa de cura: o orbe nem sai
    }

    update() {
        this.life--;
        if (!alive(this.target)) this.target = mostHurtAlly(this.owner);
        if (!this.target || this.life <= 0) { this.done = true; return; }
        const dx = this.target.x - this.x, dy = this.target.chestY - this.y;
        const d = Math.hypot(dx, dy);
        if (d < 16) {
            this.target.heal(this.amount, this.owner);
            this.done = true;
            return;
        }
        this.x += dx / d * 10;
        this.y += dy / d * 10;
        if (this.life % 2 === 0) particles.push(new Particle(this.x, this.y, 'rgba(255, 42, 74, 0.6)', 0, { x: 0, y: 0 }));
    }

    draw() {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 42, 74, 0.35)';
        ctx.beginPath(); ctx.arc(this.x, this.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff5a74';
        ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// Laço de Sangue: fio vermelho pulsando inimigo -> Nyx -> aliado
function drawNyxLink(nyx) {
    const pulse = 0.5 + Math.sin(Date.now() / 70) * 0.3;
    const segment = (a, b) => {
        ctx.beginPath();
        ctx.moveTo(a.x, a.chestY);
        ctx.lineTo(b.x, b.chestY);
        ctx.stroke();
    };
    ctx.save();
    ctx.strokeStyle = `rgba(255, 42, 74, ${0.25 * pulse})`;
    ctx.lineWidth = 9;
    segment(nyx.nyxLinkEnemy, nyx);
    if (nyx.nyxLinkAlly && nyx.nyxLinkAlly !== nyx) segment(nyx, nyx.nyxLinkAlly);
    ctx.strokeStyle = `rgba(255, 90, 116, ${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = Date.now() / 25; // o tracejado "escorre" do inimigo para o aliado
    segment(nyx.nyxLinkEnemy, nyx);
    if (nyx.nyxLinkAlly && nyx.nyxLinkAlly !== nyx) segment(nyx, nyx.nyxLinkAlly);
    ctx.restore();
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

// --- Zarek: barra de transformação e formas ---
function zarekFormColor(form) {
    if (form === 'red') return '#ff2a3a';
    if (form === 'blue') return '#3fb8ff';
    return '#b9b2d6';
}

// Alcance da ultimate do Zarek (o Umbral alcança mais longe)
function zarekUltRange(zarek) {
    return zarek.zarekForm === 'blue' ? ZAREK_BLUE_ULT_RANGE : ZAREK_ULT_RANGE;
}

// Zarek está dentro deste lutador (ultimate)?
function isPossessed(fighter) {
    return fighters.some(k => k.isInsideOpponent && k.zarekHost === fighter);
}

function addZarekCharge(zarek, amount) {
    if (zarek.zarekForm) return; // já transformado
    zarek.zarekCharge = Math.min(ZAREK_CHARGE_MAX, zarek.zarekCharge + amount);
    if (zarek.zarekCharge < ZAREK_CHARGE_MAX) return;

    // Perdendo em vida -> Rubra (vermelho, agressivo); ganhando ou empatado -> Umbral (azul).
    // Compara com o inimigo atual (em times, o que ele está enfrentando).
    const opponent = zarek.target || nearestEnemy(zarek);
    // Compara a porcentagem de vida (cada personagem tem uma vida máxima diferente)
    zarek.zarekForm = opponent && zarek.health / zarek.maxHealth < opponent.health / opponent.maxHealth ? 'red' : 'blue';
    sfx.play('zarek_transform');
    const color = zarekFormColor(zarek.zarekForm);
    for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        particles.push(new Particle(zarek.x, zarek.chestY, color, 0, { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 }));
    }
}

// Foice girando em cima da cabeça do oponente enquanto o Zarek está dentro dele
function drawZarekMark(zarek, host) {
    const color = zarekFormColor(zarek.zarekForm);
    const progress = 1 - zarek.zarekUltTimer / ZAREK_ULT_DURATION; // 0 -> 1
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

    // Olho da foice
    ctx.fillStyle = zarek.zarekForm === 'red' ? '#ffd23f' : '#ff2a3a';
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
