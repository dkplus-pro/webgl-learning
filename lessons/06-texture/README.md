# 06 纹理

## 学习目标

- 理解纹理是 GPU 上的一类资源，而不仅是图片。
- 使用 `texImage2D` 上传程序化像素数据。
- 通过 UV 坐标在 fragment shader 中采样。

## 架构视角

纹理资源有生命周期：创建、上传、设置采样参数、绑定到 texture unit、在 shader 中读取。真实项目中应把这些步骤封装成资源管理层，并处理加载失败、尺寸限制、缓存和释放。

## 练习

- 修改棋盘格尺寸。
- 改变 `TEXTURE_MIN_FILTER` 和 `TEXTURE_MAG_FILTER`。
- 在 shader 里让 UV 随时间偏移，做滚动纹理。
