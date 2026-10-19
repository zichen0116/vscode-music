export const categories = ["全部", "认识我", "生活", "音乐", "效率", "小工具"];
export const appCatalog = {
  finder: {
    category: "效率",
    summary: "在文件里，慢慢认识我。",
    features: ["公开文件夹", "快速查看", "笔记与音乐入口"],
  },
  safari: {
    category: "认识我",
    summary: "从这张桌面，打开我的世界。",
    features: ["个人主页", "标签与收藏", "外部网站入口"],
  },
  qq: {
    category: "认识我",
    summary: "登录一个小小的桌面分身。",
    features: ["熟悉的登录页", "预设聊天", "个人名片与歌曲卡片"],
  },
  messages: {
    category: "认识我",
    summary: "留下一句话，让我们认识一下。",
    features: ["公开留言", "回复与歌曲分享", "真实服务状态"],
  },
  gmail: {
    category: "认识我",
    summary: "写一封认真或轻松的信。",
    features: ["站点来信", "本地草稿", "在真实邮箱继续发送"],
  },
  netease: {
    category: "认识我",
    summary: "用另一种熟悉的方式保持联系。",
    features: ["生活来信", "搜索和归档", "网易邮箱联系入口"],
  },
  github: {
    category: "认识我",
    summary: "看看我公开做过的事情。",
    features: ["公开仓库", "语言筛选", "README 与源码入口"],
  },
  vscode: {
    category: "音乐",
    summary: "有些话，写在歌里，也写在代码里。",
    features: ["音乐播放器", "同步代码歌词", "歌单与个人介绍"],
  },
  notes: {
    category: "效率",
    summary: "记下一点今天，也留给明天。",
    features: ["格式与清单", "文件夹、标签和置顶", "导出与备份"],
  },
  reminders: {
    category: "效率",
    summary: "一件件小事，慢慢完成。",
    features: ["今天与计划", "重要标记与优先级", "日历联动"],
  },
  calendar: {
    category: "生活",
    summary: "给日常留一个位置。",
    features: ["日、周、月视图", "本地提醒", "日程导出"],
  },
  maps: {
    category: "生活",
    summary: "把喜欢的地方，收进这张地图。",
    features: ["地图拖动与缩放", "地点搜索与收藏", "地点故事与路线入口"],
  },
  photos: {
    category: "生活",
    summary: "照片里，有另一种自我介绍。",
    features: ["相簿与收藏", "照片备注", "地点和音乐故事"],
  },
  facetime: {
    category: "认识我",
    summary: "来访、留言，还有一次轻松的通话体验。",
    features: ["公开来访记录", "演示通话与本机预览", "已有会话链接"],
  },
  phone: {
    category: "认识我",
    summary: "想联系的时候，随时找到我。",
    features: ["个人联系名片", "拨号体验", "真实联系方式入口"],
  },
  contacts: {
    category: "认识我",
    summary: "把联系方式放在同一张名片上。",
    features: ["QQ 与邮箱", "个人网站", "联系人导出"],
  },
  weather: {
    category: "生活",
    summary: "看看你那边，今天的天空。",
    features: ["城市搜索", "真实天气", "桌面组件联动"],
  },
  clock: {
    category: "小工具",
    summary: "给专注和休息，都留一点时间。",
    features: ["世界时钟", "秒表与计次", "倒计时"],
  },
  stickies: {
    category: "小工具",
    summary: "把随手的一句话，贴在桌面上。",
    features: ["彩色便签", "移动与收起", "本地保存"],
  },
  calculator: {
    category: "小工具",
    summary: "一台认真可用的计算器。",
    features: ["基础运算", "计算历史", "键盘输入"],
  },
  terminal: {
    category: "小工具",
    summary: "用命令，探索这台小小的 Mac。",
    features: ["虚拟个人目录", "应用启动", "音乐控制"],
  },
  settings: {
    category: "小工具",
    summary: "让这张桌面更像你喜欢的样子。",
    features: ["外观与壁纸", "Dock 与组件", "隐私说明"],
  },
  appstore: {
    category: "小工具",
    summary: "发现桌面里藏着的小应用。",
    features: ["分类与搜索", "加入桌面", "管理常用入口"],
  },
};
export function categoryFor(id) {
  return appCatalog[id]?.category || "小工具";
}
