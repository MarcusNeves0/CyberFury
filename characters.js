// --- Funções de Desenho dos Personagens ---

function drawTitanArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;
    const attackType = fighter ? fighter.attackBox.type : null;

    const skinTone = '#f2d2b4';
    const skinShadow = '#d3a180';
    const shortsColor = '#1e90ff';
    const shortsStripe = '#fff';
    const capColor = '#ff4141';
    const shoeColor = '#4169e1';
    const robotArmColor = '#a0a0a0';
    const robotArmDark = '#707070';

    ctx.fillStyle = shoeColor;
    ctx.fillRect(x + pixel, y + pixel * 11, pixel * 2, pixel);
    ctx.fillRect(x + pixel * 4, y + pixel * 11, pixel * 2, pixel);

    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 7, pixel * 1.5, pixel * 4);
    ctx.fillRect(x + pixel * 4, y + pixel * 7, pixel * 1.5, pixel * 4);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(x + pixel * 2.5, y + pixel * 7, pixel * 0.5, pixel * 4);
    ctx.fillRect(x + pixel * 5, y + pixel * 7, pixel * 0.5, pixel * 4);

    ctx.fillStyle = shortsColor;
    ctx.fillRect(x + pixel * 1, y + pixel * 5, pixel * 5, pixel * 3);
    ctx.fillStyle = shortsStripe;
    ctx.fillRect(x + pixel * 1, y + pixel * 5, pixel * 0.5, pixel * 3);

    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 0.5, y + pixel * 3, pixel * 1.5, pixel * 3);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 3, pixel * 0.5, pixel * 3);

    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 2, y + pixel * 2, pixel * 3, pixel * 4);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(x + pixel * 2.8, y + pixel * 2, pixel * 0.4, pixel * 4);
    ctx.fillRect(x + pixel * 2, y + pixel * 3, pixel * 3, pixel * 0.4);
    ctx.fillRect(x + pixel * 2, y + pixel * 4, pixel * 3, pixel * 0.4);
    ctx.fillRect(x + pixel * 2, y + pixel * 5, pixel * 3, pixel * 0.4);

    ctx.fillStyle = robotArmColor;
    if (isAttacking && (attackType === 'punch' || attackType === 'strong_punch')) {
        ctx.fillRect(x + pixel * 5, y + pixel * 3.5, pixel * 3, pixel * 2);
    } else {
        ctx.fillRect(x + pixel * 5, y + pixel * 3, pixel * 2, pixel * 4);
    }
    ctx.fillStyle = robotArmDark;
    ctx.fillRect(x + pixel * 5, y + pixel * 4, pixel * 2, pixel * 0.5);
    ctx.fillRect(x + pixel * 5, y + pixel * 6, pixel * 2, pixel * 0.5);

    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 2, y, pixel * 3, pixel * 2.5);
    ctx.fillStyle = capColor;
    ctx.fillRect(x + pixel * 1.5, y - pixel * 0.5, pixel * 4, pixel);
    ctx.fillRect(x + pixel * 4, y, pixel * 1.5, pixel * 1.5);
}

function drawSparkArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;

    const darkGrey = '#555';
    const lightGrey = '#808080';
    const capeColor = '#222';
    const shoeColor = '#D92626';
    const shoeSole = '#FFF';
    const chestOrange = '#ff8c00';
    const chestYellow = '#ffae42';
    const eyeColor = '#ff4500';

    ctx.fillStyle = capeColor;
    ctx.beginPath();
    ctx.moveTo(x + pixel * 3, y + pixel * 2);
    ctx.lineTo(x, y + pixel * 11);
    ctx.lineTo(x + pixel * 2, y + pixel * 11.5);
    ctx.lineTo(x + pixel * 5, y + pixel * 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shoeColor;
    ctx.fillRect(x + pixel * 0.5, y + pixel * 11, pixel * 2, pixel);
    ctx.fillRect(x + pixel * 3.5, y + pixel * 11, pixel * 2, pixel);
    ctx.fillStyle = shoeSole;
    ctx.fillRect(x + pixel * 0.5, y + pixel * 11.7, pixel * 2, pixel * 0.3);
    ctx.fillRect(x + pixel * 3.5, y + pixel * 11.7, pixel * 2, pixel * 0.3);

    ctx.fillStyle = lightGrey;
    ctx.fillRect(x + pixel, y + pixel * 7, pixel, pixel * 4);
    ctx.fillRect(x + pixel * 4, y + pixel * 7, pixel, pixel * 4);
    ctx.fillStyle = darkGrey;
    ctx.fillRect(x + pixel, y + pixel * 9, pixel, pixel * 0.5);
    ctx.fillRect(x + pixel * 4, y + pixel * 9, pixel, pixel * 0.5);

    ctx.fillStyle = lightGrey;
    ctx.fillRect(x + pixel * 2, y + pixel * 4, pixel * 2, pixel * 3);
    ctx.fillStyle = darkGrey;
    ctx.fillRect(x + pixel * 2, y + pixel * 5, pixel * 2, pixel * 0.3);
    ctx.fillRect(x + pixel * 2, y + pixel * 6, pixel * 2, pixel * 0.3);

    ctx.fillStyle = chestOrange;
    ctx.beginPath();
    ctx.arc(x + pixel * 3, y + pixel * 4.5, pixel * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = chestYellow;
    ctx.beginPath();
    ctx.arc(x + pixel * 3, y + pixel * 4.5, pixel * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = lightGrey;
    ctx.fillRect(x + pixel, y + pixel * 4, pixel, pixel * 3);
    ctx.fillStyle = darkGrey;
    ctx.fillRect(x + pixel, y + pixel * 5.5, pixel, pixel * 0.5);

    ctx.fillStyle = lightGrey;
    if (isAttacking) {
        ctx.fillRect(x + pixel * 4, y + pixel * 4, pixel * 2.5, pixel);
    } else {
        ctx.fillRect(x + pixel * 4, y + pixel * 4, pixel, pixel * 3);
    }
    ctx.fillStyle = darkGrey;
    ctx.fillRect(x + pixel * 4, y + pixel * 5.5, pixel, pixel * 0.5);

    ctx.fillStyle = capeColor;
    ctx.fillRect(x + pixel, y, pixel * 4, pixel * 2.5);
    ctx.fillStyle = lightGrey;
    ctx.fillRect(x + pixel * 2, y + pixel, pixel * 2, pixel * 2);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(x + pixel * 2.2, y + pixel * 1.5, pixel * 1.6, pixel * 0.5);
}

function drawHadesArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;

    const skinTone = '#8d5524';
    const skinShadow = '#653d1b';
    const pantsColor = '#404040';
    const beltColor = '#202020';

    ctx.fillStyle = pantsColor;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 7, pixel * 1.5, pixel * 5); // Esquerda
    ctx.fillRect(x + pixel * 4, y + pixel * 7, pixel * 1.5, pixel * 5); // Direita

    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel, y + pixel * 2, pixel * 5, pixel * 5);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(x + pixel * 2.8, y + pixel * 2, pixel * 0.4, pixel * 5);
    ctx.fillRect(x + pixel, y + pixel * 3, pixel * 5, pixel * 0.4);
    ctx.fillRect(x + pixel, y + pixel * 4.5, pixel * 5, pixel * 0.4);

    ctx.fillStyle = beltColor;
    ctx.fillRect(x + pixel, y + pixel * 6.5, pixel * 5, pixel);

    ctx.fillStyle = 'orange';
    if (isAttacking) {
        ctx.fillRect(x + pixel * 5, y + pixel * 3, pixel * 2, pixel * 2);
        ctx.fillStyle = 'red';
        ctx.fillRect(x + pixel * 5.5, y + pixel * 3.5, pixel, pixel);
    } else {
        ctx.fillRect(x + pixel * 0.5, y + pixel * 3, pixel, pixel);
        ctx.fillRect(x + pixel * 5.5, y + pixel * 3, pixel, pixel);
    }

    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 0.5, y + pixel * 4, pixel, pixel * 2);
    ctx.fillRect(x + pixel * 5.5, y + pixel * 4, pixel, pixel * 2);

    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 2, y, pixel * 3, pixel * 2.5);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + pixel, y, pixel * 5, pixel * 0.5); // Cabelo
}

function drawJackArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;

    const hoodieColor = '#1a1a1a';
    const pantsColor = '#2a2a2a';
    const shoeColor = '#e74c3c';
    const pumpkinColor = '#f39c12';
    const pumpkinShadow = '#e67e22';
    const pumpkinEye = '#f1c40f';

    // Pés
    ctx.fillStyle = shoeColor;
    ctx.fillRect(x + pixel, y + pixel * 11, pixel * 2, pixel);
    ctx.fillRect(x + pixel * 4, y + pixel * 11, pixel * 2, pixel);

    // Calças
    ctx.fillStyle = pantsColor;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 7, pixel, pixel * 4);
    ctx.fillRect(x + pixel * 4.5, y + pixel * 7, pixel, pixel * 4);

    // Hoodie
    ctx.fillStyle = hoodieColor;
    ctx.fillRect(x + pixel, y + pixel * 4, pixel * 5, pixel * 4);
    // Braços
    ctx.fillRect(x + pixel * 0.5, y + pixel * 5, pixel, pixel * 3);
    if (isAttacking) {
        ctx.fillRect(x + pixel * 5.5, y + pixel * 5, pixel * 2, pixel);
    } else {
        ctx.fillRect(x + pixel * 5.5, y + pixel * 5, pixel, pixel * 3);
    }

    // Cabeça de Abóbora
    ctx.fillStyle = pumpkinColor;
    ctx.fillRect(x + pixel, y, pixel * 5, pixel * 4);
    ctx.fillStyle = pumpkinShadow;
    ctx.fillRect(x + pixel * 1.5, y + pixel, pixel, pixel * 0.5); // Olho esquerdo
    ctx.fillRect(x + pixel * 4.5, y + pixel, pixel, pixel * 0.5); // Olho direito
    ctx.fillRect(x + pixel * 3, y + pixel * 2, pixel, pixel * 0.5); // Nariz
    ctx.fillRect(x + pixel * 2, y + pixel * 3, pixel * 3, pixel * 0.5); // Boca

    ctx.fillStyle = pumpkinEye;
    ctx.fillRect(x + pixel * 1.7, y + pixel * 1.2, pixel * 0.6, pixel * 0.2);
    ctx.fillRect(x + pixel * 4.7, y + pixel * 1.2, pixel * 0.6, pixel * 0.2);
}

function drawGenjiArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;

    const humanColor = '#f2d2b4';
    const robotColor = '#333';
    const helmetColor = '#95a5a6';
    const eyeColor = '#2ecc71';
    const fireCircleColor = '#e67e22';
    const bladeColor = '#7fffd4';

    // Perna robótica (frente)
    ctx.fillStyle = robotColor;
    ctx.fillRect(x + pixel * 4, y + pixel * 7, pixel * 1.5, pixel * 5);
    // Perna humana (atrás)
    ctx.fillStyle = humanColor;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 7, pixel * 1.5, pixel * 5);

    // Torso (meio a meio)
    ctx.fillStyle = robotColor;
    ctx.fillRect(x + pixel * 3, y + pixel * 2, pixel * 2, pixel * 5);
    ctx.fillStyle = humanColor;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 2, pixel * 1.5, pixel * 5);

    // Círculos de fogo
    ctx.fillStyle = fireCircleColor;
    ctx.beginPath();
    ctx.arc(x + pixel * 3.5, y + pixel * 3, pixel * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + pixel * 3.5, y + pixel * 4.5, pixel * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + pixel * 3.5, y + pixel * 6, pixel * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Braço robótico (frente) & Espada
    ctx.fillStyle = robotColor;
    if (isAttacking) {
        ctx.fillRect(x + pixel * 5, y + pixel * 3.5, pixel * 1.5, pixel * 1.5); // Punho
        ctx.fillStyle = bladeColor;
        ctx.shadowColor = bladeColor;
        ctx.shadowBlur = 10;
        ctx.fillRect(x + pixel * 6.5, y + pixel * 4, pixel * 4, pixel * 0.5);
        ctx.shadowBlur = 0;
    } else {
        ctx.fillRect(x + pixel * 5, y + pixel * 3, pixel * 1.5, pixel * 3);
    }

    // Braço humano (atrás)
    ctx.fillStyle = humanColor;
    ctx.fillRect(x + pixel * 0.5, y + pixel * 3, pixel, pixel * 3);

    // Capacete
    ctx.fillStyle = helmetColor;
    ctx.fillRect(x + pixel, y, pixel * 4.5, pixel * 2.5);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(x + pixel * 2, y + pixel, pixel * 2, pixel * 0.5);
}

function drawRyuArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;

    const skinTone = '#f2d2b4';
    const kimonoColor = '#ffffff';
    const kimonoShadow = '#e0e0e0';
    const bandColor = '#ff0000';

    // Pés
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 11, pixel * 1.5, pixel);
    ctx.fillRect(x + pixel * 4, y + pixel * 11, pixel * 1.5, pixel);

    // Pernas
    ctx.fillStyle = kimonoColor;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 7, pixel * 1.5, pixel * 4); // Esquerda
    ctx.fillRect(x + pixel * 4, y + pixel * 7, pixel * 1.5, pixel * 4); // Direita

    // Torso
    ctx.fillStyle = kimonoColor;
    ctx.fillRect(x + pixel, y + pixel * 2, pixel * 5, pixel * 5);
    ctx.fillStyle = kimonoShadow;
    ctx.fillRect(x + pixel * 2.8, y + pixel * 2, pixel * 0.4, pixel * 5);

    // Faixa da cintura
    ctx.fillStyle = bandColor;
    ctx.fillRect(x + pixel, y + pixel * 6.5, pixel * 5, pixel);

    // Braços
    ctx.fillStyle = skinTone;
    if (isAttacking) {
        ctx.fillRect(x + pixel * 5, y + pixel * 3, pixel * 2, pixel * 1.5);
    } else {
        ctx.fillRect(x + pixel * 5.5, y + pixel * 4, pixel, pixel * 2);
    }
    ctx.fillRect(x + pixel * 0.5, y + pixel * 4, pixel, pixel * 2);

    // Cabeça
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 2, y, pixel * 3, pixel * 2.5);
    ctx.fillStyle = bandColor;
    ctx.fillRect(x + pixel, y + pixel * 0.5, pixel * 5, pixel * 0.5);
}

function drawDonLorenzoArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;

    const uniformColor = '#ffffff';
    const skinTone = '#f2d2b4';
    const shoeColor = '#000000';
    const roseColor = '#3498db';

    // Pés
    ctx.fillStyle = shoeColor;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 11, pixel * 2, pixel);
    ctx.fillRect(x + pixel * 4.5, y + pixel * 11, pixel * 2, pixel);

    // Pernas
    ctx.fillStyle = uniformColor;
    ctx.fillRect(x + pixel * 2, y + pixel * 7, pixel, pixel * 4);
    ctx.fillRect(x + pixel * 4, y + pixel * 7, pixel, pixel * 4);

    // Camisa
    ctx.fillRect(x + pixel * 1.5, y + pixel * 3, pixel * 4, pixel * 4);

    // Rosa
    ctx.fillStyle = roseColor;
    ctx.beginPath();
    ctx.arc(x + pixel * 2.5, y + pixel * 4, pixel * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Braços
    ctx.fillStyle = skinTone;
    if (isAttacking) {
        ctx.fillRect(x + pixel * 5.5, y + pixel * 4, pixel * 2, pixel);
    } else {
        ctx.fillRect(x + pixel * 5.5, y + pixel * 4, pixel, pixel * 3);
    }
    ctx.fillRect(x + pixel, y + pixel * 4, pixel, pixel * 3);

    // Cabeça
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 2, y, pixel * 3, pixel * 3);
    ctx.fillStyle = '#000'; // Cabelo
    ctx.fillRect(x + pixel * 2, y, pixel * 3, pixel);
}

function drawMaleniaArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;

    const armorGold = '#c9a46a';
    const capeRed = '#a13a3a';
    const hairRed = '#e54b4b';
    const bladeColor = '#d4af37';
    const skinTone = '#f2d2b4';

    // Pés e pernas
    ctx.fillStyle = armorGold;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 10, pixel, pixel * 2);
    ctx.fillRect(x + pixel * 4.5, y + pixel * 10, pixel, pixel * 2);

    // Saia e armadura do torso
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(x + pixel, y + pixel * 6, pixel * 5, pixel * 4);
    ctx.fillStyle = armorGold;
    ctx.fillRect(x + pixel * 1.5, y + pixel * 4, pixel * 4, pixel * 3);

    // Capa
    ctx.fillStyle = capeRed;
    ctx.beginPath();
    ctx.moveTo(x + pixel * 0.5, y + pixel * 2);
    ctx.lineTo(x - pixel, y + height);
    ctx.lineTo(x + pixel * 2, y + height);
    ctx.closePath();
    ctx.fill();

    // Braços e espada
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + pixel * 0.5, y + pixel * 5, pixel, pixel * 3); // Braço esquerdo
    ctx.fillStyle = armorGold;
    ctx.fillRect(x + pixel * 5.5, y + pixel * 5, pixel, pixel * 4); // Braço direito (prótese)

    ctx.fillStyle = bladeColor;
    if (isAttacking) {
        ctx.fillRect(x + pixel * 6.5, y + pixel * 5.5, pixel * 4, pixel * 0.5);
    } else {
        ctx.fillRect(x + pixel * 5.5, y + pixel * 9, pixel, pixel * 3);
    }

    // Cabeça e cabelo
    ctx.fillStyle = hairRed;
    ctx.fillRect(x + pixel * 1.5, y - pixel, pixel * 4, pixel * 4);
    ctx.fillStyle = armorGold;
    ctx.fillRect(x + pixel * 1, y, pixel * 5, pixel * 2.5); // Elmo
    ctx.fillStyle = '#000';
    ctx.fillRect(x + pixel * 2, y + pixel, pixel * 3, pixel * 0.5); // Visor
}

function drawMalikethArt(ctx, x, y, width, height, fighter) {
    const pixel = height / 12;
    const isAttacking = fighter ? fighter.isAttacking : false;
    const isTransformed = fighter ? fighter.isTransformed : false;

    const armorColor = '#222';
    const hairColor = '#fff';
    const bladeColor = '#ff0000';

    if (isTransformed) {
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 20;
    }

    // Pés
    ctx.fillStyle = armorColor;
    ctx.fillRect(x, y + pixel * 11, pixel * 2, pixel);
    ctx.fillRect(x + pixel * 5, y + pixel * 11, pixel * 2, pixel);

    // Pernas
    ctx.fillRect(x + pixel, y + pixel * 7, pixel * 1.5, pixel * 4);
    ctx.fillRect(x + pixel * 4.5, y + pixel * 7, pixel * 1.5, pixel * 4);

    // Corpo
    ctx.fillRect(x + pixel * 1, y + pixel * 4, pixel * 5, pixel * 4);

    // Cabelo
    ctx.fillStyle = hairColor;
    ctx.fillRect(x, y + pixel * 2, pixel * 7, pixel * 3);

    // Espada
    ctx.fillStyle = bladeColor;
    if (isAttacking) {
        ctx.shadowColor = bladeColor;
        ctx.shadowBlur = 15;
        ctx.fillRect(x - pixel * 2, y + pixel * 2, pixel, pixel * 8);
    } else {
        ctx.fillRect(x + pixel * 6, y + pixel * 3, pixel, pixel * 8);
    }
    ctx.shadowBlur = 0;
}

// Mapa tipo de personagem -> função de desenho (usado pelo jogo e pelas miniaturas)
const characterArt = {
    titan: drawTitanArt,
    spark: drawSparkArt,
    hades: drawHadesArt,
    jack: drawJackArt,
    genji: drawGenjiArt,
    ryu: drawRyuArt,
    lorenzo: drawDonLorenzoArt,
    malenia: drawMaleniaArt,
    maliketh: drawMalikethArt
};

function drawThumbnails() {
    for (const [name, drawFn] of Object.entries(characterArt)) {
        const canvas = document.getElementById(`${name}-thumbnail`);
        canvas.width = 120;
        canvas.height = 120;
        drawFn(canvas.getContext('2d'), 30, 0, 60, 120, null);
    }
}
