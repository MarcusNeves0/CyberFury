// Controles
// Teclado, controle (gamepad) e navegação dos menus pelo controle.

// --- Controles de Eventos ---
const humanFighters = () => fighters.filter(f => f.keymap && alive(f));
const actionFor = (keymap, key) => Object.keys(keymap).find(action => keymap[action].includes(key));

function handleKeyDown(f, action) {
    switch (action) {
        case 'up': case 'down': case 'left': case 'right':
            f.keys[action] = true;
            return;
        case 'defend':
            if (!f.isDefending && !f.isParalyzed && f.defenseResetCooldown <= 0) {
                f.isPreparingDefense = true;
                f.defenseActivationTimer = 30; // 0.5s
            }
            return;
        case 'punch':
            // Toque solta o soco; segurando carrega o soco forte
            f.isChargingPunch = true;
            f.punchHeld = 0;
            return;
        case 'special':
            if (f.characterType === 'spark') {
                if (!f.isChannelingSpecial && !f.isInsideOpponent && !isPossessed(f)) {
                    f.isChannelingSpecial = true;
                    f.channelTarget = f.target;
                }
            } else {
                f.attack('special');
            }
            return;
    }
}

function handleKeyUp(f, action) {
    switch (action) {
        case 'up': case 'down': case 'left': case 'right':
            f.keys[action] = false;
            return;
        case 'defend':
            f.isPreparingDefense = false;
            if (f.isDefending) {
                f.defenseResetCooldown = 120; // 2s cooldown
            }
            f.isDefending = false;
            return;
        case 'punch':
            if (f.isChargingPunch) {
                f.isChargingPunch = false;
                f.attack('punch');
            }
            return;
        case 'special':
            if (f.characterType === 'spark') f.stopChanneling();
            return;
    }
}

// --- Controles (gamepad) ---
function getGamepads() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
    return [...navigator.getGamepads()].filter(Boolean);
}

// Nome amigável do controle (ex.: "DualSense Wireless Controller (...)" -> "DualSense")
function padName(id) {
    if (/dualsense/i.test(id)) return 'DualSense (PS5)';
    if (/dualshock|054c/i.test(id)) return 'PlayStation';
    if (/xbox|xinput/i.test(id)) return 'Xbox';
    return id.split('(')[0].trim().slice(0, 24) || 'Controle';
}

// Lê analógico, direcional e botões de quem joga no controle; botões viram as mesmas ações do teclado
function pollGamepads() {
    const pads = getGamepads();
    for (const f of fighters) {
        if (f.gamepadIndex === null || !alive(f)) continue;
        const gp = pads.find(p => p.index === f.gamepadIndex);
        if (!gp) continue;
        const pressed = i => gp.buttons[i] && gp.buttons[i].pressed;

        // Analógico esquerdo com zona morta; inclinar pouco anda devagar
        let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
        const magnitude = Math.hypot(x, y);
        if (magnitude < STICK_DEADZONE) {
            // Sem analógico: usa o direcional
            const dpad = normalize((pressed(PAD_DPAD.right) ? 1 : 0) - (pressed(PAD_DPAD.left) ? 1 : 0), (pressed(PAD_DPAD.down) ? 1 : 0) - (pressed(PAD_DPAD.up) ? 1 : 0));
            x = dpad.x; y = dpad.y;
        } else {
            const strength = Math.min(1, (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE));
            x = x / magnitude * strength;
            y = y / magnitude * strength;
        }
        f.padMove = { x, y };

        for (const [action, buttons] of Object.entries(PAD_BUTTONS)) {
            const isDown = buttons.some(pressed);
            const wasDown = f.padPressed[action] || false;
            if (isDown && !wasDown) handleKeyDown(f, action);
            if (!isDown && wasDown) handleKeyUp(f, action);
            f.padPressed[action] = isDown;
        }
    }
}

// --- Menus pelo controle ---
// Com um controle conectado, direcional/analógico move a seleção, ✕ confirma e ◯ volta
let padFocus = null;
let padRepeatAt = 0;
const padMenuPrevious = {};

function menuFocusables() {
    const screen = [hubScreen, selectionScreen, gameOverScreen].find(s => !s.classList.contains('hidden'));
    if (!screen) return [];
    return [...screen.querySelectorAll('.hub-option, .input-option, .hub-start, .character-card, .back-button, button')]
        .filter((el, i, all) => all.indexOf(el) === i && el.offsetParent !== null && !el.disabled && !el.classList.contains('taken'));
}

function setPadFocus(el) {
    document.querySelectorAll('.pad-focus').forEach(e => e.classList.remove('pad-focus'));
    padFocus = el;
    if (el) {
        el.classList.add('pad-focus');
        el.scrollIntoView({ block: 'nearest' });
    }
}

// Vai para o item mais próximo na direção pedida (prefere os que estão bem alinhados)
function moveFocus(dx, dy) {
    const items = menuFocusables();
    if (!items.length) return;
    if (!items.includes(padFocus)) { setPadFocus(items.find(el => !el.classList.contains('back-button')) || items[0]); return; }
    const r = padFocus.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
        if (el === padFocus) continue;
        const b = el.getBoundingClientRect();
        const ex = b.left + b.width / 2 - cx, ey = b.top + b.height / 2 - cy;
        const along = ex * dx + ey * dy;
        if (along <= 4) continue;
        const score = along + Math.abs(ex * dy - ey * dx) * 2;
        if (score < bestScore) { best = el; bestScore = score; }
    }
    if (best) setPadFocus(best);
}

function pollMenuGamepad() {
    if (gameState === 'FIGHT' || !loadingScreen.classList.contains('hidden')) return;
    const connected = Object.values(match.inputs).filter(i => i.type === 'gamepad' && i.index !== null).map(i => i.index);
    const pads = getGamepads().filter(gp => connected.includes(gp.index));
    if (!pads.length) return;

    // Ao abrir uma tela nova, já deixa o primeiro item selecionado (sem ser o "◀ Menu")
    const items = menuFocusables();
    if (items.length && !items.includes(padFocus)) setPadFocus(items.find(el => !el.classList.contains('back-button')) || items[0]);

    for (const gp of pads) {
        const pressed = i => gp.buttons[i] && gp.buttons[i].pressed;
        const previous = padMenuPrevious[gp.index];
        if (!previous) {
            // Primeira leitura: o botão que conectou o controle ainda pode estar apertado; só registra
            padMenuPrevious[gp.index] = { direction: 'held', confirm: pressed(PAD_CONFIRM), back: pressed(PAD_BACK) };
            continue;
        }
        const now = Date.now();

        let dx = (pressed(PAD_DPAD.right) ? 1 : 0) - (pressed(PAD_DPAD.left) ? 1 : 0);
        let dy = (pressed(PAD_DPAD.down) ? 1 : 0) - (pressed(PAD_DPAD.up) ? 1 : 0);
        if (!dx && !dy) {
            if (Math.abs(gp.axes[0] || 0) > 0.5) dx = Math.sign(gp.axes[0]);
            else if (Math.abs(gp.axes[1] || 0) > 0.5) dy = Math.sign(gp.axes[1]);
        }
        const direction = dx || dy ? `${dx},${dy}` : '';
        // Segurando a direção, repete depois de um tempinho
        if (direction && (direction !== previous.direction || now >= padRepeatAt)) {
            moveFocus(dx, dy);
            padRepeatAt = now + (direction !== previous.direction ? 350 : 150);
        }

        const confirm = pressed(PAD_CONFIRM), back = pressed(PAD_BACK);
        if (confirm && !previous.confirm && padFocus && menuFocusables().includes(padFocus)) {
            padFocus.click();
        }
        if (back && !previous.back) {
            if (!selectionScreen.classList.contains('hidden')) goToMenu();
            else if (!gameOverScreen.classList.contains('hidden')) goToMenu();
        }
        padMenuPrevious[gp.index] = { direction, confirm, back };
    }
}
setInterval(pollMenuGamepad, 30);

window.addEventListener('keydown', (e) => {
    if (gameState !== 'FIGHT') return;
    const key = e.key.toLowerCase();
    let used = false;
    for (const f of humanFighters()) {
        const action = actionFor(f.keymap, key);
        if (!action) continue;
        used = true;
        // Repetição automática da tecla segurada é ignorada (ela reiniciava a defesa e o soco forte)
        if (!e.repeat) handleKeyDown(f, action);
    }
    if (used) e.preventDefault(); // setas e espaço não rolam a página
});

window.addEventListener('keyup', (e) => {
    if (gameState !== 'FIGHT') return;
    const key = e.key.toLowerCase();
    for (const f of humanFighters()) {
        const action = actionFor(f.keymap, key);
        if (action) handleKeyUp(f, action);
    }
});
