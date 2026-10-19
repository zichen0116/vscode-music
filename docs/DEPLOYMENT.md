# 本地预览与部署

## 1. 本地打开桌面

在仓库根目录运行：

```powershell
npm start
```

浏览器打开 `http://127.0.0.1:4173`。前端无框架依赖，也可以使用任意静态 HTTP 服务；不要直接双击 `index.html`，浏览器需要通过 HTTP 加载模块与歌词。

要使用真实的本地留言，再打开一个终端：

```powershell
cd services/waline
npm ci
npm start
```

留言服务地址为 `http://127.0.0.1:8360`。在 localhost 预览中，Messages 和 FaceTime 自动使用持久测试墙；界面会标注“本地测试留言”。服务未运行时会显示重试和启动说明，草稿仍可保留。

`.data/waline.sqlite` 是本地测试库。不要上传它，不要提交管理员凭据；这些路径已加入 Git 忽略规则。

## 2. GitHub Pages

### 直接发布仓库

1. 提交前端文件、资源和 `.nojekyll` 到仓库。
2. 在 GitHub 仓库 Settings → Pages 中选择需要发布的分支和根目录。
3. 前端不依赖路由重写；资源路径兼容 `https://用户名.github.io/仓库名/`。
4. 查看真实音乐、头像和图标是否已随仓库提交。

### 只发布静态产物

运行 `npm run build`，把生成的 `dist/` 作为静态站点发布。打包器只复制前端、公开资源、音乐、歌词和部署说明，不包含服务端、数据库、环境文件及依赖。

GitHub Pages 本身不能保存访客留言。正式留言要按第 4 节配置独立服务。

## 3. Vercel 静态桌面

导入此仓库，Root Directory 使用仓库根目录。根目录的 `vercel.json` 已指定：

- Framework：Other／无框架。
- Build Command：`npm run build`。
- Output Directory：`dist`。

前端构建只复制文件，不打包框架。`npm start` 是本地预览命令，不是生产服务。

## 4. 正式留言服务

### 4.1 准备 PostgreSQL

使用你自己的持久 PostgreSQL 数据库。Waline 官方快速上手使用 Vercel 与 Neon，也可以使用其他兼容提供方。

在空数据库中导入 [Waline 官方 PostgreSQL 表结构](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql)，然后取得数据库名称、用户、密码、主机、端口和 SSL 要求。

### 4.2 单独部署服务

在 Vercel 另建项目，Root Directory 选择 `services/waline`。此目录有服务端入口、固定依赖、锁文件和独立 `vercel.json`。使用受支持的 Node 22 版本。

根据 `services/waline/.env.example` 设置：

| 配置                                         | 说明                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `PG_DB`、`PG_USER`、`PG_PASSWORD`、`PG_HOST` | PostgreSQL 提供方给出的实际值                                              |
| `PG_PORT`                                    | 一般为 `5432`，以提供方为准                                                |
| `PG_SSL`                                     | 云数据库通常设为 `true`                                                    |
| `JWT_TOKEN`                                  | 生成独立随机密钥，只保存在服务端环境变量                                   |
| `SITE_NAME`                                  | `Lozic 的 Mac`                                                             |
| `SITE_URL`                                   | 静态桌面的完整正式地址，包含需要的仓库子路径                               |
| `SERVER_URL`                                 | 留言服务完整地址                                                           |
| `SECURE_DOMAINS`                             | 桌面域名和服务域名，逗号分隔，不含协议和路径；同时使用两个桌面域名时都列出 |
| `IPQPS`                                      | 建议 `30`，限制同 IP 频繁提交                                              |
| `COMMENT_AUDIT`                              | 默认 `false`；需要先审后发时改为 `true`                                    |
| `DISABLE_REGION`、`DISABLE_USERAGENT`        | `true`，公开页面不显示地区和设备                                           |
| `AVATAR_PROXY`                               | `false`，本站使用本地匿名头像                                              |
| `MARKDOWN_TEX`、`MARKDOWN_HIGHLIGHT`         | `false`，本站使用文字和站内歌曲卡片                                        |

`LOGIN` 不要设置为 `force`，否则会破坏“只填昵称”的要求。不要把数据库密钥、JWT、SMTP 凭据写入 `scripts/config.js`。

部署成功后，由你首先访问 `服务地址/ui` 注册并初始化站长账号，再把公开留言入口连接到桌面。默认第一位注册者成为管理员，需先完成初始化。邮件通知不是匿名留言的前置条件，SMTP 可以稍后配置。

### 4.3 连接前端

编辑 `scripts/config.js`：

```js
export const guestbookConfig = {
  serverURL: "https://你的留言服务域名",
  path: "personal-mac/guestbook",
  pageSize: 20,
  pollInterval: 30000,
  localPreview: true,
};
```

`serverURL` 是服务根地址，不要附加 `/api`。同一份桌面部署在 GitHub Pages 和 Vercel 时，保持相同服务地址与 `path`，两边会显示同一面留言墙。

如果希望本地始终使用测试墙，在本地分支留空 `serverURL`；正式发布前填入正式地址。不要把正式留言服务当作自动测试环境。

部署完成后，用两个独立浏览器窗口各留一句话，再用站长后台回复一次，确认公开读取和主人标识。更多具体交互体验按用户偏好交由本人试用。

## 5. 更换内容与资源

- 主人名称、介绍、联系方式：`scripts/config.js` 的 `profile`。
- 歌曲和歌词：`tracks`，现有 `music.mp3` 与 `lyrics.lrc` 原样保留。
- 公开笔记、日程、照片：`publicNotes`、`milestones`、`photos`。
- 主人愿意公开的地点和愿望清单：`personalPlaces`、`publicWishes`，默认留空，避免虚构个人经历。
- 地点字段：`id`、`name`、`lat`、`lon`、`address`、`story`，可选 `trackId`、`photoId`；坐标使用数值。
- 照片可添加 `caption`／`story`、`placeId`、`trackId`，通过关联打开地图和歌曲。
- 欢迎视频／语音和外部真实会话链接：`profile.welcomeVideo`、`profile.welcomeAudio`、`profile.callURL`，默认留空。
- QQ 头像：`assets/qq.jpg`。
- 默认壁纸：`assets/wallpapers/original.jpg`；设置中仍可切换其他壁纸。
- 图标：`assets/icons/`；来源与版本见 `assets/SOURCES.md`。
- 如果此前在浏览器选择过壁纸，本地偏好会优先；在系统设置中选“最初的桌面”即可切回。

## 6. 目前的边界

- QQ 是个人网站的预设聊天，不是真实 QQ 登录；不会要求或保存真实密码。
- 信息是公开留言，不是私人短信；昵称不代表认证身份。
- FaceTime 保留真实留言来访记录，并提供明确标注的通话演示。摄像头和麦克风分别由访客主动开启，浏览器授权后仅用于本机预览／演示；不录制、不上传、不连接另一位访客，结束或关闭窗口即释放设备。设备能力要求 HTTPS 或 localhost。
- Gmail／网易邮箱编辑的是站点内容与本地草稿，发送时交给访客的真实邮箱确认。
- Safari 外部网页受对方嵌入策略影响，始终保留真实浏览器打开入口。
- 天气使用 Open-Meteo；未选城市时不自动定位，网络失败时显示错误或有时间戳的缓存。
- 地图使用 OpenStreetMap 在线嵌入视图，地点查询使用 Photon 公共服务，均不需要本站后端或地图 SDK。仅提交搜索时请求，缓存最近查询并限制连续请求；网络不可用时仍可读本地收藏，保留外部地图入口。路线在外部 Google Maps 中查看。
- Photon 公共服务允许合理请求量，但不保证可用性；流量增大时可更换 `mapConfig.searchURL` 为兼容且允许跨域的 Photon 服务，无需改动静态部署方式。[服务说明](https://github.com/komoot/photon#demo-server)
- 个人笔记、提醒、便签、地点收藏、照片备注和计时状态使用当前浏览器存储，不自动跨设备同步。备忘录支持 JSON 备份和导入；清理浏览器站点数据会清除这些本地内容。
- 倒计时和到期提醒在网页开启期间显示站内通知，关闭应用窗口仍有效；未提供关闭网页后的系统后台推送。浏览器休眠期间提醒可能延后。
- 废纸篓管理本地笔记、待办、便签和邮件副本，不操作你的电脑文件或公开留言数据库。
- App Store 的“获取”是加入桌面快捷方式，不下载或安装系统软件。

## 7. 已做的必要检查

- JavaScript 语法与基础单元测试。
- 本地 Waline 真实写入、独立客户端读取、回复，以及昵称／长度／父留言校验。
- 浏览器中的 QQ 登录页与 Messages → FaceTime 数据联动。
- 本轮新增动画取消、通话设备生命周期、待办与日历状态、计时器、笔记备份、地图坐标与缓存检查；测试使用模拟设备，不调用真实摄像头。
- 本轮对备忘录标题栏、窗口连续切换和 App Store 启动做了少量浏览器检查；新增应用未做全面体验测试。

尚未连接生产数据库、创建线上管理员或发布到用户账号的托管平台。具体窗口手感、视觉还原细节及各应用完整体验留给用户试用反馈。
