# GitHub Pages 部署

本版本部署到 Mention25 的个人 GitHub Pages，使用独立通用示例，并保留原作者、项目与教学材料来源。

## 目标

- GitHub 账号：`Mention25`（已核验登录身份及仓库操作凭据）。
- 仓库：<https://github.com/Mention25/Stack-Frame-Visualization>，fork 上游以保留作者及提交历史。
- 网址：<https://mention25.github.io/Stack-Frame-Visualization/>。
- 原项目：<https://github.com/NickZhuxy/Stack-Frame-Visualization>。
- 基准提交：`8914d54ba0dd263ded7d75d31a2e607e93ea80b1`。

## 已准备的变更

- Vite `base` 指向 `/Stack-Frame-Visualization/`。
- GitHub Actions 工作流安装依赖、检查 TypeScript、构建并发布 `dist`。
- `main` 分支代码更新会触发构建和发布，亦可手动触发；仅修改 README 或 docs 不重复发布。
- 页面顶部直接展示原作者、项目来源、NYU 教学材料来源和通用演示说明。
- `public/attribution.html` 随构建发布，记录来源及许可状态。
- 保留原始教学轨迹，没有加入任何 ICS 实验二进制或相关答案。
- 移除 Google Fonts 请求，使用本机等宽字体，演示运行不依赖外部字体站点。
- 保留上游 README 和 package.json 的许可声明，不自行重授许可。

## 许可处理

2026-11-04 核验：README 的 License 节写 MIT，package.json 写 ISC，没有独立 LICENSE 文件，也未发现公开 Issue 中的澄清。
README 首次添加于 `40c5845`，package.json 的 ISC 自项目脚手架提交 `b43e293` 起存在；历史先后本身不能证明作者已明确解决不一致。

依据维护者的发布决定，使用上游已有的公开许可声明，不把额外的部署许可作为前提。两种许可均保留署名和许可声明；本版本在 `public/licenses/` 同时附载两种全文与免责声明。上游两处原始声明不变，也不将其解释为作者已明确选择双重许可。

版权署名依据上游作者和提交年份补充，此来源在 [NOTICE.md](../NOTICE.md) 与公开来源页中注明。React、React DOM 与 Scheduler 的原始许可保存在 `public/third-party-notices.txt`。未来如上游澄清，应同步更新这些记录；目前没有联系原作者或声称获得其额外授权。

## 本地预览

```sh
npm ci
npx tsc --noEmit
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

打开 `http://127.0.0.1:4173/Stack-Frame-Visualization/`。推荐桌面浏览器；窄屏可滚动查看四个面板。
应通过 HTTP 预览构建结果，不直接双击 dist/index.html。

## 发布与更新

1. 在 Mention25 账号下 fork 上游，保留仓库名 `Stack-Frame-Visualization`。
2. 将本地原 remote `origin` 改名为 `upstream`，添加个人 fork 为 `origin`。
3. 将代码及来源、许可材料合入个人 fork 的 `main` 分支并推送。
4. 仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。
5. 在 Actions 中启用 `Deploy GitHub Pages`，推送代码更新后自动执行；必要时可手动运行。
6. 确认 build、deploy 均成功，并实际访问工作流返回的网址；检查资源加载、步进、播放、回退与来源页面。
7. 在这里记录实际网址、部署 commit 和成功工作流链接。

参考：[Vite 官方 GitHub Pages 指南](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

本阶段不包含给助教回复、提交课程文档 PR 或联系原作者。

## 本地验证（2026-11-04）

- `npm ci`、`npx tsc --noEmit`、`npm run build` 与 `git diff --check` 通过。
- 在 Edge 无头浏览器中，使用生产构建的 `/Stack-Frame-Visualization/` 子路径验证：29 个步骤、前进/后退/回到开头、方向键、播放/暂停、阶段跳转及来源页面均通过；没有浏览器异常、资源加载错误或外部网络请求。
- 浏览器验证记录：`.local/verification.json`；桌面预览截图：`.local/preview.png`。这些本机检查文件不提交至远程仓库。
- `src/traces/` 与上游一致；此次未改动教学轨迹。
- 本次验证覆盖页面交互和部署准备，不代表完成对示意轨迹的真实二进制验证，也不代表线上部署已通过。
