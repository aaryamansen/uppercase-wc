/**
 * Realistic vector football, recolourable per team colourway.
 * ----------------------------------------------------------------------------
 * A single parametric SVG (classic Telstar panel layout viewed front-on) whose
 * pentagon panels are tinted from a team's flag colours. One generator feeds
 * both the brand UI (`Ball.svelte`) and the pixel-free gameplay renderer
 * (`PenaltyGame`), so every ball in the experience matches the chosen bag.
 */

export interface Colorway {
  /** Flag colour #1 — drives the centre panel + slider start. */
  c1: string;
  /** Flag colour #2 — primary ring panels + slider middle. */
  c2: string;
  /** Flag colour #3 — accent ring panels + slider end. */
  c3: string;
}

const DEG = Math.PI / 180;

/** Points string for a regular pentagon (screen coords, y-down). */
function pentagon(cx: number, cy: number, r: number, rotDeg: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (-90 + rotDeg + i * 72) * DEG;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/**
 * Build the football markup for a colourway.
 * `id` namespaces the gradients so multiple balls can coexist on one page.
 */
export function footballSvg(cw: Colorway, id = 'b'): string {
  const cx = 50;
  const cy = 50;
  const R = 46;
  const seam = '#0e131c';
  const body = '#f6f8fc';

  // Centre pentagon + a ring of five nestled against its edges.
  const ringColors = [cw.c2, cw.c3, cw.c1, cw.c2, cw.c3];
  const central = pentagon(cx, cy, 15, 0);
  let ring = '';
  for (let i = 0; i < 5; i++) {
    const phi = -54 + i * 72; // central pentagon edge-midpoint directions
    const a = phi * DEG;
    const d = 27.5;
    const ox = cx + d * Math.cos(a);
    const oy = cy + d * Math.sin(a);
    const poly = pentagon(ox, oy, 12.5, phi + 90); // a vertex points outward
    ring += `<polygon points="${poly}" fill="${ringColors[i]}"/>`;
    // seam linking the central edge to this panel
    const va = (-90 + 36 + i * 72) * DEG;
    ring += `<line x1="${(cx + 12.5 * Math.cos(va)).toFixed(2)}" y1="${(cy + 12.5 * Math.sin(va)).toFixed(2)}" x2="${ox.toFixed(2)}" y2="${oy.toFixed(2)}" stroke="${seam}" stroke-width="1.5"/>`;
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Football">
  <defs>
    <radialGradient id="${id}-sphere" cx="38%" cy="32%" r="72%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="${body}"/>
      <stop offset="1" stop-color="#c2c9d6"/>
    </radialGradient>
    <radialGradient id="${id}-shade" cx="38%" cy="32%" r="72%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#05070c" stop-opacity="0.5"/>
    </radialGradient>
    <clipPath id="${id}-clip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}-sphere)"/>
  <g clip-path="url(#${id}-clip)" stroke="${seam}" stroke-width="1.6" stroke-linejoin="round">
    <polygon points="${central}" fill="${cw.c1}"/>
    ${ring}
  </g>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}-shade)"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#0e131c" stroke-width="1.4" stroke-opacity="0.55"/>
  <ellipse cx="36" cy="32" rx="13" ry="9" fill="#ffffff" opacity="0.4"/>
</svg>`;
}

/** CSS gradient used to theme the power slider + CTAs in the team colourway. */
export function colorwayGradient(cw: Colorway, angle = 90): string {
  return `linear-gradient(${angle}deg, ${cw.c1} 0%, ${cw.c2} 52%, ${cw.c3} 100%)`;
}
