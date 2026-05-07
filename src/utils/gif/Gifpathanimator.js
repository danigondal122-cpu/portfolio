/**
 * ============================================================
 *  GifPathAnimator
 * ============================================================
 *
 *  Animates one or more GIF images along a detected edge path
 *  of a source image (transparent-background PNG/etc).
 *
 *  Key Features:
 *  ─────────────
 *  • Pixel-level edge detection from any transparent-bg image
 *  • Directional GIF switching based on movement vector
 *    (up, down, left, right, up-left, up-right, down-left, down-right)
 *  • Multiple animators can run on the same or different images
 *  • Per-animator speed, size, direction, spacing, offset
 *  • Pause / Resume / Reverse / Stop
 *  • Easing support (linear, easeIn, easeOut, sine, bounce)
 *  • Trail effect (ghost frames behind the animator)
 *  • Glow / shadow effect around the GIF
 *  • Scale pulse animation (breathing effect)
 *  • Wobble offset from path (floating effect)
 *  • On-complete and on-loop callbacks
 *  • Manual seek to any point on the path
 *  • Debugmode: draw the detected edge path
 *  • Canvas auto-syncs to image resize / scroll
 *  • Multiple animators share one canvas for performance
 *  • Full destroy / cleanup
 *
 *  Usage Example:
 *  ─────────────
 *  import { GifPathAnimator } from "./GifPathAnimator";
 *
 *  const animator = new GifPathAnimator(personImgElement, {
 *    gifs: {
 *      up:         dragonUpImg,
 *      down:       dragonDownImg,
 *      "up-left":  dragonUpLeftImg,
 *      "up-right": dragonUpRightImg,
 *      "down-left":  dragonDownLeftImg,
 *      "down-right": dragonDownRightImg,
 *      left:       dragonLeftImg,   // optional
 *      right:      dragonRightImg,  // optional
 *      default:    dragonDownImg,   // fallback
 *    },
 *    speed: 1.2,
 *    size: 80,
 *    direction: "forward",
 *    alphaThreshold: 20,
 *    step: 2,
 *    trail: { enabled: true, length: 5, opacity: 0.3 },
 *    glow: { enabled: true, color: "#00ffff", blur: 18 },
 *    pulse: { enabled: true, min: 0.85, max: 1.15, speed: 0.05 },
 *    wobble: { enabled: true, amplitude: 6, frequency: 0.04 },
 *    debug: false,
 *    onLoop: () => console.log("lapped!"),
 *  });
 *
 *  animator.pause();
 *  animator.resume();
 *  animator.reverse();
 *  animator.setSpeed(2);
 *  animator.seekTo(0.5);       // jump to 50% of path
 *  animator.setSize(100);
 *  animator.destroy();
 */

export class GifPathAnimator {
  /**
   * @param {HTMLImageElement} sourceImg  — image whose edge we trace
   * @param {object} options
   *
   * options.gifs {object}
   *   Keys: "up" | "down" | "left" | "right" |
   *         "up-left" | "up-right" | "down-left" | "down-right" | "default"
   *   Values: HTMLImageElement (can be <img> or new Image())
   *
   * options.speed          {number}  pixels-per-frame, default 1
   * options.size           {number}  rendered px size of gif, default 64
   * options.direction      {"forward"|"backward"}  default "forward"
   * options.alphaThreshold {number}  0-255, default 20
   * options.step           {number}  edge-detect sampling step, default 2
   * options.startOffset    {number}  0-1, start position on path, default 0
   * options.debug          {boolean} draw edge path, default false
   *
   * options.trail          {object}
   *   .enabled  {boolean}  default false
   *   .length   {number}   ghost count, default 6
   *   .opacity  {number}   max ghost opacity, default 0.35
   *   .decay    {number}   opacity falloff per ghost, default 0.05
   *
   * options.glow           {object}
   *   .enabled  {boolean}  default false
   *   .color    {string}   css color, default "#ffffff"
   *   .blur     {number}   px, default 16
   *
   * options.pulse          {object}
   *   .enabled  {boolean}  default false
   *   .min      {number}   scale min, default 0.8
   *   .max      {number}   scale max, default 1.2
   *   .speed    {number}   oscillation speed, default 0.04
   *
   * options.wobble         {object}
   *   .enabled    {boolean} default false
   *   .amplitude  {number}  px perpendicular offset, default 8
   *   .frequency  {number}  oscillation rate, default 0.03
   *
   * options.onLoop         {function}  called each time animator completes one loop
   * options.onComplete     {function}  called once when path ends (non-looping)
   * options.loop           {boolean}   default true
   */
  constructor(sourceImg, options = {}) {
    this.sourceImg = sourceImg;
    this.opts = this._mergeDefaults(options);

    // State
    this.edgePoints  = [];
    this.naturalW    = 0;
    this.naturalH    = 0;
    this.scaleX      = 1;
    this.scaleY      = 1;
    this.pathIndex   = (this.opts.startOffset || 0);  // float, 0–edgePoints.length
    this.raf         = null;
    this.paused      = false;
    this.destroyed   = false;
    this._pulseT     = 0;
    this._wobbleT    = 0;
    this._prevPt     = null;   // for direction detection
    this._currentGif = null;
    this._loopCount  = 0;
    this._history    = [];     // trail positions

    // Canvas — fixed overlay on body
    this.canvas = document.createElement("canvas");
    this.ctx    = this.canvas.getContext("2d");
    Object.assign(this.canvas.style, {
      position:      "fixed",
      top:           "0",
      left:          "0",
      pointerEvents: "none",
      zIndex:        "9999",
    });
    document.body.appendChild(this.canvas);

    // Boot
    this._boot();

    // Observers
    this._ro = new ResizeObserver(() => this._syncCanvas());
    this._ro.observe(sourceImg);
    this._scrollHandler = () => this._syncCanvas();
    window.addEventListener("scroll", this._scrollHandler, { passive: true });
    window.addEventListener("resize", this._scrollHandler);
  }

  // ─────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────

  /** Pause animation */
  pause() {
    this.paused = true;
  }

  /** Resume after pause */
  resume() {
    this.paused = false;
  }

  /** Toggle pause/resume */
  toggle() {
    this.paused = !this.paused;
  }

  /** Flip travel direction */
  reverse() {
    this.opts.direction = this.opts.direction === "forward" ? "backward" : "forward";
  }

  /** Set speed (pixels-per-frame) */
  setSpeed(n) {
    this.opts.speed = Math.max(0.01, n);
  }

  /** Set rendered GIF size in pixels */
  setSize(n) {
    this.opts.size = Math.max(4, n);
  }

  /**
   * Seek to a position on the path
   * @param {number} t  0 = start, 1 = end
   */
  seekTo(t) {
    if (!this.edgePoints.length) return;
    this.pathIndex = Math.max(0, Math.min(1, t)) * (this.edgePoints.length - 1);
  }

  /** Enable or disable debug path drawing */
  setDebug(bool) {
    this.opts.debug = bool;
  }

  /** Update glow settings at runtime */
  setGlow(opts) {
    Object.assign(this.opts.glow, opts);
  }

  /** Update trail settings at runtime */
  setTrail(opts) {
    Object.assign(this.opts.trail, opts);
  }

  /** Update pulse settings at runtime */
  setPulse(opts) {
    Object.assign(this.opts.pulse, opts);
  }

  /** Update wobble settings at runtime */
  setWobble(opts) {
    Object.assign(this.opts.wobble, opts);
  }

  /** Replace a specific directional gif at runtime */
  setGif(direction, imgElement) {
    this.opts.gifs[direction] = imgElement;
  }

  /**
   * Get current progress (0–1) along the path
   * @returns {number}
   */
  getProgress() {
    if (!this.edgePoints.length) return 0;
    return this.pathIndex / (this.edgePoints.length - 1);
  }

  /**
   * Get current { x, y } position on the canvas
   */
  getPosition() {
    return this._currentCanvasPos || { x: 0, y: 0 };
  }

  /** Stop animation and clean up everything */
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this._ro?.disconnect();
    window.removeEventListener("scroll", this._scrollHandler);
    window.removeEventListener("resize", this._scrollHandler);
    this.canvas.remove();
  }

  // ─────────────────────────────────────────────
  //  INTERNAL SETUP
  // ─────────────────────────────────────────────

  _mergeDefaults(o) {
    return {
      gifs:           o.gifs           || {},
      speed:          o.speed          ?? 1,
      size:           o.size           ?? 64,
      direction:      o.direction      ?? "forward",
      alphaThreshold: o.alphaThreshold ?? 20,
      step:           o.step           ?? 2,
      startOffset:    o.startOffset    ?? 0,
      loop:           o.loop           ?? true,
      debug:          o.debug          ?? false,
      onLoop:         o.onLoop         || null,
      onComplete:     o.onComplete     || null,
      trail: {
        enabled: false, length: 6, opacity: 0.35, decay: 0.05,
        ...(o.trail || {}),
      },
      glow: {
        enabled: false, color: "#ffffff", blur: 16,
        ...(o.glow || {}),
      },
      pulse: {
        enabled: false, min: 0.8, max: 1.2, speed: 0.04,
        ...(o.pulse || {}),
      },
      wobble: {
        enabled: false, amplitude: 8, frequency: 0.03,
        ...(o.wobble || {}),
      },
    };
  }

  async _boot() {
    if (!this.sourceImg.complete) {
      await new Promise((res) => { this.sourceImg.onload = res; });
    }
    await this._detectEdges();
    this._syncCanvas();

    // Apply startOffset
    if (this.opts.startOffset && this.edgePoints.length) {
      this.pathIndex = this.opts.startOffset * (this.edgePoints.length - 1);
    }

    this._startLoop();
  }

  // ─────────────────────────────────────────────
  //  EDGE DETECTION
  // ─────────────────────────────────────────────

  async _detectEdges() {
    const img = this.sourceImg;
    const W = img.naturalWidth;
    const H = img.naturalHeight;

    const offscreen = document.createElement("canvas");
    offscreen.width  = W;
    offscreen.height = H;
    const ctx = offscreen.getContext("2d");
    ctx.drawImage(img, 0, 0, W, H);

    const { data } = ctx.getImageData(0, 0, W, H);
    const threshold = this.opts.alphaThreshold;
    const step = this.opts.step;

    const alpha = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return 0;
      return data[(y * W + x) * 4 + 3];
    };

    const raw = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (alpha(x, y) > threshold) {
          const isEdge =
            alpha(x - step, y      ) <= threshold ||
            alpha(x + step, y      ) <= threshold ||
            alpha(x,       y - step) <= threshold ||
            alpha(x,       y + step) <= threshold ||
            alpha(x - step, y - step) <= threshold ||
            alpha(x + step, y - step) <= threshold ||
            alpha(x - step, y + step) <= threshold ||
            alpha(x + step, y + step) <= threshold;

          if (isEdge) raw.push({ x, y });
        }
      }
    }

    // Sort by angle → smooth loop
    const cx = W / 2;
    const cy = H / 2;
    raw.sort((a, b) =>
      Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
    );

    this.edgePoints = raw;
    this.naturalW   = W;
    this.naturalH   = H;
  }

  // ─────────────────────────────────────────────
  //  CANVAS SYNC
  // ─────────────────────────────────────────────

  _syncCanvas() {
    const rect = this.sourceImg.getBoundingClientRect();
    this.canvas.width          = rect.width;
    this.canvas.height         = rect.height;
    this.canvas.style.left     = `${rect.left}px`;
    this.canvas.style.top      = `${rect.top}px`;
    this.canvas.style.width    = `${rect.width}px`;
    this.canvas.style.height   = `${rect.height}px`;
    this.scaleX = rect.width  / (this.naturalW || 1);
    this.scaleY = rect.height / (this.naturalH || 1);
  }

  // ─────────────────────────────────────────────
  //  DIRECTION DETECTION
  // ─────────────────────────────────────────────

  /**
   * Returns one of 8 direction keys based on movement vector (dx, dy)
   */
  _getDirection(dx, dy) {
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180

    // Map angle to 8-way direction
    if (angle >= -22.5  && angle <  22.5)  return "right";
    if (angle >=  22.5  && angle <  67.5)  return "down-right";
    if (angle >=  67.5  && angle < 112.5)  return "down";
    if (angle >= 112.5  && angle < 157.5)  return "down-left";
    if (angle >= 157.5  || angle < -157.5) return "left";
    if (angle >= -157.5 && angle < -112.5) return "up-left";
    if (angle >= -112.5 && angle < -67.5)  return "up";
    if (angle >= -67.5  && angle < -22.5)  return "up-right";
    return "down";
  }

  /**
   * Pick the best available GIF for a direction,
   * falling back gracefully: exact → cardinal → default
   */
  _pickGif(direction) {
    const g = this.opts.gifs;
    if (g[direction])  return g[direction];

    // Fallback map: diagonal → cardinal
    const fallbacks = {
      "up-left":    ["up",   "left"],
      "up-right":   ["up",   "right"],
      "down-left":  ["down", "left"],
      "down-right": ["down", "right"],
    };
    if (fallbacks[direction]) {
      for (const fb of fallbacks[direction]) {
        if (g[fb]) return g[fb];
      }
    }
    return g["default"] || Object.values(g)[0] || null;
  }

  // ─────────────────────────────────────────────
  //  EFFECTS HELPERS
  // ─────────────────────────────────────────────

  _getPulseScale() {
    if (!this.opts.pulse.enabled) return 1;
    const { min, max, speed } = this.opts.pulse;
    this._pulseT += speed;
    return min + (max - min) * (0.5 + 0.5 * Math.sin(this._pulseT));
  }

  /**
   * Returns a perpendicular offset for wobble effect.
   * Given the movement direction (dx,dy), perpendicular is (-dy, dx) normalised.
   */
  _getWobbleOffset(dx, dy) {
    if (!this.opts.wobble.enabled) return { ox: 0, oy: 0 };
    const { amplitude, frequency } = this.opts.wobble;
    this._wobbleT += frequency;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / mag;
    const ny =  dx / mag;
    const wobble = Math.sin(this._wobbleT) * amplitude;
    return { ox: nx * wobble, oy: ny * wobble };
  }

  _applyGlow(ctx) {
    if (!this.opts.glow.enabled) return;
    ctx.shadowColor = this.opts.glow.color;
    ctx.shadowBlur  = this.opts.glow.blur;
  }

  _clearGlow(ctx) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur  = 0;
  }

  // ─────────────────────────────────────────────
  //  MAIN LOOP
  // ─────────────────────────────────────────────

  _startLoop() {
    const loop = () => {
      if (this.destroyed) return;
      this.raf = requestAnimationFrame(loop);
      this._tick();
    };
    loop();
  }

  _tick() {
    const { ctx, canvas, edgePoints, opts } = this;
    if (!edgePoints.length) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Debug: draw path ──
    if (opts.debug) {
      this._drawDebugPath(ctx);
    }

    if (this.paused) return;

    const len = edgePoints.length;

    // ── Advance index ──
    const delta = opts.direction === "forward" ? opts.speed : -opts.speed;
    this.pathIndex += delta;

    if (opts.loop) {
      if (this.pathIndex >= len) {
        this.pathIndex -= len;
        this._loopCount++;
        opts.onLoop?.();
      } else if (this.pathIndex < 0) {
        this.pathIndex += len;
        this._loopCount++;
        opts.onLoop?.();
      }
    } else {
      if (this.pathIndex >= len || this.pathIndex < 0) {
        this.pathIndex = Math.max(0, Math.min(len - 1, this.pathIndex));
        opts.onComplete?.();
        this.paused = true;
        return;
      }
    }

    const idx = Math.floor(this.pathIndex) % len;
    const pt  = edgePoints[idx];

    // ── Map to canvas coords ──
    const cx = pt.x * this.scaleX;
    const cy = pt.y * this.scaleY;

    // ── Direction ──
    let dx = 0, dy = 0;
    if (this._prevPt) {
      dx = cx - this._prevPt.x;
      dy = cy - this._prevPt.y;
    }
    this._prevPt = { x: cx, y: cy };

    const direction = this._getDirection(dx, dy);
    const gif       = this._pickGif(direction);

    // ── Wobble ──
    const { ox, oy } = this._getWobbleOffset(dx, dy);
    const drawX = cx + ox;
    const drawY = cy + oy;

    this._currentCanvasPos = { x: drawX, y: drawY };

    // ── Trail ──
    if (opts.trail.enabled) {
      this._history.push({ x: drawX, y: drawY, gif });
      if (this._history.length > opts.trail.length + 1) {
        this._history.shift();
      }
      this._drawTrail(ctx);
    }

    // ── Pulse scale ──
    const scale = this._getPulseScale();
    const size  = opts.size * scale;

    // ── Draw GIF ──
    if (gif?.complete) {
      this._applyGlow(ctx);
      ctx.drawImage(gif, drawX - size / 2, drawY - size / 2, size, size);
      this._clearGlow(ctx);
    }
  }

  _drawTrail(ctx) {
    const { trail, size } = this.opts;
    const hist = this._history;
    for (let i = 0; i < hist.length - 1; i++) {
      const t    = i / hist.length;
      const fade = trail.opacity * (1 - (hist.length - 1 - i) * trail.decay);
      if (fade <= 0) continue;
      ctx.globalAlpha = Math.max(0, fade);
      const sz = size * (0.5 + 0.5 * t);
      if (hist[i].gif?.complete) {
        ctx.drawImage(hist[i].gif, hist[i].x - sz / 2, hist[i].y - sz / 2, sz, sz);
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawDebugPath(ctx) {
    if (!this.edgePoints.length) return;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 80, 80, 0.6)";
    ctx.lineWidth   = 1;
    ctx.beginPath();
    const first = this.edgePoints[0];
    ctx.moveTo(first.x * this.scaleX, first.y * this.scaleY);
    for (let i = 1; i < this.edgePoints.length; i++) {
      const p = this.edgePoints[i];
      ctx.lineTo(p.x * this.scaleX, p.y * this.scaleY);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}


// ─────────────────────────────────────────────────────────────────
//  GifPathAnimatorGroup
//  Run multiple GifPathAnimators on the SAME source image,
//  each with independent settings and offsets — useful for
//  a formation of dragons flying in convoy around the oval.
// ─────────────────────────────────────────────────────────────────

export class GifPathAnimatorGroup {
  /**
   * @param {HTMLImageElement} sourceImg
   * @param {object[]} animatorConfigs  — array of option objects for each GifPathAnimator
   *   Each entry can have all GifPathAnimator options plus:
   *   .startOffset {number} 0-1 — stagger starting positions around the path
   */
  constructor(sourceImg, animatorConfigs = []) {
    this.animators = animatorConfigs.map(
      (cfg) => new GifPathAnimator(sourceImg, cfg)
    );
  }

  /** Pause all */
  pause()  { this.animators.forEach((a) => a.pause()); }

  /** Resume all */
  resume() { this.animators.forEach((a) => a.resume()); }

  /** Reverse all */
  reverse() { this.animators.forEach((a) => a.reverse()); }

  /** Set speed on all */
  setSpeed(n) { this.animators.forEach((a) => a.setSpeed(n)); }

  /** Destroy all */
  destroy() { this.animators.forEach((a) => a.destroy()); }

  /** Access individual animator */
  get(index) { return this.animators[index]; }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
//  ██████╗ ██╗███████╗     █████╗ ███╗   ██╗██╗███╗   ███╗ █████╗ ████████╗ ██████╗ ██████╗
// ██╔════╝ ██║██╔════╝    ██╔══██╗████╗  ██║██║████╗ ████║██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗
// ██║  ███╗██║█████╗      ███████║██╔██╗ ██║██║██╔████╔██║███████║   ██║   ██║   ██║██████╔╝
// ██║   ██║██║██╔══╝      ██╔══██║██║╚██╗██║██║██║╚██╔╝██║██╔══██║   ██║   ██║   ██║██╔══██╗
// ╚██████╔╝██║██║         ██║  ██║██║ ╚████║██║██║ ╚═╝ ██║██║  ██║   ██║   ╚██████╔╝██║  ██║
//  ╚═════╝ ╚═╝╚═╝         ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
//
//  GifAnimator  — General-purpose, multi-instance GIF animation controller
//  Completely separate from GifPathAnimator. No edge detection required.
//
//  ANIMATION MODES
//  ───────────────
//  "fixed"          — stays at a fixed (x, y) on screen
//  "anchored"       — sticks to an HTML element (offset supported)
//  "float"          — drifts freely with configurable physics
//  "cursor"         — follows the mouse cursor with lag/spring
//  "scroll"         — moves or appears based on scroll position
//  "hover"          — appears/plays only when an element is hovered
//  "sequence"       — plays a sequence of different GIFs in order
//  "parallax"       — moves at a different rate than scroll (depth illusion)
//  "orbit"          — orbits around a fixed point or element in a circle/ellipse
//  "bounce"         — bounces inside a bounding box (DVD screensaver style)
//  "magnetic"       — snaps toward the nearest anchor from a list when in range
//
//  EFFECTS (stackable on any mode)
//  ────────────────────────────────
//  opacity fade in/out   glow / shadow     scale pulse
//  rotation (spin)       flip H/V          tint color overlay
//  shake on event        enter animation   exit animation
//  click interaction     hover scale       visibility range (scroll-based show/hide)
//
//  USAGE EXAMPLES
//  ──────────────
//
//  // 1. Fixed position GIF on screen
//  const fire = new GifAnimator(fireImg, { mode: "fixed", x: 100, y: 200, size: 80 });
//
//  // 2. Anchored to an element, bottom-right corner
//  const star = new GifAnimator(starImg, {
//    mode: "anchored", anchor: document.querySelector(".hero"),
//    anchorOrigin: "bottom-right", offsetX: 20, offsetY: -10,
//  });
//
//  // 3. Floating freely with drift physics
//  const cloud = new GifAnimator(cloudImg, {
//    mode: "float",
//    float: { speedX: 0.4, speedY: 0.2, bounceEdges: true, gravity: 0.01 },
//  });
//
//  // 4. Cursor follower with spring lag
//  const ghost = new GifAnimator(ghostImg, {
//    mode: "cursor", cursor: { lag: 0.1, offsetX: 16, offsetY: 16 },
//  });
//
//  // 5. Appears when scrolled into a range, disappears after
//  const badge = new GifAnimator(badgeImg, {
//    mode: "scroll",
//    scroll: { showAt: 0.3, hideAt: 0.8 },   // 0-1 fraction of total page height
//  });
//
//  // 6. Plays only while hovering an element
//  const spark = new GifAnimator(sparkImg, {
//    mode: "hover", hoverTarget: document.querySelector(".btn"),
//    enter: { type: "fadeIn", duration: 200 },
//    exit:  { type: "fadeOut", duration: 300 },
//  });
//
//  // 7. Sequence: cycles through multiple GIFs
//  const seq = new GifAnimator([gif1, gif2, gif3], {
//    mode: "sequence",
//    sequence: { durations: [1000, 800, 1200], loop: true },
//  });
//
//  // 8. Orbit around an element
//  const planet = new GifAnimator(planetImg, {
//    mode: "orbit",
//    orbit: { target: document.querySelector(".sun"), rx: 120, ry: 60, speed: 0.01 },
//  });
//
//  // 9. Bounce inside a box
//  const ball = new GifAnimator(ballImg, {
//    mode: "bounce",
//    bounce: { bounds: { x: 0, y: 0, w: 400, h: 300 }, speedX: 2, speedY: 1.5 },
//  });
//
//  // Runtime control
//  fire.pause();
//  fire.resume();
//  fire.setSize(120);
//  fire.setOpacity(0.5);
//  fire.setSpin(2);              // degrees per frame
//  fire.setFlip("horizontal");
//  fire.setGlow({ color: "#ff0", blur: 20 });
//  fire.setTint({ color: "#ff0000", alpha: 0.3 });
//  fire.shake({ intensity: 8, duration: 400 });
//  fire.moveTo(300, 400);        // animate position (fixed/float modes)
//  fire.fadeTo(0, 500);          // fade opacity to value over ms
//  fire.scaleTo(2, 300);         // animate scale over ms
//  fire.destroy();
//
// ═══════════════════════════════════════════════════════════════════════════════

export class GifAnimator {
  /**
   * @param {HTMLImageElement | HTMLImageElement[]} gifSource
   *   Single img element OR array of img elements (for sequence mode)
   *
   * @param {object} opts
   *
   * ── Placement ──────────────────────────────────────────────────────
   * opts.mode          {string}  "fixed"|"anchored"|"float"|"cursor"|
   *                             "scroll"|"hover"|"sequence"|"parallax"|
   *                             "orbit"|"bounce"|"magnetic"
   * opts.x             {number}  initial x (fixed/float/bounce modes)
   * opts.y             {number}  initial y (fixed/float/bounce modes)
   * opts.size          {number}  px, default 64
   * opts.zIndex        {number}  default 9999
   * opts.visible       {boolean} initial visibility, default true
   *
   * ── Anchor mode ────────────────────────────────────────────────────
   * opts.anchor        {HTMLElement}
   * opts.anchorOrigin  {string}  "top-left"|"top-right"|"bottom-left"|
   *                             "bottom-right"|"center"|"top"|"bottom"|
   *                             "left"|"right"  default "top-left"
   * opts.offsetX       {number}  px offset from anchor origin
   * opts.offsetY       {number}  px offset from anchor origin
   *
   * ── Float mode ─────────────────────────────────────────────────────
   * opts.float         {object}
   *   .speedX          {number}  horizontal drift px/frame
   *   .speedY          {number}  vertical drift px/frame
   *   .bounceEdges     {boolean} bounce off viewport edges
   *   .gravity         {number}  downward acceleration per frame
   *   .friction        {number}  velocity multiplier per frame (0-1)
   *   .wind            {number}  horizontal acceleration per frame
   *
   * ── Cursor mode ────────────────────────────────────────────────────
   * opts.cursor        {object}
   *   .lag             {number}  0-1 spring factor (0=instant, 0.05=slow)
   *   .offsetX         {number}  px offset from cursor
   *   .offsetY         {number}  px offset from cursor
   *   .showOnlyOnMove  {boolean} hide when cursor is still
   *
   * ── Scroll mode ────────────────────────────────────────────────────
   * opts.scroll        {object}
   *   .showAt          {number}  0-1 page scroll fraction to appear
   *   .hideAt          {number}  0-1 page scroll fraction to disappear
   *   .parallaxFactor  {number}  moves this fraction of scroll distance
   *   .pinX            {number}  fixed x while scrolling
   *   .pinY            {number}  y when fully scrolled (parallax start)
   *
   * ── Hover mode ─────────────────────────────────────────────────────
   * opts.hoverTarget   {HTMLElement}
   * opts.hoverPosition {string}  "cursor"|"center"|"top"|"bottom"|"left"|"right"
   *
   * ── Sequence mode ──────────────────────────────────────────────────
   * opts.sequence      {object}
   *   .durations       {number[]} ms per gif in the sequence
   *   .loop            {boolean}
   *   .onStep          {function(index)}
   *
   * ── Orbit mode ─────────────────────────────────────────────────────
   * opts.orbit         {object}
   *   .target          {HTMLElement|{x,y}}  center point or element
   *   .rx              {number}  horizontal radius px
   *   .ry              {number}  vertical radius px  (default = rx)
   *   .speed           {number}  radians per frame
   *   .startAngle      {number}  radians, default 0
   *
   * ── Bounce mode ────────────────────────────────────────────────────
   * opts.bounce        {object}
   *   .bounds          {object}  { x, y, w, h } — null = full viewport
   *   .speedX          {number}
   *   .speedY          {number}
   *
   * ── Magnetic mode ──────────────────────────────────────────────────
   * opts.magnetic      {object}
   *   .anchors         {HTMLElement[]}  elements to snap toward
   *   .radius          {number}  snap distance px
   *   .strength        {number}  pull factor 0-1
   *
   * ── Effects ────────────────────────────────────────────────────────
   * opts.opacity       {number}  0-1, default 1
   * opts.spin          {number}  degrees per frame, default 0
   * opts.flip          {string}  null|"horizontal"|"vertical"|"both"
   * opts.glow          {object}  { enabled, color, blur }
   * opts.pulse         {object}  { enabled, min, max, speed }
   * opts.tint          {object}  { enabled, color, alpha }
   * opts.enter         {object}  { type: "fadeIn"|"scaleIn"|"slideIn", duration }
   * opts.exit          {object}  { type: "fadeOut"|"scaleOut"|"slideOut", duration }
   * opts.hoverScale    {number}  scale multiplier on mouse hover (canvas hit-test)
   * opts.onClick       {function}  callback when gif is clicked
   */
  constructor(gifSource, opts = {}) {
    // Support single img or array (sequence mode)
    this._gifs = Array.isArray(gifSource) ? gifSource : [gifSource];
    this._seqIndex = 0;
    this._seqTimer = null;

    this.opts = this._defaults(opts);

    // Runtime state
    this._x         = opts.x ?? 0;
    this._y         = opts.y ?? 0;
    this._vx        = opts.float?.speedX ?? 1;
    this._vy        = opts.float?.speedY ?? 0.5;
    this._opacity   = opts.opacity ?? 1;
    this._scale     = 1;
    this._rotation  = 0;   // degrees, cumulative
    this._visible   = opts.visible ?? true;
    this._orbitAngle = opts.orbit?.startAngle ?? 0;
    this._cursorX   = 0;
    this._cursorY   = 0;
    this._realCursorX = 0;
    this._realCursorY = 0;
    this._shaking   = false;
    this._shakeOffset = { x: 0, y: 0 };
    this._hovered   = false;    // is cursor over this gif's bounding box
    this._hoveredTarget = false; // is cursor over the hoverTarget element
    this._pulseT    = 0;
    this._tweens    = [];        // active tween animations { prop, from, to, start, dur, ease, onDone }
    this._paused    = false;
    this._destroyed = false;

    // Canvas — full-viewport fixed overlay
    this.canvas = document.createElement("canvas");
    this.ctx    = this.canvas.getContext("2d");
    Object.assign(this.canvas.style, {
      position:      "fixed",
      top:           "0",
      left:          "0",
      width:         "100vw",
      height:        "100vh",
      pointerEvents: opts.onClick || opts.hoverScale ? "auto" : "none",
      zIndex:        String(opts.zIndex ?? 9999),
    });
    document.body.appendChild(this.canvas);
    this._resizeCanvas();

    // Event listeners
    this._boundResize  = () => this._resizeCanvas();
    this._boundScroll  = () => this._onScroll();
    this._boundMouse   = (e) => this._onMouse(e);
    this._boundClick   = (e) => this._onCanvasClick(e);

    window.addEventListener("resize", this._boundResize);
    window.addEventListener("scroll", this._boundScroll, { passive: true });
    window.addEventListener("mousemove", this._boundMouse);
    if (opts.onClick || opts.hoverScale) {
      this.canvas.addEventListener("click", this._boundClick);
    }

    // Hover target listeners
    if (this.opts.hoverTarget) {
      this._boundHoverIn  = () => { this._hoveredTarget = true;  this._onHoverIn();  };
      this._boundHoverOut = () => { this._hoveredTarget = false; this._onHoverOut(); };
      this.opts.hoverTarget.addEventListener("mouseenter", this._boundHoverIn);
      this.opts.hoverTarget.addEventListener("mouseleave", this._boundHoverOut);
      if (this.opts.mode === "hover") this._visible = false;
    }

    // Sequence init
    if (this.opts.mode === "sequence") {
      this._startSequence();
    }

    // Enter animation
    if (this.opts.enter?.type && this._visible) {
      this._playEnter();
    }

    // Start RAF loop
    this._startLoop();
  }

  // ═══════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════

  /** Pause animation loop */
  pause()  { this._paused = true; }

  /** Resume animation loop */
  resume() { this._paused = false; }

  /** Toggle pause */
  toggle() { this._paused = !this._paused; }

  /** Show the GIF */
  show() {
    this._visible = true;
    if (this.opts.enter?.type) this._playEnter();
  }

  /** Hide the GIF */
  hide() {
    if (this.opts.exit?.type) {
      this._playExit(() => { this._visible = false; });
    } else {
      this._visible = false;
    }
  }

  /** Set rendered size in px */
  setSize(n) { this.opts.size = Math.max(1, n); }

  /** Set opacity 0-1 */
  setOpacity(n) { this._opacity = Math.max(0, Math.min(1, n)); }

  /** Set spin speed in degrees per frame (0 to stop) */
  setSpin(deg) { this.opts.spin = deg; }

  /** Set flip: null | "horizontal" | "vertical" | "both" */
  setFlip(mode) { this.opts.flip = mode; }

  /** Update glow at runtime */
  setGlow(o) { Object.assign(this.opts.glow, o); }

  /** Set color tint overlay: { color: "#ff0000", alpha: 0.3 } */
  setTint(o) { Object.assign(this.opts.tint, o); }

  /** Update pulse at runtime */
  setPulse(o) { Object.assign(this.opts.pulse, o); }

  /** Move to absolute (x, y) — fixed / float / bounce modes */
  moveTo(x, y) { this._x = x; this._y = y; }

  /**
   * Animate opacity to a target value over `ms` milliseconds
   * @param {number} target  0-1
   * @param {number} ms
   */
  fadeTo(target, ms = 400) {
    this._addTween("_opacity", this._opacity, target, ms, "easeInOut");
  }

  /**
   * Animate scale to a target value over `ms` milliseconds
   * @param {number} target  e.g. 2 = double size
   * @param {number} ms
   */
  scaleTo(target, ms = 300) {
    this._addTween("_scale", this._scale, target, ms, "easeOut");
  }

  /**
   * Shake the gif in place
   * @param {object} o  { intensity: 8, duration: 400 }
   */
  shake(o = {}) {
    const intensity = o.intensity ?? 8;
    const duration  = o.duration  ?? 400;
    const end = performance.now() + duration;
    this._shaking = true;
    const tick = () => {
      if (performance.now() >= end || this._destroyed) {
        this._shaking = false;
        this._shakeOffset = { x: 0, y: 0 };
        return;
      }
      this._shakeOffset = {
        x: (Math.random() - 0.5) * intensity * 2,
        y: (Math.random() - 0.5) * intensity * 2,
      };
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * Advance sequence to next GIF manually
   */
  sequenceNext() {
    if (!this._gifs.length) return;
    this._seqIndex = (this._seqIndex + 1) % this._gifs.length;
    this.opts.sequence?.onStep?.(this._seqIndex);
  }

  /**
   * Jump to a specific GIF in the sequence
   * @param {number} index
   */
  sequenceTo(index) {
    this._seqIndex = Math.max(0, Math.min(this._gifs.length - 1, index));
  }

  /**
   * Replace the gif image(s) at runtime
   * @param {HTMLImageElement|HTMLImageElement[]} newGif
   */
  setGif(newGif) {
    this._gifs = Array.isArray(newGif) ? newGif : [newGif];
    this._seqIndex = 0;
  }

  /**
   * Update orbit parameters at runtime
   * @param {object} o  partial orbit config
   */
  setOrbit(o) { Object.assign(this.opts.orbit, o); }

  /**
   * Update float parameters at runtime
   */
  setFloat(o) { Object.assign(this.opts.float, o); }

  /** Destroy and remove from DOM */
  destroy() {
    this._destroyed = true;
    clearTimeout(this._seqTimer);
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize",    this._boundResize);
    window.removeEventListener("scroll",    this._boundScroll);
    window.removeEventListener("mousemove", this._boundMouse);
    if (this._boundClick) this.canvas.removeEventListener("click", this._boundClick);
    if (this.opts.hoverTarget) {
      this.opts.hoverTarget.removeEventListener("mouseenter", this._boundHoverIn);
      this.opts.hoverTarget.removeEventListener("mouseleave", this._boundHoverOut);
    }
    this.canvas.remove();
  }

  // ═══════════════════════════════════════════════════
  //  DEFAULTS
  // ═══════════════════════════════════════════════════

  _defaults(o) {
    return {
      mode:         o.mode         ?? "fixed",
      x:            o.x            ?? 0,
      y:            o.y            ?? 0,
      size:         o.size         ?? 64,
      zIndex:       o.zIndex       ?? 9999,
      visible:      o.visible      ?? true,
      opacity:      o.opacity      ?? 1,
      spin:         o.spin         ?? 0,
      flip:         o.flip         ?? null,
      hoverScale:   o.hoverScale   ?? null,
      onClick:      o.onClick      ?? null,
      hoverTarget:  o.hoverTarget  ?? null,
      hoverPosition: o.hoverPosition ?? "cursor",
      anchor:       o.anchor       ?? null,
      anchorOrigin: o.anchorOrigin ?? "top-left",
      offsetX:      o.offsetX      ?? 0,
      offsetY:      o.offsetY      ?? 0,
      glow:   { enabled: false, color: "#ffffff", blur: 16,  ...(o.glow   || {}) },
      pulse:  { enabled: false, min: 0.85, max: 1.15, speed: 0.04, ...(o.pulse  || {}) },
      tint:   { enabled: false, color: "#ff0000", alpha: 0.3, ...(o.tint   || {}) },
      enter:  o.enter  ?? null,
      exit:   o.exit   ?? null,
      float:  { speedX: 0.5, speedY: 0.3, bounceEdges: true, gravity: 0, friction: 1, wind: 0, ...(o.float || {}) },
      cursor: { lag: 0.08, offsetX: 0, offsetY: 0, showOnlyOnMove: false, ...(o.cursor || {}) },
      scroll: { showAt: 0, hideAt: 1, parallaxFactor: 0, pinX: 0, pinY: 0, ...(o.scroll || {}) },
      sequence: { durations: [], loop: true, onStep: null, ...(o.sequence || {}) },
      orbit:  { target: null, rx: 100, ry: null, speed: 0.02, startAngle: 0, ...(o.orbit || {}) },
      bounce: { bounds: null, speedX: 2, speedY: 1.5, ...(o.bounce || {}) },
      magnetic: { anchors: [], radius: 120, strength: 0.15, ...(o.magnetic || {}) },
    };
  }

  // ═══════════════════════════════════════════════════
  //  CANVAS RESIZE
  // ═══════════════════════════════════════════════════

  _resizeCanvas() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._vpW = window.innerWidth;
    this._vpH = window.innerHeight;
  }

  // ═══════════════════════════════════════════════════
  //  MAIN LOOP
  // ═══════════════════════════════════════════════════

  _startLoop() {
    const loop = () => {
      if (this._destroyed) return;
      this._raf = requestAnimationFrame(loop);
      this._frame();
    };
    loop();
  }

  _frame() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this._processTweens();

    if (!this._visible) return;

    const gif = this._gifs[this._seqIndex % this._gifs.length];
    if (!gif?.complete) return;

    // ── Compute position by mode ──
    const pos = this._computePosition();
    if (!pos) return;

    let { x, y } = pos;

    // Shake offset
    if (this._shaking) {
      x += this._shakeOffset.x;
      y += this._shakeOffset.y;
    }

    // Hover-target position override
    if (this.opts.mode === "hover" && this._hoveredTarget) {
      const hp = this._hoverPosition();
      if (hp) { x = hp.x; y = hp.y; }
    }

    // Store for hit-testing
    this._lastDrawX = x;
    this._lastDrawY = y;

    // ── Compute size ──
    const pulseScale = this._getPulseScale();
    const hoverMul   = (this._hovered && this.opts.hoverScale) ? this.opts.hoverScale : 1;
    const size       = this.opts.size * this._scale * pulseScale * hoverMul;

    // ── Spin ──
    this._rotation = (this._rotation + (this.opts.spin || 0)) % 360;

    // ── Draw ──
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this._opacity));

    // Transform pivot to gif center
    ctx.translate(x, y);

    if (this._rotation !== 0) {
      ctx.rotate((this._rotation * Math.PI) / 180);
    }

    // Flip transforms
    if (this.opts.flip === "horizontal") ctx.scale(-1, 1);
    else if (this.opts.flip === "vertical") ctx.scale(1, -1);
    else if (this.opts.flip === "both") ctx.scale(-1, -1);

    // Glow
    if (this.opts.glow.enabled) {
      ctx.shadowColor = this.opts.glow.color;
      ctx.shadowBlur  = this.opts.glow.blur;
    }

    const half = size / 2;
    ctx.drawImage(gif, -half, -half, size, size);

    // Tint overlay
    if (this.opts.tint.enabled) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = this.opts.tint.alpha;
      ctx.fillStyle   = this.opts.tint.color;
      ctx.fillRect(-half, -half, size, size);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = Math.max(0, Math.min(1, this._opacity));
    }

    ctx.restore();
  }

  // ═══════════════════════════════════════════════════
  //  POSITION COMPUTATION BY MODE
  // ═══════════════════════════════════════════════════

  _computePosition() {
    switch (this.opts.mode) {

      case "fixed":
        return { x: this._x, y: this._y };

      case "anchored":
        return this._anchoredPos();

      case "float":
        return this._floatTick();

      case "cursor":
        return this._cursorTick();

      case "scroll":
        return this._scrollTick();

      case "hover":
        // position computed later (override), return current
        return { x: this._x, y: this._y };

      case "sequence":
        return { x: this._x, y: this._y };

      case "parallax":
        return this._parallaxTick();

      case "orbit":
        return this._orbitTick();

      case "bounce":
        return this._bounceTick();

      case "magnetic":
        return this._magneticTick();

      default:
        return { x: this._x, y: this._y };
    }
  }

  // ── Anchored ─────────────────────────────────────────
  _anchoredPos() {
    const el = this.opts.anchor;
    if (!el) return { x: this._x, y: this._y };
    const r  = el.getBoundingClientRect();
    const ox = this.opts.offsetX;
    const oy = this.opts.offsetY;

    const origins = {
      "top-left":     { x: r.left,                    y: r.top },
      "top-right":    { x: r.right,                   y: r.top },
      "bottom-left":  { x: r.left,                    y: r.bottom },
      "bottom-right": { x: r.right,                   y: r.bottom },
      "center":       { x: r.left + r.width  / 2,     y: r.top + r.height / 2 },
      "top":          { x: r.left + r.width  / 2,     y: r.top },
      "bottom":       { x: r.left + r.width  / 2,     y: r.bottom },
      "left":         { x: r.left,                    y: r.top + r.height / 2 },
      "right":        { x: r.right,                   y: r.top + r.height / 2 },
    };
    const base = origins[this.opts.anchorOrigin] || origins["top-left"];
    return { x: base.x + ox, y: base.y + oy };
  }

  // ── Float ─────────────────────────────────────────────
  _floatTick() {
    const f = this.opts.float;
    this._vx = (this._vx + (f.wind    || 0)) * (f.friction ?? 1);
    this._vy = (this._vy + (f.gravity || 0)) * (f.friction ?? 1);
    this._x += this._vx;
    this._y += this._vy;

    if (f.bounceEdges) {
      const half = this.opts.size / 2;
      if (this._x - half < 0)                { this._x = half;                this._vx *= -1; }
      if (this._x + half > this._vpW)         { this._x = this._vpW - half;   this._vx *= -1; }
      if (this._y - half < 0)                { this._y = half;                this._vy *= -1; }
      if (this._y + half > this._vpH)         { this._y = this._vpH - half;   this._vy *= -1; }
    }
    return { x: this._x, y: this._y };
  }

  // ── Cursor ────────────────────────────────────────────
  _cursorTick() {
    const c   = this.opts.cursor;
    const lag = Math.max(0.01, Math.min(1, c.lag ?? 0.08));
    this._x += (this._realCursorX + (c.offsetX ?? 0) - this._x) * lag;
    this._y += (this._realCursorY + (c.offsetY ?? 0) - this._y) * lag;
    return { x: this._x, y: this._y };
  }

  // ── Scroll visibility + parallax ──────────────────────
  _scrollTick() {
    const s        = this.opts.scroll;
    const docH     = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docH > 0 ? window.scrollY / docH : 0;

    // Visibility range
    this._visible = progress >= s.showAt && progress <= s.hideAt;

    // Parallax movement
    const py = (s.pinY ?? 0) + window.scrollY * (s.parallaxFactor ?? 0);
    return { x: s.pinX ?? this._x, y: py };
  }

  // ── Parallax (independent of show/hide) ───────────────
  _parallaxTick() {
    const s  = this.opts.scroll;
    const py = (s.pinY ?? 0) + window.scrollY * (s.parallaxFactor ?? 0.5);
    return { x: s.pinX ?? this._x, y: py };
  }

  // ── Orbit ─────────────────────────────────────────────
  _orbitTick() {
    const o = this.opts.orbit;
    this._orbitAngle += o.speed ?? 0.02;

    let cx = 0, cy = 0;
    if (o.target instanceof HTMLElement) {
      const r = o.target.getBoundingClientRect();
      cx = r.left + r.width  / 2;
      cy = r.top  + r.height / 2;
    } else if (o.target?.x !== undefined) {
      cx = o.target.x;
      cy = o.target.y;
    }

    const rx = o.rx ?? 100;
    const ry = o.ry ?? rx;
    return {
      x: cx + rx * Math.cos(this._orbitAngle),
      y: cy + ry * Math.sin(this._orbitAngle),
    };
  }

  // ── Bounce ────────────────────────────────────────────
  _bounceTick() {
    const b    = this.opts.bounce;
    const half = this.opts.size / 2;
    const box  = b.bounds || { x: 0, y: 0, w: this._vpW, h: this._vpH };

    this._x += this._vx;
    this._y += this._vy;

    if (this._x - half < box.x)           { this._x = box.x + half;           this._vx *= -1; }
    if (this._x + half > box.x + box.w)   { this._x = box.x + box.w - half;   this._vx *= -1; }
    if (this._y - half < box.y)           { this._y = box.y + half;           this._vy *= -1; }
    if (this._y + half > box.y + box.h)   { this._y = box.y + box.h - half;   this._vy *= -1; }

    return { x: this._x, y: this._y };
  }

  // ── Magnetic ──────────────────────────────────────────
  _magneticTick() {
    this._x += this._vx;
    this._y += this._vy;

    const { anchors, radius, strength } = this.opts.magnetic;
    let pulled = false;
    for (const el of (anchors || [])) {
      const r  = el.getBoundingClientRect();
      const ax = r.left + r.width  / 2;
      const ay = r.top  + r.height / 2;
      const dx = ax - this._x;
      const dy = ay - this._y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        this._x += dx * (strength ?? 0.1);
        this._y += dy * (strength ?? 0.1);
        pulled = true;
        break;
      }
    }

    if (!pulled && this.opts.float.bounceEdges) {
      // Bounce off viewport when not being pulled
      const half = this.opts.size / 2;
      if (this._x - half < 0)          { this._x = half;             this._vx *= -1; }
      if (this._x + half > this._vpW)  { this._x = this._vpW - half; this._vx *= -1; }
      if (this._y - half < 0)          { this._y = half;             this._vy *= -1; }
      if (this._y + half > this._vpH)  { this._y = this._vpH - half; this._vy *= -1; }
    }

    return { x: this._x, y: this._y };
  }

  // ── Hover position ────────────────────────────────────
  _hoverPosition() {
    const el = this.opts.hoverTarget;
    if (!el) return null;
    const r = el.getBoundingClientRect();

    const positions = {
      cursor: { x: this._realCursorX, y: this._realCursorY },
      center: { x: r.left + r.width / 2,  y: r.top + r.height / 2 },
      top:    { x: r.left + r.width / 2,  y: r.top },
      bottom: { x: r.left + r.width / 2,  y: r.bottom },
      left:   { x: r.left,                y: r.top + r.height / 2 },
      right:  { x: r.right,               y: r.top + r.height / 2 },
    };
    const p = positions[this.opts.hoverPosition] || positions.cursor;
    return { x: p.x + (this.opts.offsetX || 0), y: p.y + (this.opts.offsetY || 0) };
  }

  // ═══════════════════════════════════════════════════
  //  EFFECTS
  // ═══════════════════════════════════════════════════

  _getPulseScale() {
    if (!this.opts.pulse.enabled) return 1;
    const { min, max, speed } = this.opts.pulse;
    this._pulseT += speed;
    return min + (max - min) * (0.5 + 0.5 * Math.sin(this._pulseT));
  }

  // ═══════════════════════════════════════════════════
  //  ENTER / EXIT ANIMATIONS
  // ═══════════════════════════════════════════════════

  _playEnter() {
    const e = this.opts.enter;
    if (!e) return;
    if (e.type === "fadeIn")   { this._opacity = 0; this.fadeTo(1, e.duration ?? 400); }
    if (e.type === "scaleIn")  { this._scale = 0;   this.scaleTo(1, e.duration ?? 400); }
    if (e.type === "slideIn")  {
      const orig = this._y;
      this._y = orig + 40;
      this._opacity = 0;
      this._addTween("_y",       this._y,  orig, e.duration ?? 400, "easeOut");
      this._addTween("_opacity", 0,        1,    e.duration ?? 400, "easeOut");
    }
  }

  _playExit(onDone) {
    const e = this.opts.exit;
    if (!e) { onDone?.(); return; }
    if (e.type === "fadeOut")  { this.fadeTo(0, e.duration ?? 400);  setTimeout(onDone, e.duration ?? 400); }
    if (e.type === "scaleOut") { this.scaleTo(0, e.duration ?? 400); setTimeout(onDone, e.duration ?? 400); }
    if (e.type === "slideOut") {
      this._addTween("_y",       this._y, this._y + 40, e.duration ?? 400, "easeIn");
      this._addTween("_opacity", 1, 0,                  e.duration ?? 400, "easeIn");
      setTimeout(onDone, e.duration ?? 400);
    }
  }

  // ═══════════════════════════════════════════════════
  //  HOVER TARGET EVENTS
  // ═══════════════════════════════════════════════════

  _onHoverIn() {
    if (this.opts.mode === "hover") {
      this._visible = true;
      this._playEnter();
    }
  }

  _onHoverOut() {
    if (this.opts.mode === "hover") {
      this._playExit(() => { this._visible = false; });
    }
  }

  // ═══════════════════════════════════════════════════
  //  SEQUENCE
  // ═══════════════════════════════════════════════════

  _startSequence() {
    const next = () => {
      if (this._destroyed) return;
      this._seqIndex = (this._seqIndex + 1) % this._gifs.length;
      this.opts.sequence.onStep?.(this._seqIndex);
      if (!this.opts.sequence.loop && this._seqIndex === 0) return;
      const dur = this.opts.sequence.durations[this._seqIndex] ?? 1000;
      this._seqTimer = setTimeout(next, dur);
    };
    const firstDur = this.opts.sequence.durations[0] ?? 1000;
    this._seqTimer = setTimeout(next, firstDur);
  }

  // ═══════════════════════════════════════════════════
  //  TWEENS (simple property animation)
  // ═══════════════════════════════════════════════════

  _addTween(prop, from, to, dur, ease = "linear", onDone = null) {
    // Remove existing tween for same property
    this._tweens = this._tweens.filter(t => t.prop !== prop);
    this._tweens.push({ prop, from, to, start: performance.now(), dur, ease, onDone });
  }

  _processTweens() {
    const now = performance.now();
    this._tweens = this._tweens.filter(t => {
      const raw = Math.min(1, (now - t.start) / t.dur);
      const p   = this._ease(raw, t.ease);
      this[t.prop] = t.from + (t.to - t.from) * p;
      if (raw >= 1) {
        this[t.prop] = t.to;
        t.onDone?.();
        return false;
      }
      return true;
    });
  }

  _ease(t, type) {
    switch (type) {
      case "easeIn":    return t * t;
      case "easeOut":   return 1 - (1 - t) * (1 - t);
      case "easeInOut": return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case "sine":      return Math.sin((t * Math.PI) / 2);
      case "bounce":
        if (t < 1 / 2.75)      return 7.5625 * t * t;
        else if (t < 2 / 2.75) { t -= 1.5 / 2.75;   return 7.5625 * t * t + 0.75; }
        else if (t < 2.5/2.75) { t -= 2.25 / 2.75;  return 7.5625 * t * t + 0.9375; }
        else                   { t -= 2.625 / 2.75;  return 7.5625 * t * t + 0.984375; }
      default:          return t; // linear
    }
  }

  // ═══════════════════════════════════════════════════
  //  EVENT HANDLERS
  // ═══════════════════════════════════════════════════

  _onMouse(e) {
    this._realCursorX = e.clientX;
    this._realCursorY = e.clientY;

    // Hit test for hoverScale / onClick
    if (this._lastDrawX !== undefined) {
      const half = (this.opts.size * this._scale) / 2;
      this._hovered =
        e.clientX >= this._lastDrawX - half &&
        e.clientX <= this._lastDrawX + half &&
        e.clientY >= this._lastDrawY - half &&
        e.clientY <= this._lastDrawY + half;
    }
  }

  _onScroll() { /* scroll position read live in _scrollTick */ }

  _onCanvasClick(e) {
    if (!this.opts.onClick) return;
    const half = (this.opts.size * this._scale) / 2;
    if (
      this._lastDrawX !== undefined &&
      e.clientX >= this._lastDrawX - half &&
      e.clientX <= this._lastDrawX + half &&
      e.clientY >= this._lastDrawY - half &&
      e.clientY <= this._lastDrawY + half
    ) {
      this.opts.onClick({ x: this._lastDrawX, y: this._lastDrawY });
    }
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  GifAnimatorManager
//  Central registry — create, name, group, and control all GifAnimators on
//  a page from one place. Useful when you have 10+ gifs across sections.
// ═══════════════════════════════════════════════════════════════════════════════

export class GifAnimatorManager {
  constructor() {
    /** @type {Map<string, GifAnimator>} */
    this._registry = new Map();
  }

  /**
   * Create and register a named GifAnimator
   * @param {string}            id         unique name
   * @param {HTMLImageElement}  gif
   * @param {object}            opts       GifAnimator options
   * @returns {GifAnimator}
   */
  add(id, gif, opts = {}) {
    if (this._registry.has(id)) this._registry.get(id).destroy();
    const a = new GifAnimator(gif, opts);
    this._registry.set(id, a);
    return a;
  }

  /**
   * Get a registered animator by id
   * @param {string} id
   * @returns {GifAnimator|undefined}
   */
  get(id) { return this._registry.get(id); }

  /**
   * Pause all or a specific group tag
   * @param {string} [tag]  if provided, only pause animators whose id starts with tag
   */
  pauseAll(tag) { this._each(tag, a => a.pause()); }

  /** Resume all or a tagged group */
  resumeAll(tag) { this._each(tag, a => a.resume()); }

  /** Destroy all or a tagged group */
  destroyAll(tag) {
    this._each(tag, (a, id) => {
      a.destroy();
      this._registry.delete(id);
    });
  }

  /** Destroy a single animator by id */
  remove(id) {
    this._registry.get(id)?.destroy();
    this._registry.delete(id);
  }

  /** List all registered ids */
  list() { return [...this._registry.keys()]; }

  _each(tag, fn) {
    for (const [id, a] of this._registry) {
      if (!tag || id.startsWith(tag)) fn(a, id);
    }
  }
}