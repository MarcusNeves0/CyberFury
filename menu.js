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
    bindGroup('mode-options', 'mode', value => { match.mode = value; renderInputStatus(); });
    bindGroup('humans-options', 'humans', value => { match.humans = Number(value); renderInputStatus(); });
    bindGroup('map-options', 'map', value => { match.map = value; });

    // Uma linha por jogador: time, teclado ou controle
    const rows = document.getElementById('input-rows');
    for (const player of PLAYER_IDS) {
        const row = document.createElement('div');
        row.className = 'input-row';
        row.dataset.player = player;
        row.innerHTML = `<span class="input-label">${player.toUpperCase()}</span>
            <button class="team-toggle"></button>
            <button class="input-option" data-input="keyboard">⌨ Teclado</button>
            <button class="input-option" data-input="gamepad">🎮 Controle</button>
            <span class="gamepad-status"></span>`;
        row.querySelector('.team-toggle').addEventListener('click', (e) => {
            match.inputs[player].team = 1 - match.inputs[player].team;
            e.currentTarget.blur();
            renderInputStatus();
        });
        row.querySelectorAll('.input-option').forEach(button => button.addEventListener('click', () => {
            // Escolher "Controle" sempre pede para apertar um botão de novo
            Object.assign(match.inputs[player], { type: button.dataset.input, index: null, name: '' });
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
    document.getElementById('back-to-hub').addEventListener('click', goToMenu);
}

// Jogadores humanos desta partida (P1, P2... até o número escolhido no HUB)
const activePlayers = () => PLAYER_IDS.slice(0, match.humans);
const maxHumans = () => teamSizeOf(match.mode) * 2;
// Sozinho, o jogador fica sempre no time ciano; com mais gente, cada um escolhe o time
const teamOf = player => match.humans === 1 ? 0 : match.inputs[player].team;
const waitingForGamepad = () => activePlayers().some(p => match.inputs[p].type === 'gamepad' && match.inputs[p].index === null);

// O que impede de começar (time com mais humanos que vagas, teclado lotado, controle sem conectar)
function hubProblem() {
    const players = activePlayers();
    for (const team of [0, 1]) {
        if (players.filter(p => teamOf(p) === team).length > teamSizeOf(match.mode)) return `${TEAM_NAMES[team]} LOTADO`;
    }
    if (players.filter(p => match.inputs[p].type === 'keyboard').length > MAX_KEYBOARD_PLAYERS) return 'NO MÁXIMO 2 NO TECLADO';
    if (waitingForGamepad()) return 'AGUARDANDO CONTROLE...';
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
    // Modo menor: não cabem tantos humanos (ex.: no 1v1 são no máximo 2)
    match.humans = Math.min(match.humans, maxHumans());
    document.querySelectorAll('#humans-options .hub-option').forEach(button => {
        const n = Number(button.dataset.humans);
        button.disabled = n > maxHumans();
        button.classList.toggle('selected', n === match.humans);
    });
    for (const player of PLAYER_IDS) {
        const input = match.inputs[player];
        const row = document.querySelector(`.input-row[data-player="${player}"]`);
        row.classList.toggle('hidden', !activePlayers().includes(player));
        const color = TEAM_COLORS[teamOf(player)];
        row.querySelector('.input-label').style.color = color;
        const toggle = row.querySelector('.team-toggle');
        toggle.classList.toggle('hidden', match.humans === 1);
        toggle.innerText = teamOf(player) === 0 ? 'Time Ciano' : 'Time Rosa';
        toggle.style.setProperty('--team-color', color);
        row.querySelectorAll('.input-option').forEach(b => b.classList.toggle('selected', b.dataset.input === input.type));
        const status = row.querySelector('.gamepad-status');
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
    const problem = hubProblem();
    startButton.disabled = !!problem;
    startButton.innerText = problem || 'ESCOLHER LUTADORES ▶';
}

// --- Lógica da Tela de Seleção ---
function openSelection() {
    gameState = 'SELECT';
    const humans = match.humans;
    const step = match.picks.length + 1;
    selectionTitle.innerText = humans === 1
        ? `${match.mode.toUpperCase()} contra a IA`
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

// Cabeçalho da seleção: arena escolhida no HUB e quem os jogadores anteriores já pegaram
const MAP_CHIPS = {
    random: { icon: '🎲', name: 'SORTEIO', color: '#ffd23f' },
    plaza: { icon: '🌃', name: 'PRAÇA NEON', color: '#ff4dff' },
    rooftop: { icon: '🌧️', name: 'TELHADO NEON', color: '#3ff6ff' },
    lab: { icon: '🧪', name: 'LABORATÓRIO', color: '#6dff8a' },
    garden: { icon: '🌸', name: 'JARDIM SUSPENSO', color: '#ff9ad5' },
};
function renderSelectionChips() {
    const map = MAP_CHIPS[match.map] || MAP_CHIPS.random;
    const mapChip = document.getElementById('selection-map');
    mapChip.innerText = `${map.icon} ${map.name}`;
    mapChip.style.setProperty('--chip-color', map.color);

    // Um selo por jogador que já escolheu, na cor do time dele
    const picks = document.getElementById('selection-picks');
    picks.innerHTML = '';
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
        name.innerText = `P${i + 1}: ${character.name.toUpperCase()}`;
        chip.append(portrait, name);
        picks.appendChild(chip);
    });
}

// Classe, estilo e ultimate de cada lutador (painel de destaque da seleção)
const CLASS_NAMES = { melee: 'Corpo a corpo', shooter: 'Atirador', healer: 'Healer', tank: 'Tanque', random: 'Sorte' };
const ROSTER_INFO = {
    titan: { cls: 'melee', style: 'Ex-soldado com braço robótico', ult: 'Soco-foguete com onda de choque' },
    spark: { cls: 'melee', style: 'Robô de segurança abandonado', ult: 'Corrente elétrica que dobra de dano' },
    hades: { cls: 'melee', style: 'Punhos de fogo, queima quem acerta', ult: 'Círculo de fogo que explode no chão' },
    jack: { cls: 'melee', style: 'Amaldiçoado no Halloween, rouba vida', ult: 'Abóbora amaldiçoada' },
    kaze: { cls: 'melee', style: 'Espadachim, cortes que fazem sangrar', ult: 'Tornado que prende o inimigo no ar' },
    kenji: { cls: 'melee', style: 'Combo de socos que acelera a cada acerto', ult: 'Investida explosiva' },
    akane: { cls: 'melee', style: 'Lâmina carmesim que cura a cada golpe', ult: 'Dança das Sete Lâminas: 7 cortes seguidos' },
    fenris: { cls: 'melee', style: 'Fera sombria', ult: 'Salta e dispara lâminas do céu' },
    zarek: { cls: 'melee', style: 'Muda de forma na luta: Rubra 🔴 ou Umbral 🔵', ult: 'Entra no corpo do inimigo e sai rasgando' },
    weaver: { cls: 'melee', style: 'Acrobata com teia e sentido aranha', ult: 'Puxão de teia e chute para cima' },
    bershow: { cls: 'melee', style: 'Espadão que acerta todos na frente; quanto menos vida, mais forte', ult: 'Armadura da Fúria: o visor fecha, solta o Corte Devastador e ele não sente dor por 5 s' },
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
                startGame();
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
    const controlsFor = player => match.inputs[player].type === 'gamepad' ? padList : list(keymapFor(player));
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
