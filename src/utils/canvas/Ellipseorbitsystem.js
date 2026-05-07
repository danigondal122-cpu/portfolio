export class EllipseOrbitSystem {
  constructor(container, ballImg, config = {}) {
    this.container = container;
    this.ballImg = ballImg;

    this.cfg = {
      speed: config.speed ?? 0.01,
      size: config.size ?? 12,
      padding: config.padding ?? 0, // 0 = right on the edge
    };

    this.t = 0;
    this._init();
  }

  _init() {
    const canvas = document.createElement("canvas");
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "20", // above the oval and image
    });

    this.container.appendChild(canvas);
    this._resize();
    this._loop();

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.container);
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    this.cx = rect.width / 2;
    this.cy = rect.height / 2;

    // Match the oval's ellipse exactly, minus padding and half ball size
    // so the ball center rides right on the oval border
    this.rx = rect.width / 2 - this.cfg.padding - this.cfg.size / 2;
    this.ry = rect.height / 2 - this.cfg.padding - this.cfg.size / 2;
  }

  _loop() {
    this.raf = requestAnimationFrame(() => this._loop());

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.t += this.cfg.speed;

    const x = this.cx + this.rx * Math.cos(this.t);
    const y = this.cy + this.ry * Math.sin(this.t);

    if (this.ballImg?.complete) {
      ctx.drawImage(
        this.ballImg,
        x - this.cfg.size / 2,
        y - this.cfg.size / 2,
        this.cfg.size,
        this.cfg.size
      );
    } else {
      // Fallback: draw a colored circle if image not loaded
      ctx.beginPath();
      ctx.arc(x, y, this.cfg.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6b35";
      ctx.fill();
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this._ro?.disconnect();
    this.canvas.remove();
  }
}