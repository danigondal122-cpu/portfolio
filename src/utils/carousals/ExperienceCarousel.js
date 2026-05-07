/**
 * ExperienceCarousel
 * Vertical drag/wheel-scrollable carousel of experience cards.
 * No auto-scroll — user-driven only (drag or mousewheel).
 */
export class ExperienceCarousel {
  constructor(containerEl, options = {}) {
    this.container = containerEl;

    this.opts = {
      items:       options.items       || [],
      cardWidth:   options.cardWidth   ?? 420,
      cardHeight:  options.cardHeight  ?? 200,
      gap:         options.gap         ?? 24,
      cardBg:      options.cardBg      || "#111111",
      textColor:   options.textColor   || "#ffffff",
      fadeEdge:    options.fadeEdge    ?? 80,
      accentColor: options.accentColor || "#ffffff",
    };

    this._offset    = 0;       // current Y scroll in px
    this._dragging  = false;
    this._dragStartY = 0;
    this._dragStartOffset = 0;
    this._raf       = null;
    this._targetOffset = 0;   // smooth lerp target

    this._init();
  }

  _init() {
    const { cardHeight, gap, items, fadeEdge } = this.opts;
    this._totalHeight = items.length * (cardHeight + gap);

    // ── Clip wrapper ──────────────────────────────────────────
    const clip = document.createElement("div");
    clip.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      cursor: grab;
      user-select: none;
    `;

    // ── Track (holds all cards, translated vertically) ────────
    const track = document.createElement("div");
    track.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      will-change: transform;
    `;
    this._track = track;

    // ── Build cards ───────────────────────────────────────────
    items.forEach((item, i) => {
      const card = this._makeCard(item, i);
      track.appendChild(card);
    });

    clip.appendChild(track);
    this.container.appendChild(clip);
    this._clip = clip;

    // ── Edge fade mask ────────────────────────────────────────
    this._applyEdgeFade();

    // ── Events ────────────────────────────────────────────────
    this._bindEvents(clip);

    // ── Start render loop ─────────────────────────────────────
    this._loop();
  }

  _makeCard(item, index) {
    const { cardHeight, gap, cardWidth, cardBg, textColor, accentColor } = this.opts;

    const card = document.createElement("div");
    card.style.cssText = `
      position: relative;
      width: ${cardWidth}px;
      max-width: 100%;
      min-height: ${cardHeight}px;
      margin: 0 auto ${gap}px auto;
      background: ${cardBg};
      border-radius: 12px;
      padding: 24px 28px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: ${textColor};
    `;

    // Index badge
    const badge = document.createElement("span");
    badge.textContent = String(index + 1).padStart(2, "0");
    badge.style.cssText = `
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      opacity: 0.4;
      color: ${accentColor};
    `;

    // Title
    const title = document.createElement("h3");
    title.textContent = item.title;
    title.style.cssText = `
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      font-family: Poppins, sans-serif;
      color: ${accentColor};
      line-height: 1.2;
    `;

    // Date
    const date = document.createElement("p");
    date.textContent = item.date;
    date.style.cssText = `
      margin: 0;
      font-size: 12px;
      opacity: 0.5;
      font-family: inherit;
    `;

    // Divider
    const divider = document.createElement("div");
    divider.style.cssText = `
      width: 32px;
      height: 2px;
      background: ${accentColor};
      opacity: 0.3;
      margin: 4px 0;
    `;

    // Description
    const desc = document.createElement("p");
    desc.style.cssText = `
      margin: 0;
      font-size: 13px;
      line-height: 1.7;
      opacity: 0.75;
      white-space: pre-line;
    `;
    desc.textContent = item.description;

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(date);
    card.appendChild(divider);
    card.appendChild(desc);

    return card;
  }

  _applyEdgeFade() {
    const f = this.opts.fadeEdge;
    if (!f) return;
    this._clip.style.webkitMaskImage =
      `linear-gradient(to bottom, transparent 0px, black ${f}px, black calc(100% - ${f}px), transparent 100%)`;
    this._clip.style.maskImage =
      `linear-gradient(to bottom, transparent 0px, black ${f}px, black calc(100% - ${f}px), transparent 100%)`;
  }

  _bindEvents(clip) {
    // ── Mouse drag ────────────────────────────────────────────
    clip.addEventListener("mousedown", (e) => {
      this._dragging = true;
      this._dragStartY = e.clientY;
      this._dragStartOffset = this._targetOffset;
      clip.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!this._dragging) return;
      const delta = e.clientY - this._dragStartY;
      this._targetOffset = this._clamp(this._dragStartOffset - delta);
    });

    window.addEventListener("mouseup", () => {
      this._dragging = false;
      this._clip.style.cursor = "grab";
    });

    // ── Touch drag ────────────────────────────────────────────
    clip.addEventListener("touchstart", (e) => {
      this._dragStartY = e.touches[0].clientY;
      this._dragStartOffset = this._targetOffset;
    }, { passive: true });

    clip.addEventListener("touchmove", (e) => {
      const delta = e.touches[0].clientY - this._dragStartY;
      this._targetOffset = this._clamp(this._dragStartOffset - delta);
    }, { passive: true });

    // ── Wheel ─────────────────────────────────────────────────
    clip.addEventListener("wheel", (e) => {
      e.preventDefault();
      this._targetOffset = this._clamp(this._targetOffset + e.deltaY * 0.8);
    }, { passive: false });
  }

  _clamp(val) {
    const containerH = this._clip.offsetHeight;
    const max = Math.max(0, this._totalHeight - containerH + this.opts.fadeEdge);
    return Math.max(0, Math.min(val, max));
  }

  // Smooth lerp loop
  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    this._offset += (this._targetOffset - this._offset) * 0.12;
    this._track.style.transform = `translateY(${-this._offset}px)`;
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._clip?.remove();
  }
}