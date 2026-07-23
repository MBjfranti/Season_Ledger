// The courtyard on a clock — continuous. Rather than snapping between a few
// palettes at fixed hours, we interpolate the whole palette smoothly across the
// day: deep night → a quick sunrise → midday → the long golden hour → dusk back
// into a lantern-lit night. Surfaces also gain a warm upward glow after dark, as
// if a little lantern sat behind each one. Follows the real clock, with a slider
// to wander the day for fun that then eases back to now.
import { ref } from "vue";

/* ── Palette anchors ───────────────────────────────────────────────────── */
const DAY = {
  "--bg": "#efe5d3", "--bg-raised": "#fdf8ee", "--panel": "#fbf5e8", "--panel-hover": "#f5ecda",
  "--panel-edge": "#e2d4ba", "--hairline": "#ece0ca", "--text": "#2c2016", "--text-2": "#584a38",
  "--text-3": "#6f6049", "--accent": "#a94e2b", "--accent-hover": "#8d3f20", "--on-accent": "#fdf6ea",
  "--win": "#4f6a2b", "--win-fill": "#5f7d3c", "--on-win": "#f7f4e6", "--draw": "#a1710a",
  "--draw-fill": "#c0891c", "--on-draw": "#2c2410", "--loss": "#b23a2c", "--loss-fill": "#bb3e2d",
  "--on-loss": "#fdf1ea", "--focus": "#2f8a99",
  "--win-soft": "rgba(95,125,60,0.13)", "--win-line": "rgba(95,125,60,0.40)",
  "--draw-soft": "rgba(192,137,28,0.15)", "--draw-line": "rgba(192,137,28,0.44)",
  "--loss-soft": "rgba(187,62,45,0.11)", "--loss-line": "rgba(187,62,45,0.36)",
  "--kit-edge": "rgba(74,52,28,0.14)",
  "--glass-fill": "rgba(255,251,244,0.55)", "--glass-stroke": "rgba(255,255,255,0.55)",
  "--glass-hi": "rgba(255,255,255,0.75)", "--glass-lo": "rgba(120,90,60,0.10)", "--glass-rim": "rgba(255,255,255,0.0)",
  _night: 0, _sun: [12, -8, 255, 245, 224, 0.92, 100, 2, 214, 150, 92, 0.16],
};
const DAWN = {
  "--bg": "#e7ddce", "--bg-raised": "#f7f0e4", "--panel": "#f3ebdd", "--panel-hover": "#ece1d0",
  "--panel-edge": "#dccdb6", "--hairline": "#e7dbc8", "--text": "#2f2319", "--text-2": "#5b4c3a",
  "--text-3": "#6e5f4a", "--accent": "#b1573a", "--accent-hover": "#97472b", "--on-accent": "#fdf6ea",
  "--win": "#516a2c", "--win-fill": "#617e40", "--on-win": "#f7f4e6", "--draw": "#986b0f",
  "--draw-fill": "#bb851f", "--on-draw": "#2c2410", "--loss": "#b23e30", "--loss-fill": "#bb4234",
  "--on-loss": "#fdf1ea", "--focus": "#2f8a99",
  "--win-soft": "rgba(97,126,64,0.13)", "--win-line": "rgba(97,126,64,0.40)",
  "--draw-soft": "rgba(187,133,31,0.15)", "--draw-line": "rgba(187,133,31,0.44)",
  "--loss-soft": "rgba(187,66,52,0.11)", "--loss-line": "rgba(187,66,52,0.36)",
  "--kit-edge": "rgba(74,52,28,0.13)",
  "--glass-fill": "rgba(247,240,228,0.50)", "--glass-stroke": "rgba(255,250,240,0.42)",
  "--glass-hi": "rgba(255,250,240,0.58)", "--glass-lo": "rgba(90,70,50,0.16)", "--glass-rim": "rgba(255,200,150,0.10)",
  _night: 0.12, _sun: [6, 10, 255, 229, 206, 0.82, 92, -8, 150, 178, 205, 0.16],
};
const GOLDEN = {
  "--bg": "#ecdcbe", "--bg-raised": "#fbf1db", "--panel": "#f8ecd4", "--panel-hover": "#f2e3c6",
  "--panel-edge": "#e0caa1", "--hairline": "#ecdbbc", "--text": "#2c1e12", "--text-2": "#584626",
  "--text-3": "#75603a", "--accent": "#a8461d", "--accent-hover": "#8b380f", "--on-accent": "#fdf5e6",
  "--win": "#556d2c", "--win-fill": "#647f3b", "--on-win": "#f8f4e2", "--draw": "#a5720a",
  "--draw-fill": "#c98f18", "--on-draw": "#2c2410", "--loss": "#b53a26", "--loss-fill": "#bf3f2a",
  "--on-loss": "#fdf1ea", "--focus": "#2c8794",
  "--win-soft": "rgba(100,127,59,0.14)", "--win-line": "rgba(100,127,59,0.42)",
  "--draw-soft": "rgba(201,143,24,0.16)", "--draw-line": "rgba(201,143,24,0.46)",
  "--loss-soft": "rgba(191,63,42,0.12)", "--loss-line": "rgba(191,63,42,0.38)",
  "--kit-edge": "rgba(74,46,22,0.16)",
  "--glass-fill": "rgba(255,247,232,0.52)", "--glass-stroke": "rgba(255,240,215,0.50)",
  "--glass-hi": "rgba(255,240,215,0.66)", "--glass-lo": "rgba(120,80,40,0.14)", "--glass-rim": "rgba(255,190,120,0.13)",
  _night: 0.22, _sun: [96, 24, 255, 200, 120, 0.40, 100, 72, 214, 120, 60, 0.22],
};
const NIGHT = {
  // The Barcelona cloister after dark: near-black shadow, warm lantern pools on
  // the walls. Deeper --bg for chiaroscuro; panels stay a lit honey-plaster so
  // they read as surfaces the lanterns catch, floating out of the dark.
  "--bg": "#150f0a", "--bg-raised": "#241b12", "--panel": "#2c2216", "--panel-hover": "#372a1b",
  "--panel-edge": "#4a3a27", "--hairline": "#3a2d1e", "--text": "#f6ecda", "--text-2": "#ddcbae",
  "--text-3": "#c3b296", "--accent": "#e79a5b", "--accent-hover": "#f2ab6d", "--on-accent": "#24110a",
  "--win": "#9dbd6a", "--win-fill": "#9dbd6a", "--on-win": "#16200c", "--draw": "#f0c25e",
  "--draw-fill": "#f0c25e", "--on-draw": "#241d07", "--loss": "#f08c6b", "--loss-fill": "#f08c6b",
  "--on-loss": "#2a110c", "--focus": "#5cc4d1",
  "--win-soft": "rgba(157,189,106,0.13)", "--win-line": "rgba(157,189,106,0.42)",
  "--draw-soft": "rgba(240,194,94,0.13)", "--draw-line": "rgba(240,194,94,0.46)",
  "--loss-soft": "rgba(240,140,107,0.13)", "--loss-line": "rgba(240,140,107,0.42)",
  "--kit-edge": "rgba(255,240,220,0.12)",
  "--glass-fill": "rgba(42,33,22,0.46)", "--glass-stroke": "rgba(255,232,198,0.13)",
  "--glass-hi": "rgba(255,232,198,0.17)", "--glass-lo": "rgba(0,0,0,0.38)", "--glass-rim": "rgba(255,178,96,0.20)",
  // Two amber lantern pools on the side walls (right, then left) at mid-height,
  // echoing the wrought-iron lamps in the alcoves — not a low ground glow.
  _night: 1, _sun: [89, 39, 255, 190, 102, 0.18, 9, 43, 250, 172, 86, 0.15],
};

// Anchor palettes along the 24h day. Denser around sunrise (5–9) and sunset
// (16–21.5) so the light turns faster there; golden→night lerp forms dusk.
const ANCHORS = [
  { h: 0, p: NIGHT }, { h: 5, p: NIGHT }, { h: 6.5, p: DAWN }, { h: 9, p: DAY },
  { h: 16, p: DAY }, { h: 18, p: GOLDEN }, { h: 21.5, p: NIGHT }, { h: 24, p: NIGHT },
];
const COLOR_VARS = Object.keys(DAY).filter(k => k[0] === "-");

/* ── Colour maths ──────────────────────────────────────────────────────── */
function parse(str) {
  if (str[0] === "#") {
    const n = parseInt(str.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = str.match(/[\d.]+/g).map(Number);
  return [m[0], m[1], m[2], m[3] ?? 1];
}
const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  const a = parse(c1), b = parse(c2);
  const r = Math.round(lerp(a[0], b[0], t)), g = Math.round(lerp(a[1], b[1], t)), bl = Math.round(lerp(a[2], b[2], t));
  const al = +lerp(a[3], b[3], t).toFixed(3);
  return `rgba(${r},${g},${bl},${al})`;
}

function bracket(h) {
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    if (h >= ANCHORS[i].h && h <= ANCHORS[i + 1].h) {
      const t = (h - ANCHORS[i].h) / (ANCHORS[i + 1].h - ANCHORS[i].h);
      return [ANCHORS[i].p, ANCHORS[i + 1].p, t];
    }
  }
  return [NIGHT, NIGHT, 0];
}

// Build the full inline variable set for a given hour.
function varsFor(h) {
  const [a, b, t] = bracket(h);
  const out = {};
  for (const k of COLOR_VARS) out[k] = mix(a[k], b[k], t);

  const N = lerp(a._night, b._night, t);              // 0 day … 1 night
  const s = a._sun.map((v, i) => lerp(v, b._sun[i], t));
  out["--sun-wash"] =
    `radial-gradient(78% 58% at ${s[0]}% ${s[1]}%, rgba(${s[2] | 0},${s[3] | 0},${s[4] | 0},${s[5].toFixed(3)}), rgba(${s[2] | 0},${s[3] | 0},${s[4] | 0},0) 60%),` +
    `radial-gradient(64% 46% at ${s[6]}% ${s[7]}%, rgba(${s[8] | 0},${s[9] | 0},${s[10] | 0},${s[11].toFixed(3)}), rgba(${s[8] | 0},${s[9] | 0},${s[10] | 0},0) 55%)`;

  // Warm shade by day, deep shade + an upward lantern glow after dark.
  const sd = mix("rgba(74,52,28,1)", "rgba(0,0,0,1)", N).replace(/,[\d.]+\)$/, ")").replace("rgba", "rgb");
  const dA = (0.06 + 0.30 * N).toFixed(3);
  const dA2 = (0.10 + 0.34 * N).toFixed(3);
  const lant = (0.24 * N).toFixed(3);
  out["--shadow-sm"] = `0 1px 2px ${alpha(sd, dA)}, 0 -6px 18px rgba(255,172,84,${(0.18 * N).toFixed(3)})`;
  out["--shadow-md"] = `0 2px 6px ${alpha(sd, dA)}, 0 14px 30px ${alpha(sd, dA2)}, 0 -8px 26px rgba(255,172,84,${lant})`;
  out["--shadow-lg"] = `0 20px 50px ${alpha(sd, (0.18 + 0.40 * N).toFixed(3))}, 0 -10px 30px rgba(255,172,84,${(0.30 * N).toFixed(3)})`;
  const g = mix("rgba(169,78,43,1)", "rgba(224,138,84,1)", N);
  out["--glow"] = `0 12px 34px ${g.replace(/[\d.]+\)$/, (0.22 + 0.06 * N).toFixed(3) + ")")}, 0 -9px 28px rgba(255,172,84,${(0.30 * N).toFixed(3)})`;

  out["--ember"] = Math.max(0, (N - 0.25) / 0.75).toFixed(3);
  out["--daylight"] = (1 - N).toFixed(3);      // 1 at midday … 0 at night
  return { out, N };
}
function alpha(rgb, a) { return rgb.replace("rgb(", "rgba(").replace(")", `,${a})`); }

/* ── Clock + reactive state ────────────────────────────────────────────── */
function realHour() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
export function phaseFor(h) {
  if (h >= 8 && h < 16.5) return "day";
  if (h >= 16.5 && h < 20) return "golden";
  if (h >= 5.5 && h < 8) return "dawn";
  return "night";
}

export const displayHour = ref(realHour());
export const phaseName = ref(phaseFor(displayHour.value));
export const scrubbing = ref(false);

let raf = null;
let clock = null;

function apply(h) {
  const el = document.documentElement;
  const { out, N } = varsFor(h);
  for (const k in out) el.style.setProperty(k, out[k]);
  el.style.colorScheme = N > 0.5 ? "dark" : "light";
  el.setAttribute("data-phase", phaseFor(h)); // coarse label for any CSS hooks
  displayHour.value = h;
  phaseName.value = phaseFor(h);
}

export function startClock() {
  apply(realHour());
  clock = setInterval(() => { if (!scrubbing.value) apply(realHour()); }, 30000);
}
export function stopClock() {
  clearInterval(clock);
  cancelAnimationFrame(raf);
}

// Slider drag — preview any hour.
export function scrub(h) {
  scrubbing.value = true;
  cancelAnimationFrame(raf);
  apply(h);
}

// On release, fast-forward through the day until we catch up with the real
// time, then hand control back to the live clock.
export function driftToNow() {
  cancelAnimationFrame(raf);
  const target = realHour();
  const step = () => {
    const h = displayHour.value;
    const ahead = (target - h + 24) % 24;
    if (ahead < 0.06 || ahead > 23.94) {
      apply(target);
      scrubbing.value = false;
      return;
    }
    apply((h + Math.max(0.08, ahead * 0.04)) % 24);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}
