// A wake seen from above, for a fin cutting across a top-down arena: the effect rides with the fin at (0, 0) and
// `dir` is where it is heading (any angle, diagonals included). Foam peels off both sides into a V that stays put
// on the water while the fin moves on (bits drift back at `speed`), a pale streak of churned water follows the
// centre line, and spray flicks up at the fin. Made for a game whose shark swims across the floor.
import { fit, clamp, Rng, WHITE } from "../../core/index.js";

export const meta = {
  name: "Shark wake",
  desc: "A V of foam peels off a fin seen from above, at any heading: it stays on the water as the fin moves on, with a churned streak and spray at the fin.",
  tags: ["water", "wake", "foam", "shark", "trail", "top-down", "loop"],
  size: [240, 180],
  origin: [120, 90],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "dark",
  // dir: heading (unit vector, screen space); speed: how fast the fin moves, px/s; spread: how fast the V opens, px/s
  options: { palette: ["#0a1630", "#123063", "#1b5596", "#2a7fc4", "#45a9e3", "#86d3f5", "#cdf1ff", "#ffffff"], dir: [1, 0], speed: 200, spread: 58, seed: 7 },
};

const LIFE = 0.5, EMIT = 1 / 90;

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);
  const foam = [], churn = [], spray = [];
  let t = 0, acc = 0;
  return {
    update(dt) {
      t += dt;
      const [dx, dy] = o.dir, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, px = -uy, py = ux, back = o.speed;
      // everything already on the water drifts back as the fin moves on, so it stays put in the world
      for (const list of [foam, churn, spray]) for (const b of list) { b.age += dt; b.x += b.vx * dt - ux * back * dt; b.y += b.vy * dt - uy * back * dt; }
      for (const s of spray) s.vz -= 160 * dt, (s.z += s.vz * dt);
      acc += dt;
      while (acc >= EMIT) {
        acc -= EMIT;
        for (const side of [-1, 1]) {
          // a foam bit leaves the fin's shoulder and heads out along its arm of the V (now and then a gap, so it breaks up)
          if (!R.chance(0.75)) continue;
          const k = R.range(0.6, 1.3) * o.spread;
          foam.push({ x: px * side * 2 - ux * 2, y: py * side * 2 - uy * 2, vx: px * side * k, vy: py * side * k, age: 0, life: LIFE * R.range(0.7, 1.1), side, ax: -ux + px * side * (o.spread / back) * 1.2, ay: -uy + py * side * (o.spread / back) * 1.2 });
        }
        if (R.chance(0.45)) churn.push({ x: -ux * 3 + px * R.range(-3, 3), y: -uy * 3 + py * R.range(-3, 3), vx: px * R.range(-10, 10), vy: py * R.range(-10, 10), age: 0, life: LIFE * R.range(0.6, 1), r: R.range(1.5, 3) });
        if (R.chance(0.35)) spray.push({ x: ux * 2 + R.range(-2, 2), y: uy * 2 + R.range(-2, 2), vx: px * R.range(-30, 30) + ux * back * 0.6, vy: py * R.range(-30, 30) + uy * back * 0.6, z: 0, vz: R.range(30, 60), age: 0, life: 0.4 });
      }
      for (const list of [foam, churn, spray]) for (let i = list.length - 1; i >= 0; i--) if (list[i].age >= list[i].life || (list[i].z !== undefined && list[i].z < 0)) list.splice(i, 1);
    },
    draw(p) {
      // churned water down the centre line: soft, translucent, paling as it settles
      for (const c of churn) {
        const k = 1 - c.age / c.life;
        p.disc(c.x, c.y, c.r * (1 + (1 - k) * 1.4), C[4], 0.14 * k);
      }
      // the V: short dashes laid along each arm, white at the fin cooling to blue and dithering out
      for (const f of foam) {
        const k = 1 - f.age / f.life, al = Math.hypot(f.ax, f.ay) || 1, ax = f.ax / al, ay = f.ay / al;
        const c = k > 0.8 ? WHITE : k > 0.55 ? C[6] : k > 0.3 ? C[5] : C[4];
        const d = k > 0.7 ? 2.5 : k > 0.4 ? 1.5 : 0.5;
        p.line(f.x - ax * d, f.y - ay * d, f.x + ax * d, f.y + ay * d, c, Math.min(1, k * 1.6));
        // the crest curls over on its outer side while it is fresh
        if (k > 0.55) p.dot(f.x + (-ay) * f.side * 1, f.y + ax * f.side * 1, C[5], k);
      }
      // the fin's bow: a bright cusp where the water splits, and a little light
      p.glow(0, 0, 9, C[5], 0.35);
      p.dot(0, 0, WHITE, 1);
      // spray flicking up off the fin
      for (const s of spray) p.dot(s.x, s.y - s.z, s.age < 0.15 ? WHITE : C[6], 1 - s.age / s.life);
    },
  };
}
