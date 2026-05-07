// utils/imageLoader.js

class ImageLoader {
  constructor() {
    this.cache  = new Map(); // src → { img, svgText, svgDoc, type }
    this.loaded = false;
  }

  // ─────────────────────────────────────────────────────────────
  //  INTERNAL: resolve src to full URL
  // ─────────────────────────────────────────────────────────────

  _resolve(src) {
    if (src.startsWith("http") || src.startsWith("data:")) return src;
    const base = import.meta.env.BASE_URL || "/";
    return base.replace(/\/$/, "") + "/" + src.replace(/^\/+/, "");
  }

  _isSvg(src) {
    return src.toLowerCase().includes(".svg");
  }

  // ─────────────────────────────────────────────────────────────
  //  LOAD SINGLE IMAGE (PNG / JPG / WEBP / GIF)
  // ─────────────────────────────────────────────────────────────

  loadImage(src) {
    const fullSrc = this._resolve(src);

    if (this.cache.has(fullSrc)) return Promise.resolve(this.cache.get(fullSrc));

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src   = fullSrc;

      img.onload = () => {
        const entry = { img, type: "img", src: fullSrc };
        this.cache.set(fullSrc, entry);
        // also index by the original short key for .get("/images/foo.png") calls
        if (!this.cache.has(src)) this.cache.set(src, entry);
        resolve(entry);
      };

      img.onerror = () => reject(`Failed to load image: ${fullSrc}`);
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  LOAD SVG
  //
  //  mode:
  //    "img"    (default) — loads into an <img> element, just like a PNG.
  //                         .get(src).img  → HTMLImageElement
  //                         .get(src).src  → string URL  (use in <img src> or css url())
  //
  //    "inline" — fetches the raw SVG text and parses it into an SVGElement.
  //               .get(src).svgEl   → SVGSVGElement  (ready to appendChild)
  //               .get(src).svgText → raw SVG string
  //               Each call to getSvgEl() returns a FRESH clone so you can
  //               insert the same SVG into multiple places without conflict.
  //
  //    "raw"    — fetches only the raw text string, no parsing.
  //               .get(src).svgText → string  (use with dangerouslySetInnerHTML)
  // ─────────────────────────────────────────────────────────────

  loadSvg(src, mode = "img") {
    const fullSrc = this._resolve(src);
    const cacheKey = `${fullSrc}::${mode}`;

    if (this.cache.has(cacheKey)) return Promise.resolve(this.cache.get(cacheKey));

    if (mode === "img") {
      // Treat exactly like a raster image — browsers render SVGs in <img> fine
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src   = fullSrc;

        img.onload = () => {
          const entry = { img, type: "svg-img", src: fullSrc };
          this.cache.set(cacheKey, entry);
          if (!this.cache.has(src)) this.cache.set(src, entry);
          resolve(entry);
        };

        img.onerror = () => reject(`Failed to load SVG as img: ${fullSrc}`);
      });
    }

    // "inline" or "raw" — fetch the SVG text
    return fetch(fullSrc)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading SVG: ${fullSrc}`);
        return res.text();
      })
      .then(svgText => {
        let entry;

        if (mode === "raw") {
          entry = { svgText, type: "svg-raw", src: fullSrc };
        } else {
          // "inline" — parse into a real SVG DOM node
          const parser = new DOMParser();
          const doc    = parser.parseFromString(svgText, "image/svg+xml");
          const svgEl  = doc.querySelector("svg");

          if (!svgEl) throw new Error(`No <svg> element found in: ${fullSrc}`);

          entry = {
            svgText,
            svgEl,     // original parsed element (do not insert directly — clone it)
            type: "svg-inline",
            src:  fullSrc,
          };
        }

        this.cache.set(cacheKey, entry);
        if (!this.cache.has(src)) this.cache.set(src, entry);
        return entry;
      });
  }

  // ─────────────────────────────────────────────────────────────
  //  INIT — load all images + SVGs before app renders
  //
  //  imageList accepts:
  //    "/images/foo.png"               ← raster image
  //    "/images/icon.svg"              ← SVG loaded as <img> (default)
  //    { src: "/images/icon.svg", mode: "inline" }  ← inline SVG
  //    { src: "/images/icon.svg", mode: "raw"    }  ← raw SVG text
  // ─────────────────────────────────────────────────────────────

  async init(imageList = []) {
    if (this.loaded) return;

    console.log("🖼️ Loading images...");

    const tasks = imageList.map(item => {
      // Support both plain string and { src, mode } object
      const src  = typeof item === "string" ? item : item.src;
      const mode = typeof item === "object" && item.mode ? item.mode : null;

      if (this._isSvg(src)) {
        return this.loadSvg(src, mode || "img");
      }
      return this.loadImage(src);
    });

    await Promise.all(tasks);

    this.loaded = true;
    console.log("✅ All images loaded:", [...this.cache.keys()]);
  }

  // ─────────────────────────────────────────────────────────────
  //  GET — retrieve a cached entry
  //
  //  For raster / svg-img:   entry.img.src  or  entry.src
  //  For svg-inline:         entry.svgEl  (clone before inserting!)
  //  For svg-raw:            entry.svgText
  // ─────────────────────────────────────────────────────────────

  get(src) {
    // Try exact key first, then resolved full URL
    return this.cache.get(src) || this.cache.get(this._resolve(src)) || null;
  }

  /**
   * Convenience: get the src string for use in <img src={...}> or CSS url().
   * Works for raster images and svg-img mode.
   * Returns null if not found or if the entry is inline/raw SVG.
   */
  getSrc(src) {
    const entry = this.get(src);
    if (!entry) return null;
    if (entry.img) return entry.img.src;
    if (entry.src) return entry.src;
    return null;
  }

  /**
   * Convenience: get a FRESH clone of an inline SVG element.
   * Safe to appendChild into the DOM multiple times.
   * Returns null if not found or not loaded in "inline" mode.
   *
   * @param {string}  src
   * @param {object}  [attrs]  optional attribute overrides e.g. { width: "32", fill: "red" }
   * @returns {SVGSVGElement|null}
   */
  getSvgEl(src, attrs = {}) {
    const entry = this.get(src) || this.cache.get(`${this._resolve(src)}::inline`);
    if (!entry || entry.type !== "svg-inline") return null;

    const clone = entry.svgEl.cloneNode(true);

    for (const [k, v] of Object.entries(attrs)) {
      clone.setAttribute(k, v);
    }

    return clone;
  }

  /**
   * Convenience: get raw SVG text for dangerouslySetInnerHTML.
   * Returns null if not loaded in "raw" mode.
   */
  getSvgText(src) {
    const entry = this.get(src) || this.cache.get(`${this._resolve(src)}::raw`);
    if (!entry || !entry.svgText) return null;
    return entry.svgText;
  }

  // ─────────────────────────────────────────────────────────────
  //  UTILS
  // ─────────────────────────────────────────────────────────────

  has(src) {
    return this.cache.has(src) || this.cache.has(this._resolve(src));
  }

  /** Load a single asset on-demand (outside of init) */
  load(src, mode) {
    if (this._isSvg(src)) return this.loadSvg(src, mode || "img");
    return this.loadImage(src);
  }
}

export const imageLoader = new ImageLoader();

/*
  ─────────────────────────────────────────────────────────────
  USAGE EXAMPLES
  ─────────────────────────────────────────────────────────────

  // ── In your app entry (main.jsx / index.js) ───────────────

  await imageLoader.init([
    "/images/logo.png",
    "/images/person_2.png",
    "/images/particle_red.png",

    // SVG as <img> (default — works in canvas, <img>, CSS)
    "/images/icon_star.svg",

    // SVG inline — lets you style it with CSS / JS
    { src: "/images/icon_arrow.svg", mode: "inline" },

    // SVG raw text — for dangerouslySetInnerHTML
    { src: "/images/icon_check.svg", mode: "raw" },
  ]);


  // ── In components ─────────────────────────────────────────

  // Raster image (PNG / JPG / GIF / WEBP)
  <img src={imageLoader.get("/images/logo.png")?.src} />
  // or
  <img src={imageLoader.getSrc("/images/logo.png")} />

  // SVG loaded as img (mode: "img", the default)
  <img src={imageLoader.getSrc("/images/icon_star.svg")} />

  // SVG inline — inject into DOM (each call gives a fresh clone)
  const svgEl = imageLoader.getSvgEl("/images/icon_arrow.svg", { width: "24", fill: "currentColor" });
  containerRef.current.appendChild(svgEl);

  // SVG inline — React ref approach
  useEffect(() => {
    const el = imageLoader.getSvgEl("/images/icon_arrow.svg", { width: "32" });
    if (el && svgRef.current) {
      svgRef.current.innerHTML = "";
      svgRef.current.appendChild(el);
    }
  }, []);

  // SVG raw — dangerouslySetInnerHTML
  <div dangerouslySetInnerHTML={{ __html: imageLoader.getSvgText("/images/icon_check.svg") }} />

  // On-demand load (after init, e.g. lazy section)
  const entry = await imageLoader.load("/images/late_image.svg", "inline");

  // Canvas — SVG as img works the same as PNG
  const entry = imageLoader.get("/images/icon_star.svg");
  ctx.drawImage(entry.img, 0, 0, 32, 32);
*/