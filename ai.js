// Inteligência artificial
// Como a IA escolhe o alvo, anda, ataca, defende e usa a ultimate de cada personagem.

// --- IA ---
class AI {
    constructor(fighter) {
        this.fighter = fighter;
        this.running = false;
        this.stepsUntilDecision = 0;
        this.strafeSign = Math.random() < 0.5 ? 1 : -1;
    }

    start() {
        this.running = true;
        this.stepsUntilDecision = Math.floor(Math.random() * AI_DECISION_STEPS); // não decidem todos no mesmo passo
    }

    stop() {
        this.running = false;
        this.fighter.aiMove = { x: 0, y: 0 };
    }

    // Chamado a cada passo do jogo: decide a cada 0,3 s de jogo (acompanha o jogo mesmo se ele engasgar)
    tick() {
        if (!this.running) return;
        if (--this.stepsUntilDecision > 0) return;
        this.stepsUntilDecision = AI_DECISION_STEPS;
        this.makeDecision();
    }

    // Escolhe o alvo: o inimigo mais próximo, mas troca por um inimigo quase morto que esteja perto
    chooseTarget() {
        const me = this.fighter;
        // Todos escondidos nos arbustos: vai procurar o mais perto (chegando perto, ele aparece)
        const nearest = nearestEnemy(me) || enemiesOf(me).sort((a, b) => distance(me, a) - distance(me, b))[0];
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
            const center = obstacleCenter(blocking);
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
        const canUseSpecial = !['zarek', 'celestia', 'flora', 'spark', 'nyx', 'mamba', 'gear', 'roxy', 'weaver', 'aegis', 'rhino', 'anchor', 'sina', 'coleone', 'bershow', 'aspas'].includes(me.characterType) &&
            me.energy >= specialCost(me.characterType) && me.specialCooldown <= 0;
        if (Math.random() < 0.1) this.strafeSign *= -1;

        me.aiMove = { x: 0, y: 0 };
        me.isDefending = false;

        // Torreta inimiga: só vale parar para quebrar quando o alvo está fora de alcance.
        // Se dá para bater no alvo, bate nele (o Gear não pode se esconder atrás das torretas).
        me.focusTurret = null;
        const enemyTurret = turrets
            .filter(t => t.team !== me.team && !t.done)
            .sort((a, b) => distance(me, a) - distance(me, b))[0];
        if (enemyTurret && !SHOOTERS.includes(me.characterType) && !HEALERS.includes(me.characterType) && me.characterType !== 'craque') {
            const turretDistance = distance(me, enemyTurret);
            const targetInReach = d <= meleeRange + 30;
            const turretInReach = turretDistance <= meleeRange + 10;      // já está colada: quebra rapidinho
            const turretOnTheWay = d > 250 && turretDistance < 200 && turretDistance < d - 60; // alvo longe, torreta no caminho
            if (!targetInReach && (turretInReach || turretOnTheWay)) {
                me.focusTurret = enemyTurret;
                if (turretDistance > meleeRange - 10) this.moveToward(enemyTurret);
                else me.attack('punch'); // fica parado batendo até quebrar
                return;
            }
        }

        // Barco da Sina caindo em cima: quem percebe a sombra a tempo sai correndo (nem sempre percebe)
        const boat = sinaBoats.find(b => b.timer > 0 && b.owner.team !== me.team && Math.hypot(me.x - b.x, me.y - b.y) < SINA_BOAT_RADIUS + me.radius + 10);
        if (boat && Math.random() < 0.5) {
            this.moveAway(boat);
            return;
        }

        // Ação defensiva (menos provável)
        if (opponent.isAttacking && d < 120 && Math.random() < 0.5 && me.defenseResetCooldown <= 0) {
            me.isDefending = true;
            return;
        }

        // Jardim: ferido e com flor de cura por perto, vai pegar
        if (mapId === 'garden' && me.health < me.maxHealth * 0.6) {
            const flower = pickups.filter(p => Math.hypot(p.x - me.x, p.y - me.y) < 320)
                .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
            if (flower) { this.moveToward(flower); return; }
        }

        // Healers: primeiro cuidar do time, depois lutar
        const allies = fighters.filter(f => alive(f) && f.team === me.team && f !== me);
        if (me.characterType === 'flora') {
            // Joga a flor quando alguém do time (ou ela, se estiver sozinha) está abaixo de 80% de vida
            const needsHeal = allies.length ? allies.some(a => a.health < a.maxHealth * 0.8) : me.health < me.maxHealth * 0.8;
            if (needsHeal && me.energy >= FLORA_FLOWER_COST && me.specialCooldown <= 0) {
                me.attack('special');
                return;
            }
        }
        if (me.characterType === 'nyx') {
            // Laço quando alguém do time (ou ela, sozinha) está abaixo de 70% e há inimigo no alcance.
            // Fora isso ela luta: é batendo que ela cura.
            const team = [me, ...allies];
            const needsHeal = team.some(f => f.health < f.maxHealth * 0.7);
            if (needsHeal && d < NYX_LINK_RANGE * 0.9 && me.energy >= NYX_LINK_COST && me.specialCooldown <= 0) {
                me.attack('special');
                return;
            }
        }
        if (me.characterType === 'celestia') {
            // Ultimate quando 2+ do time (contando ela) estão abaixo de 50%; no 1v1, quando ela está
            const team = [me, ...allies];
            const hurt = team.filter(f => f.health < f.maxHealth * 0.5).length;
            if (hurt >= Math.min(2, team.length) && me.energy >= CELESTIA_ULT_COST && me.specialCooldown <= 0) {
                me.attack('special');
                return;
            }
            // Fica perto do aliado mais machucado para ele ficar dentro da área
            const mostHurt = allies.filter(a => a.health < a.maxHealth * 0.85).sort((a, b) => a.health - b.health)[0];
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

        // Zarek: a ultimate é invulnerável e não pode ser bloqueada, então usa sempre que estiver pronta
        // e no alcance. Antes de transformar, a barra enche com trocação, então prefere ficar colado.
        if (me.characterType === 'zarek') {
            const ultReady = me.energy >= ZAREK_ULT_COST && me.specialCooldown <= 0;
            if (ultReady && d < zarekUltRange(me) * 0.9) {
                me.attack('special');
                return;
            }
        }

        // Aegis: levanta a Muralha contra atiradores (ou quando alguém chega perto);
        // sem a Muralha, segura os tiros com o escudo enquanto avança
        if (me.characterType === 'aegis') {
            const ranged = enemiesOf(me).filter(e => isRangedFighter(e) && distance(me, e) < 520)
                .sort((a, b) => distance(me, a) - distance(me, b));
            // Sem aliados (1v1) a Muralha só vale contra atirador; com aliados, protege o time
            const hasAllies = allies.length > 0;
            if (me.energy >= AEGIS_WALL_COST && me.specialCooldown <= 0 && (ranged.length || (hasAllies && d < 200))) {
                me.target = ranged[0] || opponent;
                me.aim = directionTo(me, me.target);
                me.attack('special');
                return;
            }
            if (hasAllies && ranged.length && d > meleeRange + 40 && me.defenseResetCooldown <= 0 && Math.random() < 0.2) {
                me.target = ranged[0];
                me.isDefending = true;
                return;
            }
        }
        // Rhino: dispara o Estouro sempre que o alvo estiver no caminho (de perto ele atropela na hora)
        if (me.characterType === 'rhino') {
            if (me.energy >= RHINO_CHARGE_COST && me.specialCooldown <= 0 && d < RHINO_CHARGE_DISTANCE * 0.8) {
                me.attack('special');
                return;
            }
        }
        // Anchor: engancha quem está longe (de preferência atiradores e healers) e voa até ele
        if (me.characterType === 'anchor') {
            if (me.energy >= ANCHOR_HOOK_COST && me.specialCooldown <= 0 && !me.hookTarget) {
                const inRange = enemiesOf(me).filter(e => !e.isInsideOpponent && distance(me, e) <= ANCHOR_HOOK_RANGE * 0.95 && distance(me, e) > 130);
                const backline = inRange.filter(e => isRangedFighter(e) || HEALERS.includes(e.characterType));
                const prey = backline.sort((a, b) => a.health - b.health)[0] || inRange.find(e => e === opponent);
                if (prey) {
                    me.target = prey;
                    me.attack('special');
                    return;
                }
            }
        }

        // Coleone: vai buscar quem estiver no alcance (de preferência atirador ou healer) e enterra
        if (me.characterType === 'coleone') {
            if (me.energy >= COLEONE_DUNK_COST && me.specialCooldown <= 0 && !me.dunkPhase) {
                const inRange = enemiesOf(me).filter(e => !e.isInsideOpponent && !e.heldBy && distance(me, e) <= COLEONE_DUNK_RANGE * 0.9);
                const backline = inRange.filter(e => isRangedFighter(e) || HEALERS.includes(e.characterType));
                const prey = backline.sort((a, b) => a.health - b.health)[0] || inRange.find(e => e === opponent) || inRange[0];
                if (prey) {
                    me.target = prey;
                    me.attack('special');
                    return;
                }
                // Ninguém para agarrar, mas o alvo está a meia distância: às vezes enterra só a bola nele
                if (d < COLEONE_BALL_RANGE * 0.85 && Math.random() < 0.25) {
                    me.attack('special');
                    return;
                }
            }
        }

        // Bershow: fecha a armadura com o alvo na linha do Corte Devastador
        if (me.characterType === 'bershow') {
            if (me.energy >= BERSHOW_ARMOR_COST && me.specialCooldown <= 0 && me.furyTimer <= 0 && d < BERSHOW_SLASH_RANGE * 0.8) {
                me.attack('special');
                return;
            }
        }

        // Aspas: chama o Exército das Sombras quando há inimigo por perto para os soldados caçarem
        if (me.characterType === 'aspas') {
            if (me.energy >= ASPAS_ARMY_COST && me.specialCooldown <= 0 && d < 400) {
                me.attack('special');
                return;
            }
        }

        // Capitã Sina: gira a roleta com o alvo a uma distância que serve para as três armas
        // (pistola, tubarão e barco alcançam ~400); enquanto gira, continua lutando com a faca
        if (me.characterType === 'sina') {
            if (me.energy >= SINA_ULT_COST && me.specialCooldown <= 0 && me.sinaSpinTimer <= 0 && d < SINA_BOAT_RANGE * 0.85) {
                me.attack('special');
                return;
            }
        }

        // Atiradores: mantêm distância, recuam de quem chega perto e atiram de longe
        // Weaver: caçador de atiradores e healers — puxa quem está lá atrás; de média distância, joga teia
        if (me.characterType === 'weaver') {
            if (me.energy >= WEAVER_PULL_COST && me.specialCooldown <= 0 && !me.pullTarget) {
                const inRange = enemiesOf(me).filter(e => !e.isInsideOpponent && distance(me, e) <= WEAVER_PULL_RANGE * 0.95);
                const backline = inRange.filter(e => SHOOTERS.includes(e.characterType) || HEALERS.includes(e.characterType) || e.characterType === 'craque');
                const prey = backline.sort((a, b) => a.health - b.health)[0] || inRange.find(e => distance(me, e) > 150);
                if (prey) {
                    me.target = prey;
                    me.attack('special');
                    return;
                }
            }
            if (d > 120 && d < 300 && opponent.slowTimer <= 0 && Math.random() < 0.3) {
                me.attack('strong_punch'); // teia para deixar o alvo lento
                this.moveToward(opponent);
                return;
            }
        }

        // Roxy: agressiva — chega perto atirando sem parar e solta o Frenesi quando tem inimigo no alcance
        if (me.characterType === 'roxy') {
            if (me.frenzyTimer <= 0 && me.energy >= ROXY_FRENZY_COST && me.specialCooldown <= 0 && d < 380) {
                me.attack('special');
                return;
            }
            if (d < 380) me.attack('punch');
            if (d < 110) this.moveAway(opponent);
            else if (d > 300) this.moveToward(opponent);
            else this.strafe(opponent);
            return;
        }

        if (SHOOTERS.includes(me.characterType)) {
            const isMamba = me.characterType === 'mamba';
            const shotRange = isMamba ? 480 : 330;
            const comfort = isMamba ? 320 : 220;
            // Mamba solta a nuvem quando alguém chega perto (ou quando 2+ inimigos estão por perto)
            if (isMamba && me.energy >= MAMBA_CLOUD_COST && me.specialCooldown <= 0) {
                const close = enemiesOf(me).filter(e => distance(me, e) < MAMBA_CLOUD_RADIUS * 1.5).length;
                if (d < MAMBA_CLOUD_RADIUS || close >= 2) {
                    me.attack('special');
                    return;
                }
            }
            // Com a nuvem ativa, não precisa fugir de quem está perto: fica atirando
            if (isMamba && me.mambaCloudTimer > 0) {
                if (d < shotRange) me.attack('punch');
                this.strafe(opponent);
                return;
            }
            // Gear monta até 3 torretas quando há inimigo por perto
            const myTurrets = isMamba ? [] : me.myTurrets();
            if (!isMamba && myTurrets.length < GEAR_MAX_TURRETS && d < TURRET_RANGE && me.energy >= GEAR_TURRET_COST && me.specialCooldown <= 0) {
                me.attack('special');
                return;
            }
            if (d < shotRange) me.attack('punch');
            // Gear com torretas: luta perto da mais nova, do lado oposto ao inimigo (quem chega perto toma tiro de todas)
            if (myTurrets.length) {
                const anchor = myTurrets[myTurrets.length - 1];
                const away = directionTo(opponent, anchor);
                const spot = { x: anchor.x + away.x * 50, y: anchor.y + away.y * 50 };
                if (distance(me, spot) > 30) this.moveToward(spot);
                else this.strafe(opponent);
                return;
            }
            if (d < comfort * 0.6) this.moveAway(opponent);
            else if (d > shotRange * 0.9) this.moveToward(opponent);
            else this.strafe(opponent);
            return;
        }

        // Craque joga de longe: chuta bola enquanto tiver, mantendo distância; o especial (bola nova) só quando faltar
        if (me.characterType === 'craque') {
            // Com poucas bolas na mão e outras soltas pela arena, puxa todas de volta
            const ballsOut = groundBalls.length + projectiles.filter(p => p.type === 'football' && p.shooter === me && !p.isReturning).length;
            if (me.ballCount <= 2 && ballsOut >= 2 && canUseSpecial) {
                me.attack('special');
                return;
            }
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
        if (canUseSpecial && me.characterType !== 'craque' && d < 280 && Math.random() < 0.7) {
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
