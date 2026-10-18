// Waline's default avatar template assumes an email. This guestbook only needs a nickname.
process.env.GRAVATAR_STR ||= `${process.env.SITE_URL || "http://127.0.0.1:4173"}/assets/avatar-guest.svg`;
const Waline = require("@waline/vercel");
const { validateComment } = require("./validation.cjs");
module.exports = Waline({
  async preSave(comment) {
    const error = validateComment(comment);
    if (error) return { errmsg: error };
    comment.mail ||= "";
    comment.link ||= "";
    comment.ua ||= "";
    if (comment.pid || comment.rid) {
      const model = this.getModel("Comment");
      const [parents, roots] = await Promise.all([
        model.select({ objectId: comment.pid }),
        model.select({ objectId: comment.rid }),
      ]);
      const parent = parents[0],
        root = roots[0];
      if (
        !parent ||
        !root ||
        parent.url !== comment.url ||
        root.url !== comment.url ||
        root.rid ||
        (String(parent.objectId) !== String(root.objectId) &&
          String(parent.rid) !== String(root.objectId))
      )
        return { errmsg: "原留言不存在或不属于当前会话" };
      if (parent.status !== "approved" || root.status !== "approved")
        return { errmsg: "只能回复已公开的留言" };
    }
  },
});
