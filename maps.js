// Mapas
// Arenas, obstáculos e perigos de cada mapa (letreiros, laser, fios, plantas carnívoras, flores de cura).

// --- Mapas ---
// Cada mapa tem obstáculos (posições em frações da arena), um chão desenhado uma vez (cache)
// e efeitos animados próprios (chuva, laser, flores...). match.map = 'random' sorteia a cada luta.
const ARENA_BOUNDS = {
    duel: { left: 200, top: 165, right: 1080, bottom: 690 }, // topo mais baixo: o placar do 1v1 é maior
    team: { left: 40, top: 120, right: 1240, bottom: 700 },
};

// Tipos de obstáculo: redondos têm r, retangulares têm w/h; só os quebráveis têm hp
const OBSTACLE_TYPES = {
    tree: { r: 18 },
    box: { w: 34, h: 26, hp: 80 },
    watertank: { r: 24 },
    ac: { w: 46, h: 30 },
    antenna: { r: 9 },
    labtank: { r: 20, hp: 60 },
    console: { w: 58, h: 26 },
    rack: { w: 30, h: 48 },
    doorframe: { w: 14, h: 70 },
    planter: { w: 64, h: 28 },
    gardentree: { r: 20 },
    fountain: { r: 32 },
    chomper: { r: 13 },
};

const MAPS = {
    plaza: {
        name: 'PRAÇA NEON',
        duel: [['tree', 0.5, 0.18], ['tree', 0.5, 0.84], ['box', 0.3, 0.42], ['box', 0.7, 0.58], ['box', 0.3, 0.7], ['box', 0.7, 0.3]],
        team: [['tree', 0.5, 0.16], ['tree', 0.5, 0.86], ['tree', 0.24, 0.28], ['tree', 0.76, 0.72], ['tree', 0.24, 0.76], ['tree', 0.76, 0.24],
            ['box', 0.4, 0.42], ['box', 0.6, 0.58], ['box', 0.4, 0.62], ['box', 0.6, 0.38], ['box', 0.14, 0.5], ['box', 0.86, 0.5]],
    },
    rooftop: {
        name: 'TELHADO NEON',
        duel: [['watertank', 0.5, 0.22], ['watertank', 0.5, 0.8], ['ac', 0.32, 0.46], ['ac', 0.68, 0.56], ['antenna', 0.28, 0.78], ['antenna', 0.72, 0.24]],
        team: [['watertank', 0.5, 0.2], ['watertank', 0.5, 0.82], ['ac', 0.3, 0.34], ['ac', 0.7, 0.66], ['ac', 0.32, 0.72], ['ac', 0.68, 0.28],
            ['antenna', 0.42, 0.5], ['antenna', 0.58, 0.5], ['box', 0.17, 0.24], ['box', 0.83, 0.76]],
        // Poças (fx, fy, raio x, raio y); as 4 primeiras ficam embaixo dos letreiros e levam o choque
        puddles: [[0.3, 0.09, 64, 20], [0.7, 0.09, 64, 20], [0.3, 0.92, 64, 20], [0.7, 0.92, 64, 20], [0.2, 0.52, 46, 26], [0.8, 0.48, 46, 26], [0.5, 0.5, 34, 14]],
        signs: [[0.3, 'top', 'RAMEN', '#ff4dff'], [0.7, 'top', 'HOTEL', '#00ffff'], [0.3, 'bottom', 'NEO ★ BAR', '#ffe34a'], [0.7, 'bottom', '24H', '#ff5a5a']],
    },
    lab: {
        name: 'LABORATÓRIO ABANDONADO',
        duel: [['labtank', 0.34, 0.28], ['labtank', 0.66, 0.72], ['console', 0.5, 0.5], ['rack', 0.24, 0.7], ['rack', 0.76, 0.3]],
        team: [['labtank', 0.3, 0.24], ['labtank', 0.7, 0.76], ['labtank', 0.43, 0.7], ['labtank', 0.57, 0.3], ['console', 0.5, 0.5],
            ['rack', 0.2, 0.74], ['rack', 0.8, 0.26], ['doorframe', 0.34, 0.5], ['doorframe', 0.66, 0.5]],
    },
    garden: {
        name: 'JARDIM SUSPENSO',
        duel: [['fountain', 0.5, 0.5], ['planter', 0.3, 0.2], ['planter', 0.7, 0.8], ['chomper', 0.3, 0.74], ['chomper', 0.7, 0.26]],
        team: [['fountain', 0.5, 0.5], ['planter', 0.3, 0.18], ['planter', 0.7, 0.82], ['gardentree', 0.24, 0.64], ['gardentree', 0.76, 0.36],
            ['chomper', 0.38, 0.82], ['chomper', 0.62, 0.18], ['planter', 0.17, 0.4], ['planter', 0.83, 0.6]],
        // Arbustos (fx, fy, raio): quem está dentro fica escondido de quem está longe
        bushes: {
            duel: [[0.38, 0.62, 36], [0.62, 0.38, 36]],
            team: [[0.37, 0.38, 40], [0.63, 0.62, 40], [0.2, 0.86, 38], [0.8, 0.14, 38]],
        },
    },
};
const MAP_IDS = Object.keys(MAPS);

let mapId = 'plaza';
let mapState = {};   // estado animado do mapa atual (chuva, laser, flores, ...)
let bushes = [];     // arbustos do jardim
let pickups = [];    // flores de cura que nascem no jardim

const isRound = o => o.r !== undefined;
const obstacleCenter = o => (isRound(o) ? o : { x: o.x + o.w / 2, y: o.y + o.h / 2 });
const rand = (a, b) => a + Math.random() * (b - a);
const arenaPoint = (fx, fy) => ({ x: arena.left + fx * (arena.right - arena.left), y: arena.top + fy * (arena.bottom - arena.top) });

function makeObstacle(kind, x, y) {
    const type = OBSTACLE_TYPES[kind];
    const o = isRound(type) ? { kind, x, y, r: type.r } : { kind, x: x - type.w / 2, y: y - type.h / 2, w: type.w, h: type.h };
    if (type.hp) { o.hp = type.hp; o.maxHp = type.hp; }
    if (kind === 'chomper') { o.cooldown = 60; o.warn = 0; o.bite = 0; }
    return o;
}

// Ponto livre (fora de obstáculos) dentro da arena
function freeSpot(margin = 30) {
    for (let tries = 0; tries < 60; tries++) {
        const x = rand(arena.left + margin, arena.right - margin), y = rand(arena.top + margin, arena.bottom - margin);
        if (!obstacles.some(o => circleHitsObstacle(x, y, margin, o))) return { x, y };
    }
    return { x: (arena.left + arena.right) / 2, y: arena.top + 40 };
}

function setupArena() {
    const size = match.mode === '1v1' ? 'duel' : 'team';
    arena = { ...ARENA_BOUNDS[size] };
    mapId = MAPS[match.map] ? match.map : MAP_IDS[Math.floor(Math.random() * MAP_IDS.length)];
    const map = MAPS[mapId];
    obstacles = [];
    hazards = [];
    shockwaves = [];
    walls = [];
    lifeOrbs = [];
    turrets = [];
    pickups = [];
    for (const [kind, fx, fy] of map[size]) {
        const p = arenaPoint(fx, fy);
        obstacles.push(makeObstacle(kind, p.x, p.y));
    }
    bushes = (map.bushes ? map.bushes[size] : []).map(([fx, fy, r]) => ({ ...arenaPoint(fx, fy), r, rustle: 0 }));
    mapState = createMapState(map);
    floorCache = null;
}

function createMapState(map) {
    const s = { t: 0, banner: 150 };
    if (mapId === 'rooftop') {
        s.puddles = map.puddles.map(([fx, fy, rx, ry]) => ({ ...arenaPoint(fx, fy), rx, ry }));
        s.signs = map.signs.map(([fx, side, text, color], i) => ({
            x: arenaPoint(fx, 0).x, y: side === 'top' ? arena.top + 10 : arena.bottom - 6, side, text, color, puddle: s.puddles[i], warn: 0, flicker: 0,
        }));
        s.signTimer = 360;
        s.rain = Array.from({ length: 320 }, () => ({ x: rand(-100, WORLD_W), y: rand(-WORLD_H, WORLD_H), speed: rand(11, 17), len: rand(10, 20), groundY: rand(60, WORLD_H) }));
        s.splashes = [];
        s.ripples = [];
        s.lightning = 0;
        s.nextLightning = 500 + Math.random() * 600;
    } else if (mapId === 'lab') {
        s.laser = { phase: 'idle', timer: 420, x: 0, dir: 1, gapY: 0, hits: new Set() };
        // Fios soltos: saem das paredes e ficam caídos no chão, soltando faíscas de vez em quando
        const wireSpots = mapId && match.mode === '1v1'
            ? [[0.12, 0, 0.2, 0.22], [0.88, 1, 0.8, 0.8], [0, 0.6, 0.12, 0.45]]
            : [[0.15, 0, 0.22, 0.14], [0.85, 1, 0.78, 0.86], [0, 0.32, 0.1, 0.4], [1, 0.68, 0.9, 0.6], [0.5, 0, 0.46, 0.22]];
        s.wires = wireSpots.map(([fx1, fy1, fx2, fy2]) => {
            const a = arenaPoint(fx1, fy1), b = arenaPoint(fx2, fy2);
            if (fy1 === 0) a.y -= 20; if (fy1 === 1) a.y += 20; if (fx1 === 0) a.x -= 20; if (fx1 === 1) a.x += 20;
            return { x1: a.x, y1: a.y, cx: (a.x + b.x) / 2 + rand(-40, 40), cy: (a.y + b.y) / 2 + rand(-30, 30), x2: b.x, y2: b.y, active: 0, next: rand(60, 300) };
        });
        s.gas = [];
        s.dust = Array.from({ length: 50 }, () => ({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), vx: rand(-0.15, 0.15), vy: rand(-0.1, 0.1), a: rand(0.1, 0.35) }));
        s.lamps = [[0.25, 0.3], [0.75, 0.7], [0.5, 0.2], [0.5, 0.82], [0.12, 0.7], [0.88, 0.3]].map(([fx, fy]) => ({ ...arenaPoint(fx, fy), on: true, timer: rand(30, 300) }));
        s.drips = [];
        s.steam = [];
    } else if (mapId === 'garden') {
        // Flores e tufos de grama espalhados (não nascem dentro de obstáculos)
        const colors = ['#ff7ac0', '#ffe34a', '#ffffff', '#c58aff', '#7ef9ff', '#ff9a5a'];
        s.flowers = [];
        for (let i = 0; i < 260; i++) {
            const x = rand(arena.left - 10, arena.right + 10), y = rand(arena.top - 10, arena.bottom + 10);
            if (obstacles.some(o => circleHitsObstacle(x, y, 8, o))) continue;
            s.flowers.push({ x, y, color: colors[i % colors.length], phase: rand(0, 6.3), h: rand(6, 12), size: rand(2, 3.5), grass: i % 3 === 0 });
        }
        s.flowers.sort((a, b) => a.y - b.y);
        s.petals = Array.from({ length: 34 }, () => ({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), vx: rand(0.4, 1.1), vy: rand(0.2, 0.6), spin: rand(0, 6.3), color: Math.random() < 0.6 ? '#ff9ad0' : '#fff2f8' }));
        s.fireflies = Array.from({ length: 26 }, () => ({ x: rand(arena.left, arena.right), y: rand(arena.top, arena.bottom), phase: rand(0, 6.3), vx: 0, vy: 0 }));
        s.butterflies = Array.from({ length: 4 }, (_, i) => ({ x: rand(arena.left, arena.right), y: rand(arena.top, arena.bottom), tx: 0, ty: 0, phase: rand(0, 6.3), color: ['#7ef9ff', '#ffb347', '#ff7ac0', '#c58aff'][i] }));
        s.butterflies.forEach(b => { const p = freeSpot(); b.tx = p.x; b.ty = p.y; });
        s.fountainDrops = [];
        s.pickupTimer = 300;
    }
    return s;
}

// Distância de um ponto até uma curva (amostrada) de um fio solto
function distanceToWire(x, y, w) {
    let best = Infinity;
    for (let i = 0; i <= 10; i++) {
        const t = i / 10, u = 1 - t;
        const px = u * u * w.x1 + 2 * u * t * w.cx + t * t * w.x2, py = u * u * w.y1 + 2 * u * t * w.cy + t * t * w.y2;
        best = Math.min(best, Math.hypot(x - px, y - py));
    }
    return best;
}

const inPuddle = (f, p) => ((f.x - p.x) / p.rx) ** 2 + ((f.y - p.y) / p.ry) ** 2 <= 1;
const inBush = f => bushes.some(b => Math.hypot(f.x - b.x, f.y - b.y) < b.r - 6);

// Escondido no arbusto: inimigos longe não enxergam (mira automática e IA ignoram)
function isHiddenFrom(f, viewer) {
    if (mapId !== 'garden' || !inBush(f)) return false;
    if (f.isAttacking || f.hitFlash > 0) return false; // atacar ou apanhar revela
    // O papagaio da Capitã Sina enxerga quem está no arbusto perto dela e avisa o time
    if (viewer && fighters.some(s => alive(s) && s.characterType === 'sina' && s.team === viewer.team && distance(s, f) < 300)) return false;
    return !viewer || distance(f, viewer) > 120;
}

// Perigo do mapa acertou alguém (não conta como dano de ninguém)
function hazardHit(f, damage, stun, sound) {
    if (!alive(f) || f.isInsideOpponent) return;
    f.takeDamage(damage, { unblockable: true, sound }, null);
    if (stun) { f.isParalyzed = true; f.paralysisTimer = Math.max(f.paralysisTimer, stun); }
}

function updateMap() {
    const s = mapState;
    s.t++;
    if (s.banner > 0) s.banner--;
    if (mapId === 'rooftop') updateRooftop(s);
    else if (mapId === 'lab') updateLab(s);
    else if (mapId === 'garden') updateGarden(s);
}

function updateRooftop(s) {
    for (const d of s.rain) {
        d.y += d.speed;
        d.x += d.speed * 0.22;
        if (d.y > d.groundY) {
            if (Math.random() < 0.5) s.splashes.push({ x: d.x, y: d.y, life: 10 });
            d.y = rand(-60, -10);
            d.x = rand(-120, WORLD_W);
            d.groundY = rand(60, WORLD_H);
        }
    }
    s.splashes.forEach(p => p.life--);
    s.splashes = s.splashes.filter(p => p.life > 0);
    // Gotas caindo nas poças fazem ondinhas
    if (Math.random() < 0.35) {
        const p = s.puddles[Math.floor(Math.random() * s.puddles.length)];
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.8;
        s.ripples.push({ x: p.x + Math.cos(a) * p.rx * r, y: p.y + Math.sin(a) * p.ry * r, r: 1, life: 26 });
    }
    s.ripples.forEach(r => { r.r += 0.6; r.life--; });
    s.ripples = s.ripples.filter(r => r.life > 0);

    // Relâmpago de vez em quando
    s.lightning *= 0.88;
    if (--s.nextLightning <= 0) {
        s.lightning = 1;
        s.nextLightning = 700 + Math.random() * 800;
        setTimeout(() => { if (gameState === 'FIGHT') sfx.play('thunder'); }, 250);
    }

    // Letreiros em curto: um deles pisca (aviso de 1 s) e descarrega na poça embaixo dele
    for (const sign of s.signs) {
        sign.flicker = Math.random() < (sign.warn > 0 ? 0.45 : 0.015) ? 6 : Math.max(0, sign.flicker - 1);
        if (sign.warn <= 0) continue;
        sign.warn--;
        if (Math.random() < 0.4) particles.push(new Particle(sign.x + rand(-30, 30), sign.y, Math.random() < 0.5 ? '#7fd0ff' : '#ffffff', 0, { x: rand(-2, 2), y: rand(-1, 3) }));
        if (sign.warn === 0) dischargeSign(s, sign);
    }
    if (--s.signTimer <= 0) {
        const sign = s.signs[Math.floor(Math.random() * s.signs.length)];
        sign.warn = 60;
        sfx.play('buzz');
        s.signTimer = 420 + Math.random() * 240;
    }
}

function dischargeSign(s, sign) {
    sfx.play('defense_break');
    screenShake = Math.max(screenShake, 5);
    sign.flicker = 20;
    for (const f of fighters) {
        if (!alive(f)) continue;
        if (inPuddle(f, sign.puddle) || Math.hypot(f.x - sign.x, f.y - sign.y) < 80) {
            hazardHit(f, 35, 24, 'hit_heavy');
            floatingTexts.push(new FloatingText(f.x, f.y - f.height - 18, 'CHOQUE!', '#7fd0ff'));
        }
    }
    const p = sign.puddle;
    for (let i = 0; i < 26; i++) particles.push(new Particle(p.x + rand(-p.rx, p.rx), p.y + rand(-p.ry, p.ry), i % 2 ? '#7fd0ff' : '#ffffff', 0, { x: rand(-3, 3), y: rand(-4, 1) }));
    s.puddleShock = { puddle: p, life: 18 };
}

function updateLab(s) {
    // Laser de segurança: aviso, depois varre a sala de um lado ao outro (com uma brecha para passar)
    const L = s.laser;
    if (L.phase === 'idle' && --L.timer <= 0) {
        L.phase = 'warn';
        L.timer = 70;
        L.dir = Math.random() < 0.5 ? 1 : -1;
        L.x = L.dir > 0 ? arena.left - 10 : arena.right + 10;
        L.gapY = rand(arena.top + 70, arena.bottom - 70);
        L.hits = new Set();
        sfx.play('laser');
    } else if (L.phase === 'warn' && --L.timer <= 0) {
        L.phase = 'sweep';
    } else if (L.phase === 'sweep') {
        L.x += L.dir * 4.5;
        for (const f of fighters) {
            if (!alive(f) || f.isInsideOpponent || L.hits.has(f)) continue;
            if (Math.abs(f.x - L.x) > f.radius) continue;
            if (Math.abs(f.y - L.gapY) < LAB_LASER_GAP / 2) continue;
            L.hits.add(f);
            hazardHit(f, 30, 0, 'hit_heavy');
            f.burnDuration = Math.max(f.burnDuration, 90);
            f.push({ x: L.dir, y: 0 }, 6);
        }
        if (L.x < arena.left - 20 || L.x > arena.right + 20) { L.phase = 'idle'; L.timer = 540 + Math.random() * 240; }
    }

    // Fios soltos: soltam faíscas por um tempo e dão choque em quem estiver em cima
    for (const w of s.wires) {
        if (w.active > 0) {
            w.active--;
            if (Math.random() < 0.6) particles.push(new Particle(w.x2 + rand(-6, 6), w.y2 - 4, Math.random() < 0.5 ? '#ffe34a' : '#7fd0ff', 0, { x: rand(-2.5, 2.5), y: rand(-3, 0.5) }));
            if (w.active % 20 === 0) {
                for (const f of fighters) if (alive(f) && distanceToWire(f.x, f.y, w) < f.radius + 6) hazardHit(f, 12, 12, 'hit');
            }
        } else if (--w.next <= 0) {
            w.active = 70;
            w.next = rand(200, 420);
            sfx.play('buzz');
        } else if (Math.random() < 0.02) {
            particles.push(new Particle(w.x2, w.y2 - 4, '#ffe34a', 0, { x: rand(-1.5, 1.5), y: rand(-2, 0) }));
        }
    }

    // Gás verde dos tanques quebrados deixa lento
    for (const g of s.gas) {
        g.life--;
        for (const f of fighters) if (alive(f) && Math.hypot(f.x - g.x, f.y - g.y) < g.r) f.slowTimer = Math.max(f.slowTimer, 10);
    }
    s.gas = s.gas.filter(g => g.life > 0);

    // Lâmpadas piscando, poeira no ar, gotas pingando e vapor do cano furado
    for (const lamp of s.lamps) {
        if (--lamp.timer <= 0) {
            lamp.on = !lamp.on;
            lamp.timer = lamp.on ? rand(60, 400) : rand(3, 14);
        }
    }
    for (const d of s.dust) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = WORLD_W; if (d.x > WORLD_W) d.x = 0; if (d.y < 0) d.y = WORLD_H; if (d.y > WORLD_H) d.y = 0;
    }
    if (Math.random() < 0.03) s.drips.push({ x: rand(arena.left, arena.right), y: rand(arena.top, arena.bottom), r: 0, life: 30 });
    s.drips.forEach(d => { d.r += 0.5; d.life--; });
    s.drips = s.drips.filter(d => d.life > 0);
    if (s.t % 4 === 0) {
        const pipe = arenaPoint(0.5, 0);
        s.steam.push({ x: pipe.x + 80, y: arena.top - 8, vx: rand(-0.3, 0.3), vy: rand(0.3, 0.8), r: rand(6, 10), life: 70 });
    }
    s.steam.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += 0.25; p.life--; });
    s.steam = s.steam.filter(p => p.life > 0);
}

function updateGarden(s) {
    // Plantas carnívoras: abrem a boca quando alguém chega perto e mordem
    for (const o of obstacles) {
        if (o.kind !== 'chomper') continue;
        if (o.cooldown > 0) o.cooldown--;
        if (o.bite > 0) o.bite--;
        const victim = fighters.filter(f => alive(f) && !f.isInsideOpponent && Math.hypot(f.x - o.x, f.y - o.y) < CHOMPER_REACH)
            .sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y))[0];
        if (o.warn > 0) {
            o.warn--;
            if (o.warn === 0) {
                o.bite = 14;
                o.cooldown = 150;
                sfx.play('chomp');
                if (victim && Math.hypot(victim.x - o.x, victim.y - o.y) < CHOMPER_REACH + 6) {
                    hazardHit(victim, 30, 30, 'hit_heavy');
                    for (let i = 0; i < 8; i++) particles.push(new Particle(victim.x, victim.chestY, '#7cff6b', 0, { x: rand(-3, 3), y: rand(-3, 1) }));
                }
            }
        } else if (victim && o.cooldown <= 0) {
            o.warn = 26;
        }
        o.lookX = victim ? Math.sign(victim.x - o.x) : (o.lookX || 1);
    }

    // Flores de cura nascem de tempos em tempos (no máximo 2)
    if (--s.pickupTimer <= 0) {
        s.pickupTimer = 540;
        if (pickups.length < 2) {
            const p = freeSpot(40);
            pickups.push({ x: p.x, y: p.y, t: 0 });
            for (let i = 0; i < 10; i++) particles.push(new Particle(p.x, p.y - 10, '#9dff8a', 0, { x: rand(-2, 2), y: rand(-3, 0) }));
        }
    }
    for (const p of pickups) {
        p.t++;
        const taker = fighters.find(f => alive(f) && !f.isInsideOpponent && Math.hypot(f.x - p.x, f.y - p.y) < f.radius + 14);
        if (!taker) continue;
        taker.heal(GARDEN_PICKUP_HEAL);
        sfx.play('heal');
        p.taken = true;
        for (let i = 0; i < 14; i++) particles.push(new Particle(p.x, p.y - 12, i % 2 ? '#9dff8a' : '#fff6a8', 0, { x: rand(-2.5, 2.5), y: rand(-4, 0) }));
    }
    pickups = pickups.filter(p => !p.taken);

    // Arbustos balançam quando alguém passa por dentro
    for (const b of bushes) {
        if (b.rustle > 0) b.rustle--;
        if (fighters.some(f => alive(f) && Math.hypot(f.moveX, f.moveY) > 0.3 && Math.hypot(f.x - b.x, f.y - b.y) < b.r)) b.rustle = 12;
    }

    // Pétalas no vento, vaga-lumes, borboletas e o chafariz
    for (const p of s.petals) {
        p.x += p.vx + Math.sin(s.t * 0.02 + p.spin) * 0.3;
        p.y += p.vy;
        p.spin += 0.05;
        if (p.x > WORLD_W + 10) p.x = -10;
        if (p.y > WORLD_H + 10) { p.y = -10; p.x = rand(-100, WORLD_W); }
    }
    for (const f of s.fireflies) {
        f.vx += rand(-0.05, 0.05); f.vy += rand(-0.05, 0.05);
        f.vx *= 0.97; f.vy *= 0.97;
        f.x = Math.max(arena.left, Math.min(arena.right, f.x + f.vx));
        f.y = Math.max(arena.top, Math.min(arena.bottom, f.y + f.vy));
    }
    for (const b of s.butterflies) {
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
        if (d < 10) { const p = freeSpot(); b.tx = p.x; b.ty = p.y; }
        else { b.x += dx / d * 0.9 + Math.sin(s.t * 0.15 + b.phase) * 0.6; b.y += dy / d * 0.9 + Math.cos(s.t * 0.11 + b.phase) * 0.6; }
        // Fogem de quem chega perto
        const near = fighters.find(f => alive(f) && Math.hypot(f.x - b.x, f.y - 30 - b.y) < 50);
        if (near) { b.x += (b.x - near.x) * 0.06; b.y += (b.y - near.y + 30) * 0.06; }
    }
    const fountain = obstacles.find(o => o.kind === 'fountain');
    if (fountain) {
        for (let i = 0; i < 2; i++) s.fountainDrops.push({ x: fountain.x, y: fountain.y - 34, z: 0, vx: rand(-1.1, 1.1), vy: rand(-0.5, 0.5), vz: rand(2.5, 3.6) });
        s.fountainDrops.forEach(d => { d.x += d.vx; d.y += d.vy; d.vz -= 0.15; d.z += d.vz; });
        s.fountainDrops = s.fountainDrops.filter(d => d.z > -20);
    }
}

// Obstáculo quebrável leva dano (caixas e tanques de vidro do laboratório)
function damageBox(box, damage) {
    if (box.hp === undefined) return;
    box.hp -= damage;
    sfx.play(box.kind === 'labtank' ? 'glass' : 'hit');
    if (box.hp > 0) return;
    obstacles = obstacles.filter(o => o !== box);
    const c = obstacleCenter(box);
    if (box.kind === 'labtank') {
        // Vidro estoura e solta gás verde que deixa lento por 6 s
        mapState.gas.push({ x: c.x, y: c.y, r: 85, life: 360, maxLife: 360 });
        for (let i = 0; i < 26; i++) particles.push(new Particle(c.x, c.y - 20, i % 3 ? '#bff7ff' : '#7cff6b', 0, { x: rand(-4, 4), y: rand(-5, 1) }));
        return;
    }
    for (let i = 0; i < 18; i++) particles.push(new Particle(c.x, c.y, i % 2 ? '#b07a45' : '#8a5a2e', 0));
}
