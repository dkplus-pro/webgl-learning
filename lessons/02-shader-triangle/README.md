# 02 Shader 与三角形

## 学习目标

- 理解 vertex shader 与 fragment shader 的分工。
- 编译 shader、链接 program，并把顶点数据传给 GPU。
- 用 `drawArrays` 触发一次最小绘制。

## 架构类比

Shader program 类似一个强类型渲染组件：

- attribute 是“逐顶点 props”。
- fragment shader 是“每个像素的渲染函数”。
- buffer 是 CPU 到 GPU 的数据包。

## 运行

```bash
cd lessons/02-shader-triangle
python3 -m http.server 5173
```

## 练习

- 修改三个顶点坐标，观察裁剪空间 `[-1, 1]`。
- 修改 fragment shader 颜色。
- 故意拼错 shader 变量名，观察控制台错误。
