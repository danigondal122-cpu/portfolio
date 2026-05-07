// initFonts.js

function loadFontLink(href, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.id = id;

    link.onload = () => resolve();
    link.onerror = () => reject(`Failed to load ${href}`);

    document.head.appendChild(link);
  });
}

export async function initFonts() {
  const fonts = [
    {
      name: "Poppins",
      weights: "300;400;500;600;700"
    },
     {
      name: "Abel",
      weights: "300;400;500;600;700"
    },
    {
      name: "Lexend",
      weights: "300;400;500;600"
    }
  ];

  const promises = fonts.map(font => {
    const formatted = font.name.replace(/ /g, "+");
    const href = `https://fonts.googleapis.com/css2?family=${formatted}:wght@${font.weights}&display=swap`;
    return loadFontLink(href, `font-${formatted}`);
  });

  await Promise.all(promises);

  // Wait until fonts are actually ready
  if (document.fonts) {
    await document.fonts.ready;
  }
}