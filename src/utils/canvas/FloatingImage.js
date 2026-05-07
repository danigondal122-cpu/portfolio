export class FloatingImage {
  constructor(anchorEl, floatEl, options = {}) {
    this.anchorEl = anchorEl;
    this.floatEl  = floatEl;

    this.interactive = options.interactive ?? false;

    this._base = {
      float:        options.float        ?? true,
      amplitude:    options.amplitude    ?? 20,
      speed:        options.speed        ?? 0.002,
      offsetX:      options.offsetX      ?? -80,
      offsetY:      options.offsetY      ?? 0,
      anchorOrigin: options.anchorOrigin ?? "left",
      floatOrigin:  options.floatOrigin  ?? "right",
      floatAxis:    options.floatAxis    ?? "y",
      phaseOffset:  options.phaseOffset  ?? 0,
      rotate:       options.rotate       ?? 0, 
     
    };

    this._breakpoints = this._sortBreakpoints(options.breakpoints || {});
    this._cfg         = { ...this._base };
    this._raf         = null;
    this._start       = performance.now();
    this._lastTime    = 0;



    this._boundUpdate = this._update.bind(this);
    this._boundResize = this._onResize.bind(this);
    // Scroll: immediately reposition without waiting for next RAF tick
    this._boundScroll = () => this._applyPosition(this._lastTime);

    this._init();
  }

  // ─────────────────────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────────────────────

  _init() {
    if (!this.anchorEl || !this.floatEl) return;

    Object.assign(this.floatEl.style, {
      position:        "fixed",
      top:             "0",
      left:            "0",
      margin:          "0",
      pointerEvents: this.interactive ? "auto" : "none",
      willChange:      "transform",
      transformOrigin: "0 0",
      zIndex:          "50",
    });

    this._resolveConfig();

    window.addEventListener("resize", this._boundResize, { passive: true });
    // passive:true keeps scroll smooth; we only read, never preventDefault
    window.addEventListener("scroll", this._boundScroll, { passive: true });

    this._raf = requestAnimationFrame(this._boundUpdate);
  }

  // ─────────────────────────────────────────────────────────────
  //  BREAKPOINTS
  // ─────────────────────────────────────────────────────────────

  _sortBreakpoints(bp) {
    return Object.entries(bp)
      .map(([k, v]) => [Number(k), v])
      .sort((a, b) => b[0] - a[0]);
  }

  _resolveConfig() {
    let cfg = { ...this._base };
    for (const [maxW, partial] of this._breakpoints) {
      if (window.innerWidth <= maxW) Object.assign(cfg, partial);
    }
    this._cfg = cfg;
  }

  _onResize() {
    this._resolveConfig();
  }

  // ─────────────────────────────────────────────────────────────
  //  ORIGIN MATH
  // ─────────────────────────────────────────────────────────────

  _originPoint(r, origin) {
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    return ({
      "top-left":     { x: r.left,  y: r.top    },
      "top":          { x: cx,      y: r.top    },
      "top-right":    { x: r.right, y: r.top    },
      "left":         { x: r.left,  y: cy       },
      "center":       { x: cx,      y: cy       },
      "right":        { x: r.right, y: cy       },
      "bottom-left":  { x: r.left,  y: r.bottom },
      "bottom":       { x: cx,      y: r.bottom },
      "bottom-right": { x: r.right, y: r.bottom },
    })[origin] || { x: r.left, y: cy };
  }

  // ─────────────────────────────────────────────────────────────
  //  POSITION CALCULATION (shared by RAF loop and scroll handler)
  // ─────────────────────────────────────────────────────────────

  _applyPosition(time) {
    if (!this.anchorEl || !this.floatEl) return;

    const cfg         = this._cfg;
    const anchorRect  = this.anchorEl.getBoundingClientRect();
    const anchorPoint = this._originPoint(anchorRect, cfg.anchorOrigin);

    const fw = this.floatEl.offsetWidth;
    const fh = this.floatEl.offsetHeight;
    const floatHandle = this._originPoint(
      { left: 0, top: 0, right: fw, bottom: fh, width: fw, height: fh },
      cfg.floatOrigin
    );

    let ox = 0, oy = 0;
    if (cfg.float) {
      const t = (time - this._start) * cfg.speed + cfg.phaseOffset;
      if (cfg.floatAxis === "y" || cfg.floatAxis === "both") oy = Math.sin(t) * cfg.amplitude;
      if (cfg.floatAxis === "x" || cfg.floatAxis === "both") ox = Math.cos(t) * cfg.amplitude;
    }

    const x = anchorPoint.x - floatHandle.x + cfg.offsetX + ox;
    const y = anchorPoint.y - floatHandle.y + cfg.offsetY + oy;

    this.floatEl.style.transform = `
  translate(${x}px, ${y}px)
  rotate(${cfg.rotate}deg)
`;
  }

  // ─────────────────────────────────────────────────────────────
  //  RAF LOOP  (handles float animation; also covers non-scroll frames)
  // ─────────────────────────────────────────────────────────────

  _update(time) {
    this._lastTime = time;
    this._raf = requestAnimationFrame(this._boundUpdate);
    this._applyPosition(time);
  }

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────

  setFloat(enabled) {
    this._base.float = enabled;
    this._resolveConfig();
  }

  setAnchor(el) {
    this.anchorEl = el;
  }

  updateOptions(updates) {
    if (updates.breakpoints) {
      this._breakpoints = this._sortBreakpoints(updates.breakpoints);
      delete updates.breakpoints;
    }
    Object.assign(this._base, updates);
    this._resolveConfig();
  }

  setBreakpoint(maxWidth, partial) {
    this._breakpoints = this._breakpoints.filter(([w]) => w !== maxWidth);
    this._breakpoints.push([maxWidth, partial]);
    this._breakpoints.sort((a, b) => b[0] - a[0]);
    this._resolveConfig();
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._boundResize);
    window.removeEventListener("scroll", this._boundScroll);
    if (this.floatEl) {
      this.floatEl.style.transform  = "";
      this.floatEl.style.position   = "";
      this.floatEl.style.willChange = "";
      this.floatEl.style.zIndex     = "";
    }
  }
}