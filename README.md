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
node scripts/test-parent.mjs
node scripts/test-grading.mjs
node scripts/build.mjs
node scripts/validate-artifact.mjs
```

`dist/` 是生成产物，不直接编辑。`node scripts/preview.mjs` 启动仅在内存模拟 R2 的本地预览。

`scripts/test-ai-live.mjs` 是显式调用真实 API 的可选测试，需要环境中已有密钥以及 `/tmp/paperly-ai-{original,answered,ink}.png` 三张人工生成的数学练习测试图。仅对本地测试使用 Python HTTPS 传输以兼容本机网络；线上 Worker 使用标准 fetch。
