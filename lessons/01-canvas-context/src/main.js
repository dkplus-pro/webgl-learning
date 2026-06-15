(function () {
  'use strict';

  const canvas = document.querySelector('#glCanvas');
  const gl = canvas.getContext('webgl');

  if (!gl) {
    document.body.insertAdjacentHTML('beforeend', '<p>当前浏览器不支持 WebGL。</p>');
    return;
  }

  function resizeCanvasToDisplaySize() {
    // CSS 像素不等于真实设备像素。WebGL 的绘制目标应使用真实像素尺寸。
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // viewport 告诉 GPU：接下来的绘制命令写入哪块像素矩形。
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(time) {
    resizeCanvasToDisplaySize();

    // clearColor 是状态；clear 才是命令。这里用时间让状态变化更容易被观察。
    const blue = 0.35 + Math.sin(time * 0.001) * 0.08;
    gl.clearColor(0.05, 0.08, blue, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
