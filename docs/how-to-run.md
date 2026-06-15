# 运行方式

本仓库的课程 demo 不依赖构建工具，每一课都可以独立运行：

1. 进入任意课程目录，例如 `lessons/01-canvas-context/`。
2. 启动一个静态服务器：`python3 -m http.server 5173`。
3. 打开 `http://localhost:5173/index.html`。

也可以直接用浏览器打开 `index.html`。推荐使用本地静态服务器，是为了后续纹理、模型、shader 文件等资源请求更接近真实工程。

## 验证命令

```bash
npm run lint
npm run test
npm run typecheck
```

当前验证不引入第三方依赖：

- `lint` / `typecheck` 使用 Node.js 的 `--check` 语法检查所有 JavaScript / MJS 文件。
- `test` 检查每课是否包含 `README.md`、`index.html`、`src/main.js`，并确认 HTML/JS 的基本 WebGL 入口存在。
