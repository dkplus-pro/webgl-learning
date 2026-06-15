# 01 Canvas 与 WebGL 上下文

## 学习目标

- 理解 `canvas` 与 `WebGLRenderingContext` 的职责边界。
- 掌握设备像素比（DPR）对画布尺寸和 `viewport` 的影响。
- 认识 WebGL 的第一个状态：`clearColor` + `clear`。

## 前端架构师视角

WebGL 不是“声明式 UI”，而是一个显式状态机。你设置状态，再发出绘制命令。第一课只做清屏，是为了把“状态”和“命令”分开：

1. `canvas` 决定最终呈现在哪里。
2. `gl.viewport` 决定 GPU 输出覆盖哪块像素区域。
3. `gl.clearColor` 设置状态。
4. `gl.clear(gl.COLOR_BUFFER_BIT)` 执行命令。

## 运行

```bash
cd lessons/01-canvas-context
python3 -m http.server 5173
```

打开 `http://localhost:5173/index.html`。

## 练习

- 修改 `clearColor` 的 RGB 值，观察背景变化。
- 调整浏览器窗口尺寸，确认画面仍然清晰。
- 注释掉 `gl.viewport(...)`，观察高 DPR 屏幕上的显示差异。
