# 第 9 课：WebGL2 FBO 与后处理管线

本课面向已经熟悉前端工程化、组件抽象和渲染循环的工程师，目标是把 WebGL 的“直接画到屏幕”升级为“先画到纹理，再统一处理”。这一步是实现阴影、拾取、Bloom、SSR、离屏缓存和可组合渲染管线的基础。

## 学习目标

- 理解 Framebuffer Object（FBO）为什么是“渲染目标”的抽象，而不只是一个 API 对象。
- 掌握颜色纹理附件、深度附件、viewport 切换、完整性检查的基本流程。
- 通过一个可运行 demo 观察：场景先渲染到离屏纹理，再作为 fullscreen quad 的输入进行灰度、暗角、像素化后处理。
- 建立前端架构视角：FBO 是跨 pass 传递数据的边界，类似状态管理中的 store snapshot 或构建产物中的 intermediate asset。

## 核心概念

### 1. 默认帧缓冲 vs 自定义 FBO

浏览器给 canvas 提供一个默认帧缓冲。调用 `gl.bindFramebuffer(gl.FRAMEBUFFER, null)` 时，片元最终进入屏幕。创建自定义 FBO 后，片元可以先进入一张纹理：

1. 创建 `texture` 作为颜色附件。
2. 创建 `renderbuffer` 作为深度附件。
3. 创建 `framebuffer` 并挂载二者。
4. `gl.checkFramebufferStatus` 确认完整。
5. 渲染场景时绑定该 FBO。
6. 渲染后处理时解绑 FBO，把颜色纹理采样到屏幕。

### 2. viewport 是渲染目标状态

切换 FBO 时必须同步切换 `gl.viewport`。离屏纹理尺寸和 canvas CSS 尺寸可能不同；如果 viewport 不匹配，画面会被拉伸或裁剪。

### 3. 后处理是一个屏幕空间 pass

后处理 shader 通常只画两个三角形组成的全屏矩形。顶点着色器负责输出 UV，片元着色器采样上一阶段纹理并修改颜色。

## 架构提示

- 把 FBO 看成 `RenderTarget`，不要在业务逻辑里散落创建和 resize 细节。
- 每个 pass 的输入/输出要显式：`ScenePass -> Texture -> PostPass -> Screen`。
- 后处理 shader 的 uniform 可以来自 UI、时间线、调试面板或配置中心。

## 运行方式

在仓库根目录执行：

```bash
python3 -m http.server 8080
```

然后打开：

```text
http://localhost:8080/lessons/09-webgl2-fbo-pipeline/
```

## 你应该看到

- 左侧状态面板显示 FBO 尺寸和当前 pass。
- 一个旋转的彩色三角形被先画入离屏纹理。
- 屏幕最终展示经过灰度、暗角和像素化处理后的画面。

## 延伸练习

1. 把像素化强度做成滑块。
2. 新增一个“反色”后处理 pass。
3. 将离屏纹理分辨率改为 canvas 的 1/2，观察性能和画质变化。
