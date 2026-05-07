export class ParticleSystem {
  constructor(container, images, config = {}) {
    this.container = container;
    this.images = images; // { blue, green, red, yellow } — Image objects

    this.cfg = {
      count:    config.count    ?? 40,
      minSize:  config.minSize  ?? 6,    // px — smallest particle (small tier)
      maxSize:  config.maxSize  ?? 20,   // px — largest particle  (large tier)
      minSpeed: config.minSpeed ?? 0.2,  // px/frame
      maxSpeed: config.maxSpeed ?? 1.2,  // px/frame
      scatter:  config.scatter  ?? 1,    // 0–2 speed randomness multiplier
      opacity:  config.opacity  ?? 0.75, // 0–1
      drift:    config.drift    ?? 0.3,  // sideways wobble intensity
      zIndex:   config.zIndex   ?? -1,

      // ── Size distribution ratios (must sum to 1.0) ─────────────────
      // large  = top    30% of the minSize–maxSize range
      // medium = middle 35%
      // small  = bottom 35%  (note: 0.30 + 0.35 + 0.35 = 1.0)
      largeRatio:  config.largeRatio  ?? 0.30,
      mediumRatio: config.mediumRatio ?? 0.35,
      // smallRatio is implicit: 1 - largeRatio - mediumRatio

      // ── Repulsion ──────────────────────────────────────────────────
      // repulsion.enabled  {boolean}  default true
      // repulsion.radius   {number}   px — particles push each other beyond this distance
      // repulsion.strength {number}   force magnitude per frame (0.01–0.5 recommended)
      repulsion: {
        enabled:  true,
        radius:   40,
        strength: 0.08,
        ...(config.repulsion || {}),
      },
    };

    this._particles     = [];
    this._raf           = null;
    this._isFirstSpawn  = true;
    this._init();
  }

  // ─────────────────────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────────────────────

  _init() {
    // Isolated wrapper — zero layout impact
    const wrapper = document.createElement('div');
    this.wrapper  = wrapper;

    Object.assign(wrapper.style, {
      position:      'absolute',
      inset:         '0',
      pointerEvents: 'none',
      zIndex:        this.cfg.zIndex,
      overflow:      'hidden',
    });

    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }

    this.container.appendChild(wrapper);

    const c = document.createElement('canvas');
    this.canvas = c;
    Object.assign(c.style, { width: '100%', height: '100%', display: 'block' });
    wrapper.appendChild(c);

    this.ctx = c.getContext('2d');
    this.ctx.imageSmoothingEnabled  = true;
    this.ctx.imageSmoothingQuality  = 'high';

    this._resize();
    this._spawn();
    this._loop();

    this._ro = new ResizeObserver(() => {
      this._resize();
      this._particles.forEach(p => this._resetParticle(p, true));
    });
    this._ro.observe(this.container);
  }

  // ─────────────────────────────────────────────────────────────
  //  RESIZE
  // ─────────────────────────────────────────────────────────────

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = rect.width;
    this.canvas.height = rect.height;
    this.W = rect.width;
    this.H = rect.height;
  }

  // ─────────────────────────────────────────────────────────────
  //  SIZE TIERS
  //  Split the minSize–maxSize range into 3 tiers:
  //    large  — top    30% of range   (minSize + 70%…100% of range)
  //    medium — middle 35% of range   (minSize + 35%…70% of range)
  //    small  — bottom 35% of range   (minSize + 0%…35% of range)
  // ─────────────────────────────────────────────────────────────

  _pickSizeForTier(tier) {
    const { minSize, maxSize } = this.cfg;
    const range = maxSize - minSize;

    // Tier boundaries (fraction of total range)
    //   small:  0.00 – 0.35
    //   medium: 0.35 – 0.70
    //   large:  0.70 – 1.00
    const bounds = {
      small:  [0.00, 0.35],
      medium: [0.35, 0.70],
      large:  [0.70, 1.00],
    };

    const [lo, hi] = bounds[tier] || bounds.small;
    return minSize + range * (lo + Math.random() * (hi - lo));
  }

  /**
   * Given a particle index (0-based) and total count, assign a size tier
   * so the overall distribution matches largeRatio / mediumRatio / smallRatio.
   *
   * Strategy: pre-build a shuffled tier list of length `count` then index into it.
   */
  _buildTierList(count) {
    const { largeRatio, mediumRatio } = this.cfg;
    const nLarge  = Math.round(count * largeRatio);
    const nMedium = Math.round(count * mediumRatio);
    const nSmall  = count - nLarge - nMedium;

    const tiers = [
      ...Array(nLarge).fill('large'),
      ...Array(nMedium).fill('medium'),
      ...Array(Math.max(0, nSmall)).fill('small'),
    ];

    // Fisher-Yates shuffle
    for (let i = tiers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
    }

    return tiers;
  }

  // ─────────────────────────────────────────────────────────────
  //  IMAGE DISTRIBUTION
  //
  //  Rule:
  //  • Every complete "cycle" of `imageCount` particles must contain
  //    exactly one of each image (guaranteed unique, no duplicates).
  //  • After the first full cycle, subsequent cycles shuffle the images
  //    again — still no duplicates within a cycle, but duplicates
  //    ACROSS cycles are natural (e.g. particle 5 and particle 1 can
  //    both be "blue" because they're in different cycles).
  //
  //  Example — 4 images, 10 particles:
  //    Cycle 0 (idx 0-3):  [green, blue, red, yellow]   — all unique, shuffled
  //    Cycle 1 (idx 4-7):  [yellow, red, blue, green]   — all unique, shuffled
  //    Cycle 2 (idx 8-9):  [blue, red]                  — partial, could duplicate with cycle 0/1
  // ─────────────────────────────────────────────────────────────

  _buildImageSequence(count) {
    const keys = Object.keys(this.images);
    const n    = keys.length;
    const seq  = [];

    // Build full cycles
    while (seq.length < count) {
      // Shuffle a copy of keys
      const shuffled = [...keys].sort(() => Math.random() - 0.5);
      for (const k of shuffled) {
        if (seq.length >= count) break;
        seq.push(this.images[k]);
      }
    }

    return seq; // length === count
  }

  // ─────────────────────────────────────────────────────────────
  //  PARTICLE FACTORY
  // ─────────────────────────────────────────────────────────────

  _makeParticle(img, tier, randomY = false) {
    const { minSpeed, maxSpeed, scatter, drift } = this.cfg;

    const size  = this._pickSizeForTier(tier);
    const angle = Math.random() * Math.PI * 2;
    const speed = (minSpeed + Math.random() * (maxSpeed - minSpeed)) * scatter;

    return {
      img,
      tier,
      x: Math.random() * (this.W - size) + size / 2,
      y: randomY
        ? Math.random() * (this.H - size) + size / 2
        : this.H + size,
      size,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      driftAmp:   drift * (0.5 + Math.random()),
      driftFreq:  0.5 + Math.random(),
      driftPhase: Math.random() * Math.PI * 2,
      opacity:    0.3 + Math.random() * this.cfg.opacity,
    };
  }

  // ─────────────────────────────────────────────────────────────
  //  SPAWN
  // ─────────────────────────────────────────────────────────────

  _spawn() {
    const count   = this.cfg.count;
    const tiers   = this._buildTierList(count);
    const imgSeq  = this._buildImageSequence(count);

    this._particles = [];

    for (let i = 0; i < count; i++) {
      // First spawn: scatter particles across canvas immediately
      // Subsequent spawns: keep positions (called after resize)
      this._particles.push(
        this._makeParticle(imgSeq[i], tiers[i], this._isFirstSpawn)
      );
    }

    this._isFirstSpawn = false;
  }

  // ─────────────────────────────────────────────────────────────
  //  RESET (called when a particle leaves bounds on resize)
  // ─────────────────────────────────────────────────────────────

  _resetParticle(p, keepPosition = false) {
    const keys    = Object.keys(this.images);
    const img     = this.images[keys[Math.floor(Math.random() * keys.length)]];
    const fresh   = this._makeParticle(img, p.tier, keepPosition);
    Object.assign(p, fresh);
    if (!keepPosition) {
      p.y = this.H + p.size;
      p.x = Math.random() * (this.W - p.size) + p.size / 2;
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  REPULSION
  //
  //  For each pair (i, j), if their centres are closer than
  //  repulsion.radius, apply equal-and-opposite velocity nudges
  //  proportional to (radius - dist) / radius * strength.
  //
  //  O(n²) — fine for n < 100. For larger counts consider a
  //  spatial grid, but particle counts here are 4–20.
  // ─────────────────────────────────────────────────────────────

  _applyRepulsion() {
    const { enabled, radius, strength } = this.cfg.repulsion;
    if (!enabled) return;

    const ps = this._particles;
    const n  = ps.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a  = ps[i];
        const b  = ps[j];

        // Use the average of both radii as the personal space boundary
        const minDist = radius + (a.size + b.size) / 2;

        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

        if (dist < minDist) {
          // Normalised direction from a → b
          const nx    = dx / dist;
          const ny    = dy / dist;

          // Force magnitude: stronger when closer
          const force = ((minDist - dist) / minDist) * strength;

          // Push both particles apart
          a.vx -= nx * force;
          a.vy -= ny * force;
          b.vx += nx * force;
          b.vy += ny * force;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  MAIN LOOP
  // ─────────────────────────────────────────────────────────────

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const ctx = this.ctx;
    if (!ctx || !this.W) return;

    ctx.clearRect(0, 0, this.W, this.H);

    // Repulsion pass first (modifies velocities before movement)
    this._applyRepulsion();

    const t = performance.now() * 0.001;

    for (const p of this._particles) {
      // Movement
      p.x += p.vx;
      p.y += p.vy;

      // Drift wobble (perpendicular to primary movement)
      p.x += Math.sin(t * p.driftFreq + p.driftPhase) * p.driftAmp;

      // Bounce off walls
      const half = p.size / 2;
      if (p.x <= half)          { p.x = half;          p.vx = Math.abs(p.vx); }
      if (p.x >= this.W - half) { p.x = this.W - half; p.vx = -Math.abs(p.vx); }
      if (p.y <= half)          { p.y = half;           p.vy = Math.abs(p.vy); }
      if (p.y >= this.H - half) { p.y = this.H - half;  p.vy = -Math.abs(p.vy); }

      // Draw
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.drawImage(
        p.img,
        Math.round(p.x - half),
        Math.round(p.y - half),
        Math.round(p.size),
        Math.round(p.size),
      );
      ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────

  /**
   * Update config at runtime.
   * Pass any subset of the constructor config options.
   * Passing `count` triggers a full respawn.
   * Passing `repulsion` merges into the existing repulsion config.
   */
  setConfig(updates) {
    if (updates.repulsion) {
      Object.assign(this.cfg.repulsion, updates.repulsion);
      delete updates.repulsion;
    }
    Object.assign(this.cfg, updates);
    if ('count' in updates || 'largeRatio' in updates || 'mediumRatio' in updates) {
      this._spawn();
    }
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
    this.wrapper?.remove();
  }
}