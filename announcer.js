// Locutor
// Chamadas grandes na tela durante a luta ("LUTEM!", "PRIMEIRO SANGUE!", "COMBO x5!", "DUPLO ABATE!", "K.O.!"),
// com um som de impacto e a voz gravada de um locutor em inglês (sounds/locutor: Voiceover Pack Fighter, de
// Kenney.nl, licença CC0). Uma chamada por vez: as outras esperam na fila; uma mais importante passa na frente.

const ANNOUNCE_TIME = 75;          // passos que cada chamada fica na tela (~1,25 s)
const COMBO_WINDOW = 120;          // golpes seguidos contam como combo se vierem a menos de 2 s um do outro
const COMBO_CALLS = [6, 10, 15, 20];   // quando o texto aparece
const COMBO_VOICE_MIN = 10;            // a voz "Combo!" só a partir de x10...
const COMBO_VOICE_COOLDOWN = 600;      // ...e no máximo uma vez a cada 10 s
const MULTI_KILL_WINDOW = 300;     // abates do mesmo lutador a menos de 5 s um do outro
const ANNOUNCE_QUICK = 45;         // com outras chamadas esperando, cada uma fica menos tempo (~0,75 s)
const ANNOUNCE_STALE = 240;        // chamada que esperou mais de 4 s na fila já não faz sentido: é descartada
const MULTI_KILL_NAMES = { 2: 'DUPLO ABATE!', 3: 'TRIPLO ABATE!', 4: 'QUÁDRUPLO ABATE!', 5: 'MASSACRE!' };
// Falas gravadas (arquivos em sounds/locutor). Tocam por <audio>, que funciona até abrindo o index.html direto.
const VOICE_LINES = ['ready', 'fight', 'begin', 'combo', 'multi_kill', 'sudden_death', 'flawless_victory', 'winner', 'game_over', 'tie', 'choose_your_character'];

const announcer = {
    queue: [],
    current: null,
    t: 0,
    firstBlood: false,
    combos: new Map(),   // lutador -> { hits, last }
    kills: new Map(),    // lutador -> { count, last }
    comboVoiceAt: -Infinity, // última vez que a voz disse "Combo!"
    clips: null,         // nome da fala -> <audio>
    playing: null,       // fala tocando agora (uma nova corta a anterior)

    reset() {
        this.queue = [];
        this.current = null;
        this.t = 0;
        this.firstBlood = false;
        this.combos.clear();
        this.kills.clear();
        this.comboVoiceAt = -Infinity;
    },

    // text: o que aparece; voice: fala gravada (ou lista, uma depois da outra; sem ela, só texto e som);
    // color: cor do texto; priority: maior passa na frente
    call(text, { voice = null, color = '#ffe34a', priority = 1, sub = '' } = {}) {
        const item = { text, voice, color, priority, sub, at: this.t };
        // Uma chamada mais importante que a da tela troca na hora; a que estava só volta para a fila se mal
        // tinha aparecido. As outras entram na fila.
        if (!this.current || priority > this.current.priority) {
            if (this.current && this.current.age < 20) this.queue.push(this.current);
            this.show(item);
        }
        else if (!this.queue.some(q => q.text === text)) this.queue.push(item);
        this.queue.sort((a, b) => b.priority - a.priority || a.at - b.at);
    },

    show(item) {
        this.current = { ...item, age: 0 };
        if (typeof sfx !== 'undefined') sfx.play(item.priority >= 3 ? 'announce_big' : 'announce');
        if (item.voice) this.say(item.voice);
    },

    // Toca uma fala gravada (ou várias seguidas). Com o som do jogo no mudo, fica quieto.
    say(lines) {
        if (typeof Audio === 'undefined' || typeof document === 'undefined') return; // simulação: sem som
        const list = Array.isArray(lines) ? [...lines] : [lines];
        if (!this.clips) {
            this.clips = {};
            for (const name of VOICE_LINES) {
                const a = new Audio(`sounds/locutor/${name}.ogg`);
                a.preload = 'auto';
                this.clips[name] = a;
            }
        }
        const volume = typeof sfx !== 'undefined' && sfx.level !== undefined ? sfx.level : 1;
        if (volume <= 0) return;
        if (this.playing) { this.playing.pause(); this.playing.onended = null; }
        const clip = this.clips[list.shift()];
        if (!clip) return;
        clip.volume = Math.min(1, volume * 1.1);
        clip.currentTime = 0;
        clip.onended = list.length ? () => this.say(list) : null;
        this.playing = clip;
        clip.play().catch(() => {}); // sem permissão de tocar ainda (nenhum clique na página): só o texto
    },

    update() {
        this.t++;
        if (!this.current) return;
        if (++this.current.age >= (this.queue.length ? ANNOUNCE_QUICK : ANNOUNCE_TIME)) {
            this.current = null;
            this.queue = this.queue.filter(q => this.t - q.at <= ANNOUNCE_STALE);
            const next = this.queue.shift();
            if (next) this.show(next);
        }
    },

    // --- Eventos da luta ---
    onStart() {
        this.reset();
        this.call(match.training ? 'TREINO!' : 'LUTEM!', { voice: match.training ? 'begin' : ['ready', 'fight'], color: '#3ff6ff', priority: 2 });
    },

    // Golpe que causou dano: conta o combo de quem bateu e quebra o combo de quem apanhou
    onHit(attacker, target) {
        if (!attacker || attacker === target || !attacker.stats) return;
        this.combos.delete(target);
        const c = this.combos.get(attacker) || { hits: 0, last: -Infinity };
        c.hits = this.t - c.last <= COMBO_WINDOW ? c.hits + 1 : 1;
        c.last = this.t;
        this.combos.set(attacker, c);
        if (!COMBO_CALLS.includes(c.hits)) return;
        const speak = c.hits >= COMBO_VOICE_MIN && this.t - this.comboVoiceAt >= COMBO_VOICE_COOLDOWN;
        if (speak) this.comboVoiceAt = this.t;
        this.call(`COMBO x${c.hits}!`, { voice: speak ? 'combo' : null, color: TEAM_COLORS[attacker.team], sub: attacker.name.toUpperCase() });
    },

    onKO(fighter, killer) {
        if (match.training) return;
        const enemy = killer && killer.team !== fighter.team ? killer : null;
        if (!this.firstBlood) {
            this.firstBlood = true;
            this.call('PRIMEIRO SANGUE!', { color: '#ff4d4d', priority: 2, sub: enemy ? enemy.name.toUpperCase() : '' });
        }
        if (enemy) {
            const k = this.kills.get(enemy) || { count: 0, last: -Infinity };
            k.count = this.t - k.last <= MULTI_KILL_WINDOW ? k.count + 1 : 1;
            k.last = this.t;
            this.kills.set(enemy, k);
            const name = MULTI_KILL_NAMES[Math.min(k.count, 5)];
            if (name) this.call(name, { voice: 'multi_kill', color: TEAM_COLORS[enemy.team], priority: 3, sub: enemy.name.toUpperCase() });
            // Matou com quase nada de vida
            if (alive(enemy) && enemy.health < enemy.maxHealth * 0.15) this.call('POR UM FIO!', { color: '#ffb347', priority: 2, sub: enemy.name.toUpperCase() });
        }
        // Time que ficou com um só lutador de pé (com o outro time ainda inteiro de mais gente)
        if (teamSizeOf(match.mode) > 1) {
            const left = fighters.filter(f => alive(f) && f.team === fighter.team);
            const others = fighters.filter(f => alive(f) && f.team !== fighter.team);
            if (left.length === 1 && others.length > 1) this.call('ÚLTIMO DE PÉ!', { voice: 'sudden_death', color: TEAM_COLORS[fighter.team], priority: 2, sub: left[0].name.toUpperCase() });
        }
    },

    // Fim da luta: o vencedor já aparece na tela de fim; o locutor só grita (K.O.!, ou VITÓRIA PERFEITA! se o
    // time vencedor não perdeu ninguém e quase não apanhou). Devolve o texto, para a tela de fim mostrar junto.
    onGameOver(winningTeam) {
        this.queue = [];
        this.current = null;
        let text = 'EMPATE!', voice = 'tie';
        if (winningTeam !== undefined) {
            const team = fighters.filter(f => f.team === winningTeam);
            const perfect = team.every(f => alive(f) && f.health >= f.maxHealth * 0.8);
            text = perfect ? 'VITÓRIA PERFEITA!' : 'K.O.!';
            voice = perfect ? 'flawless_victory' : ['game_over', 'winner'];
        }
        if (typeof sfx !== 'undefined') sfx.play('announce_big');
        this.say(voice);
        return text;
    },

    // Texto grande no alto da arena: entra crescendo com um tranco, fica e some subindo
    draw() {
        const c = this.current;
        if (!c) return;
        const a = c.age, pop = a < 6 ? 1.6 - (a / 6) * 0.6 : 1, fade = a > ANNOUNCE_TIME - 15 ? (ANNOUNCE_TIME - a) / 15 : 1;
        const shake = a < 8 ? (Math.random() - 0.5) * 6 : 0;
        // um pouco acima do meio da arena (o nome do mapa fica lá em cima no começo da luta)
        const x = (arena.left + arena.right) / 2 + shake, y = (arena.top + arena.bottom) / 2 - 110 - (a > ANNOUNCE_TIME - 15 ? (15 - (ANNOUNCE_TIME - a)) * 1.5 : 0);
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.translate(x, y);
        ctx.scale(pop, pop);
        ctx.font = `bold ${c.priority >= 3 ? 54 : 44}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 9;
        ctx.strokeStyle = '#0a0614';
        ctx.strokeText(c.text, 0, 0);
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 22;
        ctx.fillStyle = c.color;
        ctx.fillText(c.text, 0, 0);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.max(0, fade) * 0.55;
        ctx.fillText(c.text, 0, -2); // brilho por cima
        if (c.sub) {
            ctx.globalAlpha = Math.max(0, fade);
            ctx.font = 'bold 18px Orbitron, sans-serif';
            ctx.lineWidth = 5;
            ctx.strokeText(c.sub, 0, 30);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(c.sub, 0, 30);
        }
        ctx.restore();
    },
};
