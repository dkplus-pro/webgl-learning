# WebGL 从 0 到中级：给 7 年前端架构师的课程大纲

目标读者已经熟悉浏览器、模块化、状态管理、性能优化和工程化，但没有系统图形学经验。本课程用“前端架构师能复用的工程语言”解释 WebGL：数据流、状态机、渲染管线、资源生命周期、可调试性和性能边界。

## 学习路径

| 课次 | 主题 | 目标产物 | 架构视角 |
| --- | --- | --- | --- |
| 01 | Canvas 与 WebGL 上下文 | 清屏 demo | WebGL 是浏览器里的显式状态机 |
| 02 | Shader 与三角形 | 第一个 GPU 程序 | CPU 组织数据，GPU 执行并行程序 |
| 03 | Uniform 与动画 | 基于时间的颜色动画 | 用稳定接口把应用状态传给 shader |
| 04 | Buffer 与 Attribute | 彩色矩形 | 顶点数据布局类似前端组件 props contract |
| 05 | 2D 坐标与矩阵 | 2D 平移/旋转/缩放 | 变换矩阵是可组合的渲染状态 |
| 06 | 3D 矩阵与坐标系 | 旋转立方体与 MVP | model/view/projection 是显式数据转换 pipeline |
| 07 | 纹理与采样器 | 程序化棋盘格贴图 | GPU 资源上传、绑定、采样与生命周期 |
| 08 | 交互、动画与渲染循环 | input -> state -> update -> render | 输入系统和渲染循环解耦 |
| 09 | Framebuffer 与后处理 | 离屏渲染 + 屏幕空间 pass | 多 pass 渲染管线与可测试边界 |
| 10 | 小型场景架构 | 组合 shader/buffer/uniform/matrix 的小场景 | 从“能画出来”走向“能维护” |
| 11 | 架构化封装与多 Pass 后处理 | Program / RenderTarget / Pass 小型管线 | 把 WebGL 状态机组织成可维护模块 |
| 12 | WebGL2 FBO 管线进阶 | WebGL2 FBO + 深度附件 + 像素化/灰度/暗角 | 资源生命周期、resize、viewport 与渲染目标契约 |

## 每课结构

每个 `lessons/<nn>-<topic>/` 都包含：

- `README.md`：中文讲义、关键概念、练习与排错提示。
- `index.html`：独立页面，可直接由静态服务器打开。
- `src/main.js`：带注释的 WebGL 源码，不依赖打包器。

## 建议节奏

- 每课先读讲义，再运行 demo。
- 修改一个参数观察画面变化，例如颜色、顶点、矩阵、纹理尺寸或 framebuffer 分辨率。
- 课后练习优先做“可视化验证”，不要只读代码。
