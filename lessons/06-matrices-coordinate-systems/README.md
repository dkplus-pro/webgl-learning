# 第 6 课：矩阵与坐标系

本课把前三课的“直接给裁剪空间坐标”升级为工程里更常见的矩阵管线：模型坐标经过 `model -> view -> projection` 变换，最终进入 WebGL 的裁剪空间。前端架构师可以把它类比为一条显式的数据转换 pipeline：每一步都只负责一种语义。

## 学习目标

- 区分模型坐标、世界坐标、相机/观察坐标、裁剪坐标和 NDC。
- 理解矩阵乘法顺序为什么影响最终姿态。
- 在 shader 中使用 `uniform mat4 u_matrix` 承载 MVP 矩阵。
- 通过深度测试观察 3D 物体前后遮挡关系。

## 核心概念

### 1. WebGL 只认识裁剪空间

顶点着色器最终必须写入 `gl_Position`。如果应用侧直接给 `[-1, 1]` 范围内的坐标，demo 很快就会失去可扩展性；真实项目通常先在业务友好的局部坐标里建模，再用矩阵统一变换。

### 2. MVP 是三类职责的组合

- `model`：物体自己的平移、旋转、缩放。
- `view`：相机站在哪里、看向哪里。
- `projection`：透视投影或正交投影如何把 3D 压到屏幕。

本课 demo 在 JavaScript 中计算 `projection * view * model`，再传给 shader。

### 3. 深度测试是 3D 可见性的基础

启用 `gl.enable(gl.DEPTH_TEST)` 后，WebGL 会为每个片元比较深度值，离相机更近的片元覆盖更远的片元。

## 运行方式

在仓库根目录启动静态服务：

```bash
python3 -m http.server 8080
```

打开：

```text
http://localhost:8080/lessons/06-matrices-coordinate-systems/
```

## 你应该看到

- 一个彩色立方体持续旋转。
- 左侧面板显示当前矩阵管线和旋转角度。
- 改动源码中的 `cameraPosition` 或 `fieldOfView` 后，坐标系/透视关系会明显变化。

## 架构提示

把矩阵工具保持为纯函数，渲染层只消费最终矩阵。这样后续可以平滑替换为 `gl-matrix`、Three.js 的数学模块，或自研 ECS/SceneGraph。

## 延伸练习

1. 将透视投影替换为正交投影，观察远近大小是否还变化。
2. 给立方体增加一个父节点矩阵，模拟场景图层级变换。
3. 把 `model`、`view`、`projection` 分别传入 shader，调试每个阶段的坐标。
