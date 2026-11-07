// Conexão com a sala do jogo, usada pelo controle no celular (controle.html).
// O jogo abre a sala no PeerJS (phone.js); o celular manda comandos e recebe avisos. O servidor gratuito do
// PeerJS só apresenta um ao outro; depois a conversa é direta.
//
// Mensagens: veja o começo do controle.js. Ao entrar, o celular se apresenta com { t: 'hello', room, kind: 'pad' }.

const PEER_PREFIX = 'cyberfury-sala-'; // o mesmo do phone.js
const ROOM_RETRY_MS = 2500;            // sala não encontrada ou conexão caiu: tenta de novo
const ROOM_TIMEOUT_MS = 5000;          // sem resposta do jogo por 5 s: considera que caiu

// onMessage(msg): mensagem do jogo; onStatus(estado, texto): 'connecting' | 'online' | 'offline'
function createRoomLink({ kind, onMessage, onStatus }) {
    const link = {
        room: null,
        peer: null,
        conn: null,
        retryTimer: null,
        lastPong: 0,
        helloAt: 0,
        seated: false, // o jogo já deu uma vaga (welcome)
        open(room) {
            this.room = room;
            onStatus('connecting', `Conectando na sala ${room}...`);
            if (typeof Peer === 'undefined') { onStatus('offline', 'Sem internet para conectar'); return; }
            this.peer = new Peer();
            this.peer.on('open', () => this.dial());
            this.peer.on('disconnected', () => { if (!this.peer.destroyed) this.peer.reconnect(); });
            this.peer.on('error', err => {
                // Já está jogando: um erro do servidor de apresentação não derruba a conexão direta com o jogo
                // (se ela cair de verdade, o sinal de vida percebe e reconecta)
                if (this.seated && this.conn && this.conn.open) return;
                // Sala ainda não aberta (jogo fechado ou código errado): continua tentando
                onStatus('offline', err.type === 'peer-unavailable'
                    ? `Sala ${this.room} não encontrada. Tentando de novo...`
                    : 'Problema na conexão. Tentando de novo...');
                this.retry();
            });
        },
        dial() {
            if (!this.peer || this.peer.destroyed) return;
            if (this.conn) this.conn.close();
            const conn = this.peer.connect(PEER_PREFIX + this.room, { serialization: 'json', reliable: true });
            this.conn = conn;
            conn.on('open', () => {
                this.lastPong = this.helloAt = Date.now();
                conn.send({ t: 'hello', room: this.room, kind });
            });
            conn.on('data', msg => {
                this.lastPong = Date.now(); // qualquer mensagem do jogo prova que ele continua lá
                if (!msg || msg.t === 'pong') return;
                if (msg.t === 'welcome') this.seated = true;
                if (msg.t === 'bye') {
                    // O jogo mandou sair (sala cheia, trocado por outro controle): não fica tentando de novo
                    this.seated = false;
                    onMessage(msg);
                    onStatus('offline', msg.reason || 'Desconectado');
                    this.close();
                    return;
                }
                onMessage(msg);
            });
            conn.on('close', () => {
                if (this.conn !== conn) return;
                this.seated = false;
                onStatus('offline', 'Conexão caiu. Reconectando...');
                this.retry();
            });
        },
        send(msg) {
            if (this.conn && this.conn.open) this.conn.send(msg);
        },
        retry() {
            clearTimeout(this.retryTimer);
            this.retryTimer = setTimeout(() => this.dial(), ROOM_RETRY_MS);
        },
        // Sinal de vida: ping a cada 1 s; o jogo responde. Sem resposta = caiu (o PC fechou o jogo ou perdeu a rede)
        heartbeat() {
            if (!this.conn || !this.conn.open) return;
            if (!this.seated) {
                // Conectou mas o jogo não respondeu com a vaga: se apresenta de novo
                if (Date.now() - this.helloAt > 3000) {
                    this.helloAt = Date.now();
                    this.conn.send({ t: 'hello', room: this.room, kind });
                }
                return;
            }
            this.conn.send({ t: 'ping' });
            if (Date.now() - this.lastPong > ROOM_TIMEOUT_MS) {
                const conn = this.conn;
                this.conn = null;
                this.seated = false;
                conn.close();
                onStatus('offline', 'O jogo não responde. Reconectando...');
                this.retry();
            }
        },
        close() {
            clearTimeout(this.retryTimer);
            const conn = this.conn, peer = this.peer;
            this.conn = this.peer = null;
            this.seated = false;
            if (conn) conn.close();
            if (peer) peer.destroy();
        },
    };
    setInterval(() => link.heartbeat(), 1000);
    return link;
}
