// Public site content only. Never put database credentials or admin tokens here.
export const profile = {
  name: "Lozic",
  title: "Lozic 的 Mac",
  avatar: "assets/qq.jpg",
  welcome: "来坐一会儿，听首歌吧。",
  bio: "这里是我的一小片数字生活。你可以打开应用随意逛逛，听一首歌，或者给我留句话。",
  qq: "1169882492",
  gmail: "zzcn.leo@gmail.com",
  netease: "zzcn.leo@163.com",
  github: "zichen0116",
  website: "https://lozic7.com",
  phone: "",
  callURL: "",
  welcomeVideo: "",
  welcomeAudio: "",
};
export const guestbookConfig = {
  // Set to your deployed Waline server, e.g. https://your-guestbook.vercel.app
  serverURL: "",
  path: "personal-mac/guestbook",
  pageSize: 20,
  pollInterval: 30000,
  localPreview: true,
};
export const tracks = [
  {
    id: "beginning-to-understand",
    title: "开始懂了",
    artist: "孙燕姿",
    audio: "music.mp3",
    lyrics: "lyrics.lrc",
  },
];
export const publicNotes = [
  {
    id: "welcome",
    title: "欢迎来我的 Mac",
    folder: "关于我",
    body: "你好，我是 Lozic。\n\n欢迎来到我的桌面。这里的每个应用都藏着一点生活：QQ 里可以聊聊，Safari 通向我的主页，VS Code 会把歌写成代码。\n\n如果你愿意，就在“信息”里留下一句话。也许是一首推荐的歌，也许只是今天的心情。\n\n很高兴你来。",
  },
  {
    id: "music",
    title: "把歌写进代码里",
    folder: "音乐",
    body: "有些话，歌里已经唱过了。\n\n打开 VS Code，听一首《开始懂了》。歌词会一行一行变成代码。\n\n你也有一首反复听的歌吗？欢迎在信息里告诉我。",
  },
  {
    id: "contact",
    title: "保持联系",
    folder: "关于我",
    body: "QQ：1169882492\nGmail：zzcn.leo@gmail.com\n网易邮箱：zzcn.leo@163.com\nGitHub：zichen0116\n个人网站：https://lozic7.com",
  },
];
export const milestones = [];
export const photos = [];
// Only add places and wishes that you want to share publicly.
export const personalPlaces = [];
export const publicWishes = [];
export const mapConfig = {
  searchURL: "https://photon.komoot.io/api/",
  resultLimit: 6,
};
export const wallpapers = [
  { id: "dark", name: "夜色", src: "assets/wallpapers/dark.jpg" },
  { id: "light", name: "日光", src: "assets/wallpapers/light.jpg" },
  { id: "original", name: "最初的桌面", src: "assets/wallpapers/original.jpg" },
];
export const appInfo = {
  finder: {
    name: "访达",
    english: "Finder",
    w: 900,
    h: 560,
    icon: "finder.png",
  },
  safari: { name: "Safari", w: 1060, h: 680, icon: "safari.png" },
  qq: { name: "QQ", w: 400, h: 575, minW: 320, minH: 460, icon: "qq.png" },
  messages: {
    name: "信息",
    english: "Messages",
    w: 960,
    h: 630,
    icon: "messages.png",
  },
  gmail: { name: "Gmail", w: 1060, h: 660, icon: "gmail.svg" },
  netease: { name: "网易邮箱", w: 1020, h: 650, icon: "netease.png" },
  github: { name: "GitHub", w: 1030, h: 660, icon: "github.png" },
  terminal: {
    name: "终端",
    english: "Terminal",
    w: 760,
    h: 490,
    icon: "terminal.png",
  },
  vscode: {
    name: "Code",
    english: "Visual Studio Code",
    w: 1080,
    h: 670,
    icon: "vscode.png",
  },
  calendar: {
    name: "日历",
    english: "Calendar",
    w: 1000,
    h: 660,
    icon: "calendar.png",
  },
  facetime: { name: "FaceTime", w: 920, h: 600, icon: "facetime.png" },
  calculator: {
    name: "计算器",
    english: "Calculator",
    w: 330,
    h: 480,
    minW: 300,
    minH: 440,
    icon: "calculator.png",
  },
  settings: {
    name: "系统设置",
    english: "System Settings",
    w: 830,
    h: 610,
    icon: "settings.png",
  },
  phone: { name: "电话", english: "Phone", w: 770, h: 570, icon: "phone.png" },
  weather: {
    name: "天气",
    english: "Weather",
    w: 940,
    h: 620,
    icon: "weather.png",
  },
  contacts: {
    name: "通讯录",
    english: "Contacts",
    w: 780,
    h: 560,
    icon: "contacts.png",
  },
  notes: {
    name: "备忘录",
    english: "Notes",
    w: 950,
    h: 620,
    icon: "notes.png",
  },
  photos: {
    name: "照片",
    english: "Photos",
    w: 980,
    h: 640,
    icon: "photos.png",
  },
  trash: {
    name: "废纸篓",
    english: "Trash",
    w: 780,
    h: 510,
    icon: "trash.png",
  },
  reminders: {
    name: "提醒事项",
    english: "Reminders",
    w: 940,
    h: 620,
    icon: "reminders.png",
  },
  maps: { name: "地图", english: "Maps", w: 1080, h: 680, icon: "maps.png" },
  appstore: {
    name: "App Store",
    english: "应用中心",
    w: 1030,
    h: 670,
    icon: "appstore.png",
  },
  clock: { name: "时钟", english: "Clock", w: 820, h: 580, icon: "clock.png" },
  stickies: {
    name: "便签",
    english: "Stickies",
    w: 620,
    h: 460,
    icon: "stickies.png",
  },
};
export const previousDefaultDock = [
  "finder",
  "safari",
  "qq",
  "messages",
  "gmail",
  "netease",
  "github",
  "terminal",
  "vscode",
  "calendar",
  "facetime",
  "calculator",
  "settings",
];
export const defaultDock = [
  "finder",
  "safari",
  "qq",
  "messages",
  "vscode",
  "notes",
  "settings",
];
export const defaultDesktopApps = [
  "notes",
  "reminders",
  "maps",
  "appstore",
  "photos",
];
