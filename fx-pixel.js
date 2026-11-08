// Efeitos da pixelfx (vendor/pixelfx, licença MIT): efeitos de pixel art feitos em código.
// Este arquivo é a fonte: o jogo carrega o fx-pixel.bundle.js, gerado dele junto com a biblioteca num script
// comum (módulos não abrem quando o index.html é aberto direto pelo arquivo). Depois de mexer aqui, gere de novo:
//   npx esbuild fx-pixel.js --bundle --format=iife --target=es2019 --legal-comments=inline --outfile=fx-pixel.bundle.js
// Ele deixa window.pixelFx para o jogo chamar; se não carregar (simulação), o jogo segue sem os efeitos.
//
// pixelFx.spawn(id, { x, y, flip, delay, scale, follow, ...opções do efeito }): começa um efeito com a origem dele
//   em (x, y) (nos efeitos de chão, a origem é o pé de quem golpeia). delay: passos do jogo até começar.
//   follow(efeito): chamado a cada passo para o efeito acompanhar alguém (muda efeito.x, .y, .flip e
//   efeito.fx.options). Devolve o efeito; efeito.stop() termina um efeito em loop (ele some em 0,3 s).
//   palette: nome de uma rampa da pixelfx ('ice', 'blood', 'fire'...) ou lista de cores; angle: inclinação;
//   advance: segundos do começo do efeito a pular; rotate: gira o quadro na tela (radianos), efeito.rotate muda depois.
// pixelFx.actorOf(lutador): a silhueta do sprite do lutador, para efeitos que envolvem o corpo (electrified).
// pixelFx.update(): avança um passo do jogo (1/60 s). pixelFx.draw(ctx): desenha tudo. pixelFx.clear(): limpa.

import { createFrame, clearFrame, createFx, composite, PAL } from './vendor/pixelfx/src/core/index.js';
import * as heavyCleave from './vendor/pixelfx/src/fx/melee/heavy-cleave.js';
import * as sparkBeam from './vendor/pixelfx/src/fx/lightning/spark-beam.js'; // feito para o Spark (não vem da pixelfx)
import * as electrified from './vendor/pixelfx/src/fx/lightning/electrified.js';
import * as zapHit from './vendor/pixelfx/src/fx/lightning/zap-hit.js';
import * as swordSlash from './vendor/pixelfx/src/fx/melee/sword-slash.js';
import * as doubleSlash from './vendor/pixelfx/src/fx/melee/double-slash.js';
import * as scytheReap from './vendor/pixelfx/src/fx/melee/scythe-reap.js';
import * as uppercut from './vendor/pixelfx/src/fx/melee/uppercut.js';
import * as hammerSmash from './vendor/pixelfx/src/fx/melee/hammer-smash.js';
import * as hitSpark from './vendor/pixelfx/src/fx/impacts/hit-spark.js';
import * as bluntHit from './vendor/pixelfx/src/fx/impacts/blunt-hit.js';
import * as critHit from './vendor/pixelfx/src/fx/impacts/crit-hit.js';
import * as fireRing from './vendor/pixelfx/src/fx/fire/fire-ring.js';
import * as burning from './vendor/pixelfx/src/fx/status/burning.js';
import * as clawSwipe from './vendor/pixelfx/src/fx/melee/claw-swipe.js';
import * as thrust from './vendor/pixelfx/src/fx/melee/thrust.js';
import * as cursed from './vendor/pixelfx/src/fx/status/cursed.js';
import * as shadowTendrils from './vendor/pixelfx/src/fx/shadow/shadow-tendrils.js';
import * as muzzlePistol from './vendor/pixelfx/src/fx/projectiles/muzzle-pistol.js';
import * as poisoned from './vendor/pixelfx/src/fx/status/poisoned.js';
import * as poisonSkull from './vendor/pixelfx/src/fx/status/poison-skull.js'; // feito para a Mamba (não vem da pixelfx)
import * as necroSkulls from './vendor/pixelfx/src/fx/shadow/necro-skulls.js';
import * as healAoe from './vendor/pixelfx/src/fx/holy/heal-aoe.js';
import * as heal from './vendor/pixelfx/src/fx/holy/heal.js';
import * as healingBloom from './vendor/pixelfx/src/fx/nature/healing-bloom.js';
import * as cartoonPow from './vendor/pixelfx/src/fx/explosions/cartoon-pow.js';
import * as groundSlam from './vendor/pixelfx/src/fx/impacts/ground-slam.js';
import * as shieldBlock from './vendor/pixelfx/src/fx/impacts/shield-block.js';
import * as splash from './vendor/pixelfx/src/fx/water/splash.js';
import * as heavyLanding from './vendor/pixelfx/src/fx/impacts/heavy-landing.js';
import * as waveCrash from './vendor/pixelfx/src/fx/water/wave-crash.js';
import * as sharkWake from './vendor/pixelfx/src/fx/water/shark-wake.js'; // feito para o tubarão da Sina (não vem da pixelfx)
import * as bulletTracer from './vendor/pixelfx/src/fx/projectiles/bullet-tracer.js';
import * as laserBolt from './vendor/pixelfx/src/fx/projectiles/laser-bolt.js';
import * as plasmaShot from './vendor/pixelfx/src/fx/projectiles/plasma-shot.js';
import * as nailShot from './vendor/pixelfx/src/fx/projectiles/nail-shot.js'; // feito para os pregos do Gear (não vem da pixelfx)

const EFFECTS = {
    'heavy-cleave': heavyCleave, 'spark-beam': sparkBeam, electrified, 'zap-hit': zapHit,
    'sword-slash': swordSlash, 'double-slash': doubleSlash, 'scythe-reap': scytheReap,
    uppercut, 'hammer-smash': hammerSmash, 'hit-spark': hitSpark, 'blunt-hit': bluntHit, 'crit-hit': critHit,
    'fire-ring': fireRing, burning, 'claw-swipe': clawSwipe, thrust, cursed, 'shadow-tendrils': shadowTendrils,
    'muzzle-pistol': muzzlePistol, poisoned, 'poison-skull': poisonSkull, 'necro-skulls': necroSkulls,
    'heal-aoe': healAoe, heal, 'healing-bloom': healingBloom, 'cartoon-pow': cartoonPow,
    'ground-slam': groundSlam, 'shield-block': shieldBlock, splash, 'heavy-landing': heavyLanding, 'wave-crash': waveCrash, 'shark-wake': sharkWake,
    'bullet-tracer': bulletTracer, 'laser-bolt': laserBolt, 'plasma-shot': plasmaShot, 'nail-shot': nailShot,
};
const STEP = 1 / 60;
// Os efeitos foram desenhados para um boneco de 38 px de altura; os nossos têm 64
const SCALE = 2;

const active = [];

function spawn(id, { x, y, flip = false, delay = 0, scale = SCALE, follow = null, advance = 0, rotate = 0, ...options } = {}) {
    const mod = EFFECTS[id];
    if (!mod) return null;
    const [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin;
    // Cores: o nome de uma rampa da pixelfx ('ice', 'blood', 'fire'...) ou a lista de cores
    if (typeof options.palette === 'string') options.palette = PAL[options.palette];
    // O efeito é desenhado virado para a direita no próprio quadro; para a esquerda, o quadro é espelhado na tela
    const fx = createFx(mod, { ...options, x: ox, y: oy });
    // advance: pula o começo (segundos), para o golpe do efeito bater junto com o golpe do jogo
    for (let t = 0; t < advance - 1e-6; t += STEP) fx.update(STEP);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    const effect = {
        fx, frame: createFrame(w, h), canvas, g, image: g.createImageData(w, h), x, y, flip, delay, scale, ox, oy, w, h, follow, rotate, dirty: true,
        stop() { fx.stop(); },
    };
    active.push(effect);
    return effect;
}

// Silhueta e cores do sprite parado do lutador, com os pés em (0, 0), no tamanho em que o jogo desenha (64 px)
const actors = {};
function actorOf(fighter) {
    const type = fighter.characterType, h = fighter.height;
    const key = `${type}:${h}`;
    if (actors[key]) return actors[key];
    const c = document.createElement('canvas');
    c.width = h;
    c.height = h;
    const g = c.getContext('2d');
    // o sprite tem o dobro da largura da caixa: caixa de h/2 começando em h/4 ocupa o quadro inteiro
    characterArt[type](g, h / 4, 0, h / 2, h, { spriteFrame: 'idle', walkFrame: null });
    const all = new Uint32Array(g.getImageData(0, 0, h, h).data.buffer);
    let x0 = h, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) if (all[y * h + x] >>> 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 1, hh = y1 - y0 + 1, data = new Uint8Array(w * hh), pixels = new Uint32Array(w * hh);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
        const c32 = all[(y + y0) * h + x + x0];
        if (c32 >>> 24 > 128) { data[y * w + x] = 1; pixels[y * w + x] = c32 | 0xff000000; }
    }
    const left = x0 - h / 2, top = y0 - h;
    return (actors[key] = { mask: { w, h: hh, data }, pixels, x: left, y: top, w, h: hh, k: 2, head: [0, top], chest: [0, top + hh * 0.4] });
}

function update() {
    for (const e of active) {
        if (e.delay > 0) { e.delay--; continue; }
        if (e.follow) e.follow(e);
        e.fx.update(STEP);
        e.dirty = true;
    }
    for (let i = active.length - 1; i >= 0; i--) if (active[i].fx.done()) active.splice(i, 1);
}

function draw(ctx) {
    for (const e of active) {
        if (e.delay > 0) continue;
        if (e.dirty) {
            clearFrame(e.frame);
            e.fx.draw(e.frame, 'back');
            e.fx.draw(e.frame, 'front');
            composite(e.frame, e.image.data, null);
            e.g.putImageData(e.image, 0, 0);
            e.dirty = false;
        }
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(e.x, e.y);
        if (e.rotate) ctx.rotate(e.rotate); // gira o quadro inteiro (projéteis na direção do tiro, sem cortar a ponta)
        if (e.flip) ctx.scale(-1, 1);
        ctx.drawImage(e.canvas, -e.ox * e.scale, -e.oy * e.scale, e.w * e.scale, e.h * e.scale);
        ctx.restore();
    }
}

function clear() {
    active.length = 0;
}

window.pixelFx = { spawn, update, draw, clear, actorOf, count: () => active.length };
