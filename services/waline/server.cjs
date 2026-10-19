const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");

async function start() {
  const directory = process.env.SQLITE_PATH || path.join(__dirname, ".data");
  fs.mkdirSync(directory, { recursive: true });
  const database = path.join(directory, "waline.sqlite");
  if (!fs.existsSync(database)) {
    const response = await fetch(
      "https://raw.githubusercontent.com/walinejs/waline/main/assets/waline.sqlite",
    );
    if (!response.ok)
      throw new Error(`SQLite template download failed (${response.status})`);
    fs.writeFileSync(database, Buffer.from(await response.arrayBuffer()), {
      flag: "wx",
    });
  }
  const keyFile = path.join(directory, "jwt-secret");
  if (!fs.existsSync(keyFile))
    fs.writeFileSync(keyFile, crypto.randomBytes(32).toString("hex"), {
      flag: "wx",
    });
  Object.assign(process.env, {
    SQLITE_PATH: directory,
    SQLITE_DB: process.env.SQLITE_DB || "waline",
    JWT_TOKEN: process.env.JWT_TOKEN || fs.readFileSync(keyFile, "utf8"),
    IPQPS: process.env.IPQPS || "30",
    COMMENT_AUDIT: process.env.COMMENT_AUDIT || "false",
    AKISMET_KEY: process.env.AKISMET_KEY || "false",
    DISABLE_REGION: process.env.DISABLE_REGION || "true",
    DISABLE_USERAGENT: process.env.DISABLE_USERAGENT || "true",
    AVATAR_PROXY: process.env.AVATAR_PROXY || "false",
    MARKDOWN_TEX: process.env.MARKDOWN_TEX || "false",
    MARKDOWN_HIGHLIGHT: process.env.MARKDOWN_HIGHLIGHT || "false",
  });
  const port = Number(process.env.PORT || 8360);
  const host = process.env.HOST || "0.0.0.0";
  http.createServer(require("./index.cjs")).listen(port, host, () =>
    process.stdout.write(`Waline listening on ${host}:${port}\n`),
  );
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
