export class EdgePathTracker {
  constructor(image, { threshold = 40, step = 2 } = {}) {
    this.image = image;
    this.threshold = threshold;
    this.step = step;
    this.points = [];
  }

  async generate() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = this.image.naturalWidth || this.image.width;
    canvas.height = this.image.naturalHeight || this.image.height;

    ctx.drawImage(this.image, 0, 0);

    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const getAlpha = (x, y) => {
      const i = (y * width + x) * 4;
      return data[i + 3];
    };

    const edgePoints = [];

    for (let y = 1; y < height - 1; y += this.step) {
      for (let x = 1; x < width - 1; x += this.step) {
        const alpha = getAlpha(x, y);

        if (alpha > this.threshold) {
          const neighbors = [
            getAlpha(x - 1, y),
            getAlpha(x + 1, y),
            getAlpha(x, y - 1),
            getAlpha(x, y + 1),
          ];

          const isEdge = neighbors.some((a) => a <= this.threshold);

          if (isEdge) {
            edgePoints.push({ x, y });
          }
        }
      }
    }

    // Sort points by angle from center so the ball travels smoothly around the edge
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    edgePoints.sort((a, b) => {
      const angleA = Math.atan2(a.y - cy, a.x - cx);
      const angleB = Math.atan2(b.y - cy, b.x - cx);
      return angleA - angleB;
    });

    this.points = edgePoints;
    return this.points;
  }
}