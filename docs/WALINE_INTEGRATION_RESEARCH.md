# Waline 留言服务实现契约

核查日期：2026-10-18。对应 `MACOS_DESKTOP_SPEC.md` 第 5.3、5.4、7、10.3 节。本报告只读取官方资料和发布包源码，没有建立账户、部署服务或发布留言。

## 1. 版本与最小方案

- 前端继续使用原生 `fetch`。`@waline/api` 可选，不需要默认评论 UI，也不需要为三条接口引入构建。该包的 `getComment` 会拆开响应外层，`addComment` 不会自动检查 `errno`，自行调用时尤其要注意。[官方 API 包源码](https://github.com/walinejs/waline/blob/main/packages/api/src/comment.ts)
- 本次查询 npm，`@waline/vercel` 的 `latest` 是 **1.43.4**，但 1.43.0–1.43.4 依赖的 `@waline/core@0.1.0` 在官方 registry 返回 404。当前可采用 **精确锁定 `@waline/vercel: "1.42.0"`** 的方案，并通过实际安装和集成测试确认；不要用 `latest` 掩盖此问题。以上是本次查询结果，不是永久版本结论。[发布元数据](https://registry.npmjs.org/@waline/vercel)、[缺失依赖查询](https://registry.npmjs.org/@waline%2Fcore)
- 1.42.0 声明 Node `^20.19.0 || ^22.12.0 || ^24.0.0`，建议 Node 22.12+。本报告关于服务行为的结论同时检查了官方 **1.42.0 tarball**，没有只凭 main 分支推断。[1.42.0 元数据](https://registry.npmjs.org/@waline/vercel/1.42.0)
- 服务端单独目录与 Vercel 项目，生产使用 PostgreSQL；本地测试使用持久 SQLite。前端只保存公开的 `serverURL` 和固定 `path`，不能包含 JWT 密钥、数据库密码或管理员 token。

## 2. 请求与响应

服务地址配置为 `https://comments.example.com`，不要手动配置末尾 `/api`。以下所有 ID 应当视为不透明 ID，在应用内部用 `String(id)` 比较；不同数据库可能返回字符串或数字。

### 读取根会话及回复

```http
GET /api/comment?path=personal-mac%2Fguestbook&page=1&pageSize=20&sortBy=insertedAt_desc&lang=zh-CN
```

```json
{
  "errno": 0,
  "data": {
    "count": 2,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "data": [{
      "objectId": 1,
      "time": 1792281600000,
      "nick": "访客",
      "comment": "<p>你好</p>\n",
      "status": "approved",
      "children": [{
        "objectId": 2,
        "pid": 1,
        "rid": 1,
        "time": 1792281660000,
        "nick": "Lozic",
        "comment": "<p>欢迎来玩</p>\n",
        "user_id": 1,
        "type": "administrator",
        "status": "approved"
      }]
    }]
  }
}
```

这是结构示意，不是已写入的测试数据。分页单位是**根留言**；`count` 包含回复，`totalPages` 由根留言数量计算。当前根的 `children` 全部返回，没有独立的回复分页接口；客户端对回复按 `time`、ID 稳定排序。排序允许 `insertedAt_desc`、`insertedAt_asc`、`like_desc`，`pageSize` 最大 100。不能依据 `count / pageSize` 推算页数。[服务端 API](https://waline.js.org/en/reference/server/api.html)、[公开类型](https://waline.js.org/en/reference/api/)、[服务端实现](https://github.com/walinejs/waline/blob/main/packages/core/src/handlers/comment.ts)

**不要依赖匿名响应有 `orig`。** 文档类型列出 `orig`，但已检查的服务源码仅在登录请求时附上原始内容；匿名读取通常只有已渲染的 `comment` HTML。气泡要以安全文本形式呈现，不能直接 `innerHTML = comment`。必要的换行、公开 HTTP(S) 链接和本站歌曲卡片由客户端受控重建；不加载返回的外部图片、音频、iframe。[格式化实现](https://github.com/walinejs/waline/blob/main/packages/core/src/utils/comment.ts)

### 匿名发布与回复

```http
POST /api/comment?lang=zh-CN
Content-Type: application/json
```

```json
{
  "nick": "访客昵称",
  "comment": "今天听了这首歌，来留句话。",
  "url": "personal-mac/guestbook",
  "ua": "浏览器 userAgent"
}
```

不传 `mail`、`link`、Authorization 就可以匿名发布；服务端不要设置 `LOGIN=force`。回复再加入 `pid`（被回复记录 ID）、`rid`（根记录 ID）、`at`（被回复昵称）。回复根留言时 `pid === rid`；回复回复时保留原根 ID。不要以昵称合并会话，也不要通过匿名字段决定消息归属权限。

成功形状为 `{ "errno": 0, "data": { ...一条留言 } }`。等待审核或被反垃圾机制处理时，也可能成功保存但 `data.status` 为 `waiting` 或 `spam`；此时应显示“已提交，等待公开”或“未公开”，不能显示已公开成功。匿名后续 GET 不会返回这两种状态的留言，待审核草稿和 ID 只能作为本浏览器提示保存。

错误通常是 `{ "errno": 非零, "errmsg": "说明" }`；HTTP 200 不代表业务成功，401/403/500 也可能没有可解析的正常 JSON。统一检查 HTTP、JSON、`errno`、`data.objectId` 和状态。提交过程中禁用重复发送；网络超时不能自动重发，因为服务端可能已经保存。失败保留草稿，提供手动重试并先刷新对账。[官方读取与发布实现](https://github.com/walinejs/waline/blob/main/packages/api/src/comment.ts)

### 可靠主人身份与后台

主人徽标只由服务器返回的 `type === "administrator"` 且存在 `user_id` 产生；昵称、头像、邮箱相同均不能产生徽标。发布接口并不接受任意客户端 `user_id`／`type` 成为真实身份，它从已验证 token 读取用户。公开前端无需收集管理 token。

站长从 `serverURL/ui` 登录并回复、删除、审核。认证调用使用 `Authorization: Bearer <token>`；删除为 `DELETE /api/comment/{id}`，审核为 `PUT /api/comment/{id}` + `{ "status": "approved" }`。游客没有编辑或删除权，不能靠本地昵称偏好恢复权限。第一个在 `/ui/register` 注册的账户会成为管理员，生产部署后应在开放入口前由主人完成初始化。[官方 Vercel 管理说明](https://waline.js.org/en/guide/deploy/vercel.html)、[权限实现](https://github.com/walinejs/waline/blob/main/packages/server/src/logic/comment.js)

## 3. 服务端必须增加的约束

Waline 基础规则只保证 `url`、`comment` 是必填字符串，**不会替这个项目完成昵称 1–24、内容 1–1000 的约束**。在服务入口配置 `preSave`，按 Unicode 码点长度（`Array.from(value).length`）校验，前后端采用同一口径。返回 `{ errmsg: "具体原因" }` 拒绝保存。钩子必须是普通方法，才能使用 Waline 提供的 `this`。[服务端配置与 hooks](https://waline.js.org/en/reference/server/config.html)

```js
const Waline = require('@waline/vercel');

module.exports = Waline({
  async preSave(comment) {
    const nick = typeof comment.nick === 'string' ? comment.nick.trim() : '';
    const text = typeof comment.comment === 'string' ? comment.comment.trim() : '';
    if (!nick || Array.from(nick).length > 24) return { errmsg: '昵称须为 1–24 个字符' };
    if (!text || Array.from(text).length > 1000) return { errmsg: '内容须为 1–1000 个字符' };
    if (!['personal-mac/guestbook', 'personal-mac/guestbook-test'].includes(comment.url)) {
      return { errmsg: '未知留言墙' };
    }
    comment.nick = nick;
    comment.comment = text;
  }
});
```

实现时还需要补两项检查：

1. **父记录检查**：任何回复必须同时有 `pid`、`rid`，且二者都指向相同 `url` 下的已公开记录；`rid` 必须是根，`pid` 必须属于这个根。可用 `this.getModel('Comment').select(...)`。1.42.0 的默认流程在写入后读取父记录，无效父 ID 有保存后报错的风险；预保存校验同时防止跨墙拼接。无根 ID 的普通留言允许发布。管理员回复审核中记录可按后台身份单独放行。
2. **受控歌曲／心情格式**：使用普通文本标记（例如末尾 `【Lozic:track:original】`）而非 HTML 注释；Markdown 会过滤或改写 HTML。只接受配置中的稳定曲目 ID 和预设心情。普通客户端仍能看到文字回退；气泡解析后用本地曲目表渲染卡片。明确 1000 字上限是总存储文本还是正文，前后端保持一致。

`IPQPS` 是同 IP 发布间隔秒数，默认 60；建议首版 30，测试专用服务可设 0。`COMMENT_AUDIT=false` 使普通通过校验的消息公开，后台仍可改状态；`true` 时前端必须显示待审核。反垃圾、验证码与域名限制不可假装已启用。[环境变量](https://waline.js.org/en/reference/server/env.html)

## 4. 服务文件与生产部署

建议 `services/waline/` 包含 `package.json`、锁文件、`index.cjs`、`vercel.json`、`.env.example`、`.gitignore`、`README.md`；本地启动器与独立测试数据在服务目录内。Vercel 另建项目，Root Directory 选择此目录，不与静态桌面的部署混在一起。[官方入口模板](https://github.com/walinejs/waline/blob/main/example/index.cjs)

`package.json` 精确依赖 `@waline/vercel: "1.42.0"`。`vercel.json` 沿用官方 `@vercel/node` 入口和全路径重写，包含 ip2region 数据目录；按实际锁定版本包含 MathJax 字体资源，或关闭本项目不需要的公式渲染。不要直接拷贝模板旧字体目录却不检查安装包。源模板现在列出 `mathjax-newcm-font`，而 1.42.0 依赖 `mathjax-tex-font`，存在版本差异。[官方部署配置](https://github.com/walinejs/waline/blob/main/example/vercel.json)

生产环境变量：

| 变量 | 值／用途 |
| --- | --- |
| `PG_DB`, `PG_USER`, `PG_PASSWORD`, `PG_HOST` | 从持久 PostgreSQL 服务取得，密码仅配置于服务环境 |
| `PG_PORT` | 明确设置 `5432` 或服务给出的端口；文档表格的 3211 与实际适配器默认 5432 不一致 |
| `PG_SSL` | 云数据库通常 `true`，按提供方要求 |
| `JWT_TOKEN` | 独立随机密钥；不要复用公开值 |
| `SITE_NAME`, `SITE_URL`, `SERVER_URL` | 站点名、静态桌面完整地址、留言服务完整地址 |
| `SECURE_DOMAINS` | 允许的前端域名和留言服务域名，逗号分隔，依据实际部署填写 |
| `IPQPS` | `30`（建议初值） |
| `COMMENT_AUDIT` | `false`（文档要求的默认公开流程） |
| `DISABLE_USERAGENT`, `DISABLE_REGION` | `true`，公开页面不展示访客设备和地区 |
| `AVATAR_PROXY` | `false`；前端使用本地首字头像，不依赖 Gravatar |
| `MARKDOWN_TEX`, `MARKDOWN_HIGHLIGHT` | `false`，本站只接受文本与受限卡片 |
| `LOGIN` | 不设为 `force` |

Waline 也读取 `POSTGRES_DATABASE/USER/PASSWORD/HOST/PORT/SSL` 别名。不能只放一个 `DATABASE_URL` 就认为适配器已配置。先在数据库导入官方 `assets/waline.pgsql` 建表，再配置变量并重新部署。Vercel 官方流程使用 Neon，但不要求必须选该供应商。[数据库说明](https://waline.js.org/en/guide/database.html)、[PostgreSQL 建表脚本](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql)

`SECURE_DOMAINS` 按来源域名限制访问，不能当成身份认证；缺省允许所有来源。本地 `localhost`、`127.0.0.1` 默认允许，实际上线仍要验证 GitHub Pages 和 Vercel 两个 Origin。`secureDomains` 代码选项会覆盖环境变量，避免两处冲突。[域名配置](https://waline.js.org/en/reference/server/config.html#securedomains)

## 5. 本地持久 SQLite 验证

研究阶段未运行下列写入测试，实施时应真实执行并记录结果：

1. 在服务目录安装依赖；确保使用符合 engines 的 Node。`think-model-sqlite@2.0.1` 使用原生 `better-sqlite3@^11.10.0`，不能 `--ignore-scripts` 后就认为数据库可用。[SQLite 适配器元数据](https://registry.npmjs.org/think-model-sqlite/2.0.1)
2. 建立被 Git 忽略的 `.data/`，把官方空数据库保存为 `.data/waline.sqlite`。下载的是初始化模板；以后启动禁止覆盖已有数据库。[官方 SQLite 空库](https://github.com/walinejs/waline/blob/main/assets/waline.sqlite)、[对应建表 SQL](https://github.com/walinejs/waline/blob/main/assets/waline.sqlite.sql)
3. 在加载 `@waline/vercel` **之前**设置 `SQLITE_PATH` 为 `.data` 的绝对目录，`SQLITE_DB=waline`、随机 `JWT_TOKEN`、`IPQPS=0`、`COMMENT_AUDIT=false`、`AKISMET_KEY=false`、`DISABLE_REGION=true`、`DISABLE_USERAGENT=true`。测试环境明确关闭外部反垃圾请求；生产配置不能照搬测试禁用值。
4. 本地启动器使用 `http.createServer(require('./index.cjs')).listen(8360, '127.0.0.1')`。环境必须由启动器先设置，再 `require('./index.cjs')`；SQLite 路径不包含文件名。保持同一文件即可在重启后持久保存。
5. 前端测试配置指向 `http://127.0.0.1:8360`，逻辑路径 `personal-mac/guestbook-test`。使用两个独立浏览器上下文验证发布／读取，重启服务后再读取同一 ID；不能以 localStorage 数据证明共享。
6. 在本地 `/ui/register` 建立测试管理员，后台真实回复一次，独立匿名客户端确认 `type/user_id`；使用同昵称匿名发布确认没有主人徽标。测试账号只用于这份本地库，不作为生产账户或发布样例。
7. 测试长度边界、纯空白、绕过前端直发、恶意 HTML、未知曲目、重复点击、错误父 ID、跨墙父 ID、服务离线、待审核与删除同步。启用 `IPQPS=1` 后单独验证限流；切换审核后重新启动服务。

SQLite 属于本地验证／持久磁盘自托管方案；Vercel 函数不能把临时文件系统当作持久留言数据库。生产采用 PostgreSQL 并重复跨浏览器检查，才满足上线真实共享验收。本地持久服务证明协议实现可用，不能冒充生产部署已经完成。

## 6. 前端实现检查点

- Messages 与 FaceTime 共享请求、缓存、错误和按 ID 已读游标；一个根记录就是一个访客会话，不按昵称聚合。
- 初次成功加载建立通知基线，不弹历史消息；随后轮询按根和回复 ID 去重，页面隐藏时暂停。只刷新第一页会漏掉旧会话的新回复，应刷新已加载页，或读取 `type=recent&count=50` 后按 `url` 过滤并定位所属根。
- `type=recent` 是全站最近记录，不接受 `path` 作为墙过滤，且最多 50 条；不能把其他测试墙消息误当本站新消息。
- 服务器审核／删除后采用本轮权威集合替换相应分页，避免仅 append 导致已删除记录长期留存。
- 查询失败与真实空列表分开；未配置服务显示配置入口，不能写入浏览器后宣称全网发布成功。
- 本地演示 QQ 数据与真实 Waline 数据完全分离；编辑器中的歌曲仅引用本地配置，无任意 URL 播放能力。

上述是实现与验收依据；服务凭据、域名与数据库仍需由实际部署环境提供。
