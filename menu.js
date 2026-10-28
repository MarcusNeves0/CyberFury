// Menus
// HUB (modo, jogadores, arena, controles), tela de seleção e painel de controles.

// --- HUB: escolha de modo ---
function showScreen(screen) {
    for (const s of [hubScreen, selectionScreen, loadingScreen, gameOverScreen]) {
        s.classList.toggle('hidden', s !== screen);
    }
}

function setupHub() {
    const bindGroup = (containerId, attr, apply) => {
        const buttons = document.querySelectorAll(`#${containerId} .hub-option`);
        buttons.forEach(button => button.addEventListener('click', () => {
            buttons.forEach(b => b.classList.toggle('selected', b === button));
            apply(button.dataset[attr]);
        }));
    };
    bindGroup('mode-options', 'mode', value => { match.mode = value; });
    bindGroup('vs-options', 'vs', value => { match.vs = value; renderInputStatus(); });
    bindGroup('map-options', 'map', value => { match.map = value; });

    // Teclado ou controle para cada jogador
    document.querySelectorAll('.input-row').forEach(row => {
        const player = row.dataset.player;
        const buttons = row.querySelectorAll('.input-option');
        buttons.forEach(button => button.addEventListener('click', () => {
            buttons.forEach(b => b.classList.toggle('selected', b === button));
            // Escolher "Controle" sempre pede para apertar um botão de novo
            match.inputs[player] = { type: button.dataset.input, index: null, name: '' };
            button.blur();
            renderInputStatus();
        }));
    });
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
        if (waitingForGamepad()) return;
        match.picks = [];
        openSelection();
    });
    document.getElementById('back-to-hub').addEventListener('click', goToMenu);
}

const activePlayers = () => match.vs === 'pvp' ? ['p1', 'p2'] : ['p1'];
const waitingForGamepad = () => activePlayers().some(p => match.inputs[p].type === 'gamepad' && match.inputs[p].index === null);

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
    document.querySelector('.input-row[data-player="p2"]').classList.toggle('hidden', match.vs !== 'pvp');
    for (const player of ['p1', 'p2']) {
        const input = match.inputs[player];
        const status = document.querySelector(`.input-row[data-player="${player}"] .gamepad-status`);
        status.classList.remove('waiting', 'connected');
        if (input.type !== 'gamepad') {
            status.innerText = '';
        } else if (input.index === null) {
            status.innerText = 'Aperte qualquer botão no controle...';
            status.classList.add('waiting');
        } else {
            status.innerText = `✔ ${input.name} conectado`;
            status.classList.add('connected');
        }
    }
    renderControlsPanel();
    const startButton = document.getElementById('hub-start');
    startButton.disabled = waitingForGamepad();
    startButton.innerText = waitingForGamepad() ? 'AGUARDANDO CONTROLE...' : 'ESCOLHER LUTADORES ▶';
}

// --- Lógica da Tela de Seleção ---
function openSelection() {
    gameState = 'SELECT';
    const humans = match.vs === 'pvp' ? 2 : 1;
    const step = match.picks.length + 1;
    selectionTitle.innerText = humans === 1
        ? `${match.mode.toUpperCase()} — escolha seu lutador`
        : `${match.mode.toUpperCase()} — JOGADOR ${step}: escolha seu lutador`;
    selectionTitle.style.color = humans === 1 ? '' : TEAM_COLORS[step - 1];
    document.querySelectorAll('.character-card').forEach(card => {
        card.classList.toggle('taken', match.picks.includes(card.id.replace('select-', '')));
    });
    showScreen(selectionScreen);
}

function setupSelectionScreen() {
    drawThumbnails();
    document.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', () => {
            match.picks.push(card.id.replace('select-', ''));
            const humans = match.vs === 'pvp' ? 2 : 1;
            if (match.picks.length < humans) {
                openSelection(); // vez do jogador 2
            } else {
                startGame();
            }
        });
        const loreTooltip = document.getElementById('lore-tooltip');
        card.addEventListener('mouseenter', (e) => {
            loreTooltip.innerText = e.currentTarget.dataset.lore;
            loreTooltip.style.display = 'block';
        });
        card.addEventListener('mouseleave', () => {
            loreTooltip.style.display = 'none';
        });
        card.addEventListener('mousemove', (e) => {
            const gameContainerRect = gameContainer.getBoundingClientRect();
            loreTooltip.style.left = `${e.clientX - gameContainerRect.left + 15}px`;
            loreTooltip.style.top = `${e.clientY - gameContainerRect.top - loreTooltip.offsetHeight - 5}px`;
        });
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
    const keyboardPlayers = activePlayers().filter(p => match.inputs[p].type === 'keyboard').length;
    const controlsFor = player => match.inputs[player].type === 'gamepad'
        ? padList
        : list(keyboardPlayers === 2 ? KEYMAPS[player] : KEYMAPS.solo);
    const hint = '<p class="controls-hint">A mira é automática: golpes e especiais vão no inimigo mais próximo.</p>';
    document.getElementById('controls-content').innerHTML = match.vs === 'pvp'
        ? `<div class="controls-columns">
               <div class="controls-p1"><h4>Jogador 1</h4>${controlsFor('p1')}</div>
               <div class="controls-p2"><h4>Jogador 2</h4>${controlsFor('p2')}</div>
           </div>${hint}`
        : `<div class="controls-grid">${controlsFor('p1')}</div>${hint}`;
}

// Painel lateral: controles de cada jogador ativo, conforme teclado/controle escolhido no HUB
function renderControlsPanel() {
    const names = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓' };
    const keys = list => list.map(k => names[k] || k.toUpperCase()).join(' / ');
    const row = (action, key) => `<div class="panel-row"><span>${action}</span><span class="panel-key">${key}</span></div>`;
    const keyboardPlayers = activePlayers().filter(p => match.inputs[p].type === 'keyboard').length;

    const blocks = activePlayers().map(player => {
        const input = match.inputs[player];
        const title = match.vs === 'pvp' ? (player === 'p1' ? 'Jogador 1' : 'Jogador 2') : 'Você';
        let device, rows;
        if (input.type === 'gamepad') {
            device = input.name || 'Controle (não conectado)';
            rows = row('Andar', 'Analógico / Direcional') + row('Soco', '□') + row('Soco forte', 'Segurar □') +
                row('Especial', '△ ou R1') + row('Defesa', 'Segurar ◯ ou L1') + row('Menus', '✕ confirma, ◯ volta');
        } else {
            const map = keyboardPlayers === 2 ? KEYMAPS[player] : KEYMAPS.solo;
            device = 'Teclado';
            const walk = map === KEYMAPS.solo ? 'WASD ou setas' : map === KEYMAPS.p1 ? 'WASD' : 'Setas';
            rows = row('Andar', walk) +
                row('Soco', keys(map.punch)) + row('Soco forte', `Segurar ${keys(map.punch)}`) +
                row('Especial', keys(map.special)) + row('Defesa', `Segurar ${keys(map.defend)}`);
        }
        return `<div class="panel-player ${player}"><h4>${title} <span class="panel-device">${device}</span></h4>${rows}</div>`;
    });

    document.getElementById('controls-panel-content').innerHTML = blocks.join('') +
        '<p class="panel-hint">A mira é automática: golpes e especiais vão no inimigo mais próximo. ' +
        'Segure o soco para carregar o soco forte.</p>';
}
