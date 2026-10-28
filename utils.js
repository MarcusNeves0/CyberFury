// Tela e geometria
// Redimensionamento do canvas e funções de distância, direção e mira.

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
        if (isHiddenFrom(enemy, fighter)) continue; // escondido no arbusto
        const d = distance(fighter, enemy);
        if (d < bestDistance) { best = enemy; bestDistance = d; }
    }
    return best;
}

// Onde o lutador vai estar daqui a alguns passos, se continuar andando igual
function predictPosition(fighter, steps) {
    return {
        x: Math.max(arena.left, Math.min(arena.right, fighter.x + (fighter.moveX + fighter.kbx) * steps)),
        y: Math.max(arena.top, Math.min(arena.bottom, fighter.y + (fighter.moveY + fighter.kby) * steps)),
    };
}

// Mira com previsão: aponta para onde o alvo vai estar quando o projétil chegar (com um pequeno erro)
function leadAim(shooter, speed) {
    const target = shooter.target;
    if (!alive(target)) return { ...shooter.aim };
    let point = { x: target.x, y: target.y };
    for (let i = 0; i < 2; i++) point = predictPosition(target, distance(shooter, point) / speed);
    const dir = directionTo(shooter, point);
    const angle = Math.atan2(dir.y, dir.x) + (Math.random() - 0.5) * 2 * AIM_ERROR;
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

// Ponto mais próximo de um retângulo (para colisões com caixas)
function closestPointOnRect(px, py, rect) {
    return {
        x: Math.max(rect.x, Math.min(px, rect.x + rect.w)),
        y: Math.max(rect.y, Math.min(py, rect.y + rect.h)),
    };
}

function circleHitsObstacle(x, y, radius, obstacle) {
    if (isRound(obstacle)) return Math.hypot(x - obstacle.x, y - obstacle.y) < radius + obstacle.r;
    const p = closestPointOnRect(x, y, obstacle);
    return Math.hypot(x - p.x, y - p.y) < radius;
}
