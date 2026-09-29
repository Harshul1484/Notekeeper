// Serves the real built app (../../dist) plus the demo stage (/__demo/*) from one origin,
// so the stage page can drive and inspect the app inside its iframe.
// Google Fonts links are swapped for local copies so rendering never waits on the network.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, "../../dist");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".json": "application/json",
};
const FONT_LINK = /<link[^>]+fonts\.googleapis\.com[^>]*>/g;

export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    let file;
    if (url.startsWith("/__demo/")) file = path.join(HERE, url.slice("/__demo/".length));
    else {
      file = path.join(DIST, url);
      if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html"); // SPA
    }
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    const type = TYPES[path.extname(file)] ?? "application/octet-stream";
    if (file.endsWith("index.html") && file.startsWith(DIST)) {
      const html = fs.readFileSync(file, "utf8")
        .replace(FONT_LINK, "")
        .replace(/<link rel="preconnect"[^>]*>/g, "")
        .replace("</head>", '<link rel="stylesheet" href="/__demo/fonts/fonts.css" /></head>')
        .replace("</body>", '<script src="/__demo/app-inject.js"></script></body>');
      return res.writeHead(200, { "content-type": type }).end(html);
    }
    res.writeHead(200, { "content-type": type });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await startServer(Number(process.argv[2] ?? 4173));
  console.log(`demo server on http://127.0.0.1:${s.address().port}/__demo/stage.html`);
}
