# 09 Framebuffer 与后处理

## 学习目标

- 理解 framebuffer 是“可替换的渲染目标”。
- 把场景 pass 和后处理 pass 拆成两个 program。
- 用离屏纹理作为下一次 draw call 的输入。

## 架构视角

多 pass 渲染像后端 pipeline：每个阶段有输入、输出和契约。Framebuffer 让你把复杂效果拆成可测试边界，例如阴影、辉光、屏幕空间效果和截图导出。

## 练习

- 关闭后处理，直接显示离屏纹理。
- 在第二个 fragment shader 中增加灰度、反色或扫描线。
- 改成低分辨率 framebuffer，观察像素化效果。
