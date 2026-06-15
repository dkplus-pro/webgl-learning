# 10 小型场景架构

## 学习目标

- 把前面课程中的 shader、buffer、attribute、uniform、矩阵和状态管理组合起来。
- 使用深度测试绘制一个 3D 立方体。
- 理解小型渲染器的职责拆分：资源创建、状态绑定、帧渲染。

## 架构视角

真实 WebGL 项目不应该把所有逻辑堆在一个 render 函数里。即使本课仍然保持单文件，也会按工程职责分段：

1. shader / program 创建。
2. mesh 数据与 buffer 创建。
3. matrix 工具函数。
4. 每帧只更新必要状态并发出 draw call。

这就是从“能画出来”走向“能维护”的分界线。

## 练习

- 把立方体拆成 `createCubeMesh()` 和 `drawMesh()` 两个函数。
- 新增第二个立方体，共享同一份 geometry buffer。
- 增加相机距离参数，观察透视矩阵的影响。
