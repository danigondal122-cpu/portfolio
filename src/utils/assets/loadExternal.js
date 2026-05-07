// utils/loadExternal.js

export function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) return resolve();

    const script = document.createElement("script");
    script.src = src;
    if (id) script.id = id;

    script.onload = () => resolve();
    script.onerror = () => reject(`Failed to load script: ${src}`);

    document.body.appendChild(script);
  });
}

export function loadStyle(href, id) {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) return resolve();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    if (id) link.id = id;

    link.onload = () => resolve();
    link.onerror = () => reject(`Failed to load style: ${href}`);

    document.head.appendChild(link);
  });
}




export function loadFont(fontName, weights = [400], display = "swap") {
  const formattedName = fontName.replace(/ /g, "+");
  const weightStr = weights.join(";");

  const href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@${weightStr}&display=${display}`;

  return loadStyle(href, `font-${formattedName}`);
}