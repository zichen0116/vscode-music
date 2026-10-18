import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".lrc": "text/plain; charset=utf-8",
};
http
  .createServer((req, res) => {
    let relative;
    try {
      relative = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (relative === "/") relative = "/index.html";
    const file = path.resolve(root, `.${relative}`),
      local = path.relative(root, file);
    if (
      local.startsWith("..") ||
      path.isAbsolute(local) ||
      local.split(/[\\/]/).some((s) => s.startsWith(".") && s !== ".nojekyll")
    ) {
      res.writeHead(403).end();
      return;
    }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404).end("Not found");
        return;
      }
      const headers = {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "Accept-Ranges": "bytes",
      };
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      let start = 0,
        end = stat.size - 1,
        status = 200;
      if (range) {
        start = Number(range[1]);
        end = range[2] ? Math.min(Number(range[2]), end) : end;
        status = 206;
        if (start > end) {
          res.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
          return;
        }
        headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers["Content-Length"] = end - start + 1;
      res.writeHead(status, headers);
      if (req.method === "HEAD") res.end();
      else fs.createReadStream(file, { start, end }).pipe(res);
    });
  })
  .listen(port, "127.0.0.1", () =>
    process.stdout.write(`Local: http://127.0.0.1:${port}\n`),
  );
