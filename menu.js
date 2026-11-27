// Menus
// Tela inicial (Solo, Multiplayer, Boss Battle), submenus, seleção de lutadores, arena e painel de controles.

// --- Telas ---
// Caminho: tela inicial (Solo, Multiplayer ou Boss Battle) -> submenu do caminho -> lutadores -> arena (e chefe) -> luta
const stageScreen = document.getElementById('stage-screen');
function showScreen(screen) {
    for (const s of [hubScreen, selectionScreen, stageScreen, loadingScreen, gameOverScreen]) {
        s.classList.toggle('hidden', s !== screen);
    }
}

// Páginas do HUB: 'home' (os três caminhos) ou 'setup' (o submenu do caminho escolhido)
let hubPage = 'home';
function showHubPage(page) {
    hubPage = page;
    document.getElementById('hub-home').classList.toggle('hidden', page !== 'home');
    document.getElementById('hub-setup').classList.toggle('hidden', page !== 'setup');
    document.querySelector('#hub-screen > h1').classList.toggle('hidden', page !== 'home'); // o nome do jogo só na tela inicial
    if (typeof setPadFocus === 'function') setPadFocus(null); // o controle começa do primeiro item da página nova
}

const CATEGORY_TITLES = { solo: '🥊 SOLO', multi: '🎮 MULTIPLAYER', boss: '👹 BOSS BATTLE' };
const VERSUS_MODES = ['1v1', '2v2', '3v3'];

// Entrou num caminho: arruma o modo e o número de jogadores para valerem nele
function chooseCategory(category) {
    match.category = category;
    match.boss = category === 'boss';
    if (match.boss) {
        match.training = false;
        match.mode = '3v3'; // por dentro o chefão usa a arena grande
    } else {
        if (!VERSUS_MODES.includes(match.mode)) match.mode = '1v1';
        if (category === 'multi') match.training = false;
    }
    match.humans = Math.max(minHumans(), Math.min(match.humans, maxHumans()));
    if (category === 'solo') match.humans = 1;
    document.querySelectorAll('#mode-options .hub-option').forEach(b =>
        b.classList.toggle('selected', b.dataset.mode === (match.training ? 'treino' : match.mode)));
    showHubPage('setup');
    renderInputStatus();
}

function setupHub() {
    const bindGroup = (containerId, attr, apply) => {
        const buttons = document.querySelectorAll(`#${containerId} .hub-option`);
        buttons.forEach(button => button.addEventListener('click', () => {
            buttons.forEach(b => b.classList.toggle('selected', b === button));
            apply(button.dataset[attr]);
        }));
    };
    document.querySelectorAll('.home-option').forEach(button => button.addEventListener('click', () => {
        sfx.play('menu_confirm');
        chooseCategory(button.dataset.category);
    }));
    document.getElementById('hub-back').addEventListener('click', () => showHubPage('home'));
    bindGroup('mode-options', 'mode', value => {
        // Treino: por dentro é um 1v1 (arena de duelo) contra um boneco
        match.training = value === 'treino';
        match.mode = match.training ? '1v1' : value;
        renderInputStatus();
    });
    bindGroup('humans-options', 'humans', value => { match.humans = Number(value); renderInputStatus(); });
    bindGroup('boss-options', 'boss', value => { match.bossId = value; });
    bindGroup('map-options', 'map', value => { match.map = value; });

    // Uma linha por jogador: time, teclado, controle ou celular
    const rows = document.getElementById('input-rows');
    for (const player of PLAYER_IDS) {
        const row = document.createElement('div');
        row.className = 'input-row';
        row.dataset.player = player;
        row.innerHTML = `<span class="input-label">${player.toUpperCase()}</span>
            <button class="team-toggle"></button>
            <button class="input-option" data-input="keyboard">⌨ Teclado</button>
            <button class="input-option" data-input="gamepad">🎮 Controle</button>
            <button class="input-option" data-input="phone" title="Celular como controle (abra controle.html no celular)">📱 Celular</button>
            <span class="gamepad-status"></span>`;
        row.querySelector('.team-toggle').addEventListener('click', (e) => {
            match.inputs[player].team = 1 - match.inputs[player].team;
            e.currentTarget.blur();
            renderInputStatus();
        });
        row.querySelectorAll('.input-option').forEach(button => button.addEventListener('click', () => {
            // Escolher "Controle" sempre pede para apertar um botão de novo; trocar o celular por outra coisa desconecta ele
            const input = match.inputs[player];
            if (input.type === 'phone' && input.index !== null) dropPhone(input.index);
            Object.assign(input, { type: button.dataset.input, index: null, name: '' });
            button.blur();
            renderInputStatus();
        }));
        rows.appendChild(row);
    }
    window.addEventListener('gamepadconnected', renderInputStatus);
    window.addEventListener('gamepaddisconnected', (e) => {
        for (const input of Object.values(match.inputs)) {
            if (input.type === 'gamepad' && input.index === e.gamepad.index) { input.index = null; input.name = ''; }
        }
        renderInputStatus();
    });
    setInterval(detectGamepads, 100);
    renderInputStatus();

    document.getElementById('hub-start').addEventListener('click', () => {
        if (hubProblem()) return;
        Tone.start().catch(() => {}); // libera o som já no clique (os "tics" da seleção precisam dele)
        match.picks = [];
        openSelection();
    });
    document.getElementById('back-to-hub').addEventListener('click', backToSetup);
    document.getElementById('back-to-selection').addEventListener('click', () => { match.picks = []; openSelection(); });
    document.getElementById('stage-start').addEventListener('click', () => {
        sfx.play('menu_confirm');
        startGame();
    });
}

// Volta da escolha de lutadores para o submenu do caminho
function backToSetup() {
    gameState = 'MENU';
    match.picks = [];
    showScreen(hubScreen);
    showHubPage('setup');
    renderInputStatus();
}

// Botão de voltar (◯ no controle, DEFESA no celular): sobe um nível de cada vez
function menuBack() {
    if (!loadingScreen.classList.contains('hidden')) return;
    if (!stageScreen.classList.contains('hidden')) { match.picks = []; openSelection(); return; }
    if (!selectionScreen.classList.contains('hidden')) {
        // Com vários jogadores, desfaz a escolha do anterior; sem ninguém escolhido, volta ao submenu
        if (match.picks.length) { match.picks.pop(); openSelection(); } else backToSetup();
        return;
    }
    if (!gameOverScreen.classList.contains('hidden')) { goToMenu(); return; }
    if (!hubScreen.classList.contains('hidden') && hubPage === 'setup') showHubPage('home');
}

// Jogadores humanos desta partida (P1, P2... até o número escolhido no HUB)
const activePlayers = () => PLAYER_IDS.slice(0, match.humans);
const minHumans = () => (match.category === 'multi' ? 2 : 1);
const maxHumans = () => (match.category === 'solo' || match.training ? 1 : match.boss ? BOSS_MAX_HUMANS : teamSizeOf(match.mode) * 2);
// Celular como controle: só no multiplayer (e no Boss Battle com mais de um jogador)
const phonesInMenu = () => match.category === 'multi' || (match.boss && match.humans > 1);
// Celular novo só entra com o submenu desse caminho aberto (o código da sala só aparece ali)
const phonesCanJoin = () => gameState === 'MENU' && hubPage === 'setup' && phonesInMenu();
// Sozinho, o jogador fica sempre no time ciano; com mais gente, cada um escolhe o time
const teamOf = player => match.humans === 1 || match.boss ? 0 : match.inputs[player].team;
const waitingForGamepad = () => activePlayers().some(p => match.inputs[p].type === 'gamepad' && match.inputs[p].index === null);
const waitingForPhone = () => activePlayers().some(p => match.inputs[p].type === 'phone' && match.inputs[p].index === null);

// O que impede de começar (time com mais humanos que vagas, teclado lotado, controle sem conectar)
function hubProblem() {
    const players = activePlayers();
    for (const team of match.boss ? [] : [0, 1]) {
        if (players.filter(p => teamOf(p) === team).length > teamSizeOf(match.mode)) return `${TEAM_NAMES[team]} LOTADO`;
    }
    if (players.filter(p => match.inputs[p].type === 'keyboard').length > MAX_KEYBOARD_PLAYERS) return 'NO MÁXIMO 2 NO TECLADO';
    if (waitingForGamepad()) return 'AGUARDANDO CONTROLE...';
    if (waitingForPhone()) return 'AGUARDANDO CELULAR...';
    return null;
}

// Teclas de quem joga no teclado: sozinho usa o esquema completo; em dois, o primeiro fica com o lado esquerdo
function keymapFor(player) {
    const keyboard = activePlayers().filter(p => match.inputs[p].type === 'keyboard');
    if (keyboard.length === 1) return KEYMAPS.solo;
    return keyboard.indexOf(player) === 0 ? KEYMAPS.left : KEYMAPS.right;
}

// No menu: o primeiro controle com algum botão apertado (e que não seja do outro jogador) fica com quem está esperando
function detectGamepads() {
    if (gameState !== 'MENU') return;
    let changed = false;
    for (const player of activePlayers()) {
        const input = match.inputs[player];
        if (input.type !== 'gamepad' || input.index !== null) continue;
        const takenBy = activePlayers().filter(p => p !== player).map(p => match.inputs[p]).filter(i => i.type === 'gamepad').map(i => i.index);
        const pad = getGamepads().find(gp => !takenBy.includes(gp.index) && gp.buttons.some(b => b.pressed));
        if (pad) {
            input.index = pad.index;
            input.name = padName(pad.id);
            sfx.play('heal');
            changed = true;
            break; // um controle por vez, para o mesmo aperto não conectar os dois jogadores
        }
    }
    if (changed) renderInputStatus();
}

function renderInputStatus() {
    const category = match.category;
    match.humans = Math.max(minHumans(), Math.min(match.humans, maxHumans()));
    const phonesOk = phonesInMenu();
    // Fora do multiplayer ninguém fica esperando celular: quem estava nele volta para o teclado
    if (!phonesOk) {
        for (const player of activePlayers()) {
            const input = match.inputs[player];
            if (input.type !== 'phone') continue;
            if (input.index !== null) dropPhone(input.index);
            Object.assign(input, { type: 'keyboard', index: null, name: '' });
        }
    }

    // Só o que vale para o caminho escolhido
    document.getElementById('hub-setup-title').innerText = CATEGORY_TITLES[category] || '';
    document.getElementById('mode-section').classList.toggle('hidden', match.boss);
    document.querySelector('#mode-options [data-mode="treino"]').classList.toggle('hidden', category !== 'solo');
    document.getElementById('humans-section').classList.toggle('hidden', category === 'solo');
    document.getElementById('inputs-title').innerText = category === 'solo' ? 'Controle' : match.boss ? 'Controles' : 'Controles e times';
    document.getElementById('phone-room').classList.toggle('hidden', !phonesOk);
    document.querySelectorAll('#humans-options .hub-option').forEach(button => {
        const n = Number(button.dataset.humans);
        button.classList.toggle('hidden', n < minHumans() || n > maxHumans());
        button.classList.toggle('selected', n === match.humans);
        const desc = button.querySelector('.hub-option-desc');
        if (n === 1) desc.innerText = match.boss ? 'Você + IA' : 'jogador';
    });
    for (const player of PLAYER_IDS) {
        const input = match.inputs[player];
        const row = document.querySelector(`.input-row[data-player="${player}"]`);
        row.classList.toggle('hidden', !activePlayers().includes(player));
        const color = TEAM_COLORS[teamOf(player)];
        row.querySelector('.input-label').style.color = color;
        const toggle = row.querySelector('.team-toggle');
        toggle.classList.toggle('hidden', match.humans === 1 || match.boss);
        toggle.innerText = teamOf(player) === 0 ? 'Time Ciano' : 'Time Rosa';
        toggle.style.setProperty('--team-color', color);
        row.querySelector('[data-input="phone"]').classList.toggle('hidden', !phonesOk);
        row.querySelectorAll('.input-option').forEach(b => b.classList.toggle('selected', b.dataset.input === input.type));
        const status = row.querySelector('.gamepad-status');
        status.classList.remove('waiting', 'connected');
        if (input.type === 'keyboard') {
            status.innerText = '';
        } else if (input.index === null) {
            status.innerText = input.type === 'phone'
                ? (roomCode ? `Esperando um celular entrar com ${roomCode}` : 'Sala para celulares indisponível')
                : 'Aperte qualquer botão no controle...';
            status.classList.add('waiting');
        } else {
            status.innerText = `✔ ${input.name} conectado`;
            status.classList.add('connected');
        }
    }
    document.getElementById('input-rows').classList.toggle('single', match.humans === 1);
    if (typeof syncPhoneTeams === 'function') syncPhoneTeams(); // a cor do time no celular acompanha
    renderControlsPanel();
    const startButton = document.getElementById('hub-start');
    const problem = hubProblem();
    startButton.disabled = !!problem;
    startButton.innerText = problem || (match.training ? 'ESCOLHER LUTADOR PARA TREINAR ▶' : match.boss ? 'ESCOLHER QUEM ENFRENTA O CHEFÃO ▶' : match.humans === 1 ? 'ESCOLHER LUTADOR ▶' : 'ESCOLHER LUTADORES ▶');
}

// --- Lógica da Tela de Seleção ---
function openSelection() {
    if (gameState !== 'SELECT' && gameState !== 'STAGE' && typeof announcer !== 'undefined') announcer.say('choose_your_character');
    gameState = 'SELECT';
    const humans = match.humans;
    const step = match.picks.length + 1;
    selectionTitle.innerText = match.training ? 'TREINO — escolha quem testar'
        : match.boss ? (humans === 1 ? 'BOSS BATTLE — quem enfrenta o chefe?' : `BOSS BATTLE — vez do JOGADOR ${step}`)
        : humans === 1 ? `${match.mode.toUpperCase()} contra a IA`
        : `${match.mode.toUpperCase()} — vez do JOGADOR ${step}`;
    selectionTitle.style.color = humans === 1 ? '' : TEAM_COLORS[teamOf(activePlayers()[step - 1])];
    const cards = [...document.querySelectorAll('.character-card')];
    cards.forEach(card => {
        card.classList.toggle('taken', match.picks.includes(card.id.replace('select-', '')));
    });
    renderSelectionChips();
    showScreen(selectionScreen);
    // Começa mostrando o primeiro lutador livre
    const first = cards.find(card => !card.classList.contains('taken'));
    if (first) showPreview(first, true);
}

// --- Fotos das arenas ---
// Cada mapa é montado vazio e desenhado no canvas do jogo (escondido atrás do menu); o recorte da arena vira a
// foto do card. Guardadas por tamanho de arena: no 1v1 a arena é menor e tem outros obstáculos.
const MAP_THUMB_W = 320;
const mapThumbs = {};
function mapThumb(id, size) {
    const key = `${id}:${size}`;
    if (mapThumbs[key]) return mapThumbs[key];
    const saved = { map: match.map, mode: match.mode };
    Object.assign(match, { map: id, mode: size === 'duel' ? '1v1' : '3v3' });
    setupArena();
    Object.assign(match, saved);
    mapState.banner = 0; // sem o nome da arena por cima
    try { for (let i = 0; i < 90; i++) updateMap(); } catch (e) { /* chuva, laser e afins só não andam */ }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    drawArenaFloor();
    drawMapGround();
    [
        ...obstacles.map(o => ({ y: isRound(o) ? o.y : o.y + o.h, draw: () => drawObstacle(o) })),
        ...bushes.map(b => ({ y: b.y + b.r * 0.4, draw: () => drawBush(b) })),
    ].sort((a, b) => a.y - b.y).forEach(d => d.draw());
    drawMapOverlay();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Recorte: a arena com uma beirada da mureta em volta
    const m = 14;
    const sx = (arena.left - m) * viewScale, sy = (arena.top - m) * viewScale;
    const sw = (arena.right - arena.left + 2 * m) * viewScale, sh = (arena.bottom - arena.top + 2 * m) * viewScale;
    const out = document.createElement('canvas');
    out.width = MAP_THUMB_W;
    out.height = Math.round(MAP_THUMB_W * sh / sw);
    const g = out.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
    return (mapThumbs[key] = out);
}

// Sorteio: as arenas em mosaico, escurecidas, com um "?" grande
function randomMapThumb(size) {
    const key = `random:${size}`;
    if (mapThumbs[key]) return mapThumbs[key];
    const tiles = ['plaza', 'rooftop', 'lab', 'garden', 'dungeon', 'plaza'].map(id => mapThumb(id, size));
    const out = document.createElement('canvas');
    out.width = MAP_THUMB_W;
    out.height = tiles[0].height;
    const g = out.getContext('2d');
    const w = out.width / 3, h = out.height / 2;
    tiles.forEach((t, i) => g.drawImage(t, t.width * 0.2, t.height * 0.2, t.width * 0.6, t.height * 0.6, (i % 3) * w, Math.floor(i / 3) * h, w, h));
    g.fillStyle = 'rgba(8, 6, 20, 0.62)';
    g.fillRect(0, 0, out.width, out.height);
    g.font = `bold ${Math.round(out.height * 0.62)}px Orbitron, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#ffd23f';
    g.shadowBlur = 18;
    g.fillStyle = '#ffd23f';
    g.fillText('?', out.width / 2, out.height / 2 + 4);
    return (mapThumbs[key] = out);
}

// Coloca a foto em cada card de arena (do tamanho de arena desta partida)
function renderMapThumbs() {
    const size = match.mode === '1v1' ? 'duel' : 'team';
    for (const button of document.querySelectorAll('#map-options .hub-option')) {
        const id = button.dataset.map;
        let photo = button.querySelector('canvas.map-thumb');
        if (!photo) {
            photo = document.createElement('canvas');
            photo.className = 'map-thumb';
            button.prepend(photo);
        }
        const src = id === 'random' ? randomMapThumb(size) : mapThumb(id, size);
        photo.width = src.width;
        photo.height = src.height;
        photo.getContext('2d').drawImage(src, 0, 0);
    }
    floorCache = null;
    drawMenuBackground(); // o canvas volta a mostrar o fundo do menu
}

// Todos escolheram: arena (e, no Boss Battle, o chefe)
function openStage() {
    gameState = 'STAGE';
    renderMapThumbs();
    document.getElementById('boss-section').classList.toggle('hidden', !match.boss);
    document.getElementById('stage-title').innerText = match.boss ? 'ESCOLHA O CHEFE E A ARENA' : 'ESCOLHA A ARENA';
    document.querySelectorAll('#map-options .hub-option').forEach(b => b.classList.toggle('selected', b.dataset.map === match.map));
    document.querySelectorAll('#boss-options .hub-option').forEach(b => b.classList.toggle('selected', b.dataset.boss === match.bossId));
    fillPickChips(document.getElementById('stage-picks'));
    showScreen(stageScreen);
    if (typeof setPadFocus === 'function') setPadFocus(null);
}

// Cabeçalho da seleção: o caminho/modo da partida e quem os jogadores anteriores já pegaram
function modeChip() {
    if (match.boss) return { icon: '👹', name: 'BOSS BATTLE', color: '#ff3b3b' };
    if (match.training) return { icon: '🎯', name: 'TREINO', color: '#ffd23f' };
    const multi = match.category === 'multi';
    return { icon: multi ? '🎮' : '🥊', name: `${multi ? 'MULTIPLAYER' : 'SOLO'} · ${match.mode.toUpperCase()}`, color: multi ? '#ff4dff' : '#3ff6ff' };
}
function renderSelectionChips() {
    const mode = modeChip();
    const chip = document.getElementById('selection-map');
    chip.innerText = `${mode.icon} ${mode.name}`;
    chip.style.setProperty('--chip-color', mode.color);
    fillPickChips(document.getElementById('selection-picks'));
}

// Um selo por jogador que já escolheu, na cor do time dele
function fillPickChips(container) {
    container.innerHTML = '';
    match.picks.forEach((id, i) => {
        const character = CHARACTERS.find(c => c.id === id);
        const chip = document.createElement('span');
        chip.className = 'selection-chip';
        chip.style.setProperty('--chip-color', TEAM_COLORS[teamOf(activePlayers()[i])]);
        const portrait = document.createElement('canvas');
        portrait.width = portrait.height = 48;
        const g = portrait.getContext('2d');
        g.imageSmoothingEnabled = false;
        if (characterArt[id]) characterArt[id](g, 4, 2, 40, 80, null);
        const name = document.createElement('span');
        name.innerText = `${match.humans > 1 ? `P${i + 1}: ` : ''}${character.name.toUpperCase()}`;
        chip.append(portrait, name);
        container.appendChild(chip);
    });
}

// Classe, estilo e ultimate de cada lutador (painel de destaque da seleção)
const CLASS_NAMES = { melee: 'Corpo a corpo', shooter: 'Atirador', healer: 'Healer', tank: 'Tanque', cyber: 'Cibernético', random: 'Sorte' };
const ROSTER_INFO = {
    titan: { cls: 'melee', style: 'Ex-soldado com braço robótico', ult: 'Soco-foguete com onda de choque' },
    tessa: { cls: 'melee', style: 'Costureira de tesoura gigante: cada corte prende um fio no inimigo (até 4). Segurando o golpe, a Tesourada em X dá mais dano no cruzamento das lâminas e, com 3 fios, puxa a linha e arrasta o inimigo. Defendendo, os tiros ficam presos no tecido', ult: 'Ziguezague: 3 avanços de inimigo em inimigo, cortando; no fim ela puxa a linha e a costura explode (cada fio aumenta o dano)' },
    vex: { cls: 'cyber', style: 'Lâminas térmicas rápidas nos antebraços. Segurando o golpe, o Passo fantasma atravessa o inimigo cortando e para atrás dele', ult: 'Cronodrive: por 4 s os inimigos e os tiros deles ficam a 25% da velocidade, e ela não' },
    kairo: { cls: 'cyber', style: 'Netrunner de rua: cada golpe infecta com Corrupção; com 5, o implante do inimigo entra em Pane (3 s sem especial e sem defesa). Segurando o golpe, quickhack à distância', ult: 'Rompendo a Muralha: flutua, a área em volta queima, puxa e corrompe, e fantasmas de dados caçam os inimigos' },
    spark: { cls: 'melee', style: 'Robô de segurança abandonado, de soco elétrico', ult: 'Corrente elétrica: o dano dobra a cada segundo e o alvo fica lento; só golpe forte arrebenta' },
    hades: { cls: 'melee', style: 'Punhos de fogo, queima quem acerta', ult: 'Círculo de fogo que explode no chão' },
    jack: { cls: 'melee', style: 'Amaldiçoado no Halloween, rouba vida', ult: 'Abóbora amaldiçoada' },
    kaze: { cls: 'melee', style: 'Espadachim, cortes que fazem sangrar', ult: 'Tornado que prende o inimigo no ar' },
    kenji: { cls: 'melee', style: 'Combo de socos que acelera a cada acerto', ult: 'Investida explosiva' },
    akane: { cls: 'melee', style: 'Lâmina carmesim que cura a cada golpe', ult: 'Dança das Sete Lâminas: 7 cortes seguidos' },
    fenris: { cls: 'melee', style: 'Fera sombria', ult: 'Salta e dispara lâminas do céu' },
    zarek: { cls: 'melee', style: 'Muda de forma na luta: Rubra 🔴 ou Umbral 🔵', ult: 'Entra no corpo do inimigo e sai rasgando' },
    weaver: { cls: 'melee', style: 'Acrobata com teia e sentido aranha', ult: 'Puxão de teia e chute para cima' },
    bershow: { cls: 'melee', style: 'Espadão que acerta todos na frente; quanto menos vida, mais forte', ult: 'Armadura da Fúria: o visor fecha, solta o Corte Devastador e ele não sente dor por 5 s' },
    cangeras: { cls: 'melee', style: 'Advogado do martelo de juiz; o soco forte manda o inimigo para longe ("ORDEM!")', ult: 'Tribunal: congela a luta, bate o martelo 3 vezes e deixa sem ultimate quem mais causou dano' },
    aspas: { cls: 'melee', style: 'Duas adagas rápidas; some e reaparece atrás do inimigo', ult: 'Exército das Sombras: 3 soldados de sombra caçam os inimigos (+1 a cada inimigo derrotado)' },
    sina: { cls: 'melee', style: 'Pirata apostadora de faca; o papagaio revela quem se esconde', ult: 'Roleta da Sina: 🔫 pistola, 🦈 tubarão ou 🌊 barco de água' },
    mamba: { cls: 'shooter', style: 'Rifle tóxico de longo alcance', ult: 'Nuvem de veneno' },
    gear: { cls: 'shooter', style: 'Mecânico de pregos', ult: 'Monta até 3 torretas' },
    roxy: { cls: 'shooter', style: 'Duas pistolas, a adrenalina acelera os tiros', ult: 'Frenesi: cada pistola escolhe um alvo' },
    craque: { cls: 'shooter', style: 'Atacante que chuta bolas que voltam', ult: 'Chama todas as bolas de volta' },
    celestia: { cls: 'healer', style: 'Aura de cura em volta dela', ult: 'Círculo de cura gigante para o time' },
    flora: { cls: 'healer', style: 'Flores que voam até o aliado ferido', ult: 'Flor encantada de cura' },
    nyx: { cls: 'healer', style: 'Rouba vida batendo e manda para o time', ult: 'Laço de vida com o inimigo' },
    aegis: { cls: 'tank', style: 'Escudo que segura os tiros do time', ult: 'Muralha de energia' },
    rhino: { cls: 'tank', style: 'Ganha embalo correndo', ult: 'Estouro: atropela tudo, quebra caixas e torretas' },
    anchor: { cls: 'tank', style: 'Não sai do lugar com empurrões', ult: 'Gancho: a corrente arrasta ele até o inimigo e o atordoa' },
    coleone: { cls: 'tank', style: 'Pivô de rua, o toco manda o inimigo para longe', ult: 'Enterrada: agarra o inimigo e enterra no chão; sem ninguém perto, enterra a bola em área' },
};
const MAX_HEALTH_SHOWN = Math.max(...Object.values(HEALTH_BY_CHARACTER));

// Card "Aleatório": no destaque aparece um "?" em vez de um lutador
const RANDOM_INFO = { cls: 'random', style: 'A sorte escolhe um lutador livre para você', ult: '???' };

// Lutador em destaque: id e passo da animação (parado, andando, golpe e pose de especial, em ciclo)
let previewId = null;
let previewStep = 0;
const PREVIEW_CYCLE = [
    ...Array(8).fill({ spriteFrame: 'idle' }),
    ...[0, 1, 2, 3, 0, 1, 2, 3].map(walkFrame => ({ spriteFrame: null, walkFrame })),
    ...Array(4).fill({ spriteFrame: 'attack' }),
    ...Array(4).fill({ spriteFrame: 'idle' }),
    ...Array(6).fill({ spriteFrame: 'special' }),
];

function drawPreviewFrame() {
    const canvas = document.getElementById('preview-canvas');
    if (canvas.width !== 192) canvas.width = canvas.height = 192;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 192, 192);
    ctx.imageSmoothingEnabled = false;
    if (characterArt[previewId]) {
        const pose = PREVIEW_CYCLE[previewStep % PREVIEW_CYCLE.length];
        if (previewId === 'gear') drawPreviewTurret(ctx, pose.spriteFrame === 'attack');
        characterArt[previewId](ctx, 48, 0, 96, 192, { walkFrame: null, zarekForm: null, ...pose });
    } else {
        ctx.font = 'bold 120px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd23f';
        ctx.fillText('?', 96, 100);
    }
}
// Torreta do Gear ao lado dele no destaque: o cano procura alvo e atira junto quando ele atira
function drawPreviewTurret(ctx, firing) {
    const x = 30, y = 186; // pé da torreta no canvas do destaque (192x192)
    ctx.save();
    ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
    ctx.beginPath(); ctx.ellipse(x, y, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Tripé
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 12, y); ctx.lineTo(x, y - 22); ctx.lineTo(x + 12, y);
    ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 22);
    ctx.stroke();
    ctx.strokeStyle = '#5a6270';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Cabeça com o cano girando devagar para os lados
    ctx.translate(x, y - 30);
    ctx.fillStyle = '#1a1024';
    ctx.fillRect(-13, -10, 26, 20);
    ctx.fillStyle = '#9aa3b8';
    ctx.fillRect(-11, -8, 22, 16);
    ctx.fillStyle = '#5a6270';
    ctx.fillRect(-11, 4, 22, 4);
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    ctx.fillStyle = blink ? '#3ff6ff' : '#1a8aa0';
    ctx.fillRect(-4, -4, 6, 6); // luz
    ctx.rotate(Math.PI + 0.4 + Math.sin(Date.now() / 700) * 0.25); // para o lado e um pouco para cima
    ctx.fillStyle = '#1a1024';
    ctx.fillRect(8, -5, 18, 10);
    ctx.fillStyle = '#4a5060';
    ctx.fillRect(9, -3, 16, 6);
    if (firing) {
        ctx.fillStyle = '#fff3a0';
        ctx.beginPath(); ctx.arc(29, 0, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Anima o destaque só enquanto a tela de seleção está aberta
setInterval(() => {
    if (gameState !== 'SELECT' || !previewId) return;
    previewStep++;
    drawPreviewFrame();
}, 110);

// Mostra no painel de destaque o lutador do card (mouse ou controle em cima).
// silent: sem o "tic" (quando a tela abre já mostrando alguém)
function showPreview(card, silent = false) {
    const id = card.id.replace('select-', '');
    const info = id === 'random' ? RANDOM_INFO : ROSTER_INFO[id];
    if (!info) return;
    if (!silent && id !== previewId) sfx.play('menu_move');
    previewId = id;
    previewStep = 0;
    document.querySelectorAll('.character-card.active').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const preview = document.getElementById('selection-preview');
    preview.classList.remove(...Object.keys(CLASS_NAMES));
    preview.classList.add(info.cls);
    const health = HEALTH_BY_CHARACTER[id];
    const character = CHARACTERS.find(c => c.id === id);
    document.getElementById('preview-name').innerText = character ? character.name.toUpperCase() : card.querySelector('h2').innerText;
    document.getElementById('preview-class').innerText = CLASS_NAMES[info.cls];
    document.getElementById('preview-style').innerText = info.style;
    document.getElementById('preview-hp').innerText = health || '???';
    document.getElementById('preview-hp-fill').style.width = `${((health || 0) / MAX_HEALTH_SHOWN) * 100}%`;
    document.getElementById('preview-ult').innerText = info.ult;
    document.getElementById('preview-lore').innerText = card.dataset.lore;
    drawPreviewFrame();
}

// Lutadores que ainda podem ser escolhidos (o outro jogador já pode ter pegado algum)
function freeCharacterIds() {
    return CHARACTERS.map(c => c.id).filter(id => !match.picks.includes(id));
}

function setupSelectionScreen() {
    drawThumbnails();
    document.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', () => {
            let id = card.id.replace('select-', '');
            if (id === 'random') {
                const free = freeCharacterIds();
                id = free[Math.floor(Math.random() * free.length)];
            }
            sfx.play('menu_confirm');
            match.picks.push(id);
            if (match.picks.length < match.humans) {
                openSelection(); // vez do próximo jogador
            } else {
                openStage(); // todos escolheram: agora a arena
            }
        });
        card.addEventListener('mouseenter', () => showPreview(card));
        card.addEventListener('padfocus', () => showPreview(card));
    });
}

// Texto dos controles na tela de carregamento, conforme o modo
function renderControls() {
    const names = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', ' ': 'Espaço' };
    const keyName = list => list.map(k => names[k] || k.toUpperCase()).join(' / ');
    const list = map => `
        <p><strong>Andar:</strong> ${keyName(map.up)}, ${keyName(map.left)}, ${keyName(map.down)}, ${keyName(map.right)}</p>
        <p><strong>Soco:</strong> ${keyName(map.punch)}</p>
        <p><strong>Soco Forte:</strong> segurar ${keyName(map.punch)}</p>
        <p><strong>Especial:</strong> ${keyName(map.special)}</p>
        <p><strong>Defesa:</strong> segurar ${keyName(map.defend)}</p>`;
    const padList = `
        <p><strong>Andar:</strong> analógico esquerdo ou direcional</p>
        <p><strong>Soco:</strong> □ (X no Xbox)</p>
        <p><strong>Soco Forte:</strong> segurar □</p>
        <p><strong>Especial:</strong> △ ou R1 (Y ou RB no Xbox)</p>
        <p><strong>Defesa:</strong> segurar ◯ ou L1 (B ou LB no Xbox)</p>`;
    const phoneList = '<p><strong>Celular:</strong> analógico à esquerda; SOCO (segure = forte), ULT e DEFESA à direita</p>';
    const controlsFor = player => ({ gamepad: padList, phone: phoneList }[match.inputs[player].type] || list(keymapFor(player)));
    const hint = '<p class="controls-hint">A mira é automática: golpes e especiais vão no inimigo mais próximo.</p>';
    // Vários humanos: uma coluna por jogador, na cor do time
    document.getElementById('controls-content').innerHTML = match.humans > 1
        ? `<div class="controls-columns">${activePlayers().map((player, i) =>
            `<div><h4 style="color: ${TEAM_COLORS[teamOf(player)]}">Jogador ${i + 1}</h4>${controlsFor(player)}</div>`).join('')}
           </div>${hint}`
        : `<div class="controls-grid">${controlsFor('p1')}</div>${hint}`;
}

// Painel lateral: controles de cada jogador ativo, conforme teclado/controle escolhido no HUB
function renderControlsPanel() {
    const names = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓' };
    const keys = list => list.map(k => names[k] || k.toUpperCase()).join(' / ');
    const row = (action, key) => `<div class="panel-row"><span>${action}</span><span class="panel-key">${key}</span></div>`;

    const padRows = row('Andar', 'Analógico / Direcional') + row('Soco', '□') + row('Soco forte', 'Segurar □') +
        row('Especial', '△ ou R1') + row('Defesa', 'Segurar ◯ ou L1') + row('Menus', '✕ confirma, ◯ volta');
    // Com mais de dois jogadores, quem joga no controle aparece numa linha só e os botões vêm uma vez no fim
    const compact = match.humans > 2;
    const blocks = activePlayers().map((player, i) => {
        const input = match.inputs[player];
        const title = match.humans > 1 ? `Jogador ${i + 1}` : 'Você';
        let device, rows;
        if (input.type === 'gamepad') {
            device = input.name || 'Controle (não conectado)';
            rows = compact ? '' : padRows;
        } else if (input.type === 'phone') {
            device = input.index !== null ? 'Celular' : 'Celular (não conectado)';
            rows = compact ? '' : row('Botões', 'Na tela do celular');
        } else {
            const map = keymapFor(player);
            device = 'Teclado';
            const walk = map === KEYMAPS.solo ? 'WASD ou setas' : map === KEYMAPS.left ? 'WASD' : 'Setas';
            rows = row('Andar', walk) +
                row('Soco', keys(map.punch)) + row('Soco forte', `Segurar ${keys(map.punch)}`) +
                row('Especial', keys(map.special)) + row('Defesa', `Segurar ${keys(map.defend)}`);
        }
        return `<div class="panel-player"><h4 style="color: ${TEAM_COLORS[teamOf(player)]}">${title} <span class="panel-device">${device}</span></h4>${rows}</div>`;
    });

    if (compact && activePlayers().some(p => match.inputs[p].type === 'gamepad')) {
        blocks.push(`<div class="panel-player"><h4>Controle <span class="panel-device">todos os jogadores no controle</span></h4>${padRows}</div>`);
    }
    document.getElementById('controls-panel-content').innerHTML = blocks.join('') +
        '<p class="panel-hint">A mira é automática: golpes e especiais vão no inimigo mais próximo. ' +
        'Segure o soco para carregar o soco forte.</p>';
}
