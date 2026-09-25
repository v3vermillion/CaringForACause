// Ribbon geometry for the wave transitions, as compact SVG path data.
// Coordinates: x 0..1000 across the screen, y 0..100 down the band's height.
// Each band is the edge curve (a chain of cubic Béziers) forward, then the
// same chain back with each point pushed down by a thickness, so the ribbons
// taper. Offsetting control points is not a true offset curve, but for these
// gentle strips it is indistinguishable and costs a tenth of the bytes.
const f = (n) => (Math.round(n * 10) / 10).toString();
const off = (chain, t) => chain.map((seg) => seg.map(([x, y]) => [x, y + t(x)]));
const fwd = (chain) =>
  `M${f(chain[0][0][0])},${f(chain[0][0][1])}` +
  chain
    .map(
      ([, c1, c2, p]) => `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p[0])},${f(p[1])}`,
    )
    .join("");
const back = (chain) =>
  chain
    .slice()
    .reverse()
    .map(
      ([p0, c1, c2]) => `C${f(c2[0])},${f(c2[1])} ${f(c1[0])},${f(c1[1])} ${f(p0[0])},${f(p0[1])}`,
    )
    .join("");
const end = (chain) => chain[chain.length - 1][3];
// A strip between edge+a and edge+b.
const strip = (chain, a, b) => {
  const top = off(chain, a);
  const bot = off(chain, b);
  return `${fwd(top)}L${f(end(bot)[0])},${f(end(bot)[1])}${back(bot)}Z`;
};
const below = (chain, a) => `${fwd(off(chain, a))}L1000,100L0,100Z`;
const above = (chain, a) => {
  const c = off(chain, a);
  return `M0,0L1000,0L${f(end(c)[0])},${f(end(c)[1])}${back(c)}Z`;
};
const smooth = (x, x0, y0, x1, y1) => {
  const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
  const s = t * t * (3 - 2 * t);
  return y0 + (y1 - y0) * s;
};

export function waveA() {
  // Photo above, night below. The cut descends to the right and lifts at the end.
  const edge = [
    [
      [0, 26],
      [180, 30],
      [330, 62],
      [520, 66],
    ],
    [
      [520, 66],
      [700, 70],
      [860, 62],
      [1000, 46],
    ],
  ];
  const v = (x) => smooth(x, 0, 24, 1000, 11); // violet band thickness
  const c = (x) => smooth(x, 0, 30, 700, 0); // crimson band, fading out to the right
  return {
    above: above(edge, () => 0),
    night: below(edge, (x) => v(x) + c(x)),
    violet: strip(edge, () => 0, v),
    violetLit: strip(
      edge,
      () => 0,
      (x) => v(x) * 0.42,
    ),
    crimson: strip(edge, v, (x) => v(x) + c(x)),
    crimsonLit: strip(edge, v, (x) => v(x) + c(x) * 0.42),
    edgeTop: strip(
      edge,
      () => -1.2,
      () => 1.6,
    ),
    edgeMid: strip(
      edge,
      (x) => v(x) - 1.2,
      (x) => v(x) + 1.2,
    ),
    glowTop: strip(
      edge,
      () => -7,
      () => 7,
    ),
  };
}

export function waveB() {
  // Night above, paper below. The edge climbs to the right and settles.
  const edge = [
    [
      [0, 62],
      [170, 60],
      [330, 30],
      [520, 28],
    ],
    [
      [520, 28],
      [700, 26],
      [860, 36],
      [1000, 48],
    ],
  ];
  const v = (x) => smooth(x, 0, 12, 1000, 22);
  const c = (x) => smooth(x, 300, 0, 1000, 26);
  return {
    night: above(edge, () => 0),
    violet: strip(edge, () => 0, v),
    violetLit: strip(
      edge,
      () => 0,
      (x) => v(x) * 0.42,
    ),
    crimson: strip(edge, v, (x) => v(x) + c(x)),
    crimsonLit: strip(edge, v, (x) => v(x) + c(x) * 0.42),
    edgeTop: strip(
      edge,
      () => -1.2,
      () => 1.4,
    ),
    edgeMid: strip(
      edge,
      (x) => v(x) - 1.2,
      (x) => v(x) + 1.2,
    ),
    glowTop: strip(
      edge,
      () => -7,
      () => 7,
    ),
    paper: below(edge, (x) => v(x) + c(x)),
  };
}
if (process.argv[1] && process.argv[1].endsWith("wave-gen.mjs"))
  console.log(JSON.stringify({ A: waveA(), B: waveB() }, null, 1));
