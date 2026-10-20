# 纸上 · 试卷练习台

公开网站，答卷保存在浏览器 IndexedDB。家长密码和批改记录存储于 Sites R2，服务器验证家长权限。不同浏览器独立设置密码，没有跨设备家庭帐号或密码找回。

- 孩子完成当前页后保存不可随后续笔迹变化的提交快照。
- 家长解锁后手动批改，或明确同意发送当前页原卷、完整答卷与笔迹层给 OpenAI 后进行 AI 批改。
- AI 结果不会自动发布给孩子。家长可以修订，再仅发布订正位置；答案、讲解与识别出的学生答案保持私有。
- 识别置信度不足时标为待确认。AI 批改需由家长复核，当前提示词针对小学数学客观题和计算题。
- 离开页面或五分钟到期锁定。服务器也会复查批改请求返回时的会话权限。
- 每浏览器每日最多10次、全站每日最多100次 AI 请求。R2 计数用于常规使用限额，不替代生产级防滥用网关。

## 配置与构建

运行时密钥 `OPENAI_API_KEY` 仅通过 Sites 环境配置保存，禁止写入源码、构建产物或客户端。`OPENAI_MODEL` 当前为 `gpt-5.4-mini`。本地预览不自动加载线上密钥。

修改 `web/` 前端和 `worker/` 服务端，运行：

```
node --check web/parent.js
node scripts/test-gestures.cjs
node scripts/test-parent.mjs
node scripts/test-grading.mjs
node scripts/build.mjs
node scripts/validate-artifact.mjs
```

`dist/` 是生成产物，不直接编辑。`node scripts/preview.mjs` 启动仅在内存模拟 R2 的本地预览。

`scripts/test-ai-live.mjs` 是显式调用真实 API 的可选测试，需要环境中已有密钥以及 `/tmp/paperly-ai-{original,answered,ink}.png` 三张人工生成的数学练习测试图。仅对本地测试使用 Python HTTPS 传输以兼容本机网络；线上 Worker 使用标准 fetch。

## 安卓平板离线版

`android/` 为原生 Android WebView 应用，界面和 PDF/图片处理资源全部打包到 APK。应用不申请联网、相机、麦克风或广泛存储权限，通过系统文件选择器导入 PDF/图片，通过系统保存窗口导出答卷。

- 支持导入多页 PDF 与图片、书写/文字/图形、橡皮、撤销重做、自动保存、PNG/PDF 导出。
- 家长密码和批改记录保存在应用私有区域，原生代码校验密码；进入后台立即锁定，连续输错五次锁定五分钟。
- 离线版可以手动批改并仅向孩子展示订正位置。AI 自动批改尚未接入国内可直连服务，离线版不调用原 Sites 域名或 OpenAI。
- 安卓版不会包含 OpenAI 密钥，也不会把网站的服务器代码打包到设备。
- 桌面、启动、应用详情和应用内标识使用用户提供的图。通知大图使用原图，小图提供同主题透明单色资源；本版本不主动发送通知。
- Android 7.0 及以上，依赖系统 WebView 支持现代网页语法。小度学习平板可能需要家长允许安装第三方 APK；尚未在该型号真机验证。
- 网页与 App 的作业、家长密码独立，不会自动跨设备同步。卸载 App 会清除本机作业，请先导出需要保留的答卷。

### 本地打包

需 Node.js、JDK 17、Android SDK 35。在 `android/local.properties` 设置 `sdk.dir`，此文件已排除 Git。

```
node scripts/create-android-signing.mjs
cd android
./gradlew assembleRelease lintRelease
```

构建时自动从 `web/` 同步离线资源。签名密钥在 `android/.signing/`，密码配置在 `android/keystore.properties`，均仅保留在本机并排除 Git。今后覆盖更新必须保留并使用同一签名密钥，勿上传到仓库。

图标源图：`android/branding/app-logo.png`。已提交各密度图标，需要重新生成时使用安装了 Pillow 的 Python 运行 `scripts/prepare-android-icons.py`。

上传前可运行 `node scripts/check-secrets.mjs --history`，检查源码和全部历史提交；该检查不会输出密钥值。

## v1.1.0 触控与手机布局

支持单指书写、双指拖动试卷、双指捏合缩放（50%–800%），缩放围绕两指中心。第二根手指加入会取消未完成笔迹，手势结束后需重新落笔，避免误写。手机提供页码选择与可横向滑动的工具栏。

改动前的回滚标签为 `v1.0.0`（`b231be4`），已同步 GitHub。可从该标签恢复源码；安卓覆盖降级需另行处理版本号，勿通过卸载丢失作业。
