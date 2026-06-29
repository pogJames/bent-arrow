// Usage:
//   <script src="bent-arrow.js"></script>
//   <bent-arrow lengths="120,80,80" color="#1f5fff" animate></bent-arrow>

const toRad = deg => deg * Math.PI / 180;

class BentArrow extends HTMLElement {
  static observedAttributes = [
    "lengths",      // Comma-separated length of each straight segment.   default "70,70,70,70,70"
    "angle",        // Starting heading in degrees (rotates whole arrow). default "0"
    "counter",      // Presence bends the 45° turns counter-clockwise.    default off (cw)
    "color",        // Arrow stroke/fill color.                           default "#1f5fff"
    "thickness",    // Shaft stroke width (in viewBox units).             default "12"
    "head-length",  // How far the arrowhead extends back from the tip.   default "28"
    "head-angle",   // Half-angle of the arrowhead, in degrees.           default "32"
    "animate",      // Presence enables the traveling glow pulse.         default off
    "duration",     // Animation duration (any CSS time).                 default "3.2s"
  ];

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.render();
  }

  _num(name, fallback) {
    const v = parseFloat(this.getAttribute(name));
    return Number.isFinite(v) ? v : fallback;
  }

  render() {
    const lengths   = (this.getAttribute("lengths") || "70,70,70,70,70").split(",").map(Number);
    const color     = this.getAttribute("color") || "#1f5fff";
    const thickness = this._num("thickness", 16);
    const headLen   = this._num("head-length", 40);
    const animate   = this.hasAttribute("animate");
    const counter   = this.hasAttribute("counter");
    const duration  = this.getAttribute("duration") || "3.2s";

    // Walk the shaft, turning a fixed 45° at every joint (ccw if `counter`).
    const turn = counter ? -45 : 45;
    const points = [[0, 0]];
    let heading = this._num("angle", 0);
    for (const len of lengths) {
      const [x, y] = points[points.length - 1];
      const a = toRad(heading);
      points.push([x + len * Math.cos(a), y + len * Math.sin(a)]);
      heading += turn;
    }

    // Calculate arrowhead points and angle.
    const [tipX, tipY] = points[points.length - 1];
    const [prevX, prevY] = points[points.length - 2];
    const backAngle = Math.atan2(prevY - tipY, prevX - tipX);

    // Construct corners and neck point.
    const corner = side => [
      tipX + headLen * Math.cos(backAngle + side * toRad(32)),
      tipY + headLen * Math.sin(backAngle + side * toRad(32)),
    ];
    const cornerA = corner(1);
    const cornerB = corner(-1);
    const neck = [(cornerA[0] + cornerB[0]) / 2, (cornerA[1] + cornerB[1]) / 2];

    // Construct SVG path strings from points.
    const toPath = pts => "M" + pts.map(p => p.join(",")).join("L");
    const shaftPath = toPath([...points.slice(0, -1), neck]);
    const headPoints = [cornerA, [tipX, tipY], cornerB].map(p => p.join(",")).join(" ");

    // Auto-fit the viewBox to the geometry (+ padding for stroke width).
    const all = [...points, cornerA, cornerB];
    const xs = all.map(p => p[0]);
    const ys = all.map(p => p[1]);
    const pad = thickness/2;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const vbW = Math.max(...xs) - minX + pad;
    const vbH = Math.max(...ys) - minY + pad;

    // Arrow as SVG elements.
    const drawArrow = (klass = "") =>
      `<path class="shaft ${klass}" d="${shaftPath}"/>` +
      `<polygon class="head ${klass}" points="${headPoints}"/>`;

    // Animate or not?
    const body = animate
      ? drawArrow("pale") +
        `<g mask="url(#sweepMask)">${drawArrow()}</g>` +
        `<mask id="sweepMask"><path id="sweep" pathLength="100" d="${toPath(points)}"/></mask>`
      : drawArrow();

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        svg { width: 100%; height: 100%; display: block; overflow: visible; }
        .shaft { fill: none; stroke: ${color}; stroke-width: ${thickness}; stroke-linejoin: miter; }
        .head  { fill: ${color}; stroke: none; }
        .pale  { opacity: 0.4; }
        #sweep {
          fill: none; stroke: #fff; stroke-width: ${headLen + 4};
          stroke-dasharray: 100 100;
          animation: cycle ${duration} ease-in-out infinite;
        }
        @keyframes cycle {
          0%   { stroke-dashoffset:  100; }
          50%  { stroke-dashoffset:    0; }
          100% { stroke-dashoffset: -100; }
        }
      </style>
      <svg viewBox="${minX} ${minY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet" aria-label="arrow">
        ${body}
      </svg>`;
  }
}

customElements.define("bent-arrow", BentArrow);