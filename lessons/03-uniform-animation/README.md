# 03 Uniform 与动画

## 学习目标

- 理解 uniform 是一次 draw call 内保持不变的全局输入。
- 用 `requestAnimationFrame` 驱动渲染循环。
- 把时间、分辨率等应用状态映射到 shader。

## 架构视角

当 UI 状态进入 GPU，最好通过明确的 uniform contract 传入，而不是把业务逻辑散落在 shader 字符串里。本课的 `u_time` 和 `u_resolution` 就是最小 contract。

## 练习

- 把颜色波动速度变快。
- 用鼠标位置新增 `u_mouse`。
- 暂停 `requestAnimationFrame`，观察画面状态是否可预测。
