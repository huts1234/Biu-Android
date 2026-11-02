# Biu for Android

[`mobile/`](./) 基于 Biu 1.16.0 的桌面端代码二次开发，用 **Capacitor 8 + React + Vite** 打包成两个可独立安装的 Android 应用：

| 应用 | applicationId | 布局 | 主题色 |
| --- | --- | --- | --- |
| **Biu for Phone** | `com.biu.music.phone` | 底部 TabBar + MiniPlayer + 全屏播放器 | 粉橙 |
| **Biu for Pad** | `com.biu.music.pad` | 侧边栏 + 内容区 + 右侧播放面板 | 蓝紫 |

UI 按 iOS / iPadOS 的视觉语言重写：大标题、玻璃拟态、分组列表、底部 Sheet、自定义 Slider / Switch / SegmentedControl。桌面端 `src/` 与 `shared/` **保持只读复用**，移动端只新增代码，不改动原有功能。

---

## 目录结构

```
mobile/
├── src/
│   ├── pages/             发现 / 搜索 / 资料库 / 收藏夹 / 历史 / 稍后再看 / 设置
│   ├── components/        布局、播放器、列表、Sheet、通用控件
│   ├── store/             播放器、UI、最近播放、搜索历史、应用设置
│   ├── lib/               平台适配（HTTP、Cookie、主题、歌词、MediaSession…）
│   ├── shims/             桌面 store / UI 库的移动端替身
│   └── api/               基于 src/service 的移动端数据层
├── dev/preview.html       仅开发环境：固定尺寸设备预览外壳
├── scripts/
│   ├── generate-icons.sh  生成两套图标与启动图
│   └── stage-assets.mjs   把 Vite 产物搬进对应 flavor 的 assets
├── android/               Capacitor Android 工程（phone / pad product flavor）
├── capacitor.config.ts
└── vite.config.ts
```

### 复用桌面代码的方式

`vite.config.ts` 通过 alias 把桌面的 `src/`、`shared/` 直接引入移动端，并用替身替换桌面专属依赖：

| 桌面依赖 | 移动端替身 |
| --- | --- |
| `@/store/user` | `mobile/src/shims/store-user.ts` |
| `@/store/token` | `mobile/src/shims/store-token.ts` |
| `@/store/settings` | `mobile/src/shims/store-settings.ts` |
| `@heroui/react` | `mobile/src/shims/heroui.ts` |
| `electron-log/renderer` | `mobile/src/lib/logger.ts` |
| `@/common/utils/geetest` | `mobile/src/lib/geetest.ts`（单实例验证） |

### 网络层

- **浏览器预览**：Vite 代理 `/__bili/api|passport|www|search|member`，转发时去掉前缀并重写 Cookie 域。
- **Android**：`@capacitor/core` 的 `CapacitorHttp` 由自定义 axios adapter 调用，手动携带自建 Cookie Jar，绕开 WebView 的 CORS。
- 启动时 `bootstrapBilibiliCookies()` 会补齐 `buvid3` / `buvid4` / `bili_ticket` 等游客 Cookie。

### 音频播放（Android）

B 站音频 CDN（`upos-*.bilivideo.com`）对两件事很敏感：

1. 返回的 `Content-Type` 是 `application/octet-stream`，Chromium 的 ORB（Opaque Response Blocking）拒绝把它交给 `<audio>`，WebView 里会看到 `net::ERR_BLOCKED_BY_ORB`；
2. 直接拒绝 WebView（UA 含 `wv`）和 okhttp 的请求，返回 403；同时要求带 `Range` 的媒体请求。

因此原生端起了一个**仅监听 `127.0.0.1` 的本地 HTTP 中继**（`BiliStreamServer.java`，端口通过 `BiliStreamPlugin` 告诉前端）：`<audio>` 播放 `http://127.0.0.1:<port>/m/<base64url(CDN 地址)>`，中继用桌面 UA + `Referer` 请求 CDN，并把 `Range` 原样转发，边下边播，因此点按后约 0.1–0.7 秒即可出声，拖动进度条也能正常 seek。中继只允许 `bilivideo.com/cn/net`、`akamaized.net` 的 https 地址，避免变成开放代理。

`getPlayableAudioUrl(url, { download: true })` 保留了旧的 `CapacitorHttp` 整段下载 + Blob 方案，作为中继不可用时的兜底；播放器在音源报错时会自动切到该模式重试。播放链接签名很短命，队列里不缓存已解析地址，每次播放都重新解析。

> 为了让 `http://127.0.0.1` 的音频不被混合内容拦截，`capacitor.config.ts` 的 `androidScheme` 已改为 `http`（`http://localhost` 仍属于安全上下文，`crypto.subtle` 可用），并在 `AndroidManifest.xml` 里用 `network_security_config` 只对 localhost / 127.0.0.1 放行明文。**升级到 0.2.0 时 origin 从 https 变为 http，旧的 localStorage（队列、Cookie）会重置一次。**

### 安卓交互约定

界面保留 iOS 风格的视觉，但操作逻辑按 Android 习惯实现：

| 场景 | 行为 |
| --- | --- |
| 返回键 / 返回手势 | 软键盘 → 最上层 Sheet（含确认弹窗）→ 全屏播放器 → 上一级页面；Tab 页返回首页，首页再按一次退出 |
| 再次返回首页 | 2 秒内连按两次返回退出，第一次弹出底部 Snackbar「再按一次退出」 |
| 按压反馈 | Material 状态层（12% 当前文字色叠加），不使用 iOS 的缩放动效 |
| 提示消息 | 底部 Snackbar，自动避开播放器 / Tab 栏；一次只显示一条，点按可关闭 |
| 下拉刷新 | 列表顶部真实下拉手势，超过 56px 松手触发；不再使用「点击刷新」按钮 |
| 底部 Tab / 平板侧栏 | 重复点击当前项回到页面顶部 |
| 长按歌曲 / 卡片 | 震动反馈后打开操作面板（Android 原生 Haptics） |
| 确认弹窗 | 横向「取消 / 确定」，确认按钮在右侧 |

### 状态栏与安全区

Android 上 `env(safe-area-inset-*)` 只在较新的 WebView 中有效，因此样式统一优先使用 Capacitor SystemBars 注入的 `--safe-area-inset-*`（CSS px），`env()` 只作回退。WebView 较旧、由原生层直接内缩窗口时，变量为 `0px`，不会重复留白。全屏播放器的返回按钮与「更多」按钮因此始终位于系统状态栏下方，并保持在同一水平线上。

---

## 环境要求

| 依赖 | 版本 |
| --- | --- |
| Node.js | ≥ 22.17.1 |
| JDK | 21 |
| Android SDK | Platform 36 + Build Tools 36 |
| Gradle | 由 wrapper 提供（8.14.3） |
| 图标脚本 | `rsvg-convert`、ImageMagick |

安装依赖（仓库本身使用 pnpm，推荐优先用它，`postinstall` 会下载 Electron）：

```bash
pnpm install
```

只用 npm 时，`--legacy-peer-deps` 会跳过 peer 依赖（桌面端构建所需的 `esbuild` 就在其中），请额外补装：

```bash
npm install --ignore-scripts --legacy-peer-deps
npm install esbuild@0.27.0 --no-save --no-package-lock
```

> 纯 Android 开发不需要 Electron，可用 `--ignore-scripts` 跳过其下载；但若还想跑桌面端 `npm run build`，需要补齐 `esbuild`，否则 rsbuild 加载配置时会报 `Cannot find module 'esbuild'`。

Android SDK 路径写入 `mobile/android/local.properties`（不要提交）：

```properties
sdk.dir=/home/<user>/Android/Sdk
```

或设置环境变量 `ANDROID_HOME` / `ANDROID_SDK_ROOT`。

---

## 开发预览

```bash
npm run mobile:dev
```

打开 <http://localhost:5178>：

- dev server 下窗口宽度 ≥ 720px 自动使用平板布局，否则使用手机布局；
- 也可以在「设置 → 界面布局」手动切换（窗口过窄时会提示并保持手机布局）；
- 平板布局在 ≥1100px 时显示右侧「正在播放」面板，更窄时改为底部迷你播放器；
- `?ui=phone` / `?ui=pad` 可强制预览某一种外壳；
- 固定设备尺寸预览（推荐截图/验收）：

```
http://localhost:5178/__preview.html?w=390&h=844&ui=phone
http://localhost:5178/__preview.html?w=1180&h=820&ui=pad
```

`__preview.html` 只在 dev server 中由 Vite 中间件提供，不会进入生产包。

> 开发服务器的代理仅用于浏览器预览。真机使用原生 HTTP 通道，不需要也不应该依赖该代理。

---

## 构建

```bash
npm run mobile:typecheck    # TypeScript 检查
npm run mobile:build:phone  # 产物 → mobile/dist/phone
npm run mobile:build:pad    # 产物 → mobile/dist/pad

npm run mobile:sync:phone   # build + cap sync + 把 web 产物移入 phone flavor
npm run mobile:sync:pad     # 同上，pad flavor

npm run mobile:apk:phone    # release APK（已签名，见「签名」一节）
npm run mobile:apk:pad
npm run mobile:apk:phone:debug   # debug APK，允许 chrome://inspect
npm run mobile:apk:pad:debug
```

APK 输出目录：

```
mobile/android/app/build/outputs/apk/<flavor>/<buildType>/
```

### 为什么需要 `stage-assets.mjs`

`cap sync` 只会把 web 产物写到 `android/app/src/main/assets/public`，而两个 flavor 需要各自的入口。`stage-assets.mjs` 会在同步后把该目录移动到 `android/app/src/<flavor>/assets/public`，Gradle 再按 flavor 合并 assets，因此同一个工程可以产出两个互不覆盖的应用。

### 图标与启动图

```bash
npm run mobile:icons
```

脚本会为两个 flavor 生成：

- `mipmap-*/ic_launcher*.png`、自适应图标（`mipmap-anydpi-v26`）
- `drawable*/splash.png`（竖屏/横屏各密度）

修改配色或图形请编辑 `mobile/scripts/generate-icons.sh` 顶部的渐变与音符路径。

### 包名、版本与名称

- 包名：`mobile/android/app/build.gradle` 的 `productFlavors`
- 当前版本统一为 **0.2.1**（大版本保持 0，尚未到 1）：
  - 根目录 `package.json` 与 `mobile/package.json` 的 `version` —— 界面「设置 → 关于 → 版本」读取后者
  - `mobile/android/app/build.gradle` 的 `versionName`（同号）与 `versionCode`（必须递增，当前 `12001`）
- 每发一版都要同时改这三处；小修 +0.0.1（versionCode +1），功能更新 +0.1.0（versionCode +100）
- 应用名：`mobile/android/app/src/<flavor>/res/values/strings.xml`

---

## 签名

发布包由 `mobile/android/keystore/biu-release.jks` 签名，口令存放在
`mobile/android/keystore.properties`（权限 600，且两者都在 `.gitignore` 中，不会进入仓库）：

```properties
storeFile=keystore/biu-release.jks
storePassword=******
keyAlias=biu
keyPassword=******
```

`mobile/android/app/build.gradle` 一旦检测到该文件，就会给 `release` 构建注入
`signingConfig`，所以打包命令直接产出**已签名**的 APK：

```bash
npm run mobile:apk:phone   # → mobile/android/app/build/outputs/apk/phone/release/app-phone-release.apk
npm run mobile:apk:pad     # → mobile/android/app/build/outputs/apk/pad/release/app-pad-release.apk
```

签名方案为 **APK Signature Scheme v2 + v3**（minSdk 24 起所有设备都校验 v2，
v1 已无必要；v3 便于将来轮换密钥），APK 已 zipalign，可直接安装或上架。

校验签名：

```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --verbose --print-certs \
  mobile/android/app/build/outputs/apk/phone/release/app-phone-release.apk
```

证书 SHA-256 指纹：`94:3E:25:EE:70:36:4E:74:5E:6F:EC:41:30:CC:E6:A4:5C:33:F1:52:25:2F:00:AA:1E:8A:6D:F9:09:52:03:4C`，
有效期至 2056-10-23。

### 换成自己的密钥

```bash
cd mobile/android
keytool -genkeypair -v -keystore keystore/biu-release.jks -alias biu \
  -keyalg RSA -keysize 4096 -validity 10950
```

然后同步更新 `keystore.properties` 里的 `storePassword` / `keyPassword` 即可。也能用
Android Studio 的 **Build → Generate Signed App Bundle / APK** 向导，选中同一个 keystore，
产物与命令行一致。

> 密钥丢失后无法再对已发布应用做增量更新（同包名、不同签名只能卸载重装）。
> 请把 `keystore.properties` 与 `biu-release.jks` 备份到安全位置。

---

## 已知限制

- 数据与音频均来自哔哩哔哩公开接口，版权归哔哩哔哩及原 UP 主所有，仅供学习与个人使用。
- 部分接口会触发极验验证码（如搜索风控）。移动端已限制为**单实例**验证面板，避免多个验证层叠加。
- 无损 / 杜比音轨需要大会员；不可用时会自动降级。
- 边下边播已消除首次播放的整段下载等待；中继不可用时会退回整段下载，此时网络慢的设备会有几秒缓冲。
- 首次启动需要联网获取游客 Cookie；完全离线时仅能浏览已缓存内容。
- 登录信息、播放记录、搜索历史只保存在本机（`localStorage` + 原生 Cookie Jar）。

---

## 常见问题

**`cap sync` 后手机端首页空白？**
确认执行的是 `mobile:sync:*` 而不是单独 `cap sync`，并且 `android/app/src/<flavor>/assets/public/index.html` 存在。

**Gradle 报找不到 SDK？**
检查 `ANDROID_HOME` 与 `mobile/android/local.properties`，并确认已安装 Platform 36。

**搜索一直提示验证？**
B 站对同一出口 IP 有风控。换网络、登录账号或稍后重试；应用本身不会重复弹出多个验证层。

**平板布局在窄窗口下变成手机布局？**
这是预期行为：平板外壳需要至少 720px 宽度。旋转设备或展开分屏即可恢复。
