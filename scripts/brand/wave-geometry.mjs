// The wave's geometry: the ribbons of src/components/Wave.astro.
//
//   node scripts/brand/wave-geometry.mjs        writes src/components/Wave.astro
//
// Coordinates: x 0..1000 across the screen, y 0..100 down the band's height.
// Each band is the edge curve (a chain of cubic Béziers) forward, then the
// same chain back with each point pushed down by a thickness, so the ribbons
// taper. Offsetting control points is not a true offset curve, but for these
// gentle strips it is indistinguishable and costs a tenth of the bytes.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
// The same regions as masks for a ground continuation (Wave.astro's
// aboveGround and belowGround): each reaches 1.5 units into the ribbon, so
// no hairline of the box shows where the mask and the band are both
// antialiased, and 10 units past the box on its far side and both ends, so
// the mask's antialiased edge never lies on the box's own edge (the box
// overhangs its section by a pixel there; global.css). A CSS mask image
// (an SVG in the drawing's own box, stretched to the element) rather than
// a clip-path reference: WebKit painted a clipped element's gradient
// layers nowhere, leaving its flat colour, which was a seam of its own on
// every iPhone (decision 67).
const aboveClip = (chain, a) => {
  const c = off(chain, a);
  const [s, e] = [c[0][0], end(c)];
  return `M-10,-10L1010,-10L1010,${f(e[1])}L${f(e[0])},${f(e[1])}${back(c)}L-10,${f(s[1])}Z`;
};
const belowClip = (chain, a) => {
  const c = off(chain, a);
  const [s, e] = [c[0][0], end(c)];
  const curve = fwd(c).slice(fwd(c).indexOf("C"));
  return `M-10,${f(s[1])}L${f(s[0])},${f(s[1])}${curve}L1010,${f(e[1])}L1010,110L-10,110Z`;
};
const mask = (path) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 100' preserveAspectRatio='none'%3E%3Cpath d='${path}'/%3E%3C/svg%3E")`;
const above = (chain, a) => {
  const c = off(chain, a);
  return `M0,0L1000,0L${f(end(c)[0])},${f(end(c)[1])}${back(c)}Z`;
};
const smooth = (x, x0, y0, x1, y1) => {
  const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
  const s = t * t * (3 - 2 * t);
  return y0 + (y1 - y0) * s;
};
// Two ribbons that cross, as the reference draws them: one is the top band
// at the left and dives under the other, which swells to fill the right.
// `t` is the ribbon that leads at the left (its top is the edge), `u` the
// one that takes over: its top starts under the leader and rises to the edge
// over `rise`, where the leader has thinned to nothing. Each band also gets
// a highlight along its crest and a shade along its foot (blurred and
// clipped to the band in the component), so the ribbons read as satin
// rather than as flat stripes.
const bands = (edge, t, u, rise) => {
  const ut = (x) => t(x) * (1 - smooth(x, rise[0], 0, rise[1], 1)); // the other ribbon's top
  const foot = (x) => Math.max(t(x), ut(x) + u(x)); // where the surface below begins
  return {
    above: above(edge, () => 0),
    below: below(edge, foot),
    aboveClip: aboveClip(edge, () => 1.5),
    belowClip: belowClip(edge, (x) => foot(x) - 1.5),
    top: strip(edge, () => 0, t),
    topLit: strip(
      edge,
      () => 0,
      (x) => t(x) * 0.45,
    ),
    topShade: strip(edge, (x) => t(x) * 0.6, t),
    under: strip(edge, ut, (x) => ut(x) + u(x)),
    underLit: strip(edge, ut, (x) => ut(x) + u(x) * 0.45),
    underShade: strip(
      edge,
      (x) => ut(x) + u(x) * 0.6,
      (x) => ut(x) + u(x),
    ),
    edgeTop: strip(
      edge,
      () => -1.2,
      () => 1.6,
    ),
    seam: strip(
      edge,
      (x) => ut(x) - 1.2,
      (x) => ut(x) + 1.2,
    ),
    glowTop: strip(
      edge,
      () => -7,
      () => 7,
    ),
  };
};

export function waveA() {
  // Under the banner: the photo (or a lighter surface) above, night below.
  // Crimson leads at the left and dives under the violet, which swells to
  // fill the lower right. The cut descends to the right and lifts at the end.
  // The violet's foot stays inside the box (at most 95 of its 100): a foot
  // that ran off the bottom ended the ribbon in a flat cut along the box's
  // edge, which read as a line across the band (decision 67).
  const edge = [
    [
      [0, 26],
      [180, 30],
      [330, 62],
      [520, 66],
    ],
    [
      [520, 66],
      [700, 66],
      [860, 58],
      [1000, 44],
    ],
  ];
  const crimson = (x) => smooth(x, 0, 30, 640, 0);
  const violet = (x) => smooth(x, 0, 10, 1000, 34);
  return bands(edge, crimson, violet, [320, 600]);
}

export function waveB() {
  // Off the night band: night above, paper below. Violet leads at the left
  // and dives under the crimson, which swells to the right; the edge
  // descends to the right, as the reference's does.
  const edge = [
    [
      [0, 24],
      [180, 26],
      [330, 44],
      [520, 50],
    ],
    [
      [520, 50],
      [700, 54],
      [860, 60],
      [1000, 70],
    ],
  ];
  const violet = (x) => smooth(x, 0, 30, 700, 0);
  const crimson = (x) => smooth(x, 200, 6, 1000, 28);
  return bands(edge, violet, crimson, [380, 660]);
}

const paths = (o) =>
  Object.entries(o)
    .filter(([k]) => !k.endsWith("Clip"))
    .map(([k, v]) => `  ${k}: "${v}",`)
    .join("\n");

// In A the leader ("top") is crimson and the other ribbon violet; in B the
// leader is violet and the other crimson. The palettes name them by colour.
const svg = (
  kind,
  P,
  palette,
  lead,
  other,
) => `  <div class:list={["wave", "wave--${kind}", className]}>
    {up.ground && <div class={\`wave-ground wave-ground--above wave-ground--\${up.ground}\`} />}
    {down.ground && <div class={\`wave-ground wave-ground--below wave-ground--\${down.ground}\`} />}
    <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
${palette}
      <clipPath id={\`\${id}-tclip\`}>
        <path d={${P}.top} />
      </clipPath>
      <clipPath id={\`\${id}-uclip\`}>
        <path d={${P}.under} />
      </clipPath>
      <filter id={\`\${id}-soft\`} x="-5%" y="-60%" width="110%" height="220%">
        <feGaussianBlur stdDeviation="1.2 3.2" />
      </filter>
      <filter id={\`\${id}-glow\`} x="-5%" y="-50%" width="110%" height="200%">
        <feGaussianBlur stdDeviation="2 5" />
      </filter>
      <filter id={\`\${id}-spill\`} x="-5%" y="-60%" width="110%" height="220%">
        <feGaussianBlur stdDeviation="4 8" />
      </filter>
    </defs>
    {up.fill && <path d={${P}.above} fill={up.fill} />}
    {down.fill && <path d={${P}.below} fill={down.fill} />}
    <path d={${P}.${lead === "crimson" ? "top" : "under"}} fill=${kind === "paper" ? "{`url(#${id}-spillfill)`}" : '"#ff2d6e"'} opacity="0.4" filter={\`url(#\${id}-spill)\`} />
    <path d={${P}.top} fill={\`url(#\${id}-${lead})\`} />
    <g clip-path={\`url(#\${id}-tclip)\`}>
      <path d={${P}.topLit} fill={\`url(#\${id}-${lead}-lit)\`} filter={\`url(#\${id}-soft)\`} />
      <path d={${P}.topShade} fill="${lead === "crimson" ? "#5a0420" : "#2a0c7a"}" opacity="0.4" filter={\`url(#\${id}-soft)\`} />
    </g>
    <path d={${P}.under} fill={\`url(#\${id}-${other})\`} />
    <g clip-path={\`url(#\${id}-uclip)\`}>
      <path d={${P}.underLit} fill={\`url(#\${id}-${other}-lit)\`} filter={\`url(#\${id}-soft)\`} />
      <path d={${P}.underShade} fill="${other === "crimson" ? "#5a0420" : "#2a0c7a"}" opacity="0.4" filter={\`url(#\${id}-soft)\`} />
    </g>
    <path
      d={${P}.glowTop}
      fill={\`url(#\${id}-light)\`}
      opacity="0.35"
      filter={\`url(#\${id}-glow)\`}
      style="mix-blend-mode: screen"
    />
    <path d={${P}.edgeTop} fill={\`url(#\${id}-edge)\`} opacity="0.5" />
    <path d={${P}.seam} fill={\`url(#\${id}-seam)\`} />
    </svg>
  </div>`;

const stops = (list) =>
  list
    .map(
      ([o, c, a]) =>
        `        <stop offset="${o}" stop-color="${c}"${a === undefined ? "" : ` stop-opacity="${a}"`} />`,
    )
    .join("\n");
const grad = (name, list) =>
  `      <linearGradient id={\`\${id}-${name}\`} x1="0" x2="1" y1="0" y2="0">\n${stops(list)}\n      </linearGradient>`;
const paletteA = [
  grad("crimson", [
    [0, "#f0304a"],
    [0.3, "#d4143c"],
    [0.5, "#9c0c48"],
    [0.64, "#5a0a48", 0],
  ]),
  grad("crimson-lit", [
    [0, "#ffb3bf", 0.5],
    [0.4, "#ff7f9e", 0.3],
    [0.62, "#ff7f9e", 0],
  ]),
  grad("violet", [
    [0, "#5a24c4"],
    [0.5, "#6f32dc"],
    [1, "#4a1ab0", 0.9],
  ]),
  grad("violet-lit", [
    [0, "#c9a6ff", 0.35],
    [0.55, "#d9c2ff", 0.55],
    [1, "#b48cff", 0.3],
  ]),
  grad("edge", [
    [0, "#ffd6e6", 0.7],
    [0.45, "#ffc2ec", 0.4],
    [0.7, "#e0c0ff", 0.15],
    [1, "#b48cff", 0],
  ]),
  grad("seam", [
    [0, "#ff9ab2", 0.7],
    [0.35, "#ff7aa0", 0.4],
    [0.6, "#ff7aa0", 0],
  ]),
  grad("light", [
    [0, "#ff7ab8"],
    [0.4, "#c07cff"],
    [1, "#7a48ff"],
  ]),
].join("\n");
const paletteB = [
  // The crimson's light spill, faded out over the right fifth: there its
  // foot runs within a blur of the box's bottom, and the blur was cut by the
  // edge into a line (decision 67).
  grad("spillfill", [
    [0, "#ff2d6e"],
    [0.7, "#ff2d6e"],
    [0.9, "#ff2d6e", 0],
  ]),
  grad("violet", [
    [0, "#7a3ce6"],
    [0.35, "#5a24c4"],
    [0.7, "#40169e", 0],
  ]),
  grad("violet-lit", [
    [0, "#d9c2ff", 0.6],
    [0.4, "#c9a6ff", 0.3],
    [0.68, "#c9a6ff", 0],
  ]),
  grad("crimson", [
    [0, "#7a0a3a", 0.9],
    [0.45, "#b8123c"],
    [0.75, "#d4143c"],
    [1, "#f0304a"],
  ]),
  grad("crimson-lit", [
    [0.2, "#ff7f9e", 0.2],
    [0.6, "#ff9ab0", 0.4],
    [1, "#ffb3bf", 0.5],
  ]),
  grad("edge", [
    [0, "#dcc8ff", 0],
    [0.3, "#e0c0ff", 0.15],
    [0.55, "#ffc2ec", 0.4],
    [1, "#ffd6e6", 0.7],
  ]),
  grad("seam", [
    [0.3, "#c9a6ff", 0],
    [0.55, "#d9b8ff", 0.4],
    [0.8, "#ff9ab2", 0.6],
  ]),
  grad("light", [
    [0, "#7a48ff"],
    [0.6, "#c07cff"],
    [1, "#ff7ab8"],
  ]),
].join("\n");

export const component = () => `---
/**
 * The wave: two ribbons that cross, sweeping across the page where one
 * surface hands over to the next, from the owner's reference for the
 * transition under the banner (decision 51). "into-night" lands on night:
 * crimson leads at the left and dives under a violet that swells to fill
 * the right; under the banner it cuts the photo (nothing above), and above
 * the About section it carries the lilac of the section before it.
 * "into-paper" lifts night off paper: violet leads at the left and dives
 * under a crimson that swells to the right.
 * What lies above and below the ribbons is a flat colour, "none" (the
 * section the wave sits in shows through), or a ground continued under
 * the ribbons: a box painted as the neighbouring section's lit ground and
 * clipped to the ribbons' edge (the classes are in global.css), so a
 * hand-off between two lit surfaces has no seam at the box's edge
 * (decision 67).
 * The geometry is drawn once in a 1000 by 100 box and stretched to the box
 * it is given (the parent sets its width and height in the class's
 * reference pixel), so the ribbons cross every screen edge to edge. Each
 * band carries a soft highlight along its crest and a shade along its foot,
 * clipped to the band, so it reads as satin. Decorative: hidden from
 * assistive technology.
 *
 * Every copy on a page needs its own id prefix, because the gradients and
 * clips are referenced by id and a page repeats no id (a test checks).
 *
 * GENERATED by scripts/brand/wave-geometry.mjs: edit that script and run
 * \`node scripts/brand/wave-geometry.mjs\`, never this file.
 */
type Props = {
  kind: "into-night" | "into-paper";
  /** Unique on the page: the prefix of the gradient and clip ids. */
  id: string;
  /**
   * The surface above the ribbons: a CSS colour, or "none" for transparent
   * (the section the wave sits in shows through). Under the banner the
   * default is none (the photo shows); off the night band it is night.
   */
  above?: string;
  /** The surface below the ribbons, likewise: night under the banner, paper off the band. */
  below?: string;
  /**
   * Instead of a flat colour on that side: the lit ground of the section
   * beyond the ribbons, continued under them (global.css, .wave-ground);
   * "footer" is the footer's lit top, under the About section's last wave.
   */
  aboveGround?: "paper" | "lilac";
  belowGround?: "paper" | "lilac" | "footer";
  class?: string;
};
const { kind, id, above, below, aboveGround, belowGround, class: className } = Astro.props;
const flat =
  kind === "into-night" ? { above: "none", below: "#1b0f2e" } : { above: "#1b0f2e", below: "#faf7fd" };
const side = (ground: string | undefined, colour: string | undefined, fallback: string) => {
  const fill = colour ?? fallback;
  return { ground: ground ?? null, fill: ground || fill === "none" ? null : fill };
};
const up = side(aboveGround, above, flat.above);
const down = side(belowGround, below, flat.below);
const A = {
${paths(waveA())}
};
const B = {
${paths(waveB())}
};
---

{kind === "into-night" ? (
${svg("night", "A", paletteA, "crimson", "violet")}
) : (
${svg("paper", "B", paletteB, "violet", "crimson")}
)}

<style is:global>
  /* The box is positioned and sized by the section that places it; the
     drawing and any ground continuation fill it. */
  .wave {
    display: block;
    position: relative;
    width: 100%;
    pointer-events: none;
  }

  .wave > svg {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  /* The masks for a ground continued under the ribbons (global.css paints
     the .wave-ground boxes): the region above or below the ribbons in the
     drawing's own box, stretched to the element like the drawing. */
  .wave--night .wave-ground--above {
    --wave-mask: ${mask(waveA().aboveClip)};
  }
  .wave--night .wave-ground--below {
    --wave-mask: ${mask(waveA().belowClip)};
  }
  .wave--paper .wave-ground--above {
    --wave-mask: ${mask(waveB().aboveClip)};
  }
  .wave--paper .wave-ground--below {
    --wave-mask: ${mask(waveB().belowClip)};
  }
</style>
`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = new URL("../../src/components/Wave.astro", import.meta.url);
  writeFileSync(out, component());
  console.log(`wrote ${fileURLToPath(out)}`);
}
