// Desenho dos mapas
// Fundo do menu, chão de cada arena, efeitos animados (chuva, flores, luzes) e obstáculos.

// --- Cenário ---
// A rua neon do assets/background.png fica no fundo dos menus
const backgroundImage = new Image();
backgroundImage.src = 'assets/background.png';
backgroundImage.onload = () => { if (gameState !== 'FIGHT' && canvasWidth) drawMenuBackground(); };

function drawMenuBackground() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    if (!backgroundImage.complete || !backgroundImage.naturalWidth) return;
    // Recorte da imagem: usa 88% dela, deixando de fora a marca "ai" do canto inferior direito
    const sx = backgroundImage.naturalWidth * 0.02, sy = backgroundImage.naturalHeight * 0.02;
    const sw = backgroundImage.naturalWidth * 0.88, sh = backgroundImage.naturalHeight * 0.88;
    const scale = Math.max(canvasWidth / sw, canvasHeight / sh);
    const w = sw * scale, h = sh * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backgroundImage, sx, sy, sw, sh, (canvasWidth - w) / 2, canvasHeight - h, w, h);
}

// Chão da arena visto de cima: praça neon com piso, poças, centro marcado e muretas brilhantes.
// Desenhado uma vez numa imagem guardada; a cada quadro só copiamos ela.
let floorCache = null;

// --- Desenho dos mapas ---
// Números "aleatórios" fixos por posição: o chão desenhado fica sempre igual
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function renderArenaFloor(g) {
    if (mapId === 'rooftop') renderRooftopFloor(g);
    else if (mapId === 'lab') renderLabFloor(g);
    else if (mapId === 'garden') renderGardenFloor(g);
    else renderPlazaFloor(g);
}

// Telhado: laje de concreto molhada, heliponto, grades de ventilação, cabos e a cidade lá embaixo
function renderRooftopFloor(g) {
    const r = seeded(11);
    const w = arena.right - arena.left, h = arena.bottom - arena.top, pad = 22;
    // Cidade lá embaixo, vista de cima
    g.fillStyle = '#05040c';
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let i = 0; i < 70; i++) {
        const bx = r() * WORLD_W, by = r() * WORLD_H, bw = 30 + r() * 70, bh = 30 + r() * 70;
        g.fillStyle = `rgb(${12 + r() * 10}, ${10 + r() * 8}, ${24 + r() * 14})`;
        g.fillRect(bx, by, bw, bh);
        for (let k = 0; k < 6; k++) {
            g.fillStyle = ['#ffe34a', '#00ffff', '#ff4dff', '#ff9a5a'][Math.floor(r() * 4)];
            g.globalAlpha = 0.5;
            g.fillRect(bx + r() * bw, by + r() * bh, 2, 2);
            g.globalAlpha = 1;
        }
    }
    // Laje
    g.fillStyle = '#1b1c26';
    g.fillRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);
    const slab = 80;
    for (let x = arena.left - pad; x < arena.right + pad; x += slab) {
        for (let y = arena.top - pad; y < arena.bottom + pad; y += slab) {
            const shade = r() * 0.05;
            g.fillStyle = `rgba(255, 255, 255, ${shade})`;
            g.fillRect(x + 1, y + 1, slab - 2, slab - 2);
        }
    }
    g.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    g.lineWidth = 2;
    for (let x = arena.left - pad; x <= arena.right + pad; x += slab) { g.beginPath(); g.moveTo(x, arena.top - pad); g.lineTo(x, arena.bottom + pad); g.stroke(); }
    for (let y = arena.top - pad; y <= arena.bottom + pad; y += slab) { g.beginPath(); g.moveTo(arena.left - pad, y); g.lineTo(arena.right + pad, y); g.stroke(); }
    // Manchas de umidade e remendos de piche
    for (let i = 0; i < 26; i++) {
        const x = arena.left + r() * w, y = arena.top + r() * h, rad = 10 + r() * 30;
        const grad = g.createRadialGradient(x, y, 1, x, y, rad);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(5, 5, 10, 0.8)';
    g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
        let x = arena.left + r() * w, y = arena.top + r() * h;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); }
        g.stroke();
    }
    // Heliponto apagado no centro
    const cx = arena.left + w / 2, cy = arena.top + h / 2;
    g.save();
    g.strokeStyle = 'rgba(255, 210, 60, 0.28)';
    g.lineWidth = 5;
    g.beginPath(); g.arc(cx, cy, 78, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255, 210, 60, 0.22)';
    g.fillRect(cx - 26, cy - 30, 10, 60); g.fillRect(cx + 16, cy - 30, 10, 60); g.fillRect(cx - 16, cy - 5, 32, 10);
    g.restore();
    // Grades de ventilação
    for (const [fx, fy] of [[0.15, 0.8], [0.85, 0.2], [0.42, 0.25], [0.58, 0.75]]) {
        const p = arenaPoint(fx, fy);
        g.fillStyle = '#101119';
        g.fillRect(p.x - 18, p.y - 12, 36, 24);
        g.strokeStyle = '#3a3c4c';
        g.lineWidth = 1;
        for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(p.x - 16, p.y - 10 + k * 4); g.lineTo(p.x + 16, p.y - 10 + k * 4); g.stroke(); }
        g.strokeRect(p.x - 18, p.y - 12, 36, 24);
    }
    // Cabos grossos correndo pelo chão
    g.strokeStyle = '#0b0b12';
    g.lineWidth = 4;
    g.lineWidth = 3;
    for (let i = 0; i < 2; i++) {
        const y0 = arena.top + r() * h;
        g.beginPath(); g.moveTo(arena.left - pad, y0);
        g.bezierCurveTo(arena.left + w * 0.2, y0 + (r() - 0.5) * 120, arena.left + w * 0.25, y0 + (r() - 0.5) * 120, arena.left + w * (0.15 + r() * 0.15), arena.top + r() * h);
        g.stroke();
    }
    // Fundo escuro das poças (o brilho delas é animado)
    for (const p of mapState.puddles) {
        g.fillStyle = 'rgba(6, 8, 20, 0.85)';
        g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); g.fill();
    }
    // Mureta do telhado com faixa neon
    g.save();
    g.fillStyle = '#2a2b38';
    g.fillRect(arena.left - pad - 12, arena.top - pad - 12, w + pad * 2 + 24, 12);
    g.fillRect(arena.left - pad - 12, arena.bottom + pad, w + pad * 2 + 24, 12);
    g.fillRect(arena.left - pad - 12, arena.top - pad, 12, h + pad * 2);
    g.fillRect(arena.right + pad, arena.top - pad, 12, h + pad * 2);
    g.strokeStyle = '#00ffff';
    g.shadowColor = '#00ffff';
    g.shadowBlur = 12;
    g.lineWidth = 2;
    g.strokeRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);
    g.restore();
}

// Laboratório: placas de metal, faixas de perigo, piso arrebentado, gosma, papéis e portas quebradas
function renderLabFloor(g) {
    const r = seeded(23);
    const w = arena.right - arena.left, h = arena.bottom - arena.top, pad = 22;
    g.fillStyle = '#0a0b0e';
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    // Paredes em volta
    g.fillStyle = '#20242c';
    g.fillRect(arena.left - pad - 26, arena.top - pad - 26, w + pad * 2 + 52, h + pad * 2 + 52);
    g.strokeStyle = '#2e3440';
    g.lineWidth = 2;
    for (let x = arena.left - pad - 26; x < arena.right + pad + 26; x += 56) {
        g.strokeRect(x, arena.top - pad - 26, 56, 26);
        g.strokeRect(x, arena.bottom + pad, 56, 26);
    }
    // Placas de metal do chão
    const plate = 64;
    for (let x = arena.left - pad; x < arena.right + pad; x += plate) {
        for (let y = arena.top - pad; y < arena.bottom + pad; y += plate) {
            const v = 26 + r() * 8;
            g.fillStyle = `rgb(${v}, ${v + 3}, ${v + 7})`;
            g.fillRect(x, y, plate - 2, plate - 2);
            g.fillStyle = 'rgba(255, 255, 255, 0.05)';
            g.fillRect(x, y, plate - 2, 2);
            g.fillStyle = '#4a505c';
            for (const [rx, ry] of [[4, 4], [plate - 8, 4], [4, plate - 8], [plate - 8, plate - 8]]) g.fillRect(x + rx, y + ry, 2, 2);
            // Algumas placas arrancadas: buraco com canos por baixo
            if (r() < 0.025) {
                g.fillStyle = '#060608';
                g.beginPath();
                g.moveTo(x + 6, y + 10); g.lineTo(x + plate - 14, y + 6); g.lineTo(x + plate - 6, y + plate - 18); g.lineTo(x + 20, y + plate - 8);
                g.closePath(); g.fill();
                g.strokeStyle = '#6b4a2e';
                g.lineWidth = 3;
                g.beginPath(); g.moveTo(x + 8, y + 26); g.lineTo(x + plate - 10, y + 30); g.stroke();
                g.strokeStyle = '#3a6b5a';
                g.beginPath(); g.moveTo(x + 14, y + 40); g.lineTo(x + plate - 12, y + 44); g.stroke();
            }
        }
    }
    // Faixas de perigo nas áreas de nascimento
    for (const x0 of [arena.left - pad, arena.right + pad - 18]) {
        g.save();
        g.beginPath(); g.rect(x0, arena.top - pad, 18, h + pad * 2); g.clip();
        for (let y = arena.top - pad - 20; y < arena.bottom + pad; y += 20) {
            g.fillStyle = '#d8b028';
            g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 18, y - 10); g.lineTo(x0 + 18, y); g.lineTo(x0, y + 10); g.closePath(); g.fill();
        }
        g.restore();
    }
    // Rachaduras, marcas de queimado, gosma verde e papéis espalhados
    g.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
        let x = arena.left + r() * w, y = arena.top + r() * h;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 34; y += (r() - 0.5) * 34; g.lineTo(x, y); }
        g.stroke();
    }
    for (let i = 0; i < 6; i++) {
        const x = arena.left + r() * w, y = arena.top + r() * h, rad = 20 + r() * 26;
        const grad = g.createRadialGradient(x, y, 2, x, y, rad);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 7; i++) {
        const x = arena.left + r() * w, y = arena.top + r() * h;
        g.fillStyle = 'rgba(80, 200, 70, 0.35)';
        g.beginPath(); g.ellipse(x, y, 14 + r() * 24, 6 + r() * 10, r() * 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(160, 255, 120, 0.4)';
        g.beginPath(); g.arc(x - 3, y - 2, 2, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 22; i++) {
        const x = arena.left + r() * w, y = arena.top + r() * h;
        g.save(); g.translate(x, y); g.rotate(r() * 6.3);
        g.fillStyle = r() < 0.8 ? 'rgba(220, 225, 230, 0.55)' : 'rgba(255, 220, 120, 0.55)';
        g.fillRect(-5, -7, 10, 14);
        g.fillStyle = 'rgba(40, 50, 70, 0.5)';
        for (let k = 0; k < 4; k++) g.fillRect(-3, -5 + k * 3, 6, 1);
        g.restore();
    }
    // Portas quebradas nas paredes de cima e de baixo
    const doors = match.mode === '1v1' ? [[0.25, 'top'], [0.72, 'bottom']] : [[0.2, 'top'], [0.78, 'top'], [0.35, 'bottom'], [0.82, 'bottom']];
    for (const [fx, side] of doors) {
        const x = arenaPoint(fx, 0).x, y = side === 'top' ? arena.top - pad - 26 : arena.bottom + pad;
        g.fillStyle = '#030305';
        g.fillRect(x - 30, y, 60, 26);
        g.fillStyle = '#58606e';
        g.fillRect(x - 34, y, 4, 26); g.fillRect(x + 30, y, 4, 26);
        // Folha da porta torta, pendurada
        g.save();
        g.translate(x - 28, side === 'top' ? y + 26 : y);
        g.rotate(side === 'top' ? 0.55 : -0.55);
        g.fillStyle = '#3c4350';
        g.fillRect(0, side === 'top' ? 0 : -8, 52, 8);
        g.fillStyle = '#c23a3a';
        g.fillRect(6, side === 'top' ? 2 : -6, 14, 4);
        g.restore();
        // Placa de "perigo" ao lado
        g.fillStyle = '#d8b028';
        g.beginPath(); g.moveTo(x + 44, y + 6); g.lineTo(x + 52, y + 20); g.lineTo(x + 36, y + 20); g.closePath(); g.fill();
        g.fillStyle = '#000';
        g.fillRect(x + 43, y + 10, 2, 6);
    }
    // Cano furado na parede de cima (solta vapor)
    const pipe = arenaPoint(0.5, 0);
    g.fillStyle = '#5a6270';
    g.fillRect(arena.left - pad - 26, arena.top - pad - 14, w + pad * 2 + 52, 6);
    g.fillStyle = '#2a2e36';
    g.fillRect(pipe.x + 74, arena.top - pad - 16, 12, 10);
    // Borda
    g.strokeStyle = '#d8b028';
    g.lineWidth = 2;
    g.setLineDash([12, 8]);
    g.strokeRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);
    g.setLineDash([]);
}

// Jardim: grama com textura, caminho de pedras, canteiros, estufa de vidro e a cidade lá fora
function renderGardenFloor(g) {
    const r = seeded(37);
    const w = arena.right - arena.left, h = arena.bottom - arena.top, pad = 22;
    // Lá fora: vidro da estufa com a cidade à noite
    g.fillStyle = '#0a1420';
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let i = 0; i < 160; i++) {
        g.fillStyle = ['#ffe34a', '#00ffff', '#ff4dff'][Math.floor(r() * 3)];
        g.globalAlpha = 0.35;
        g.fillRect(r() * WORLD_W, r() * WORLD_H, 2, 2);
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(120, 170, 160, 0.35)';
    g.lineWidth = 3;
    for (let x = 0; x < WORLD_W; x += 90) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, WORLD_H); g.stroke(); }
    for (let y = 0; y < WORLD_H; y += 90) { g.beginPath(); g.moveTo(0, y); g.lineTo(WORLD_W, y); g.stroke(); }
    // Grama
    g.fillStyle = '#1d4428';
    g.fillRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);
    for (let i = 0; i < 46; i++) {
        const x = arena.left + r() * w, y = arena.top + r() * h, rad = 30 + r() * 60;
        const grad = g.createRadialGradient(x, y, 2, x, y, rad);
        grad.addColorStop(0, r() < 0.5 ? 'rgba(60, 120, 60, 0.35)' : 'rgba(10, 40, 20, 0.35)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = grad; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 2600; i++) {
        const x = arena.left - pad + r() * (w + pad * 2), y = arena.top - pad + r() * (h + pad * 2);
        g.fillStyle = ['#2c6a38', '#24582f', '#3a8044', '#1a4a26'][Math.floor(r() * 4)];
        g.fillRect(x, y, 1, 2 + r() * 3);
    }
    // Caminho de pedras serpenteando de um lado ao outro
    const cy = arena.top + h / 2;
    for (let x = arena.left - pad; x < arena.right + pad; x += 16) {
        const y = cy + Math.sin((x - arena.left) / w * Math.PI * 2) * h * 0.18;
        for (const dy of [-12, 6]) {
            const sx = x + (r() - 0.5) * 6, sy = y + dy + (r() - 0.5) * 6;
            g.fillStyle = 'rgba(0, 0, 0, 0.35)';
            g.beginPath(); g.ellipse(sx + 1, sy + 2, 8, 5, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = `rgb(${110 + r() * 30}, ${110 + r() * 25}, ${118 + r() * 25})`;
            g.beginPath(); g.ellipse(sx, sy, 7.5, 5, r(), 0, Math.PI * 2); g.fill();
            g.fillStyle = 'rgba(255, 255, 255, 0.15)';
            g.beginPath(); g.ellipse(sx - 2, sy - 1.5, 3, 1.5, 0, 0, Math.PI * 2); g.fill();
        }
    }
    // Canteiros de terra
    for (let i = 0; i < 8; i++) {
        const x = arena.left + r() * w, y = arena.top + r() * h;
        g.fillStyle = 'rgba(70, 45, 25, 0.55)';
        g.beginPath(); g.ellipse(x, y, 30 + r() * 30, 12 + r() * 10, 0, 0, Math.PI * 2); g.fill();
    }
    // Moldura da estufa com lampiões
    g.save();
    g.strokeStyle = '#4a6a5a';
    g.lineWidth = 6;
    g.strokeRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);
    g.strokeStyle = 'rgba(160, 255, 200, 0.5)';
    g.shadowColor = '#7cffb0';
    g.shadowBlur = 10;
    g.lineWidth = 1.5;
    g.strokeRect(arena.left - pad + 5, arena.top - pad + 5, w + pad * 2 - 10, h + pad * 2 - 10);
    g.restore();
    for (let i = 0; i <= 6; i++) {
        for (const y of [arena.top - pad, arena.bottom + pad]) {
            const x = arena.left - pad + (w + pad * 2) * i / 6;
            const glow = g.createRadialGradient(x, y, 1, x, y, 60);
            glow.addColorStop(0, 'rgba(255, 210, 130, 0.4)');
            glow.addColorStop(1, 'rgba(255, 210, 130, 0)');
            g.fillStyle = glow; g.beginPath(); g.arc(x, y, 60, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#ffd98a';
            g.fillRect(x - 3, y - 4, 6, 8);
        }
    }
}

// Camada do chão que se mexe (desenhada logo depois do chão fixo)
function drawMapGround() {
    const s = mapState, t = s.t;
    if (mapId === 'rooftop') {
        // Poças refletindo os letreiros, com ondinhas da chuva
        s.puddles.forEach((p, i) => {
            const sign = s.signs[i];
            const color = sign ? sign.color : '#00ffff';
            const lit = sign && sign.flicker > 0 ? 0.08 : 0.22 + Math.sin(t * 0.05 + i) * 0.05;
            ctx.save();
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); ctx.clip();
            const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.rx);
            grad.addColorStop(0, hexAlpha(color, lit));
            grad.addColorStop(1, hexAlpha(color, 0.03));
            ctx.fillStyle = grad;
            ctx.fillRect(p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
            // Aviso do choque: a poça fica estalando
            if (sign && sign.warn > 0) {
                ctx.strokeStyle = `rgba(160, 220, 255, ${0.4 + Math.random() * 0.5})`;
                ctx.lineWidth = 1.5;
                for (let k = 0; k < 4; k++) {
                    let x = p.x + rand(-p.rx, p.rx), y = p.y + rand(-p.ry, p.ry);
                    ctx.beginPath(); ctx.moveTo(x, y);
                    for (let j = 0; j < 4; j++) { x += rand(-12, 12); y += rand(-6, 6); ctx.lineTo(x, y); }
                    ctx.stroke();
                }
            }
            ctx.restore();
            ctx.strokeStyle = 'rgba(150, 180, 220, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); ctx.stroke();
        });
        if (s.puddleShock && s.puddleShock.life-- > 0) {
            const p = s.puddleShock.puddle;
            ctx.fillStyle = `rgba(190, 230, 255, ${s.puddleShock.life / 18 * 0.7})`;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx + 6, p.ry + 4, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(190, 210, 255, 0.35)';
        ctx.lineWidth = 1;
        for (const r of s.ripples) {
            ctx.globalAlpha = r.life / 26;
            ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (const p of s.splashes) {
            ctx.fillStyle = `rgba(190, 210, 255, ${p.life / 10 * 0.5})`;
            ctx.fillRect(p.x - 2, p.y, 1, 1); ctx.fillRect(p.x + 2, p.y - 1, 1, 1); ctx.fillRect(p.x, p.y - 2, 1, 1);
        }
        s.signs.forEach(drawNeonSign);
    } else if (mapId === 'lab') {
        for (const g of s.gas) {
            const a = Math.min(1, g.life / 60) * 0.35;
            for (let k = 0; k < 3; k++) {
                const ox = Math.sin(t * 0.03 + k * 2) * 12, oy = Math.cos(t * 0.025 + k) * 8;
                const grad = ctx.createRadialGradient(g.x + ox, g.y + oy, 4, g.x + ox, g.y + oy, g.r);
                grad.addColorStop(0, `rgba(120, 255, 90, ${a})`);
                grad.addColorStop(1, 'rgba(120, 255, 90, 0)');
                ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(g.x + ox, g.y + oy, g.r, 0, Math.PI * 2); ctx.fill();
            }
        }
        for (const d of s.drips) {
            ctx.strokeStyle = `rgba(150, 255, 140, ${d.life / 30 * 0.4})`;
            ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        }
        // Fios soltos: cabo caído com a ponta descascada
        for (const wire of s.wires) {
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(wire.x1, wire.y1); ctx.quadraticCurveTo(wire.cx, wire.cy, wire.x2, wire.y2); ctx.stroke();
            ctx.strokeStyle = wire.active > 0 ? '#ffe34a' : '#c23a3a';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(wire.x1, wire.y1); ctx.quadraticCurveTo(wire.cx, wire.cy, wire.x2, wire.y2); ctx.stroke();
            ctx.fillStyle = '#d88a3a';
            ctx.fillRect(wire.x2 - 3, wire.y2 - 3, 6, 6);
            if (wire.active > 0) {
                const glow = ctx.createRadialGradient(wire.x2, wire.y2, 1, wire.x2, wire.y2, 34);
                glow.addColorStop(0, `rgba(255, 240, 140, ${0.35 + Math.random() * 0.3})`);
                glow.addColorStop(1, 'rgba(255, 240, 140, 0)');
                ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(wire.x2, wire.y2, 34, 0, Math.PI * 2); ctx.fill();
            }
        }
        // Emissores do laser em cima e embaixo
        const L = s.laser;
        for (const y of [arena.top - 22, arena.bottom + 22]) {
            const x = L.phase === 'idle' ? (L.dir > 0 ? arena.left - 10 : arena.right + 10) : L.x;
            ctx.fillStyle = '#3a404c';
            ctx.fillRect(x - 8, y - 6, 16, 12);
            ctx.fillStyle = L.phase !== 'idle' || Math.floor(t / 30) % 2 ? '#ff3030' : '#601010';
            ctx.fillRect(x - 3, y - 3, 6, 6);
        }
    } else if (mapId === 'garden') {
        drawFlowers();
        for (const p of pickups) drawHealingPickup(p);
    }
}

// Letreiro neon na borda do telhado (pisca quando está em curto)
function drawNeonSign(sign) {
    const off = sign.flicker > 0 && Math.random() < 0.6;
    ctx.save();
    ctx.font = 'bold 15px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    const tw = sign.text.length * 11 + 20;
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(sign.x - tw / 2, sign.y - 12, tw, 24);
    ctx.strokeStyle = '#3a3c4c';
    ctx.lineWidth = 2;
    ctx.strokeRect(sign.x - tw / 2, sign.y - 12, tw, 24);
    if (!off) {
        ctx.shadowColor = sign.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = sign.color;
    } else {
        ctx.fillStyle = '#2a2a34';
    }
    ctx.fillText(sign.text, sign.x, sign.y + 6);
    ctx.restore();
}

// Converte '#rrggbb' para rgba com transparência
function hexAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Flores e tufos de grama: balançam com o vento e se abrem quando alguém passa por cima
function drawFlowers() {
    const t = mapState.t;
    const walkers = fighters.filter(f => alive(f) && !f.isInsideOpponent);
    for (const fl of mapState.flowers) {
        let sway = Math.sin(t * 0.04 + fl.phase + fl.x * 0.01) * 2.2;
        let bendY = 0;
        for (const f of walkers) {
            const dx = fl.x - f.x, dy = fl.y - f.y, d = Math.hypot(dx, dy);
            if (d < 30 && d > 0) { const k = (30 - d) / 30; sway += dx / d * 9 * k; bendY += 4 * k; }
        }
        const tipX = fl.x + sway, tipY = fl.y - fl.h + bendY;
        if (fl.grass) {
            ctx.strokeStyle = '#3f9a4c';
            ctx.lineWidth = 1.5;
            for (const off of [-3, 0, 3]) {
                ctx.beginPath(); ctx.moveTo(fl.x + off, fl.y); ctx.lineTo(tipX + off * 1.4, tipY + 2 + Math.abs(off)); ctx.stroke();
            }
            continue;
        }
        ctx.strokeStyle = '#2f7a3a';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(fl.x, fl.y); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.fillStyle = fl.color;
        const sz = fl.size;
        ctx.fillRect(tipX - sz, tipY - sz / 2, sz * 2, sz);
        ctx.fillRect(tipX - sz / 2, tipY - sz, sz, sz * 2);
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(tipX - 0.75, tipY - 0.75, 1.5, 1.5);
    }
}

// Flor de cura: brilha, flutua e solta brilhinhos
function drawHealingPickup(p) {
    const bob = Math.sin(p.t * 0.08) * 3;
    const glow = ctx.createRadialGradient(p.x, p.y - 10, 2, p.x, p.y - 10, 30);
    glow.addColorStop(0, 'rgba(160, 255, 140, 0.55)');
    glow.addColorStop(1, 'rgba(160, 255, 140, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(p.x, p.y - 10, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    const y = p.y - 14 + bob;
    for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + p.t * 0.02;
        ctx.fillStyle = i % 2 ? '#c8ffb8' : '#7cff6b';
        ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 3, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff6a8';
    ctx.beginPath(); ctx.arc(p.x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    if (p.t % 12 === 0) particles.push(new Particle(p.x + rand(-8, 8), y, '#d8ffc8', 0, { x: rand(-0.4, 0.4), y: -0.8 }));
}

// Por cima de tudo: chuva e relâmpago, raio laser e luzes piscando, pétalas e vaga-lumes
function drawMapOverlay() {
    const s = mapState, t = s.t;
    if (mapId === 'rooftop') {
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.5)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (const d of s.rain) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.22, d.y - d.len); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(10, 10, 30, 0.18)';
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        if (s.lightning > 0.02) {
            ctx.fillStyle = `rgba(220, 230, 255, ${s.lightning * 0.45})`;
            ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        }
    } else if (mapId === 'lab') {
        const L = s.laser;
        if (L.phase !== 'idle') {
            const top = arena.top - 22, bottom = arena.bottom + 22, gap = LAB_LASER_GAP / 2;
            ctx.save();
            if (L.phase === 'warn') {
                ctx.strokeStyle = `rgba(255, 60, 60, ${0.25 + Math.sin(t * 0.6) * 0.2})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([6, 8]);
            } else {
                ctx.strokeStyle = '#ff3030';
                ctx.shadowColor = '#ff2020';
                ctx.shadowBlur = 18;
                ctx.lineWidth = 4;
            }
            ctx.beginPath();
            ctx.moveTo(L.x, top); ctx.lineTo(L.x, L.gapY - gap);
            ctx.moveTo(L.x, L.gapY + gap); ctx.lineTo(L.x, bottom);
            ctx.stroke();
            if (L.phase === 'sweep') {
                ctx.strokeStyle = '#ffd0d0';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 0;
                ctx.stroke();
            }
            ctx.restore();
        }
        // Luz fraca: escurece a sala e as lâmpadas que funcionam iluminam em volta
        ctx.fillStyle = 'rgba(0, 4, 10, 0.32)';
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        for (const lamp of s.lamps) {
            if (!lamp.on) continue;
            const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 150);
            glow.addColorStop(0, 'rgba(200, 255, 230, 0.13)');
            glow.addColorStop(1, 'rgba(200, 255, 230, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 150, 0, Math.PI * 2); ctx.fill();
        }
        for (const p of s.steam) {
            ctx.fillStyle = `rgba(210, 220, 230, ${p.life / 70 * 0.18})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        for (const d of s.dust) {
            ctx.fillStyle = `rgba(220, 230, 210, ${d.a})`;
            ctx.fillRect(d.x, d.y, 1.5, 1.5);
        }
    } else if (mapId === 'garden') {
        // Raios de sol entrando pelo vidro
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
            const x = arena.left + (arena.right - arena.left) * (0.15 + i * 0.25) + Math.sin(t * 0.004 + i) * 20;
            ctx.fillStyle = 'rgba(255, 240, 190, 0.035)';
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 260, WORLD_H); ctx.lineTo(x + 140, WORLD_H);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        for (const p of s.petals) {
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.spin);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        for (const f of s.fireflies) {
            const a = 0.3 + Math.max(0, Math.sin(t * 0.06 + f.phase)) * 0.7;
            const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 8);
            glow.addColorStop(0, `rgba(230, 255, 140, ${a})`);
            glow.addColorStop(1, 'rgba(230, 255, 140, 0)');
            ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(f.x, f.y, 8, 0, Math.PI * 2); ctx.fill();
        }
        for (const b of s.butterflies) {
            const flap = Math.abs(Math.sin(t * 0.35 + b.phase));
            ctx.fillStyle = b.color;
            ctx.beginPath(); ctx.ellipse(b.x - 3 * flap, b.y, 4 * flap + 0.5, 3, -0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(b.x + 3 * flap, b.y, 4 * flap + 0.5, 3, 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1a1024';
            ctx.fillRect(b.x - 0.5, b.y - 2, 1, 4);
        }
        for (const d of s.fountainDrops) {
            ctx.fillStyle = 'rgba(190, 240, 255, 0.8)';
            ctx.fillRect(d.x, d.y - d.z, 2, 2);
        }
    }
    // Nome do mapa no começo da luta
    if (s.banner > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, s.banner / 30);
        ctx.font = 'bold 34px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ff4dff';
        ctx.shadowBlur = 18;
        ctx.fillText(MAPS[mapId].name, WORLD_W / 2, arena.top + 60);
        ctx.restore();
    }
}

// --- Obstáculos de cada mapa ---
function drawObstacle(o) {
    switch (o.kind) {
        case 'tree': return drawTree(o);
        case 'box': return drawBox(o);
        case 'watertank': return drawWaterTank(o);
        case 'ac': return drawAC(o);
        case 'antenna': return drawAntenna(o);
        case 'labtank': return drawLabTank(o);
        case 'console': return drawConsole(o);
        case 'rack': return drawRack(o);
        case 'doorframe': return drawDoorFrame(o);
        case 'planter': return drawPlanter(o);
        case 'gardentree': return drawGardenTree(o);
        case 'fountain': return drawFountain(o);
        case 'chomper': return drawChomper(o);
    }
}

function shadow(x, y, rx, ry) {
    ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

// Caixa d'água redonda com escada e água pingando
function drawWaterTank(o) {
    shadow(o.x + 4, o.y + 4, o.r + 6, o.r * 0.55);
    ctx.fillStyle = '#4a5466';
    ctx.fillRect(o.x - o.r, o.y - 34, o.r * 2, 34);
    ctx.fillStyle = '#5c687c';
    ctx.fillRect(o.x - o.r, o.y - 34, 8, 34);
    ctx.fillStyle = '#6c7a90';
    ctx.beginPath(); ctx.ellipse(o.x, o.y - 34, o.r, o.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a303c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(o.x, o.y - 34, o.r, o.r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    for (const y of [o.y - 24, o.y - 12]) { ctx.beginPath(); ctx.moveTo(o.x - o.r, y); ctx.lineTo(o.x + o.r, y); ctx.stroke(); }
    ctx.strokeRect(o.x - o.r, o.y - 34, o.r * 2, 34);
    ctx.strokeStyle = '#8a94a8';
    ctx.lineWidth = 1.5;
    for (let y = o.y - 30; y < o.y; y += 6) { ctx.beginPath(); ctx.moveTo(o.x + o.r - 10, y); ctx.lineTo(o.x + o.r - 4, y); ctx.stroke(); }
    if (mapState.t % 40 === 0) particles.push(new Particle(o.x - o.r + 4, o.y - 8, '#9fc8ff', 0, { x: 0, y: 1.5 }));
}

// Ar-condicionado com ventilador girando
function drawAC(o) {
    shadow(o.x + o.w / 2 + 3, o.y + o.h + 2, o.w / 2 + 4, 6);
    const top = 12;
    ctx.fillStyle = '#7d8696';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#a3acbc';
    ctx.fillRect(o.x, o.y - top, o.w, top + 2);
    const cx = o.x + o.w / 2, cy = o.y - top / 2;
    ctx.fillStyle = '#2a303c';
    ctx.beginPath(); ctx.ellipse(cx, cy, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c8d0dc';
    ctx.lineWidth = 2;
    const a = mapState.t * 0.4;
    for (let k = 0; k < 3; k++) {
        const ang = a + k * 2.09;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 10, cy + Math.sin(ang) * 4); ctx.stroke();
    }
    ctx.strokeStyle = '#4a5260';
    ctx.lineWidth = 1;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(o.x + 4, o.y + 5 + k * 5); ctx.lineTo(o.x + o.w - 4, o.y + 5 + k * 5); ctx.stroke(); }
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y - top, o.w, o.h + top);
}

// Antena com luz vermelha piscando
function drawAntenna(o) {
    shadow(o.x, o.y, 12, 5);
    ctx.fillStyle = '#3a3e4c';
    ctx.fillRect(o.x - 6, o.y - 6, 12, 8);
    ctx.strokeStyle = '#8a94a8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(o.x, o.y - 4); ctx.lineTo(o.x, o.y - 58); ctx.stroke();
    ctx.lineWidth = 1;
    for (const y of [-44, -30]) { ctx.beginPath(); ctx.moveTo(o.x - 8, o.y + y); ctx.lineTo(o.x + 8, o.y + y); ctx.stroke(); }
    const on = Math.floor(mapState.t / 30) % 2 === 0;
    if (on) {
        const glow = ctx.createRadialGradient(o.x, o.y - 60, 1, o.x, o.y - 60, 14);
        glow.addColorStop(0, 'rgba(255, 60, 60, 0.8)');
        glow.addColorStop(1, 'rgba(255, 60, 60, 0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(o.x, o.y - 60, 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = on ? '#ff4040' : '#601818';
    ctx.fillRect(o.x - 2, o.y - 62, 4, 4);
}

// Tanque de vidro com líquido verde, bolhas e uma criatura flutuando (racha conforme apanha)
function drawLabTank(o) {
    const t = mapState.t;
    shadow(o.x + 3, o.y + 3, o.r + 6, o.r * 0.5);
    ctx.fillStyle = '#3a404c';
    ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(80, 220, 110, 0.55)';
    ctx.fillRect(o.x - o.r + 3, o.y - 50, o.r * 2 - 6, 50);
    // Criatura
    const bob = Math.sin(t * 0.03 + o.x) * 2;
    ctx.fillStyle = 'rgba(30, 60, 40, 0.75)';
    ctx.beginPath(); ctx.ellipse(o.x, o.y - 28 + bob, 7, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(o.x - 1, o.y - 18 + bob, 2, 10);
    ctx.fillStyle = 'rgba(255, 240, 120, 0.8)';
    ctx.fillRect(o.x - 3, o.y - 32 + bob, 2, 2); ctx.fillRect(o.x + 1, o.y - 32 + bob, 2, 2);
    // Bolhas subindo
    ctx.fillStyle = 'rgba(200, 255, 210, 0.7)';
    for (let k = 0; k < 4; k++) {
        const by = o.y - ((t * 0.6 + k * 13 + o.x) % 48);
        ctx.fillRect(o.x - o.r + 6 + ((k * 7 + o.x) % (o.r * 2 - 12)), by, 2, 2);
    }
    // Vidro
    ctx.fillStyle = 'rgba(200, 240, 255, 0.18)';
    ctx.fillRect(o.x - o.r + 3, o.y - 54, 5, 52);
    ctx.strokeStyle = 'rgba(200, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(o.x - o.r + 2, o.y - 54, o.r * 2 - 4, 54);
    ctx.fillStyle = '#5a6270';
    ctx.fillRect(o.x - o.r, o.y - 60, o.r * 2, 7);
    ctx.fillRect(o.x - o.r, o.y - 3, o.r * 2, 5);
    if (o.hp < o.maxHp * 0.7) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(o.x + 4, o.y - 40); ctx.lineTo(o.x + 9, o.y - 30); ctx.lineTo(o.x + 5, o.y - 22); ctx.lineTo(o.x + 11, o.y - 14); ctx.stroke();
    }
    if (o.hp < o.maxHp * 0.4) {
        ctx.beginPath(); ctx.moveTo(o.x - 8, o.y - 48); ctx.lineTo(o.x - 3, o.y - 38); ctx.lineTo(o.x - 10, o.y - 28); ctx.stroke();
        if (t % 20 === 0) particles.push(new Particle(o.x + 8, o.y - 20, '#7cff6b', 0, { x: 0.3, y: 1 }));
    }
}

// Bancada com monitores piscando
function drawConsole(o) {
    const t = mapState.t;
    shadow(o.x + o.w / 2 + 3, o.y + o.h + 2, o.w / 2 + 4, 6);
    ctx.fillStyle = '#2e333d';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#454c5a';
    ctx.fillRect(o.x, o.y - 10, o.w, 12);
    for (let k = 0; k < 3; k++) {
        const sx = o.x + 5 + k * 18;
        ctx.fillStyle = '#10141a';
        ctx.fillRect(sx, o.y - 28, 14, 16);
        const on = (Math.floor(t / (20 + k * 7)) + k) % 3 !== 0;
        ctx.fillStyle = on ? ['#3fe0a0', '#00ffff', '#ff5a5a'][k] : '#163028';
        ctx.globalAlpha = 0.85;
        ctx.fillRect(sx + 2, o.y - 26, 10, 12);
        ctx.globalAlpha = 1;
        if (on) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            for (let l = 0; l < 3; l++) ctx.fillRect(sx + 3, o.y - 24 + l * 4, 4 + ((t + l * 5 + k) % 5), 1);
        }
    }
    ctx.fillStyle = '#ff3030';
    if (Math.floor(t / 15) % 2) ctx.fillRect(o.x + o.w - 8, o.y - 6, 3, 3);
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y - 10, o.w, o.h + 10);
}

// Rack de servidores com LEDs
function drawRack(o) {
    const t = mapState.t;
    shadow(o.x + o.w / 2 + 3, o.y + o.h + 2, o.w / 2 + 4, 6);
    ctx.fillStyle = '#1e2128';
    ctx.fillRect(o.x, o.y - 26, o.w, o.h + 26);
    ctx.fillStyle = '#2c3038';
    ctx.fillRect(o.x, o.y - 32, o.w, 8);
    for (let row = 0; row < 8; row++) {
        const y = o.y - 20 + row * 8;
        ctx.fillStyle = '#14161b';
        ctx.fillRect(o.x + 3, y, o.w - 6, 6);
        for (let k = 0; k < 3; k++) {
            const lit = (Math.floor(t / (6 + k * 3 + row)) + row + k) % 4 !== 0;
            ctx.fillStyle = lit ? (k === 2 ? '#ffb347' : '#3fe0a0') : '#203020';
            ctx.fillRect(o.x + 6 + k * 5, y + 2, 2, 2);
        }
    }
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y - 32, o.w, o.h + 32);
}

// Batente de porta quebrada no meio da sala, com a porta caída e faiscando
function drawDoorFrame(o) {
    const t = mapState.t;
    shadow(o.x + o.w / 2 + 3, o.y + o.h, 14, 6);
    ctx.fillStyle = '#4a515e';
    ctx.fillRect(o.x, o.y - 30, o.w, o.h + 30);
    ctx.fillStyle = '#5c6472';
    ctx.fillRect(o.x, o.y - 36, o.w, 8);
    ctx.fillStyle = '#d8b028';
    for (let y = o.y - 24; y < o.y + o.h; y += 12) ctx.fillRect(o.x + 2, y, o.w - 4, 5);
    // Porta caída ao lado
    ctx.save();
    ctx.translate(o.x + o.w + 4, o.y + o.h - 6);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#3c4350';
    ctx.fillRect(0, -6, 40, 10);
    ctx.fillStyle = '#1a1e24';
    ctx.fillRect(6, -4, 10, 4);
    ctx.restore();
    if ((t + o.x) % 90 < 6) particles.push(new Particle(o.x + o.w / 2, o.y - 30, '#ffe34a', 0, { x: rand(-2, 2), y: rand(-2, 1) }));
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y - 36, o.w, o.h + 36);
}

// Canteiro de pedra com plantas balançando
function drawPlanter(o) {
    const t = mapState.t;
    shadow(o.x + o.w / 2 + 3, o.y + o.h + 2, o.w / 2 + 4, 6);
    ctx.fillStyle = '#6a6f78';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#80868f';
    ctx.fillRect(o.x, o.y - 8, o.w, 10);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(o.x + 4, o.y - 6, o.w - 8, 6);
    for (let k = 0; k < 7; k++) {
        const px = o.x + 8 + k * ((o.w - 16) / 6), sway = Math.sin(t * 0.05 + k + o.x) * 2;
        ctx.fillStyle = k % 2 ? '#2f8a44' : '#3fa857';
        ctx.beginPath(); ctx.ellipse(px + sway, o.y - 14, 6, 10, sway * 0.1, 0, Math.PI * 2); ctx.fill();
        if (k % 2 === 0) {
            ctx.fillStyle = ['#ff7ac0', '#ffe34a', '#c58aff', '#ffffff'][k / 2];
            ctx.beginPath(); ctx.arc(px + sway * 1.5, o.y - 22, 3.5, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y - 8, o.w, o.h + 8);
}

// Árvore florida (cerejeira) com a copa balançando
function drawGardenTree(o) {
    const t = mapState.t, sway = Math.sin(t * 0.02 + o.x) * 2;
    shadow(o.x, o.y + 2, 30, 10);
    ctx.fillStyle = '#5a3a24';
    ctx.fillRect(o.x - 5, o.y - 24, 10, 26);
    ctx.strokeStyle = '#5a3a24';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(o.x, o.y - 20); ctx.lineTo(o.x - 12 + sway, o.y - 36); ctx.moveTo(o.x, o.y - 22); ctx.lineTo(o.x + 12 + sway, o.y - 40); ctx.stroke();
    const blobs = [[0, -50, 22, '#e86aa8'], [-16, -40, 15, '#d25a96'], [16, -42, 16, '#d25a96'], [-6, -60, 14, '#ff8ac4'], [10, -58, 13, '#ff9ad0']];
    for (const [dx, dy, r, c] of blobs) {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(o.x + dx + sway, o.y + dy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd6ea';
    for (let k = 0; k < 8; k++) ctx.fillRect(o.x - 18 + ((k * 13) % 36) + sway, o.y - 64 + ((k * 7) % 30), 2, 2);
}

// Chafariz: bacia de pedra com água ondulando (o jato é desenhado por cima)
function drawFountain(o) {
    const t = mapState.t;
    shadow(o.x + 3, o.y + 4, o.r + 8, o.r * 0.5);
    ctx.fillStyle = '#7a808a';
    ctx.beginPath(); ctx.ellipse(o.x, o.y - 6, o.r, o.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(o.x - o.r, o.y - 6, o.r * 2, 8);
    ctx.fillStyle = '#2a6a9a';
    ctx.beginPath(); ctx.ellipse(o.x, o.y - 8, o.r - 6, o.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(190, 240, 255, 0.5)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
        const rr = ((t * 0.4 + k * 9) % 26);
        ctx.beginPath(); ctx.ellipse(o.x, o.y - 8, rr, rr * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#8a909a';
    ctx.fillRect(o.x - 4, o.y - 30, 8, 22);
    ctx.fillStyle = '#9aa0aa';
    ctx.beginPath(); ctx.ellipse(o.x, o.y - 30, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(o.x, o.y - 6, o.r, o.r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
}

// Planta carnívora: boca abre devagar (aviso) e fecha de uma vez
function drawChomper(o) {
    const t = mapState.t;
    shadow(o.x, o.y + 2, 18, 6);
    ctx.fillStyle = '#2f7a3a';
    for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(o.x + s * 12, o.y - 2, 10, 4, s * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    const sway = Math.sin(t * 0.06 + o.x) * 2;
    ctx.strokeStyle = '#2f7a3a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.quadraticCurveTo(o.x - 6 + sway, o.y - 18, o.x + sway, o.y - 30); ctx.stroke();
    const open = o.warn > 0 ? (1 - o.warn / 26) * 0.9 + 0.15 : o.bite > 0 ? 0 : 0.25 + Math.sin(t * 0.05) * 0.05;
    const hx = o.x + sway, hy = o.y - 34, face = o.lookX || 1;
    for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale(face, 1);
        ctx.rotate(s * open);
        ctx.fillStyle = '#4caf50';
        ctx.beginPath(); ctx.ellipse(6, 0, 12, 7, 0, s < 0 ? Math.PI : 0, s < 0 ? Math.PI * 2 : Math.PI); ctx.fill();
        ctx.fillStyle = '#ff5a8a';
        ctx.beginPath(); ctx.ellipse(6, 0, 9, 4, 0, s < 0 ? Math.PI : 0, s < 0 ? Math.PI * 2 : Math.PI); ctx.fill();
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 4; k++) ctx.fillRect(-1 + k * 4, s < 0 ? -1 : -1, 2, s < 0 ? -3 : 3);
        ctx.restore();
    }
    if (o.warn > 0) {
        ctx.strokeStyle = `rgba(255, 90, 140, ${0.3 + (1 - o.warn / 26) * 0.5})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.arc(o.x, o.y, CHOMPER_REACH, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
    }
}

// Arbusto: desenhado por cima de quem está dentro (folhas tremendo quando alguém passa)
function drawBush(b) {
    const t = mapState.t, shake = b.rustle > 0 ? Math.sin(t * 1.3) * 2 : 0;
    shadow(b.x, b.y + b.r * 0.35, b.r, b.r * 0.35);
    const blobs = [[0, -14, 1], [-0.55, -8, 0.7], [0.55, -8, 0.7], [-0.3, -26, 0.6], [0.32, -24, 0.62], [0, 0, 0.75]];
    blobs.forEach(([fx, dy, k], i) => {
        ctx.fillStyle = ['#2c7a3e', '#24683a', '#24683a', '#35924a', '#35924a', '#1f5c32'][i];
        ctx.globalAlpha = 0.93;
        ctx.beginPath(); ctx.arc(b.x + fx * b.r + shake * (i % 2 ? 1 : -1), b.y + dy, b.r * 0.55 * k + 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd6ea';
    for (let k = 0; k < 6; k++) ctx.fillRect(b.x - b.r * 0.6 + ((k * 17) % (b.r * 1.2)) + shake, b.y - 30 + ((k * 11) % 26), 2, 2);
}

// Praça Neon (o mapa original)
function renderPlazaFloor(g) {
    // Fora da arena: escuro
    g.fillStyle = '#07040f';
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    const w = arena.right - arena.left, h = arena.bottom - arena.top;
    const pad = 22;

    // Piso
    g.fillStyle = '#140b28';
    g.fillRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);

    // Ladrilhos em xadrez bem sutil
    const tile = 40;
    for (let x = arena.left - pad; x < arena.right + pad; x += tile) {
        for (let y = arena.top - pad; y < arena.bottom + pad; y += tile) {
            if (((x + y) / tile) % 2 < 1) {
                g.fillStyle = 'rgba(255, 255, 255, 0.018)';
                g.fillRect(x, y, tile, tile);
            }
        }
    }
    g.strokeStyle = 'rgba(0, 255, 255, 0.06)';
    g.lineWidth = 1;
    for (let x = arena.left - pad; x <= arena.right + pad; x += tile) {
        g.beginPath(); g.moveTo(x, arena.top - pad); g.lineTo(x, arena.bottom + pad); g.stroke();
    }
    for (let y = arena.top - pad; y <= arena.bottom + pad; y += tile) {
        g.beginPath(); g.moveTo(arena.left - pad, y); g.lineTo(arena.right + pad, y); g.stroke();
    }

    // Áreas de nascimento de cada time
    const spawnW = Math.min(160, w * 0.18);
    g.fillStyle = 'rgba(0, 255, 255, 0.06)';
    g.fillRect(arena.left - pad, arena.top - pad, spawnW, h + pad * 2);
    g.fillStyle = 'rgba(255, 77, 255, 0.06)';
    g.fillRect(arena.right + pad - spawnW, arena.top - pad, spawnW, h + pad * 2);

    // Poças refletindo neon
    const puddles = [[0.32, 0.25, 70, 22, '255, 0, 255'], [0.7, 0.78, 80, 24, '0, 255, 255'], [0.55, 0.3, 50, 16, '0, 255, 255'], [0.42, 0.72, 55, 18, '255, 0, 255']];
    for (const [fx, fy, rx, ry, rgb] of puddles) {
        const px = arena.left + fx * w, py = arena.top + fy * h;
        const gradient = g.createRadialGradient(px, py, 2, px, py, rx);
        gradient.addColorStop(0, `rgba(${rgb}, 0.22)`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);
        g.fillStyle = gradient;
        g.beginPath();
        g.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        g.fill();
    }

    // Centro da arena
    const cx = arena.left + w / 2, cy = arena.top + h / 2;
    g.save();
    g.strokeStyle = 'rgba(255, 77, 255, 0.45)';
    g.shadowColor = '#ff00ff';
    g.shadowBlur = 10;
    g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 70, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 40, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(cx, arena.top - pad); g.lineTo(cx, arena.bottom + pad);
    g.strokeStyle = 'rgba(255, 77, 255, 0.18)';
    g.stroke();
    g.restore();

    // Mureta neon em volta
    g.save();
    g.strokeStyle = '#00ffff';
    g.shadowColor = '#00ffff';
    g.shadowBlur = 14;
    g.lineWidth = 4;
    g.strokeRect(arena.left - pad, arena.top - pad, w + pad * 2, h + pad * 2);
    g.strokeStyle = 'rgba(255, 77, 255, 0.7)';
    g.shadowColor = '#ff00ff';
    g.lineWidth = 1.5;
    g.strokeRect(arena.left - pad + 6, arena.top - pad + 6, w + pad * 2 - 12, h + pad * 2 - 12);
    g.restore();

    // Postes de luz nos cantos
    for (const [lx, ly] of [[arena.left - pad, arena.top - pad], [arena.right + pad, arena.top - pad], [arena.left - pad, arena.bottom + pad], [arena.right + pad, arena.bottom + pad]]) {
        const glow = g.createRadialGradient(lx, ly, 2, lx, ly, 90);
        glow.addColorStop(0, 'rgba(255, 240, 200, 0.35)');
        glow.addColorStop(1, 'rgba(255, 240, 200, 0)');
        g.fillStyle = glow;
        g.beginPath(); g.arc(lx, ly, 90, 0, Math.PI * 2); g.fill();
    }
}

function drawArenaFloor() {
    if (!floorCache) {
        floorCache = document.createElement('canvas');
        floorCache.width = WORLD_W;
        floorCache.height = WORLD_H;
        renderArenaFloor(floorCache.getContext('2d'));
    }
    ctx.drawImage(floorCache, 0, 0);
}

// Arvorezinha cyberpunk: tronco, copa redonda e luzinhas
function drawTree(tree) {
    ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
    ctx.beginPath(); ctx.ellipse(tree.x, tree.y, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a2e1c';
    ctx.fillRect(tree.x - 4, tree.y - 18, 8, 18);
    const canopy = [[0, -34, 20, '#1f6b4a'], [-10, -28, 13, '#1a5a3f'], [10, -28, 13, '#1a5a3f'], [0, -40, 13, '#2a8a5c']];
    for (const [dx, dy, r, color] of canopy) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(tree.x + dx, tree.y + dy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#3fe0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(tree.x, tree.y - 34, 20, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    // Luzinhas piscando
    const blink = Math.floor(Date.now() / 400) % 2;
    ctx.fillStyle = blink ? '#ff7ac0' : '#ffe34a';
    ctx.fillRect(tree.x - 9, tree.y - 36, 3, 3);
    ctx.fillStyle = blink ? '#ffe34a' : '#00ffff';
    ctx.fillRect(tree.x + 7, tree.y - 30, 3, 3);
    ctx.fillRect(tree.x - 2, tree.y - 46, 3, 3);
}

// Caixa de papelão com fita; vai rachando conforme leva dano
function drawBox(box) {
    ctx.fillStyle = 'rgba(5, 0, 15, 0.5)';
    ctx.fillRect(box.x + 3, box.y + box.h - 2, box.w, 6);
    const top = 10; // face de cima (dá volume)
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = '#b07a45';
    ctx.fillRect(box.x, box.y - top, box.w, top + 2);
    ctx.fillStyle = '#c99a5e';
    ctx.fillRect(box.x + box.w / 2 - 3, box.y - top, 6, top + 2); // fita
    ctx.fillStyle = '#a07040';
    ctx.fillRect(box.x + box.w / 2 - 3, box.y + 2, 6, box.h - 2);
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y - top, box.w, box.h + top);
    if (box.hp < 55) {
        ctx.strokeStyle = 'rgba(30, 15, 5, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(box.x + 6, box.y + 4); ctx.lineTo(box.x + 12, box.y + 12); ctx.lineTo(box.x + 9, box.y + 20); ctx.stroke();
    }
    if (box.hp < 30) {
        ctx.beginPath(); ctx.moveTo(box.x + box.w - 5, box.y - 6); ctx.lineTo(box.x + box.w - 12, box.y + 6); ctx.lineTo(box.x + box.w - 7, box.y + 14); ctx.stroke();
    }
}
