import assert from "node:assert/strict";
const base = "http://127.0.0.1:8360/api/comment",
  wall = "personal-mac/guestbook-test";
async function post(value) {
  const response = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  return response.json();
}
const marker = `integration-${Date.now()}`;
const result = await post({ nick: "接口验证访客", comment: marker, url: wall });
assert.equal(result.errno, 0, JSON.stringify(result));
assert.ok(result.data.objectId);
assert.equal(result.data.status, "approved");
const reply = await post({
  nick: "另一位测试访客",
  comment: "跨客户端回复验证",
  url: wall,
  pid: result.data.objectId,
  rid: result.data.objectId,
});
assert.equal(reply.errno, 0, JSON.stringify(reply));
const read = await fetch(
  `${base}?${new URLSearchParams({ path: wall, page: "1", pageSize: "100", sortBy: "insertedAt_desc" })}`,
).then((r) => r.json());
assert.equal(read.errno, 0);
const found = read.data.data.find(
  (c) => String(c.objectId) === String(result.data.objectId),
);
assert.ok(found);
assert.ok(
  found.children.some(
    (c) => String(c.objectId) === String(reply.data.objectId),
  ),
);
const forged = await post({
  nick: "Lozic",
  comment: "昵称不能冒充站长",
  url: wall,
  type: "administrator",
  user_id: 1,
});
assert.equal(forged.errno, 0);
assert.notEqual(forged.data.type, "administrator");
for (const input of [
  { nick: "", comment: "hello", url: wall },
  { nick: "x".repeat(25), comment: "hello", url: wall },
  { nick: "test", comment: "x".repeat(1001), url: wall },
  { nick: "test", comment: "hello", url: "unknown" },
  {
    nick: "test",
    comment: "bad parent",
    url: wall,
    pid: 99999999,
    rid: 99999999,
  },
]) {
  const response = await post(input);
  assert.notEqual(response.errno, 0, JSON.stringify(input));
}
console.log(
  JSON.stringify({
    result: "pass",
    rootId: result.data.objectId,
    replyId: reply.data.objectId,
    marker,
    checks: [
      "persistent server write",
      "independent HTTP read",
      "thread reply",
      "owner spoof blocked",
      "server input validation",
      "invalid parent rejected",
    ],
  }),
);
