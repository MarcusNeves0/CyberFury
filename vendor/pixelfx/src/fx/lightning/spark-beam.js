// A live bolt for a game: the hand is the anchor (0, 0) and the target end `to` may move every frame, so it can
// follow a fighter. The bolt inking, the re-strike every other frame and the crawling arcs use the lightning
// helpers in ./_lib.js (adapted from Sprite Fusion's open-source lightning, https://www.spritefusion.com/pixel-art-vfx/lightning,
// MIT License, Copyright (c) 2026 Hugo Duprez).
import { Particles, Lights, P, Rng, fit, sparkle, clamp, rng, lerp, TAU, WHITE } from "../../core/index.js";
import { VOLT, PLASMA, zigzag, bowed, stroke, crackle, trace } from "./_lib.js";

export const meta = {
  name: "Spark beam",
  desc: "A held bolt from the hand to a moving target: it hums and re-strikes, sheds sparks, and grows thicker and whiter with each power level, then snaps.",
  tags: ["lightning", "electric", "beam", "channel", "chain", "combat", "loop"],
  size: [420, 300],
  origin: [210, 150],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "dark",
  // to: the target end in px from the hand; level: 0 at first, +1 each time the power doubles; broken: snap it
  options: { palette: VOLT, sparks: PLASMA, seed: 7, to: [130, 6], level: 0, broken: false },
};

const MAX = 4; // the look stops growing here

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const floorAt = () => (o.to[1] > 0 ? o.to[1] : 0) + 16; // feet are about 16 px under the chest
  const ps = new Particles({ rng: R, ground: floorAt, sparks: o.sparks }), lights = new Lights();
  let t = 0, seen = o.level, surge = 0, snapped = false, lastPts = null;

  // the trunk for frame f2: bowed a little, more forks the stronger it is
  const shape = (f2, L) => {
    const [tx, ty] = o.to, r = rng(o.seed, 31, f2), len = Math.hypot(tx, ty) || 1;
    return bowed(r, 0, 0, tx, ty, r.range(-1, 1) * len * (0.06 + 0.02 * L), 0.2 + 0.02 * L, 0.06 + 0.1 * L);
  };
  const burst = (x, y, n, sp0, sp1) => {
    for (let i = 0; i < n; i++) {
      const a = R.range(0, TAU), sp = R.range(sp0, sp1);
      ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.4));
    }
  };

  return {
    update(dt) {
      t += dt;
      const [tx, ty] = o.to, L = Math.min(o.level, MAX);
      // a level up: the bolt surges white, the target bursts
      if (o.level > seen) {
        seen = o.level;
        surge = 0.1;
        lights.add(tx, ty, 50 + 8 * L, C[4], 0.9, 0.25);
        lights.add(tx, ty, 16, WHITE, 0.8, 0.08);
        burst(tx, ty, 10 + 4 * L, 70, 200 + 20 * L);
      }
      surge = Math.max(0, surge - dt);
      if (o.broken && !snapped) {
        // broken: the channel blows apart along its length
        snapped = true;
        for (let i = 0; i < 18; i++) {
          const u = R.next();
          ps.spawn(P.SPARK, lerp(0, tx, u), lerp(0, ty, u), R.range(-120, 120), R.range(-150, 40), R.range(0.12, 0.3));
        }
        lights.add(tx / 2, ty / 2, 40, C[4], 0.6, 0.12);
      }
      if (!o.broken) {
        // sparks shed off the bolt, more as it grows; the target spits some at its feet
        if (R.chance((4 + 5 * L) * dt)) {
          const u = R.next();
          ps.spawn(P.SPARK, lerp(0, tx, u), lerp(0, ty, u) - 1, R.range(-60, 60), R.range(-100, 20), R.range(0.1, 0.25));
        }
        if (L >= 2 && R.chance((2 + 3 * L) * dt)) ps.spawn(P.SPARK, tx + R.range(-4, 4), floorAt(), R.range(-70, 70), -R.range(40, 130), R.range(0.12, 0.3));
      }
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      const [tx, ty] = o.to, L = Math.min(o.level, MAX), f = Math.floor(t * 30 + 1e-4), f2 = f >> 1;
      if (!o.broken) {
        const hum = 0.8 + 0.2 * Math.sin(t * 61) * Math.sin(t * 23), s = 0.72 + 0.12 * L;
        const b = shape(f2, L);
        lastPts = b.paths[0].pts;
        stroke(p, b, surge > 0 ? 1 : hum, C, s, { hero: surge > 0, core: L >= 3 ? 1.1 : undefined, light: 0.32 + 0.06 * L });
        // a second strand braids round the first from level 2, a third at the top
        for (let j = 1; j <= (L >= 4 ? 2 : L >= 2 ? 1 : 0); j++) {
          const r = rng(o.seed, 40 + j, f), len = Math.hypot(tx, ty) || 1;
          crackle(p, bowed(r, 0, 0, tx, ty, (j % 2 ? -1 : 1) * len * r.range(0.025, 0.06), 0.34, 0.08), r.range(0.5, 0.75), C, 0.3);
        }
        // the hand: a hot node, bigger as it grows
        const rh = 1.4 + 0.45 * L + Math.sin(t * 53) * 0.4;
        p.circle(0, 0, rh + 1.2, C[4]);
        p.circle(0, 0, rh, C[6]);
        p.circle(0, 0, rh * 0.5, WHITE);
        p.glow(0, 0, 14 + 3 * L, C[4], 0.5 + 0.08 * L);
        // the target: a node with arcs crawling over it
        const rt = (2.2 + 0.5 * L + Math.sin(t * 47) * 0.6) * hum;
        p.circle(tx, ty, rt + 1.5, C[2]);
        p.circle(tx, ty, rt + 0.7, C[5]);
        p.circle(tx, ty, rt * 0.6, WHITE);
        p.glow(tx, ty, 22 + 4 * L, C[4], 0.5 + 0.05 * L);
        const r2 = rng(o.seed, 11, f);
        for (let j = 0; j < 1 + (L >= 2 ? 1 : 0); j++) {
          const a0 = r2.range(0, TAU), a1 = a0 + r2.sign() * r2.range(0.5, 1.1), d0 = r2.range(4, 7), d1 = r2.range(6, 10 + L);
          crackle(p, zigzag(r2, tx + Math.cos(a0) * d0, ty + Math.sin(a0) * d0, tx + Math.cos(a1) * d1, ty + Math.sin(a1) * d1, 0.35, 0), r2.range(0.45, 0.75), C, 0.25);
        }
        if (surge > 0) sparkle(p, tx, ty, 8 + 2 * L, C[6], C[4], 0.7);
      } else if (lastPts) {
        // the spent channel cools to a dotted trace while the runtime fades it out
        trace(p, lastPts, C[4], 0.8);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
