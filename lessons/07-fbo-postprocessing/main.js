(() => {
  'use strict';

  const canvas = document.querySelector('#gl-canvas');
  const status = document.querySelector('#status');
  const gl = canvas.getContext('webgl2', { antialias: false });

  if (!gl) {
    status.textContent = '当前浏览器不支持 WebGL2，请使用最新版 Chrome / Edge / Firefox。';
    return;
  }

  // ---------- Shader 工具：真实项目中建议封装为 Program 类 ----------
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader 编译失败: ${log}`);
    }
    return shader;
  }

  function createProgram(vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program 链接失败: ${log}`);
    }
    return program;
  }

  const sceneProgram = createProgram(`#version 300 es
    layout(location = 0) in vec2 a_position;
    layout(location = 1) in vec3 a_color;
    uniform float u_time;
    out vec3 v_color;

    void main() {
      float s = sin(u_time);
      float c = cos(u_time);
      mat2 rotate = mat2(c, -s, s, c);
      vec2 p = rotate * a_position;
      gl_Position = vec4(p, 0.0, 1.0);
      v_color = a_color;
    }
  `, `#version 300 es
    precision highp float;
    in vec3 v_color;
    out vec4 outColor;

    void main() {
      outColor = vec4(v_color, 1.0);
    }
  `);

  const postProgram = createProgram(`#version 300 es
    layout(location = 0) in vec2 a_position;
    out vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `, `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_scene;
    uniform vec2 u_resolution;
    uniform float u_time;
    out vec4 outColor;

    void main() {
      // 像素化：把连续 UV 压到固定网格，再采样离屏纹理。
      float pixelSize = 5.0 + 3.0 * sin(u_time * 0.8);
      vec2 pixelated = floor(v_uv * u_resolution / pixelSize) * pixelSize / u_resolution;
      vec3 color = texture(u_scene, pixelated).rgb;

      // 灰度：后处理 pass 的典型屏幕空间颜色运算。
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(color, vec3(gray), 0.62);

      // 暗角：强调当前 pass 已经拿到了完整屏幕空间 UV。
      float dist = distance(v_uv, vec2(0.5));
      float vignette = smoothstep(0.82, 0.25, dist);
      color *= vignette;

      // 轻微蓝紫色调，便于观察“原场景”和“后处理结果”的差异。
      color += vec3(0.02, 0.03, 0.08) * (1.0 - vignette);
      outColor = vec4(color, 1.0);
    }
  `);

  // ---------- 几何数据 ----------
  const triangleVao = gl.createVertexArray();
  gl.bindVertexArray(triangleVao);
  const triangleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    // x, y,       r, g, b
     0.0,  0.72,  1.0, 0.38, 0.22,
    -0.72, -0.55, 0.18, 0.82, 1.0,
     0.72, -0.55, 0.48, 1.0, 0.36,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

  const quadVao = gl.createVertexArray();
  gl.bindVertexArray(quadVao);
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // ---------- FBO / RenderTarget ----------
  let target = null;

  function createRenderTarget(width, height) {
    const colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!complete) throw new Error('FBO 不完整：请检查颜色/深度附件尺寸是否一致。');

    return { framebuffer, colorTexture, depthBuffer, width, height };
  }

  function disposeRenderTarget(rt) {
    if (!rt) return;
    gl.deleteFramebuffer(rt.framebuffer);
    gl.deleteTexture(rt.colorTexture);
    gl.deleteRenderbuffer(rt.depthBuffer);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width === width && canvas.height === height && target) return;

    canvas.width = width;
    canvas.height = height;
    disposeRenderTarget(target);
    target = createRenderTarget(width, height);
  }

  function render(timeMs) {
    resize();
    const t = timeMs * 0.001;

    // Pass 1：绑定自定义 FBO，把场景画入离屏纹理。
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.03, 0.04, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(sceneProgram);
    gl.uniform1f(gl.getUniformLocation(sceneProgram, 'u_time'), t);
    gl.bindVertexArray(triangleVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 2：解绑 FBO，采样上一步颜色纹理并输出到默认帧缓冲。
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0.01, 0.012, 0.02, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(postProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.colorTexture);
    gl.uniform1i(gl.getUniformLocation(postProgram, 'u_scene'), 0);
    gl.uniform2f(gl.getUniformLocation(postProgram, 'u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(postProgram, 'u_time'), t);
    gl.bindVertexArray(quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    status.textContent = `Pass: Scene -> FBO -> PostProcess -> Screen | FBO: ${target.width} × ${target.height}`;
    requestAnimationFrame(render);
  }

  try {
    requestAnimationFrame(render);
  } catch (error) {
    console.error(error);
    status.textContent = error.message;
  }
})();
