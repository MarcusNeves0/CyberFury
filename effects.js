// Efeitos e projéteis
// Projéteis, partículas, textos flutuantes, Muralhas, ondas de choque e explosões no chão.

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
        this.radius = { pumpkin: 22, rocket_punch: 14, tornado: 16, football: 13, fenris_blade: 10, mamba_shot: 7, nail: 6, turret_shot: 6, pistol_shot: 6, web: 9, sina_bullet: 6, shark: 20 }[type] || 12;
        // Duração em passos (com a velocidade, define o alcance dos tiros)
        this.life = { football: 200, mamba_shot: 34, nail: 30, turret_shot: 34, pistol_shot: 29, web: 30, sina_bullet: 30, shark: 60 }[type] || 150;
        if (type === 'shark') this.hits = new Set(); // o tubarão atravessa: cada inimigo leva uma vez
        this.bounces = 0;
        this.isReturning = false;
        this.returnSpeed = 7; // bola puxada pelo especial volta mais rápido
        this.done = false;
    }

    // Bola do Craque: quica em paredes e obstáculos; os outros projéteis somem
    bounceOrBreak(normalX, normalY) {
        if (this.type !== 'football' || this.isReturning) { this.done = true; return; }
        if (normalX) this.vx = Math.abs(this.vx) * normalX;
        if (normalY) this.vy = Math.abs(this.vy) * normalY;
        this.bounces++;
        sfx.play('craque_kick');
    }

    update() {
        this.life--;
        if (this.isReturning) {
            // Volta para o Craque
            const dir = directionTo(this, this.shooter);
            this.vx = dir.x * this.returnSpeed;
            this.vy = dir.y * this.returnSpeed;
            if (this.returnSpeed > 7 && this.life % 3 === 0) {
                particles.push(new Particle(this.x, this.y - 30, 'rgba(120, 200, 255, 0.7)', 0, { x: 0, y: 0 }));
            }
            if (!alive(this.shooter) || distance(this, this.shooter) < 24) {
                if (alive(this.shooter)) this.shooter.ballCount = Math.min(this.shooter.maxBallCount, this.shooter.ballCount + 1);
                this.done = true;
                return;
            }
        }
        this.x += this.vx;
        this.y += this.vy;
        // Rastro de água do tubarão
        if (this.type === 'shark' && this.life % 2 === 0) {
            particles.push(new Particle(this.x, this.y - 22, 'rgba(120, 200, 255, 0.7)', 0, { x: -this.vx * 0.2 + (Math.random() - 0.5), y: -Math.random() * 1.5 }));
        }

        if (this.isReturning) return;
        if (this.life <= 0) {
            // Bola que perdeu força fica no chão para o Craque buscar
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

        // Torretas inimigas levam o tiro
        const turret = turrets.find(t => t.team !== this.shooter.team && Math.hypot(this.x - t.x, this.y - t.y) < this.radius + t.radius);
        if (turret) {
            turret.takeHit(this.damage);
            if (this.type === 'football') {
                // A bola do Craque quica na torreta em vez de sumir (e sai de dentro dela, para não bater de novo)
                const away = normalize(this.x - turret.x, this.y - turret.y);
                this.x = turret.x + away.x * (turret.radius + this.radius + 1);
                this.y = turret.y + away.y * (turret.radius + this.radius + 1);
                const speed = Math.hypot(this.vx, this.vy);
                this.vx = away.x * speed;
                this.vy = away.y * speed;
                this.bounces++;
            } else {
                this.done = true;
                return;
            }
        }

        // Obstáculos: árvores bloqueiam, caixas bloqueiam e levam dano (o tubarão arremessado passa por cima)
        for (const o of (this.type === 'shark' ? [] : obstacles)) {
            if (!circleHitsObstacle(this.x, this.y, this.radius, o)) continue;
            if (o.hp !== undefined) damageBox(o, this.damage);
            const center = obstacleCenter(o);
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
                if (this.type === 'rocket_punch') titanShockwave(this.x, this.y, this.shooter, null);
            }
            break;
        }
        if (this.type === 'football' && this.bounces > 3) {
            groundBalls.push({ x: this.x, y: this.y });
            this.done = true;
        }
    }

    draw() {
        // Tiros de energia: um risco brilhante na direção do voo
        const bolts = {
            mamba_shot: { color: '#6dff8a', length: 18, width: 3 },
            nail: { color: '#cfd6e6', length: 10, width: 2 },
            turret_shot: { color: '#3ff6ff', length: 12, width: 3 },
            pistol_shot: { color: '#ff4fa3', length: 11, width: 3 },
            sina_bullet: { color: '#ffd23f', length: 14, width: 3 },
        };
        if (this.type === 'shark') {
            // Tubarão voando: o emoji olha para a esquerda, então espelha quando vai para a direita
            ctx.save();
            ctx.translate(this.x, this.y - 30);
            if (this.vx > 0) ctx.scale(-1, 1);
            ctx.rotate(Math.atan2(this.vy, Math.abs(this.vx)) * (this.vx > 0 ? -1 : 1));
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🦈', 0, 0);
            ctx.restore();
            return;
        }
        if (this.type === 'web') {
            // Bolinha de teia: círculo branco com fios saindo
            ctx.save();
            ctx.translate(this.x, this.y - 30);
            ctx.rotate(this.life * 0.3);
            ctx.strokeStyle = 'rgba(232, 251, 255, 0.9)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
            return;
        }
        const bolt = bolts[this.type];
        if (bolt) {
            const dir = normalize(this.vx, this.vy);
            ctx.save();
            ctx.strokeStyle = bolt.color;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = bolt.width * 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x - dir.x * bolt.length, this.y - 30 - dir.y * bolt.length);
            ctx.lineTo(this.x, this.y - 30);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = bolt.width;
            ctx.stroke();
            ctx.restore();
            return;
        }

        const size = this.type === 'pumpkin' ? 44 : this.type === 'fenris_blade' ? 22 : 30;
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
        } else if (this.type === 'fenris_blade') {
            ctx.fillText('💥', 0, 0);
        }
        ctx.restore();
    }
}

// Poeirinha no chão a cada passo
function spawnStepDust(fighter) {
    for (let i = 0; i < 3; i++) {
        const p = new Particle(fighter.x + (Math.random() - 0.5) * 14, fighter.y - 2, 'rgba(190, 180, 215, 0.5)', 0,
            { x: -fighter.moveX * 0.15 + (Math.random() - 0.5) * 0.6, y: -Math.random() * 0.5 });
        p.radius = 1.5 + Math.random() * 1.5;
        p.life = 45;
        particles.push(p);
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
    } else if (type === 'kenji_punch') {
        const count = extraParams.count || 1;
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(extraParams.x, extraParams.y, 'kenji_star', 0, { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }));
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
        } else if (this.color === 'kenji_star') {
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

function updateProjectiles() {
    for (const projectile of projectiles) {
        projectile.update();
        if (projectile.done || projectile.isReturning) continue;
        if (blockedByShield(projectile)) {
            if (projectile.type === 'football') projectile.isReturning = true;
            else projectile.done = true;
            continue;
        }
        if (projectile.type === 'shark') { sharkBite(projectile); continue; }
        const target = enemiesOf(projectile.shooter).find(enemy =>
            !enemy.isInsideOpponent && distance(projectile, enemy) < projectile.radius + enemy.radius + 4);
        if (!target) continue;
        // Tiro da torreta conta como do Gear (barra do Zarek, maldição etc.)
        const attacker = projectile.shooter.isTurret ? projectile.shooter.owner : projectile.shooter;

        if (projectile.type === 'mamba_shot') {
            const defended = target.takeDamage(projectile.damage, {}, attacker);
            // 20% de chance de envenenar
            if (!defended && Math.random() < MAMBA_POISON_CHANCE) target.applyPoison(1);
            projectile.done = true;
            continue;
        }

        const dir = normalize(projectile.vx, projectile.vy);
        if (projectile.type === 'tornado' && !target.isDefending) {
            // Tornado: prende o alvo no ar, Kaze aparece atrás dele e corta
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

        const defended = target.takeDamage(projectile.damage, {}, attacker);
        // Teia do Weaver: gruda e deixa o alvo lento
        if (projectile.type === 'web' && !defended) target.slowTimer = WEB_SLOW_DURATION;
        // Roxy: cada acerto aumenta a adrenalina (atira mais rápido)
        if (projectile.type === 'pistol_shot' && !defended) {
            attacker.adrenaline = Math.min(1, attacker.adrenaline + ROXY_ADRENALINE_PER_HIT);
            attacker.adrenalineTimer = ROXY_ADRENALINE_HOLD;
        }
        // Soco-foguete do Titan: empurra e atordoa por 0,3 s (se não for bloqueado)
        if (projectile.type === 'rocket_punch') titanShockwave(target.x, target.y, projectile.shooter, target);
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

    // Craque recolhe bolas paradas no chão
    for (const ball of groundBalls) {
        const craque = fighters.find(f => alive(f) && f.characterType === 'craque' && f.ballCount < f.maxBallCount && distance(f, ball) < f.radius + 12);
        if (craque) { craque.ballCount++; ball.taken = true; }
    }
    groundBalls = groundBalls.filter(b => !b.taken);
}

// Tubarão da Sina: atravessa todos no caminho, mordendo e empurrando cada um uma vez
function sharkBite(shark) {
    const dir = normalize(shark.vx, shark.vy);
    for (const enemy of enemiesOf(shark.shooter)) {
        if (enemy.isInsideOpponent || shark.hits.has(enemy)) continue;
        if (distance(shark, enemy) >= shark.radius + enemy.radius + 4) continue;
        shark.hits.add(enemy);
        const defended = enemy.takeDamage(shark.damage, { sound: 'hit_heavy' }, shark.shooter);
        enemy.push(dir, defended ? 4 : 10);
        sfx.play('chomp');
        for (let i = 0; i < 8; i++) particles.push(new Particle(enemy.x, enemy.chestY, i % 2 ? '#6ec8ff' : '#e8fbff', 0, { x: dir.x * 3 + (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 }));
    }
}

// Barco de água da Sina: sombra e onda no chão durante o aviso; depois cai atingindo todos na área
function updateSinaBoats() {
    for (const boat of sinaBoats) {
        if (boat.timer > 0) {
            if (--boat.timer > 0) continue;
            const owner = boat.owner;
            for (const enemy of fighters) {
                if (!alive(enemy) || enemy.team === owner.team || enemy.isInsideOpponent) continue;
                const d = Math.hypot(enemy.x - boat.x, enemy.y - boat.y);
                if (d > SINA_BOAT_RADIUS + enemy.radius) continue;
                enemy.takeDamage(SINA_BOAT_DAMAGE, { unblockable: true, sound: 'hit_heavy' }, owner);
                enemy.isParalyzed = true;
                enemy.paralysisTimer = Math.max(enemy.paralysisTimer, SINA_BOAT_STUN);
                enemy.push(d > 0 ? { x: (enemy.x - boat.x) / d, y: (enemy.y - boat.y) / d } : { x: 1, y: 0 }, 7);
            }
            turrets.filter(t => t.team !== owner.team && !t.done && Math.hypot(t.x - boat.x, t.y - boat.y) < SINA_BOAT_RADIUS + t.radius)
                .forEach(t => t.destroy(true));
            for (const box of obstacles.filter(o => o.hp !== undefined)) {
                if (circleHitsObstacle(boat.x, boat.y, SINA_BOAT_RADIUS, box)) damageBox(box, 999);
            }
            for (let i = 0; i < 46; i++) {
                const a = Math.random() * Math.PI * 2, speed = 2 + Math.random() * 5;
                particles.push(new Particle(boat.x + Math.cos(a) * 20, boat.y - 10, i % 3 ? '#5ab8ff' : '#e8fbff', 0, { x: Math.cos(a) * speed, y: Math.sin(a) * speed * 0.6 - 2 }));
            }
            screenShake = Math.max(screenShake, 12);
            sfx.play('sina_boat');
            boat.splash = 24;
        } else if (boat.splash > 0) {
            boat.splash--;
        }
    }
    sinaBoats = sinaBoats.filter(b => b.timer > 0 || b.splash > 0);
}

// Por baixo dos lutadores: área do impacto enchendo e, depois, a onda se espalhando
function drawSinaBoatShadows() {
    for (const boat of sinaBoats) {
        ctx.save();
        if (boat.timer > 0) {
            const progress = 1 - boat.timer / SINA_BOAT_WARNING;
            ctx.fillStyle = `rgba(30, 120, 255, ${0.12 + progress * 0.22})`;
            ctx.beginPath();
            ctx.arc(boat.x, boat.y, SINA_BOAT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(140, 210, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 6]);
            ctx.lineDashOffset = -Date.now() / 30;
            ctx.stroke();
            ctx.setLineDash([]);
            // Sombra do barco crescendo conforme ele se aproxima
            ctx.fillStyle = `rgba(5, 10, 40, ${0.25 + progress * 0.3})`;
            ctx.beginPath();
            ctx.ellipse(boat.x, boat.y, 60 * (0.4 + progress * 0.6), 18 * (0.4 + progress * 0.6), 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const progress = 1 - boat.splash / 24;
            ctx.strokeStyle = `rgba(120, 200, 255, ${1 - progress})`;
            ctx.lineWidth = 6 - progress * 4;
            ctx.beginPath();
            ctx.arc(boat.x, boat.y, SINA_BOAT_RADIUS * (0.6 + progress * 0.6), 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(60, 160, 255, ${0.35 * (1 - progress)})`;
            ctx.fill();
        }
        ctx.restore();
    }
}

// Por cima de tudo: o barco feito de água caindo do céu
function drawSinaBoatShips() {
    for (const boat of sinaBoats) {
        if (boat.timer <= 0) continue;
        const progress = 1 - boat.timer / SINA_BOAT_WARNING;
        const scale = 0.7 + progress * 0.6;
        ctx.save();
        ctx.translate(boat.x, boat.y - 24 - (1 - progress) ** 2 * 300);
        ctx.scale(scale, scale);
        ctx.globalAlpha = 0.85;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#d8f2ff';
        ctx.lineWidth = 2;
        // Vela e mastro
        ctx.fillStyle = 'rgba(150, 215, 255, 0.85)';
        ctx.beginPath(); ctx.moveTo(4, -62); ctx.lineTo(4, -12); ctx.lineTo(40, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-2, -58); ctx.lineTo(-2, -14); ctx.lineTo(-30, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#9fdcff';
        ctx.fillRect(-1, -70, 4, 62);
        // Casco
        ctx.fillStyle = 'rgba(40, 140, 255, 0.9)';
        ctx.beginPath(); ctx.moveTo(-54, -10); ctx.lineTo(54, -10); ctx.lineTo(38, 14); ctx.lineTo(-38, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        // Espuma pingando do casco
        ctx.fillStyle = '#e8fbff';
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(i * 12, 16 + Math.sin(Date.now() / 90 + i) * 3, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Roleta da Sina em cima da cabeça: fatias do tamanho de cada chance, ponteiro em cima
const SINA_SLICE_STYLE = { pistol: { color: '#ffb81f', icon: '🔫' }, shark: { color: '#3fb6ff', icon: '🦈' }, boat: { color: '#2448ff', icon: '🌊' } };
function drawSinaRoulette(sina) {
    if (!sina.sinaSlices || (sina.sinaSpinTimer <= 0 && sina.sinaResultTimer <= 0)) return;
    const spinning = sina.sinaSpinTimer > 0;
    const t = 1 - sina.sinaSpinTimer / SINA_SPIN_FRAMES;
    const angle = spinning ? sina.sinaSpinFinal * (1 - (1 - t) ** 3) : sina.sinaSpinFinal; // desacelera até parar
    const r = spinning ? 26 : 28 + Math.sin(sina.sinaResultTimer / 3) * 1.5;
    const cx = sina.x, cy = sina.y - sina.z - sina.height - 44;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(10, 5, 20, 0.85)';
    ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.fill();
    for (const slice of sina.sinaSlices) {
        const style = SINA_SLICE_STYLE[slice.type];
        const won = !spinning && slice.type === sina.sinaResult;
        ctx.fillStyle = style.color;
        ctx.globalAlpha = spinning || won ? 1 : 0.35;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, slice.from + angle, slice.to + angle);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1a1024';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Ícone da fatia (só se couber)
        if (slice.to - slice.from > 0.5) {
            const mid = (slice.from + slice.to) / 2 + angle;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(style.icon, Math.cos(mid) * r * 0.6, Math.sin(mid) * r * 0.6);
        }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, Math.PI * 2); ctx.stroke();
    // Ponteiro
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-5, -r - 8); ctx.lineTo(5, -r - 8); ctx.lineTo(0, -r + 2); ctx.closePath(); ctx.fill();
    // Resultado em destaque
    if (!spinning) {
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(SINA_SLICE_STYLE[sina.sinaResult].icon, 0, 0);
    }
    ctx.restore();
}

// Distância de um ponto até o segmento da Muralha
function distanceToWall(x, y, w) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    const t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (w.x1 + dx * t), y - (w.y1 + dy * t));
}

// Tiro inimigo bateu no escudo levantado de um Aegis ou numa Muralha?
function blockedByShield(projectile) {
    const team = projectile.shooter.team;
    const spark = color => {
        for (let i = 0; i < 5; i++) particles.push(new Particle(projectile.x, projectile.y, color, 0, { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }));
        sfx.play('block');
    };
    for (const wall of walls) {
        if (wall.team !== team && distanceToWall(projectile.x, projectile.y, wall) < projectile.radius + 6) { spark('#7fd0ff'); return true; }
    }
    for (const b of fighters) {
        if (!alive(b) || b.team === team || b.characterType !== 'aegis' || !b.isDefending) continue;
        const dx = projectile.x - b.x, dy = projectile.y - b.y, d = Math.hypot(dx, dy);
        if (d < b.radius + AEGIS_SHIELD_REACH && d > 0 && (dx * b.aim.x + dy * b.aim.y) / d > 0.2) { spark('#7fd0ff'); return true; }
    }
    return false;
}

// Muralhas: duram alguns segundos e deixam lentos os inimigos encostados nelas
function updateWalls() {
    for (const wall of walls) {
        wall.life--;
        for (const enemy of fighters) {
            if (!alive(enemy) || enemy.team === wall.team || enemy.isInsideOpponent) continue;
            if (distanceToWall(enemy.x, enemy.y, wall) >= enemy.radius + 24) continue;
            enemy.slowTimer = Math.max(enemy.slowTimer, 10);
            if (wall.life % 30 === 0) enemy.takeDamage(AEGIS_WALL_TICK_DAMAGE, { unblockable: true, sound: 'hit' }, wall.owner);
        }
    }
    walls = walls.filter(w => w.life > 0);
}

function drawWalls() {
    for (const wall of walls) {
        const fade = Math.min(1, wall.life / 30);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.shadowColor = '#3fa8ff';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(80, 170, 255, ${0.35 * fade})`;
        ctx.lineWidth = 16;
        ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
        ctx.strokeStyle = `rgba(200, 235, 255, ${0.9 * fade})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -Date.now() / 30;
        ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1 - 18); ctx.lineTo(wall.x2, wall.y2 - 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
        ctx.restore();
    }
}

// Corrente do Anchor esticada até o inimigo enganchado
function drawAnchorChain(anchor, target) {
    ctx.save();
    const dx = target.x - anchor.x, dy = target.chestY - anchor.chestY;
    const links = Math.max(2, Math.floor(Math.hypot(dx, dy) / 10));
    for (let i = 0; i <= links; i++) {
        const t = i / links;
        ctx.fillStyle = i % 2 ? '#8a94a8' : '#c0c8d8';
        ctx.fillRect(anchor.x + dx * t - 2, anchor.chestY + dy * t - 2, 4, 4);
    }
    ctx.restore();
}

// Onda de choque do foguete do Titan: empurra, atordoa e fere os inimigos em volta da explosão
// (o alvo atingido em cheio já levou o dano do foguete e não leva o da onda)
function titanShockwave(x, y, titan, directHit) {
    shockwaves.push({ x, y, life: 20 });
    for (const enemy of fighters) {
        if (!alive(enemy) || enemy.team === titan.team || enemy === directHit || enemy.isInsideOpponent) continue;
        const d = Math.hypot(enemy.x - x, enemy.y - y);
        if (d > TITAN_SHOCKWAVE_RADIUS + enemy.radius) continue;
        const defended = enemy.takeDamage(TITAN_SHOCKWAVE_DAMAGE, {}, titan);
        if (defended) continue;
        enemy.push(d > 0 ? { x: (enemy.x - x) / d, y: (enemy.y - y) / d } : { x: 1, y: 0 }, 9);
        enemy.isParalyzed = true;
        enemy.paralysisTimer = Math.max(enemy.paralysisTimer, 18);
    }
}

function drawShockwaves() {
    for (const wave of shockwaves) {
        const progress = 1 - wave.life / 20;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 150, 40, ${1 - progress})`;
        ctx.lineWidth = 4 - progress * 3;
        ctx.beginPath();
        ctx.ellipse(wave.x, wave.y, TITAN_SHOCKWAVE_RADIUS * progress, TITAN_SHOCKWAVE_RADIUS * progress * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// Explosão do Hades: depois do aviso, atinge todos os inimigos dentro do círculo
function updateHazards() {
    for (const hazard of hazards) {
        hazard.timer--;
        if (hazard.timer > 0) continue;
        for (const enemy of fighters) {
            if (!alive(enemy) || enemy.team === hazard.owner.team || enemy.isInsideOpponent) continue;
            if (Math.hypot(enemy.x - hazard.x, enemy.y - hazard.y) <= hazard.radius + enemy.radius) {
                enemy.takeDamage(HADES_DAMAGE, { type: 'burn' }, hazard.owner);
            }
        }
        sfx.play('explosion');
        createParticleEffect(null, 'ground_explosion', { x: hazard.x, y: hazard.y, count: 24 });
    }
    hazards = hazards.filter(h => h.timer > 0);
}

// Aviso no chão: círculo de fogo que vai enchendo até explodir
function drawHazards() {
    for (const hazard of hazards) {
        const progress = 1 - hazard.timer / HADES_WARNING_FRAMES;
        ctx.save();
        ctx.fillStyle = `rgba(255, 90, 0, ${0.12 + progress * 0.25})`;
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 160, 40, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -Date.now() / 40;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 220, 80, 0.35)';
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.radius * progress, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
