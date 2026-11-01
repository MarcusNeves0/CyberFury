// Tela remota: a pessoa joga de outra casa. Ela vê a partida em vídeo (transmitida pelo PC de quem abriu o jogo)
// e joga com o teclado ou com um controle ligado no computador dela. Os comandos vão pela mesma sala dos
// celulares (sala.js), com as mesmas mensagens do controle no celular (veja o começo do controle.js).

const TEAM_COLORS = ['#00ffff', '#ff4dff'];
const ROOM_KEY = 'cf-tela-sala';
const STICK_DEADZONE = 0.25;
const MOVE_INTERVAL = 33; // manda o movimento no máximo ~30 vezes por segundo

// Teclas (mesmo esquema de quem joga sozinho no teclado do jogo) e botões do controle (mesmo mapa do jogo)
const KEYS = {
    up: ['w', 'arrowup'], down: ['s', 'arrowdown'], left: ['a', 'arrowleft'], right: ['d', 'arrowright'],
    punch: ['j', 'enter'], special: ['k'], defend: ['l', 'escape'],
};
const PAD_BUTTONS = { punch: [2], special: [3, 5], defend: [1, 4] };
const PAD_CONFIRM = 0; // ✕: confirma nos menus
const PAD_DPAD = { up: 12, down: 13, left: 14, right: 15 };

const $ = id => document.getElementById(id);
const video = $('remote-video');
const roomInput = $('room-input');
let screenName = 'menu';

// --- Conexão ---
const link = createRoomLink({
    kind: 'screen',
    onMessage: msg => receive(msg),
    onStatus: (status, text) => {
        const el = $('view-status');
        el.className = `view-status ${status === 'online' ? 'online' : status === 'offline' ? 'offline' : ''}`;
        if (text) el.innerText = text;
        if (status !== 'online' && !video.srcObject) $('waiting-text').innerText = text || 'Conectando...';
        showBar();
    },
    onStream: (stream, call) => {
        video.srcObject = stream;
        watchQuality(call);
        $('waiting').classList.add('hidden');
        // Som: o navegador às vezes só deixa tocar depois de um clique na página
        video.muted = false;
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
            $('sound-button').classList.remove('hidden');
        });
        stream.getVideoTracks().forEach(track => track.addEventListener('ended', streamStopped));
    },
});

// Qualidade que está chegando (resolução, quadros por segundo e taxa), para saber se o problema é a internet
let qualityTimer = null;
function watchQuality(call) {
    clearInterval(qualityTimer);
    let lastBytes = 0, lastTime = 0;
    qualityTimer = setInterval(async () => {
        const pc = call.peerConnection;
        if (!pc || pc.connectionState === 'closed') { clearInterval(qualityTimer); $('view-quality').innerText = ''; return; }
        const stats = await pc.getStats();
        let video = null, codec = '';
        stats.forEach(s => { if (s.type === 'inbound-rtp' && s.kind === 'video') video = s; });
        if (!video) return;
        const c = video.codecId && stats.get(video.codecId);
        if (c) codec = c.mimeType.replace('video/', '');
        const mbps = lastTime ? ((video.bytesReceived - lastBytes) * 8 / ((video.timestamp - lastTime) / 1000)) / 1e6 : 0;
        lastBytes = video.bytesReceived; lastTime = video.timestamp;
        const el = $('view-quality');
        el.innerText = `${video.frameHeight || '?'}p · ${Math.round(video.framesPerSecond || 0)} fps · ${mbps.toFixed(1)} Mbps · ${codec}`;
        el.classList.toggle('weak', (video.frameHeight || 0) < 600 || (video.framesPerSecond || 0) < 20);
    }, 1000);
}

function streamStopped() {
    video.srcObject = null;
    $('waiting').classList.remove('hidden');
    $('waiting-text').innerText = 'A transmissão parou. Esperando voltar...';
}

function receive(msg) {
    switch (msg.t) {
        case 'welcome':
            document.documentElement.style.setProperty('--team-color', TEAM_COLORS[msg.team] || TEAM_COLORS[0]);
            $('view-player').innerText = msg.player.toUpperCase();
            $('view-status').innerText = 'Conectado';
            $('view-status').className = 'view-status online';
            if (!video.srcObject) $('waiting-text').innerText = `Você é o ${msg.player.toUpperCase()}. Esperando a transmissão...`;
            showBar();
            break;
        case 'screen':
            screenName = msg.s;
            if (msg.s === 'select') {
                $('view-status').innerText = msg.mine ? 'SUA VEZ de escolher o lutador!' : `Vez do Jogador ${msg.turn} escolher`;
                showBar();
            } else {
                $('view-status').innerText = 'Conectado';
            }
            break;
        case 'hit': {
            const flash = $('hit-flash');
            flash.classList.add('on');
            setTimeout(() => flash.classList.remove('on'), 120);
            break;
        }
        case 'bye':
            video.srcObject = null;
            $('waiting').classList.remove('hidden');
            $('waiting-text').innerText = msg.reason || 'Desconectado';
            break;
    }
}

$('sound-button').addEventListener('click', () => {
    video.muted = false;
    video.play().catch(() => {});
    $('sound-button').classList.add('hidden');
});

// --- Entrar e sair ---
function cleanRoom(text) {
    return (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function join(room) {
    room = cleanRoom(room);
    if (room.length < 2) return;
    try { localStorage.setItem(ROOM_KEY, room); } catch (e) { /* só não lembra */ }
    roomInput.blur(); // alguns navegadores (Firefox, Safari) deixam o campo escondido com o foco e as teclas não iam para o jogo
    $('join-screen').classList.add('hidden');
    $('view-screen').classList.remove('hidden');
    link.open(room);
}

function leave() {
    releaseAll();
    link.close();
    video.srcObject = null;
    $('view-screen').classList.add('hidden');
    $('join-screen').classList.remove('hidden');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

$('join-button').addEventListener('click', () => join(roomInput.value));
roomInput.addEventListener('keydown', e => { if (e.key === 'Enter') join(roomInput.value); });
roomInput.addEventListener('input', () => { roomInput.value = cleanRoom(roomInput.value); });
$('leave-button').addEventListener('click', leave);
$('fullscreen-button').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else $('view-screen').requestFullscreen().catch(() => {});
});

// Barra de cima: aparece ao mexer o mouse ou quando algo muda, some depois de 4 s
let barTimer = null;
function showBar() {
    $('view-bar').classList.remove('faded');
    clearTimeout(barTimer);
    barTimer = setTimeout(() => $('view-bar').classList.add('faded'), 4000);
}
document.addEventListener('mousemove', showBar);

// --- Comandos: teclado e controle somados (dá para usar os dois) ---
const keysDown = new Set();
let padState = { move: { x: 0, y: 0 }, buttons: {} };
const sentDown = {};           // ação -> está apertada do lado do jogo
let lastMove = { x: 0, y: 0 };
let lastMoveAt = 0;
let moveTimer = null;

// Só está digitando o código enquanto a tela de entrar está aberta
const isTyping = () => document.activeElement === roomInput && !$('join-screen').classList.contains('hidden');

window.addEventListener('keydown', e => {
    if (isTyping() || $('view-screen').classList.contains('hidden')) return;
    const key = e.key.toLowerCase();
    if (!Object.values(KEYS).some(list => list.includes(key))) return;
    e.preventDefault(); // setas não rolam a página
    if (!e.repeat) { keysDown.add(key); update(); }
});
window.addEventListener('keyup', e => {
    keysDown.delete(e.key.toLowerCase());
    update();
});
window.addEventListener('blur', releaseAll); // trocou de janela: solta tudo

const held = action => KEYS[action].some(k => keysDown.has(k));

// Junta teclado e controle e manda só o que mudou
function update() {
    // Movimento: analógico do controle se estiver inclinado; senão, as setas/WASD
    let move = padState.move;
    if (Math.hypot(move.x, move.y) < 0.01) {
        const x = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
        const y = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
        const length = Math.hypot(x, y) || 1;
        move = { x: x / length, y: y / length };
    }
    sendMove(move.x, move.y);
    for (const action of ['punch', 'special', 'defend']) {
        const down = held(action) || !!padState.buttons[action];
        if (down === !!sentDown[action]) continue;
        sentDown[action] = down;
        link.send({ t: down ? 'down' : 'up', a: action });
    }
}

function sendMove(x, y, force = false) {
    x = Math.round(x * 100) / 100;
    y = Math.round(y * 100) / 100;
    if (x === lastMove.x && y === lastMove.y) return;
    lastMove = { x, y };
    clearTimeout(moveTimer);
    const wait = MOVE_INTERVAL - (Date.now() - lastMoveAt);
    if (force || wait <= 0) {
        lastMoveAt = Date.now();
        link.send({ t: 'move', x, y });
    } else {
        moveTimer = setTimeout(() => { lastMoveAt = Date.now(); link.send({ t: 'move', ...lastMove }); }, wait);
    }
}

function releaseAll() {
    keysDown.clear();
    padState = { move: { x: 0, y: 0 }, buttons: {} };
    update();
}

// Controle ligado neste computador (PS5, Xbox...): lido ~60 vezes por segundo
let padName = '';
function pollPad() {
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
    if (!gp) {
        if (padName) { padName = ''; $('view-device').innerText = '⌨ Teclado'; releaseAll(); }
        return;
    }
    if (!padName) {
        padName = /dualsense/i.test(gp.id) ? 'DualSense (PS5)' : /xbox|xinput/i.test(gp.id) ? 'Xbox' : 'Controle';
        $('view-device').innerText = `🎮 ${padName} + ⌨ Teclado`;
        showBar();
    }
    const pressed = i => gp.buttons[i] && gp.buttons[i].pressed;
    let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
    const magnitude = Math.hypot(x, y);
    if (magnitude < STICK_DEADZONE) {
        x = (pressed(PAD_DPAD.right) ? 1 : 0) - (pressed(PAD_DPAD.left) ? 1 : 0);
        y = (pressed(PAD_DPAD.down) ? 1 : 0) - (pressed(PAD_DPAD.up) ? 1 : 0);
        const length = Math.hypot(x, y) || 1;
        x /= length; y /= length;
    } else {
        const strength = Math.min(1, (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE));
        x = x / magnitude * strength;
        y = y / magnitude * strength;
    }
    const buttons = {};
    for (const [action, list] of Object.entries(PAD_BUTTONS)) buttons[action] = list.some(pressed);
    if (screenName !== 'fight' && screenName !== 'loading' && pressed(PAD_CONFIRM)) buttons.punch = true; // ✕ confirma nos menus
    padState = { move: { x, y }, buttons };
    update();
}
setInterval(pollPad, 16);

// --- Começo: sala no endereço (?sala=7K2F) ou lembrada da última vez ---
const params = new URLSearchParams(location.search);
let savedRoom = null;
try { savedRoom = localStorage.getItem(ROOM_KEY); } catch (e) { /* sem localStorage */ }
roomInput.value = cleanRoom(params.get('sala') || savedRoom || '');
if (params.get('sala')) join(params.get('sala'));
