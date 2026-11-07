// A nail fired from a nail gun, flying right with its point at (0, 0): a steel shank with a flat head, a glint
// sliding down it, a short motion streak behind, and now and then a spark flicking off the tip. Made for a
// mechanic's nail gun.
import { fit, rng, WHITE } from "../../core/index.js";

export const meta = {
  name: "Nail shot",
  desc: "A steel nail flies point first: a flat head and a lit shank with a glint sliding down it, a short streak behind and sparks flicking off the tip.",
  tags: ["projectile", "nail", "steel", "bullet", "mechanic", "loop"],
  size: [64, 24],
  origin: [52, 12],
  duration: 0.6,
  loop: true,
  fps: 30,
  bg: "dark",
  // palette: steel, dark to light; sparks: hot to cool
  options: { palette: ["#0c0e14", "#2e3648", "#4a5468", "#6e7a90", "#9aa6ba", "#d0d8e6", "#ffffff"], sparks: ["#fff3a6", "#ffc23d", "#f2561d"], seed: 3 },
};

export function draw(p, t, o) {
  const C = fit(o.palette, 7), f = Math.floor(t * 30 + 1e-6), r = rng(o.seed, 5, f);
  // motion streak: broken lines behind the nail, thinning out
  for (let i = 0; i < 3; i++) {
    const y = (i - 1) * 2, x0 = -14 - r.int(0, 4), len = 10 + r.int(0, 10) - Math.abs(y) * 2;
    p.line(x0 - len, y, x0, y, i === 1 ? C[3] : C[2], 0.7);
  }
  // the nail: point, shank lit on top, flat head
  p.px(0, 0, C[5]);
  p.line(-1, -1, -10, -1, C[5]);
  p.line(-1, 0, -10, 0, C[4]);
  p.line(-2, 1, -10, 1, C[2]);
  p.rect(-13, -3, 3, 7, C[3]);
  p.line(-13, -3, -13, 3, C[5]);
  // a glint sliding down the shank
  const g = -1 - ((f * 3) % 10);
  p.px(g, -1, WHITE);
  p.glow(-5, 0, 7, C[4], 0.25);
  // a spark flicking off the tip every few frames
  if (f % 4 === 0) {
    const s = fit(o.sparks, 3);
    p.px(1, r.int(-2, 2), s[0]);
    p.px(-1 - r.int(1, 3), -2 - r.int(0, 2), s[1]);
    p.glow(0, 0, 4, s[1], 0.4);
  }
}
