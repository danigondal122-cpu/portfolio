/**
 * EdgeImageOrbit
 *
 * - Detects edge pixels from transparent image
 * - Converts to polar space, keeps outermost radius per angle
 * - Fills gaps + smooths path
 * - Animates orbiter along clean contour
 * - Rotates orbiter to face direction of travel
 */

export class EdgeImageOrbit {
  constructor(sourceImg, orbiterImg, config = {}) {
    this.sourceImg  = sourceImg;
    this.orbiterImg = orbiterImg;

    this.cfg = {
      speed:          config.speed          ?? 0.8,
      orbiterSize:    config.orbiterSize    ?? 24,
      alphaThreshold: config.alphaThreshold ?? 20,
      step:           config.step           ?? 2,

      // Rotation offset in degrees.
      // Adjust if your sprite points the wrong way after launch:
      //   0   = sprite points RIGHT (→)  most horizontal sprites
      //  -90  = sprite points UP   (↑)  rockets drawn nose-up  ← default
      //   90  = sprite points DOWN (↓)
      //  180  = sprite points LEFT (←)
      rotationOffset: config.rotationOffset ?? -90,
    };

    this.edgePoints = [];
    this.pathIndex  = 0;
    this.raf        = null;

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

    this._setup();

    this._ro = new ResizeObserver(() => this._onResize());
    this._ro.observe(sourceImg);

    this._scrollHandler = () => this._syncCanvasPosition();
    window.addEventListener("scroll", this._scrollHandler, { passive: true });
    window.addEventListener("resize", () => this._onResize());
  }

  // ─────────────────────────────────────────────
  //  SETUP
  // ─────────────────────────────────────────────

  async _setup() {
    if (!this.sourceImg.complete) {
      await new Promise((res) => { this.sourceImg.onload = res; });
    }
    await this._detectEdges();
    this._syncCanvasPosition();
    this._startLoop();
  }

  // ─────────────────────────────────────────────
  //  EDGE DETECTION
  // ─────────────────────────────────────────────

  async _detectEdges() {
    const img = this.sourceImg;
    const W   = img.naturalWidth;
    const H   = img.naturalHeight;

    const offscreen  = document.createElement("canvas");
    offscreen.width  = W;
    offscreen.height = H;
    const ctx        = offscreen.getContext("2d");
    ctx.drawImage(img, 0, 0, W, H);

    const { data }   = ctx.getImageData(0, 0, W, H);
    const threshold  = this.cfg.alphaThreshold;
    const step       = this.cfg.step;

    const alpha = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return 0;
      return data[(y * W + x) * 4 + 3];
    };

    // 1. Raw edge detection
    const rawPoints = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (alpha(x, y) > threshold) {
          const isEdge =
            alpha(x - step, y      ) <= threshold ||
            alpha(x + step, y      ) <= threshold ||
            alpha(x,        y - step) <= threshold ||
            alpha(x,        y + step) <= threshold ||
            alpha(x - step, y - step) <= threshold ||
            alpha(x + step, y - step) <= threshold ||
            alpha(x - step, y + step) <= threshold ||
            alpha(x + step, y + step) <= threshold;

          if (isEdge) rawPoints.push({ x, y });
        }
      }
    }

    const cx = W / 2;
    const cy = H / 2;

    // 2. Keep outermost point per angle bucket (~3 degree bins)
    const buckets    = new Map();
    const bucketSize = 0.02;

    for (const p of rawPoints) {
      const dx     = p.x - cx;
      const dy     = p.y - cy;
      const angle  = Math.atan2(dy, dx);
      const radius = Math.sqrt(dx * dx + dy * dy);
      const key    = Math.round(angle / bucketSize);

      if (!buckets.has(key) || buckets.get(key).radius < radius) {
        buckets.set(key, { angle, radius });
      }
    }

    // 3. Rebuild contour from buckets
    let smoothPoints = [];
    for (const { angle, radius } of buckets.values()) {
      smoothPoints.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        angle,
        radius,
      });
    }
    smoothPoints.sort((a, b) => a.angle - b.angle);

    // 4. Fill angular gaps with interpolated points
    const finalPoints = [];
    for (let i = 0; i < smoothPoints.length; i++) {
      const a = smoothPoints[i];
      const b = smoothPoints[(i + 1) % smoothPoints.length];

      finalPoints.push(a);

      let angleDiff = b.angle - a.angle;
      if (angleDiff < 0) angleDiff += Math.PI * 2;

      if (angleDiff > 0.05) {
        const steps = Math.ceil(angleDiff / 0.03);
        for (let j = 1; j < steps; j++) {
          const t      = j / steps;
          const angle  = a.angle + t * angleDiff;
          const radius = a.radius + t * (b.radius - a.radius);
          finalPoints.push({
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
          });
        }
      }
    }

    // 5. Laplacian smooth (2 passes)
    this._smooth(finalPoints, 2);

    this.edgePoints = finalPoints;
    this.naturalW   = W;
    this.naturalH   = H;
  }

  _smooth(points, iterations = 1) {
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < points.length; i++) {
        const prev  = points[(i - 1 + points.length) % points.length];
        const next  = points[(i + 1) % points.length];
        points[i].x = (prev.x + points[i].x + next.x) / 3;
        points[i].y = (prev.y + points[i].y + next.y) / 3;
      }
    }
  }

  // ─────────────────────────────────────────────
  //  CANVAS SYNC
  // ─────────────────────────────────────────────

  _syncCanvasPosition() {
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

  _onResize() {
    this._syncCanvasPosition();
  }

  // ─────────────────────────────────────────────
  //  ANIMATION LOOP
  // ─────────────────────────────────────────────

  _startLoop() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this._draw();
    };
    loop();
  }

  _draw() {
    const { canvas, ctx, edgePoints, orbiterImg, cfg } = this;
    if (!edgePoints.length) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Advance index ──
    this.pathIndex = (this.pathIndex + cfg.speed) % edgePoints.length;

    const len = edgePoints.length;
    const idx = Math.floor(this.pathIndex);

    // Current canvas position
    const pt = edgePoints[idx];
    const cx = pt.x * this.scaleX;
    const cy = pt.y * this.scaleY;

    // ── Heading: look a few points ahead for a stable angle ──
    // Using 3+ points of look-ahead prevents jitter on tight curves.
    const lookAhead = Math.max(3, Math.round(cfg.speed) + 3);
    const nextPt    = edgePoints[(idx + lookAhead) % len];
    const nx        = nextPt.x * this.scaleX;
    const ny        = nextPt.y * this.scaleY;

    // Angle of travel (radians)
    const travelAngle = Math.atan2(ny - cy, nx - cx);

    // Add sprite's intrinsic rotation offset so nose faces forward
    const drawAngle = travelAngle + (cfg.rotationOffset * Math.PI) / 180;

    // ── Draw: translate → rotate → draw centred on position ──
    const half = cfg.orbiterSize / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(drawAngle);
    ctx.drawImage(orbiterImg, -half, -half, cfg.orbiterSize, cfg.orbiterSize);
    ctx.restore();
  }

  // ─────────────────────────────────────────────
  //  CLEANUP
  // ─────────────────────────────────────────────

  destroy() {
    cancelAnimationFrame(this.raf);
    this._ro?.disconnect();
    window.removeEventListener("scroll",  this._scrollHandler);
    window.removeEventListener("resize",  this._onResize);
    this.canvas.remove();
  }
}