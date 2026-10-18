# 实现状态与交接

更新：2026-10-18。当前分支：`codex/personal-mac-desktop`。

## 已写入项目的功能

| 范围 | 实现位置 | 状态 |
| --- | --- | --- |
| 窗口、Dock、菜单、Spotlight、通知、桌面组件 | `scripts/desktop.js` | 已实现共用行为 |
| VS Code 与唯一播放器、歌词同步 | `scripts/apps/vscode.js`、`scripts/player.js` | 已保留并扩展原音乐体验 |
| QQ 登录页、预设聊天、资料卡、二维码 | `scripts/apps/qq.js` | 已按用户截图构建交互元素 |
| Messages 与 FaceTime | `scripts/apps/messages.js`、`scripts/guestbook.js` | 共用真实 Waline 数据，支持公开留言、回复、歌曲引用与状态反馈 |
| Safari、Gmail、网易邮箱、GitHub | `scripts/apps/safari.js`、`mail.js`、`github.js` | 已实现浏览、站点来信、本地草稿和真实外链交接 |
| 终端、计算器 | `scripts/apps/tools.js`、`scripts/calculator.js` | 虚拟命令与真实计算 |
| Finder、备忘录、照片 | `scripts/apps/files.js` | 公开文件、可编辑本地笔记、图库与图片查看 |
| 日历、天气 | `scripts/apps/calendar.js`、`weather.js`、`scripts/weather.js` | 本地提醒、日／周／月、日程导出；选城市获取 Open-Meteo 数据 |
| 电话、通讯录、设置 | `scripts/apps/personal.js` | 联系名片、拨号体验与可用联系替代入口、外观偏好 |
| 废纸篓 | `scripts/apps/trash.js` | 桌面及 Dock 入口；本地笔记和邮件副本的恢复、确认清空 |
| 资源 | `assets/` | 真实图标、本机 QQ 图标、头像、三套壁纸及网站二维码；来源逐项记录 |
| 留言服务 | `services/waline/` | 可安装运行，持久本地 SQLite；包含生产 PostgreSQL 环境模板和 Vercel 入口 |
| 静态发布 | `tools/build-static.mjs`、根 `vercel.json` | GitHub Pages 可直接发布，Vercel 使用静态产物 |

默认壁纸为 `assets/wallpapers/original.jpg`。若浏览器之前已经主动选择过其他壁纸，已保存的偏好会保留；可在设置中切回“最初的桌面”。

## 已完成的必要验证

- 关键逻辑单元测试覆盖歌词时间精度、关闭中的播放竞争、计算器行为、窗口边界、协议过滤、站长标识和留言长度。
- 本地 Waline 安装启动成功，真实留言写入和独立 HTTP 客户端读取成功。
- 真实根留言与回复关联成功；昵称冒充站长不会得到认证类型；空昵称、超长输入、错误留言墙、无效父记录被拒绝。
- 已修复 Waline 默认头像模板在匿名无邮箱时的错误，前端仍只要求昵称。
- 浏览器已查看 QQ 登录页，完成 Messages 实际发布及 FaceTime 同源来访显示。
- 后续按用户要求减少逐项 UI 体验测试，具体使用手感与视觉细节交给用户试用反馈。

## 尚需实际环境配置或用户素材

- 正式留言服务域名、生产 PostgreSQL 和站长初始化账号尚未配置。代码已就绪，本地测试库不是线上留言墙。
- 未发布到用户的 GitHub Pages 或 Vercel 账号；部署流程见 `DEPLOYMENT.md`。
- 欢迎语音／视频、电话、更多生活照片、真实个人事件和其他歌曲还没有提供，不虚构这些内容。
- 废纸篓目前使用真实旧版 Apple 图形的 32px 归档文件，可替换为更高清的同款资源。
- macOS 27 的逐像素差异、不同桌面尺寸下的完整体验，等待用户试用后继续调整；本文件不宣称已通过全部视觉验收。

## 建议直接试用的入口

打开本地桌面后，可以先试 QQ 登录 → 歌曲卡片 → VS Code；再试“信息”留言 → FaceTime 来访；最后查看设置里的壁纸、Dock，以及本地笔记删除后在废纸篓恢复。

请反馈具体应用、操作和实际结果，后续可直接在对应模块继续修正。
