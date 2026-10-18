const walls = new Set([
  "personal-mac/guestbook",
  "personal-mac/guestbook-test",
]);
function validateComment(comment) {
  const nick = typeof comment.nick === "string" ? comment.nick.trim() : "";
  const text =
    typeof comment.comment === "string" ? comment.comment.trim() : "";
  if (!nick || Array.from(nick).length > 24) return "昵称须为 1–24 个字符";
  if (!text || Array.from(text).length > 1000) return "内容须为 1–1000 个字符";
  if (!walls.has(comment.url)) return "未知留言墙";
  if (Boolean(comment.pid) !== Boolean(comment.rid))
    return "回复必须关联完整的原留言";
  for (const match of text.matchAll(/\[Lozic:track:([^\]]+)\]/g))
    if (match[1] !== "beginning-to-understand") return "这首歌不在本站歌单中";
  comment.nick = nick;
  comment.comment = text;
  return null;
}
module.exports = { validateComment };
