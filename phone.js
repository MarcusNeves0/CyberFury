// Celulares como controle (lado do jogo)
// O jogo abre uma sala no PeerJS com um código curto. O celular abre controle.html, digita o código
// e manda os comandos direto para este navegador (o servidor do PeerJS só apresenta um ao outro).
// As mensagens estão descritas no começo do controle.js.

const PHONE_ROOM_KEY = 'cf-sala';                          // o código fica salvo: o celular reconecta sozinho na próxima vez
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, que confundem
const PEER_PREFIX = 'cyberfury-sala-';
let roomCode = null;
let roomStatus = 'off';        // off (sem PeerJS), connecting, ready, error
let hostPeer = null;
const phones = new Map();      // id da conexão -> { conn, player }

function newRoomCode() {
    return Array.from({ length: 4 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('');
}

// Abre a sala (no carregamento da página). Sem internet ou sem PeerJS, o jogo segue só com teclado e controle.
function setupPhones() {
    if (typeof Peer === 'undefined') { renderPhoneRoom(); return; }
    try { roomCode = localStorage.getItem(PHONE_ROOM_KEY); } catch (e) { /* sem localStorage */ }
    if (!roomCode) roomCode = newRoomCode();
    openRoom();
}

function openRoom() {
    roomStatus = 'connecting';
    renderPhoneRoom();
    hostPeer = new Peer(PEER_PREFIX + roomCode);
    hostPeer.on('open', () => {
        roomStatus = 'ready';
        try { localStorage.setItem(PHONE_ROOM_KEY, roomCode); } catch (e) { /* só não lembra */ }
        renderPhoneRoom();
        if (gameState === 'MENU') renderInputStatus(); // "digite o código" nas linhas de quem espera celular
    });
    hostPeer.on('connection', conn => {
        conn.on('data', msg => onPhoneMessage(conn, msg));
        conn.on('close', () => onPhoneGone(conn));
        conn.on('error', () => onPhoneGone(conn));
    });
    hostPeer.on('disconnected', () => { if (!hostPeer.destroyed) hostPeer.reconnect(); });
    hostPeer.on('error', err => {
        if (err.type === 'unavailable-id') {
            // O código já está aberto em outra aba ou outro PC: sorteia outro
            hostPeer.destroy();
            roomCode = newRoomCode();
            openRoom();
        } else if (err.type !== 'peer-unavailable') {
            roomStatus = 'error';
            renderPhoneRoom();
        }
    });
}

// Troca o código da sala (quem estava conectado cai e precisa digitar o novo)
function changeRoomCode() {
    if (typeof Peer === 'undefined') return;
    for (const { conn } of phones.values()) conn.close();
    if (hostPeer) hostPeer.destroy();
    roomCode = newRoomCode();
    openRoom();
}

// Endereço da página do controle (o mesmo site do jogo, trocando o arquivo)
const controllerUrl = () => new URL('controle.html', location.href).href.replace(/^https?:\/\//, '');

function renderPhoneRoom() {
    const box = document.getElementById('phone-room');
    if (!box) return;
    const text = {
        off: 'Celular como controle indisponível (sem internet)',
        connecting: 'Abrindo a sala para celulares...',
        error: 'Não deu para abrir a sala para celulares (verifique a internet)',
    }[roomStatus];
    box.innerHTML = text
        ? `<span>📱 ${text}</span>`
        : `<span>📱 No celular, abra <strong>${controllerUrl()}</strong> e digite</span>
           <span class="phone-room-code">${roomCode}</span>
           <button id="phone-room-new" class="phone-room-new" title="Sortear outro código">↻ novo código</button>`;
    const again = document.getElementById('phone-room-new');
    if (again) again.addEventListener('click', changeRoomCode);
}

// --- Mensagens dos celulares ---
const PHONE_TIMEOUT = 5000; // sem notícia do celular por 5 s (aba fechada, sem sinal): considera que saiu

function onPhoneMessage(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') { seatPhone(conn); return; }
    const seat = phones.get(conn.peer);
    if (seat) seat.lastSeen = Date.now();
    if (msg.t === 'ping') { if (seat) conn.send({ t: 'pong' }); return; }
    if (!seat) return;
    if (gameState !== 'FIGHT') { phoneMenuInput(seat, msg); return; }
    const f = fighters.find(f => f.controller === seat.player && alive(f));
    if (!f) return;
    const actions = ['punch', 'special', 'defend'];
    if (msg.t === 'move') {
        const x = Number(msg.x) || 0, y = Number(msg.y) || 0;
        const length = Math.hypot(x, y);
        f.padMove = length > 1 ? { x: x / length, y: y / length } : { x, y };
    } else if (msg.t === 'down' && actions.includes(msg.a)) {
        handleKeyDown(f, msg.a);
    } else if (msg.t === 'up' && actions.includes(msg.a)) {
        handleKeyUp(f, msg.a);
    }
}

// --- Menus pelo celular: analógico move a seleção, SOCO (ou ULT) confirma, DEFESA volta ---
// Na escolha de lutador, só o celular de quem está na vez mexe; no resto dos menus, qualquer um.
const PHONE_MENU_THRESHOLD = 0.5;
function phoneMenuInput(seat, msg) {
    if (!loadingScreen.classList.contains('hidden')) return;
    if (gameState === 'SELECT' && activePlayers()[match.picks.length] !== seat.player) return;
    // Primeiro toque numa tela nova: só acende o primeiro item
    const items = menuFocusables();
    if (!items.includes(padFocus)) {
        setPadFocus(items.find(el => !el.classList.contains('back-button')) || items[0]);
        if (msg.t !== 'move') return;
    }
    if (msg.t === 'move') {
        const x = Number(msg.x) || 0, y = Number(msg.y) || 0;
        let dx = 0, dy = 0;
        if (Math.abs(x) >= Math.abs(y) && Math.abs(x) > PHONE_MENU_THRESHOLD) dx = Math.sign(x);
        else if (Math.abs(y) > PHONE_MENU_THRESHOLD) dy = Math.sign(y);
        const direction = dx || dy ? `${dx},${dy}` : '';
        if (direction && direction !== seat.menuDirection) {
            moveFocus(dx, dy);
            seat.menuRepeatAt = Date.now() + 350; // segurando, repete depois de um tempinho
        }
        seat.menuDirection = direction;
        seat.menuMove = { dx, dy };
    } else if (msg.t === 'down' && (msg.a === 'punch' || msg.a === 'special')) {
        if (padFocus && menuFocusables().includes(padFocus)) padFocus.click();
    } else if (msg.t === 'down' && msg.a === 'defend') {
        if (!selectionScreen.classList.contains('hidden') || !gameOverScreen.classList.contains('hidden')) goToMenu();
    }
}

// Analógico segurado num menu: continua andando pela lista
setInterval(() => {
    if (gameState === 'FIGHT') return;
    for (const seat of phones.values()) {
        if (!seat.menuDirection || Date.now() < seat.menuRepeatAt) continue;
        if (gameState === 'SELECT' && activePlayers()[match.picks.length] !== seat.player) continue;
        moveFocus(seat.menuMove.dx, seat.menuMove.dy);
        seat.menuRepeatAt = Date.now() + 150;
    }
}, 30);

// Qual tela está aberta, para o celular trocar os rótulos dos botões e avisar de quem é a vez
function phoneScreenFor(seat) {
    if (!loadingScreen.classList.contains('hidden')) return { s: 'loading' };
    if (gameState === 'FIGHT') return { s: 'fight' };
    if (gameState === 'SELECT') {
        const turn = match.picks.length;
        return { s: 'select', mine: activePlayers()[turn] === seat.player, turn: turn + 1 };
    }
    if (!gameOverScreen.classList.contains('hidden')) return { s: 'over' };
    return { s: 'menu' };
}

setInterval(() => {
    for (const seat of phones.values()) {
        const screen = phoneScreenFor(seat);
        const key = JSON.stringify(screen);
        if (key === seat.screenKey || !seat.conn.open) continue;
        seat.screenKey = key;
        seat.conn.send({ t: 'screen', ...screen });
    }
}, 200);

// Celular chegou: fica com a vaga de quem está esperando celular; se ninguém estiver, entra como jogador novo
function seatPhone(conn) {
    if (phones.has(conn.peer)) { greetPhone(conn.peer); return; }
    const waiting = activePlayers().find(p => match.inputs[p].type === 'phone' && match.inputs[p].index === null);
    let player = waiting;
    if (!player && gameState === 'MENU' && match.humans < maxHumans()) {
        player = PLAYER_IDS[match.humans];
        match.humans++;
        Object.assign(match.inputs[player], { type: 'phone' });
    }
    if (!player) {
        conn.send({ t: 'bye', reason: gameState === 'MENU' ? 'Sala cheia' : 'Partida em andamento: espere voltar ao menu' });
        setTimeout(() => conn.close(), 500);
        return;
    }
    Object.assign(match.inputs[player], { index: conn.peer, name: 'Celular' });
    phones.set(conn.peer, { conn, player, lastSeen: Date.now() });
    greetPhone(conn.peer);
    sfx.play('heal');
    renderInputStatus();
}

// Conta para o celular quem ele é (vaga, time e, numa luta, o lutador)
function greetPhone(id) {
    const seat = phones.get(id);
    if (!seat) return;
    seat.conn.send({ t: 'welcome', player: seat.player, team: teamOf(seat.player) });
    const f = fighters.find(f => f.controller === seat.player);
    if (f && gameState === 'FIGHT') seat.conn.send({ t: 'fighter', name: f.name });
    seat.team = teamOf(seat.player);
    seat.screenKey = null; // manda a tela atual de novo
    seat.menuDirection = '';
    seat.menuMove = { dx: 0, dy: 0 };
}

// A conexão direta pode demorar para avisar que caiu; o sinal de vida (ping a cada 1 s) resolve antes
setInterval(() => {
    for (const seat of [...phones.values()]) {
        if (Date.now() - seat.lastSeen > PHONE_TIMEOUT) {
            onPhoneGone(seat.conn);
            seat.conn.close();
        }
    }
}, 1000);

function onPhoneGone(conn) {
    const seat = phones.get(conn.peer);
    if (!seat || seat.conn !== conn) return;
    phones.delete(conn.peer);
    const input = match.inputs[seat.player];
    if (input.index === conn.peer) { input.index = null; input.name = ''; }
    // Solta tudo o que o celular estava apertando
    const f = fighters.find(f => f.controller === seat.player);
    if (f) {
        f.padMove = { x: 0, y: 0 };
        for (const a of ['punch', 'special', 'defend']) handleKeyUp(f, a);
    }
    if (gameState === 'MENU') renderInputStatus();
}

// O jogador trocou o celular por teclado/controle no menu: avisa e desconecta
function dropPhone(id) {
    const seat = phones.get(id);
    if (!seat) return;
    seat.conn.send({ t: 'bye', reason: 'Trocado por outro controle no jogo' });
    phones.delete(id);
    setTimeout(() => seat.conn.close(), 300);
}

// --- Avisos do jogo para os celulares ---
function sendToPhone(player, msg) {
    for (const seat of phones.values()) {
        if (seat.player === player && seat.conn.open) seat.conn.send(msg);
    }
}

// Time mudou no menu: avisa (a cor do controle acompanha)
function syncPhoneTeams() {
    for (const [id, seat] of phones) {
        if (seat.team !== teamOf(seat.player)) greetPhone(id);
    }
}

// Começo da luta: cada celular fica sabendo qual lutador está controlando
function announceFightersToPhones() {
    for (const f of fighters) {
        if (f.isPlayer) sendToPhone(f.controller, { t: 'fighter', name: f.name });
    }
}

// A cada poucos passos: barra da ultimate de quem joga no celular (só manda quando muda)
let phoneSyncTick = 0;
function updatePhones() {
    if (!phones.size || ++phoneSyncTick % 6 !== 0) return;
    for (const f of fighters) {
        if (!f.isPlayer || match.inputs[f.controller].type !== 'phone') continue;
        const v = Math.round(Math.min(1, f.energy / f.maxEnergy) * 50) / 50;
        const ready = !f.isDead && ultReady(f);
        if (f.phoneEnergy === v && f.phoneReady === ready) continue;
        f.phoneEnergy = v;
        f.phoneReady = ready;
        sendToPhone(f.controller, { t: 'energy', v, ready });
    }
}
