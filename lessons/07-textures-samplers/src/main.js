(() => {
  'use strict';

  const canvas = document.querySelector('#gl-canvas');
  const status = document.querySelector('#status');
  const filterMode = document.querySelector('#filter-mode');
  const wrapMode = document.querySelector('#wrap-mode');
  const uvScale = document.querySelector('#uv-scale');
  const uvScaleLabel = document.querySelector('#uv-scale-label');
  const gl = canvas.getContext('webgl', { antialias: true });

  if (!gl) {
    status.textContent = '当前浏览器不支持 WebGL，请使用最新版 Chrome / Edge / Firefox。';
    return;
  }

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

  const program = createProgram(`
    attribute vec2 a_position;
    attribute vec2 a_uv;
    uniform float u_angle;
    varying vec2 v_uv;

    void main() {
      float c = cos(u_angle);
      float s = sin(u_angle);
      mat2 rotate = mat2(c, s, -s, c);
      vec2 position = rotate * a_position;
      gl_Position = vec4(position, 0.0, 1.0);
      // UV 不跟随矩形旋转而改变：它是顶点属性插值后的纹理查询坐标。
      v_uv = a_uv;
    }
  `, `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_uvScale;
    uniform float u_time;
    varying vec2 v_uv;

    void main() {
      // UV 缩放后会超出 [0, 1]，最终效果由 TEXTURE_WRAP_S/T 决定。
      vec2 animatedUv = v_uv * u_uvScale + vec2(sin(u_time * 0.4) * 0.08, 0.0);
      vec4 texel = texture2D(u_texture, animatedUv);
      // 轻微叠加坐标调试色，方便观察几何插值和纹理采样的区别。
      vec3 uvTint = vec3(v_uv, 0.35);
      gl_FragColor = vec4(mix(texel.rgb, uvTint, 0.16), 1.0);
    }
  `);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const uvLocation = gl.getAttribLocation(program, 'a_uv');
  const textureLocation = gl.getUniformLocation(program, 'u_texture');
  const uvScaleLocation = gl.getUniformLocation(program, 'u_uvScale');
  const angleLocation = gl.getUniformLocation(program, 'u_angle');
  const timeLocation = gl.getUniformLocation(program, 'u_time');

  const vertices = new Float32Array([
    // x, y,    u, v
    -0.78, -0.58, 0, 0,
     0.78, -0.58, 1, 0,
    -0.78,  0.58, 0, 1,
    -0.78,  0.58, 0, 1,
     0.78, -0.58, 1, 0,
     0.78,  0.58, 1, 1,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  function createCheckerTexture(size = 64, cells = 8) {
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        const checker = (Math.floor(x / (size / cells)) + Math.floor(y / (size / cells))) % 2;
        const edge = x < 2 || y < 2 || x >= size - 2 || y >= size - 2;
        pixels[offset + 0] = edge ? 255 : checker ? 58 : 18;
        pixels[offset + 1] = edge ? 255 : checker ? 226 : 107;
        pixels[offset + 2] = edge ? 255 : checker ? 255 : 172;
        pixels[offset + 3] = 255;
      }
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // texImage2D 的数据源是上面程序生成的 Uint8Array，因此 demo 不依赖图片或网络。
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return texture;
  }

  const texture = createCheckerTexture();

  function updateTextureParameters() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const filter = filterMode.value === 'nearest' ? gl.NEAREST : gl.LINEAR;
    const wrap = wrapMode.value === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    // 过滤参数控制“两个 texel 之间如何取值”；包裹参数控制“UV 越界如何处理”。
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  }

  filterMode.addEventListener('change', updateTextureParameters);
  wrapMode.addEventListener('change', updateTextureParameters);
  uvScale.addEventListener('input', () => {
    uvScaleLabel.textContent = Number(uvScale.value).toFixed(2);
  });
  updateTextureParameters();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function render(timeMs) {
    resize();
    const time = timeMs * 0.001;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.06, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

    // sampler uniform 指向纹理单元编号，而不是直接保存 texture 对象。
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(textureLocation, 0);
    gl.uniform1f(uvScaleLocation, Number(uvScale.value));
    gl.uniform1f(angleLocation, Math.sin(time * 0.35) * 0.18);
    gl.uniform1f(timeLocation, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    status.innerHTML = [
      'Texture: procedural 64×64 checkerboard',
      `Filter: ${filterMode.value.toUpperCase()}`,
      `Wrap: ${wrapMode.value === 'repeat' ? 'REPEAT' : 'CLAMP_TO_EDGE'}`,
      `UV scale: ${Number(uvScale.value).toFixed(2)}`,
    ].join('<br>');
    requestAnimationFrame(render);
  }

  try {
    requestAnimationFrame(render);
  } catch (error) {
    console.error(error);
    status.textContent = error.message;
  }
})();
