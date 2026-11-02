# 上传到 GitHub 并发布 APK

本文是把本仓库公开到 GitHub、并把两个 APK 发布到 **Releases** 的完整流程。命令里的
本文按 `huts1234/biu-android` 编写；如果仓库名不同，替换成实际地址即可。

> 公开仓库前请先阅读最后一节「许可证」。本项目**禁止商用**，使用的是
> PolyForm Noncommercial 1.0.0，不是 OSI 开源许可证。

---

## 0. 先备份签名密钥

发布更新必须使用同一张证书。请先把这两个文件备份到密码管理器 / 加密硬盘：

- `mobile/android/keystore/biu-release.jks`
- `mobile/android/keystore.properties`（包含 storePassword / keyPassword）

**它们不能被提交到仓库。** 仓库的 `.gitignore` 已经排除了 `*.jks`、`*.keystore`、
`keystore.properties`、`local.properties`。

---

## 1. 在 GitHub 创建空仓库

1. 打开 <https://github.com/new>
2. Repository name 填 `biu-android`
3. 选择 **Public**
4. **不要**勾选 “Add a README file”“Add .gitignore”“Choose a license”——本地已经有这些文件，勾选会造成首次 push 冲突。
5. 点击 **Create repository**

---

## 1.5 项目内的仓库链接已指向 huts1234/biu-android

以下位置已经改成 `https://github.com/huts1234/biu-android`，如果最终仓库名不同，记得一起替换：

- `mobile/src/pages/SettingsPage.tsx`：应用内「设置 → 关于 → GitHub 项目主页」
- `package.json` 的 `homepage`、`repository.url`、`bugs.url`
- `docs/GITHUB.md` 里的命令与链接

---

## 2. 本地初始化 Git 并推送

在项目根目录（本文件上一级）执行：

```bash
git init -b main

git config user.name "huts1234"
git config user.email "hutianshuo558@foxmail.com"

# 确认没有把密钥加进来（应输出为空）
git add -A
git status --short | grep -Ei '\.jks|keystore\.properties|local\.properties' || true

./scripts/check-public-repo.sh

git commit -m "Biu for Android 0.2.1: initial public source"
git remote add origin https://github.com/huts1234/biu-android.git
git branch -M main
git push -u origin main
```

如果 GitHub 要求登录，推荐使用 **Personal Access Token** 或 `gh auth login`，不要使用账号密码。

> 首次提交会包含桌面端 Biu 源码与 Android 工程，约 15–20 MB（`node_modules`、`dist`、
> Gradle 构建产物都被忽略）。如果 push 被拒绝，检查是否误加了 `node_modules/` 或
> `mobile/android/app/build/`。

---

## 3. 检查仓库里没有敏感信息

在 GitHub 网页上快速确认：

- 仓库根目录没有 `keystore.properties`
- `mobile/android/` 下没有 `keystore/` 或 `*.jks`
- 没有 `local.properties`

本地也可以用：

```bash
git ls-files | grep -Ei '\.jks|\.keystore|keystore\.properties|local\.properties'
# 没有输出 = 安全
```

---

## 4. 配置 GitHub Actions 签名 Secrets

自动发版工作流需要 4 个 Secret。打开仓库：

**Settings → Secrets and variables → Actions → New repository secret**

| Secret 名称 | 值 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 mobile/android/keystore/biu-release.jks` 的输出 |
| `ANDROID_KEYSTORE_PASSWORD` | `keystore.properties` 里的 `storePassword` |
| `ANDROID_KEY_ALIAS` | `keystore.properties` 里的 `keyAlias` |
| `ANDROID_KEY_PASSWORD` | `keystore.properties` 里的 `keyPassword` |

生成 Base64（Linux）：

```bash
base64 -w0 mobile/android/keystore/biu-release.jks
```

macOS：

```bash
base64 -i mobile/android/keystore/biu-release.jks | tr -d '\n'
```

Windows PowerShell：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("mobile/android/keystore/biu-release.jks"))
```

> Secret 一旦保存就无法再查看，只能覆盖。不要把 keystore、口令或 Base64 贴到 Issue、PR、聊天记录里。

然后确认 Actions 有写权限：

**Settings → Actions → General → Workflow permissions → Read and write permissions → Save**

---

## 5. 发布 APK

### 方式 A：推送 tag，自动构建并发布（推荐）

```bash
git tag v0.2.1
git push origin v0.2.1
```

`.github/workflows/android-release.yml` 会：

1. 校验 tag 与 `mobile/package.json` 的版本一致；
2. 用 Secrets 还原 keystore；
3. 构建 `phone` / `pad` 两个 release APK 并校验签名；
4. 创建 GitHub Release，附上：
   - `Biu-for-Phone-0.2.1.apk`
   - `Biu-for-Pad-0.2.1.apk`
   - `SHA256SUMS.txt`

可以在仓库的 **Actions** 页面查看进度，完成后在 **Releases** 页面看到结果。

### 方式 B：本地构建后手动发布

```bash
# 需要先安装 GitHub CLI 并登录：gh auth login
./scripts/publish-android-release.sh
```

脚本会构建两个 APK、生成校验值，并在 release 不存在时自动创建。

### 方式 C：纯网页操作

如果不想用命令行：

1. 本地执行 `pnpm mobile:apk:phone` 与 `pnpm mobile:apk:pad`
2. 打开仓库 **Releases → Draft a new release**
3. 选择或新建 tag（例如 `v0.2.1`）
4. 上传两个 APK（可改名成 `Biu-for-Phone-0.2.1.apk`、`Biu-for-Pad-0.2.1.apk`）
5. 点击 **Publish release**

这种方式**不会**触发自动构建；网页上传的包就是本地构建的那个。

---

## 6. 发布新版本

每次发版按顺序做：

1. 修改版本号（四处必须一致）：
   - 根目录 `package.json` → `version`
   - `mobile/package.json` → `version`
   - `mobile/android/app/build.gradle` → `versionName`
   - `mobile/android/app/build.gradle` → `versionCode`（必须递增）
2. 更新 README / `mobile/README.md` 中的当前版本
3. 提交并推送：
   ```bash
   git add -A
   git commit -m "release: 0.2.2"
   git push
   ```
4. 打 tag 并推送：
   ```bash
   git tag v0.2.2
   git push origin v0.2.2
   ```
5. Actions 完成后检查 Release 里的 APK 是否能安装、版本号是否正确。

版本规则：小修 `+0.0.1`（`versionCode` +1），功能更新 `+0.1.0`（`versionCode` +100）。
`versionCode` 只能增大，否则 Android 不允许覆盖安装。

---

## 7. 常见问题

**Actions 报 “Tag does not match mobile/package.json version”**
tag 与 `mobile/package.json` 的版本不一致。删掉本地和远端的错误 tag 后重新打：

```bash
git tag -d v0.2.1
git push origin :refs/tags/v0.2.1
```

**Release 里的 APK 是未签名的**
没有配置 `ANDROID_KEYSTORE_BASE64` 等 Secrets，或 Base64 内容不完整。重新检查第 4 节。

**新版本无法覆盖安装**
两次构建用了不同证书，或 `versionCode` 没有增大。必须使用同一张 keystore 并递增 `versionCode`。

**不想公开 Actions 构建日志里的签名信息**
工作流只从 Secrets 读取，不会打印内容。请勿在脚本里 `echo` 口令。

**以后想改成允许商用**
需要同时获得上游作者与所有贡献者的授权，并替换 LICENSE；不能单方面把
PolyForm Noncommercial 改成 MIT/Apache。见下一节。

---

## 8. 许可证：为什么选 PolyForm Noncommercial 1.0.0

你的目标是「源码公开，但任何人不得商用」。严格来说，这**不是 OSI 定义的开源**：

- OSI 开源许可证（MIT、Apache-2.0、GPL、AGPL…）都允许商业使用；
- 禁止商用的许可证属于 **source-available（源码公开）**。

对本项目来说，正确选择是继续使用上游 Biu 已经采用的
**PolyForm Noncommercial License 1.0.0**（仓库根目录 `LICENSE`）：

- 允许个人学习、研究、实验、私人娱乐、业余项目；
- 允许修改和分发，但必须保留许可证与 `Required Notice`；
- 禁止任何商业用途；
- 你可以在 README 里提供「商业授权请联系…」，由你单独授予商业许可。

因为本项目是 Biu 的衍生作品，上游已经是 PolyForm Noncommercial，**本仓库必须继续沿用该许可证**，
不能改成 MIT / Apache-2.0 等允许商用的协议。若要双许可（非商用免费 + 商用付费），
需要你作为版权方之一，并取得上游权利人的同意。

如果将来你希望项目成为 OSI 开源项目，就必须接受「他人可以商用」；在这种目标下，
更合适的是 **AGPL-3.0**（强 copyleft，衍生作品也必须开源，但仍允许商用），而不是禁止商用的协议。
