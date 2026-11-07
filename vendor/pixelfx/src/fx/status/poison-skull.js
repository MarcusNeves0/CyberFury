// A toxic skull that pops over a poisoned head: it springs up with a squash, its eye sockets light acid green,
// it drips venom and grins, then sours away into green vapour. Made for a poison sniper's hits.
import { Particles, Lights, P, Rng, fit, clamp, smooth, ease, hex, WHITE } from "../../core/index.js";

export const meta = {
  name: "Poison skull",
  desc: "A toxic skull pops up over the head with a squash: acid-green eyes flare, venom drips off its jaw, then it sours into green vapour.",
  tags: ["status", "poison", "skull", "toxic", "debuff", "one-shot"],
  size: [56, 88],
  origin: [28, 80],
  duration: 1.8,
  loop: false,
  fps: 30,
  bg: "ground",
  // palette: venom, dark to bright; bone: the skull, dark to light; height: where the skull floats (px over the feet)
  options: {
    palette: ["#0d1a0c", "#173a14", "#265e18", "#3f8a1e", "#6cb82a", "#a8e04a", "#e0ff8a"],
    bone: ["#1c2414", "#4a5a34", "#8fa070", "#cfdcb0", "#f4ffe0"],
    height: 46,
    seed: 4,
  },
};

// 11 x 10: outline k, bone 1 (shadow) .. 3 (light), dark sockets d with a lit pupil e, nose n, teeth t
const SKULL = [
  "..kkkkkkk..",
  ".k3333333k.",
  "k333333332k",
  "k3ddd3ddd2k",
  "k3ded3ded1k",
  "k22222n221k",
  ".k2222n21k.",
  "..k3t3t3k..",
  "..kt1t1tk..",
  "...kkkkk...",
];
const POP = 0.16, HOLD = 0.8, FADE = 1.15;

export function create(o) {
  const C = fit(o.palette, 7), B = fit(o.bone, 5), R = new Rng(o.seed), H = o.height;
  const ps = new Particles({ rng: R, ground: () => 0 }), lights = new Lights();
  let t = 0, popped = false, nextDrip = 0.25;
  return {
    update(dt) {
      t += dt;
      if (!popped && t >= POP * 0.5) {
        popped = true;
        lights.add(0, -H, 22, C[5], 0.8, 0.2);
        for (let i = 0; i < 8; i++) ps.spawn(P.MOTE, R.range(-6, 6), -H + R.range(-3, 3), R.range(-40, 40), R.range(-60, -10), R.range(0.25, 0.5), C[R.int(4, 6)]);
      }
      // venom drips off the jaw while it holds
      if (t > POP && t < HOLD && t >= nextDrip) {
        nextDrip = t + R.range(0.12, 0.22);
        ps.spawn(P.MOTE, R.range(-3, 3), -H + 6, 0, R.range(40, 70), R.range(0.25, 0.4), C[R.int(3, 5)]);
      }
      // it sours: green vapour rises off it
      if (t > HOLD && t < FADE && R.chance(40 * dt)) ps.spawn(P.VAPOUR, R.range(-5, 5), -H + R.range(-4, 3), R.range(-8, 8), -R.range(14, 26), R.range(0.35, 0.6), C[3], R.range(2.5, 4));
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      if (t < FADE) {
        // springs up with a squash and stretch, then bobs
        const k = clamp(t / POP), rise = ease.outBack(k);
        const bob = t > POP ? Math.round(Math.sin((t - POP) * 9) * 1) : 0;
        const y0 = -H - 5 + Math.round((1 - rise) * 10) + bob;
        const a = 1 - smooth(HOLD, FADE, t);
        const eye = t < POP ? C[6] : t < HOLD ? (Math.floor(t * 12) % 4 === 0 ? WHITE : C[5]) : C[4];
        const pal = { k: hex("#0a0d08"), 1: B[1], 2: B[2], 3: B[3], d: hex("#0a0d08"), e: eye, n: B[0], t: B[4] };
        // the skull, row by row (dithered out as it sours)
        SKULL.forEach((row, y) => [...row].forEach((ch, x) => {
          if (ch === ".") return;
          const c = pal[ch];
          if (a >= 1) p.px(x - 5, y0 + y, c);
          else p.dot(x - 5, y0 + y, c, a);
        }));
        // the eyes glow
        p.glow(-2.5, y0 + 4.5, 4, C[5], 0.45 * a);
        p.glow(2.5, y0 + 4.5, 4, C[5], 0.45 * a);
        p.glow(0, y0 + 5, 14, C[4], 0.14 * a);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
