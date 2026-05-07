/**
 * ═══════════════════════════════════════════════════════════════
 *  PolygonGrid
 * ═══════════════════════════════════════════════════════════════
 *
 *  Builds and manages a set of hexagon card DOM elements.
 *  Each card contains:
 *    • A flat-top SVG hexagon background (polygon.svg or inline)
 *    • An icon image   (e.g. icon_1.svg)
 *    • A label string  (e.g. "UI/UX Design")
 *
 *  The comb / honeycomb offset pattern is applied automatically:
 *  even columns are shifted down by half a hex height.
 *
 *  USAGE
 *  ─────
 *  const grid = new PolygonGrid({
 *    items: [
 *      { icon: "/images/icon_1.svg", label: "UI/UX Design"   },
 *      { icon: "/images/icon_2.svg", label: "Web Dev"        },
 *      // … up to as many as you like
 *    ],
 *    hexSize:     120,          // px — flat-to-flat width
 *    columns:     3,            // columns before wrapping
 *    gap:         12,           // px gap between hexagons
 *    iconSize:    48,           // px icon image
 *    hexSrc:      "/images/polygon.svg",   // polygon bg image
 *    hexColor:    "#111111",    // fill color painted over the svg tint
 *    labelColor:  "#ffffff",
 *    labelSize:   "13px",
 *    labelFont:   "font-poppins",  // tailwind class OR css font-family string
 *  });
 *
 *  // Returns a <div> containing all hex cards — append it anywhere
 *  const el = grid.build();
 *
 *  grid.destroy();  // clean up
 */

export class PolygonGrid {
  constructor(options = {}) {
    this.opts = {
      items:      options.items      || [],
      hexSize:    options.hexSize    ?? 120,
      columns:    options.columns    ?? 3,
      gap:        options.gap        ?? 12,
      iconSize:   options.iconSize   ?? 48,
      hexSrc:     options.hexSrc     || null,
      hexColor:   options.hexColor   || "#111111",
      labelColor: options.labelColor || "#ffffff",
      labelSize:  options.labelSize  || "13px",
      labelFont:  options.labelFont  || "inherit",
      iconColor:  options.iconColor  || "#ffffff",
    };

    this._cards  = [];
    this._el     = null;
  }

  // ─────────────────────────────────────────────────────────────
  //  BUILD  — creates and returns the wrapper element
  // ─────────────────────────────────────────────────────────────

  build() {
    const { opts } = this;
    const hexW = opts.hexSize;
    // For a flat-top regular hexagon: height = width * (√3/2) * (2/√3) ≈ width * 0.866
    // We use the same value for both axes to keep it equilateral.
    const hexH = hexW * 0.866;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position: relative;
      display:  inline-block;
      pointer-events: none;
    `;

    opts.items.forEach((item, i) => {
      const col = i % opts.columns;
      const row = Math.floor(i / opts.columns);

      // Honeycomb offset: even columns sit at row*hexH,
      // odd columns are nudged down by hexH/2
      const x = col * (hexW + opts.gap);
      const y = row * (hexH + opts.gap) + (col % 2 === 1 ? hexH * 0.5 : 0);

      const card = this._makeCard(item, hexW, hexH, x, y);
      wrapper.appendChild(card);
      this._cards.push(card);
    });

    this._el = wrapper;
    return wrapper;
  }

  // ─────────────────────────────────────────────────────────────
  //  CARD FACTORY
  // ─────────────────────────────────────────────────────────────

  _makeCard(item, hexW, hexH, x, y) {
    const { opts } = this;

    const card = document.createElement("div");
    card.style.cssText = `
      position:        absolute;
      left:            ${x}px;
      top:             ${y}px;
      width:           ${hexW}px;
      height:          ${hexH}px;
      display:         flex;
      flex-direction:  column;
      align-items:     center;
      justify-content: center;
      pointer-events:  auto;
      user-select:     none;
      cursor:          default;
    `;

    // ── Hex background ──────────────────────────────────────────
    // We draw the hexagon as an inline SVG polygon so we get full
    // color control without needing an external file.
    const svgBg = this._hexSvg(hexW, hexH);
    card.appendChild(svgBg);

    // ── Icon ────────────────────────────────────────────────────
    if (item.icon) {
      const icon = document.createElement("img");
      icon.src   = item.icon;
      icon.style.cssText = `
        position:       absolute;
        width:          ${opts.iconSize}px;
        height:         ${opts.iconSize}px;
        object-fit:     contain;
        filter:         brightness(0) invert(1);
        pointer-events: none;
        top:            50%;
        left:           50%;
        transform:      translate(-50%, -68%);
      `;
      card.appendChild(icon);
    }

    // ── Label ───────────────────────────────────────────────────
    if (item.label) {
      const label = document.createElement("span");
      label.textContent = item.label;
      const isTailwind = opts.labelFont.includes(" ") === false
        && !opts.labelFont.includes("'")
        && !opts.labelFont.includes('"');

      label.style.cssText = `
        position:    absolute;
        bottom:      18%;
        left:        50%;
        transform:   translateX(-50%);
        color:       ${opts.labelColor};
        font-size:   ${opts.labelSize};
        font-weight: 600;
        white-space: nowrap;
        text-align:  center;
        pointer-events: none;
        font-family: ${isTailwind ? "inherit" : opts.labelFont};
        line-height: 1.2;
      `;

      // Support multi-word labels breaking at a space into two lines
      label.innerHTML = item.label.replace(" ", "<br/>");
      card.appendChild(label);
    }

    return card;
  }

  // ─────────────────────────────────────────────────────────────
  //  INLINE SVG HEXAGON  (flat-top orientation)
  // ─────────────────────────────────────────────────────────────

  _hexSvg(w, h) {
    // Flat-top hexagon: 6 vertices relative to center
    const cx = w / 2;
    const cy = h / 2;
    const r  = Math.min(w, h) / 2;

    // Flat-top angles: 0°, 60°, 120°, 180°, 240°, 300°
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i);
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width",   String(w));
    svg.setAttribute("height",  String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.style.cssText = "position:absolute;top:0;left:0;";

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", pts);
    poly.setAttribute("fill",   this.opts.hexColor);

    svg.appendChild(poly);
    return svg;
  }

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────

  /** Update color of all hexagons at runtime */
  setHexColor(color) {
    this.opts.hexColor = color;
    this._el?.querySelectorAll("polygon").forEach(p => p.setAttribute("fill", color));
  }

  destroy() {
    this._el?.remove();
    this._cards = [];
    this._el    = null;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════
 *  PolygonCarousel
 * ═══════════════════════════════════════════════════════════════
 *
 *  Animates a PolygonGrid (or any element) scrolling right→left
 *  in a continuous loop inside a clipping container.
 *
 *  Two identical copies of the grid are placed side-by-side.
 *  When the left copy has scrolled fully off-screen, both copies
 *  snap back by exactly one copy-width — seamless infinite loop.
 *
 *  Features
 *  ────────
 *  • Infinite right-to-left loop (no jump glitch)
 *  • Configurable speed
 *  • pause() / resume() / setSpeed() at runtime
 *  • Phase-in / phase-out opacity on enter/exit edges
 *  • Reverse direction support
 *  • Responds to container resize via ResizeObserver
 *
 *  USAGE
 *  ─────
 *  const carousel = new PolygonCarousel(containerEl, {
 *    items: [
 *      { icon: "/images/icon_1.svg", label: "UI/UX Design"  },
 *      { icon: "/images/icon_2.svg", label: "Web Dev"       },
 *      // … 10 items total recommended
 *    ],
 *    speed:       1.2,       // px per frame
 *    hexSize:     130,
 *    columns:     2,         // columns in the honeycomb before repeating
 *    gap:         16,
 *    direction:   "left",    // "left" | "right"
 *    fadeEdge:    80,        // px fade zone at left/right edges
 *    hexColor:    "#111111",
 *    iconSize:    50,
 *    labelSize:   "12px",
 *  });
 *
 *  carousel.pause();
 *  carousel.resume();
 *  carousel.setSpeed(2.5);
 *  carousel.destroy();
 */

export class PolygonCarousel {
  constructor(containerEl, options = {}) {
    this.container = containerEl;

    this.opts = {
      items:     options.items     || [],
      speed:     options.speed     ?? 1.2,
      direction: options.direction ?? "left",
      fadeEdge:  options.fadeEdge  ?? 80,
      // PolygonGrid pass-through options
      hexSize:   options.hexSize   ?? 130,
      columns:   options.columns   ?? 2,
      gap:       options.gap       ?? 16,
      iconSize:  options.iconSize  ?? 50,
      hexColor:  options.hexColor  || "#111111",
      labelColor: options.labelColor || "#ffffff",
      labelSize: options.labelSize || "13px",
      labelFont: options.labelFont || "inherit",
    };

    this._paused   = false;
    this._raf      = null;
    this._offset   = 0;      // current scroll offset in px
    this._copyW    = 0;      // width of one grid copy (set after build)

    this._init();
  }

  // ─────────────────────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────────────────────

  _init() {
    // Clip wrapper — hides overflow so hexagons slide in/out cleanly
    const clip = document.createElement("div");
    clip.style.cssText = `
      position: relative;
      width:    100%;
      height:   100%;
      overflow: hidden;
    `;

    // Scroll track — holds both copies, translated by _offset each frame
    const track = document.createElement("div");
    track.style.cssText = `
      position:    absolute;
     font-family:  Poppins;
      top:         50%;
      left:        0;
      transform:   translateY(-10%);
      display:     flex;
      align-items: center;
      will-change: transform;
    `;

    this._track = track;

    // Build two identical grid copies for seamless looping
    this._grids  = [this._buildGrid(), this._buildGrid()];
    this._copies = this._grids.map(g => g.build());

    this._copies.forEach(copy => {
      // Wrap each copy so we can measure its width
      const wrap = document.createElement("div");
      wrap.style.cssText = "position: relative; flex-shrink: 0;";
      wrap.appendChild(copy);
      track.appendChild(wrap);
      this._setWrapDimensions(copy, wrap);
    });

    clip.appendChild(track);

    // Ensure container is positioned
    if (getComputedStyle(this.container).position === "static") {
      this.container.style.position = "relative";
    }
    this.container.appendChild(clip);
    this._clip = clip;

    // Measure copy width after append (layout engine needs it in DOM)
    requestAnimationFrame(() => {
      this._measureCopyWidth();
      this._startLoop();
    });

    this._ro = new ResizeObserver(() => this._measureCopyWidth());
    this._ro.observe(this.container);
  }

  _buildGrid() {
    return new PolygonGrid({
      items:      this.opts.items,
      hexSize:    this.opts.hexSize,
      columns:    this.opts.columns,
      gap:        this.opts.gap,
      iconSize:   this.opts.iconSize,
      hexColor:   this.opts.hexColor,
      labelColor: this.opts.labelColor,
      labelSize:  this.opts.labelSize,
      labelFont:  this.opts.labelFont,
    });
  }

  _setWrapDimensions(gridEl, wrap) {
    // Give the wrapper a concrete height so the track can center it
    const { hexSize, columns, gap, items } = this.opts;
    const hexH  = hexSize * 0.866;
    const rows  = Math.ceil(items.length / columns);
    const totalH = rows * (hexH + gap) + hexH * 0.5; // +0.5 for odd-col offset

    // Width: all columns side-by-side
    const totalW = columns * (hexSize + gap);

    wrap.style.width  = `${totalW + gap * 2}px`;
    wrap.style.height = `${totalH}px`;
    gridEl.style.width  = `${totalW}px`;
    gridEl.style.height = `${totalH}px`;
  }

  _measureCopyWidth() {
    const wraps = this._track.children;
    if (wraps.length > 0) {
      this._copyW = wraps[0].offsetWidth;
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  ANIMATION LOOP
  // ─────────────────────────────────────────────────────────────

  _startLoop() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      if (this._paused || !this._copyW) return;
      this._tick();
    };
    loop();
  }

  _tick() {
    const dir = this.opts.direction === "left" ? 1 : -1;
    this._offset += this.opts.speed * dir;

    // When we've scrolled a full copy-width, snap back — seamless loop
    if (this._offset >= this._copyW)  this._offset -= this._copyW;
    if (this._offset <= -this._copyW) this._offset += this._copyW;

    this._track.style.transform =
      `translateY(-50%) translateX(${-this._offset}px)`;

    // Edge fade via clip-path gradient mask on the clip div
    this._applyEdgeFade();
  }

  _applyEdgeFade() {
    const f = this.opts.fadeEdge;
    if (!f) return;
    // CSS mask: transparent on far left/right, opaque in middle
    this._clip.style.webkitMaskImage =
      `linear-gradient(to right, transparent 0px, black ${f}px, black calc(100% - ${f}px), transparent 100%)`;
    this._clip.style.maskImage =
      `linear-gradient(to right, transparent 0px, black ${f}px, black calc(100% - ${f}px), transparent 100%)`;
  }

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────

  pause()          { this._paused = true;  }
  resume()         { this._paused = false; }
  toggle()         { this._paused = !this._paused; }
  setSpeed(n)      { this.opts.speed = Math.max(0, n); }
  setDirection(d)  { this.opts.direction = d; }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
    this._grids?.forEach(g => g.destroy());
    this._clip?.remove();
  }
}