// ARQUIVO GERADO: fx-pixel.js + vendor/pixelfx (MIT) num script comum, que funciona até abrindo o index.html direto pelo arquivo.
// Não edite aqui. Depois de mexer no fx-pixel.js, gere de novo com: npx esbuild fx-pixel.js --bundle --format=iife --target=es2019 --legal-comments=inline --outfile=fx-pixel.bundle.js
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // vendor/pixelfx/src/core/math.js
  var TAU = Math.PI * 2;
  var clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  var lerp = (a, b, t) => a + (b - a) * t;
  var wrap = (x, m) => (x % m + m) % m;
  var seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
  var smooth = (e0, e1, x) => {
    const t = seg(x, e0, e1);
    return t * t * (3 - 2 * t);
  };
  var ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inExpo: (t) => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
    outExpo: (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inSine: (t) => 1 - Math.cos(t * Math.PI / 2),
    outSine: (t) => Math.sin(t * Math.PI / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inBack: (t, s = 1.70158) => t <= 0 ? 0 : t >= 1 ? 1 : (s + 1) * t * t * t - s * t * t,
    outBack: (t, s = 1.70158) => t <= 0 ? 0 : t >= 1 ? 1 : 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    outElastic: (t) => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
    outBounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    }
  };
  function hash(...ns) {
    let h = 2654435769;
    for (const n of ns) {
      h = Math.imul(h ^ (n | 0), 2246822507);
      h ^= h >>> 13;
      h = Math.imul(h, 3266489909);
      h ^= h >>> 16;
    }
    return h >>> 0;
  }
  var rand = (...ns) => hash(...ns) / 4294967296;
  var Rng = class {
    constructor(seed = 1) {
      this.s = seed >>> 0 || 1;
    }
    next() {
      let t = this.s = this.s + 1831565813 >>> 0;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    range(a, b) {
      return a + (b - a) * this.next();
    }
    int(a, b) {
      return Math.floor(this.range(a, b + 1));
    }
    chance(p) {
      return this.next() < p;
    }
    sign() {
      return this.next() < 0.5 ? -1 : 1;
    }
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    }
    /** Roughly normal, mean 0, sd 1. */
    gauss() {
      return (this.next() + this.next() + this.next() + this.next() - 2) * 1.732;
    }
  };
  var rng = (...ns) => new Rng(hash(...ns));
  function noise(x, seed = 0) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(rand(i, seed), rand(i + 1, seed), u) * 2 - 1;
  }
  function tileNoise(x, y, px = 0, py = 0, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const x0 = px ? wrap(ix, px) : ix, x1 = px ? wrap(ix + 1, px) : ix + 1;
    const y0 = py ? wrap(iy, py) : iy, y1 = py ? wrap(iy + 1, py) : iy + 1;
    const a = rand(x0, y0, seed), b = rand(x1, y0, seed), c = rand(x0, y1, seed), d = rand(x1, y1, seed);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
  }
  function tileFbm(x, y, px = 0, py = 0, seed = 0, octaves = 3) {
    let s = 0, a = 0.5, n = 0, k = 1;
    for (let o = 0; o < octaves; o++) {
      s += tileNoise(x * k, y * k, px * k, py * k, seed + o * 101) * a;
      n += a;
      a *= 0.5;
      k *= 2;
    }
    return s / n;
  }

  // vendor/pixelfx/src/core/color.js
  var rgb = (r, g, b) => 255 << 24 | (b & 255) << 16 | (g & 255) << 8 | r & 255;
  var red = (c) => c & 255;
  var green = (c) => c >>> 8 & 255;
  var blue = (c) => c >>> 16 & 255;
  function hex(h) {
    if (typeof h === "number") return h;
    let s = h.replace("#", "");
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    const v = parseInt(s.slice(0, 6), 16);
    return rgb(v >> 16 & 255, v >> 8 & 255, v & 255);
  }
  var toHex = (c) => "#" + [red(c), green(c), blue(c)].map((v) => v.toString(16).padStart(2, "0")).join("");
  function mix(a, b, t) {
    t = clamp(t);
    return rgb(red(a) + (red(b) - red(a)) * t, green(a) + (green(b) - green(a)) * t, blue(a) + (blue(b) - blue(a)) * t);
  }
  var scale = (c, k) => rgb(Math.min(255, red(c) * k), Math.min(255, green(c) * k), Math.min(255, blue(c) * k));
  var luma = (c) => (0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c)) / 255;
  var ramp = (list) => list.map(hex);
  function fit(r, n) {
    r = r.map(hex);
    if (r.length === n) return r;
    return Array.from({ length: n }, (_, i) => r[Math.round(i * (r.length - 1) / Math.max(1, n - 1))]);
  }
  var PAL = {
    fire: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
    ember: ["#1a0a0e", "#3d1012", "#701a14", "#a8301a", "#e0561e", "#ff8a2a", "#ffc46a"],
    lava: ["#14060a", "#380a10", "#6e1210", "#ac2410", "#e8501a", "#ff8c2a", "#ffd25a"],
    smoke: ["#0e0c12", "#1d1a22", "#2e2a35", "#433e4b", "#5c5664", "#7b7484", "#a39cab"],
    dust: ["#1c1610", "#33281c", "#4f3f2c", "#6e5a40", "#927a58", "#b89f78", "#dcc8a2"],
    ice: ["#0c1430", "#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"],
    water: ["#081830", "#0e2e5a", "#14508c", "#1c76bc", "#36a2e0", "#78ccf4", "#c4ecff", "#ffffff"],
    electric: ["#0a0f2e", "#172a78", "#2550d0", "#3f8cff", "#7cc8ff", "#c8f0ff", "#ffffff"],
    volt: ["#24160a", "#5e3a0c", "#a8680f", "#e8a218", "#ffd23c", "#fff08a", "#ffffff"],
    poison: ["#0d1a0c", "#173a14", "#265e18", "#3f8a1e", "#6cb82a", "#a8e04a", "#e0ff8a"],
    holy: ["#2a1c08", "#5a3e10", "#9a6c18", "#d8a428", "#ffd84a", "#fff09a", "#fffbe6", "#ffffff"],
    heal: ["#08201a", "#0f3f2c", "#17663e", "#24924e", "#3ec466", "#7ee88a", "#c8ffc4", "#ffffff"],
    arcane: ["#140a26", "#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"],
    shadow: ["#050308", "#0f0a18", "#1c1230", "#2c1a4a", "#432468", "#5e3290", "#8048b8", "#a970e0"],
    blood: ["#14040a", "#3a0a14", "#6a101c", "#a01824", "#d42a30", "#ff5a50", "#ff9a8a"],
    earth: ["#140e0a", "#2a1e14", "#47321e", "#69492a", "#8e6638", "#b88a52", "#dcb47c"],
    stone: ["#0e0e12", "#1c1c24", "#2c2c38", "#42424f", "#5c5c6b", "#7d7d8c", "#a4a4b2", "#d0d0da"],
    gold: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"],
    leaf: ["#0c1a0e", "#163418", "#225224", "#357530", "#4f9a3a", "#7cc048", "#b4e070", "#e4ffb0"],
    wood: ["#160c06", "#2e1a0c", "#4a2c14", "#6a421e", "#8e5c2c", "#b47c40", "#d8a464"],
    metal: ["#0c0e14", "#1c2230", "#2e3648", "#4a5468", "#6e7a90", "#9aa6ba", "#d0d8e6", "#ffffff"],
    bone: ["#1a1814", "#3a352c", "#5e5648", "#8a806c", "#b8ad96", "#e4dcc8", "#fffaf0"],
    neon: ["#1a0516", "#3d0a33", "#701560", "#b0228f", "#f53cd1", "#ff86e6", "#ffd2f6", "#ffffff"],
    cyber: ["#041418", "#08303a", "#0c5260", "#108088", "#18b4b0", "#4ce8d8", "#b4fff0", "#ffffff"],
    matrix: ["#020a04", "#05200c", "#0a3c16", "#106624", "#1a9a34", "#3cd650", "#a4ffa8", "#e8ffe8"],
    candy: ["#ff4a5a", "#ff9a2a", "#ffe03c", "#5ad84a", "#3cc8ff", "#7a6cff", "#f53cd1"],
    night: ["#07060d", "#0c0a18", "#131026", "#1b1734", "#241f44", "#2f2956"]
  };
  var RAMP = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, ramp(v)]));
  var WHITE = hex("#ffffff");
  var BLACK = hex("#000000");
  var INK = hex("#0b0a10");
  var PATCH = hex("#f53cd1");

  // vendor/pixelfx/src/core/particles.js
  function cycle(t, period, count, seed, life, fn) {
    for (let i = 0; i < count; i++) {
      const g = rng(seed, i, 911);
      const born = g.next() * period;
      const L = typeof life === "function" ? life(g) : life;
      let age = ((t - born) % period + period) % period;
      for (; age < L; age += period) fn(age, L, rng(seed, i), i);
    }
  }

  // vendor/pixelfx/src/core/sim.js
  var GRAVITY = 950;
  var CROSS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var HOT = ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"].map(hex);
  var FIRE_RAMP = ["#ffffff", "#fff3a6", "#ffe26b", "#ffc23d", "#ff8a2a", "#f2561d", "#c9281f", "#8a1f17", "#4a1712"].map(hex);
  var SMOKE_RAMP = ["#7b6f72", "#5d5660", "#433d48", "#2b2630", "#1a171e"].map(hex);
  var rampAt = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];
  var P = { SPARK: 0, MOTE: 1, STREAK: 2, FLAKE: 3, VAPOUR: 4, DUST: 5, STAR: 6, EMBER: 7, SMOKE: 8, FIRE: 9, BRAND: 10, GRIT: 11 };
  var PF = { SMOKES: 1, BIG: 2, BACK: 4 };
  var SOFT = /* @__PURE__ */ new Set([P.VAPOUR, P.DUST, P.SMOKE]);
  var Particles = class {
    constructor(opts = {}) {
      var _a, _b, _c, _d, _e;
      this.R = (_b = opts.rng) != null ? _b : new Rng((_a = opts.seed) != null ? _a : 1);
      this.list = [];
      this.t = 0;
      this.ground = (_c = opts.ground) != null ? _c : (() => Infinity);
      this.sparks = ((_d = opts.sparks) != null ? _d : HOT).map(hex);
      this.haze = opts.haze === void 0 ? null : hex(opts.haze);
      this.onLand = (_e = opts.onLand) != null ? _e : null;
    }
    /** delay: seconds before it appears; flag: PF bits. col 0 lets FIRE and SMOKE use their own ramps. */
    spawn(k, x, y, vx, vy, life, col = WHITE, size = 1, delay = 0, flag = 0) {
      this.list.push({ k, x, y, vx, vy, life, max: life, col: col ? hex(col) : 0, size, seed: this.R.next() * 100, delay, flag });
    }
    get count() {
      return this.list.length;
    }
    update(dt) {
      var _a;
      this.t += dt;
      const R = this.R, t = this.t;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        if (p.delay > 0) {
          p.delay -= dt;
          continue;
        }
        if ((p.life -= dt) <= 0) {
          if (p.k === P.FIRE && p.flag & PF.SMOKES) {
            const big = p.flag & PF.BIG;
            this.spawn(P.SMOKE, p.x, p.y, p.vx * 0.6, p.vy * 0.6 - 6, big ? R.range(1.3, 2.3) : R.range(0.8, 1.4), 0, p.size * (big ? 0.85 : 0.7), 0, big ? PF.BIG : 0);
          }
          this.list.splice(i, 1);
          continue;
        }
        switch (p.k) {
          case P.FIRE:
            p.vy -= 95 * dt;
            p.vx += Math.sin(t * 17 + p.seed) * 30 * dt;
            p.vx -= p.vx * 5 * dt;
            p.vy -= p.vy * 3.2 * dt;
            break;
          case P.GRIT: {
            p.vy += GRAVITY * dt;
            p.vx -= p.vx * 0.8 * dt;
            const g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt;
            if (p.vy > 0 && p.y <= g && ny >= g) {
              p.y = g - 0.25;
              if (p.vy > 130 && R.chance(0.4)) p.vy = -p.vy * 0.25, p.vx = p.vx * 0.5 + R.range(-10, 10);
              else p.vx = p.vy = 0, p.life = Math.min(p.life, 0.5);
            } else p.y = ny;
            continue;
          }
          case P.BRAND: {
            p.vy += GRAVITY * 0.8 * dt;
            p.vx -= p.vx * 0.9 * dt;
            if (R.chance(0.9 * Math.min(1, dt * 60))) this.spawn(P.FIRE, p.x, p.y, p.vx * 0.1 + R.range(-7, 7), p.vy * 0.1 - 10, R.range(0.16, 0.32), 0, R.range(0.9, 1.7) * (0.5 + p.life / p.max * 0.6), 0, R.chance(0.4) ? PF.SMOKES : 0);
            const g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt;
            if (p.vy > 0 && p.y <= g && ny >= g) {
              (_a = this.onLand) == null ? void 0 : _a.call(this, p.x, g);
              this.list.splice(i, 1);
            } else p.y = ny;
            continue;
          }
          case P.SPARK: {
            p.vy += GRAVITY * 0.45 * dt;
            p.vx -= p.vx * 2.2 * dt;
            p.vy -= p.vy * 2.2 * dt;
            const g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt;
            if (p.vy > 0 && p.y <= g && ny >= g) p.vy = -p.vy * 0.45, p.vx *= 0.7, p.y = g - 0.25;
            else p.y = ny;
            continue;
          }
          case P.STREAK:
            p.vx += p.vx * 3 * dt, p.vy += p.vy * 3 * dt;
            break;
          case P.FLAKE:
            p.vx -= p.vx * 2.2 * dt;
            p.vy -= p.vy * 2.2 * dt - 35 * dt;
            p.x += Math.sin(this.t * 2.5 + p.seed) * 7 * dt;
            break;
          case P.EMBER:
            p.vy += (-30 + Math.sin(t * 3 + p.seed) * 20) * dt;
            p.vx += Math.cos(t * 2.3 + p.seed) * 45 * dt;
            p.vx -= p.vx * 1.6 * dt;
            p.vy -= p.vy * 1.6 * dt;
            break;
          case P.SMOKE: {
            const big = p.flag & PF.BIG;
            p.vy -= (big ? 23 : 16) * dt;
            p.vx += Math.sin(t * 1.3 + p.seed) * 8 * dt;
            p.vx -= p.vx * 1.6 * dt;
            p.vy -= p.vy * 1.2 * dt;
            break;
          }
          case P.MOTE:
            p.vx -= p.vx * 0.6 * dt;
            p.vy -= p.vy * 0.6 * dt;
            break;
          default: {
            const drag = SOFT.has(p.k) ? 4 : 1.6;
            p.vx -= p.vx * drag * dt;
            p.vy -= p.vy * drag * dt + 5 * dt;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    draw(p, layer) {
      for (const q of this.list) {
        if (q.delay > 0) continue;
        if (layer && (SOFT.has(q.k) || q.flag & PF.BACK ? "back" : "front") !== layer) continue;
        const k = q.life / q.max, x = q.x, y = q.y, sp = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / sp, uy = q.vy / sp;
        switch (q.k) {
          case P.SPARK: {
            const S = this.sparks, head4 = k > 0.6 ? S[0] : k > 0.3 ? S[1] : S[2], len2 = Math.min(9, 1 + sp * 0.022);
            p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head4 : S[S.length - 1]);
            p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head4);
            p.glow(x, y, 3, head4, 0.45 * k);
            break;
          }
          case P.MOTE: {
            const len2 = Math.min(16, 0.5 + sp * 0.026) * q.size, a = k < 0.35 ? k / 0.35 : 1;
            p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.35, y - uy * len2 * 0.35, scale(q.col, 0.55), a);
            p.line(x - ux * len2 * 0.4, y - uy * len2 * 0.4, x, y, q.col, a);
            p.glow(x, y, 2.5 + q.size, q.col, 0.4 * k);
            break;
          }
          case P.STREAK: {
            const L = clamp(sp / 30, 1, 7);
            for (let d = L; d >= 0; d -= 0.5) p.dot(x - ux * d, y - uy * d, d < 1 ? WHITE : d < L * 0.5 ? q.col : scale(q.col, 0.6), d < L * 0.5 ? 1 : 1.2 - d / L);
            p.glow(x, y, 4, q.col, 0.4);
            break;
          }
          case P.FLAKE: {
            const a = Math.min(1, k * 3);
            p.dot(x, y, q.col, a);
            if (q.size > 1.3) for (const [dx, dy] of CROSS) p.dot(x + dx, y + dy, scale(q.col, 0.8), a * 0.8);
            break;
          }
          case P.VAPOUR: {
            const r = q.size * (0.6 + (1 - k) * 0.9);
            p.disc(x, y, r, q.col, Math.pow(k, 1.3) * 0.45);
            if (this.haze) p.glow(x, y, r * 1.8, this.haze, 0.16 * k);
            break;
          }
          case P.DUST:
            p.disc(x, y, q.size * (0.6 + (1 - k) * 0.9), q.col, Math.pow(k, 1.3) * 0.7);
            break;
          case P.SMOKE: {
            const age = 1 - k, big = q.flag & PF.BIG;
            const r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * (big ? 0.5 : 0.4));
            const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * (big ? 0.7 : 0.58);
            const c = q.col ? mix(q.col, rampAt(SMOKE_RAMP, age), age) : rampAt(SMOKE_RAMP, age * 1.05);
            p.disc(x, y, r, c, a * 0.45);
            p.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62);
            if (age < 0.5) p.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
            break;
          }
          case P.FIRE: {
            const age = 1 - k, heat = Math.min(0.999, Math.pow(age, 0.62) + q.seed % 1 * 0.1), F = FIRE_RAMP, n = F.length;
            const idx = Math.min(n - 2, Math.floor(heat * (n - 1)));
            const r = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = F[idx];
            if (idx >= n - 2) p.disc(x, y, r, c, Math.min(1, k * 3) * 0.85);
            else {
              p.circle(x, y, r, F[Math.min(n - 1, idx + 2)]);
              p.circle(x - r * 0.16, y - r * 0.22, r * 0.78, c);
              if (r > 1.6) p.circle(x, y - r * 0.9, r * 0.42, c);
              if (idx <= 3 && r > 1.8) p.circle(x - r * 0.28, y - r * 0.34, r * 0.36, F[Math.max(0, idx - 1)]);
              if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, 0.18 * k);
            }
            break;
          }
          case P.BRAND:
            p.circle(x, y, 1.6, HOT[3]);
            p.px(x, y, Math.sin(this.t * 40 + q.seed) > 0 ? HOT[0] : HOT[1]);
            p.px(x + 1, y, HOT[1]);
            p.glow(x, y, 7, HOT[2], 0.45);
            break;
          case P.GRIT:
            if (k > 0.25 || k * 4 > 0.5) {
              p.px(x, y, q.col);
              if (q.size >= 2) p.px(x + 1, y, q.col), p.px(x, y + 1, scale(q.col, 0.8)), p.px(x + 1, y + 1, scale(q.col, 0.7));
            }
            break;
          case P.EMBER: {
            const c = k > 0.6 ? this.sparks[0] : k > 0.3 ? this.sparks[1] : this.sparks[2];
            if (k < 0.25 && Math.sin(this.t * 40 + q.seed) < 0) break;
            p.px(x, y, c);
            if (q.size > 1.5) p.px(x, y + 1, this.sparks[this.sparks.length - 1]);
            p.glow(x, y, 3 + q.size, c, 0.35 * k);
            break;
          }
          default: {
            const tw = 0.6 + 0.4 * Math.sin(this.t * (8 + q.seed % 5) + q.seed);
            if (q.size < 1) {
              if (tw * k > 0.25) p.px(x, y, tw > 0.8 ? WHITE : q.col);
              p.glow(x, y, 3, q.col, 0.4 * k * tw);
              break;
            }
            sparkle(p, x, y, q.size * tw * Math.min(1, k * 3), q.col, scale(q.col, 0.75), 0.5 * k * tw);
          }
        }
      }
    }
  };
  var B = { SHARD: 0, CHUNK: 1, DRIP: 2 };
  var Bits = class {
    constructor(opts = {}) {
      var _a;
      this.list = [];
      this.ground = (_a = opts.ground) != null ? _a : (() => Infinity);
    }
    add(b) {
      var _a;
      const life = (_a = b.life) != null ? _a : 1;
      this.list.push({ kind: B.SHARD, vx: 0, vy: 0, a: 0, va: 0, s: 1, c: WHITE, g: 1, drag: 0, bounce: 0, rest: false, ...b, life, max: life });
    }
    get count() {
      return this.list.length;
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const b = this.list[i];
        if ((b.life -= dt) <= 0) {
          this.list.splice(i, 1);
          continue;
        }
        if (b.rest) continue;
        b.vy += GRAVITY * b.g * dt;
        b.vx -= b.vx * b.drag * dt;
        b.vy -= b.vy * b.drag * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.a += b.va * dt;
        const floor = this.ground(b.x), sp = b.vy;
        if (b.g <= 0 || b.y < floor || sp <= 0) continue;
        b.y = floor - 0.01;
        if (b.kind === B.DRIP) b.life = 0;
        else if (b.bounce > 0 && sp > 70) b.vy = -sp * b.bounce, b.vx *= 0.7, b.va *= 0.6;
        else b.rest = true, b.vx = b.vy = 0;
      }
    }
    draw(p) {
      var _a;
      for (const b of this.list) {
        const a = Math.min(1, b.life / 0.4), ca = Math.cos(b.a), sa = Math.sin(b.a);
        if (b.kind === B.SHARD) {
          for (let d = -b.s / 2; d <= b.s / 2; d += 0.5) p.dot(b.x + ca * d, b.y + sa * d, d > b.s / 2 - 0.6 ? WHITE : hex(b.c), a);
        } else if (b.kind === B.DRIP) {
          p.dot(b.x, b.y, hex(b.c), a);
          p.dot(b.x, b.y - 1, hex(b.c), a * 0.5);
        } else {
          const R = ((_a = b.ramp) != null ? _a : ["#1c2030", "#3a4a66", "#6e86a8", "#a8c0dc", "#e8f2ff"]).map(hex), n = R.length;
          const x = Math.round(b.x), y = Math.round(b.y), r = Math.ceil(b.s) + 1;
          for (let py = -r; py <= r; py++)
            for (let px = -r; px <= r; px++) {
              const u = (px + 0.5) * ca + (py + 0.5) * sa, v = -(px + 0.5) * sa + (py + 0.5) * ca;
              const d = Math.abs(u) / b.s + Math.abs(v) / (b.s * 0.62);
              if (d > 1.3) continue;
              p.dot(x + px, y + py, d > 1 ? R[0] : v < 0 ? u < 0 ? R[n - 1] : R[n - 2] : u < 0 ? R[n - 3] : R[Math.max(1, n - 4)], a);
            }
        }
      }
    }
  };
  var Lights = class {
    constructor() {
      this.list = [];
    }
    add(x, y, r, color, k, life) {
      this.list.push({ x, y, r, color: hex(color), k, life, max: life });
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) if ((this.list[i].life -= dt) <= 0) this.list.splice(i, 1);
    }
    draw(p) {
      for (const l of this.list) {
        const k = l.life / l.max;
        p.glow(l.x, l.y, l.r * (0.55 + 0.45 * k), l.color, l.k * k * k);
      }
    }
  };
  function sparkle(p, x, y, arm, c, tip = c, k = 0.6) {
    const n = Math.round(arm);
    if (n < 1) return;
    const X = Math.floor(x), Y = Math.floor(y);
    for (let d = 1; d <= n; d++) {
      const cc = d > n * 0.6 ? tip : c;
      for (const [dx, dy] of CROSS) p.px(X + dx * d, Y + dy * d, cc);
    }
    if (n >= 3) for (const [dx, dy] of DIAG) p.px(X + dx, Y + dy, c);
    if (n >= 6) for (const [dx, dy] of DIAG) p.px(X + dx * 2, Y + dy * 2, tip);
    p.px(X, Y, WHITE);
    p.glow(x, y, 4 + n * 2, c, k);
  }
  function flare(p, x, y, L, k, ramp2) {
    if (L < 1) return;
    const R = ramp2.map(hex), n = R.length;
    for (let i = 0; i < 8; i++) {
      const an = i * Math.PI / 4, len2 = i % 4 === 0 ? L : i % 2 === 0 ? L * 0.6 : L * 0.3, ca = Math.cos(an), sa = Math.sin(an);
      for (let d = 0; d <= len2; d += 0.5) {
        const u = d / len2;
        p.dot(x + ca * d, y + sa * d, u < 0.35 ? WHITE : u < 0.7 ? R[n - 2] : R[n - 3], u < 0.6 ? 1 : k * 1.5 * (1 - u) + 0.2);
      }
    }
  }
  function band(p, cx, cy, r, sy, th, k, ramp2, keep = () => true, hot = false) {
    if (r <= 0 || k <= 0) return;
    const R = ramp2.map(hex), n = R.length;
    for (let j = 0, m = Math.ceil(r * TAU * 1.2); j < m; j++) {
      const ang = j / m * TAU, ca = Math.cos(ang), sa = Math.sin(ang);
      if (!keep(ang)) continue;
      for (let o = th; o >= 0; o -= 0.5) {
        const u = o / th, c = u < 0.15 ? hot ? WHITE : R[n - 1] : u < 0.4 ? R[n - 2] : u < 0.7 ? R[n - 3] : R[n - 4];
        p.dot(cx + ca * (r - o), cy + sa * (r - o) * sy, c, k * (u < 0.4 ? 1.2 : 1.15 - u));
      }
    }
  }

  // vendor/pixelfx/src/core/font.js
  var MINI = {
    A: ".#.|#.#|###|#.#|#.#",
    B: "##.|#.#|##.|#.#|##.",
    C: ".##|#..|#..|#..|.##",
    D: "##.|#.#|#.#|#.#|##.",
    E: "###|#..|##.|#..|###",
    F: "###|#..|##.|#..|#..",
    G: ".##|#..|#.#|#.#|.##",
    H: "#.#|#.#|###|#.#|#.#",
    I: "###|.#.|.#.|.#.|###",
    J: "..#|..#|..#|#.#|.#.",
    K: "#.#|#.#|##.|#.#|#.#",
    L: "#..|#..|#..|#..|###",
    M: "#.#|###|###|#.#|#.#",
    N: "##.|#.#|#.#|#.#|#.#",
    O: ".#.|#.#|#.#|#.#|.#.",
    P: "##.|#.#|##.|#..|#..",
    Q: ".#.|#.#|#.#|##.|.##",
    R: "##.|#.#|##.|#.#|#.#",
    S: ".##|#..|.#.|..#|##.",
    T: "###|.#.|.#.|.#.|.#.",
    U: "#.#|#.#|#.#|#.#|###",
    V: "#.#|#.#|#.#|#.#|.#.",
    W: "#.#|#.#|###|###|#.#",
    X: "#.#|#.#|.#.|#.#|#.#",
    Y: "#.#|#.#|.#.|.#.|.#.",
    Z: "###|..#|.#.|#..|###",
    0: "###|#.#|#.#|#.#|###",
    1: ".#.|##.|.#.|.#.|###",
    2: "##.|..#|.#.|#..|###",
    3: "##.|..#|.#.|..#|##.",
    4: "#.#|#.#|###|..#|..#",
    5: "###|#..|##.|..#|##.",
    6: ".##|#..|###|#.#|###",
    7: "###|..#|.#.|.#.|.#.",
    8: "###|#.#|###|#.#|###",
    9: "###|#.#|###|..#|##.",
    "+": "...|.#.|###|.#.|...",
    "-": "...|...|###|...|...",
    "!": "#|#|#|.|#",
    "?": "##.|..#|.#.|...|.#.",
    ".": ".|.|.|.|#",
    ",": "..|..|..|.#|#.",
    ":": ".|#|.|#|.",
    "/": "..#|..#|.#.|#..|#..",
    "%": "#.#|..#|.#.|#..|#.#",
    x: "...|#.#|.#.|#.#|...",
    "*": "#.#|.#.|#.#|...|...",
    "'": "#|#|.|.|.",
    "(": ".#|#.|#.|#.|.#",
    ")": "#.|.#|.#|.#|#.",
    "<": "..#|.#.|#..|.#.|..#",
    ">": "#..|.#.|..#|.#.|#..",
    "=": "...|###|...|###|...",
    _: "...|...|...|...|###",
    "#": "#.#|###|#.#|###|#.#"
  };
  var BIG = {
    A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
    B: "####.|#...#|#...#|####.|#...#|#...#|####.",
    C: ".###.|#...#|#....|#....|#....|#...#|.###.",
    D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
    E: "#####|#....|#....|####.|#....|#....|#####",
    F: "#####|#....|#....|####.|#....|#....|#....",
    G: ".###.|#...#|#....|#.###|#...#|#...#|.####",
    H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
    I: "###|.#.|.#.|.#.|.#.|.#.|###",
    J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
    K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
    L: "#....|#....|#....|#....|#....|#....|#####",
    M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
    N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
    O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
    P: "####.|#...#|#...#|####.|#....|#....|#....",
    Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
    R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
    S: ".####|#....|#....|.###.|....#|....#|####.",
    T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
    U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
    V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
    W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.",
    X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
    Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
    Z: "#####|....#|...#.|..#..|.#...|#....|#####",
    0: ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
    1: ".#.|##.|.#.|.#.|.#.|.#.|###",
    2: ".###.|#...#|....#|...#.|..#..|.#...|#####",
    3: "#####|...#.|..#..|...#.|....#|#...#|.###.",
    4: "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
    5: "#####|#....|####.|....#|....#|#...#|.###.",
    6: "..##.|.#...|#....|####.|#...#|#...#|.###.",
    7: "#####|....#|...#.|..#..|.#...|.#...|.#...",
    8: ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
    9: ".###.|#...#|#...#|.####|....#|...#.|.##..",
    "!": "#|#|#|#|#|.|#",
    "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
    "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
    "-": "....|....|....|####|....|....|....",
    ".": ".|.|.|.|.|.|#",
    ",": "..|..|..|..|..|.#|#.",
    ":": ".|.|#|.|.|#|.",
    "/": "....#|....#|...#.|..#..|.#...|#....|#....",
    "%": "##...|##..#|...#.|..#..|.#...|#..##|...##",
    x: ".....|.....|#...#|.#.#.|..#..|.#.#.|#...#",
    "*": ".....|..#..|#.#.#|.###.|#.#.#|..#..|.....",
    "'": "#|#|.|.|.|.|.",
    "<": "...#|..#.|.#..|#...|.#..|..#.|...#",
    ">": "#...|.#..|..#.|...#|..#.|.#..|#...",
    "=": "....|....|####|....|####|....|....",
    "(": "..#|.#.|#..|#..|#..|.#.|..#",
    ")": "#..|.#.|..#|..#|..#|.#.|#..",
    "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#."
  };
  function build(table, h) {
    const out = {};
    for (const [ch, src] of Object.entries(table)) {
      const rows = src.split("|");
      out[ch] = { w: rows[0].length, rows: rows.map((r) => [...r].map((c) => c === "#")) };
      if (rows.length !== h) throw new Error(`glyph ${ch} has ${rows.length} rows, expected ${h}`);
    }
    return out;
  }
  var FONTS = {
    mini: { h: 5, space: 2, gap: 1, glyphs: build(MINI, 5) },
    big: { h: 7, space: 3, gap: 1, glyphs: build(BIG, 7) }
  };
  function textWidth(str, font = "mini") {
    var _a;
    const F = FONTS[font];
    let w = 0;
    for (const ch of String(str)) {
      const g = (_a = F.glyphs[ch]) != null ? _a : F.glyphs[ch.toUpperCase()];
      w += (g ? g.w : F.space) + F.gap;
    }
    return Math.max(0, w - F.gap);
  }
  function rasterText(str, font, plot2) {
    var _a;
    const F = FONTS[font];
    let x = 0;
    for (const ch of String(str)) {
      const g = (_a = F.glyphs[ch]) != null ? _a : F.glyphs[ch.toUpperCase()];
      if (!g) {
        x += F.space + F.gap;
        continue;
      }
      for (let r = 0; r < F.h; r++) for (let c = 0; c < g.w; c++) if (g.rows[r][c]) plot2(x + c, r);
      x += g.w + F.gap;
    }
  }

  // vendor/pixelfx/src/core/painter.js
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  var OUT = { c: 0, a: 1, l: 0, k: 0 };
  var sprites = /* @__PURE__ */ new WeakMap();
  var call = (v, ...args) => typeof v === "function" ? v(...args) : v;
  var Painter = class {
    constructor(frame2) {
      this.frame = frame2;
      this.reset();
    }
    /** Re-read the frame and clear placement, fade and light strength. */
    reset() {
      const f = this.frame;
      this.w = f.w;
      this.h = f.h;
      this.ox = f.ox | 0;
      this.oy = f.oy | 0;
      this.C = f.color;
      this.L = f.light;
      this.tx = 0;
      this.ty = 0;
      this.fx = 1;
      this.cs = 1;
      this.sn = 0;
      this.fade = 1;
      this.lightK = 1;
      this.layer = "front";
      return this;
    }
    /** Put the effect's origin at (x, y) in frame space, mirrored if flip, rotated by angle (radians). */
    place(x, y, flip = false, angle = 0) {
      this.tx = x;
      this.ty = y;
      this.fx = flip ? -1 : 1;
      this.cs = Math.cos(angle);
      this.sn = Math.sin(angle);
      return this;
    }
    // ---- transforms: local (effect) space <-> screen (frame) space
    toX(x, y) {
      return this.tx + x * this.fx * this.cs - y * this.sn;
    }
    toY(x, y) {
      return this.ty + x * this.fx * this.sn + y * this.cs;
    }
    fromX(sx, sy) {
      const dx = sx - this.tx, dy = sy - this.ty;
      return (dx * this.cs + dy * this.sn) * this.fx;
    }
    fromY(sx, sy) {
      const dx = sx - this.tx, dy = sy - this.ty;
      return -dx * this.sn + dy * this.cs;
    }
    // the screen pixel of the local pixel cell holding (x, y): mirrors and rotations land on whole cells
    cellX(x, y) {
      return Math.floor(this.toX(Math.floor(x) + 0.5, Math.floor(y) + 0.5));
    }
    cellY(x, y) {
      return Math.floor(this.toY(Math.floor(x) + 0.5, Math.floor(y) + 0.5));
    }
    // ---- raw writes, screen space, whole pixels. Color 0 means "nothing": it never erases what's there.
    put(sx, sy, c, a = 1) {
      if (!c) return;
      a *= this.fade;
      if (a < 1 && a <= BAYER[(sy & 3) << 2 | sx & 3]) return;
      const x = sx - this.ox, y = sy - this.oy;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.C[y * this.w + x] = c;
    }
    add(sx, sy, c, k = 1) {
      k *= this.fade * this.lightK;
      if (k <= 4e-3) return;
      const x = sx - this.ox, y = sy - this.oy;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x, d = this.L[i];
      const r = Math.min(255, (d & 255) + (c & 255) * k) | 0;
      const g = Math.min(255, (d >>> 8 & 255) + (c >>> 8 & 255) * k) | 0;
      const b = Math.min(255, (d >>> 16 & 255) + (c >>> 16 & 255) * k) | 0;
      this.L[i] = 255 << 24 | b << 16 | g << 8 | r;
    }
    /**
     * Blend a color over what's there at alpha a (0..1), keeping the result's own alpha: soft smoke, vapour and
     * mist. Use dithered dot() for hard pixel fades and blend() for translucent volumes.
     */
    blendPx(sx, sy, c, a) {
      a *= this.fade;
      if (!c || a <= 4e-3) return;
      const x = sx - this.ox, y = sy - this.oy;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x, d = this.C[i], da = (d >>> 24) / 255, oa = a + da * (1 - a), k = a / oa;
      const ch = (s) => (c >>> s & 255) * k + (d >>> s & 255) * (1 - k) & 255;
      this.C[i] = (oa * 255 & 255) << 24 | ch(16) << 16 | ch(8) << 8 | ch(0);
    }
    /** Translucent pixel at a local point. */
    blend(x, y, c, a) {
      this.blendPx(this.cellX(x, y), this.cellY(x, y), c, a);
    }
    /** A translucent disc: puffs of smoke, vapour, dust. c and a may be functions of (d: 0 center..1 rim, angle). */
    disc(cx, cy, r, c, a) {
      if (r < 0.5) return this.blend(cx, cy, call(c, 0, 0), call(a, 0, 0));
      this.each(cx - r, cy - r, cx + r, cy + r, (x, y, sx, sy) => {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r) return;
        const d = Math.sqrt(d2) / r, ang = Math.atan2(dy, dx);
        this.blendPx(sx, sy, call(c, d, ang), call(a, d, ang));
      });
    }
    /** Read back the color under a local point (0 if empty). */
    get(x, y) {
      const sx = this.cellX(x, y) - this.ox, sy = this.cellY(x, y) - this.oy;
      return sx < 0 || sy < 0 || sx >= this.w || sy >= this.h ? 0 : this.C[sy * this.w + sx];
    }
    // ---- pixels
    /** One opaque pixel. */
    px(x, y, c) {
      this.put(this.cellX(x, y), this.cellY(x, y), c, 1);
    }
    /** One pixel at alpha a (0..1), faded by ordered dither. */
    dot(x, y, c, a = 1) {
      if (a > 0) this.put(this.cellX(x, y), this.cellY(x, y), c, a);
    }
    /** Add light to one pixel. */
    light(x, y, c, k = 1) {
      this.add(this.cellX(x, y), this.cellY(x, y), c, k);
    }
    /**
     * Visit every screen pixel whose center falls in the local box [x0, x1] x [y0, y1], with that center in
     * local space: fn(lx, ly, sx, sy). The basis of every filled shape, so shapes mirror and rotate exactly.
     */
    each(x0, y0, x1, y1, fn) {
      let ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity;
      for (let k = 0; k < 4; k++) {
        const x = k & 1 ? x1 : x0, y = k & 2 ? y1 : y0, sx = this.toX(x, y), sy = this.toY(x, y);
        if (sx < ax) ax = sx;
        if (sx > bx) bx = sx;
        if (sy < ay) ay = sy;
        if (sy > by) by = sy;
      }
      const sx0 = Math.max(Math.floor(ax), this.ox), sx1 = Math.min(Math.ceil(bx), this.ox + this.w - 1);
      const sy0 = Math.max(Math.floor(ay), this.oy), sy1 = Math.min(Math.ceil(by), this.oy + this.h - 1);
      for (let sy = sy0; sy <= sy1; sy++)
        for (let sx = sx0; sx <= sx1; sx++) {
          const cx = sx + 0.5, cy = sy + 0.5;
          fn(this.fromX(cx, cy), this.fromY(cx, cy), sx, sy);
        }
    }
    /**
     * A pixel shader over a local box. fn(x, y, out) returns a color, or sets out.c (color), out.a (alpha),
     * out.l (light color, defaults to out.c) and out.k (light amount). Return nothing to leave the pixel alone.
     */
    shade(x0, y0, x1, y1, fn) {
      const o = OUT;
      this.each(x0, y0, x1, y1, (lx, ly, sx, sy) => {
        o.c = 0;
        o.a = 1;
        o.l = 0;
        o.k = 0;
        const c = fn(lx, ly, o) || o.c;
        if (c) this.put(sx, sy, c, o.a);
        if (o.k > 0) this.add(sx, sy, o.l || c, o.k);
      });
    }
    // ---- shapes. Colors (c) and alphas (a) can be numbers or functions of the shape's own coordinates.
    /** 1 px line. c and a may be functions of u (0 at the start, 1 at the end). */
    line(x0, y0, x1, y1, c, a = 1) {
      let sx = this.cellX(x0, y0), sy = this.cellY(x0, y0);
      const ex = this.cellX(x1, y1), ey = this.cellY(x1, y1);
      const dx = Math.abs(ex - sx), dy = -Math.abs(ey - sy), stepx = sx < ex ? 1 : -1, stepy = sy < ey ? 1 : -1;
      const n = Math.max(dx, -dy) || 1, fc = typeof c === "function", fa = typeof a === "function";
      let err = dx + dy, i = 0;
      for (; ; ) {
        const u = i++ / n;
        this.put(sx, sy, fc ? c(u) : c, fa ? a(u) : a);
        if (sx === ex && sy === ey) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          sx += stepx;
        }
        if (e2 <= dx) {
          err += dx;
          sy += stepy;
        }
      }
    }
    /** Lines through a list of points [[x, y], ...]. */
    polyline(pts, c, a = 1) {
      for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, a);
    }
    /** Thick segment with round ends. c and a may be functions of (u along, v across: 0 center, 1 edge). */
    beam(x0, y0, x1, y1, width, c, a = 1) {
      const r = width / 2, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-9;
      this.shade(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (x, y, o) => {
        const u = clamp(((x - x0) * dx + (y - y0) * dy) / L2), px = x0 + dx * u - x, py = y0 + dy * u - y;
        const d2 = px * px + py * py;
        if (d2 > r * r) return;
        const v = Math.sqrt(d2) / r;
        o.c = call(c, u, v);
        o.a = call(a, u, v);
      });
    }
    /** Filled disc. c and a may be functions of (d: 0 center to 1 rim, angle). */
    circle(cx, cy, r, c, a = 1) {
      if (r < 0.6) return this.dot(cx, cy, call(c, 0, 0), call(a, 0, 0));
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r) return;
        const d = Math.sqrt(d2) / r, ang = Math.atan2(dy, dx);
        o.c = call(c, d, ang);
        o.a = call(a, d, ang);
      });
    }
    /** Ellipse. c and a may be functions of (d: 0 center to 1 rim, angle). */
    ellipse(cx, cy, rx, ry, c, a = 1) {
      if (rx <= 0 || ry <= 0) return;
      this.shade(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, o) => {
        const dx = (x - cx) / rx, dy = (y - cy) / ry, d2 = dx * dx + dy * dy;
        if (d2 > 1) return;
        const d = Math.sqrt(d2), ang = Math.atan2(dy, dx);
        o.c = call(c, d, ang);
        o.a = call(a, d, ang);
      });
    }
    /** Ring from radius r - w to r. c and a may be functions of (v: 0 inner to 1 outer, angle). */
    ring(cx, cy, r, w, c, a = 1) {
      const r0 = Math.max(0, r - w);
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r || d2 < r0 * r0) return;
        const v = w > 0 ? (Math.sqrt(d2) - r0) / (r - r0 || 1) : 1, ang = Math.atan2(dy, dx);
        o.c = call(c, v, ang);
        o.a = call(a, v, ang);
      });
    }
    /**
     * Band of a ring from angle a0 to a1 (radians, a1 > a0), radius r - w to r: the slash and smear shape.
     * c and a may be functions of (u: 0 at a0 to 1 at a1, v: 0 inner to 1 outer). w can be a function of u
     * for a crescent that tapers at both ends.
     */
    arc(cx, cy, r, w, a0, a1, c, a = 1) {
      const span = a1 - a0, wf = typeof w === "function";
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) return;
        let ang = Math.atan2(dy, dx) - a0;
        ang -= Math.floor(ang / (Math.PI * 2)) * Math.PI * 2;
        if (ang > span) return;
        const u = ang / span, ww = wf ? w(u) : w;
        if (ww <= 0 || d < r - ww) return;
        const v = (d - (r - ww)) / ww;
        o.c = call(c, u, v);
        o.a = call(a, u, v);
      });
    }
    /** Filled rectangle. */
    rect(x, y, w, h, c, a = 1) {
      if (this.sn === 0) {
        const X0 = Math.round(x), Y0 = Math.round(y), X1 = Math.round(x + w), Y1 = Math.round(y + h);
        for (let yy = Y0; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) this.put(this.cellX(xx, yy), this.cellY(xx, yy), c, a);
        return;
      }
      this.shade(x, y, x + w, y + h, (lx, ly, o) => {
        if (lx < x || ly < y || lx >= x + w || ly >= y + h) return;
        o.c = c;
        o.a = a;
      });
    }
    /** Filled polygon from points [[x, y], ...] (even-odd rule). */
    poly(pts, c, a = 1) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      const n = pts.length;
      this.shade(x0, y0, x1, y1, (x, y, o) => {
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (!inside) return;
        o.c = call(c, x, y);
        o.a = call(a, x, y);
      });
    }
    tri(x0, y0, x1, y1, x2, y2, c, a = 1) {
      this.poly([[x0, y0], [x1, y1], [x2, y2]], c, a);
    }
    // ---- light
    /** Radial glow into the light buffer: k at the center, falling to 0 at radius r. */
    glow(x, y, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      const cx = this.toX(x, y), cy = this.toY(x, y);
      const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
      for (let sy = y0; sy <= y1; sy++) {
        const dy = (sy + 0.5 - cy) / r;
        for (let sx = x0; sx <= x1; sx++) {
          const dx = (sx + 0.5 - cx) / r, d = dx * dx + dy * dy;
          if (d >= 1) continue;
          const f = 1 - Math.sqrt(d);
          this.add(sx, sy, c, f * f * k);
        }
      }
    }
    /** Glow around a segment (a soft beam of light). */
    glowLine(x0, y0, x1, y1, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      const ax = this.toX(x0, y0), ay = this.toY(x0, y0), bx = this.toX(x1, y1), by = this.toY(x1, y1);
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
      const X0 = Math.floor(Math.min(ax, bx) - r), X1 = Math.ceil(Math.max(ax, bx) + r);
      const Y0 = Math.floor(Math.min(ay, by) - r), Y1 = Math.ceil(Math.max(ay, by) + r);
      for (let sy = Y0; sy <= Y1; sy++)
        for (let sx = X0; sx <= X1; sx++) {
          const px = sx + 0.5, py = sy + 0.5, u = clamp(((px - ax) * dx + (py - ay) * dy) / L2);
          const ex = ax + dx * u - px, ey = ay + dy * u - py, d = Math.sqrt(ex * ex + ey * ey) / r;
          if (d >= 1) continue;
          const f = 1 - d;
          this.add(sx, sy, c, f * f * k);
        }
    }
    /** Glow hugging a circle of radius R (a shockwave's light), falling off over width r. */
    glowRing(x, y, R, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      const cx = this.toX(x, y), cy = this.toY(x, y), E = R + r;
      for (let sy = Math.floor(cy - E); sy <= Math.ceil(cy + E); sy++)
        for (let sx = Math.floor(cx - E); sx <= Math.ceil(cx + E); sx++) {
          const d = Math.abs(Math.hypot(sx + 0.5 - cx, sy + 0.5 - cy) - R) / r;
          if (d >= 1) continue;
          const f = 1 - d;
          this.add(sx, sy, c, f * f * k);
        }
    }
    // ---- sprites, text, masks
    /**
     * A little sprite from strings: rows like ["..##..", ".#oo#."], pal maps characters to colors
     * ({ "#": "#222034", o: 0xff... }); "." and " " are empty. Top-left at (x, y).
     * opts: { scale, a, flip (mirror left-right), flipY (upside down), tint (draw every pixel in one color) }.
     */
    sprite(rows, pal, x, y, opts = {}) {
      var _a, _b, _c, _d;
      let s = sprites.get(rows);
      if (!s) sprites.set(rows, s = rows.map((r) => [...r]));
      const k = (_a = opts.scale) != null ? _a : 1, a = (_b = opts.a) != null ? _b : 1, W = (_d = (_c = s[0]) == null ? void 0 : _c.length) != null ? _d : 0, cache = {};
      for (let r = 0; r < s.length; r++)
        for (let q = 0; q < s[r].length; q++) {
          const ch = s[r][q];
          if (ch === "." || ch === " ") continue;
          let c = opts.tint;
          if (c === void 0) {
            c = cache[ch];
            if (c === void 0) c = cache[ch] = pal[ch] === void 0 ? 0 : hex(pal[ch]);
          }
          if (!c) continue;
          const col = opts.flip ? W - 1 - q : q, row = opts.flipY ? s.length - 1 - r : r;
          if (k === 1) this.dot(x + col, y + row, c, a);
          else this.rect(x + col * k, y + row * k, k, k, c, a);
        }
    }
    /**
     * Pixel text. opts: { font: "mini" (3x5) | "big" (5x7), scale, align: "left" | "center" | "right",
     * outline: color, shadow: color, a }. (x, y) is the top of the text, at the left, center or right.
     */
    text(str, x, y, c, opts = {}) {
      var _a, _b, _c;
      const font = (_a = opts.font) != null ? _a : "mini", k = (_b = opts.scale) != null ? _b : 1, a = (_c = opts.a) != null ? _c : 1, w = textWidth(str, font) * k;
      const left = Math.round(opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x), top = Math.round(y);
      const ol = opts.outline, sh = opts.shadow;
      if (ol !== void 0) rasterText(str, font, (gx, gy) => this.rect(left + gx * k - 1, top + gy * k - 1, k + 2, k + 2, ol, a));
      if (sh !== void 0) rasterText(str, font, (gx, gy) => this.rect(left + gx * k + 1, top + gy * k + 1, k, k, sh, a));
      rasterText(str, font, (gx, gy) => this.rect(left + gx * k, top + gy * k, k, k, call(c, gx, gy), a));
    }
    /** Size of text in pixels: [w, h]. */
    measure(str, opts = {}) {
      var _a, _b, _c;
      const k = (_a = opts.scale) != null ? _a : 1;
      return [textWidth(str, (_b = opts.font) != null ? _b : "mini") * k, FONTS[(_c = opts.font) != null ? _c : "mini"].h * k];
    }
    /** Fill a mask ({ w, h, data }) with its top-left at (x, y). c may be a function of (mx, my). */
    mask(m, x, y, c, a = 1) {
      for (let my = 0; my < m.h; my++)
        for (let mx = 0; mx < m.w; mx++) if (m.data[my * m.w + mx]) this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
    }
    /** The 1 px outline just outside a mask. */
    outline(m, x, y, c, a = 1) {
      const at = (mx, my) => mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.data[my * m.w + mx];
      for (let my = -1; my <= m.h; my++)
        for (let mx = -1; mx <= m.w; mx++)
          if (!at(mx, my) && (at(mx - 1, my) || at(mx + 1, my) || at(mx, my - 1) || at(mx, my + 1)))
            this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
    }
  };

  // vendor/pixelfx/src/core/actor.js
  var HERO = [
    "....kkkkk...",
    "..kkhhhhhk..",
    ".khhhhhhhhk.",
    ".khhhhhhhhhk",
    ".khhssssshhk",
    ".khsessesshk",
    ".khsessesshk",
    "..ksssssssk.",
    "...kkSSSkk..",
    "..kttttttk..",
    ".kttTttTttk.",
    ".ksttTTttsk.",
    ".kstttttttk.",
    "..kbbbbbbk..",
    "..kppkkppk..",
    "..kppk.kppk.",
    "..kppk.kppk.",
    "..koook.kook",
    "..kkkkk.kkkk"
  ];
  var HERO_PAL = {
    k: "#17121f",
    h: "#7a4128",
    s: "#f3c49d",
    S: "#c98b6c",
    e: "#17121f",
    t: "#5f6f94",
    T: "#46536f",
    b: "#8a5a32",
    p: "#38334a",
    o: "#6a4030",
    // the 2x character's extra detail
    H: "#a35d34",
    w: "#ffffff",
    m: "#a3564a",
    g: "#e8c060",
    L: "#7f90b6",
    O: "#8f5a3f",
    P: "#4b4560",
    // the scarf
    c: "#f53cd1",
    C: "#ff8fe6",
    D: "#a31f8a"
  };
  var DUMMY_PAL = {
    k: "#0e0c14",
    A: "#e4e6ec",
    B: "#b6b9c3",
    C: "#868995",
    D: "#5c5e6a",
    E: "#6e707c",
    F: "#4b4d58",
    G: "#34353f",
    J: "#2a2b33",
    m: "#f53cd1"
  };
  var HERO2 = [
    "...........kkk..........",
    "..........kAABk.........",
    ".........kAAABJk........",
    ".........kABBJJk........",
    ".........kBBBJCDk.......",
    ".........kBCJDDDk.......",
    ".........kkJJJDk........",
    ".......kkkkABBJCkk......",
    "......kAABCJBCCCkDk.....",
    "......kABBCJCCCmDkDk....",
    "......kBBCDDJCDDDkDk....",
    "......kABCDJDDDDDkk.....",
    ".....kAABDkDDDDJkk......",
    ".....kABCDkDDJJGkk......",
    ".....kABCkJJJGGGkk......",
    "....kJJCDkFFFGGGk.......",
    "....kAJJDkJJJGGGk.......",
    "....kJCJJkABBJGGk.......",
    ".....kJCCkBBCDJJJk......",
    ".....kCCCJBBCDJJDk......",
    ".....kCCCDJCCDkJDDk.....",
    "......kCDDJBCDkDDDk.....",
    ".......kDJJJCDkDDDkk....",
    ".......kJBCJCDkDDDkk....",
    ".......kBDJBCDkCDDkk....",
    "........kJJBCDkCDDk.....",
    "........kBBBCDkCCDDk....",
    "........kBBBCDkCCDDk....",
    ".........kBBCDkJDDDk....",
    "........kBJJJJkCJJJk....",
    "........kBBCCDkCCDDk....",
    "........kBBCDDkCDDk.....",
    "........kBBCDkCCDDk.....",
    "........kBCCDkCCDDk.....",
    "........kBCDDkCDDDk.....",
    ".......kJBCJkkkDJkkkk...",
    ".......kAJJAAAAkCCCCCk..",
    "........kkkkkkkkkkkkk..."
  ];
  function maskOf(rows, k = 1) {
    const h = rows.length * k, w = rows[0].length * k, data = new Uint8Array(w * h);
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch === ".") return;
      for (let j = 0; j < k * k; j++) data[(y * k + (j / k | 0)) * w + x * k + j % k] = 1;
    }));
    return { w, h, data };
  }
  var MASKS = { 1: maskOf(HERO, 1), 2: maskOf(HERO2, 1) };
  function pixelsOf(rows, pal) {
    const w = rows[0].length, data = new Uint32Array(w * rows.length);
    rows.forEach((r, y) => [...r].forEach((ch, x) => data[y * w + x] = ch === "." ? 0 : hex(pal[ch])));
    return data;
  }
  var PIXELS = { 1: pixelsOf(HERO, HERO_PAL), 2: pixelsOf(HERO2, DUMMY_PAL) };
  function stockActor(k = 1) {
    k = k === 2 ? 2 : 1;
    const m = MASKS[k], x = -Math.floor(m.w / 2), y = -m.h;
    return { mask: m, pixels: PIXELS[k], x, y, w: m.w, h: m.h, k, head: [0, y], chest: [0, k === 2 ? -26 : y + 11], ...k === 2 ? { eyes: [[13, 3], [15, 3]] } : {} };
  }

  // vendor/pixelfx/src/core/fx.js
  function createFrame(w, h, ox = 0, oy = 0) {
    return { w, h, ox, oy, color: new Uint32Array(w * h), light: new Uint32Array(w * h) };
  }
  function clearFrame(f) {
    f.color.fill(0);
    f.light.fill(0);
    return f;
  }
  var painters = /* @__PURE__ */ new WeakMap();
  function painterFor(frame2) {
    let p = painters.get(frame2);
    if (!p) painters.set(frame2, p = new Painter(frame2));
    return p.reset();
  }
  var FADE = 0.3;
  var isRamp = (v) => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === "number" || /^#[0-9a-f]{3,8}$/i.test(c));
  function resolveOptions(meta19, o = {}) {
    var _a, _b;
    const opts = { ...(_a = meta19.options) != null ? _a : {}, ...o };
    for (const [k, def] of Object.entries((_b = meta19.options) != null ? _b : {}))
      if (isRamp(def) && isRamp(o[k]) && o[k].length !== def.length) opts[k] = fit(o[k], def.length).map(toHex);
    if (meta19.actor && !opts.actor) opts.actor = stockActor(meta19.actor === 2 ? 2 : 1);
    return opts;
  }
  function createFx(mod, o = {}) {
    var _a, _b;
    const meta19 = (_a = mod.meta) != null ? _a : {};
    const opts = resolveOptions(meta19, o);
    const impl = mod.create ? mod.create(opts) : mod;
    const D3 = (_b = meta19.duration) != null ? _b : 1;
    let t = 0, stopAt = Infinity;
    return {
      meta: meta19,
      options: opts,
      get t() {
        return t;
      },
      update(dt) {
        t += dt;
        if (!impl.update) return;
        const n = Math.max(1, Math.ceil(dt * 120 - 1e-9));
        for (let i = 0; i < n; i++) impl.update(dt / n, opts);
      },
      draw(frame2, layer) {
        var _a2, _b2, _c, _d;
        const p = painterFor(frame2);
        p.place((_a2 = opts.x) != null ? _a2 : 0, (_b2 = opts.y) != null ? _b2 : 0, !!opts.flip, (_c = opts.angle) != null ? _c : 0);
        p.fade = stopAt === Infinity ? 1 : clamp(1 - (t - stopAt) / FADE);
        p.lightK = (_d = opts.light) != null ? _d : 1;
        const tt = meta19.loop ? t % D3 : Math.min(t, D3);
        if (layer !== "front" && impl.drawBack) {
          p.layer = "back";
          impl.drawBack(p, tt, opts);
        }
        if (layer !== "back") {
          p.layer = "front";
          impl.draw(p, tt, opts);
        }
      },
      /** Let it end: loops fade out, one-shots cut short. */
      stop() {
        if (stopAt === Infinity) stopAt = t;
      },
      done() {
        return t - stopAt >= FADE || !meta19.loop && t >= D3;
      }
    };
  }
  function composite(f, out, bg = null, lightK = 1) {
    const n = f.w * f.h, C = f.color, L = f.light, flat = typeof bg === "number";
    for (let i = 0; i < n; i++) {
      const c = C[i], l = L[i] & 16777215;
      let r, g, b, a;
      const ca = c >>> 24;
      if (ca === 255) {
        r = c & 255;
        g = c >>> 8 & 255;
        b = c >>> 16 & 255;
        a = 255;
      } else if (bg === null) {
        r = c & 255;
        g = c >>> 8 & 255;
        b = c >>> 16 & 255;
        a = ca;
      } else {
        const k = flat ? bg : bg[i], f2 = ca / 255;
        r = (c & 255) * f2 + (k & 255) * (1 - f2);
        g = (c >>> 8 & 255) * f2 + (k >>> 8 & 255) * (1 - f2);
        b = (c >>> 16 & 255) * f2 + (k >>> 16 & 255) * (1 - f2);
        a = 255;
      }
      if (l) {
        const lr = (l & 255) * lightK, lg = (l >>> 8 & 255) * lightK, lb = (l >>> 16 & 255) * lightK;
        if (a < 255) {
          const pa = a / 255, pr = r * pa + lr, pg = g * pa + lg, pb = b * pa + lb;
          const na = Math.min(1, Math.max(pa, Math.max(lr, lg, lb) / 255));
          if (na > 0) {
            r = Math.min(255, pr / na);
            g = Math.min(255, pg / na);
            b = Math.min(255, pb / na);
            a = na * 255;
          }
        } else {
          r = Math.min(255, r + lr);
          g = Math.min(255, g + lg);
          b = Math.min(255, b + lb);
        }
      }
      const j = i * 4;
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = a;
    }
    return out;
  }

  // vendor/pixelfx/src/core/scene.js
  var SKY = hex("#15131d");
  var SKY_TOP = hex("#0d0b14");
  var SKY_LOW = hex("#221d33");
  var FLOOR_EDGE = hex("#4a4263");
  var FLOOR = hex("#2b2639");
  var FLOOR_DARK = hex("#211d2d");
  var MORTAR = hex("#1a1724");

  // vendor/pixelfx/src/core/rig.js
  var PAL2 = Object.fromEntries(Object.entries(DUMMY_PAL).map(([k, v]) => [k, hex(v) >>> 0]));
  var INK2 = PAL2.k;
  var SEAM = PAL2.J;
  var MARK = PAL2.m;
  var SHELL = [PAL2.A, PAL2.B, PAL2.C, PAL2.D];
  var CORE = [PAL2.E, PAL2.F, PAL2.G, PAL2.G];
  var DEG = Math.PI / 180;
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var len = (a) => Math.hypot(a[0], a[1], a[2]);
  var unit = (a) => mul(a, 1 / (len(a) || 1e-6));
  var rotY = (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
  };
  var rotZ = (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  };
  var mm = (A, B2) => {
    const o = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B2[c] + A[r * 3 + 1] * B2[3 + c] + A[r * 3 + 2] * B2[6 + c];
    return o;
  };
  var mv = (M2, v) => [M2[0] * v[0] + M2[1] * v[1] + M2[2] * v[2], M2[3] * v[0] + M2[4] * v[1] + M2[5] * v[2], M2[6] * v[0] + M2[7] * v[1] + M2[8] * v[2]];
  var clamp01 = (v) => Math.max(0, Math.min(1, v));
  var M = {
    pelvis: 19.7,
    spine1: 2.8,
    spine2: 4.6,
    shoulderUp: 2.5,
    shoulderOut: 5.9,
    neckUp: 4,
    headUp: 3.1,
    hipDown: 1.1,
    hipOut: 2.8,
    thigh: 8.6,
    shin: 8.3,
    upper: 7.6,
    fore: 7.4,
    turn: 36 * DEG
  };
  var STAND = { lean: 0, crouch: 0, yaw: 0, fx: -3, fy: -15, bx: 5, by: -15, ffx: -2, ffy: -4, fbx: 3, fby: -4 };
  function ik(a, target, L1, L2, pole) {
    let to = sub(target, a), d = len(to);
    const reach2 = L1 + L2 - 0.02;
    if (d > reach2) {
      to = mul(to, reach2 / d);
      d = reach2;
    }
    const u = unit(to), along2 = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - along2 * along2));
    let v = sub(pole, mul(u, dot(pole, u)));
    v = len(v) < 1e-4 ? unit(cross(u, [0, 0, 1])) : unit(v);
    return { joint: add(a, add(mul(u, along2), mul(v, h))), end: add(a, to), u, v };
  }
  function frame(t, R) {
    return { t, R };
  }
  function boneFrame(a, b, pole) {
    const x = unit(sub(b, a));
    let y = sub(pole, mul(x, dot(pole, x)));
    y = len(y) < 1e-4 ? unit(cross(x, [0, 0, 1])) : unit(y);
    const z = cross(x, y);
    return frame(a, [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]);
  }
  var weaponOf = (name) => WEAPONS[name];
  function solve(pose) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const q = { ...STAND, ...pose }, lean = q.lean, W = q.weapon && weaponOf(q.weapon), OW = q.offWeapon && weaponOf(q.offWeapon);
    const sa = (_a = q.sa) != null ? _a : 0, wl = (_b = q.wl) != null ? _b : 1, axisZ = Math.sqrt(Math.max(0, 1 - wl * wl)) * ((_c = q.wz) != null ? _c : 1);
    const axis = [Math.cos(sa) * wl, -Math.sin(sa) * wl, axisZ], side = [-Math.sin(sa), -Math.cos(sa), 0];
    const two = !!(q.two && W), nearZ = (_d = q.fz) != null ? _d : two ? 3 : 4.5;
    const fwd = (q.fx - STAND.fx) / 24, farFwd = two ? 0 : (q.bx - STAND.bx) / 22;
    let turn = M.turn + (fwd >= 0 ? -44 * DEG * Math.min(1, fwd) : 28 * DEG * Math.min(1, -fwd * 1.8));
    turn += (farFwd > 0 ? 34 * DEG * Math.min(1, farFwd) : 0) + ((_e = q.twist) != null ? _e : 0) * 4 * DEG;
    if (q.turn !== void 0) turn = q.turn;
    const hipTurn = M.turn + (turn - M.turn) * 0.45, tilt = Math.atan2(lean, 13);
    const Rp = mm(rotZ(-tilt * 0.25), rotY(-hipTurn)), Rc = mm(rotZ(-tilt), rotY(-turn));
    const ankleN = [q.ffx, -q.ffy - 1.8, (_f = q.fzz) != null ? _f : 2.4], ankleF = [q.fbx, -q.fby - 1.8, (_g = q.bzz) != null ? _g : -2.4];
    let pelvis = [lean * 0.2, M.pelvis - q.crouch, 0];
    const hipAt = (s) => add(pelvis, mv(Rp, [0, -M.hipDown, s * M.hipOut]));
    const maxLeg = (M.thigh + M.shin) * 0.995;
    for (const [s, a] of [[1, ankleN], [-1, ankleF]]) {
      const h = hipAt(s), dx = h[0] - a[0], dz = h[2] - a[2], flat = dx * dx + dz * dz;
      if (flat < maxLeg * maxLeg) {
        const top = a[1] + Math.sqrt(maxLeg * maxLeg - flat);
        if (h[1] > top) pelvis = [pelvis[0], pelvis[1] - (h[1] - top), pelvis[2]];
      }
    }
    const waist = add(pelvis, [Math.sin(tilt * 0.45) * M.spine1, Math.cos(tilt * 0.45) * M.spine1, 0]);
    const chest = add(waist, [Math.sin(tilt) * M.spine2, Math.cos(tilt) * M.spine2, 0]);
    const neck = add(chest, mv(Rc, [0, M.neckUp, 0]));
    const headTurn = M.turn * 0.9 + (turn - M.turn) * 0.35, nod = tilt * 0.35 + ((_h = q.hy) != null ? _h : 0) * 7 * DEG, roll = ((_i = q.hx) != null ? _i : 0) * 7 * DEG;
    const Rh = mm(rotZ(-nod - roll), rotY(-headTurn));
    const head4 = add(neck, mv(Rh, [0.15, M.headUp, 0]));
    const pick = (s, target) => {
      const base = add(chest, mv(Rc, [0, M.shoulderUp, s * M.shoulderOut])), to = sub(target, base), d = len(to);
      return add(base, mul(unit(to), Math.min(1.8, Math.max(0, d - 11) * 0.35)));
    };
    const nearT = [q.fx, -q.fy, nearZ];
    const farT = two ? [q.fx + axis[0] * W.two, -q.fy + axis[1] * W.two, nearZ + axis[2] * W.two] : [q.bx, -q.by, (_j = q.bz) != null ? _j : q.armsFront ? 5.5 : -4.5];
    const sN = pick(1, nearT), sF = pick(-1, farT);
    const pole = (s, T, shoulder, hold) => {
      const up = clamp01((T[1] - shoulder[1] + 2) / 10);
      const base = [-0.55 + up * 1.1, -1 + up * 0.9, s * (0.45 + up * 0.5)];
      if (!hold) return base;
      const u = unit(sub(T, shoulder));
      let best = base, score = Infinity;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, x = unit(cross(u, [0.3, 1, 0.2])), y = cross(u, x), v = add(mul(x, Math.cos(a)), mul(y, Math.sin(a)));
        const A = ik(shoulder, T, M.upper, M.fore, v), f = unit(sub(A.end, A.joint));
        const cost = Math.abs(dot(f, hold)) * 0.7 + (1 - dot(unit(base), v)) * 0.55;
        if (cost < score) {
          score = cost;
          best = v;
        }
      }
      return best;
    };
    const holdN = W ? W.across ? side : axis : null, holdF = two ? W.across ? side : axis : OW ? [Math.cos((_k = q.sb) != null ? _k : Math.PI), -Math.sin((_l = q.sb) != null ? _l : Math.PI), 0] : null;
    const armN = ik(sN, nearT, M.upper, M.fore, pole(1, nearT, sN, holdN)), armF = ik(sF, farT, M.upper, M.fore, pole(-1, farT, sF, holdF));
    const kneePole = (s) => mv(Rp, [1, 0, s * 0.35]);
    const hipN = hipAt(1), hipF = hipAt(-1);
    const legN = ik(hipN, ankleN, M.thigh, M.shin, kneePole(1)), legF = ik(hipF, ankleF, M.thigh, M.shin, kneePole(-1));
    const footDir = (s) => {
      const t = hipTurn * 0.6 + s * 8 * DEG;
      return [Math.cos(t), 0, Math.sin(t)];
    };
    const B2 = {
      pelvis: frame(pelvis, Rp),
      waist: frame(waist, mm(rotZ(-tilt * 0.6), rotY(-(turn + hipTurn) / 2))),
      chest: frame(chest, Rc),
      head: frame(head4, Rh),
      neck: frame(neck, Rh),
      upperN: boneFrame(sN, armN.joint, armN.v),
      foreN: boneFrame(armN.joint, armN.end, armN.v),
      upperF: boneFrame(sF, armF.joint, armF.v),
      foreF: boneFrame(armF.joint, armF.end, armF.v),
      thighN: boneFrame(hipN, legN.joint, legN.v),
      shinN: boneFrame(legN.joint, legN.end, legN.v),
      thighF: boneFrame(hipF, legF.joint, legF.v),
      shinF: boneFrame(legF.joint, legF.end, legF.v)
    };
    B2.footN = frame(legN.end, mm(rotY(-Math.atan2(footDir(1)[2], footDir(1)[0])), rotZ(q.toeF ? -55 * DEG : 0)));
    B2.footF = frame(legF.end, mm(rotY(-Math.atan2(footDir(-1)[2], footDir(-1)[0])), rotZ(q.toeB ? -55 * DEG : 0)));
    return { B: B2, W, OW, q, axis, side, armN, armF, legN, legF, sN, sF, hipN, hipF, turn };
  }
  var BW = 300;
  var BH = 240;
  var OX = 150;
  var OY = 180;
  var Zb = new Float32Array(BW * BH);
  var Tone = new Float32Array(BW * BH);
  var Part = new Int8Array(BW * BH);
  var Mat = new Int8Array(BW * BH);
  var Fr = new Int8Array(BW * BH);
  var LX = new Float32Array(BW * BH);
  var LY = new Float32Array(BW * BH);
  var Col = new Uint32Array(BW * BH);
  var touched = [];
  var LIGHT = unit([-0.55, 0.72, 0.5]);
  var curFrameIndex = 0;
  var onlyPart = 0;
  function plot(i, z, tone, part, mat, wx, wy, color) {
    if (onlyPart && part !== onlyPart) return;
    if (Part[i] === 0) touched.push(i);
    else if (z <= Zb[i]) return;
    Zb[i] = z;
    Tone[i] = tone;
    Part[i] = part;
    Mat[i] = mat;
    Fr[i] = curFrameIndex;
    LX[i] = wx;
    LY[i] = wy;
    Col[i] = color;
  }
  var PART = { pelvis: 1, waist: 2, chest: 3, neck: 4, head: 5, face: 6, upperN: 7, elbowN: 8, foreN: 9, handN: 10, upperF: 11, elbowF: 12, foreF: 13, handF: 14, thighN: 15, kneeN: 16, shinN: 17, footN: 18, thighF: 19, kneeF: 20, shinF: 21, footF: 22, weapon: 23, offWeapon: 24 };
  var STEEL = Object.fromEntries(Object.entries({ hi: "#ffffff", a: "#e8edf6", b: "#a4afc6", d: "#68748f", gold: "#ffd84a", goldD: "#b8862a", grip: "#7a3a2a", gripD: "#4a2018", wood: "#8a5a32", woodD: "#5a3820", dark: "#3a3448", darkD: "#262033", olive: "#58663f", oliveA: "#7d8c58", oliveD: "#3a4529" }).map(([k, v]) => [k, hex(v) >>> 0]));
  function blade(T, from, length, w) {
    for (let i = from; i <= from + length + 0.01; i += 0.4) {
      const r = i - from, wd = r > length - 5 ? Math.max(0, (length - r) / 5 * w) : w;
      for (let k = -wd; k <= wd + 0.01; k += 0.4) T(i, k, k < -w * 0.4 ? STEEL.hi : k > w * 0.4 ? STEEL.d : STEEL.a);
    }
  }
  var haft = (T, from, to, a, d, r = 0.8) => {
    for (let i = from; i <= to; i += 0.4) for (let k = -r; k <= r + 0.01; k += 0.4) T(i, k, k > 0.1 ? d : a);
  };
  var WEAPONS = {
    // the fist is at i = 0; `two` is where the other hand goes; `across`: the handle lies across the weapon's length
    sword: { two: -4.4, draw(T, q) {
      const end = q.two ? -6.5 : -2.6;
      haft(T, end, 2.2, STEEL.grip, STEEL.gripD);
      for (let k = -1.4; k <= 1.4; k += 0.4) T(end - 0.4, k, STEEL.gold);
      for (let k = -4.6; k <= 4.6; k += 0.4) T(2.6, k, Math.abs(k) > 3.8 ? STEEL.goldD : STEEL.gold), T(3, k, STEEL.goldD);
      blade(T, 3.2, 25, 2.2);
    } },
    greatsword: { two: -4.8, draw(T) {
      haft(T, -7.2, 2.2, STEEL.grip, STEEL.gripD);
      for (let k = -1.8; k <= 1.8; k += 0.4) T(-7.6, k, STEEL.gold);
      for (let k = -6.6; k <= 6.6; k += 0.4) T(2.6, k, Math.abs(k) > 5.6 ? STEEL.goldD : STEEL.gold), T(3, k, STEEL.goldD);
      blade(T, 3.2, 31, 3);
      for (let i = 4; i <= 28; i += 0.4) T(i, 0, STEEL.b);
    } },
    dagger: { draw(T) {
      haft(T, -2.4, 1.8, STEEL.grip, STEEL.gripD);
      for (let k = -2.6; k <= 2.6; k += 0.4) T(2.2, k, STEEL.goldD);
      blade(T, 2.6, 10, 1.3);
    } },
    spear: { two: -12, draw(T) {
      haft(T, -18, 36, STEEL.wood, STEEL.woodD, 0.5);
      blade(T, 36, 11, 2);
      for (let k = -2.4; k <= 2.4; k += 0.4) T(36, k, STEEL.goldD);
    } },
    hammer: { two: -7, draw(T) {
      for (const lift of [-0.8, 0, 0.8]) for (let i = -10; i <= 18; i += 0.4) for (let k = -0.8; k <= 0.81; k += 0.4) T(i, k, k > 0.1 ? STEEL.woodD : STEEL.wood, lift);
      for (let i = 18; i <= 28; i += 0.4) for (let k = -9; k <= 9; k += 0.4) {
        const face = Math.abs(k) > 7.4 ? k < 0 ? STEEL.a : STEEL.d : i < 20 ? STEEL.hi : i > 26.4 ? STEEL.d : Math.abs(k) < 2 ? STEEL.gold : STEEL.b;
        T(i, k, face, 4.5);
        T(i, k, face, -4.5);
        if (i < 18.4 || i > 27.6 || Math.abs(k) > 8.6) for (let l = -4; l <= 4; l += 0.4) T(i, k, k < 0 ? STEEL.a : i > 27.6 ? STEEL.d : STEEL.b, l);
      }
    } },
    scythe: { two: -11, draw(T) {
      haft(T, -16, 31, STEEL.dark, STEEL.darkD, 0.5);
      for (let j = 0; j <= 28; j += 0.4) {
        const u = j / 28, w = 3.2 * (1 - u) + 0.3, b = 31.5 - u * u * 12;
        for (let k = -w; k <= w; k += 0.4) T(b + k, j + 0.8, k > w * 0.3 ? STEEL.hi : k < -w * 0.4 ? STEEL.d : STEEL.b);
      }
    } },
    claw: { draw(T) {
      for (const q0 of [-2.4, 0, 2.4])
        for (let i = 2; i <= 9.5; i += 0.4) {
          const u = (i - 2) / 7.5, k = q0 + u * u * 1.8;
          T(i, k, u > 0.55 ? STEEL.hi : STEEL.a);
          if (u < 0.6) T(i, k + 0.8, STEEL.d);
        }
    } },
    bow: { across: true, draw(T, q, off) {
      for (let u = -1; u <= 1.001; u += 0.025) {
        const k = u * 17, i = 6 * (1 - u * u) - 1;
        T(i, k, Math.abs(u) > 0.85 ? STEEL.goldD : STEEL.wood);
        T(i + 0.8, k, STEEL.woodD);
      }
      const tipA = T.at(-1, -17), tipB = T.at(-1, 17), mid = q.pull ? off : T.at(-1, 0);
      const line = (A, B2, c) => {
        const n = Math.max(2, Math.ceil(len(sub(B2, A)) / 0.4)), Z = STEEL.a;
        for (let k = 0; k <= n; k++) {
          const P3 = add(A, mul(sub(B2, A), k / n)), wx = Math.round(P3[0]), wy = Math.round(P3[1]), idx = (OY - wy) * BW + (OX + wx);
          curFrameIndex = -1;
          plot(idx, P3[2] + 0.05, 2, PART.weapon, 2, wx, wy, c != null ? c : Z);
        }
      };
      line(tipA, mid);
      line(tipB, mid);
      if (q.nocked) {
        const nock = mid, tip = T.at(13, 0);
        line(nock, tip, STEEL.wood);
        for (let i = 9; i <= 13; i += 0.4) for (let k = -(13 - i) * 0.45; k <= (13 - i) * 0.45; k += 0.4) T(i, k, STEEL.hi);
      }
    } },
    pistol: { across: true, draw(T) {
      for (let i = -1; i <= 9.5; i += 0.4) for (let k = -4.2; k <= -2.4; k += 0.4) T(i, k, k < -3.6 ? STEEL.a : k > -2.9 ? STEEL.d : STEEL.b);
      for (let i = -1.2; i <= 1.2; i += 0.4) for (let k = -2.4; k <= 2.4; k += 0.4) T(i, k, STEEL.gripD);
      T(9, -4.6, STEEL.hi);
    } },
    launcher: { two: -9, draw(T) {
      for (let i = -14; i <= 22; i += 0.4) for (let k = -6; k <= -1; k += 0.4) T(i, k, k < -4.8 ? STEEL.oliveA : k > -2.2 ? STEEL.oliveD : Math.abs(i - 3) < 1.4 ? STEEL.gold : STEEL.olive);
      for (let k = -6.8; k <= -0.2; k += 0.4) T(22.4, k, STEEL.b), T(-14.4, k, STEEL.d);
    } },
    handle: { draw(T) {
      haft(T, -2.6, 6, STEEL.grip, STEEL.gripD);
      for (let k = -1.6; k <= 1.6; k += 0.4) T(-3, k, STEEL.gold), T(6.4, k, STEEL.gold);
    } }
  };
  var REST_FRAMES = null;
  REST_FRAMES = solve({}).B;

  // vendor/pixelfx/src/core/act.js
  var TW = 38;
  var TH = 52;
  var TP = Object.fromEntries(Object.entries({ ink: "#0b0a1a", wood: "#724c2e", woodL: "#a0703a", woodD: "#4e331f", straw: "#d2aa55", strawL: "#f0d98a", burlapD: "#86643a", burlap: "#b38b57", burlapL: "#c9a26c", red: "#9a2f3c", redL: "#c4434f", white: "#ffffff" }).map(([k, v]) => [k, hex(v)]));
  var DUST = ["#efe7dc", "#c9bfb8", "#8f8693", "#5a5468"].map(hex);
  var DUMMY = new Uint32Array(TW * TH);
  (function buildDummy() {
    const px = (x, y, c) => {
      if (x >= 0 && y >= 0 && x < TW && y < TH) DUMMY[y * TW + x] = c;
    };
    const R = (x, y, w, h, c) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
    };
    R(15, 38, 8, 14, TP.ink);
    R(16, 34, 6, 18, TP.wood);
    R(16, 34, 2, 18, TP.woodL);
    R(20, 34, 2, 18, TP.woodD);
    R(1, 18, 36, 1, TP.ink);
    R(1, 23, 36, 1, TP.ink);
    R(1, 19, 36, 4, TP.wood);
    R(1, 19, 36, 1, TP.woodL);
    R(1, 22, 36, 1, TP.woodD);
    for (const [bx, s] of [[0, -1], [33, 1]]) {
      R(bx, 17, 5, 8, TP.straw);
      for (const [dx, dy, c] of [[2, 16, TP.straw], [3, 15, TP.strawL], [1, 17, TP.strawL], [2, 25, TP.straw], [1, 26, TP.strawL], [3, 25, TP.burlapD], [2, 19, TP.strawL], [3, 21, TP.strawL], [1, 22, TP.burlapD], [2, 23, TP.strawL]]) px(bx + dx, dy, c);
      px(s < 0 ? bx - 1 : bx + 5, 19, TP.straw);
      px(s < 0 ? bx - 1 : bx + 5, 22, TP.strawL);
    }
    const sack = (x, y, w, h) => {
      R(x + 1, y, w - 2, 1, TP.ink);
      R(x + 1, y + h - 1, w - 2, 1, TP.ink);
      R(x, y + 1, 1, h - 2, TP.ink);
      R(x + w - 1, y + 1, 1, h - 2, TP.ink);
      R(x + 1, y + 1, w - 2, h - 2, TP.burlap);
      R(x + w - 4, y + 1, 3, h - 2, TP.burlapD);
      R(x + 1, y + h - 3, w - 2, 2, TP.burlapD);
      R(x + 1, y + 1, 1, h - 4, TP.burlapL);
      R(x + 1, y + 1, w - 6, 1, TP.burlapL);
      for (let j = y + 2; j < y + h - 2; j += 3) for (let i = x + 3 + j % 2; i < x + w - 4; i += 4) px(i, j, TP.burlapD);
    };
    sack(9, 17, 20, 24);
    for (let y = 19; y < 36; y++) for (let x = 11; x < 27; x++) {
      const d = Math.hypot(x - 18.5, y - 27);
      if (d > 4 && d < 5.4 || d < 1.9) px(x, y, x + y < 45 ? TP.redL : TP.red);
    }
    for (let x = 10; x < 28; x++) {
      px(x, 36, x & 1 ? TP.woodL : TP.straw);
      px(x, 37, x & 1 ? TP.woodD : TP.wood);
    }
    for (const [x, y, c] of [[11, 41, TP.straw], [12, 42, TP.strawL], [14, 41, TP.strawL], [15, 42, TP.straw], [23, 41, TP.straw], [24, 42, TP.strawL], [26, 41, TP.straw], [13, 43, TP.straw], [25, 43, TP.straw]]) px(x, y, c);
    sack(10, 1, 18, 16);
    for (const ex of [14, 23]) for (let d = -2; d <= 2; d++) {
      px(ex + d, 7 + d, TP.ink);
      px(ex - d, 7 + d, TP.ink);
    }
    for (let x = 14; x < 24; x++) px(x, 12, x & 1 ? TP.ink : TP.burlapD);
    for (const x of [15, 18, 21]) {
      px(x, 11, TP.ink);
      px(x, 13, TP.ink);
    }
    for (let x = 12; x < 26; x++) {
      px(x, 16, x & 1 ? TP.woodL : TP.straw);
      px(x, 17, x & 1 ? TP.wood : TP.woodD);
    }
    for (const [x, y, c] of [[13, 0, TP.straw], [15, 0, TP.strawL], [18, 0, TP.straw], [21, 0, TP.strawL], [24, 0, TP.straw], [9, 4, TP.straw], [28, 6, TP.straw], [8, 7, TP.strawL], [29, 3, TP.strawL]]) px(x, y, c);
  })();
  var SKINS = { flash: [TP.white, 1], char: [hex("#1a0c0e"), 0.72], ice: [hex("#a8e8ff"), 0.72], shadow: [hex("#3a1a70"), 0.5], holy: [hex("#fff4c0"), 0.5], red: [hex("#ff2040"), 0.45], shock: [hex("#8fd6ff"), 0.6], poison: [hex("#58c43a"), 0.5] };
  var STRAW = [TP.strawL, TP.straw, TP.straw, TP.burlapD, TP.burlapD];
  var REST_MASK = new Uint8Array(24 * 38);
  var REST_PX = new Uint32Array(24 * 38);
  HERO2.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch !== ".") {
      REST_MASK[r * 24 + c] = 1;
      REST_PX[r * 24 + c] = hex(DUMMY_PAL[ch]);
    }
  }));
  var NEAREST = new Int16Array(24 * 38).fill(-1);
  for (let r = 0; r < 38; r++)
    for (let c = 0; c < 24; c++) {
      let best = -1, bd = 1e9;
      for (let y = Math.max(0, r - 7); y < Math.min(38, r + 8); y++)
        for (let x = Math.max(0, c - 7); x < Math.min(24, c + 8); x++) {
          const d = (x - c) * (x - c) + (y - r) * (y - r);
          if (REST_MASK[y * 24 + x] && d < bd) {
            bd = d;
            best = y * 24 + x;
          }
        }
      NEAREST[r * 24 + c] = best;
    }

  // vendor/pixelfx/src/core/poses.js
  var READY = { crouch: 3, fx: 11, fy: -21, bx: 9, by: -21, ffx: 7, fbx: -7 };

  // vendor/pixelfx/src/fx/melee/heavy-cleave.js
  var heavy_cleave_exports = {};
  __export(heavy_cleave_exports, {
    act: () => act,
    create: () => create,
    meta: () => meta
  });

  // vendor/pixelfx/src/fx/melee/_lib.js
  var swing = (o) => ({ cx: 0, cy: 0, R: 30, sy: 1, rot: 0, a0: 0, dir: 1, k: 0, ...o });
  function through(x, y, th, dir, R, span, at = 0.55, extra = {}) {
    const a = th - dir * Math.PI / 2;
    return swing({ cx: x - Math.cos(a) * R, cy: y - Math.sin(a) * R, R, sy: 1, rot: 0, a0: a - dir * span * at, dir, span, ...extra });
  }
  function onSwing(s, r, u) {
    const a = s.a0 + s.dir * u, lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy - s.k * (s.R - r), c = Math.cos(s.rot), n = Math.sin(s.rot);
    return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
  }
  function travel(s, u) {
    const [x0, y0] = onSwing(s, s.R, u), [x1, y1] = onSwing(s, s.R, u + 0.01), l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return { x: x0, y: y0, dx: (x1 - x0) / l, dy: (y1 - y0) / l, a: s.a0 + s.dir * u };
  }
  function plane(s, x, y) {
    const c = Math.cos(s.rot), n = Math.sin(s.rot), dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * n, ly = -dx * n + dy * c;
    if (!s.k) return [Math.hypot(lx, ly / s.sy), Math.atan2(ly / s.sy, lx)];
    const m = ly + s.k * s.R, A = s.sy * s.sy - s.k * s.k, B2 = 2 * m * s.k, Cc = lx * lx * s.sy * s.sy + m * m;
    const r = (-B2 + Math.sqrt(B2 * B2 + 4 * A * Cc)) / (2 * A);
    return [r, Math.atan2((m - s.k * r) / s.sy, lx)];
  }
  function smear(p, s, u0, u1, wMax, fn, half = 0, pad = 1) {
    if (u1 - u0 < 5e-3) return;
    const c = Math.cos(s.rot), n = Math.sin(s.rot), A = s.R + pad + 1, Bn = A * s.sy + s.k * (wMax + 2);
    const hx = Math.hypot(A * c, Bn * n) + 1, hy = Math.hypot(A * n, Bn * c) + 1, rIn = s.R - wMax - 1;
    const over = Math.abs(n) * A + s.k * (wMax + 2) + 2, y0 = half > 0 ? s.cy - over : s.cy - hy, y1 = half < 0 ? s.cy + over : s.cy + hy;
    p.shade(s.cx - hx, y0, s.cx + hx, y1, (x, y, out) => {
      const [r, a] = plane(s, x, y);
      if (r > s.R + pad || r < rIn) return;
      if (half && (Math.sin(a) < 0 ? -1 : 1) !== half) return;
      let u = s.dir * (a - s.a0) % TAU;
      if (u < 0) u += TAU;
      while (u < u0) u += TAU;
      if (u > u1) return;
      return fn(u, r, out, a);
    });
  }
  function trace(p, s, r, u0, u1, c, a, half = 0, step = 0.6) {
    const du = step / Math.max(4, r);
    for (let u = u0; u <= u1; u += du) {
      const g = s.a0 + s.dir * u;
      if (half && (Math.sin(g) < 0 ? -1 : 1) !== half) continue;
      const [x, y] = onSwing(s, r, u), k = typeof a === "function" ? a(u) : a;
      if (k > 0) p.dot(x, y, typeof c === "function" ? c(u) : c, k);
    }
  }
  function glowAlong(p, s, r, u0, u1, rad, c, k, half = 0, step = 0.35) {
    for (let u = u0; u <= u1; u += step) {
      const g = s.a0 + s.dir * u;
      if (half && (Math.sin(g) < 0 ? -1 : 1) !== half) continue;
      const [x, y] = onSwing(s, r, u), kk = typeof k === "function" ? k(u) : k;
      if (kk > 4e-3) p.glow(x, y, rad, c, kk);
    }
  }
  function slash(p, s, t, half = 0) {
    var _a;
    const u = t - s.t0;
    if (u < 0) return;
    const R = s.ramp, n = R.length, life = s.sweep + s.hold + s.trail, hot = (_a = s.hot) != null ? _a : 0;
    const head4 = ease.outExpo(clamp(u / s.sweep)), tail = smooth(s.sweep + s.hold, life, u), age = clamp(u / life);
    const U = s.span * head4, T = s.span * tail, W = s.W * (1 - tail * 0.55);
    if (tail < 1 && U - T > 0.01) {
      smear(p, s, T, U, W, (uu, r, out) => {
        const v = (uu - T) / (U - T), w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, s.lens ? 1 : 2.2)), s.lens ? 0.75 : 0.6);
        if (w < 0.35) return;
        const q = (s.R - r) / w;
        if (q < 0 || q > 1) return;
        const ci = q < 0.22 && age < 0.5 || q < hot * 0.7 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4 - hot * 3);
        out.c = R[n - 1 - clamp(ci, 0, n - 1)];
        out.a = Math.min(1, v / (s.lens ? 0.1 : 0.4));
      }, half);
      glowAlong(p, s, s.R - W * 0.4, T, U, 5 + W, R[n - 3], (uu) => (0.22 + hot * 0.3) * (1 - age) * ((uu - T) / (U - T)), half, 0.3);
    }
    const th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
    if (tail > 0.02 && th > 0) trace(p, s, s.R - 0.5, 0, T, R[2], (uu) => th * (0.4 + 0.6 * uu / s.span), half);
  }
  var slashEnd = (s) => travel({ ...s, R: s.R - s.W * 0.3 }, s.span);
  function shavings(ps, R, s, n, colors, from = 0.3) {
    for (let i = 0; i < n; i++) {
      const [x, y] = onSwing(s, s.R, s.span * R.range(from, 1)), ox = x - s.cx, oy = y - s.cy, l = Math.hypot(ox, oy) || 1, sp = R.range(30, 100);
      ps.spawn(P.MOTE, x, y, ox / l * sp, Math.min(25, oy / l * sp) - 10, R.range(0.25, 0.55), R.pick(colors), 0.6);
    }
  }
  function stone(c) {
    c = hex(c);
    return { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3), dark: scale(c, 0.42) };
  }
  var OUTLINE = hex("#1a1422");
  function rock(p, b, st) {
    const r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      const lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body;
      out.a = fade;
    });
  }
  function cracks(R, x0, n, reach2, depth = 7, bias = 0.3) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const side = R.chance(0.5 + bias * 0.5) ? 1 : -1, L = reach2 * R.range(0.45, 1) * (i < 2 ? 1 : 0.7), pts = [[x0 + side * R.range(0, 1.5), 0]];
      let x = pts[0][0], y = 0;
      while (Math.abs(x - x0) < L && y < depth) {
        x += side * R.range(1.5, 3.5);
        y = Math.min(depth, Math.max(0, y + R.range(-0.6, 1.6) * (Math.abs(x - x0) > 3 ? 1 : 0.3)));
        pts.push([Math.round(x), Math.round(y)]);
        if (R.chance(0.18) && pts.length > 3 && y < depth - 2) {
          const f = [[Math.round(x), Math.round(y)]];
          let fx = x, fy = y;
          for (let j = R.int(1, 3); j > 0; j--) fx += side * R.range(1, 3), fy += R.range(0.8, 2), f.push([Math.round(fx), Math.round(Math.min(depth + 1, fy))]);
          out.push({ pts: f, at: Math.abs(x - x0) / reach2, fork: true });
        }
      }
      out.push({ pts, at: 0, fork: false });
    }
    return out;
  }
  function star(p, x, y, spikes2, sc, th, core, body, inner, rim) {
    for (const pass of [0, 1, 2])
      for (const s of spikes2) {
        const c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
        for (let d = 0; d <= L; d += 0.5) {
          const hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3), hw = pass === 0 ? hw0 + 0.8 : pass === 1 ? hw0 : hw0 * 0.45;
          if (pass === 2 && d > L * 0.55) break;
          for (let o = -hw; o <= hw; o += 0.5) p.px(x + c * d - sn * o, y + sn * d + c * o, pass === 0 ? rim : pass === 1 ? d < L * 0.35 ? inner : body : core);
        }
      }
    const r = 2.4 * sc * Math.sqrt(th);
    p.circle(x, y, r + 0.8, inner);
    p.circle(x, y, r, core);
  }
  function sliver(p, x, y, a, r, arc, c, k) {
    const n = Math.ceil(r * arc * 2.2);
    for (let j = 0; j <= n; j++) {
      const u = j / n - 0.5, th = a + u * arc, w = 1.4 * (1 - Math.abs(u) * 2);
      for (let o = -w * 0.5; o <= w * 0.5 + 0.01; o += 0.5) p.dot(x + Math.cos(th) * (r + o), y + Math.sin(th) * (r + o), c, k);
    }
  }
  function along(pts, len2, fn) {
    let d = 0;
    for (let i = 1; i < pts.length && d < len2; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0), f = Math.min(1, (len2 - d) / l);
      fn(x0, y0, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, d);
      d += l;
    }
  }

  // vendor/pixelfx/src/fx/melee/heavy-cleave.js
  var meta = {
    name: "Heavy cleave",
    desc: "A glint over the head, then a thick ember arc accelerates over the top into the floor: a white slam, glowing cracks, dust rolling both ways, grit and rising embers.",
    tags: ["melee", "slash", "cleave", "axe", "heavy", "ground", "fire", "combat", "directional", "one-shot"],
    size: [208, 116],
    origin: [68, 96],
    duration: 1.9,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a0c10", "#5c1414", "#a3241a", "#e0481c", "#ff8a2a", "#ffc23d", "#fff0a0", "#ffffff"],
      stone: "#4a3f69",
      seed: 5
    }
  };
  var REST_ = { ...READY, weapon: "greatsword", two: true, sa: -1, fx: 11, fy: -21 };
  var OVER = { ...REST_, x: -4, crouch: 2, lean: -2, fx: 1, fy: -42, sa: -2.45, ffx: 8, fbx: -7 };
  var FLOOR2 = { ...REST_, x: 0, crouch: 7, lean: 6, fx: 17, fy: -21, sa: 0.72, ffx: 11, fbx: -10, toeB: true };
  var act = {
    target: { x: 66 },
    poses: [
      [-0.42, { ...REST_, x: -4 }],
      [-0.3, { ...REST_, x: -3, crouch: 4, fx: 13, fy: -29, sa: -1.3 }],
      [-0.12, { ...OVER, crouch: 4 }],
      [0.2, { ...OVER, crouch: 3 }],
      [0.27, { ...REST_, x: -1, y: -2, crouch: 0, lean: 2, fx: 11, fy: -42, sa: -1.45, ffx: 10, ghost: 1 }, "snap"],
      [0.31, { ...REST_, x: 0, y: -1, crouch: 3, lean: 4, fx: 18, fy: -33, sa: -0.45, ffx: 12, ghost: 1 }, "snap"],
      [0.335, FLOOR2, "snap"],
      [0.85, { ...FLOOR2, crouch: 6, lean: 5 }],
      [1.3, { ...REST_, x: -2, crouch: 4, lean: 2, fx: 15, fy: -23, sa: 0.1 }],
      [1.7, { ...REST_, x: -4 }]
    ],
    hits: [{ t: 0.335, stop: 0.2, shake: 0.34, amp: 3, push: 3.2, straw: 28, y: -8 }],
    dust: [{ t: 0.335, x: 18, n: 8, dir: 1 }, { t: 0.335, x: -12, n: 5, dir: -1 }]
  };
  var RAISE = 0.2;
  var SWING = 0.135;
  var HIT = RAISE + SWING;
  var HOLD = 0.05;
  var TRAIL = 0.22;
  var head = (t) => ease.inQuad(clamp((t - RAISE) / SWING));
  var passedAt = (f) => RAISE + SWING * Math.sqrt(clamp(f));
  function create(o) {
    const C = fit(o.palette, 8), n = C.length, R = new Rng(o.seed), st = stone(o.stone), floor = () => 0;
    const ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[3]] }), bits = new Bits({ ground: floor }), lights = new Lights();
    const A = swing({ cx: 3, cy: -22, R: 37, sy: 0.88, rot: 0.32, a0: -2.45, dir: 1 });
    let U1 = 0;
    while (onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4) U1 += 5e-3;
    const E = { ...A, R: A.R * 0.76 }, W = 16, WE = 5;
    const [X] = onSwing(A, A.R - 2, U1), GLINT = onSwing(A, A.R - 3, 0);
    const lines = cracks(R, X, 4, 40, 7, 0.4);
    const spikes2 = [-Math.PI, -2.7, -2.15, -1.62, -1.05, -0.45, 0].map((a, i) => ({ a: a + R.range(-0.08, 0.08), len: (i === 0 || i === 6 ? 20 : i === 3 ? 15 : 9) + R.range(0, 4), w: 1.6 + R.range(0, 0.6) }));
    const shards = [-2.5, -1.9, -1.2, -0.6].map((a) => ({ a: a + R.range(-0.15, 0.15), r: 8 + R.range(0, 3), v: R.range(80, 130), arc: R.range(0.35, 0.6) }));
    let t = 0, hit = false;
    const arc = (p, s, w0, lag, rim) => {
      const tt = t - lag, U = U1 * head(tt), T = U1 * smooth(HIT + HOLD, HIT + HOLD + TRAIL, tt);
      if (U < 0.02 || T >= U - 0.02) return;
      const gone = smooth(HIT + HOLD, HIT + HOLD + TRAIL, tt), shrink = 1 - 0.75 * gone;
      smear(p, s, T, U, w0, (u, r, out) => {
        const age = Math.max(0, tt - passedAt(u / U1)), v = (u - T) / (U - T);
        const w = w0 * shrink * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
        if (w < 0.4) return;
        const q = (s.R - r) / w;
        if (q < 0 || q > 1) return;
        const ci = rim && q < 0.22 && age < 0.12 ? 0 : Math.round(q * (n - 1) * 0.62 + age * 7 + Math.max(0, tt - HIT) * 10 - v * 0.8 + (rim ? 0.7 : 1.7));
        out.c = C[n - 1 - clamp(ci, 0, n - 1)];
        out.a = Math.min(1, v / 0.35) * (1.2 - gone);
      });
      if (rim) glowAlong(p, s, s.R - w0 * 0.4, T, U, 7 + w0 * 0.5, C[4], (u) => 0.26 * Math.exp(-Math.max(0, tt - passedAt(u / U1)) / 0.2) * ((u - T) / (U - T)));
    };
    return {
      update(dt) {
        t += dt;
        if (t < RAISE - 0.04 && R.chance(0.35)) {
          const a = R.range(0, TAU), D3 = R.range(14, 26), T = R.range(0.14, 0.2), v = D3 * 3 / (Math.exp(3 * T) - 1);
          ps.spawn(P.STREAK, GLINT[0] + Math.cos(a) * D3, GLINT[1] + Math.sin(a) * D3, -Math.cos(a) * v, -Math.sin(a) * v, T, R.chance(0.5) ? C[5] : C[4]);
        }
        if (t > RAISE && t < HIT && R.chance(0.7)) {
          const u = U1 * head(t) * R.range(0.6, 1), [x, y] = onSwing(A, A.R - R.range(0, 6), u);
          ps.spawn(P.EMBER, x, y, R.range(-20, 20), R.range(-40, -10), R.range(0.5, 1.1), C[4], R.range(1, 2));
        }
        if (!hit && t >= HIT) {
          hit = true;
          lights.add(X, -6, 26, WHITE, 0.9, 0.1);
          lights.add(X, -12, 64, C[4], 0.5, 0.8);
          for (let i = 0; i < 26; i++) {
            const a = -Math.PI / 2 + R.range(-1.2, 1.35), sp = R.range(140, 360);
            ps.spawn(P.SPARK, X, -1, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.5));
          }
          for (let i = 0; i < 20; i++) {
            const s = i % 2 ? -1 : 1;
            ps.spawn(P.SMOKE, X + s * R.range(0, 8), -R.range(2, 6), s * R.range(45, 135), -R.range(2, 12), R.range(1, 1.45), st.dust, R.range(5, 8.5), R.range(0, 0.07), PF.BIG);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, X + R.range(-4, 4), -R.range(3, 8), R.range(-15, 15), -R.range(40, 90), R.range(1, 1.45), st.dust, R.range(4, 6.5), R.range(0.02, 0.1), PF.BIG);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R.range(-4, 4), -R.range(1, 4), R.range(-60, 60), -R.range(8, 30), R.range(0.35, 0.7), st.dust, R.range(2, 3.5));
          for (let i = 0; i < 44; i++) {
            const a = -Math.PI / 2 + R.range(-0.7, 1), sp = R.range(60, 230);
            ps.spawn(P.GRIT, X + R.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.5), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.35) ? 2 : 1);
          }
          for (let i = 0; i < 6; i++)
            bits.add({ kind: B.CHUNK, x: X + R.range(-3, 3), y: -2, vx: R.range(-50, 110), vy: -R.range(120, 260), g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.15, 1.5), a: R.range(0, TAU), va: R.range(-14, 14), s: R.int(1, 2) });
          for (let i = 0; i < 16; i++) ps.spawn(P.EMBER, X + R.range(-8, 8), -R.range(1, 6), R.range(-50, 60), -R.range(30, 110), R.range(0.7, 1.5), C[4], R.range(1, 2));
        }
        if (hit && t < HIT + 0.6 && R.chance(0.12)) {
          const c = R.pick(lines), pt = R.pick(c.pts);
          ps.spawn(P.EMBER, pt[0], pt[1] - 1, R.range(-12, 12), -R.range(20, 50), R.range(0.5, 0.9), C[4], 1);
        }
        bits.update(dt);
        for (const b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = true;
            for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 30), -R.range(2, 12), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.4));
          }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        const q = t - HIT;
        if (q >= 0) {
          const fade = 1 - smooth(1, 1.5, q);
          for (let y = 0; y <= 2; y++)
            for (let x = -9; x <= 9; x++) {
              const d = Math.hypot((x + 0.5) / 9, (y + 0.5) / 3.5);
              if (d > 1) continue;
              const T = Math.pow(clamp(1 - q / 0.8), 1.4) * (1.2 - d) - rand(x, y, 3) * 0.3;
              if (T > 0.08) p.dot(X + x, y, C[clamp(Math.round(T * 9), 1, 7)], fade);
              else p.dot(X + x, y, d < 0.5 ? st.dark : st.shade, (d < 0.9 - rand(x, y, 9) * 0.3 ? 1 : 1 - d) * fade);
            }
          const k = q / 0.45;
          if (k < 1) band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) < 0);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        const q = t - HIT;
        if (t < RAISE + 0.03) {
          const g = ease.outBack(clamp(t / 0.1)) * (1 + 0.15 * Math.sin(t * 60)) * (t > RAISE ? 1 - (t - RAISE) / 0.03 : 1);
          sparkle(p, GLINT[0], GLINT[1], 1 + 7 * g, C[6], C[4], 0.5);
          p.glow(GLINT[0], GLINT[1], 22, C[4], 0.3 * g);
        }
        if (q >= 0) {
          const heat = Math.pow(clamp(1 - q / 1.2), 1.2), fade = 1 - smooth(1.15, 1.5, q);
          for (const c of lines) {
            const reach2 = 40 * ease.outCubic(clamp((q - c.at * 0.1) / 0.13)) * (c.fork ? 0.3 : 1);
            if (reach2 <= 0) continue;
            along(c.pts, reach2, (x0, y0, x1, y1, d) => {
              const h = heat * (1 - d / 46) - (c.fork ? 0.12 : 0), col = h > 0.72 ? WHITE : h > 0.08 ? C[clamp(Math.round(h * 8), 1, 6)] : st.dark;
              if (y1 > 0.5) p.line(x0 + 1, y0, x1 + 1, y1, st.dark, fade);
              p.line(x0, y0, x1, y1, col, fade);
              if (h > 0.25 && (d | 0) % 6 < 2) p.glow(x1, y1, 6, C[4], 0.2 * h * fade);
            });
          }
          if (heat > 0) p.glow(X, -2, 34, C[4], 0.32 * heat * fade);
          const k = q / 0.45;
          if (k < 1) band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) >= 0);
        }
        arc(p, E, WE, 0.02, false);
        arc(p, A, W, 0, true);
        const tail = U1 * smooth(HIT + HOLD, HIT + HOLD + TRAIL, t), th = 0.8 * (1 - clamp((t - HIT - HOLD) / (TRAIL + 0.25)));
        if (tail > 0.02 && th > 0) trace(p, A, A.R - 0.5, 0, tail, C[3], (u) => th * (0.4 + 0.6 * u / U1));
        if (t > RAISE && t < HIT + 0.05) {
          const [x, y] = onSwing(A, A.R - 5, U1 * head(t));
          p.glow(x, y, 40, C[4], 0.5);
        }
        if (q >= 0 && q < 0.035) star(p, X, -1, spikes2, 1, 1, WHITE, C[6], C[7], C[5]);
        else if (q >= 0.035 && q < 0.07) star(p, X, -1, spikes2, 1.25, 0.55, C[7], C[6], C[6], C[4]);
        if (q >= 0.05 && q < 0.16) {
          const k = (q - 0.05) / 0.11;
          for (const s of shards) sliver(p, X, -1, s.a, s.r + s.v * (q - 0.05), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : k < 0.7 ? C[5] : C[4], 1 - k);
        }
        if (q >= 0 && q < 0.2) {
          const pop = Math.exp(-q / 0.05);
          p.glow(X, -6, 30, C[5], 0.8 * pop);
          p.glow(X, -2, 10, WHITE, 0.7 * pop);
        }
        for (const b of bits.list) rock(p, b, st);
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/lightning/spark-beam.js
  var spark_beam_exports = {};
  __export(spark_beam_exports, {
    create: () => create2,
    meta: () => meta2
  });

  // vendor/pixelfx/src/fx/lightning/_lib.js
  var VOLT = ["#120a33", "#2a1b78", "#4630c0", "#5a62f0", "#58a6ff", "#9ed8ff", "#e4f6ff", "#ffffff"];
  var PLASMA = ["#ffffff", "#c8f8ff", "#7ff3ff", "#1ab8e6"];
  var SOOT = hex("#110c16");
  var SOOT2 = hex("#1c1522");
  function zigzag(R, x0, y0, x1, y1, jag = 0.32, forks = 0.35, w = 1, depth = 0) {
    const out = { paths: [] }, L = Math.hypot(x1 - x0, y1 - y0);
    let pts = [[x0, y0], [x1, y1]], off = L * jag;
    while (pts.length < 2 + L / 3) {
      const nxt = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay) || 1, o = R.range(-off, off);
        nxt.push([(ax + bx) / 2 + -(by - ay) / l * o, (ay + by) / 2 + (bx - ax) / l * o], [bx, by]);
      }
      pts = nxt;
      off *= 0.52;
    }
    out.paths.push({ pts, w });
    if (depth < 2) {
      for (let i = 2; i < pts.length - 3; i++)
        if (R.chance(forks / (1 + depth) / Math.max(4, pts.length / 6))) {
          const [ax, ay] = pts[i], [bx, by] = pts[Math.min(pts.length - 1, i + 3)];
          const a = Math.atan2(by - ay, bx - ax) + R.sign() * R.range(0.35, 0.9), l = (L - i / pts.length * L) * R.range(0.25, 0.55);
          out.paths.push(...zigzag(R, ax, ay, ax + Math.cos(a) * l, ay + Math.sin(a) * l, jag * 1.1, forks, w * 0.55, depth + 1).paths);
        }
    }
    return out;
  }
  function bowed(R, x0, y0, x1, y1, bow, jag = 0.22, forks = 0.4) {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    const mx = (x0 + x1) / 2 + nx * bow + R.range(-2, 2), my = (y0 + y1) / 2 + ny * bow;
    const a = zigzag(R, x0, y0, mx, my, jag, forks), b = zigzag(R, mx, my, x1, y1, jag, forks);
    return { paths: [{ pts: [...a.paths[0].pts, ...b.paths[0].pts.slice(1)], w: 1 }, ...a.paths.slice(1), ...b.paths.slice(1)] };
  }
  var N = 1024;
  var HALF = 512;
  var GRID = new Uint8Array(N * N);
  var HIT2 = [];
  function mark(x, y, lvl) {
    const X = Math.floor(x) + HALF, Y = Math.floor(y) + HALF;
    if (X < 0 || Y < 0 || X >= N || Y >= N) return;
    const i = Y * N + X, v = GRID[i];
    if (!v) HIT2.push(i);
    if (lvl > v) GRID[i] = lvl;
  }
  function stamp(x, y, r, lvl) {
    if (r <= 0.5) return mark(Math.round(x), Math.round(y), lvl);
    const r2 = r * r;
    for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) {
      const dy = py + 0.5 - y;
      for (let px = Math.floor(x - r); px <= Math.ceil(x + r); px++) {
        const dx = px + 0.5 - x;
        if (dx * dx + dy * dy <= r2) mark(px, py, lvl);
      }
    }
  }
  function flush(p, cols, alphas) {
    for (const i of HIT2) {
      const v = GRID[i];
      GRID[i] = 0;
      const x = i % N - HALF, y = (i / N | 0) - HALF, a = alphas ? alphas[v - 1] : 1;
      if (a >= 1) p.px(x, y, cols[v - 1]);
      else if (a > 0) p.dot(x, y, cols[v - 1], a);
    }
    HIT2.length = 0;
  }
  var walk = (pts, fn) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.max(1, Math.hypot(bx - ax, by - ay));
      for (let d = 0; d <= l; d += 0.5) fn(ax + (bx - ax) * d / l, ay + (by - ay) * d / l, i);
    }
  };
  function stroke(p, b, k, C, s = 1, o = {}) {
    var _a, _b;
    if (k <= 0.02) return;
    const lk = (_a = o.light) != null ? _a : 0.5;
    for (const q of b.paths) {
      const trunk = q.w >= 1;
      if (!trunk && k < 0.5) continue;
      const rh = (trunk ? k > 0.6 ? 2.1 : 1.6 : 1.1) * s, rb = (trunk ? k > 0.6 ? 1.3 : 0.8 : 0.5) * s;
      const pts = o.upTo !== void 0 && trunk ? q.pts.slice(0, Math.max(2, Math.ceil(q.pts.length * o.upTo))) : q.pts;
      walk(pts, (x, y) => {
        stamp(x, y, rh, 1);
        stamp(x, y, rb, trunk ? 3 : 2);
        if (trunk && k > 0.3) o.core ? stamp(x, y, o.core, 4) : mark(x, y, 4);
      });
      for (let i = 0; i < pts.length - 1; i += 3) if (o.minY === void 0 || pts[i][1] > o.minY) p.glow(pts[i][0], pts[i][1], (trunk ? 14 : 7) * s, C[4], lk * k * q.w);
    }
    const a = (_b = o.a) != null ? _b : 1;
    flush(p, o.hero ? [C[3], C[6], C[7], C[7]] : [C[2], C[4], C[5], C[7]], [a, a, a, a]);
  }
  function crackle(p, b, k, C, glowK = 0.5, a = 1) {
    if (k <= 0.02) return;
    for (const q of b.paths) {
      const thick = q.w >= 1;
      walk(q.pts, (x, y) => {
        if (k > 0.45 && thick) for (const [dx, dy] of CROSS2) mark(x + dx * 1.5, y + dy * 1.5, 1);
        if (k > 0.25 && (thick || q.w > 0.4)) mark(x + 1, y, 2), mark(x, y + 1, 2);
        mark(x, y, thick && k > 0.3 ? 4 : 3);
      });
      for (let i = 0; i < q.pts.length - 1; i += 3) p.glow(q.pts[i][0], q.pts[i][1], (thick ? 9 : 5) * (0.5 + k * 0.5), C[4], glowK * k * q.w);
    }
    flush(p, [C[3], C[5], C[5], C[7]], [Math.min(1, (k - 0.45) * 1.6) * a, a, a, a]);
  }
  var CROSS2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function trace2(p, pts, c, a = 1, from = 0, to = pts.length - 1) {
    for (let i = Math.max(0, from); i < Math.min(to, pts.length - 1); i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, a);
  }
  function flight(x, y, vx, vy, age, { g = 0.45, drag = 2.2, floor = Infinity, bounce = 0.45 } = {}) {
    const dt = 1 / 120;
    for (let s = 0; s < age; s += dt) {
      const h = Math.min(dt, age - s);
      vy += GRAVITY * g * h;
      vx -= vx * drag * h;
      vy -= vy * drag * h;
      const ny = y + vy * h;
      x += vx * h;
      if (vy > 0 && y <= floor && ny >= floor) vy = -vy * bounce, vx *= 0.7, y = floor - 0.25;
      else y = ny;
    }
    return [x, y, vx, vy];
  }
  function spark(p, x, y, vx, vy, k, S) {
    const sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, head4 = k > 0.6 ? S[0] : k > 0.3 ? S[1] : S[2], len2 = Math.min(9, 1 + sp * 0.022);
    p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head4 : S[S.length - 1]);
    p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head4);
    p.glow(x, y, 3, head4, 0.45 * k);
  }

  // vendor/pixelfx/src/fx/lightning/spark-beam.js
  var meta2 = {
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
    options: { palette: VOLT, sparks: PLASMA, seed: 7, to: [130, 6], level: 0, broken: false }
  };
  var MAX = 4;
  function create2(o) {
    const C = fit(o.palette, 8), R = new Rng(o.seed);
    const floorAt = () => (o.to[1] > 0 ? o.to[1] : 0) + 16;
    const ps = new Particles({ rng: R, ground: floorAt, sparks: o.sparks }), lights = new Lights();
    let t = 0, seen = o.level, surge = 0, snapped = false, lastPts = null;
    const shape2 = (f2, L) => {
      const [tx, ty] = o.to, r = rng(o.seed, 31, f2), len2 = Math.hypot(tx, ty) || 1;
      return bowed(r, 0, 0, tx, ty, r.range(-1, 1) * len2 * (0.06 + 0.02 * L), 0.2 + 0.02 * L, 0.06 + 0.1 * L);
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
        if (o.level > seen) {
          seen = o.level;
          surge = 0.1;
          lights.add(tx, ty, 50 + 8 * L, C[4], 0.9, 0.25);
          lights.add(tx, ty, 16, WHITE, 0.8, 0.08);
          burst(tx, ty, 10 + 4 * L, 70, 200 + 20 * L);
        }
        surge = Math.max(0, surge - dt);
        if (o.broken && !snapped) {
          snapped = true;
          for (let i = 0; i < 18; i++) {
            const u = R.next();
            ps.spawn(P.SPARK, lerp(0, tx, u), lerp(0, ty, u), R.range(-120, 120), R.range(-150, 40), R.range(0.12, 0.3));
          }
          lights.add(tx / 2, ty / 2, 40, C[4], 0.6, 0.12);
        }
        if (!o.broken) {
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
          const b = shape2(f2, L);
          lastPts = b.paths[0].pts;
          stroke(p, b, surge > 0 ? 1 : hum, C, s, { hero: surge > 0, core: L >= 3 ? 1.1 : void 0, light: 0.32 + 0.06 * L });
          for (let j = 1; j <= (L >= 4 ? 2 : L >= 2 ? 1 : 0); j++) {
            const r = rng(o.seed, 40 + j, f), len2 = Math.hypot(tx, ty) || 1;
            crackle(p, bowed(r, 0, 0, tx, ty, (j % 2 ? -1 : 1) * len2 * r.range(0.025, 0.06), 0.34, 0.08), r.range(0.5, 0.75), C, 0.3);
          }
          const rh = 1.4 + 0.45 * L + Math.sin(t * 53) * 0.4;
          p.circle(0, 0, rh + 1.2, C[4]);
          p.circle(0, 0, rh, C[6]);
          p.circle(0, 0, rh * 0.5, WHITE);
          p.glow(0, 0, 14 + 3 * L, C[4], 0.5 + 0.08 * L);
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
          trace2(p, lastPts, C[4], 0.8);
        }
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/lightning/electrified.js
  var electrified_exports = {};
  __export(electrified_exports, {
    act: () => act2,
    draw: () => draw,
    drawBack: () => drawBack,
    meta: () => meta3
  });
  var meta3 = {
    name: "Electrified",
    desc: "Current runs through a character: arcs crawl over and leap across the body, sparks spit off, the body flares to an electric silhouette on each jolt, and the feet ground out.",
    tags: ["lightning", "electric", "status", "shock", "stun", "actor", "loop"],
    size: [108, 92],
    origin: [54, 76],
    duration: 2,
    loop: true,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: VOLT, sparks: PLASMA, seed: 5 }
  };
  var TENSE = { turn: 0.9, crouch: 3, fx: -8, fy: -17, bx: 9, by: -17, ffx: -3, fbx: 4 };
  var JOLT_A = { turn: 1.1, crouch: 0, y: -1, fx: -13, fy: -36, bx: 13, by: -17, ffx: -4, fbx: 5 };
  var JOLT_B = { turn: 0.7, crouch: 1, y: -1, fx: -13, fy: -16, bx: 13, by: -36, ffx: -4, fbx: 5 };
  var act2 = {
    onBody: true,
    poses: [
      [0, TENSE],
      [0.1, JOLT_A, "snap"],
      [0.17, JOLT_B, "snap"],
      [0.3, TENSE, "snap"],
      [0.733, TENSE],
      [0.733, JOLT_B, "snap"],
      [0.8, JOLT_A, "snap"],
      [0.93, TENSE, "snap"],
      [1.367, TENSE],
      [1.367, JOLT_A, "snap"],
      [1.45, JOLT_B, "snap"],
      [1.58, TENSE, "snap"],
      [2, TENSE]
    ]
  };
  var FPS = 30;
  var N2 = 60;
  var P2 = 2;
  var JOLTS = [[3, 1], [22, 0.7], [41, 0.9]];
  var edges = /* @__PURE__ */ new WeakMap();
  function edgeOf(A) {
    let e = edges.get(A.mask);
    if (e) return e;
    const m = A.mask, on = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.data[y * m.w + x];
    e = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (on(x, y) && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1))) e.push([A.x + x + 0.5, A.y + y + 0.5]);
    edges.set(A.mask, e);
    return e;
  }
  var jolt = (f) => {
    for (const [f0, k] of JOLTS) if (f >= f0 && f < f0 + 3) return { a: f - f0, k };
    return null;
  };
  function drawBack(p, t, o) {
    const C = fit(o.palette, 8), A = o.actor, f = Math.floor(t * FPS + 1e-6) % N2, j = jolt(f), r = rng(o.seed, 4, f);
    p.outline(A.mask, A.x, A.y, j ? C[4] : r.next() < 0.5 ? C[2] : C[1]);
    p.glow(0, -18, 30, C[3], j ? 0.55 * j.k : 0.16 + 0.1 * r.next());
    p.glow(0, -2, 22, C[4], 0.18);
  }
  function draw(p, t, o) {
    const C = fit(o.palette, 8), S = o.sparks.map(hex), A = o.actor, E = edgeOf(A), f = Math.floor(t * FPS + 1e-6) % N2, j = jolt(f);
    if (j) {
      const lift = [1.1, 0.6, -0.2][j.a] * j.k, ramp2 = [C[1], C[2], C[3], C[4], C[5], C[6], C[7]];
      for (let y = 0; y < A.h; y++)
        for (let x = 0; x < A.w; x++) {
          const c = A.pixels[y * A.w + x];
          if (c) p.px(A.x + x, A.y + y, ramp2[clamp(Math.round(0.4 + luma(c) * 6 + lift), 0, 6)]);
        }
      p.glow(0, -19, 26, C[5], 0.5 * j.k * (1 - j.a / 3));
    }
    const r = rng(o.seed, 7, f >> 1), n = 2 + (j ? 2 : r.int(0, 1));
    for (let i = 0; i < n; i++) {
      const a = r.pick(E), ang = r.range(0, TAU), d = r.range(6, 14);
      let b = [a[0] + Math.cos(ang) * d, a[1] + Math.sin(ang) * d];
      for (let k2 = 0; k2 < 10; k2++) {
        const c = r.pick(E);
        if (Math.hypot(c[0] - b[0], c[1] - b[1]) < 5 && Math.hypot(c[0] - a[0], c[1] - a[1]) > 4) b = c;
      }
      const k = (f & 1 ? 0.75 : 0.95) * r.range(0.6, 1);
      crackle(p, zigzag(rng(o.seed, 8, f, i), a[0], a[1], b[0], b[1], 0.42, 0.35), k, C, 0.4);
      for (const [x, y] of E) if (Math.hypot(x - a[0], y - a[1]) < 3.5 || Math.hypot(x - b[0], y - b[1]) < 3) p.px(x - 0.5, y - 0.5, C[5]);
    }
    if (r.next() < (j ? 0.9 : 0.35)) {
      const s = r.sign(), x0 = s * r.range(3, 8);
      crackle(p, zigzag(rng(o.seed, 9, f), x0, -1.5, x0 + s * r.range(5, 12), -0.5, 0.45, 0.3), 0.7, C, 0.35);
      p.glow(x0, -1, 10, C[5], 0.35);
    }
    for (const [f0, k] of JOLTS) {
      const age = ((t - f0 / FPS) % P2 + P2) % P2;
      for (let i = 0; i < 9; i++) {
        const q = rng(o.seed, 21, f0, i), life = q.range(0.18, 0.4);
        if (age >= life) continue;
        const [x0, y0] = E[Math.floor(q.next() * E.length)], ang = Math.atan2(y0 + 19, x0) + q.range(-0.7, 0.7), sp = q.range(60, 150) * k;
        const [x, y, vx, vy] = flight(x0, y0, Math.cos(ang) * sp, Math.sin(ang) * sp - 30, age, { floor: 0 });
        spark(p, x, y, vx, vy, 1 - age / life, S);
      }
    }
    cycle(t, P2, 8, o.seed + 3, (g) => g.range(0.15, 0.3), (age, life, q) => {
      const [x0, y0] = E[Math.floor(q.next() * E.length)], ang = Math.atan2(y0 + 19, x0) + q.range(-0.6, 0.6), sp = q.range(50, 110);
      const [x, y, vx, vy] = flight(x0, y0, Math.cos(ang) * sp, Math.sin(ang) * sp - 20, age, { floor: 0 });
      spark(p, x, y, vx, vy, 1 - age / life, S);
    });
  }

  // vendor/pixelfx/src/fx/lightning/zap-hit.js
  var zap_hit_exports = {};
  __export(zap_hit_exports, {
    create: () => create3,
    meta: () => meta4
  });
  var meta4 = {
    name: "Zap hit",
    desc: "A contact zap: an arc snaps in from the left, the hit point overloads into a knot of tiny crackling zigzags, a fern of burn marks glows outward, sparks jink away, ozone puffs.",
    tags: ["lightning", "electric", "hit", "impact", "combat", "directional", "one-shot"],
    size: [144, 112],
    origin: [76, 56],
    duration: 0.9,
    loop: false,
    fps: 30,
    bg: "dark",
    options: { palette: VOLT, seed: 3 }
  };
  var SNAP = 0.05;
  var ASH = hex("#6a6680");
  function fern(R) {
    const out = [];
    const grow = (x, y, a, len2, w, d, depth) => {
      const pts = [[x, y, d]];
      let side = R.sign();
      for (let s = 0; s < len2; s += 1.4) {
        a += R.range(-0.3, 0.3);
        x += Math.cos(a) * 1.4;
        y += Math.sin(a) * 1.4;
        d += 1.4;
        pts.push([x, y, d]);
        if (depth < 2 && s > 2 && R.chance(0.24)) {
          side = -side;
          grow(x, y, a + side * R.range(0.55, 1.05), (len2 - s) * R.range(0.3, 0.55), w * 0.6, d, depth + 1);
        }
      }
      out.push({ pts, w });
    };
    for (let i = 0; i < 6; i++) grow(0, 0, i / 6 * TAU + R.range(-0.35, 0.35), R.range(18, 32), 1, 0, 0);
    return out;
  }
  function create3(o) {
    const C = fit(o.palette, 8), R = new Rng(o.seed), ps = new Particles({ rng: R }), lights = new Lights();
    const tree = fern(R), Y0 = R.range(-14, 6);
    const kinked = Array.from({ length: 16 }, () => {
      const a = R.range(-1.2, 1.2) + (R.chance(0.7) ? 0 : Math.PI), sp = R.range(130, 250);
      return { x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: R.range(0.2, 0.36), age: -SNAP, next: R.range(0.02, 0.05), trail: [] };
    });
    let t = 0, hit = false;
    return {
      update(dt) {
        t += dt;
        if (!hit && t >= SNAP) {
          hit = true;
          lights.add(0, 0, 60, C[4], 0.7, 0.3);
          lights.add(0, 0, 14, WHITE, 0.5, 0.07);
          for (let i = 0; i < 3; i++) ps.spawn(P.SMOKE, R.range(-3, 5), R.range(-4, 2), R.range(-5, 8), -R.range(8, 16), R.range(0.55, 0.75), mix(ASH, C[4], 0.3), R.range(2.5, 3.8), R.range(0.08, 0.16));
        }
        for (const s of kinked) {
          if ((s.age += dt) < 0 || s.age >= s.life) continue;
          if ((s.next -= dt) <= 0) {
            s.next = R.range(0.025, 0.055);
            const sp = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx) + R.sign() * R.range(0.6, 1.3);
            s.vx = Math.cos(a) * sp;
            s.vy = Math.sin(a) * sp;
            s.trail.push([s.x, s.y]);
            if (s.trail.length > 4) s.trail.shift();
          }
          s.vx -= s.vx * 3 * dt;
          s.vy -= s.vy * 3 * dt - 140 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        if (t < SNAP) return;
        const cool = smooth(0.45, 0.85, t), fade = 1 - smooth(0.78, 0.88, t);
        for (const br of tree)
          for (let i = 1; i < br.pts.length; i++) {
            const [x0, y0] = br.pts[i - 1], [x, y, d] = br.pts[i], age = t - SNAP - d / 260;
            if (age < 0) break;
            const k = Math.exp(-age / 0.22) - cool * 0.3, c = k > 0.75 ? WHITE : k > 0.45 ? C[6] : k > 0.25 ? C[5] : k > 0.1 ? C[4] : k > -0.05 ? C[2] : C[1];
            p.line(x0, y0, x, y, c, fade);
            if (br.w >= 1 && d < 9) p.line(x0 + 1, y0, x + 1, y, k > 0.45 ? C[5] : C[2], fade);
            if ((i & 3) === 0 && k > 0) p.glow(x, y, 5, C[5], 0.35 * k * fade);
          }
        ps.draw(p, "back");
      },
      draw(p) {
        const f = Math.floor(t * 30 + 1e-4);
        if (t < 0.32) {
          const r = rng(o.seed, 2, f), b = zigzag(r, -66, Y0, 0, 0, 0.22, 0.35), u = clamp(t / SNAP);
          const k = t < SNAP ? 1 : t < 0.2 ? f % 2 ? 0.7 : 1 : 0.55 * (1 - (t - 0.2) / 0.12);
          stroke(p, u < 1 ? { paths: [b.paths[0]] } : b, k, C, t < SNAP + 0.034 ? 0.95 : 0.7, { upTo: u, hero: t >= SNAP && t < SNAP + 0.034 });
          if (u < 1) {
            const tp = b.paths[0].pts, [hx, hy] = tp[Math.floor(u * (tp.length - 1))];
            p.circle(hx, hy, 2, WHITE);
            p.glow(hx, hy, 14, C[5], 0.6);
          }
        }
        if (t >= SNAP && t < 0.45) {
          const a = (t - SNAP) / 0.4, r = rng(o.seed, 5, f), R02 = 8 * (1 - a * 0.6), m = Math.round(11 * (1 - a * 0.5));
          for (let i = 0; i < m; i++) {
            const ang = r.range(0, TAU), d0 = r.range(0.5, R02 * 0.5), ang2 = ang + r.range(-1.2, 1.2), d1 = r.range(R02 * 0.55, R02);
            crackle(p, zigzag(r, Math.cos(ang) * d0, Math.sin(ang) * d0, Math.cos(ang2) * d1, Math.sin(ang2) * d1, 0.5, 0), 0.75 * (1 - a) + 0.25, C, 0.25);
          }
          p.circle(0, 0, 3 * (1 - a) + 1, C[5]);
          p.circle(0, 0, 2 * (1 - a) + 0.5, WHITE);
          p.glow(0, 0, 20, C[4], 0.55 * (1 - a));
          if (t < SNAP + 0.07) p.glow(0, 0, 9, WHITE, 0.4);
        }
        for (const s of kinked) {
          if (s.age < 0 || s.age >= s.life) continue;
          const k = 1 - s.age / s.life, path = [...s.trail, [s.x, s.y]];
          for (let i = 0; i < path.length - 1; i++) p.line(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], i === path.length - 2 ? k > 0.5 ? WHITE : C[6] : k > 0.5 ? C[5] : C[4], 0.6 + 0.4 * (i / path.length));
          p.px(s.x, s.y, k > 0.4 ? WHITE : C[5]);
          p.glow(s.x, s.y, 4, C[5], 0.4 * k);
        }
        if (t >= SNAP) p.glow(0, 0, 40 * Math.max(0, 1 - t / 0.85), C[3], 0.45 * Math.exp(-(t - SNAP) * 5) * (f % 2 ? 0.7 : 1));
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/melee/sword-slash.js
  var sword_slash_exports = {};
  __export(sword_slash_exports, {
    act: () => act3,
    create: () => create4,
    meta: () => meta5
  });
  var meta5 = {
    name: "Sword slash",
    desc: "A tilted crescent whips round in two frames, cools from white to deep blue as it trails off, glints at the tip and throws sparks.",
    tags: ["melee", "slash", "sword", "combat", "directional", "one-shot"],
    size: [136, 104],
    origin: [44, 92],
    duration: 0.75,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8c9e8", "#e8f1ff", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      radius: 42,
      seed: 2
    }
  };
  var GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
  var WIND = { ...GUARD, x: -8, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -8 };
  var CUT = { ...GUARD, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -10, ghost: 1 };
  var DOWN = { ...GUARD, x: 2, crouch: 5, lean: 5, fx: 20, fy: -21, sa: 0.62, bx: -9, by: -24, ffx: 13, fbx: -10, toeB: true };
  var act3 = {
    target: { x: 58 },
    poses: [
      [-0.55, { ...GUARD, x: -8 }],
      [-0.3, WIND],
      [-0.08, { ...WIND, crouch: 5, lean: -5 }],
      [0, CUT, "snap"],
      [0.06, DOWN, "snap"],
      [0.3, { ...DOWN, x: 3, crouch: 6 }],
      [0.58, { ...GUARD, x: 1, crouch: 3, fx: 15, fy: -21, sa: 0.1, bx: -5, by: -21, ffx: 9, fbx: -7 }],
      [0.86, { ...GUARD, x: -8 }]
    ],
    hits: [{ t: 0.06, stop: 0.14, shake: 0.18, amp: 2, push: 2.8, straw: 18 }],
    dust: [{ t: 0.06, x: 16, n: 7, dir: 1 }, { t: 0.06, x: -11, n: 4, dir: -1 }]
  };
  function onArc(s, r, a) {
    const lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy, c = Math.cos(s.rot), n = Math.sin(s.rot);
    return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
  }
  function crescent(p, s, ta, L, W, age) {
    if (Math.abs(L) < 0.02 || W < 0.3) return;
    const R = s.ramp, n = R.length, dir = Math.sign(L), span = Math.abs(L), c = Math.cos(s.rot), sn = Math.sin(s.rot), B2 = s.R + 2;
    p.shade(s.cx - B2, s.cy - B2, s.cx + B2, s.cy + B2, (x, y, out) => {
      const dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * sn, ly = (-dx * sn + dy * c) / s.sy, r = Math.hypot(lx, ly);
      if (r > s.R + 0.5 || r < s.R - W - 1) return;
      let u = dir * (Math.atan2(ly, lx) - ta) % TAU;
      if (u < 0) u += TAU;
      if (u > span) return;
      const v = u / span, w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
      if (w < 0.35) return;
      const q = (s.R - r) / w;
      if (q < 0 || q > 1) return;
      const ci = q < 0.22 && age < 0.5 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4);
      out.c = R[n - 1 - clamp(ci, 0, n - 1)];
      out.a = Math.min(1, v / 0.4);
    });
    for (let u = 0; u <= span; u += 0.3) {
      const [x, y] = onArc(s, s.R - W * 0.4, ta + dir * u);
      p.glow(x, y, 5 + W, R[n - 3], 0.22 * (1 - age) * (u / span));
    }
  }
  function drawSlash(p, s, t) {
    const u = t - s.t0;
    if (u < 0) return;
    const span = s.a1 - s.a0, head4 = ease.outExpo(clamp(u / s.sweep)), tail = smooth(s.sweep + s.hold, s.sweep + s.hold + s.trail, u);
    const age = clamp(u / (s.sweep + s.hold + s.trail));
    if (tail < 1) crescent(p, s, s.a0 + span * tail, span * (head4 - tail), s.W * (1 - tail * 0.55), age);
    const th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
    if (tail > 0.02 && th > 0)
      for (let k = 0; k <= tail; k += 0.6 / (Math.abs(span) * s.R)) {
        const [x, y] = onArc(s, s.R - 0.5, s.a0 + span * k);
        p.dot(x, y, s.ramp[1], th * (0.4 + 0.6 * k));
      }
  }
  function tipOf(s) {
    const [x, y] = onArc(s, s.R - s.W * 0.3, s.a1), [x2, y2] = onArc(s, s.R - s.W * 0.3, s.a1 + Math.sign(s.a1 - s.a0) * 0.05);
    const l = Math.hypot(x2 - x, y2 - y) || 1;
    return { x, y, dx: (x2 - x) / l, dy: (y2 - y) / l };
  }
  function create4(o) {
    const C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks });
    const R02 = o.radius, a0 = -2.55, a1 = 0.95;
    const A = { cx: 6, cy: -26, R: R02, sy: 0.6, rot: -0.38, a0, a1, W: 12, t0: 0, sweep: 0.06, hold: 0.06, trail: 0.24, ramp: C };
    const E = { ...A, R: R02 * (33 / 42), W: R02 * (4.5 / 42), a0: a0 + (a1 - a0) * 0.1, a1: a1 - (a1 - a0) * (0.15 / 3.5), t0: 0.017, hold: 0.03, trail: 0.2, ramp: C.slice(0, 6) };
    const tip = tipOf(A);
    let t = 0, landed = false;
    return {
      update(dt) {
        t += dt;
        if (!landed && t >= A.sweep) {
          landed = true;
          for (let i = 0; i < 10; i++) {
            const a = Math.atan2(tip.dy, tip.dx) + Rg.range(-0.5, 0.5), sp = Rg.range(150, 400);
            ps.spawn(P.SPARK, tip.x, tip.y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.35));
          }
          for (let i = 0; i < 16; i++) {
            const a = a0 + (a1 - a0) * Rg.range(0.3, 1), [x, y] = onArc(A, A.R, a);
            const ox = x - A.cx, oy = y - A.cy, l = Math.hypot(ox, oy) || 1, sp = Rg.range(30, 100);
            ps.spawn(P.MOTE, x, y, ox / l * sp, oy / l * sp - 10, Rg.range(0.25, 0.55), C[4 + Rg.int(0, 1)], 0.6);
          }
        }
        ps.update(dt);
      },
      draw(p) {
        drawSlash(p, E, t);
        drawSlash(p, A, t);
        const g = t - A.sweep * 0.6;
        if (g > 0 && g < 0.22) sparkle(p, tip.x, tip.y, 9 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.22), C[5], C[3], 0.6);
        if (t < 0.3) {
          const [x, y] = onArc(A, A.R - 4, A.a0 + (A.a1 - A.a0) * ease.outExpo(clamp(t / A.sweep)));
          p.glow(x, y, 40, C[3], 0.5 * (1 - t / 0.3));
        }
        ps.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/melee/double-slash.js
  var double_slash_exports = {};
  __export(double_slash_exports, {
    act: () => act4,
    create: () => create5,
    meta: () => meta6
  });
  var meta6 = {
    name: "Double slash",
    desc: "A down cut, then an up cut that crosses it: the moment the X closes both strokes flash white, the crossing bursts with light and sparks, and a dotted X lingers.",
    tags: ["melee", "slash", "combo", "sword", "cross", "combat", "directional", "one-shot"],
    size: [164, 108],
    origin: [44, 92],
    duration: 0.8,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a0a22", "#5e1238", "#a01f4e", "#e0386a", "#ff86a6", "#ffd2dd", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      seed: 6
    }
  };
  var STANCE = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
  var HIGH = { ...STANCE, x: -7, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -8 };
  var LOW = { ...STANCE, x: 3, crouch: 6, lean: 6, fx: 22, fy: -20, sa: 0.62, bx: -8, by: -24, ffx: 13, fbx: -10, toeB: true };
  var act4 = {
    target: { x: 62 },
    poses: [
      [-0.42, { ...STANCE, x: -7 }],
      [-0.18, HIGH],
      [-0.04, { ...HIGH, crouch: 5 }],
      [0, { ...STANCE, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -9, ghost: 1 }, "snap"],
      [0.06, LOW, "snap"],
      [0.14, { ...LOW, x: 4, crouch: 6, lean: 5, fx: 20, fy: -17, sa: 0.85, ghost: 1 }],
      [0.17, { ...LOW, x: 5, crouch: 3, lean: 5, fx: 22, fy: -28, sa: 0.1, by: -18, toeB: true, ghost: 1 }, "snap"],
      [0.21, { ...LOW, x: 6, crouch: 1, lean: 6, fx: 19, fy: -37, sa: -0.95, by: -18, ffx: 13, fby: -6 }, "snap"],
      [0.5, { ...LOW, x: 6, crouch: 3, lean: 3, fx: 18, fy: -36, sa: -1.05, by: -19, ffx: 12 }],
      [0.92, { ...STANCE, x: -7 }]
    ],
    hits: [
      { t: 0.06, stop: 0.05, shake: 0.08, amp: 1, push: 1.4, straw: 8 },
      { t: 0.16, stop: 0.14, shake: 0.2, amp: 2, push: 2.8, straw: 18, y: -28 }
    ],
    dust: [{ t: 0.06, x: 16, n: 5, dir: 1 }, { t: 0.17, x: -8, n: 4, dir: -1 }]
  };
  var UP = 0.14;
  var R0 = 62;
  var cut = (x, y, th, dir, span, extra) => through(x, y, th, dir, R0, span, 0.55, extra);
  function create5(o) {
    const C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights();
    const X = 34, Y = -23;
    const down = cut(X, Y, 0.72, 1, 0.84, { W: 10, t0: 0, sweep: 0.06, hold: 0.07, trail: 0.24, ramp: C, lens: true });
    const up = cut(X, Y, -0.66, -1, 0.84, { W: 11, t0: UP, sweep: 0.06, hold: 0.06, trail: 0.26, ramp: C, lens: true });
    const ends = [slashEnd(down), slashEnd(up)], slivers = [-2.4, -1.1, 0.2, 1.6].map((a) => ({ a: a + Rg.range(-0.2, 0.2), r: Rg.range(5, 8), v: Rg.range(70, 120), arc: Rg.range(0.4, 0.7) }));
    const CLOSE2 = UP + 0.012;
    let t = 0, cut1 = false, cut2 = false, closed = false;
    return {
      update(dt) {
        t += dt;
        if (!cut1 && t >= down.sweep) {
          cut1 = true;
          shavings(ps, Rg, down, 10, [C[4], C[5]]);
          for (let i = 0; i < 6; i++) {
            const a = Math.atan2(ends[0].dy, ends[0].dx) + Rg.range(-0.5, 0.5), sp = Rg.range(120, 300);
            ps.spawn(P.SPARK, ends[0].x, ends[0].y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.3));
          }
        }
        if (!closed && t >= CLOSE2) {
          closed = true;
          lights.add(X, Y, 56, C[3], 0.45, 0.4);
          lights.add(X, Y, 18, WHITE, 0.6, 0.08);
          for (let i = 0; i < 18; i++) {
            const a = Rg.range(-Math.PI, Math.PI) * 0.8, sp = Rg.range(140, 360);
            ps.spawn(P.SPARK, X, Y, Math.cos(a) * sp, Math.sin(a) * sp - 40, Rg.range(0.14, 0.4));
          }
          for (let i = 0; i < 5; i++) ps.spawn(P.STAR, X + Rg.range(-14, 14), Y + Rg.range(-12, 12), 0, -4, Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1, 2.2), Rg.range(0.05, 0.2));
        }
        if (!cut2 && t >= UP + up.sweep) {
          cut2 = true;
          shavings(ps, Rg, up, 12, [C[4], C[5]]);
        }
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        const flash = t >= CLOSE2 && t < CLOSE2 + 0.07 ? 1 : 0;
        down.hot = up.hot = flash;
        slash(p, down, t);
        slash(p, up, t);
        for (const [s, e] of [[down, ends[0]], [up, ends[1]]]) {
          const g = t - s.t0 - s.sweep * 0.6;
          if (g > 0 && g < 0.2) sparkle(p, e.x, e.y, 7 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.2), C[5], C[3], 0.5);
        }
        const q = t - CLOSE2;
        if (q >= 0 && q < 0.26) {
          const k = q / 0.26;
          flare(p, X, Y, 22 * Math.pow(1 - k, 1.4), 1 - k, C);
          p.glow(X, Y, 34, C[4], 0.35 * (1 - k));
        }
        if (q >= 0.03 && q < 0.15) {
          const k = (q - 0.03) / 0.12;
          for (const s of slivers) sliver(p, X, Y, s.a, s.r + s.v * (q - 0.03), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : k < 0.7 ? C[5] : C[4], 1 - k);
        }
        for (const s of [down, up]) {
          const u = t - s.t0;
          if (u <= 0 || u >= 0.25) continue;
          const e = slashEnd({ ...s, span: s.span * ease.outExpo(clamp(u / s.sweep)) });
          p.glow(e.x, e.y, 40, C[3], 0.5 * (1 - u / 0.25));
        }
        ps.draw(p);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/melee/scythe-reap.js
  var scythe_reap_exports = {};
  __export(scythe_reap_exports, {
    act: () => act5,
    create: () => create6,
    meta: () => meta7
  });
  var meta7 = {
    name: "Scythe reap",
    desc: "A slow, huge dark crescent reaps round the front with a pale ghostly edge; it hangs, then tears away from the tail into curling wisps and cold vapour.",
    tags: ["melee", "scythe", "reap", "dark", "ghost", "death", "slash", "combat", "one-shot"],
    size: [184, 116],
    origin: [84, 98],
    duration: 2.1,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#07040c", "#140a22", "#24113a", "#3b1d58", "#5a3a82", "#7fd6c0", "#d8fff2", "#ffffff"],
      seed: 13
    }
  };
  var REST_2 = { ...READY, weapon: "scythe", x: 2, sa: -1.5, fx: 11, fy: -22, bx: 7, by: -16 };
  var OUT_ = { ...REST_2, two: true, crouch: 4, lean: 4, fx: 17, fy: -27, sa: -0.45, ffx: 11, fbx: -8 };
  var END = { ...REST_2, two: true, x: 0, yaw: 3.14, crouch: 6, lean: 4, fx: 15, fy: -24, sa: 0.3, ffx: 11, fbx: -10, toeB: true };
  var act5 = {
    target: { x: 66 },
    poses: [
      [-0.56, REST_2],
      [-0.26, OUT_],
      [0.08, { ...OUT_, crouch: 5 }],
      [0.2, { ...OUT_, yaw: 0.8, crouch: 5, lean: 3, fx: 16, fy: -23, sa: 0.1, ghost: 1 }],
      [0.3, { ...OUT_, x: 1, yaw: 1.9, crouch: 6, lean: 3, fx: 15, fy: -23, sa: 0.2, ghost: 1 }],
      [0.42, END],
      [0.92, { ...END, crouch: 5 }],
      [1.3, { ...REST_2, x: 1, yaw: 1.4, crouch: 4 }],
      [1.7, REST_2]
    ],
    hits: [{ t: 0.14, stop: 0.12, shake: 0.16, amp: 2, push: 2.4, straw: 20, skin: "shadow" }],
    dust: [{ t: 0.3, x: 2, n: 6 }]
  };
  var WIND2 = 0.08;
  var SWEEP = 0.34;
  var HANG = 0.14;
  var TEAR = 0.55;
  var T0 = WIND2;
  var T1 = WIND2 + SWEEP;
  var T2 = T1 + HANG;
  var T3 = T2 + TEAR;
  var head2 = (t) => ease.inOutSine(clamp((t - T0) / SWEEP));
  function create6(o) {
    const C = fit(o.palette, 8), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, haze: C[5] }), lights = new Lights();
    const A = swing({ cx: 8, cy: -33, R: 52, sy: 0.6, k: 0.1, rot: 0.08, a0: -0.5, dir: 1, span: 3.5 });
    const W = 21;
    const wisps = [];
    let t = 0, lastTear = 0;
    const tear = () => smooth(T2, T3, t);
    const addWisp = (x, y, far) => wisps.push({ x, y, vx: Rg.range(-12, 12), vy: -Rg.range(8, 26), life: Rg.range(0.5, 0.9), max: 0, seed: Rg.range(0, 100), pts: [], far });
    return {
      update(dt) {
        t += dt;
        if (t < WIND2 && Rg.chance(0.5)) {
          const [x, y] = onSwing(A, A.R - 4, 0);
          ps.spawn(P.VAPOUR, x + Rg.range(-14, 14), y + Rg.range(-8, 8), Rg.range(-10, 10), Rg.range(-6, 6), Rg.range(0.3, 0.5), C[5], Rg.range(1.5, 2.5));
        }
        if (t > T0 && t < T1 && Rg.chance(0.5)) {
          const tr = travel(A, A.span * head2(t) * Rg.range(0.75, 1));
          ps.spawn(P.VAPOUR, tr.x, tr.y, tr.dx * 20, -Rg.range(4, 14), Rg.range(0.5, 0.9), C[6], Rg.range(2, 3.5), 0, Math.sin(tr.a) < 0 ? PF.BACK : 0);
        }
        const k = tear();
        for (let u = lastTear; u < k * 1.15; u += 0.022) {
          const uu = Math.min(1, u) * A.span, tr = travel({ ...A, R: A.R - Rg.range(0, 8) }, uu), far = Math.sin(tr.a) < 0;
          addWisp(tr.x, tr.y, far);
          if (Rg.chance(0.5)) ps.spawn(P.VAPOUR, tr.x, tr.y, Rg.range(-10, 10), -Rg.range(6, 18), Rg.range(0.55, 0.85), Rg.chance(0.5) ? C[5] : C[4], Rg.range(2.5, 4.5), 0, far ? PF.BACK : 0);
          if (Rg.chance(0.2)) ps.spawn(P.STAR, tr.x + Rg.range(-3, 3), tr.y + Rg.range(-3, 3), 0, -6, Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[6] : WHITE, Rg.range(0.6, 1.6), 0, far ? PF.BACK : 0);
        }
        lastTear = Math.max(lastTear, k * 1.15);
        for (let i = wisps.length - 1; i >= 0; i--) {
          const w = wisps[i];
          w.max += dt;
          if (w.max > w.life) {
            wisps.splice(i, 1);
            continue;
          }
          w.vy -= 30 * dt;
          w.vx += Math.sin(w.max * 9 + w.seed) * 120 * dt;
          w.vx -= w.vx * 2 * dt;
          w.vy -= w.vy * 1.2 * dt;
          w.x += w.vx * dt;
          w.y += w.vy * dt;
          w.pts.push([w.x, w.y]);
          if (w.pts.length > 14) w.pts.shift();
        }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        this.blade(p, -1);
        ps.draw(p, "back");
        this.threads(p, true);
      },
      draw(p) {
        this.blade(p, 1);
        if (t < WIND2 + 0.05) {
          const [x, y] = onSwing(A, A.R - 3, 0);
          sparkle(p, x, y, 6 * Math.min(1, t / 0.04) * (1 - smooth(WIND2 - 0.02, WIND2 + 0.05, t)), C[6], C[5], 0.45);
        }
        const g = t - T1 + 0.06;
        if (g > 0 && g < 0.3) {
          const [x, y] = onSwing(A, A.R - 3, A.span);
          sparkle(p, x, y, 9 * ease.outBack(Math.min(1, g / 0.06)) * (1 - g / 0.3), C[6], C[5], 0.55);
        }
        ps.draw(p, "front");
        this.threads(p, false);
        lights.draw(p);
      },
      blade(p, half) {
        const U = A.span * head2(t), k = tear();
        if (U < 0.02 || k >= 1) return;
        const ramp2 = half < 0 ? [C[0], C[0], C[1], C[2], C[3], C[4], C[5], C[6]] : C;
        smear(p, A, 0, U, W, (u, r, out, a) => {
          const v = u / U, w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 1.7)), 0.55);
          if (w < 0.5) return;
          const q = (A.R - r) / w;
          if (q < 0 || q > 1) return;
          const n = rand(Math.floor(u * 40), Math.floor(r), 7);
          if (k > 0 && u / A.span < k * 1.2 - n * 0.2) return;
          const ci = q < 0.08 ? 7 : q < 0.16 ? 6 : q < 0.25 ? 5 : q < 0.4 ? 4 : q < 0.62 ? 3 : 2;
          out.c = ramp2[t > T1 && q < 0.2 ? ci - 1 : ci];
          out.a = Math.min(1, v / 0.25);
        }, half);
        glowAlong(p, A, A.R - 2, Math.max(0, k * 1.2 * A.span - 0.3), U, 14, C[5], (u) => 0.3 * (u / U), half, 0.25);
      },
      threads(p, back) {
        for (const w of wisps) {
          if (w.far !== back) continue;
          const life = 1 - w.max / w.life;
          for (let i = 1; i < w.pts.length; i++) {
            const f = i / w.pts.length;
            p.line(w.pts[i - 1][0], w.pts[i - 1][1], w.pts[i][0], w.pts[i][1], f > 0.75 ? C[6] : f > 0.4 ? C[5] : C[3], life * (0.3 + 0.7 * f));
          }
          if (life > 0.5) p.glow(w.x, w.y, 5, C[5], 0.25 * life);
        }
      }
    };
  }

  // vendor/pixelfx/src/fx/melee/uppercut.js
  var uppercut_exports = {};
  __export(uppercut_exports, {
    act: () => act6,
    create: () => create7,
    meta: () => meta8
  });
  var meta8 = {
    name: "Uppercut",
    desc: "A crescent rises from the floor past the face, and at the top a comic impact star bursts: bold outline, hot core, burst lines, twinkles and sparks.",
    tags: ["melee", "uppercut", "punch", "rising", "launcher", "comic", "combat", "directional", "one-shot"],
    size: [132, 128],
    origin: [48, 110],
    duration: 0.85,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#3a1408", "#7a2a10", "#c4501a", "#f08a2a", "#ffc94a", "#fff2a8", "#ffffff"],
      outline: "#2a0a08",
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      seed: 11
    }
  };
  var FISTS = { ...READY, fx: 12, fy: -25, bx: 9, by: -27, crouch: 3, lean: 1 };
  var COIL = { ...FISTS, crouch: 7, lean: 3, fx: 8, fy: -11, bx: 8, by: -27, ffx: 10, fbx: -9 };
  var TOP = { ...FISTS, x: 1, y: -11, crouch: -1, lean: 2, fx: 12, fy: -42, bx: -6, by: -21, ffx: 8, ffy: -8, fbx: -3, fby: -2, toeB: true, ghost: 1 };
  var act6 = {
    target: { x: 44 },
    poses: [
      [-0.42, FISTS],
      [-0.16, COIL],
      [0, { ...COIL, crouch: 8 }],
      [0.03, { ...FISTS, y: -4, crouch: 1, lean: 4, fx: 18, fy: -27, bx: -5, by: -23, ffx: 9, fbx: -7, toeB: true, ghost: 1 }, "snap"],
      [0.076, TOP, "snap"],
      [0.3, { ...TOP, y: -13, ghost: void 0 }],
      [0.56, { ...TOP, y: 0, crouch: 2, fx: 13, fy: -31, ffx: 7, ffy: -6, fbx: -5, fby: -5, ghost: void 0 }, "in"],
      [0.6, { ...FISTS, y: 0, crouch: 7, lean: 3, fx: 12, fy: -14, bx: -6, by: -16, ffx: 10, fbx: -9 }, "snap"],
      [0.98, FISTS]
    ],
    hits: [{ t: 0.076, stop: 0.13, shake: 0.18, amp: 2, push: -2.6, straw: 18, y: -34 }],
    dust: [{ t: 0.03, x: 8, n: 6 }, { t: 0.6, x: 0, n: 6 }]
  };
  function create7(o) {
    const C = fit(o.palette, 7), INK3 = hex(o.outline), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights();
    const A = swing({ cx: 8, cy: -25, R: 27, sy: 1, rot: 0, a0: 1.08, dir: -1, span: 2.5, W: 13, t0: 0.02, sweep: 0.07, hold: 0.05, trail: 0.22, ramp: C });
    const top = slashEnd(A), SX = top.x + 3, SY2 = top.y - 5, HIT3 = A.t0 + A.sweep * 0.8;
    const spikes2 = Array.from({ length: 10 }, (_, i) => ({ a: i / 10 * TAU + Rg.range(-0.12, 0.12) - Math.PI / 2, len: (i % 2 ? 7 : 13) + Rg.range(0, 4), w: i % 2 ? 2.2 : 3 }));
    const bursts = Array.from({ length: 8 }, (_, i) => ({ a: i / 8 * TAU + 0.2 + Rg.range(-0.15, 0.15), r0: Rg.range(15, 18), L: Rg.range(5, 9) }));
    let t = 0, hit = false, kicked = false;
    return {
      update(dt) {
        t += dt;
        if (!kicked) {
          kicked = true;
          for (let i = 0; i < 4; i++) ps.spawn(P.DUST, 18 + Rg.range(-4, 4), -1, Rg.range(-30, 30), -Rg.range(5, 20), Rg.range(0.3, 0.55), "#6a6080", Rg.range(1.5, 2.6));
        }
        if (!hit && t >= HIT3) {
          hit = true;
          lights.add(SX, SY2, 56, C[4], 0.6, 0.4);
          lights.add(SX, SY2, 18, WHITE, 0.7, 0.08);
          for (let i = 0; i < 16; i++) {
            const a = -Math.PI / 2 + Rg.range(-1.6, 1.6), sp = Rg.range(120, 320);
            ps.spawn(P.SPARK, SX, SY2, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.15, 0.45));
          }
          for (let i = 0; i < 6; i++) {
            const a = Rg.range(0, TAU), d = Rg.range(14, 24);
            ps.spawn(P.STAR, SX + Math.cos(a) * d, SY2 + Math.sin(a) * d, Math.cos(a) * 20, Math.sin(a) * 20 - 10, Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1.4, 2.6), Rg.range(0.04, 0.18));
          }
        }
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        slash(p, A, t);
        const u = t - A.t0;
        if (u > 0 && u < 0.16)
          for (const [dx, y0, L] of [[A.cx + A.R + 7, -16, 18], [A.cx + A.R + 11, -30, 12], [A.cx - 4, -40, 10]]) {
            const k = u / 0.16, y = y0 - 30 * k;
            for (let d = 0; d < L; d += 1) p.dot(dx, y + d, d < 3 ? WHITE : d < L * 0.5 ? C[5] : C[3], (1 - d / L) * (1 - k));
          }
        if (u > 0 && u < A.sweep + 0.06) {
          const [x, y] = onSwing(A, A.R - 5, A.span * ease.outExpo(clamp(u / A.sweep)));
          p.glow(x, y, 34, C[3], 0.45 * (1 - u / (A.sweep + 0.06)));
        }
        const q = t - HIT3;
        if (q >= 0 && q < 0.36) {
          const pop = ease.outBack(clamp(q / 0.05), 2.6), out = 1 - smooth(0.16, 0.36, q), sc = pop * (0.35 + 0.65 * out), turn = q * 1.2;
          const sp = spikes2.map((s) => ({ ...s, a: s.a + turn }));
          if (sc > 0.08) {
            star(p, SX, SY2, sp, sc * 1.12, 1, INK3, INK3, INK3, INK3);
            star(p, SX, SY2, sp, sc, 1, q < 0.05 ? WHITE : C[6], C[4], C[3], C[2]);
          }
          p.glow(SX, SY2, 30, C[4], 0.45 * out);
        }
        if (q >= 0.02 && q < 0.24) {
          const k = (q - 0.02) / 0.22, r = 7 + 17 * ease.outCubic(k), th = Math.max(1, 2.2 * (1 - k)), col = k < 0.25 ? WHITE : k < 0.5 ? C[5] : k < 0.75 ? C[4] : C[3];
          for (let a = 0; a < TAU; a += 0.6 / r) for (let o2 = 0; o2 < th; o2 += 0.5) p.dot(SX + Math.cos(a) * (r - o2), SY2 + Math.sin(a) * (r - o2), col, 1.15 - k);
        }
        if (q >= 0.02 && q < 0.2) {
          const k = (q - 0.02) / 0.18;
          for (const b of bursts) {
            const r0 = b.r0 + 10 * ease.outCubic(k), ca = Math.cos(b.a), sa = Math.sin(b.a);
            p.line(SX + ca * r0, SY2 + sa * r0, SX + ca * (r0 + b.L * (1 - k)), SY2 + sa * (r0 + b.L * (1 - k)), k < 0.4 ? WHITE : C[5], 1.1 - k);
          }
        }
        ps.draw(p);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/melee/hammer-smash.js
  var hammer_smash_exports = {};
  __export(hammer_smash_exports, {
    act: () => act7,
    create: () => create8,
    meta: () => meta9
  });
  var meta9 = {
    name: "Hammer smash",
    desc: "A hammer drops in front in a wedge of motion: a white slam with rays, a dome of force, a dent with cracks, rocks thrown up that bounce and settle, and dust.",
    tags: ["melee", "smash", "hammer", "heavy", "ground", "shockwave", "debris", "combat", "directional", "one-shot"],
    size: [208, 112],
    origin: [80, 92],
    duration: 2,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#141834", "#242c5c", "#38479a", "#5a72d0", "#8fa8f0", "#c4d4ff", "#eef3ff", "#ffffff"],
      stone: "#4a3f69",
      seed: 9
    }
  };
  var REST_3 = { ...READY, weapon: "hammer", two: true, sa: 0.62, fx: 11, fy: -21, crouch: 3 };
  var TOP2 = { ...REST_3, x: -3, crouch: 0, lean: -3, fx: 3, fy: -41, sa: -2.1, ffx: 8, ffy: -8, fbx: -5, toeB: true };
  var SLAM = { ...REST_3, x: -1, crouch: 7, lean: 6, fx: 14, fy: -19, sa: 0.62, ffx: 11, fbx: -10 };
  var act7 = {
    target: { x: 66 },
    poses: [
      [-0.72, { ...REST_3, x: -3 }],
      [-0.44, { ...REST_3, x: -3, crouch: 5, lean: -1, fx: 16, fy: -28, sa: -0.9 }],
      [-0.2, TOP2],
      [-0.03, { ...TOP2, y: -2 }],
      [0.06, { ...REST_3, x: 0, y: -3, crouch: -1, lean: 2, fx: 13, fy: -41, sa: -1.2, ffx: 11, ffy: -8, ghost: 1 }, "snap"],
      [0.11, { ...REST_3, x: 0, y: -1, crouch: 3, lean: 5, fx: 19, fy: -30, sa: -0.15, ffx: 13, ghost: 1 }, "snap"],
      [0.15, SLAM, "snap"],
      [0.62, { ...SLAM, crouch: 6, lean: 5 }],
      [1.02, { ...REST_3, x: -2, crouch: 5, lean: 2, fx: 14, fy: -24, sa: 0.3 }],
      [1.4, { ...REST_3, x: -3 }]
    ],
    hits: [{ t: 0.15, stop: 0.2, shake: 0.34, amp: 3, push: 3, straw: 26, y: -8 }],
    dust: [{ t: 0.15, x: 10, n: 8 }, { t: 0.15, x: -12, n: 5, dir: -1 }]
  };
  var SOOT3 = hex("#0d0a12");
  var HOT2 = ["#fff3a6", "#ffc23d", "#ff8a2a", "#c9281f"].map(hex);
  var DROP = 0.15;
  var head3 = (t) => {
    const x = clamp((t + 0.03) / (DROP + 0.03));
    return 0.28 * x + 0.72 * x * x;
  };
  function create8(o) {
    const C = fit(o.palette, 8), n = C.length, R = new Rng(o.seed), st = stone(o.stone), floor = () => 0;
    const ps = new Particles({ rng: R, ground: floor }), bits = new Bits({ ground: floor }), chips = new Bits({ ground: floor }), lights = new Lights();
    const A = swing({ cx: 5, cy: -25, R: 32, sy: 1, rot: 0, a0: -2.25, dir: 1 });
    let U1 = 0;
    while (onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4) U1 += 5e-3;
    const HW = 13, [X] = onSwing(A, A.R - HW / 2, U1);
    const lines = cracks(R, X, 5, 24, 6, 0);
    const rays = [-0.95, -0.6, -0.3, -0.05, 0.22, 0.5, 0.85].map((d, i) => ({ a: -Math.PI / 2 + d + R.range(-0.06, 0.06), L: (i === 3 ? 34 : i === 2 || i === 4 ? 26 : i === 1 || i === 5 ? 18 : 12) * R.range(0.9, 1.1) }));
    let t = 0, hit = false;
    const Rm = A.R - HW / 2;
    const wedge = (p) => {
      const h = head3(t), U = U1 * h, after = smooth(DROP, DROP + 0.07, t), lagU = Math.max(0, U - (0.3 + 1.05 * h)), T = lagU + (U - lagU) * after * 0.8;
      if (U - T < 0.03 || after >= 1) return;
      const len2 = (U - T) * Rm;
      smear(p, A, T, U, HW + 1, (u, r, out) => {
        const lead = (U - u) * Rm, f = lead / len2, w = HW * (lead < 3 ? 1 : Math.pow(1 - (lead - 3) / Math.max(1, len2 - 3), 0.85)) * (1 - after * 0.5);
        const off = (r - Rm) / (w / 2 + 0.01);
        if (w < 0.6 || Math.abs(off) > 1) return;
        let ci = lead < 2 ? 0 : Math.round(1 + f * 3.4 + Math.abs(off) * 1.4 - (off > 0.55 ? 1 : 0) + after * 3);
        if (ci > n - 3) return;
        out.c = C[n - 1 - Math.max(0, ci)];
      });
      if (after < 0.6)
        for (const [dr, l0, L] of [[-HW / 2 - 2, 3, 26], [-HW / 2 - 5, 9, 16], [HW / 2 + 2, 2, 30], [HW / 2 + 5, 8, 18], [-1, len2 + 2, 14], [3, len2 + 4, 9]]) {
          const r = Rm + dr;
          for (let d = l0; d < l0 + L * (1 - after); d += 0.5) {
            const u = U - d / r, k = (d - l0) / L;
            if (u < 0) break;
            p.dot(...onSwing(A, r, u), k < 0.25 ? C[6] : k < 0.6 ? C[5] : C[4], (1 - k) * (1 - after));
          }
        }
      const [hx, hy] = onSwing(A, Rm, U);
      p.glow(hx, hy, 34, C[4], 0.5 * (1 - smooth(DROP - 0.03, DROP, t)));
    };
    return {
      update(dt) {
        t += dt;
        if (!hit && t >= DROP) {
          hit = true;
          lights.add(X, -5, 16, WHITE, 0.35, 0.08);
          lights.add(X, -10, 64, C[4], 0.42, 0.6);
          for (let i = 0; i < 15; i++) {
            const s = R.sign();
            bits.add({ kind: B.CHUNK, x: X + s * R.range(0, 5), y: -2, vx: s * R.range(20, 105), vy: -R.range(110, 300), g: 1, drag: 0.35, bounce: 0.38, life: R.range(1.25, 1.65), a: R.range(0, TAU), va: R.range(-16, 16), s: R.pick([1, 1, 2, 2, 3]) });
          }
          for (let i = 0; i < 11; i++) {
            const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(90, 230);
            chips.add({ kind: B.SHARD, x: X + R.range(-4, 4), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.9, drag: 0.5, bounce: 0.35, life: R.range(0.9, 1.5), s: 1 });
          }
          for (let i = 0; i < 40; i++) {
            const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(50, 210);
            ps.spawn(P.GRIT, X + R.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.9, 1.5), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.4) ? 2 : 1);
          }
          for (let i = 0; i < 14; i++) {
            const s = i % 2 ? -1 : 1, sp = R.range(120, 260);
            ps.spawn(P.MOTE, X + s * 6, -R.range(1, 4), s * sp, -R.range(0, 30), R.range(0.18, 0.34), R.chance(0.5) ? C[6] : C[5], 0.8, R.range(0.02, 0.05));
          }
          for (let i = 0; i < 24; i++) {
            const a = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(150, 380);
            ps.spawn(P.SPARK, X + Math.cos(a) * 6, -2 + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.12, 0.42), 0, 1, R.range(0.035, 0.08));
          }
          for (let i = 0; i < 20; i++) {
            const s = i % 2 ? -1 : 1;
            ps.spawn(P.SMOKE, X + s * R.range(2, 10), -R.range(2, 7), s * R.range(40, 125), -R.range(2, 14), R.range(0.95, 1.5), st.dust, R.range(6, 9), R.range(0.02, 0.08), PF.BIG);
          }
          for (let i = 0; i < 7; i++) ps.spawn(P.SMOKE, X + R.range(-6, 6), -R.range(3, 9), R.range(-20, 20), -R.range(30, 80), R.range(1, 1.4), st.dust, R.range(5, 7.5), R.range(0.04, 0.14), PF.BIG);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R.range(-6, 6), -R.range(1, 4), R.range(-70, 70), -R.range(8, 30), R.range(0.35, 0.7), st.dust, R.range(2, 3.5));
        }
        bits.update(dt);
        chips.update(dt);
        if (hit && t > DROP + 0.4 && t < DROP + 1.2 && R.chance(0.08)) {
          const b = R.pick(bits.list);
          if (b && b.rest) ps.spawn(P.STAR, b.x + R.range(-1, 1), b.y - 1.5 - b.s, 0, -2, R.range(0.25, 0.45), R.chance(0.5) ? HOT2[0] : WHITE, R.range(0.6, 1.6));
        }
        for (const b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = true;
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 35), -R.range(2, 14), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.6));
          }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        const q = t - DROP;
        if (q >= 0) {
          const fade = 1 - smooth(1.3, 1.7, q);
          for (let x = -11; x <= 11; x++) {
            const u = x / 10, d = Math.abs(x) > 10 ? 0 : Math.round(3.2 * (1 - u * u) + (rand(x, 4) - 0.5) * 0.8);
            for (let y = 0; y < d; y++) p.dot(X + x, y, y === 0 ? SOOT3 : st.dark, fade);
            if (d > 0) p.dot(X + x, d, Math.abs(x) < 7 ? st.light : st.body, fade);
            if (Math.abs(x) >= 8) p.dot(X + x, -1, Math.abs(x) >= 10 ? st.body : st.light, fade);
            if (Math.abs(x) === 9 && rand(x, 7) < 0.7) p.dot(X + x, -2, st.body, fade);
          }
          const k = q / 0.5;
          if (k < 1) band(p, X, 0.5, 6 + 50 * ease.outCubic(k), 0.16, Math.max(1, 2 * (1 - k)), 1.15 - k, [st.body, C[3], C[5], C[7]], (g) => Math.sin(g) < 0);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        const q = t - DROP;
        wedge(p);
        if (q >= 0) {
          const fade = 1 - smooth(1.3, 1.7, q);
          for (const c of lines) {
            const reach2 = 30 * ease.outCubic(clamp((q - c.at * 0.06) / 0.08)) * (c.fork ? 0.3 : 1);
            if (reach2 > 0)
              along(c.pts, reach2, (x0, y0, x1, y1) => {
                if (q >= 0.12) p.line(x0, y0 + 3, x1, y1 + 3, st.shade, fade);
                p.line(x0, y0 + 2, x1, y1 + 2, q < 0.05 ? WHITE : q < 0.12 ? C[5] : SOOT3, fade);
              });
          }
          const k = q / 0.5;
          if (k < 1) band(p, X, 0.5, 6 + 50 * ease.outCubic(k), 0.16, Math.max(1, 2 * (1 - k)), 1.15 - k, [st.body, C[3], C[5], C[7]], (g) => Math.sin(g) >= 0);
          const d = (q - 0.045) / 0.4;
          if (d >= 0 && d < 1) {
            const r = 12 + 30 * ease.outCubic(d), th = Math.max(1, 3.6 * Math.pow(1 - d, 0.8)), a = d < 0.6 ? 1 : (1 - d) / 0.4;
            p.shade(X - r - 1, -r - 1, X + r + 1, 0, (x, y, out) => {
              const e = r - Math.hypot(x - X, y);
              if (e < 0 || e > th || y > -0.5) return;
              const v = e / th;
              out.c = d < 0.1 ? v < 0.6 ? WHITE : C[6] : v < 0.34 ? d < 0.45 ? WHITE : C[6] : v < 0.67 ? C[5] : C[4];
              out.a = a;
            });
            for (let i = 0; i < 7; i++) {
              const g = -Math.PI * (0.08 + i / 6 * 0.84);
              p.glow(X + Math.cos(g) * r, Math.sin(g) * r, 14, C[4], 0.36 * (1 - d));
            }
          }
          if (q < 0.2)
            for (const ry of rays) {
              const d1 = ry.L * ease.outCubic(Math.min(1, q / 0.05)), d0 = ry.L * smooth(0.04, 0.2, q), ca = Math.cos(ry.a), sa = Math.sin(ry.a);
              if (d1 - d0 < 1) continue;
              p.line(X + ca * (2 + d0), -1 + sa * (2 + d0), X + ca * d1, -1 + sa * d1, (u) => u < 0.5 ? WHITE : u < 0.8 ? C[6] : C[5]);
              p.glowLine(X + ca * d0, -1 + sa * d0, X + ca * d1, -1 + sa * d1, 4, C[5], 0.18 * (1 - q / 0.2));
            }
          if (q < 0.07) {
            const hot = q < 0.035, rx = hot ? 16 : 12, ry = hot ? 3 : 2;
            p.ellipse(X, 0, rx + 2, ry + 1, hot ? C[6] : C[5]);
            p.ellipse(X, 0, rx, ry, hot ? WHITE : C[7]);
          }
          if (q < 0.2) {
            const pop = Math.exp(-q / 0.05);
            p.glow(X, -5, 26, C[5], 0.3 * pop);
          }
          p.glow(X, -1, 16, HOT2[2], 0.28 * Math.exp(-q / 0.35));
        }
        for (const b of bits.list) rock(p, b, st);
        for (const b of chips.list) {
          const k = b.life / b.max, c = k > 0.7 ? HOT2[0] : k > 0.45 ? HOT2[1] : k > 0.25 ? HOT2[2] : HOT2[3];
          p.dot(b.x, b.y, c, Math.min(1, k * 4));
          if (!b.rest) p.dot(b.x - b.vx * 0.012, b.y - b.vy * 0.012, HOT2[3], Math.min(1, k * 4));
          p.glow(b.x, b.y, 4, c, 0.35 * k);
        }
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/impacts/hit-spark.js
  var hit_spark_exports = {};
  __export(hit_spark_exports, {
    create: () => create9,
    meta: () => meta10
  });
  var meta10 = {
    name: "Hit spark",
    desc: "The everyday hit: a sharp, lopsided cross flare with one long ray along the blow round a white diamond core, then a cone of sparks and hot chips that fall and bounce.",
    tags: ["impact", "hit", "spark", "combat", "directional", "one-shot"],
    size: [136, 80],
    origin: [44, 64],
    duration: 0.5,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffe26b", "#fff3a6", "#ffffff"], height: 20, aim: 0.1, seed: 4 }
  };
  function ray(p, x, y, a, L, w, C, from = 0) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let d = from * L; d <= L; d += 0.5) {
      const u = d / L, hw = w * Math.pow(1 - u, 1.6);
      const col = u < 0.3 ? WHITE : u < 0.62 ? C[5] : u < 0.88 ? C[4] : C[3];
      p.px(x + c * d, y + s * d, col);
      if (hw > 0.45) for (let o = 0.5; o <= hw; o += 0.5) for (const e of [-o, o]) p.px(x + c * d - s * e, y + s * d + c * e, u < 0.3 && o < 1 ? C[5] : C[4]);
    }
  }
  function diamond(p, x, y, r, C) {
    for (let dy = -r - 1; dy <= r + 1; dy++)
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        const m = Math.abs(dx) + Math.abs(dy);
        if (m <= r) p.px(x + dx, y + dy, WHITE);
        else if (m === r + 1) p.px(x + dx, y + dy, C[3]);
      }
  }
  function create9(o) {
    const C = fit(o.palette, 7), R = new Rng(o.seed), X = 0, Y = -o.height, A = o.aim, floor = () => 0;
    const ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[2]] });
    const lights = new Lights();
    const tilt = R.range(-0.08, 0.08);
    const rays = [
      { a: A + tilt, L: R.range(33, 37), w: 2.2 },
      { a: A + Math.PI + tilt, L: R.range(8, 10), w: 2.2 },
      { a: A - Math.PI / 2 + tilt, L: R.range(15, 18), w: 2.6 },
      { a: A + Math.PI / 2 + tilt, L: R.range(10, 12), w: 2.3 },
      { a: A - Math.PI / 4 + tilt, L: R.range(5, 7), w: 1 }
    ];
    lights.add(X, Y, 38, C[4], 0.35, 0.18);
    lights.add(X + Math.cos(A) * 10, Y + Math.sin(A) * 10, 22, C[5], 0.45, 0.1);
    lights.add(X, -2, 26, C[3], 0.22, 0.22);
    for (let i = 0; i < 9; i++) {
      const a = A + R.range(-0.6, 0.6) - 0.15, v = R.range(170, 360);
      ps.spawn(P.SPARK, X + 1, Y, Math.cos(a) * v, Math.sin(a) * v - 40, R.range(0.25, 0.45), WHITE, 1, i > 6 ? R.range(0.01, 0.03) : 0);
    }
    for (let i = 0; i < 6; i++) {
      const a = A + R.range(-1.1, 0.5) - 0.3, v = R.range(70, 170);
      ps.spawn(P.GRIT, X + 1, Y, Math.cos(a) * v, Math.sin(a) * v - R.range(30, 80), R.range(0.35, 0.45), R.pick([C[5], C[4], C[4], C[3]]), 1);
    }
    let t = 0;
    return {
      update(dt) {
        t += dt;
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        ps.draw(p);
        if (t < 0.025) {
          for (const r of rays) ray(p, X, Y, r.a, r.L, r.w, C);
          diamond(p, X, Y, 4, C);
        } else if (t < 0.058) {
          for (const r of rays) ray(p, X, Y, r.a, r.L * 1.2, r.w * 0.55, C, 0.12);
          diamond(p, X, Y, 3, C);
        } else if (t < 0.092) {
          const r = rays[0];
          ray(p, X, Y, r.a, r.L * 1.3, 0.6, [C[0], C[1], C[2], C[3], C[3], C[4]], 0.4);
        }
        const pop = Math.exp(-t / 0.045);
        if (pop > 0.02) {
          p.glow(X, Y, 22, C[4], 0.3 * pop);
          p.glow(X, Y, 7, WHITE, 0.15 * pop);
          p.glowLine(X, Y, X + Math.cos(A) * 26, Y + Math.sin(A) * 26, 4, C[5], 0.25 * pop);
        }
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/impacts/blunt-hit.js
  var blunt_hit_exports = {};
  __export(blunt_hit_exports, {
    create: () => create10,
    meta: () => meta11
  });

  // vendor/pixelfx/src/fx/impacts/_lib.js
  var SOOT4 = hex("#0d0a12");
  var OUTLINE2 = hex("#1a1422");
  var LIGHT2 = Math.atan2(-1, -1);
  function stone2(c) {
    c = hex(c);
    return { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3), lip: mix(scale(c, 1.55), WHITE, 0.12) };
  }
  function spikes(R, n, aim, { len: len2 = [7, 10], w = [1.5, 2.1], fwd = 1.8, back = 0.6, jag = 1, jit = 0.18 } = {}) {
    return Array.from({ length: n }, (_, i) => {
      const a = aim + i / n * TAU + R.range(-jit, jit), cb = Math.cos(a - aim);
      const L = R.range(len2[0], len2[1]) * (1 + fwd * Math.pow(Math.max(0, cb), 3) + back * Math.pow(Math.max(0, -cb), 3)) * (i % 2 ? jag : 1);
      return { a, len: L, w: R.range(w[0], w[1]) * (i % 2 ? Math.sqrt(jag) : 1) };
    });
  }
  function star2(p, x, y, list, sc, th, [rim, body, inner, core], a = 1, heart = 2.4) {
    for (let pass = 0; pass < 3; pass++)
      for (const s of list) {
        const c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
        for (let d = 0; d <= L; d += 0.5) {
          if (pass === 2 && d > L * 0.55) break;
          const hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3);
          const hw = pass === 0 ? hw0 + 0.8 : pass === 1 ? hw0 : hw0 * 0.45;
          const col = pass === 0 ? rim : pass === 1 ? d < L * 0.35 ? inner : body : core;
          for (let o = -hw; o <= hw; o += 0.5) p.dot(x + c * d - sn * o, y + sn * d + c * o, col, a);
        }
      }
    const r = heart * sc * Math.sqrt(th);
    p.circle(x, y, r + 0.8, inner, a);
    p.circle(x, y, r, core, a);
  }
  function brokenRing(p, x, y, r, th, segs, brk, c, c2 = c, k = 1, sy = 1, maxY = Infinity) {
    var _a;
    if (r <= 0 || k <= 0) return;
    const full = TAU / segs.length;
    for (const s of segs) {
      const span = full * (1 - s.gap * brk) + 0.02, rr = r * (1 + s.dr * brk), m = Math.max(4, Math.ceil(rr * span * 1.8));
      for (let j = 0; j <= m; j++) {
        const u = j / m, ang = s.a + (u - 0.5) * span, w = Math.max(0.5, th * ((_a = s.w) != null ? _a : 1) * (1 - brk * Math.pow(Math.abs(2 * u - 1), 1.6)));
        const ca = Math.cos(ang), sa = Math.sin(ang);
        for (let o = -w / 2; o <= w / 2 + 0.01; o += 0.5) if (y + sa * (rr + o) * sy < maxY) p.dot(x + ca * (rr + o), y + sa * (rr + o) * sy, o > -0.26 ? c : c2, k);
      }
    }
  }
  var rockShape = (R, n = 6) => Array.from({ length: n }, () => R.range(0.7, 1.12));
  function rock2(p, b, st) {
    const r = 0.75 + b.s * 0.8, n = b.pts.length, fade = Math.min(1, b.life / 0.5), ca = Math.cos(b.a), sa = Math.sin(b.a);
    p.shade(b.x - r - 2, b.y - r - 2, b.x + r + 2, b.y + r + 2, (x, y, out) => {
      const dx = x - b.x, dy = y - b.y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca, d = Math.hypot(u, v);
      let ang = Math.atan2(v, u);
      if (ang < 0) ang += TAU;
      const f = ang / TAU * n, i = Math.floor(f) % n, w = f - Math.floor(f), edge = r * (b.pts[i] * (1 - w) + b.pts[(i + 1) % n] * w);
      if (d > edge + 0.85) return;
      out.a = fade;
      if (d > edge) return OUTLINE2;
      const lit = Math.cos((i + 0.5) / n * TAU + b.a - LIGHT2);
      if (d < edge * 0.42) return lit > 0.55 ? st.light : st.body;
      return lit > 0.35 ? st.light : lit < -0.4 ? st.shade : st.body;
    });
  }

  // vendor/pixelfx/src/fx/impacts/blunt-hit.js
  var meta11 = {
    name: "Blunt hit",
    desc: "A heavy, soft thud: a white-hot lumpy blob cools to cream in a warm pool of light, inked wedges jab out and snap back, a squashed ring of dust puffs swells and drifts, clods drop.",
    tags: ["impact", "hit", "blunt", "punch", "club", "thump", "dust", "comic", "one-shot"],
    size: [128, 88],
    origin: [64, 72],
    duration: 0.9,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: ["#1d1620", "#4a3a3c", "#7d6a66", "#b09c90", "#dccab4", "#f6ead2", "#ffffff"], warm: "#ffc98a", dust: "#b7a8a6", clod: "#6e5a5a", height: 22, seed: 9 }
  };
  var lump = (r, a, ph) => r * (1 + 0.15 * Math.sin(5 * a + ph) + 0.08 * Math.sin(9 * a + ph * 2.3));
  function create10(o) {
    const C = fit(o.palette, 7), R = new Rng(o.seed), X = 0, Y = -o.height, PH = R.range(0, TAU), floor = () => 0;
    const WARM2 = hex(o.warm), DUST2 = hex(o.dust), st = stone2(o.clod);
    const lights = new Lights(), bits = new Bits({ ground: floor });
    lights.add(X, Y, 48, WARM2, 0.6, 0.4);
    lights.add(X, Y, 16, WHITE, 0.6, 0.07);
    lights.add(X, -2, 36, WARM2, 0.25, 0.4);
    const wedges = Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * TAU + R.range(-0.2, 0.2), len: R.range(6, 15), w: R.range(3.2, 5), r0: R.range(13, 16), t0: R.range(0.015, 0.04), out: R.range(0.04, 0.06), back: R.range(0.09, 0.14) }));
    const puffs = Array.from({ length: 30 }, (_, i) => {
      const a = i / 30 * TAU + R.range(-0.12, 0.12), side = Math.abs(Math.cos(a)), v = R.range(40, 140) * (0.6 + 0.5 * side);
      return { x: X + Math.cos(a) * 9, y: Y + Math.sin(a) * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, r: R.range(2.4, 6.2) * (0.75 + 0.35 * side), life: R.range(0.35, 0.85), max: 0, t0: R.range(0.03, 0.1), lift: R.range(4, 16) };
    });
    for (let i = 0; i < 5; i++)
      puffs.push({ x: X + R.range(-6, 6), y: Y - R.range(3, 6), vx: R.range(-30, 30), vy: -R.range(20, 45), r: R.range(3.5, 5.5), life: R.range(0.6, 0.85), max: 0, t0: R.range(0.05, 0.1), lift: R.range(14, 24) });
    for (const q of puffs) q.max = q.life;
    for (let i = 0; i < 5; i++) {
      const s = R.sign(), a = -Math.PI / 2 + s * R.range(0.5, 1.3), v = R.range(70, 140);
      bits.add({ kind: B.CHUNK, x: X + s * R.range(4, 8), y: Y + R.range(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1, drag: 0.6, bounce: 0.28, life: R.range(0.65, 0.85), a: R.range(0, TAU), va: s * R.range(8, 16), s: R.chance(0.4) ? 2 : 1, pts: rockShape(R), pvy: 0 });
    }
    const kicks = [];
    let t = 0;
    return {
      update(dt) {
        var _a;
        t += dt;
        for (const q of puffs) {
          if (t < q.t0) continue;
          q.life -= dt;
          q.vx -= q.vx * 4.5 * dt;
          q.vy -= q.vy * 4.5 * dt + ((_a = q.lift) != null ? _a : 6) * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
        }
        for (const b of bits.list) b.pvy = b.vy;
        bits.update(dt);
        for (const b of bits.list)
          if (b.pvy > 60 && b.vy <= 0) {
            for (let i = 0; i < 2; i++) kicks.push({ x: b.x, y: -1, vx: R.sign() * R.range(8, 22), vy: -R.range(3, 10), r: R.range(1.2, 2), life: 0.4, max: 0.4, t0: 0 });
            b.pvy = 0;
          }
        for (const q of kicks) {
          q.life -= dt;
          q.vx -= q.vx * 4 * dt;
          q.vy -= q.vy * 4 * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
        }
        lights.update(dt);
      },
      draw(p) {
        for (const q of [...puffs, ...kicks]) {
          const k = q.life / q.max;
          if (t < q.t0 || k <= 0) continue;
          const r = q.r * (0.7 + (1 - k) * 0.85), a = Math.pow(k, 1.25) * Math.min(1, (t - q.t0) / 0.03), c = mix(DUST2, WARM2, clamp(1 - (t - 0.03) / 0.25) * 0.55);
          p.disc(q.x, q.y, r, c, (d) => 0.58 * a * (1 - d * d * 0.75));
          p.disc(q.x - r * 0.22, q.y - r * 0.32, r * 0.58, mix(c, WHITE, 0.55), (d) => 0.48 * a * (1 - d * d));
        }
        for (const b of bits.list) rock2(p, b, st);
        if (t < 0.058) {
          const f = t < 0.025 ? 0 : 1, R02 = f ? 13.5 : 11.5;
          p.shade(X - R02 * 1.4, Y - R02 * 1.4, X + R02 * 1.4, Y + R02 * 1.4, (x, y) => {
            const dx = x - X, dy = (y - Y) * (f ? 1.25 : 1.1), d = Math.hypot(dx, dy), ro = lump(R02, Math.atan2(dy, dx), PH + f * 0.6);
            if (d > ro) return;
            const q = d / ro;
            return f === 0 ? q < 0.55 ? WHITE : q < 0.86 ? C[5] : C[4] : q < 0.3 ? WHITE : q < 0.72 ? C[5] : q < 0.9 ? C[4] : C[3];
          });
        }
        for (const w of wedges) {
          const u = t - w.t0;
          if (u < 0 || u > w.out + w.back) continue;
          const s = u < w.out ? ease.outCubic(u / w.out) : 1 - ease.inQuad((u - w.out) / w.back), L = w.len * s;
          if (L < 1.5) continue;
          const ca = Math.cos(w.a), sa = Math.sin(w.a), r0 = w.r0 + 2 * s, hw = w.w * (0.6 + 0.4 * s) / 2;
          const tip = [X + ca * r0, Y + sa * r0], end = [X + ca * (r0 + L), Y + sa * (r0 + L)], n = [-sa * hw, ca * hw];
          const wedge = (g) => [[tip[0] - ca * g, tip[1] - sa * g], [end[0] + n[0] * (1 + g * 0.45) + ca * g, end[1] + n[1] * (1 + g * 0.45) + sa * g], [end[0] - n[0] * (1 + g * 0.45) + ca * g, end[1] - n[1] * (1 + g * 0.45) + sa * g]];
          p.poly(wedge(1), C[1]);
          p.poly(wedge(0), u < w.out + 0.02 ? WHITE : C[5]);
        }
        const pop = Math.exp(-t / 0.06);
        if (pop > 0.02) p.glow(X, Y, 28, WARM2, 0.5 * pop);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/impacts/crit-hit.js
  var crit_hit_exports = {};
  __export(crit_hit_exports, {
    create: () => create11,
    meta: () => meta12
  });
  var meta12 = {
    name: "Critical hit",
    desc: "A critical hit: a jagged starburst slams in white and overshoots, a ring breaks into flying arcs, sparks streak off, shards tumble to the floor under a big flare.",
    tags: ["impact", "hit", "crit", "critical", "combat", "directional", "one-shot"],
    size: [216, 136],
    origin: [84, 106],
    duration: 0.9,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: ["#2a0510", "#5c0a1c", "#a3142a", "#e0302c", "#ff7a2a", "#ffc23d", "#fff09a", "#ffffff"], height: 26, aim: 0.12, seed: 3 }
  };
  var KEYS = [
    [0, 1, 1, 1, [6, 7, 7, 7]],
    [0.025, 1.3, 1, 1, [2, 5, 6, 7]],
    [0.058, 1.05, 0.72, 1, [2, 4, 5, 6]],
    [0.092, 1.22, 0.3, 1, [1, 2, 3, 4]],
    [0.125]
  ];
  function flare2(p, x, y, L, k, C) {
    for (const [dx, dy, len2] of [[1, 0, L], [0, 1, L * 0.45], [0.7, 0.7, L * 0.16], [0.7, -0.7, L * 0.16]])
      for (const s of [-1, 1])
        for (let d = 1; d <= len2; d++) {
          const u = d / len2, a = u < 0.7 ? 1 : k * (1.6 - u);
          p.dot(x + s * dx * d, y + s * dy * d, u < 0.35 ? WHITE : u < 0.7 ? C[6] : C[5], a);
          if (dy === 0 && u < 0.42) for (const e of [-1, 1]) p.dot(x + s * d, y + e, u < 0.2 ? C[6] : C[5], u < 0.3 ? 1 : k);
        }
    p.glowLine(x - L, y, x + L, y, 6, C[6], 0.5 * k);
    p.glowLine(x, y - L * 0.45, x, y + L * 0.45, 4, C[6], 0.3 * k);
  }
  function create11(o) {
    const C = fit(o.palette, 8), R = new Rng(o.seed), X = 0, Y = -o.height, A = o.aim, floor = () => 0;
    const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[3]] });
    const bits = new Bits({ ground: floor }), lights = new Lights();
    const sp = spikes(R, 14, A, { len: [11, 15], w: [1.8, 2.5], fwd: 1.4, back: 0.6, jag: 0.5 });
    [...sp].sort((a, b) => b.len - a.len).slice(0, 2).forEach((s) => s.len *= 1.3);
    const segs = Array.from({ length: 7 }, (_, i) => {
      const a = A + i / 7 * TAU;
      return { a, gap: R.range(0.55, 0.85), dr: R.range(0.08, 0.4) + 0.15 * Math.max(0, Math.cos(a - A)), w: 0.7 + 0.5 * Math.max(0, Math.cos(a - A)) };
    });
    lights.add(X, Y, 84, C[5], 0.6, 0.5);
    lights.add(X, Y, 30, WHITE, 0.7, 0.1);
    lights.add(X, -4, 44, C[4], 0.3, 0.45);
    for (let i = 0; i < 36; i++) {
      const back = R.chance(0.22), a = (back ? A + Math.PI : A) + R.range(-1, 1) * (back ? 0.6 : 0.8), v = R.range(170, 430) * (back ? 0.6 : 1);
      ps.spawn(P.SPARK, X, Y, Math.cos(a) * v, Math.sin(a) * v - 50, R.range(0.15, 0.5), WHITE, 1, R.chance(0.3) ? R.range(0, 0.04) : 0);
    }
    for (let i = 0; i < 10; i++) {
      const a = A + R.range(-1, 1) * 1.1 - 0.35, v = R.range(110, 280);
      bits.add({ kind: B.SHARD, x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 0.8, drag: 0.7, bounce: 0.35, life: R.range(0.55, 0.85), a: R.range(0, TAU), va: R.range(-25, 25), s: R.range(2, 4.5), c: R.pick([C[7], C[6], C[6], C[5]]) });
    }
    for (let i = 0; i < 12; i++) {
      const a = A - Math.PI / 2 + R.range(-1.4, 1.4), v = R.range(35, 110);
      ps.spawn(P.MOTE, X + Math.cos(a) * 4, Y + Math.sin(a) * 4, Math.cos(a) * v, Math.sin(a) * v - 15, R.range(0.35, 0.7), R.pick([C[6], C[5], C[5]]), 0.6, R.range(0, 0.05));
    }
    for (let i = 0; i < 5; i++) {
      const a = R.range(0, TAU), d = R.range(14, 34);
      ps.spawn(P.STAR, X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.8, 0, -4, R.range(0.22, 0.38), R.chance(0.5) ? C[6] : WHITE, R.range(1.6, 3), R.range(0.08, 0.32));
    }
    let t = 0;
    return {
      update(dt) {
        t += dt;
        ps.update(dt);
        bits.update(dt);
        lights.update(dt);
      },
      draw(p) {
        const u = clamp((t - 0.03) / 0.37);
        if (t >= 0.03 && u < 1) {
          const r = 10 + 30 * ease.outCubic(u), brk = smooth(0.12, 0.6, u), th = Math.max(1, 3.6 * Math.pow(1 - u, 1.2));
          const i = u < 0.12 ? 7 : u < 0.3 ? 6 : u < 0.5 ? 5 : u < 0.75 ? 4 : 3;
          brokenRing(p, X, Y, r, th, segs, brk, C[i], C[Math.max(2, i - 2)], u < 0.6 ? 1 : (1 - u) / 0.4, 1, 0);
          if (u < 0.6) p.glowRing(X, Y, r, 6, C[5], 0.35 * Math.pow(1 - u / 0.6, 2));
        }
        bits.draw(p);
        ps.draw(p);
        const f = (t - 0.04) / 0.28;
        if (f > 0 && f < 1) {
          flare2(p, X, Y, 64 * Math.pow(1 - f, 1.3), 1 - f, C);
          p.glow(X, Y, 56, C[5], 0.4 * (1 - f));
        }
        for (let i = 0; i < KEYS.length - 1; i++)
          if (t >= KEYS[i][0] && t < KEYS[i + 1][0]) {
            const [, sc, th, a, cols] = KEYS[i];
            star2(p, X, Y, sp, sc, th, cols.map((j) => C[j]), a, 2.6);
          }
        const pop = Math.exp(-t / 0.05);
        if (pop > 0.02) {
          p.glow(X, Y, 44, C[5], 0.4 * pop);
          p.glow(X, Y, 12, WHITE, 0.6 * pop);
        }
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/fire/fire-ring.js
  var fire_ring_exports = {};
  __export(fire_ring_exports, {
    act: () => act8,
    create: () => create12,
    meta: () => meta13
  });

  // vendor/pixelfx/src/fx/fire/_lib.js
  var hotFirst = (F) => [...F].reverse();
  var LAYERS = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]];
  var BACK_LAYERS = [[1, 1, 7], [0.76, 0.86, 5], [0.54, 0.68, 3], [0.3, 0.42, 2]];
  function flameTongue(p, x, y, h, w, sx, N3, n, H, layers = LAYERS, jit = 0.5, wob = 1.1) {
    if (h < 1) return;
    for (const [lw, lh, ri] of layers) {
      const L = h * lh, c = H[ri];
      for (let r = 0; r <= L; r++) {
        const u = r / Math.max(1, L);
        const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N3(9, n, r * 0.45) * jit;
        if (half < 0.3) continue;
        const cx = x + sx * u * u * lh + N3(4, n + 7, r * 0.2) * u * wob, Y = Math.round(y - r);
        for (let px = Math.round(cx - half), x1 = Math.round(cx + half); px <= x1; px++) p.px(px, Y, c);
      }
    }
  }
  function solid(p, x, y, r, c) {
    if (r < 0.6) return p.px(x, y, c);
    const cx = p.toX(x, y), cy = p.toY(x, y), r2 = r * r;
    for (let sy = Math.floor(cy - r); sy <= Math.ceil(cy + r); sy++) {
      const dy = sy + 0.5 - cy, s2 = r2 - dy * dy;
      if (s2 < 0) continue;
      const s = Math.sqrt(s2);
      for (let sx = Math.ceil(cx - s - 0.5); sx <= Math.floor(cx + s - 0.5); sx++) p.put(sx, sy, c, 1);
    }
  }
  function soft(p, x, y, r, c, a) {
    if (a <= 4e-3) return;
    if (r < 0.5) return p.blend(x, y, c, a);
    const cx = p.toX(x, y), cy = p.toY(x, y), r2 = r * r;
    for (let sy = Math.floor(cy - r); sy <= Math.ceil(cy + r); sy++) {
      const dy = sy + 0.5 - cy, s2 = r2 - dy * dy;
      if (s2 < 0) continue;
      const s = Math.sqrt(s2);
      for (let sx = Math.ceil(cx - s - 0.5); sx <= Math.floor(cx + s - 0.5); sx++) p.blendPx(sx, sy, c, a);
    }
  }
  function firePuff(p, x, y, k, size, frac, H, glowK = 0.18, tx = 0, ty = -1) {
    const age = 1 - k, n = H.length, heat = Math.min(0.999, Math.pow(age, 0.62) + frac * 0.1);
    const idx = Math.min(n - 2, Math.floor(heat * (n - 1)));
    const r = size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = H[idx];
    if (idx >= n - 2) return soft(p, x, y, r, c, Math.min(1, k * 3) * 0.85);
    solid(p, x, y, r, H[Math.min(n - 1, idx + 2)]);
    if (r > 1.6 && ty > -0.99) solid(p, x + tx * r * 1.5, y + ty * r * 1.5, r * 0.3, H[Math.min(n - 1, idx + 1)]);
    solid(p, x - r * 0.16, y - r * 0.22, r * 0.78, c);
    if (r > 1.6) solid(p, x + tx * r * 0.9, y + ty * r * 0.9, r * 0.42, c);
    if (idx <= 3 && r > 1.8) solid(p, x - r * 0.28, y - r * 0.34, r * 0.36, H[Math.max(0, idx - 1)]);
    if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, glowK * k);
  }
  function simDraw(p, ps, H, layer) {
    const all = ps.list, rest = [], fire = [];
    for (const q of all) (q.k === P.FIRE ? fire : rest).push(q);
    const puffs = (back) => {
      for (const q of fire) if (q.delay <= 0 && !!(q.flag & PF.BACK) === back) firePuff(p, q.x, q.y, q.life / q.max, q.size, q.seed % 1, H);
    };
    ps.list = rest;
    if (layer !== "front") ps.draw(p, "back"), puffs(true);
    if (layer !== "back") puffs(false), ps.draw(p, "front");
    ps.list = all;
  }
  var SMOKE1 = hex("#5b5566");

  // vendor/pixelfx/src/fx/fire/fire-ring.js
  var meta13 = {
    name: "Fire ring",
    desc: "A white flash at the feet, then flames race outward along the floor in a ring, flaring as the front passes and burning down behind it over a smouldering scorch.",
    tags: ["fire", "ring", "nova", "aoe", "spell", "ground", "one-shot"],
    size: [224, 128],
    origin: [112, 92],
    duration: 3.9,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
      reach: 92,
      seed: 6
    }
  };
  var HIGH2 = { turn: 1.15, crouch: 0, fx: -7, fy: -44, bx: 8, by: -44, ffx: -5, fbx: 6 };
  var SLAM2 = { turn: 1.15, crouch: 8, lean: 3, fx: -9, fy: -8, bx: 11, by: -8, ffx: -8, fbx: 9 };
  var EASE = { turn: 1, crouch: 2, fx: -8, fy: -17, bx: 9, by: -17, ffx: -4, fbx: 5 };
  var act8 = {
    target: { x: 70 },
    poses: [
      [-0.32, READY],
      [0.02, HIGH2],
      [0.27, { ...HIGH2, y: -1 }],
      [0.32, SLAM2, "snap"],
      [0.85, { ...SLAM2, crouch: 7 }],
      [1.5, EASE],
      [2.4, READY],
      [3.9, READY]
    ],
    hits: [
      { t: 0.32, stop: 0.1, shake: 0.28, amp: 3, target: false },
      { t: 0.6, push: 1.2, straw: 10, y: -8, skin: "char" },
      { t: 3.5, push: 0, straw: 0, flash: 0, skin: null }
    ],
    dust: [{ t: 0.32, x: 10, n: 6, dir: 1 }, { t: 0.32, x: -10, n: 6, dir: -1 }]
  };
  var SY = 0.2;
  var CHARGE = 0.32;
  var SPREAD = 0.75;
  var SOOT5 = hex("#0d0a12");
  var SOOT22 = hex("#17121d");
  var WARM = rgb(255, 176, 96);
  var EMBER_LAYERS = [[1, 1, 7], [0.7, 0.8, 6], [0.4, 0.55, 5]];
  function create12(o) {
    const F = fit(o.palette, 9), H = hotFirst(F), REACH = o.reach, R = new Rng(o.seed), floor = () => 0, S = o.seed * 7;
    const ps = new Particles({ rng: R, ground: floor, sparks: [H[1], H[2], H[4], H[5]] }), lights = new Lights();
    const GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.25);
    const front = (t2) => REACH * ease.outCubic(clamp((t2 - CHARGE) / SPREAD));
    const reachedAt = (d) => CHARGE + SPREAD * (1 - Math.cbrt(1 - Math.min(1, d / REACH)));
    const sites = [];
    for (let r = 10; r <= REACH; r += 9) {
      const per = TAU * Math.sqrt((r * r + (r * SY) ** 2) / 2), n = Math.max(5, Math.round(per / 8.5));
      for (let k = 0; k < n; k++) {
        const a = (k + R.range(0.15, 0.85)) / n * TAU, rr = r + R.range(-3, 3), q = Math.min(1, rr / REACH);
        sites.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * SY, back: Math.sin(a) < 0, t0: reachedAt(rr) + R.range(0, 0.04), life: (0.3 + 1 * q * q) * R.range(0.85, 1.2), h: R.range(9, 15) * (0.6 + 0.55 * q), w: R.range(1.8, 2.7) * (0.75 + 0.3 * q), n: R.int(0, 1e5) });
      }
    }
    sites.sort((a, b) => a.y - b.y);
    let t = 0, burst = false;
    const flames = (p, back) => {
      const NZ = (rate, seed = 0, off = 0) => noise(t * rate + off, seed);
      for (const s of sites) {
        if (s.back !== back) continue;
        const age = t - s.t0;
        if (age < 0 || age > s.life) continue;
        const u = age / s.life, rise = ease.outBack(clamp(age / 0.08), 2), fade = 1 - Math.pow(Math.max(0, (u - 0.1) / 0.9), 1.3);
        const h = s.h * rise * fade * (0.85 + 0.15 * noise(t * 3.3, s.n)) * (1 + 0.5 * Math.max(0, noise(t * 2.6, s.n + 70) - 0.55));
        if (h < 1) continue;
        const L = u < 0.3 ? back ? BACK_LAYERS : LAYERS : u < 0.65 ? BACK_LAYERS : EMBER_LAYERS;
        flameTongue(p, s.x, s.y, h, s.w * (0.6 + 0.4 * fade), NZ(2.2, s.n + 40) * 1.5 - s.x * 0.02, NZ, s.n, H, L);
      }
    };
    const scorch = (p) => {
      const fr = front(t), end = 1 - smooth(meta13.duration - 1.2, meta13.duration - 0.15, t);
      if (fr < 1 || end <= 0) return;
      for (let y = Math.floor(-fr * SY); y <= Math.ceil(fr * SY); y++)
        for (let x = Math.floor(-fr); x <= Math.ceil(fr); x++) {
          const d = Math.hypot(x + 0.5, (y + 0.5) / SY);
          if (d > fr) continue;
          const since2 = t - reachedAt(d), h = rand(x, y, S), hot = 1 - since2 / (1.2 + h * 0.9);
          if (hot > 0 && h < 0.03 + 0.06 * hot) {
            p.px(x, y, hot > 0.7 ? H[3] : hot > 0.45 ? H[4] : hot > 0.2 ? H[5] : H[6]);
            p.light(x, y, H[4], 0.3 * hot);
            continue;
          }
          p.blend(x, y, h < 0.5 ? SOOT5 : SOOT22, Math.min(1, since2 * 3) * (0.55 - d / REACH * 0.25) * end);
        }
    };
    const ring = (p, back) => {
      const k = (t - CHARGE) / (SPREAD + 0.1);
      if (k < 0 || k >= 1) return;
      band(p, 0, 0, front(t) + 1.5, SY, Math.max(1.5, 6 * (1 - k)), k < 0.75 ? 1 : (1 - k) / 0.25, [H[6], H[4], H[2], H[1]], (g) => Math.sin(g) < 0 === back, k < 0.12);
    };
    return {
      update(dt) {
        t += dt;
        if (t < CHARGE - 0.05 && R.chance(0.9 * dt * 60)) {
          const a = R.range(0, TAU), d = R.range(26, 54), T = R.range(0.18, 0.26), v = d * 3 / (Math.exp(3 * T) - 1);
          const x = Math.cos(a) * d, y = Math.min(-2, -6 + Math.sin(a) * d * 0.45), l = Math.hypot(x, y + 4) || 1;
          ps.spawn(P.STREAK, x, y, -x / l * v, (-4 - y) / l * v, T, R.chance(0.5) ? H[2] : H[3]);
        }
        if (t < CHARGE && R.chance(0.5 * dt * 60 * (t / CHARGE))) ps.spawn(P.FIRE, R.range(-4, 4), -1, R.range(-8, 8), -R.range(20, 40), R.range(0.12, 0.24), 0, R.range(1, 2.2));
        if (!burst && t >= CHARGE) {
          burst = true;
          lights.add(0, -18, 64, WARM, 0.85, 0.5);
          lights.add(0, -6, 30, WHITE, 0.8, 0.08);
          for (let i = 0; i < 40; i++) {
            const a = R.range(0, TAU), sp = R.range(80, 220);
            ps.spawn(P.SPARK, Math.cos(a) * 3, -2, Math.cos(a) * sp, Math.sin(a) * sp * 0.4 - R.range(40, 120), R.range(0.2, 0.5));
          }
        }
        if (t > CHARGE && t < CHARGE + SPREAD + 1.2)
          for (let i = 0; i < 3; i++) {
            if (!R.chance(0.75 * dt * 60)) continue;
            const s = R.pick(sites), age = t - s.t0;
            if (age < 0 || age > s.life * 0.7) continue;
            ps.spawn(P.FIRE, s.x + R.range(-1, 1), s.y - s.h * 0.6, R.range(-5, 5), -R.range(20, 40), R.range(0.2, 0.4), 0, R.range(1.2, 2.4), 0, R.chance(0.5) ? PF.SMOKES | (s.back ? PF.BACK : 0) : s.back ? PF.BACK : 0);
            if (R.chance(0.12)) ps.spawn(P.EMBER, s.x, s.y - s.h * 0.5, R.range(-15, 15), -R.range(30, 70), R.range(0.6, 1.3), H[3], 1, 0, s.back ? PF.BACK : 0);
          }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        scorch(p);
        ring(p, true);
        flames(p, true);
        simDraw(p, ps, H, "back");
        const fr = front(t), k = t < CHARGE ? 0 : 1 - smooth(CHARGE + SPREAD, CHARGE + SPREAD + 1.4, t);
        if (k > 0) for (let i = 0; i < 16; i++) p.glow(Math.cos(i / 16 * TAU) * fr, Math.sin(i / 16 * TAU) * fr * SY - 3, 16, GLOW, 0.2 * k);
      },
      draw(p) {
        ring(p, false);
        flames(p, false);
        simDraw(p, ps, H, "front");
        if (t < CHARGE) p.glow(0, -3, 8 + 22 * (t / CHARGE), GLOW, 0.6 * (t / CHARGE));
        if (t >= CHARGE && t < CHARGE + 0.1) {
          const k2 = 1 - (t - CHARGE) / 0.1;
          p.ellipse(0, -1, 14 * (0.6 + 0.4 * k2), 4, H[2]);
          p.ellipse(0, -1, 9 * (0.6 + 0.4 * k2), 2.6, k2 > 0.5 ? WHITE : H[1]);
        }
        const k = smooth(CHARGE - 0.05, CHARGE, t) * (1 - smooth(CHARGE + SPREAD * 0.5, CHARGE + SPREAD + 1.2, t));
        if (k > 0) p.glow(0, -6, 92, GLOW, 0.3 * k);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/status/burning.js
  var burning_exports = {};
  __export(burning_exports, {
    act: () => act9,
    actorAlpha: () => actorAlpha,
    draw: () => draw2,
    drawBack: () => drawBack2,
    meta: () => meta14
  });

  // vendor/pixelfx/src/fx/status/_lib.js
  var SHAPES = /* @__PURE__ */ new WeakMap();
  function shape(a) {
    const m = a.mask;
    let s = SHAPES.get(m);
    if (s) return s;
    const { w, h, data } = m, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] > 0;
    const body = [], up = [], side = [], outline = [], top = [], rows = [];
    for (let x = 0; x < w; x++) {
      let y = 0;
      while (y < h && !on(x, y)) y++;
      top.push(y < h ? y : -1);
    }
    for (let y = 0; y < h; y++) {
      let l = -1, r = -1;
      for (let x = 0; x < w; x++) {
        if (!on(x, y)) continue;
        if (l < 0) l = x;
        r = x;
        body.push([x, y]);
        if (!on(x, y - 1)) up.push([x, y]);
        if (!on(x - 1, y)) side.push([x, y, -1]);
        if (!on(x + 1, y)) side.push([x, y, 1]);
      }
      rows.push([l, r]);
    }
    for (let y = -1; y <= h; y++)
      for (let x = -1; x <= w; x++) {
        if (on(x, y)) continue;
        let nx = 0, ny = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y + dy)) nx -= dx, ny -= dy;
        if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) {
          const l = Math.hypot(nx, ny) || 1;
          outline.push([x, y, nx / l, ny / l]);
        }
      }
    s = { w, h, on, body, up, side, outline, top, rows };
    SHAPES.set(m, s);
    return s;
  }
  var colorAt = (a, x, y) => a.pixels ? a.pixels[y * a.mask.w + x] : a.mask.data[y * a.mask.w + x] ? 4285229931 : 0;
  function wnoise(x, P3, seed = 0) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    const a = rand(wrap(i, P3), seed), b = rand(wrap(i + 1, P3), seed);
    return (a + (b - a) * u) * 2 - 1;
  }
  function tnoise(t, D3, f, seed = 0, off = 0) {
    const P3 = Math.max(2, Math.round(f * D3));
    return wnoise(t / D3 * P3 + off, P3, seed);
  }
  var travel2 = (v, g, d, a) => d > 0 ? g / d * a + (v - g / d) * (1 - Math.exp(-d * a)) / d : v * a + 0.5 * g * a * a;
  var LAYERS2 = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]];
  function tongue(p, x, y, h, w, sx, F, t, D3, n, layers = LAYERS2) {
    if (h < 1) return;
    for (const [lw, lh, ri] of layers) {
      if (ri === 0 && h < 4) continue;
      const H = h * lh, col = F[ri];
      for (let r = 0; r <= H; r++) {
        const u = r / Math.max(1, H);
        const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + tnoise(t, D3, 9, n, r * 0.45) * 0.5;
        if (half < 0.3) continue;
        const cx = x + sx * u * u * lh + tnoise(t, D3, 4, n + 7, r * 0.2) * u * 1.1;
        for (let px = Math.round(cx - half); px <= Math.round(cx + half); px++) p.px(px, Math.round(y - r), col);
      }
    }
  }
  var rampAt2 = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];
  function smoke(p, x, y, size, u, col, k = 1, warm = 0) {
    const r = size * (0.65 + Math.min(1, u * 2.5) * 0.45 + u * 0.4);
    const a = Math.min(1, u * 12) * Math.min(1, (1 - u) * 2.4) * 0.58 * k;
    if (a <= 0.01) return;
    const c = col ? mix(col, rampAt2(SMOKE_RAMP, u), u) : rampAt2(SMOKE_RAMP, u * 1.05);
    p.disc(x, y, r, c, a * 0.45);
    p.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62);
    if (warm && u < 0.6) p.disc(x + r * 0.1, y + r * 0.3, r * 0.56, mix(c, warm, 0.5), a * 0.7 * (1 - u / 0.6));
    if (u < 0.5) p.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - u * 2));
  }
  function ember(p, x, y, u, E, ph, k = 1) {
    const left = 1 - u;
    if (left < 0.22 && Math.sin(ph * 40) < 0) return;
    const c = left > 0.5 ? Math.sin(ph * 22) > -0.2 ? E[0] : E[1] : left > 0.22 ? E[1] : E[2];
    p.px(x, y, c);
    p.glow(x, y, 3, c, 0.32 * left * k);
  }
  function bitmap(rows, k = 1, flip = false) {
    const h = rows.length, w = rows[0].length, ox = Math.floor(w * k / 2), oy = Math.floor(h * k / 2);
    return (dx, dy) => {
      let bx = Math.floor((dx + ox) / k);
      const by = Math.floor((dy + oy) / k);
      if (bx < 0 || by < 0 || bx >= w || by >= h) return "";
      if (flip) bx = w - 1 - bx;
      const c = rows[by][bx];
      return c === "." ? "" : c;
    };
  }
  function icon(p, x, y, ext, inside, R, a = 1, paint = null) {
    const X = Math.round(x), Y = Math.round(y), at = (dx, dy) => !!inside(dx, dy);
    for (let dy = -ext - 1; dy <= ext + 1; dy++)
      for (let dx = -ext - 1; dx <= ext + 1; dx++) {
        const ch = inside(dx, dy);
        let c;
        if (ch) {
          if (paint && paint[ch] !== void 0) c = paint[ch];
          else {
            const top = !at(dx, dy - 1), left = !at(dx - 1, dy), bottom = !at(dx, dy + 1), right = !at(dx + 1, dy);
            c = top || left ? R[3] : bottom || right ? R[1] : R[2];
          }
        } else if (R[0] && (at(dx - 1, dy) || at(dx + 1, dy) || at(dx, dy - 1) || at(dx, dy + 1))) c = R[0];
        else continue;
        p.dot(X + dx, Y + dy, c, a);
      }
  }
  var EYES = /* @__PURE__ */ new WeakMap();
  function eyes(a) {
    var _a, _b;
    let list = EYES.get(a.mask);
    if (list) return list;
    if (a.eyes) {
      list = a.eyes.map(([x, y]) => ({ x0: x, x1: x, y0: y, y1: y + 1, px: [[x, y], [x, y + 1]], skin: colorAt(a, x, y) }));
      EYES.set(a.mask, list);
      return list;
    }
    const S = shape(a), W = S.w, col = (x, y) => S.on(x, y) ? colorAt(a, x, y) : 0;
    const dark = (x, y) => S.on(x, y) && y < S.h * 0.4 && luma(col(x, y)) < 0.15 && S.on(x - 1, y) && S.on(x + 1, y) && S.on(x, y - 1) && S.on(x, y + 1);
    const seen = /* @__PURE__ */ new Set();
    list = [];
    for (const [x0, y0] of S.body) {
      if (seen.has(y0 * W + x0) || !dark(x0, y0)) continue;
      const px = [], q = [[x0, y0]];
      seen.add(y0 * W + x0);
      while (q.length) {
        const [x, y] = q.pop();
        px.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, k = ny * W + nx;
          if (seen.has(k) || !(dark(nx, ny) || S.on(nx, ny) && luma(col(nx, ny)) > 0.95)) continue;
          seen.add(k);
          q.push([nx, ny]);
        }
      }
      if (px.length < 2 || px.length > 14) continue;
      const xs = px.map((p) => p[0]), ys = px.map((p) => p[1]), counts = /* @__PURE__ */ new Map();
      const e = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), px };
      for (const [x, y] of px)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]]) {
          const c = col(x + dx, y + dy), l = luma(c);
          if (c && l > 0.5 && l < 0.95 && !px.some((p) => p[0] === x + dx && p[1] === y + dy)) counts.set(c, ((_a = counts.get(c)) != null ? _a : 0) + 1);
        }
      e.skin = (_b = [...counts].sort((p, q2) => q2[1] - p[1])[0]) == null ? void 0 : _b[0];
      if (e.skin && e.x1 - e.x0 <= 4 && e.y1 - e.y0 <= 5) list.push(e);
    }
    list.sort((p, q) => p.x0 - q.x0);
    if (list.length > 2) list = [];
    EYES.set(a.mask, list);
    return list;
  }

  // vendor/pixelfx/src/fx/status/burning.js
  var meta14 = {
    name: "Burning",
    desc: "Burning over time: small flames lick from four hot spots, trailing sparks and thin smoke; every 0.6 s they flare, the body flashes white then orange, scorch marks spread.",
    tags: ["status", "fire", "burn", "dot", "debuff", "loop"],
    size: [72, 80],
    origin: [36, 70],
    duration: 1.2,
    loop: true,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
      char: ["#120c0a", "#2a1a14", "#4a2c1c"],
      smoke: "#5b5566",
      seed: 3
    }
  };
  var A_ = { turn: 1, crouch: 2, lean: 2, fx: -13, fy: -38, bx: 12, by: -17, ffx: -3, ffy: -7, fbx: 5 };
  var B_ = { turn: 0.9, crouch: 3, lean: -2, fx: -12, fy: -17, bx: 13, by: -38, ffx: -4, fbx: 4, fby: -7 };
  var act9 = {
    onBody: true,
    poses: [[0, A_], [0.15, B_, "snap"], [0.3, A_, "snap"], [0.45, B_, "snap"], [0.6, A_, "snap"], [0.75, B_, "snap"], [0.9, A_, "snap"], [1.05, B_, "snap"], [1.2, A_, "snap"]]
  };
  var D = meta14.duration;
  var TICK = 0.6;
  var WIND3 = -14;
  var since = (t) => (t % TICK + TICK) % TICK;
  var flare3 = (t) => Math.exp(-since(t) / 0.12);
  var actorAlpha = (t) => since(t) < 0.034 ? 0 : 1;
  var SPOTS = /* @__PURE__ */ new WeakMap();
  function spots(a, seed) {
    var _a;
    let s = SPOTS.get(a.mask);
    if (!s) SPOTS.set(a.mask, s = /* @__PURE__ */ new Map());
    if (s.has(seed)) return s.get(seed);
    const S = shape(a), H = S.h, W = S.w, R = new Rng(seed * 13 + 5);
    const at = (q, side) => {
      const my = Math.round(H * q), [l, r] = S.rows[my];
      return [side < 0 ? l : r, my];
    };
    const hair = S.up.filter(([x]) => x < W * 0.42).sort((p, q) => p[1] - q[1] || p[0] - q[0])[0];
    const shoulder = (_a = S.up.filter(([x, y]) => x > W / 2 && y > H * 0.4 && y < H * 0.62).sort((p, q) => p[1] - q[1])[0]) != null ? _a : at(0.5, 1);
    const list = [
      { at: hair, side: -1, n: 3, h: 4.5 },
      { at: shoulder, side: 1, n: 2, h: 4 },
      { at: at(0.62, -1), side: -1, n: 2, h: 3.5 },
      { at: at(0.6, 1), side: 1, n: 2, h: 3.5 }
    ].map((sp, i) => ({ ...sp, x: a.x + sp.at[0] + 0.5, y: a.y + sp.at[1] + 1.5, tongues: Array.from({ length: sp.n }, (_, j) => ({ dx: (j - (sp.n - 1) / 2) * 1.6 + R.range(-0.4, 0.4), h: sp.h * R.range(0.8, 1.2), n: i * 17 + j * 5 + seed })) }));
    const scorch = [0, 1].map((tick) => [0, 1].map((k) => {
      const sp = list[(tick * 2 + k + 1) % list.length], lum = (x2, y2) => luma(colorAt(a, x2, y2));
      let cand = S.body.filter(([x2, y2]) => Math.hypot(a.x + x2 + 0.5 - sp.x, a.y + y2 + 0.5 - sp.y) < 9 && y2 > H * 0.42 && lum(x2, y2) > 0.3 && lum(x2, y2) < 0.6);
      if (!cand.length) cand = S.body.filter(([, y2]) => y2 > H * 0.45);
      const [x, y] = cand[Math.floor(R.next() * cand.length)];
      return { x: a.x + x + 0.5, y: a.y + y + 0.5, r: R.range(3.2, 4.4) };
    }));
    const out = { list, scorch };
    s.set(seed, out);
    return out;
  }
  function drawBack2(p, t, o) {
    const F = fit(o.palette, 9).reverse(), a = o.actor, fl = flare3(t), flick = 0.8 + 0.2 * tnoise(t, D, 7.5, 3);
    p.shade(-30, -3, 30, 7, (x, y, out) => {
      const d = Math.hypot(x / 26, (y - 0.5) / 4.5);
      if (d < 1) out.l = mix(F[3], F[4], 0.5), out.k = (0.16 + 0.22 * fl) * flick * (1 - d) * (1 - d);
    });
    const smokeC = mix(hex(o.smoke), F[6], 0.2), { list } = spots(a, o.seed);
    cycle(t, D, 16, o.seed + 4, (r) => r.range(0.8, 1.2), (age, life, r, i) => {
      const sp = list[i % list.length], x = sp.x + travel2(WIND3 * 0.6, WIND3 * 0.5, 0.8, age) + Math.sin(age * 4 + i) * 1.2, y = sp.y - 3 - travel2(18, 6, 1, age);
      smoke(p, x, y, r.range(1.1, 1.9), age / life, smokeC, 0.9);
    });
  }
  function draw2(p, t, o) {
    const F = fit(o.palette, 9).reverse(), CH = fit(o.char, 3), a = o.actor, S = shape(a), { list, scorch } = spots(a, o.seed);
    const ph = since(t), tick = Math.floor(t / TICK) % 2, fl = flare3(t);
    if (ph < 0.034) for (const [mx, my] of S.body) p.px(a.x + mx, a.y + my, WHITE);
    else if (ph < 0.22) {
      const k = 1 - (ph - 0.034) / 0.186;
      for (const [mx, my] of S.body) p.blend(a.x + mx, a.y + my, F[4], 0.55 * k);
    }
    for (const sc of scorch[tick]) {
      const grow = clamp(ph / 0.14), fade = 1 - clamp((ph - 0.25) / 0.33), r = sc.r * (0.4 + 0.6 * grow);
      if (fade <= 0) continue;
      for (const [mx, my] of S.body) {
        const x = a.x + mx + 0.5, y = a.y + my + 0.5, d = Math.hypot(x - sc.x, (y - sc.y) * 1.2) + rand(mx, my, 7) * 0.9;
        if (d > r) continue;
        const edge = d > r - 1;
        if (edge) p.dot(x - 0.5, y - 0.5, rand(mx, my, Math.floor(t * 20)) < 0.5 ? F[3] : F[4], fade * 1.2);
        else p.dot(x - 0.5, y - 0.5, d < r * 0.5 ? CH[0] : CH[1], fade * 1.1);
      }
      p.glow(sc.x, sc.y, 6, F[4], 0.3 * fade);
    }
    for (const sp of list) {
      for (const tg of sp.tongues) {
        const h = tg.h * (0.85 + 0.25 * tnoise(t, D, 5, tg.n)) * (1 + 1.6 * fl);
        tongue(p, sp.x + tg.dx, sp.y, h, 1.1 + 0.3 * fl, WIND3 * 0.08 * h / 4 + tnoise(t, D, 3, tg.n + 9) * 0.8, F, t, D, tg.n);
      }
      p.glow(sp.x, sp.y - 2, 9 + 6 * fl, F[4], 0.22 + 0.35 * fl);
    }
    cycle(t, D, 20, o.seed + 6, (r) => r.range(0.5, 0.9), (age, life, r, i) => {
      const sp = list[i % list.length], x = sp.x + r.range(-1.5, 1.5) + travel2(WIND3 + r.range(-10, 6), WIND3 * 0.6, 1.2, age) + Math.sin(age * 9 + i) * 1.2 * age;
      const y = sp.y - 2 + travel2(-r.range(25, 55), -18, 1.4, age);
      ember(p, x, y, age / life, [F[1], F[3], F[5]], age + i);
    });
    if (ph < 0.3)
      for (const [k, sp] of list.entries())
        for (let j = 0; j < 4; j++) {
          const an = -Math.PI / 2 + (rand(k, j, tick) - 0.5) * 2.2, v = 50 + 50 * rand(k, j, 2), x = sp.x + Math.cos(an) * travel2(v, 0, 3, ph), y = sp.y - 2 + Math.sin(an) * travel2(v, 0, 3, ph) + 60 * ph * ph;
          p.px(x, y, ph < 0.12 ? F[1] : F[3]);
          p.light(x, y, F[3], 0.4 * (1 - ph / 0.3));
        }
  }

  // vendor/pixelfx/src/fx/melee/claw-swipe.js
  var claw_swipe_exports = {};
  __export(claw_swipe_exports, {
    act: () => act10,
    create: () => create13,
    meta: () => meta15
  });
  var meta15 = {
    name: "Claw swipe",
    desc: "Three claw marks rake down one after another, white-hot, cooling through orange to red, then close up from both ends and leave a dotted scar, with hot flecks and drips.",
    tags: ["melee", "claw", "swipe", "beast", "scratch", "combat", "directional", "one-shot"],
    size: [128, 96],
    origin: [36, 84],
    duration: 0.9,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a0808", "#5c0f12", "#a51d1d", "#e2401f", "#ff8a2a", "#ffd166", "#fff3c4", "#ffffff"],
      sparks: ["#fff3c4", "#ffd166", "#ff8a2a", "#c42a1a"],
      seed: 8
    }
  };
  var READY_ = { ...READY, weapon: "claw", offWeapon: "claw", sa: -0.4, sb: -0.9, crouch: 5, lean: 3, fx: 14, fy: -21, bx: 8, by: -25, ffx: 9, fbx: -8 };
  var HIGH3 = { ...READY_, x: -6, crouch: 4, lean: -3, fx: 3, fy: -41, sa: -1.4, bx: 7, by: -18, sb: -0.3, ffx: 10 };
  var act10 = {
    target: { x: 58 },
    poses: [
      [-0.46, { ...READY_, x: -6 }],
      [-0.2, HIGH3],
      [-0.05, { ...HIGH3, crouch: 5 }],
      [0, { ...READY_, x: 0, crouch: 3, lean: 4, fx: 19, fy: -36, sa: -0.9, bx: -7, by: -24, ghost: 1 }, "snap"],
      [0.05, { ...READY_, x: 2, crouch: 5, lean: 6, fx: 23, fy: -24, sa: 0.5, bx: -7, by: -24, ffx: 13, fbx: -10, toeB: true }, "snap"],
      [0.1, { ...READY_, x: 3, crouch: 7, lean: 7, fx: 22, fy: -12, sa: 1.2, bx: -7, by: -24, ffx: 13, fbx: -10, toeB: true }, "snap"],
      [0.42, { ...READY_, x: 3, crouch: 6, lean: 5, fx: 21, fy: -13, sa: 1.1, bx: -6, by: -22, ffx: 13, fbx: -10 }],
      [0.9, { ...READY_, x: -6 }]
    ],
    hits: [
      { t: 0.04, stop: 0.03, push: 0.9, straw: 5, y: -30, flash: 0.03 },
      { t: 0.08, stop: 0.03, push: 0.9, straw: 5, y: -26, flash: 0.03 },
      { t: 0.12, stop: 0.08, shake: 0.14, amp: 2, push: 1.4, straw: 9, y: -18 }
    ],
    dust: [{ t: 0.1, x: 12, n: 6, dir: 1 }]
  };
  var RAKE = 0.05;
  var STAGGER = 0.04;
  var CLOSE0 = 0.16;
  var CLOSE = 0.3;
  function create13(o) {
    const C = fit(o.palette, 8), n = C.length, Rg = new Rng(o.seed), floor = () => 0;
    const ps = new Particles({ rng: Rg, ground: floor, sparks: o.sparks }), drips = new Bits({ ground: floor }), lights = new Lights();
    const marks = [0, 1, 2].map((i) => {
      const s = through(31 + i * 8, -23 + i * 2, 1.84, 1, 40, 0.84 - i * 0.05, 0.5);
      return { s, t0: i * STAGGER, W: 4.2 - i * 0.4, open: false, end: travel(s, s.span) };
    });
    let t = 0;
    const heatAt = (m) => clamp(1 - (t - m.t0) / 0.42);
    return {
      update(dt) {
        t += dt;
        for (const m of marks) {
          if (!m.open && t >= m.t0 + RAKE * 0.7) {
            m.open = true;
            lights.add(m.end.x, m.end.y - 6, 34, C[4], 0.45, 0.3);
            for (let i = 0; i < 7; i++) {
              const a = Math.atan2(m.end.dy, m.end.dx) + Rg.range(-0.5, 0.5), sp = Rg.range(110, 260);
              ps.spawn(P.SPARK, m.end.x, m.end.y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.32));
            }
            for (let i = 0; i < 5; i++) {
              const [x, y] = onSwing(m.s, m.s.R, m.s.span * Rg.range(0.15, 0.9));
              ps.spawn(P.MOTE, x, y, Rg.range(-60, -10), Rg.range(-30, 30), Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : C[4], 0.5);
            }
            for (let i = 0; i < 2; i++) {
              const [x, y] = onSwing(m.s, m.s.R - 1, m.s.span * Rg.range(0.35, 0.75));
              drips.add({ kind: B.DRIP, x, y, vx: Rg.range(-8, 8), vy: Rg.range(10, 40), g: 0.55, life: 1.2, c: C[3] });
            }
          }
        }
        drips.update(dt);
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        for (const m of marks) {
          const u = t - m.t0;
          if (u < 0) continue;
          const S = m.s.span, head4 = S * ease.outExpo(clamp(u / RAKE)), c = smooth(CLOSE0, CLOSE0 + CLOSE, u), lo = S / 2 * c, hi = Math.min(head4, S - S / 2 * c);
          const heat = heatAt(m);
          if (hi - lo > 0.02) {
            smear(p, m.s, lo, hi, m.W, (uu, r, out) => {
              const v = uu / S, w = m.W * Math.pow(Math.sin(Math.PI * v), 1.15) * (1 - 0.55 * c), off = Math.abs(r - (m.s.R - m.W / 2)) / (w / 2 + 0.01);
              if (w < 0.5 || off > 1) return;
              const ci = Math.round((1 - heat) * 5.2 + off * 1.6 + (head4 < S ? (S - uu) / S : 0) * 0.5);
              out.c = C[n - 1 - clamp(ci, 0, n - 2)];
            }, 0, 2);
            glowAlong(p, m.s, m.s.R - m.W / 2, lo, hi, 11, C[4], 0.42 * heat * heat, 0, 0.2);
          }
          const k = 0.8 * (1 - clamp((u - CLOSE0 - CLOSE * 0.5) / 0.4));
          if (c > 0.05 && k > 0) {
            trace(p, m.s, m.s.R - m.W / 2, 0.04 * S, lo, C[2], k);
            trace(p, m.s, m.s.R - m.W / 2, S - lo, 0.96 * S, C[2], k);
          }
          const g = u - RAKE * 0.4;
          if (g > 0 && g < 0.16) sparkle(p, m.end.x, m.end.y, 5 * ease.outBack(Math.min(1, g / 0.04)) * (1 - g / 0.16), C[6], C[4], 0.4);
        }
        drips.draw(p);
        ps.draw(p);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/melee/thrust.js
  var thrust_exports = {};
  __export(thrust_exports, {
    act: () => act11,
    create: () => create14,
    meta: () => meta16
  });
  var meta16 = {
    name: "Thrust",
    desc: "A piercing stab: a bundle of streaks shoots out from the hand to a point, a long four-point star flares at the tip with a pierce ring, sparks and speed lines.",
    tags: ["melee", "thrust", "stab", "spear", "rapier", "pierce", "combat", "directional", "one-shot"],
    size: [196, 76],
    origin: [34, 62],
    duration: 0.75,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a1608", "#6b3c10", "#b8701a", "#f0b42e", "#ffe27a", "#fff6cf", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      reach: 66,
      seed: 4
    }
  };
  var STANCE2 = { ...READY, weapon: "sword", x: -14, fx: 12, fy: -21, sa: -0.3 };
  var BACK = { ...STANCE2, crouch: 5, lean: -3, fx: -3, fy: -19, sa: -0.05, bx: 8, by: -30, armsFront: true, ffx: 10, fbx: -8 };
  var LUNGE = { ...STANCE2, crouch: 6, lean: 6, fx: 23, fy: -20, sa: 0, bx: -8, by: -24, ffx: 15, fbx: -11, toeB: true };
  var act11 = {
    target: { x: 80 },
    poses: [
      [-0.46, STANCE2],
      [-0.24, BACK],
      [-0.05, { ...BACK, crouch: 6, fx: -5 }],
      [0, { ...LUNGE, ghost: 1 }, "snap"],
      [0.07, LUNGE, "snap"],
      [0.3, { ...LUNGE, crouch: 5, lean: 5 }],
      [0.7, STANCE2]
    ],
    hits: [{ t: 0.07, stop: 0.12, shake: 0.14, amp: 2, push: 2.8, straw: 16, y: -26 }],
    dust: [{ t: 0, x: -24, n: 6, dir: -1 }, { t: 0.07, x: 1, n: 6, dir: 1 }]
  };
  var OUT2 = 0.07;
  var HOLD2 = 0.06;
  var PULL = 0.2;
  function longStar(p, x, y, L, k, C) {
    if (L < 1) return;
    const arms = [[1, 0, L], [-1, 0, L * 0.7], [0, -1, L * 0.42], [0, 1, L * 0.42]];
    for (const [dx, dy, len2] of arms)
      for (let d = 1; d <= len2; d += 0.5) {
        const u = d / len2, c = u < 0.3 ? WHITE : u < 0.65 ? C[5] : C[4];
        p.dot(x + dx * d, y + dy * d, c, u < 0.7 ? 1 : 1 - (u - 0.7) / 0.35);
        if (u < 0.25 && len2 > 6) p.dot(x + dx * d - dy, y + dy * d + dx, C[5]), p.dot(x + dx * d + dy, y + dy * d - dx, C[5]);
      }
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let d = 1; d <= Math.min(3, L * 0.14); d++) p.px(x + dx * d, y + dy * d, d < 2 ? C[5] : C[4]);
    p.px(x, y, WHITE);
    p.glow(x, y, 6 + L * 1.3, C[4], 0.35 * k);
    p.glow(x, y, 3 + L * 0.4, WHITE, 0.3 * k);
  }
  function create14(o) {
    const C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights();
    const HX = 9, HY = -20, TX = HX + o.reach, TY = HY;
    const streaks = [-7, -4, -2, 0, 2, 4, 7].map((off) => ({ off, x0: HX + 1 + Rg.range(0, 5) + Math.abs(off) * 0.6, t0: Rg.range(0, 0.02) + Math.abs(off) * 3e-3, w: off === 0 ? 2 : 1, hot: off === 0, len: Rg.range(0.75, 1) }));
    const lines = [];
    let t = 0, struck = false;
    return {
      update(dt) {
        t += dt;
        if (t < OUT2 + 0.08 && Rg.chance(0.5)) {
          const s = Rg.sign();
          lines.push({ x: HX + Rg.range(0, o.reach * 0.6), y: HY + s * Rg.range(7, 17), l: Rg.range(18, 42), v: Rg.range(200, 340), t });
        }
        for (let i = lines.length - 1; i >= 0; i--) if (t - lines[i].t > 0.24) lines.splice(i, 1);
        for (const l of lines) l.x += l.v * dt;
        if (!struck && t >= OUT2) {
          struck = true;
          lights.add(TX, TY, 44, C[4], 0.45, 0.3);
          lights.add(TX, TY, 14, WHITE, 0.6, 0.06);
          for (let i = 0; i < 12; i++) {
            const a = Rg.range(-0.55, 0.45), sp = Rg.range(150, 330);
            ps.spawn(P.SPARK, TX, TY, Math.cos(a) * sp, Math.sin(a) * sp - 30, Rg.range(0.12, 0.35));
          }
          for (let i = 0; i < 10; i++) {
            const a = Rg.range(-0.9, 0.9) + (Rg.chance(0.3) ? Math.PI : 0), sp = Rg.range(40, 120);
            ps.spawn(P.MOTE, TX + Rg.range(-6, 2), TY + Rg.range(-2, 2), Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : C[4], 0.6);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.STAR, TX + Rg.range(-10, 8), TY + Rg.range(-9, 9), 0, -3, Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1, 2), Rg.range(0.06, 0.2));
        }
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        if (t < 0.05) sparkle(p, HX + 2, HY, 5 * (1 - t / 0.05) + 1, C[5], C[3], 0.4);
        for (const l of lines) {
          const k = (t - l.t) / 0.24;
          for (let d = 0; d < l.l * (1 - k * 0.6); d++) p.dot(l.x - d, l.y, d < 3 ? WHITE : d < l.l * 0.4 ? C[5] : C[3], (1 - d / l.l) * (1 - k));
        }
        const pull = smooth(OUT2 + HOLD2, OUT2 + HOLD2 + PULL, t);
        for (const s of streaks) {
          const u = clamp((t - s.t0) / OUT2), head4 = ease.outExpo(u);
          if (u <= 0 || pull >= 1) continue;
          const y0 = HY + s.off, end = s.x0 + (TX - s.x0) * s.len, x1 = s.x0 + (end - s.x0) * head4, xa = s.x0 + (end - s.x0) * Math.max(pull, head4 * 0.35 * (1 - s.len) * 3);
          const yAt = (x) => y0 + (TY - y0) * clamp((x - s.x0) / (TX - s.x0)) * 0.85;
          for (let x = xa; x <= x1; x += 0.5) {
            const v = (x - xa) / Math.max(1, x1 - xa), c = v > 0.88 ? WHITE : s.hot ? v > 0.35 ? C[6] : C[5] : v > 0.55 ? C[5] : v > 0.25 ? C[4] : C[3];
            p.dot(x, yAt(x), c, v < 0.12 ? v / 0.12 : 1);
            if (s.w > 1 && v > 0.1) p.dot(x, yAt(x) + 1, v > 0.6 ? C[5] : C[3], v < 0.2 ? v / 0.2 : 1);
          }
        }
        if (t < OUT2 + HOLD2 + PULL) p.glowLine(HX + (TX - HX) * pull, HY, HX + (TX - HX) * ease.outExpo(clamp(t / OUT2)), TY, 6, C[4], 0.22 * (1 - pull));
        const q = t - OUT2;
        if (q >= 0 && q < 0.4) {
          const g = ease.outBack(clamp(q / 0.04), 2.4) * (1 - smooth(0.08, 0.4, q)) * (1 + 0.12 * Math.sin(q * 70));
          longStar(p, TX, TY, 24 * g, 1 - q / 0.4, C);
        }
        if (q >= 0 && q < 0.2) {
          const k = q / 0.2, rx = 2 + 7 * ease.outCubic(k), ry = 4 + 12 * ease.outCubic(k);
          for (let a = 0; a < TAU; a += 0.05) p.dot(TX + 4 + 10 * k + Math.cos(a) * rx, TY + Math.sin(a) * ry, k < 0.3 ? WHITE : C[5], 1.15 - k);
        }
        ps.draw(p);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/src/fx/status/cursed.js
  var cursed_exports = {};
  __export(cursed_exports, {
    act: () => act12,
    draw: () => draw3,
    drawBack: () => drawBack3,
    meta: () => meta17
  });
  var meta17 = {
    name: "Cursed",
    desc: "Hexed: violet smoke rises off the body in winding trails, a dark stain creeps up from the feet with a glowing edge, the eyes burn, a skull glitches in overhead.",
    tags: ["status", "curse", "hex", "dark", "debuff", "shadow", "loop"],
    size: [64, 84],
    origin: [32, 76],
    duration: 2.4,
    loop: true,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: ["#0c0612", "#1f0f2e", "#3a1a55", "#5e2a85", "#8a3fc0", "#b86ef0", "#e0b0ff", "#ffffff"], seed: 9 }
  };
  var HUNCH = { turn: 1, crouch: 4, lean: 3, hy: 1, fx: -7, fy: -33, bx: 8, by: -33, ffx: -3, fbx: 4 };
  var act12 = {
    onBody: true,
    poses: [[0, HUNCH], [0.6, { ...HUNCH, crouch: 5 }], [1.2, { ...HUNCH, lean: 2 }], [1.8, { ...HUNCH, crouch: 5 }], [2.4, HUNCH]]
  };
  var D2 = meta17.duration;
  var SKULL = bitmap([
    "...#####...",
    ".#########.",
    "###########",
    "##eee#eee##",
    "##eEe#eEe##",
    "##eee#eee##",
    "#####.#####",
    ".####.####.",
    "..#######..",
    "..#.#.#.#..",
    "...#####..."
  ]);
  var IN = 0.5;
  var HOLD3 = 0.75;
  var OUT3 = 1.85;
  var GONE = 2.1;
  var tide = (t) => 0.3 + 0.12 * Math.sin(t / D2 * TAU);
  var reach = (x, t, seed) => tide(t) + 0.13 * tileFbm(x * 0.35, t / D2 * 4, 0, 4, seed, 2);
  function trails(p, C, a, S, t, seed, front) {
    const spots2 = [[0.12, -1], [0.1, 1], [0.5, -1], [0.48, 1]];
    spots2.forEach(([q, side], j) => {
      var _a;
      if (j % 2 === 0 !== front) return;
      const my = Math.round(S.h * q), [l, r] = (_a = S.rows[my]) != null ? _a : [0, 0];
      const x0 = a.x + (side < 0 ? l : r + 1), y0 = a.y + my, life = 1.6, n = 18;
      for (let i = n - 1; i >= 0; i--) {
        const age = ((t - i / n * D2 - j * 0.37) % D2 + D2) % D2, tb = t - age, u = age / life;
        if (u >= 1) continue;
        const sway = Math.sin(tb / D2 * TAU * 2 + j * 1.7) * 4 * Math.min(1, u * 1.6);
        const x = x0 + side * u * 7 + sway + (rand(i, j, 71) - 0.5) * 2.5 * u, y = y0 - age * 19 - 5 * u * u;
        const rad = (1.3 + 3.6 * (1 - Math.pow(1 - u, 3))) * (0.7 + 0.6 * rand(i, j, 72)), k = smooth(0, 0.12, u) * (1 - smooth(0.45, 1, u)) * (front ? 0.5 : 0.62);
        const c = mix(rand(i, j, 70) < 0.5 ? C[4] : mix(C[4], C[3], 0.4), C[1], u * 0.85);
        p.disc(x, y, rad * 1.08, c, k * 0.4);
        p.disc(x + rad * 0.05, y + rad * 0.08, rad * 0.76, c, k * 0.55);
        p.disc(x - rad * 0.22, y - rad * 0.3, rad * 0.48, mix(c, C[6], 0.25), k * 0.38 * (1 - u * 0.6));
        if (i % 3 === 0) p.glow(x, y, rad * 1.6, C[4], 0.08 * k);
      }
    });
  }
  function drawBack3(p, t, o) {
    const C = fit(o.palette, 8), a = o.actor, S = shape(a);
    const [fl, fr] = S.rows[S.h - 1], cx = a.x + (fl + fr + 1) / 2, rx = (fr - fl) / 2 + 7 + 2 * Math.sin(t / D2 * TAU);
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const q = Math.abs(x + 0.5 - cx) / rx, n = rand(x, 31);
      if (q > 1 + n * 0.12) continue;
      p.px(x, 0, q > 0.8 ? C[4] : n < 0.2 ? C[3] : C[2]);
      if (q < 0.85) p.px(x, 1, C[1]);
      if (q < 0.55 && n < 0.7) p.px(x, 2, C[1]);
    }
    p.shade(cx - rx - 6, -4, cx + rx + 6, 5, (x, y, out) => {
      const d = Math.hypot((x - cx) / (rx + 6), y / 4);
      if (d < 1) out.l = C[4], out.k = 0.2 * (1 - d) * (1 - d);
    });
    trails(p, C, a, S, t, o.seed, false);
  }
  function draw3(p, t, o) {
    const C = fit(o.palette, 8), a = o.actor, S = shape(a), H = S.h;
    for (const [mx, my] of S.body) {
      const c = colorAt(a, mx, my), up = 1 - (my + 0.5) / H, lv = reach(mx, t, o.seed);
      if (up > lv + 0.035) continue;
      const x = a.x + mx, y = a.y + my;
      if (up > lv - 0.02) p.px(x, y, C[6]);
      else if (up > lv - 0.06) p.px(x, y, C[4]);
      else p.px(x, y, mix(C[1], C[3], clamp(luma(c) * 1.6)));
    }
    for (let mx = 0; mx < S.w; mx++) {
      const lv = reach(mx, t, o.seed), my = Math.floor((1 - lv) * H);
      if (S.on(mx, my)) p.glow(a.x + mx, a.y + my, 4, C[5], 0.14);
    }
    for (const e of eyes(a)) {
      for (const [x, y] of e.px) p.px(a.x + x, a.y + y, y === e.y0 ? C[7] : C[5]);
      p.glow(a.x + (e.x0 + e.x1 + 1) / 2, a.y + (e.y0 + e.y1 + 1) / 2, 5, C[5], 0.4);
    }
    trails(p, C, a, S, t, o.seed, true);
    if (t >= IN && t < GONE) {
      const glitch = t < HOLD3 ? 1 - (t - IN) / (HOLD3 - IN) : t > OUT3 ? (t - OUT3) / (GONE - OUT3) : 0;
      const f = Math.floor(t * 30), on = glitch < 0.15 || rand(f, 3) > glitch * 0.6;
      const x = 0, y = a.y - 12 + Math.sin(t / D2 * TAU * 2) * 1.2;
      if (on) {
        const tear = (dx, dy) => {
          const row = dy + 6, shift = glitch > 0 && rand(f, row >> 1, 7) < glitch * 0.8 ? Math.round((rand(f, row, 9) - 0.5) * 6 * glitch) : 0;
          return SKULL(dx - shift, dy);
        };
        if (glitch > 0) {
          icon(p, x - 2, y, 7, tear, [0, C[2], C[2], C[3]], 0.7 * glitch);
          icon(p, x + 2, y, 7, tear, [0, C[6], C[6], C[6]], 0.5 * glitch);
        }
        icon(p, x, y, 8, tear, [C[0], C[4], C[6], C[7]], 1, { e: C[0], E: C[7] });
        p.glow(x - 3, y - 1, 5, C[5], 0.6);
        p.glow(x + 3, y - 1, 5, C[5], 0.6);
        p.glow(x, y, 16, C[4], 0.24 + 0.3 * glitch);
      }
      if (glitch > 0.1)
        for (let k = 0; k < 3; k++) {
          const ly = y - 5 + Math.floor(rand(f, k, 11) * 11), lx = Math.round((rand(f, k, 12) - 0.5) * 10), len2 = 3 + Math.floor(rand(f, k, 13) * 8);
          p.line(lx - len2 / 2, ly, lx + len2 / 2, ly, k % 2 ? C[6] : C[4], glitch);
        }
    }
    p.glow(0, a.y + H * (1 - tide(t)), 24, C[4], 0.2);
    p.glow(0, a.y + H * 0.45, 30, C[3], 0.12);
  }

  // vendor/pixelfx/src/fx/shadow/shadow-tendrils.js
  var shadow_tendrils_exports = {};
  __export(shadow_tendrils_exports, {
    create: () => create15,
    meta: () => meta18
  });

  // vendor/pixelfx/src/fx/shadow/_lib.js
  var VOID = ["#06040b", "#150c26", "#2a1150", "#461a84", "#6f2cc0", "#9d5cec", "#cfa6ff", "#f6eaff"];
  var PK = { FLAME: 0, SOOT: 1 };
  var Puffs = class {
    constructor(o) {
      var _a;
      this.R = o.rng;
      this.list = [];
      this.t = 0;
      this.F = ramp(o.flame);
      this.soot = ramp(o.soot);
      this.cap = hex(o.cap);
      this.rim = ramp(o.rim);
      this.floor = (_a = o.floor) != null ? _a : null;
    }
    spawn(k, x, y, vx, vy, life, size, delay = 0, smokes = false) {
      this.list.push({ k, x, y, vx, vy, life, max: life, size, delay, smokes, seed: this.R.next() * 100 });
    }
    get count() {
      return this.list.length;
    }
    update(dt) {
      this.t += dt;
      const t = this.t;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const q = this.list[i];
        if (q.delay > 0) {
          q.delay -= dt;
          continue;
        }
        if ((q.life -= dt) <= 0) {
          if (q.k === PK.FLAME && q.smokes) this.spawn(PK.SOOT, q.x, q.y - 1, q.vx * 0.5, q.vy * 0.5 - 6, this.R.range(0.9, 1.6), q.size * 1.25);
          this.list.splice(i, 1);
          continue;
        }
        if (q.k === PK.FLAME) {
          q.vy -= 95 * dt;
          q.vx += Math.sin(t * 17 + q.seed) * 30 * dt;
          q.vx -= q.vx * 5 * dt;
          q.vy -= q.vy * 3.2 * dt;
        } else {
          q.vy -= 18 * dt;
          q.vx += Math.sin(t * 1.3 + q.seed) * 8 * dt;
          q.vx -= q.vx * 1.6 * dt;
          q.vy -= q.vy * 1.3 * dt;
        }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (this.floor && q.k === PK.SOOT) {
          const f = this.floor(q.x) - q.size * 0.6;
          if (q.y > f) q.y = f, q.vy = Math.min(0, q.vy), q.vx *= 1 - 2 * dt;
        }
      }
    }
    draw(p, kind, light = null) {
      const F = this.F, n = F.length;
      for (const q of this.list) {
        if (q.delay > 0 || q.k !== kind) continue;
        const k = q.life / q.max, age = 1 - k, x = q.x, y = q.y;
        if (q.k === PK.FLAME) {
          const heat = Math.min(0.999, Math.pow(age, 0.62) + q.seed % 1 * 0.1), idx = Math.min(n - 2, Math.floor(heat * (n - 1)));
          const r2 = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = F[idx];
          if (idx >= n - 3) p.disc(x, y, r2, c, Math.min(1, k * 3) * 0.8);
          else {
            p.circle(x, y, r2, F[Math.min(n - 1, idx + 2)]);
            p.circle(x - r2 * 0.16, y - r2 * 0.22, r2 * 0.78, c);
            if (r2 > 1.6) p.circle(x, y - r2 * 0.9, r2 * 0.42, c);
            if (idx <= 3 && r2 > 1.8) p.circle(x - r2 * 0.28, y - r2 * 0.34, r2 * 0.36, F[Math.max(0, idx - 1)]);
            if (idx < 6) p.glow(x, y, r2 * 2.4 + 2, c, 0.2 * k);
          }
          continue;
        }
        const r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.45);
        const a = Math.min(1, age * 10) * Math.min(1, k * 2.2) * 0.72, body = mix(this.soot[0], this.soot[1], age);
        const edge = a * 0.5, core = 1 - (1 - a * 0.5) * (1 - a * 0.62);
        p.disc(x, y + r * 0.06, r, body, (d) => d < 0.72 ? core : edge);
        const lk = light ? light.k : 0;
        if (lk < 0.5) p.disc(x - r * 0.2, y - r * 0.32, r * 0.48, this.cap, a * 0.32 * (1 - age * 0.7) * (1 - lk * 2));
        if (lk <= 0.02) continue;
        const lx = light.x - x, ly = light.y - y, dl = Math.sqrt(lx * lx + ly * ly) || 1, ux = lx / dl, uy = ly / dl;
        const lit = Math.min(1, light.k * clamp(1.3 - dl / light.reach)) * a;
        if (lit <= 0.02) continue;
        const [hot, warm, dim] = this.rim;
        p.disc(x + ux * r * 0.26, y + uy * r * 0.26, r * 0.72, dim, lit * 0.55);
        p.disc(x + ux * r * 0.5, y + uy * r * 0.5, r * 0.46, warm, lit * 0.5);
        if (r > 3) p.disc(x + ux * r * 0.68, y + uy * r * 0.68, r * 0.24, hot, lit * 0.4);
      }
    }
  };
  var Drops = class {
    constructor(o = {}) {
      var _a, _b, _c;
      this.list = [];
      this.floor = (_a = o.floor) != null ? _a : (() => 0);
      this.onLand = (_b = o.onLand) != null ? _b : null;
      this.g = (_c = o.g) != null ? _c : 0.8;
    }
    add(x, y, vx, vy, size = 1) {
      this.list.push({ x, y, vx, vy, size });
    }
    update(dt) {
      var _a;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const d = this.list[i];
        d.vy += GRAVITY * this.g * dt;
        d.vx -= d.vx * 0.4 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const f = this.floor(d.x);
        if (d.vy > 0 && d.y >= f) {
          (_a = this.onLand) == null ? void 0 : _a.call(this, d.x, f, d.vy, d.size);
          this.list.splice(i, 1);
        }
      }
    }
    draw(p, body, shine) {
      for (const d of this.list) {
        const up = d.vy < 0;
        p.px(d.x, d.y, body);
        if (d.size > 1.4) p.px(d.x, d.y + (up ? 1 : -1), body);
        p.px(d.x, d.y - (d.size > 1.4 && !up ? 1 : 0), shine);
      }
    }
  };
  function floorPool(p, C, rx, t, ripples) {
    if (rx < 1) return;
    const ry = rx * 0.17 + 0.6;
    p.shade(-rx - 3, -ry - 2, rx + 3, ry + 2, (x, y) => {
      const dx = x / rx, dy = (y - 0.5) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1.18) return;
      if (d > 1) {
        if (dy < 0 && d < 1.09) return Math.abs(dx) < 0.55 ? C[6] : Math.abs(dx) < 0.85 ? C[5] : C[4];
        if (dy >= 0 && d < 1.09) return C[2];
        return y > -0.5 && noise(x * 0.7, 9) > 0.15 ? C[1] : void 0;
      }
      for (const r of ripples) {
        const age = t - r.t0, rr = age * 46 * r.w + 1, ex = x - r.x, ey = (y - 0.5) / 0.17, e = Math.sqrt(ex * ex + ey * ey) || 1;
        const g = Math.sqrt(ex * ex + (ey / 0.17) ** 2) / e;
        if (Math.abs(e - rr) < 0.55 * g && age < r.life) return age < r.life * 0.5 ? C[4] : C[3];
      }
      if (dy < -0.55 && dy > -0.85 && noise(x * 0.25 + t * 1.3, 4) > 0.2) return noise(x * 0.6 - t * 2, 6) > 0.55 ? C[5] : C[2];
      if (dy < -0.35 && d > 0.72) return d > 0.9 ? C[3] : C[2];
      return d > 0.86 ? C[1] : C[0];
    });
  }

  // vendor/pixelfx/src/fx/shadow/shadow-tendrils.js
  var meta18 = {
    name: "Shadow tendrils",
    desc: "A dark pool opens on the floor; tentacles with lit rims and hooked tips lash up out of it with a splash, writhe, and sink back as it closes.",
    tags: ["shadow", "tentacle", "tendril", "ground", "dark", "magic", "one-shot"],
    size: [208, 130],
    origin: [104, 106],
    duration: 3.2,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: VOID, seed: 3 }
  };
  var RX = 40;
  var OPEN = 0.34;
  var SHUT = 2.5;
  var SINK = 0.5;
  var LX2 = -0.6;
  var LY2 = -0.8;
  function spine(T, t) {
    const e = clamp((t - T.t0) / 0.2), s1 = clamp((t - T.t1) / SINK);
    if (e <= 0 || s1 >= 1) return null;
    const lift = 0.07 * Math.sin(Math.PI * clamp(s1 / 0.3)), down = ease.inOutCubic(clamp((s1 - 0.12) / 0.88));
    const rise = ease.outBack(e, 1.8) * (1 + lift) * (1 - down), hidden = (1 - rise) * T.L;
    const writhe = T.A * (0.25 + 0.75 * smooth(T.t0 + 0.08, T.t0 + 0.5, t));
    const hook = (0.04 + T.H * ease.outBack(clamp((t - T.t0 - 0.1) / 0.32), 2.5)) * (1 + 0.5 * s1) * (1 + 0.18 * Math.sin(t * 2.3 + T.ph));
    let lean = T.lean + 0.12 * Math.sin(t * 1.6 + T.ph);
    if (T.whip) lean += T.whip.a * Math.exp(-(((t - T.whip.t) / 0.14) ** 2));
    let th = -Math.PI / 2 + lean, x = T.x - Math.cos(th) * hidden, y = T.y - Math.sin(th) * hidden;
    const pts = [], n = Math.ceil(T.L / 0.5);
    for (let i = 0; i <= n; i++) {
      const s = i * 0.5, u = s / T.L;
      pts.push({ x, y, th, w: T.W * Math.pow(1 - u, 0.75) + 0.45, u, s });
      th += 0.5 * (writhe * Math.sin(s / T.lam * TAU - T.om * t + T.ph) + T.curl * hook * smooth(0.58, 1, u));
      x += Math.cos(th) * 0.5;
      y += Math.sin(th) * 0.5;
    }
    return pts;
  }
  function tentacle(p, T, pts, C, t) {
    const surf = T.y;
    for (const q of pts) {
      if (q.y > surf) continue;
      const nx = -Math.sin(q.th), ny = Math.cos(q.th), ks = nx * LX2 + ny * LY2 >= 0 ? 1 : -1;
      for (let v = -q.w; v <= q.w; v += 0.5) {
        const x = q.x + nx * v, y = q.y + ny * v;
        const u = v / q.w * ks;
        if (y <= surf) p.px(x, y, u > 0.55 ? C[2] : u > -0.45 ? C[1] : C[0]);
      }
    }
    const pulse = (t - T.t0) * 150, slow = (t - T.t0) * 55 % (T.L * 1.8) - 4;
    for (const q of pts) {
      if (q.y > surf) continue;
      const nx = -Math.sin(q.th), ny = Math.cos(q.th), f = nx * LX2 + ny * LY2, ks = f >= 0 ? 1 : -1;
      const lit = ks * q.w, x0 = q.x + nx * lit, y0 = q.y + ny * lit, x1 = q.x - nx * lit, y1 = q.y - ny * lit;
      if (y1 <= surf) p.px(x1, y1, C[3]);
      if (y0 <= surf) p.px(x0, y0, Math.abs(f) > 0.8 && q.u > 0.15 ? C[7] : q.u > 0.85 ? C[6] : Math.abs(f) > 0.3 ? C[6] : C[5]);
      if (q.u > 0.62 && q.u < 0.93 && q.s % 3 < 0.5) p.px(q.x + nx * T.curl * q.w * 0.45, q.y + ny * T.curl * q.w * 0.45, C[4]);
      const dp = Math.min(Math.abs(q.s - pulse), Math.abs(q.s - slow) * 1.6);
      if (dp < 2.5) p.px(q.x, q.y, dp < 1 ? C[7] : C[5]);
    }
    const tip = pts[pts.length - 1];
    if (tip.y <= surf) {
      p.px(tip.x, tip.y, WHITE);
      p.glow(tip.x, tip.y, 6, C[6], 0.25);
    }
    for (let i = 0; i < pts.length; i += 8) if (pts[i].y < surf) p.glow(pts[i].x, pts[i].y, 9, C[4], 0.1);
    const pq = pts[Math.min(pts.length - 1, Math.max(0, Math.round(pulse * 2)))];
    if (pulse < T.L && pq.y < surf) p.glow(pq.x, pq.y, 10, C[6], 0.45);
    const base = pts.find((q) => q.y <= surf);
    if (base) {
      const w = base.w + 1.5;
      p.line(base.x - w, surf, base.x + w, surf, C[5]);
      p.px(base.x - w - 1, surf + 0.5, C[3]);
      p.px(base.x + w + 1, surf + 0.5, C[3]);
    }
  }
  function create15(o) {
    const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
    const DIM = [C[0], C[0], C[1], C[1], C[3], C[4], C[5], C[6]];
    const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[4] });
    const puffs = new Puffs({ rng: R, flame: [C[7], C[6], C[5], C[4], C[3], C[2], C[1], C[1], C[0]], soot: [mix(C[3], C[2], 0.55), mix(C[2], C[1], 0.5)], cap: mix(C[4], C[2], 0.5), rim: [C[6], C[5], C[4]], floor });
    const ripples = [], splats = [], lights = [];
    let t = 0, acc = 0;
    const rx = (tt) => RX * ease.outCubic(clamp(tt / OPEN)) * (1 - ease.inCubic(clamp((tt - SHUT) / 0.45)));
    const inPool = (x, tt) => Math.abs(x) < rx(tt) * 0.95;
    const drops = new Drops({
      onLand: (x, y, v, s) => {
        if (inPool(x, t)) ripples.push({ x, t0: t, life: 0.5, w: 0.6 });
        else splats.push({ x, t0: t, s });
      }
    });
    const rows = [[-22, -2.5], [-8, -3], [7, -3], [21, -2.5], [-28, 2.5], [-1, 3], [27, 2.5]];
    const order = [3, 0, 5, 2, 4, 1, 6], last = [1, 5, 0, 6, 3, 2, 4];
    const tents = rows.map(([x, y], i) => {
      const back = y < 0, sx = Math.sign(x) || 1;
      return {
        x: x + R.range(-3, 3),
        y,
        back,
        L: back ? R.range(46, 62) : R.range(32, 46),
        W: back ? R.range(3.2, 4) : R.range(3.8, 4.6),
        lean: sx * (0.06 + Math.abs(x) / 120) + R.range(-0.06, 0.06),
        curl: R.chance(0.75) ? -sx : sx,
        lam: R.range(36, 50),
        om: R.range(4.5, 7) * R.sign(),
        ph: R.range(0, TAU),
        A: R.range(0.06, 0.085),
        H: R.range(0.15, 0.32),
        t0: 0.3 + order[i] * 0.045 + R.range(0, 0.03),
        t1: 1.5 + last[i] * 0.1 + R.range(0, 0.05),
        whip: R.chance(0.45) ? { t: R.range(0.9, 1.5), a: R.range(0.28, 0.45) * R.sign() } : null,
        up: false,
        down: false
      };
    });
    function splash(x, y, n, power) {
      for (let i = 0; i < n; i++) drops.add(x + R.range(-2, 2), y - 1, R.range(-70, 70) * power, -R.range(90, 230) * power, R.chance(0.4) ? 2 : 1);
      ripples.push({ x, t0: t, life: 0.7, w: 1 });
      lights.push({ x, y: y - 7, r: 30, k: 0.6 * power, life: 0.25, max: 0.25 });
    }
    return {
      update(dt) {
        var _a;
        t += dt;
        for (const T of tents) {
          if (!T.up && t >= T.t0) {
            T.up = true;
            splash(T.x, T.y, 12, 1);
            for (let i = 0; i < 4; i++) ps.spawn(P.SPARK, T.x, T.y - 2, R.range(-80, 80), -R.range(120, 260), R.range(0.2, 0.45));
          }
          if (!T.down && t >= T.t1 + SINK * 0.8) {
            T.down = true;
            splash(T.x, T.y, 6, 0.6);
          }
          if (t > T.t0 + 0.2 && t < T.t1 && R.chance(dt * 1.6)) {
            const pts = spine(T, t), q = pts && pts[Math.floor(R.range(0.3, 0.95) * pts.length)];
            if (q && q.y < T.y) ps.spawn(P.STAR, q.x - Math.sin(q.th) * q.w, q.y + Math.cos(q.th) * q.w, 0, -4, R.range(0.25, 0.5), C[6], R.range(1, 2.2));
          }
        }
        const r = rx(t);
        if (r > 8 && t < SHUT - 0.4) {
          for (acc += dt * 9; acc > 1; acc--) puffs.spawn(PK.SOOT, R.range(-0.8, 0.8) * r, -R.range(1, 4), R.range(-8, 8), -R.range(14, 30), R.range(0.6, 0.85), R.range(3, 6));
          if (R.chance(dt * 16)) ps.spawn(P.MOTE, R.range(-0.8, 0.8) * r, -2, R.range(-8, 8), -R.range(30, 80), R.range(0.5, 1), R.pick([C[7], C[6], C[6], C[5]]), R.range(0.6, 1.1));
          if (R.chance(dt * 5)) ps.spawn(P.EMBER, R.range(-0.8, 0.8) * r, -3, R.range(-10, 10), -R.range(20, 45), R.range(0.6, 1), C[6]);
          if (R.chance(dt * 3)) ripples.push({ x: R.range(-0.7, 0.7) * r, t0: t, life: 0.6, w: 0.5 });
          if (R.chance(dt * 7)) ps.spawn(P.VAPOUR, R.range(-0.7, 0.7) * r, -R.range(2, 8), R.range(-6, 6), -R.range(10, 22), R.range(0.6, 0.9), R.chance(0.5) ? C[3] : C[4], R.range(3, 6));
        }
        for (const a of [ripples, splats]) for (let i = a.length - 1; i >= 0; i--) if (t - a[i].t0 > ((_a = a[i].life) != null ? _a : 0.6)) a.splice(i, 1);
        for (let i = lights.length - 1; i >= 0; i--) if ((lights[i].life -= dt) <= 0) lights.splice(i, 1);
        drops.update(dt);
        puffs.update(dt);
        ps.update(dt);
      },
      drawBack(p) {
        const r = rx(t), k = r / RX;
        floorPool(p, C, r, t, ripples);
        if (k > 0) {
          p.glow(0, -16, 86, C[4], 0.22 * k);
          p.glow(0, -8, r * 1.7 + 12, C[4], 0.32 * k * (0.9 + 0.1 * Math.sin(t * 5)));
          p.glow(0, 0, r * 1.15, C[5], 0.18 * k);
        }
        puffs.draw(p, PK.SOOT, { x: 0, y: 6, k, reach: 70 });
        ps.draw(p, "back");
        for (const T of tents) if (T.back) {
          const pts = spine(T, t);
          if (pts) tentacle(p, T, pts, DIM, t);
        }
      },
      draw(p) {
        for (const T of tents) if (!T.back) {
          const pts = spine(T, t);
          if (pts) tentacle(p, T, pts, C, t);
        }
        drops.draw(p, C[1], C[5]);
        for (const s of splats) {
          const a = 1 - (t - s.t0) / 0.6;
          p.dot(s.x, -0.5, C[1], a * 1.5);
          p.dot(s.x + 1, -0.5, C[2], a);
          if (s.s > 1) p.dot(s.x - 1, -0.5, C[2], a);
          p.dot(s.x, -1.5, C[5], a);
        }
        ps.draw(p, "front");
        for (const l of lights) {
          const q = l.life / l.max;
          p.glow(l.x, l.y, l.r * (0.6 + 0.4 * q), C[5], l.k * q * q);
        }
      }
    };
  }

  // fx-pixel.js
  var EFFECTS = {
    "heavy-cleave": heavy_cleave_exports,
    "spark-beam": spark_beam_exports,
    electrified: electrified_exports,
    "zap-hit": zap_hit_exports,
    "sword-slash": sword_slash_exports,
    "double-slash": double_slash_exports,
    "scythe-reap": scythe_reap_exports,
    uppercut: uppercut_exports,
    "hammer-smash": hammer_smash_exports,
    "hit-spark": hit_spark_exports,
    "blunt-hit": blunt_hit_exports,
    "crit-hit": crit_hit_exports,
    "fire-ring": fire_ring_exports,
    burning: burning_exports,
    "claw-swipe": claw_swipe_exports,
    thrust: thrust_exports,
    cursed: cursed_exports,
    "shadow-tendrils": shadow_tendrils_exports
  };
  var STEP = 1 / 60;
  var SCALE = 2;
  var active = [];
  function spawn(id, { x, y, flip = false, delay = 0, scale: scale2 = SCALE, follow = null, advance = 0, ...options } = {}) {
    const mod = EFFECTS[id];
    if (!mod) return null;
    const [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin;
    if (typeof options.palette === "string") options.palette = PAL[options.palette];
    const fx = createFx(mod, { ...options, x: ox, y: oy });
    for (let t = 0; t < advance - 1e-6; t += STEP) fx.update(STEP);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d");
    const effect = {
      fx,
      frame: createFrame(w, h),
      canvas,
      g,
      image: g.createImageData(w, h),
      x,
      y,
      flip,
      delay,
      scale: scale2,
      ox,
      oy,
      w,
      h,
      follow,
      dirty: true,
      stop() {
        fx.stop();
      }
    };
    active.push(effect);
    return effect;
  }
  var actors = {};
  function actorOf(fighter) {
    const type = fighter.characterType, h = fighter.height;
    const key = `${type}:${h}`;
    if (actors[key]) return actors[key];
    const c = document.createElement("canvas");
    c.width = h;
    c.height = h;
    const g = c.getContext("2d");
    characterArt[type](g, h / 4, 0, h / 2, h, { spriteFrame: "idle", walkFrame: null });
    const all = new Uint32Array(g.getImageData(0, 0, h, h).data.buffer);
    let x0 = h, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) if (all[y * h + x] >>> 24) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    const w = x1 - x0 + 1, hh = y1 - y0 + 1, data = new Uint8Array(w * hh), pixels = new Uint32Array(w * hh);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
      const c32 = all[(y + y0) * h + x + x0];
      if (c32 >>> 24 > 128) {
        data[y * w + x] = 1;
        pixels[y * w + x] = c32 | 4278190080;
      }
    }
    const left = x0 - h / 2, top = y0 - h;
    return actors[key] = { mask: { w, h: hh, data }, pixels, x: left, y: top, w, h: hh, k: 2, head: [0, top], chest: [0, top + hh * 0.4] };
  }
  function update() {
    for (const e of active) {
      if (e.delay > 0) {
        e.delay--;
        continue;
      }
      if (e.follow) e.follow(e);
      e.fx.update(STEP);
      e.dirty = true;
    }
    for (let i = active.length - 1; i >= 0; i--) if (active[i].fx.done()) active.splice(i, 1);
  }
  function draw4(ctx) {
    for (const e of active) {
      if (e.delay > 0) continue;
      if (e.dirty) {
        clearFrame(e.frame);
        e.fx.draw(e.frame, "back");
        e.fx.draw(e.frame, "front");
        composite(e.frame, e.image.data, null);
        e.g.putImageData(e.image, 0, 0);
        e.dirty = false;
      }
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(e.x, e.y);
      if (e.flip) ctx.scale(-1, 1);
      ctx.drawImage(e.canvas, -e.ox * e.scale, -e.oy * e.scale, e.w * e.scale, e.h * e.scale);
      ctx.restore();
    }
  }
  function clear() {
    active.length = 0;
  }
  window.pixelFx = { spawn, update, draw: draw4, clear, actorOf };
})();
