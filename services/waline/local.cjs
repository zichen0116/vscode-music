const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
async function start() {
  const directory = path.join(__dirname, ".data");
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
    SQLITE_DB: "waline",
    JWT_TOKEN: fs.readFileSync(keyFile, "utf8"),
    IPQPS: process.env.IPQPS || "0",
    COMMENT_AUDIT: process.env.COMMENT_AUDIT || "false",
    AKISMET_KEY: "false",
    DISABLE_REGION: "true",
    DISABLE_USERAGENT: "true",
    AVATAR_PROXY: "false",
    MARKDOWN_TEX: "false",
    MARKDOWN_HIGHLIGHT: "false",
    SITE_NAME: "Lozic 本地测试留言",
    SITE_URL: "http://127.0.0.1:4173",
    SERVER_URL: "http://127.0.0.1:8360",
  });
  http
    .createServer(require("./index.cjs"))
    .listen(8360, "127.0.0.1", () =>
      process.stdout.write(
        "Local guestbook: http://127.0.0.1:8360\nPersistent test data: services/waline/.data\n",
      ),
    );
}
start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
