# Lozic 的 Mac

一台住在浏览器里的个人 Mac。听一首歌，翻翻生活，再留下一句话。

纯 HTML、CSS 和 JavaScript，前端无需安装依赖。可直接托管到 GitHub Pages，或用 Vercel 发布静态产物。

## 本地启动

```powershell
npm start
```

打开 [本地桌面](http://127.0.0.1:4173)。默认沿用旧版 `original.jpg` 壁纸，现有音乐和歌词保留。

需要真实共享留言时，在另一个终端运行：

```powershell
cd services/waline
npm ci
npm start
```

本地留言服务为 `http://127.0.0.1:8360`，后台为 `http://127.0.0.1:8360/ui`。测试留言持久保存在被 Git 忽略的 SQLite 文件中；上线使用独立 Waline 服务和 PostgreSQL。

## 桌面体验

- 窗口拖动、调整大小、置顶、最小化、放大、恢复和关闭。
- Dock 相邻图标放大、启动反馈、运行指示、右键菜单和排序。
- QQ 截图登录页与预设聊天；VS Code 播放音乐并把歌词写成代码。
- Messages 公开留言，FaceTime 展示同一批留言的来访记录。
- Gmail、网易邮箱、GitHub、Safari、终端、电话、日历、计算器。
- Finder、通讯录、备忘录、照片、天气、系统设置和废纸篓。
- 日历、天气、播放和个人名片组件；主题、壁纸、Dock 与动效可调整。

## 配置与部署

- [交互方案](docs/MACOS_DESKTOP_SPEC.md)
- [部署说明](docs/DEPLOYMENT.md)
- [留言服务](services/waline/README.md)
- [资源来源与版本](assets/SOURCES.md)
- [实现状态与交接](docs/IMPLEMENTATION_STATUS.md)

个人内容集中在 `scripts/config.js`，图标位于 `assets/icons/`。正式留言上线时填写 `guestbookConfig.serverURL`；空地址在公网环境会显示待配置，不会把本地草稿冒充已发布。

```powershell
npm run build          # 生成可独立托管的 dist/
npm test               # 关键逻辑检查
npm run test:guestbook  # 本地服务接口检查，会写入测试留言
```

QQ 登录是演示，不需要真实密码；邮箱通过真实邮件客户端继续发送；Safari 保留外部网站打开入口；网页不会操作电脑磁盘或接通真实电话。
