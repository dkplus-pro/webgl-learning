# 第 7-8 课运行与验证说明

本说明覆盖 worker-3 交付的两课：

- `lessons/12-webgl2-fbo-pipeline/`：FBO 与后处理管线。
- `lessons/11-architecture-postprocessing/`：架构化封装与多 Pass 后处理。

两课都不依赖 npm 包，可以作为静态页面独立运行。

## 本地运行

在仓库根目录启动静态服务：

```bash
python3 -m http.server 8080
```

分别访问：

```text
http://localhost:8080/lessons/12-webgl2-fbo-pipeline/
http://localhost:8080/lessons/11-architecture-postprocessing/
```

> 不建议直接双击 HTML 文件，因为浏览器在 `file://` 协议下的资源、调试和未来 shader 拆分行为会和 HTTP 服务不同。

## 人工验收清单

### 第 12 课

- 页面标题为“第 12 课：FBO 与后处理”。
- 信息面板显示 `Scene -> FBO -> PostProcess -> Screen`。
- 画布中有旋转三角形，并且最终画面带灰度、暗角、像素化效果。
- 调整浏览器窗口大小后，状态面板中的 FBO 分辨率会变化，画面不应黑屏。

### 第 11 课

- 页面标题为“第 11 课：架构化多 Pass 后处理”。
- 信息面板显示 `SceneTarget -> BlurTarget -> Screen`。
- 画布中有多个动态彩色图形，并带有轻微 bloom、扫描线和色差。
- 调整浏览器窗口大小后，pipeline 继续渲染，画面不应黑屏。

## 命令行验证

当前仓库没有 npm 工程和测试框架，因此使用以下静态验证作为基础质量门禁：

```bash
node --check lessons/12-webgl2-fbo-pipeline/main.js
node --check lessons/11-architecture-postprocessing/main.js
python3 - <<'PY'
from pathlib import Path
required = [
    'lessons/12-webgl2-fbo-pipeline/README.md',
    'lessons/12-webgl2-fbo-pipeline/index.html',
    'lessons/12-webgl2-fbo-pipeline/main.js',
    'lessons/11-architecture-postprocessing/README.md',
    'lessons/11-architecture-postprocessing/index.html',
    'lessons/11-architecture-postprocessing/main.js',
]
for item in required:
    path = Path(item)
    assert path.exists(), f'missing {item}'
    assert path.stat().st_size > 300, f'too small {item}'
print('required lesson files exist')
PY
```

## 集成建议

- 如果其他 worker 已经创建课程总目录或根索引页，集成时只需要链接这两个目录即可。
- 若要统一课程导航，建议由 leader 在集成分支修改根 `README.md` 或课程总索引，避免多个 worker 同时改共享文件。
- 这两课使用原生 WebGL2 与普通 `<script>`，可直接迁移到 Vite / TypeScript 项目；迁移时优先拆分 `Program`、`Geometry`、`RenderTarget` 和 pass 类。
