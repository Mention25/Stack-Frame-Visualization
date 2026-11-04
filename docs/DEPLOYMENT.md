# GitHub Pages 部署准备

状态：已在本地准备，未创建个人远程仓库、未推送、未启用 Pages、未公开上线。
许可确认是用户明确要求的部署前提，目前尚未满足。

## 目标

- GitHub 账号：`Mention25`（已核验登录身份及仓库操作凭据）。
- 计划仓库：`Mention25/Stack-Frame-Visualization`，优先 fork 上游以保留作者及提交历史。
- 计划网址：`https://mention25.github.io/Stack-Frame-Visualization/`。这只是预期地址，目前未部署，不能作为可访问的交付链接。
- 原项目：<https://github.com/NickZhuxy/Stack-Frame-Visualization>。
- 基准提交：`8914d54ba0dd263ded7d75d31a2e607e93ea80b1`。

## 已准备的变更

- Vite `base` 指向 `/Stack-Frame-Visualization/`。
- GitHub Actions 工作流安装依赖、检查 TypeScript、构建并发布 `dist`。
- 工作流仅支持手动触发，推送不会自动发布；许可明确后再启用并执行。
- 页面顶部直接展示原作者、项目来源、NYU 教学材料来源和通用演示说明。
- `public/attribution.html` 随构建发布，记录来源及许可状态。
- 保留原始教学轨迹，没有加入任何 ICS 实验二进制或相关答案。
- 移除 Google Fonts 请求，使用本机等宽字体，演示运行不依赖外部字体站点。
- 保留上游 README 和 package.json 的许可声明，不自行重授许可。

## 许可待办

2026-11-04 核验：README 的 License 节写 MIT，package.json 写 ISC，没有独立 LICENSE 文件，也未发现公开 Issue 中的澄清。
README 首次添加于 `40c5845`，package.json 的 ISC 自项目脚手架提交 `b43e293` 起存在；历史先后本身不能证明作者已明确解决不一致。

1. 请原作者确认适用许可、版权署名，以及是否同意保留署名的非商业教学网页部署；确认教学示例可随项目再发布。
2. 将确认链接/文本记录在此处；如上游补齐 LICENSE，优先同步作者提供的文件。
3. 按确认结果补齐上游许可文本，并更新 README、package.json、package-lock.json 及来源页面；不要凭猜测修改。React、React DOM 与 Scheduler 的原始许可已保存在 `public/third-party-notices.txt`。
4. 将来源页面的“尚未公开部署”改为实际确认信息后，再进行下面的发布步骤。

待发送给原作者的文字见 [UPSTREAM-LICENSE-QUESTION.md](UPSTREAM-LICENSE-QUESTION.md)。目前没有替用户发送。

## 本地预览

```sh
npm ci
npx tsc --noEmit
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

打开 `http://127.0.0.1:4173/Stack-Frame-Visualization/`。推荐桌面浏览器；窄屏可滚动查看四个面板。
应通过 HTTP 预览构建结果，不直接双击 dist/index.html。

## 许可明确后的发布

1. 在 Mention25 账号下 fork 上游，保留仓库名 `Stack-Frame-Visualization`。
2. 将本地原 remote `origin` 改名为 `upstream`，添加个人 fork 为 `origin`。
3. 将准备分支及已确认的许可材料合入个人 fork 的主分支并推送。
4. 仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。
5. 在 Actions 中启用工作流，手动运行 `Deploy GitHub Pages`。
6. 确认 build、deploy 均成功，并实际访问工作流返回的网址；检查资源加载、步进、播放、回退与来源页面。
7. 在这里记录实际网址、部署 commit 和成功工作流链接。

参考：[Vite 官方 GitHub Pages 指南](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

本阶段不包含给助教回复、提交课程文档 PR 或联系原作者。

## 本地验证（2026-11-04）

- `npm ci`、`npx tsc --noEmit`、`npm run build` 与 `git diff --check` 通过。
- 在 Edge 无头浏览器中，使用生产构建的 `/Stack-Frame-Visualization/` 子路径验证：29 个步骤、前进/后退/回到开头、方向键、播放/暂停、阶段跳转及来源页面均通过；没有浏览器异常、资源加载错误或外部网络请求。
- 浏览器验证记录：`.local/verification.json`；桌面预览截图：`.local/preview.png`。这些本机检查文件不提交至远程仓库。
- `src/traces/`、`package.json`、`package-lock.json` 与上游一致；此次未改动教学轨迹或依赖版本。
- `npm audit --omit=dev` 报告运行时依赖 0 个漏洞；完整依赖安装报告 9 个开发依赖漏洞，发布前应评估构建工具升级。本次未自动升级上游依赖。
- 本次验证覆盖页面交互和部署准备，不代表完成对示意轨迹的真实二进制验证，也不代表线上部署已通过。
