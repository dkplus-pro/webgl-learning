# 04 Buffer 与 Attribute

## 学习目标

- 区分 buffer 中的原始字节与 attribute 的解释方式。
- 使用 stride / offset 描述交错顶点数据。
- 使用 index buffer 复用顶点。

## 架构视角

顶点 buffer 是数据协议，attribute pointer 是协议解码器。大型项目中，明确“顶点布局 contract”能避免 shader、buffer、几何生成器之间互相猜测。

## 练习

- 调整每个顶点的颜色。
- 把矩形拆成两个不共享顶点的三角形。
- 新增一个 alpha attribute 并在 fragment shader 中使用。
