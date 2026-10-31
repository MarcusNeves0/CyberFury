// Controle no celular: analógico virtual, botões de soco/ultimate/defesa, vibração e tela cheia.
// Conversa com o jogo por mensagens curtas; quem leva as mensagens é o "link" (a conexão de verdade, PeerJS, entra na fase 3).
//
// Do celular para o jogo:
//   { t: 'hello', room }                 pede uma vaga na sala
//   { t: 'move', x, y }                  analógico (-1 a 1; 0, 0 = parado)
//   { t: 'down', a } / { t: 'up', a }    botão apertado / solto; a = 'punch' | 'special' | 'defend'
// Do jogo para o celular:
//   { t: 'welcome', player, team }       vaga (p1 a p6) e time (0 ciano, 1 rosa)
//   { t: 'fighter', name }               lutador escolhido
//   { t: 'energy', v, ready }            barra da ultimate (0 a 1) e se dá para usar agora
//   { t: 'hit' }                         levou dano (vibra)
//   { t: 'screen', s, mine, turn }       tela aberta: 'menu' | 'select' | 'loading' | 'fight' | 'over'
//                                        (na seleção: mine = é a vez deste celular, turn = número do jogador da vez)
//   { t: 'bye', reason }                 saiu da sala
// Nos menus o analógico move a seleção, SOCO/ULT confirmam e DEFESA volta.

const TEAM_COLORS = ['#00ffff', '#ff4dff'];
const STICK_RADIUS = 55;     // quanto o dedo anda para o analógico ir até o fim
const STICK_DEADZONE = 0.15; // perto do centro conta como parado
const MOVE_INTERVAL = 33;    // manda o analógico no máximo ~30 vezes por segundo
const ROOM_KEY = 'cf-controle-sala';
const testMode = location.hash === '#teste';

const $ = id => document.getElementById(id);
const joinScreen = $('join-screen');
const padScreen = $('pad-screen');
const roomInput = $('room-input');

// --- Conexão com o jogo (PeerJS: o servidor gratuito só apresenta o celular ao jogo; depois é direto) ---
const PEER_PREFIX = 'cyberfury-sala-'; // o mesmo do phone.js
const RETRY_MS = 2500;
const link = {
    room: null,
    peer: null,
    conn: null,
    retryTimer: null,
    send(msg) {
        if (testMode) { testGame.receive(msg); return; }
        if (this.conn && this.conn.open) this.conn.send(msg);
    },
    open(room) {
        this.room = room;
        setStatus('connecting');
        $('pad-fighter').innerText = `Conectando na sala ${room}...`;
        if (testMode) { testGame.start(); return; }
        if (typeof Peer === 'undefined') { $('pad-fighter').innerText = 'Sem internet para conectar'; setStatus('offline'); return; }
        this.peer = new Peer();
        this.peer.on('open', () => this.dial());
        this.peer.on('disconnected', () => { if (!this.peer.destroyed) this.peer.reconnect(); });
        this.peer.on('error', err => {
            // Sala ainda não aberta (jogo fechado ou código errado): continua tentando
            if (err.type === 'peer-unavailable') $('pad-fighter').innerText = `Sala ${this.room} não encontrada. Tentando de novo...`;
            else $('pad-fighter').innerText = 'Problema na conexão. Tentando de novo...';
            setStatus('offline');
            this.retry();
        });
    },
    dial() {
        if (!this.peer || this.peer.destroyed) return;
        if (this.conn) this.conn.close();
        const conn = this.peer.connect(PEER_PREFIX + this.room, { serialization: 'json', reliable: true });
        this.conn = conn;
        conn.on('open', () => {
            this.lastPong = Date.now();
            conn.send({ t: 'hello', room: this.room });
        });
        conn.on('data', msg => {
            this.lastPong = Date.now(); // qualquer mensagem do jogo prova que ele continua lá
            if (msg.t !== 'pong') receive(msg);
        });
        conn.on('close', () => {
            if (this.conn !== conn) return;
            playerId = null;
            setStatus('offline');
            if ($('pad-fighter').innerText.indexOf('Sala cheia') < 0) $('pad-fighter').innerText = 'Conexão caiu. Reconectando...';
            this.retry();
        });
    },
    retry() {
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => this.dial(), RETRY_MS);
    },
    // Sinal de vida: ping a cada 1 s; o jogo responde. 5 s sem resposta = caiu (o PC fechou o jogo ou perdeu a rede)
    heartbeat() {
        if (!this.conn || !this.conn.open || !playerId) return;
        this.conn.send({ t: 'ping' });
        if (Date.now() - this.lastPong > 5000) {
            const conn = this.conn;
            this.conn = null;
            conn.close();
            playerId = null;
            setStatus('offline');
            $('pad-fighter').innerText = 'O jogo não responde. Reconectando...';
            this.retry();
        }
    },
    close() {
        if (testMode) { testGame.stop(); return; }
        clearTimeout(this.retryTimer);
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        this.conn = this.peer = null;
    },
};

setInterval(() => link.heartbeat(), 1000);

// Mensagens que chegam do jogo
let playerId = null;
function receive(msg) {
    switch (msg.t) {
        case 'welcome': {
            playerId = msg.player;
            const color = TEAM_COLORS[msg.team] || TEAM_COLORS[0];
            document.documentElement.style.setProperty('--team-color', color);
            $('pad-player').innerText = msg.player.toUpperCase();
            $('pad-fighter').innerText = 'Escolha o lutador na tela do jogo';
            setStatus('online');
            vibrate([30, 40, 30]);
            break;
        }
        case 'fighter':
            fighterName = msg.name.toUpperCase();
            if (screenName === 'fight' || screenName === 'loading') $('pad-fighter').innerText = fighterName;
            break;
        case 'screen':
            showScreenLabels(msg);
            break;
        case 'energy':
            $('pad-ult-fill').style.width = `${Math.round(Math.min(1, msg.v) * 100)}%`;
            $('pad-ult-fill').classList.toggle('ready', !!msg.ready);
            document.querySelector('.action-button.ult').classList.toggle('ready', !!msg.ready);
            break;
        case 'hit': {
            vibrate(40);
            const flash = $('hit-flash');
            flash.classList.add('on');
            setTimeout(() => flash.classList.remove('on'), 120);
            break;
        }
        case 'bye':
            // O jogo mandou sair (sala cheia, trocado por outro controle): não fica tentando de novo
            setStatus('offline');
            playerId = null;
            $('pad-fighter').innerText = msg.reason || 'Desconectado';
            link.close();
            break;
    }
}

// Rótulos dos botões e aviso de cima conforme a tela do jogo (nos menus o controle vira um "mouse")
let screenName = 'menu';
let fighterName = '';
const BUTTON_LABELS = {
    fight: { punch: ['SOCO', 'segure = forte'], defend: ['DEFESA', 'segure'], special: ['ULT', ''] },
    menu: { punch: ['OK', 'confirma'], defend: ['VOLTAR', ''], special: ['OK', ''] },
};
function showScreenLabels(screen) {
    const wasMine = screenName === 'select' && document.body.dataset.myTurn === '1';
    screenName = screen.s;
    const labels = screen.s === 'fight' || screen.s === 'loading' ? BUTTON_LABELS.fight : BUTTON_LABELS.menu;
    for (const button of buttons) {
        const [title, hint] = labels[button.dataset.action];
        button.querySelector('span').innerText = title;
        const small = button.querySelector('small');
        if (small) small.innerText = hint;
    }
    document.querySelector('.stick-hint').innerText = labels === BUTTON_LABELS.fight ? 'arraste para andar' : 'arraste para escolher';
    document.body.dataset.myTurn = screen.mine ? '1' : '0';
    const text = {
        menu: 'No menu: arraste para escolher, OK confirma',
        select: screen.mine ? 'SUA VEZ: escolha o lutador!' : `Vez do Jogador ${screen.turn} escolher`,
        loading: fighterName || 'Carregando a luta...',
        fight: fighterName || 'Lutando!',
        over: 'Fim da luta: OK para jogar de novo',
    }[screen.s];
    if (text) $('pad-fighter').innerText = text;
    if (screen.s === 'select' && screen.mine && !wasMine) vibrate([60, 60, 60]); // chegou a sua vez
}

function setStatus(status) {
    const dot = $('pad-status');
    dot.classList.toggle('online', status === 'online');
    dot.classList.toggle('offline', status === 'offline');
}

function vibrate(pattern) {
    // iPhone não vibra pelo navegador; nos outros, só depois do primeiro toque na tela (antes o navegador bloqueia)
    const touched = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && touched) navigator.vibrate(pattern);
}

// --- Entrar na sala ---
function cleanRoom(text) {
    return (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function join(room, fromClick) {
    room = cleanRoom(room);
    if (room.length < 2) {
        $('join-error').innerText = 'Digite o código que aparece na tela do jogo';
        return;
    }
    $('join-error').innerText = '';
    if (!testMode) {
        try { localStorage.setItem(ROOM_KEY, room); } catch (e) { /* modo anônimo: só não lembra */ }
    }
    joinScreen.classList.add('hidden');
    padScreen.classList.remove('hidden');
    document.body.classList.add('playing');
    if (fromClick) goFullscreen(); // tela cheia só pode ser pedida num toque
    link.open(room); // ao conectar, o celular se apresenta ({ t: 'hello' })
}

function leave() {
    releaseAll();
    link.close();
    playerId = null;
    try { localStorage.removeItem(ROOM_KEY); } catch (e) { /* tanto faz */ }
    document.body.classList.remove('playing');
    padScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

$('join-button').addEventListener('click', () => join(roomInput.value, true));
roomInput.addEventListener('keydown', e => { if (e.key === 'Enter') join(roomInput.value, true); });
roomInput.addEventListener('input', () => { roomInput.value = cleanRoom(roomInput.value); });
$('pad-exit').addEventListener('click', leave);

// Tela cheia, deitado e com a tela sempre acesa (cada navegador deixa um pouco; o que falhar é ignorado)
let wakeLock = null;
async function goFullscreen() {
    try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { /* iPhone não tem */ }
    try { await screen.orientation.lock('landscape'); } catch (e) { /* só funciona em tela cheia, e não em todo celular */ }
    keepScreenOn();
}
async function keepScreenOn() {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
}
// Entrou sozinho (sala lembrada): pede tela cheia no primeiro toque
padScreen.addEventListener('pointerdown', () => { if (!document.fullscreenElement) goFullscreen(); }, { once: true });

// Saiu do navegador ou bloqueou o celular: solta tudo para o lutador não ficar andando sozinho
document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll();
    else if (document.body.classList.contains('playing') && !wakeLock) keepScreenOn();
});

// --- Analógico ---
const stickZone = $('stick-zone');
const stickBase = $('stick-base');
const stickKnob = $('stick-knob');
let stickPointer = null;
let stickOrigin = null;
let lastMove = { x: 0, y: 0 };
let lastMoveAt = 0;
let moveTimer = null;

stickZone.addEventListener('pointerdown', e => {
    if (stickPointer !== null) return;
    stickPointer = e.pointerId;
    stickZone.setPointerCapture(e.pointerId);
    const box = stickZone.getBoundingClientRect();
    // A base aparece onde o dedo encostou (sem deixar ela sair da área)
    stickOrigin = {
        x: Math.max(box.left + 65, Math.min(box.right - 65, e.clientX)),
        y: Math.max(box.top + 65, Math.min(box.bottom - 65, e.clientY)),
    };
    stickBase.style.left = `${stickOrigin.x - box.left}px`;
    stickBase.style.top = `${stickOrigin.y - box.top}px`;
    stickBase.classList.remove('hidden');
    updateStick(e);
});
stickZone.addEventListener('pointermove', e => { if (e.pointerId === stickPointer) updateStick(e); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stickZone.addEventListener(type, e => { if (e.pointerId === stickPointer) releaseStick(); });
}

function updateStick(e) {
    let dx = e.clientX - stickOrigin.x, dy = e.clientY - stickOrigin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_RADIUS) { dx = dx / dist * STICK_RADIUS; dy = dy / dist * STICK_RADIUS; }
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    let x = dx / STICK_RADIUS, y = dy / STICK_RADIUS;
    if (Math.hypot(x, y) < STICK_DEADZONE) x = y = 0;
    sendMove(x, y);
}

function releaseStick() {
    stickPointer = null;
    stickBase.classList.add('hidden');
    stickKnob.style.transform = '';
    sendMove(0, 0, true);
}

// Manda o analógico sem inundar a conexão: no máximo a cada MOVE_INTERVAL, sempre com o valor mais novo
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

// --- Botões (cada um com o seu dedo: dá para andar, segurar defesa e socar ao mesmo tempo) ---
const buttons = [...document.querySelectorAll('.action-button')];
for (const button of buttons) {
    const action = button.dataset.action;
    button.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (button.dataset.pointer) return;
        button.dataset.pointer = e.pointerId;
        button.setPointerCapture(e.pointerId);
        button.classList.add('pressed');
        vibrate(12);
        link.send({ t: 'down', a: action });
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(type, e => { if (String(e.pointerId) === button.dataset.pointer) releaseButton(button); });
    }
    button.addEventListener('contextmenu', e => e.preventDefault()); // segurar não abre menu
}

function releaseButton(button) {
    if (!button.dataset.pointer) return;
    delete button.dataset.pointer;
    button.classList.remove('pressed');
    link.send({ t: 'up', a: button.dataset.action });
}

function releaseAll() {
    buttons.forEach(releaseButton);
    if (stickPointer !== null) releaseStick();
}

// --- Modo de teste (controle.html#teste): finge ser o jogo para dar para sentir o controle sem conexão ---
const testGame = {
    timers: [],
    energy: 0,
    start() {
        $('test-log').classList.remove('hidden');
        this.energy = 0.3;
        logTest(`→ ${JSON.stringify({ t: 'hello', room: 'TESTE' })}`);
        this.timers.push(setTimeout(() => {
            receive({ t: 'welcome', player: 'p1', team: 0 });
            receive({ t: 'fighter', name: 'Modo de teste' });
        }, 400));
        // A barra enche sozinha em ~4 s; de vez em quando "leva dano"
        this.timers.push(setInterval(() => {
            this.energy = Math.min(1, this.energy + 0.025);
            receive({ t: 'energy', v: this.energy, ready: this.energy >= 1 });
        }, 100));
        this.timers.push(setInterval(() => receive({ t: 'hit' }), 5000));
    },
    stop() {
        this.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        this.timers = [];
        $('test-log').classList.add('hidden');
    },
    receive(msg) {
        logTest(`→ ${JSON.stringify(msg)}`);
        if (msg.t === 'down' && msg.a === 'special' && this.energy >= 1) this.energy = 0; // usou a ultimate
    },
};

const testLines = [];
function logTest(line) {
    testLines.push(line);
    if (testLines.length > 8) testLines.shift();
    $('test-log').textContent = testLines.join('\n');
}

// --- Começo: sala no endereço (?sala=7K2F), lembrada da última vez ou digitada ---
const params = new URLSearchParams(location.search);
let savedRoom = null;
try { savedRoom = localStorage.getItem(ROOM_KEY); } catch (e) { /* sem localStorage */ }
const startRoom = cleanRoom(params.get('sala') || savedRoom || '');
roomInput.value = startRoom;
if (testMode) join('TESTE', false);
else if (startRoom) join(startRoom, false);
