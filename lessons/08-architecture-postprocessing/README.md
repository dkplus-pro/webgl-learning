# 第 8 课：架构化封装与多 Pass 后处理

第 7 课已经完成“场景 -> FBO -> 屏幕”的最小闭环。本课把这个闭环整理成适合前端团队维护的架构：Program、Geometry、RenderTarget、Pass 和 Pipeline。重点不是追求框架复杂度，而是让渲染步骤有清晰边界，便于调试、替换和扩展。

## 学习目标

- 把 WebGL 原始对象封装成小而稳定的工程抽象。
- 理解 ping-pong render target：多个后处理 pass 之间交换读写纹理。
- 实现一个独立 demo：场景 pass -> 横向模糊 pass -> 合成 pass -> 屏幕。
- 从架构师视角评估 WebGL 项目的模块边界、生命周期、resize 和调试能力。

## 设计分层

```text
App
├── Renderer：拥有 gl、尺寸、帧循环
├── Program：编译/链接 shader，集中设置 uniform
├── Geometry：VAO + 顶点数据
├── RenderTarget：FBO + color texture + depth buffer
└── Pass：声明输入、输出和 draw 逻辑
```

这些类都保持在 `main.js` 内，方便独立运行和阅读。真实项目中可以拆分为包：

- `core/gl/Program.ts`
- `core/gl/Geometry.ts`
- `core/gl/RenderTarget.ts`
- `render-pipeline/passes/*`
- `debug/FrameGraphPanel.ts`

## Demo 管线

1. **ScenePass**：渲染多个运动中的图形到 `sceneTarget`。
2. **BlurPass**：读取 `sceneTarget.texture`，沿 X 方向做 9-tap 模糊，写入 `blurTarget`。
3. **CompositePass**：读取原图和模糊图，做轻量 bloom、扫描线、色差，输出到屏幕。

## 为什么这对前端架构师重要

- Pass 是“渲染功能”的最小组合单位，类似前端中的 hook / middleware。
- RenderTarget 管理资源生命周期，避免 resize、delete、attachment 状态泄漏到业务层。
- Pipeline 让复杂效果变成可观察的 DAG，便于性能分析和团队协作。

## 运行方式

在仓库根目录执行：

```bash
python3 -m http.server 8080
```

然后打开：

```text
http://localhost:8080/lessons/08-architecture-postprocessing/
```

## 你应该看到

- 动态彩色图形先被渲染到离屏 target。
- 画面带有轻微 bloom、扫描线和色差。
- 信息面板展示当前 pipeline：`SceneTarget -> BlurTarget -> Screen`。

## 延伸练习

1. 增加纵向模糊 pass，形成完整 separable blur。
2. 把每个 pass 的耗时用 `EXT_disjoint_timer_query_webgl2` 记录到面板。
3. 把 shader source 拆到独立文件，并设计热更新策略。
