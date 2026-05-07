/**
 * ═══════════════════════════════════════════════════════════════
 *  OrbitalSystem  (v2)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Changes from v1:
 *  ─────────────────
 *  • SCROLL FIX — buttons now reposition synchronously on every
 *    scroll event (same pattern as FloatingImage v2). No more
 *    snap-back lag when the page scrolls.
 *
 *  • FADE IN/OUT — each button fades in as it enters a visible
 *    arc of the ring and fades out as it exits. The fade zone
 *    width is configurable (fadeZone: 0–1, fraction of full ring).
 *
 *  • DYNAMIC BUTTONS — addButton() / removeButton() at runtime.
 *    The system auto-distributes across rings using the
 *    `distribution` option array.
 *
 *  • DISTRIBUTION — configurable per-ring button count:
 *    distribution: [1, 2, 3]  (inner=1, middle=2, outer=3)
 *    You can pass [2, 3, 4] or any combo — buttons wrap across
 *    rings if you supply more buttons than the total count.
 *
 *  USAGE
 *  ─────
 *  const orbital = new OrbitalSystem(imgEl, {
 *    buttons: [ { icon, label, description }, … ],
 *    speed:          0.004,
 *    buttonSize:     44,
 *    iconSize:       22,
 *    darkThreshold:  80,
 *    step:           2,
 *    tooltipWidth:   160,
 *    distribution:   [1, 2, 3],
 *    speedMultipliers: [1.0, 0.7, 0.5],
 *    fadeZone:       0.12,   // 0–1: fraction of ring that fades in/out
 *  });
 *
 *  orbital.pause();
 *  orbital.resume();
 *  orbital.setSpeed(0.006);
 *  orbital.addButton({ icon, label, description });
 *  orbital.removeButton(index);
 *  orbital.destroy();
 */

export class OrbitalSystem {
  constructor(sourceImg, options = {}) {
    this.sourceImg = sourceImg;
    this._destroyed = false;

    this.opts = {
      buttons:          options.buttons          || [],
      speed:            options.speed            ?? 0.004,
      buttonSize:       options.buttonSize       ?? 44,
      iconSize:         options.iconSize         ?? 22,
      darkThreshold:    options.darkThreshold    ?? 80,
      step:             options.step             ?? 2,
      tooltipWidth:     options.tooltipWidth     ?? 160,
      distribution:     options.distribution     || [1, 2, 3],
      speedMultipliers: options.speedMultipliers || [1.0, 0.7, 0.5],
      // fadeZone: fraction of full ring length used for fade in + fade out
      // 0.10 = 10% fade in at start, 10% fade out at end
      fadeZone:         options.fadeZone         ?? 0.12,
    };

    this._rings    = [];
    this._orbiters = [];
    this._paused   = false;
    this._raf      = null;
    this._naturalW = 0;
    this._naturalH = 0;
    this._scaleX   = 1;
    this._scaleY   = 1;
    this._imgRect  = { left: 0, top: 0, width: 0, height: 0 };
    this._hovering = null;
    this._lastTime = 0;

    // Fixed canvas overlay (for optional debug drawing)
    this.canvas = document.createElement("canvas");
    this.ctx    = this.canvas.getContext("2d");
    Object.assign(this.canvas.style, {
      position:      "fixed",
      top:           "0",
      left:          "0",
      pointerEvents: "none",
      zIndex:        "100",
    });
    document.body.appendChild(this.canvas);

    // ── Listeners ──────────────────────────────────────────────
    this._ro = new ResizeObserver(() => this._syncLayout());
    this._ro.observe(sourceImg);

    // SCROLL FIX: reposition buttons immediately on scroll
    // without waiting for the next RAF frame
    this._scrollHandler = () => this._applyPositions();
    this._resizeHandler = () => {
      this._syncLayout();
      this._applyPositions();
    };
    window.addEventListener("scroll", this._scrollHandler, { passive: true });
    window.addEventListener("resize", this._resizeHandler);

    this._setup();
  }

  // ─────────────────────────────────────────────────────────────
  //  SETUP
  // ─────────────────────────────────────────────────────────────

async _setup() {
  if (!this.sourceImg.complete) {
    await new Promise(res => { this.sourceImg.onload = res; });
  }
  if (this._destroyed) return;  // ← add this guard after the await
  await this._detectRings();
  if (this._destroyed) return;  // ← and this one
  this._buildOrbiters();
  this._syncLayout();
  this._startLoop();
}

  // ─────────────────────────────────────────────────────────────
  //  RING DETECTION  (unchanged logic, same as v1)
  // ─────────────────────────────────────────────────────────────

  async _detectRings() {
    const img = this.sourceImg;
    const W   = img.naturalWidth;
    const H   = img.naturalHeight;
    this._naturalW = W;
    this._naturalH = H;

    const off = document.createElement("canvas");
    off.width  = W;
    off.height = H;
    const ctx  = off.getContext("2d");
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    const cx        = W / 2;
    const cy        = H / 2;
    const threshold = this.opts.darkThreshold;
    const step      = this.opts.step;

    const darkPixels = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const i = (y * W + x) * 4;
        const a = data[i + 3];
        if (a < 50) continue;
        const lightness = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        if (lightness < threshold) {
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          darkPixels.push({ x, y, dist });
        }
      }
    }

    if (!darkPixels.length) {
      console.warn("OrbitalSystem: no dark pixels found — adjust darkThreshold");
      return;
    }

    darkPixels.sort((a, b) => a.dist - b.dist);

    const clusterGap = Math.max(
      10,
      (darkPixels[darkPixels.length - 1].dist - darkPixels[0].dist) / 20
    );

    const clusters = [];
    let current = [darkPixels[0]];
    for (let i = 1; i < darkPixels.length; i++) {
      if (darkPixels[i].dist - darkPixels[i - 1].dist > clusterGap) {
        clusters.push(current);
        current = [];
      }
      current.push(darkPixels[i]);
    }
    clusters.push(current);

    const numRings = this.opts.distribution.length;
    const topN = clusters
      .sort((a, b) => b.length - a.length)
      .slice(0, numRings);

    topN.sort((a, b) => {
      const medA = a[Math.floor(a.length / 2)].dist;
      const medB = b[Math.floor(b.length / 2)].dist;
      return medA - medB;
    });

    this._rings = topN.map(pixels => {
      const buckets    = new Map();
      const bucketSize = 0.025;

      for (const p of pixels) {
        const angle  = Math.atan2(p.y - cy, p.x - cx);
        const radius = p.dist;
        const key    = Math.round(angle / bucketSize);
        if (!buckets.has(key) || buckets.get(key).radius < radius) {
          buckets.set(key, { angle, radius });
        }
      }

      let pts = [];
      for (const { angle, radius } of buckets.values()) {
        pts.push({
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          angle,
          radius,
        });
      }
      pts.sort((a, b) => a.angle - b.angle);
      pts = this._fillGaps(pts, cx, cy);
      this._smooth(pts, 2);

      const avgRadius = pts.reduce((s, p) => s + p.radius, 0) / pts.length;
      return { points: pts, radius: avgRadius };
    });
  }

  _fillGaps(pts, cx, cy) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push(a);
      let diff = b.angle - a.angle;
      if (diff < 0) diff += Math.PI * 2;
      if (diff > 0.05) {
        const steps = Math.ceil(diff / 0.03);
        for (let j = 1; j < steps; j++) {
          const t      = j / steps;
          const angle  = a.angle + t * diff;
          const radius = a.radius + t * (b.radius - a.radius);
          out.push({
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
            angle,
            radius,
          });
        }
      }
    }
    return out;
  }

  _smooth(pts, n = 1) {
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < pts.length; i++) {
        const prev  = pts[(i - 1 + pts.length) % pts.length];
        const next  = pts[(i + 1) % pts.length];
        pts[i].x = (prev.x + pts[i].x + next.x) / 3;
        pts[i].y = (prev.y + pts[i].y + next.y) / 3;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  BUILD ORBITERS
  // ─────────────────────────────────────────────────────────────

  _buildOrbiters() {

    
    const { distribution, buttons, buttonSize: sz, iconSize, speedMultipliers } = this.opts;
    let btnIdx = 0;

    distribution.forEach((count, ringIdx) => {
      if (ringIdx >= this._rings.length) return;
      const ring     = this._rings[ringIdx];
      const speedMul = speedMultipliers[ringIdx] ?? 1;

      for (let i = 0; i < count; i++) {
        const btn = buttons[btnIdx];
        if (!btn) break;
        this._createOrbiter(btn, ringIdx, i, count, sz, iconSize, speedMul);
        btnIdx++;
      }
    });
  }

  _createOrbiter(btn, ringIdx, slotInRing, totalInRing, sz, iconSz, speedMul) {
    const ring = this._rings[ringIdx];

    // ── Button ────────────────────────────────────────────────
    const el = document.createElement("div");
    Object.assign(el.style, {
      position:        "fixed",
      top:             "0",
      left:            "0",
      width:           `${sz}px`,
      height:          `${sz}px`,
      borderRadius:    "10px",
      background:      "#111111",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      cursor:          "pointer",
      zIndex:          "200",
      boxShadow:       "0 4px 16px rgba(0,0,0,0.25)",
      // No CSS transition on transform — we drive it entirely from JS
      // so it stays in sync with scroll without easing lag
      willChange:      "transform, opacity",
      transformOrigin: "0 0",
      opacity:         "0",
    });

    const icon = document.createElement("img");
    icon.src = btn.icon || "";
    Object.assign(icon.style, {
      width:         `${iconSz}px`,
      height:        `${iconSz}px`,
      objectFit:     "contain",
      filter:        "brightness(0) invert(1)",
      pointerEvents: "none",
    });
    el.appendChild(icon);

    // ── Tooltip ───────────────────────────────────────────────
    const tooltip = this._makeTooltip(btn);
    document.body.appendChild(tooltip);

    // ── Hover events ──────────────────────────────────────────
    const orbiterIdx = this._orbiters.length;
    el.addEventListener("mouseenter", () => this._onHoverIn(orbiterIdx));
    el.addEventListener("mouseleave", () => this._onHoverOut());
    document.body.appendChild(el);

    // Evenly space within ring
    const startFraction = slotInRing / totalInRing;
    const pathOffset    = Math.floor(startFraction * ring.points.length);

    this._orbiters.push({
      el,
      tooltip,
      ringIndex:  ringIdx,
      pathOffset,
      speed:      this.opts.speed * speedMul,
      data:       btn,
      // Current cached viewport position — used by scroll handler
      _vx: 0,
      _vy: 0,
    });
  }

  _makeTooltip(btn) {
    const w    = this.opts.tooltipWidth;
    const card = document.createElement("div");
    Object.assign(card.style, {
      position:      "fixed",
      top:           "0",
      left:          "0",
      width:         `${w}px`,
      background:    "#111111",
      color:         "#ffffff",
      borderRadius:  "12px",
      padding:       "14px 16px",
      zIndex:        "300",
      boxShadow:     "0 8px 32px rgba(0,0,0,0.35)",
      opacity:       "0",
      pointerEvents: "none",
      transition:    "opacity 0.2s ease",
      willChange:    "transform, opacity",
    });
    card.innerHTML = `
      <div style="font-size:13px;font-weight:700;margin-bottom:4px;letter-spacing:0.02em;">
        ${btn.label || ""}
      </div>
      <div style="font-size:11px;opacity:0.65;line-height:1.4;">
        ${btn.description || ""}
      </div>
    `;
    return card;
  }

  // ─────────────────────────────────────────────────────────────
  //  LAYOUT SYNC
  // ─────────────────────────────────────────────────────────────

  _syncLayout() {
    const rect             = this.sourceImg.getBoundingClientRect();
    this.canvas.width      = rect.width;
    this.canvas.height     = rect.height;
    this.canvas.style.left = `${rect.left}px`;
    this.canvas.style.top  = `${rect.top}px`;
    this.canvas.style.width  = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this._scaleX  = rect.width  / (this._naturalW || 1);
    this._scaleY  = rect.height / (this._naturalH || 1);
    this._imgRect = rect;
  }

  // ─────────────────────────────────────────────────────────────
  //  POSITION APPLICATION
  //  Extracted so BOTH the RAF loop and the scroll handler
  //  call the exact same code — scroll updates are instant.
  // ─────────────────────────────────────────────────────────────

  _applyPositions() {
    // Re-read the image rect every call so scroll is always current
    this._imgRect = this.sourceImg.getBoundingClientRect();

    const sz       = this.opts.buttonSize;
    const half     = sz / 2;
    const fadeZone = this.opts.fadeZone; // fraction of ring length

    this._orbiters.forEach((orb, idx) => {
      const ring = this._rings[orb.ringIndex];
      if (!ring?.points?.length) return;

      const len = ring.points.length;
      const pt  = ring.points[Math.floor(orb.pathOffset) % len];
      if (!pt) return;

      // Map natural-image coords → current viewport coords
      const vx = this._imgRect.left + pt.x * this._scaleX;
      const vy = this._imgRect.top  + pt.y * this._scaleY;

      // Cache for tooltip positioning
      orb._vx = vx;
      orb._vy = vy;

      // ── Fade in/out based on position in ring ───────────────
      // pathOffset as a 0–1 fraction of the full ring
     let opacity = 1;

      const isHovered = idx === this._hovering;

      // Set transform — no CSS transition, driven purely by JS
      // so it tracks immediately on scroll
      orb.el.style.transform = isHovered
        ? `translate(${vx - half}px, ${vy - half}px) scale(1.15)`
        : `translate(${vx - half}px, ${vy - half}px)`;

      orb.el.style.opacity = isHovered ? "1" : String(opacity.toFixed(3));

      // ── Tooltip position ────────────────────────────────────
      if (isHovered) {
        const tipW = this.opts.tooltipWidth;
        const tipX = Math.max(8, Math.min(vx - tipW / 2, window.innerWidth - tipW - 8));
        const tipY = vy - half - 90;
        orb.tooltip.style.transform = `translate(${tipX}px, ${tipY}px)`;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  HOVER
  // ─────────────────────────────────────────────────────────────

  _onHoverIn(idx) {
    this._hovering = idx;
    this._paused   = true;

    const orb = this._orbiters[idx];
    orb.el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.45)";

    // Show tooltip
    orb.tooltip.style.opacity      = "1";
    orb.tooltip.style.pointerEvents = "none";
  }

  _onHoverOut() {
    if (this._hovering !== null) {
      const orb = this._orbiters[this._hovering];
      orb.el.style.boxShadow       = "0 4px 16px rgba(0,0,0,0.25)";
      orb.tooltip.style.opacity    = "0";
    }
    this._hovering = null;
    this._paused   = false;
  }

  // ─────────────────────────────────────────────────────────────
  //  ANIMATION LOOP
  // ─────────────────────────────────────────────────────────────

  _startLoop() {
    const loop = (time) => {
      this._raf      = requestAnimationFrame(loop);
      this._lastTime = time;

      if (!this._paused) {
        // Advance each orbiter's path position
        this._orbiters.forEach(orb => {
          const ring = this._rings[orb.ringIndex];
          if (!ring?.points?.length) return;
          const len   = ring.points.length;
          const delta = orb.speed * len / (Math.PI * 2);
          orb.pathOffset = (orb.pathOffset + delta) % len;
        });
      }

      // Apply positions every frame (handles animation + keeps
      // buttons correct if scroll happened between frames)
      this._applyPositions();
    };
    requestAnimationFrame(loop);
  }

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────

  pause()  { this._paused = true;  }
  resume() { this._paused = false; }

  setSpeed(n) {
    this.opts.speed = n;
    this._orbiters.forEach(orb => {
      orb.speed = n * (this.opts.speedMultipliers[orb.ringIndex] ?? 1);
    });
  }

  /**
   * Add a new button at runtime.
   * It is appended to the ring with the fewest buttons currently.
   * @param {{ icon, label, description }} btn
   */
  addButton(btn) {
    // Find ring with fewest orbiters
    const ringCounts = this._rings.map((_, i) =>
      this._orbiters.filter(o => o.ringIndex === i).length
    );
    const targetRing = ringCounts.indexOf(Math.min(...ringCounts));
    const ring       = this._rings[targetRing];
    if (!ring) return;

    const existing  = this._orbiters.filter(o => o.ringIndex === targetRing).length;
    const speedMul  = this.opts.speedMultipliers[targetRing] ?? 1;

    this._createOrbiter(
      btn,
      targetRing,
      existing,
      existing + 1,
      this.opts.buttonSize,
      this.opts.iconSize,
      speedMul
    );
  }

  /**
   * Remove a button by its index in _orbiters
   * @param {number} idx
   */
  removeButton(idx) {
    const orb = this._orbiters[idx];
    if (!orb) return;
    orb.el.remove();
    orb.tooltip.remove();
    this._orbiters.splice(idx, 1);
  }

destroy() {
  this._destroyed = true;  // ← add this as the first line
  cancelAnimationFrame(this._raf);
  this._ro?.disconnect();
  window.removeEventListener("scroll", this._scrollHandler);
  window.removeEventListener("resize", this._resizeHandler);
  this._orbiters.forEach(o => { o.el.remove(); o.tooltip.remove(); });
  this.canvas.remove();
}
}