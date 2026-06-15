(() => {
  'use strict';

  const canvas = document.querySelector('#gl-canvas');
  const status = document.querySelector('#status');
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

  // WebGL 使用列主序矩阵；这里的工具函数返回可直接传给 uniformMatrix4fv 的 Float32Array。
  const mat4 = {
    identity() {
      return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]);
    },
    multiply(a, b) {
      const out = new Float32Array(16);
      for (let column = 0; column < 4; column += 1) {
        for (let row = 0; row < 4; row += 1) {
          out[column * 4 + row] =
            a[0 * 4 + row] * b[column * 4 + 0] +
            a[1 * 4 + row] * b[column * 4 + 1] +
            a[2 * 4 + row] * b[column * 4 + 2] +
            a[3 * 4 + row] * b[column * 4 + 3];
        }
      }
      return out;
    },
    perspective(fieldOfViewRadians, aspect, near, far) {
      const f = 1 / Math.tan(fieldOfViewRadians / 2);
      const rangeInv = 1 / (near - far);
      return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0,
      ]);
    },
    translation(tx, ty, tz) {
      const out = mat4.identity();
      out[12] = tx;
      out[13] = ty;
      out[14] = tz;
      return out;
    },
    rotationX(angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1,
      ]);
    },
    rotationY(angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1,
      ]);
    },
  };

  const program = createProgram(`
    attribute vec3 a_position;
    attribute vec3 a_color;
    uniform mat4 u_matrix;
    varying vec3 v_color;

    void main() {
      // 模型坐标经 MVP 矩阵变换后，才进入 WebGL 裁剪空间。
      gl_Position = u_matrix * vec4(a_position, 1.0);
      v_color = a_color;
    }
  `, `
    precision mediump float;
    varying vec3 v_color;

    void main() {
      gl_FragColor = vec4(v_color, 1.0);
    }
  `);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const colorLocation = gl.getAttribLocation(program, 'a_color');
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');

  // 一个立方体由 6 个面组成；每个面两个三角形。坐标仍然保持在容易理解的局部空间。
  const vertices = new Float32Array([
    // x, y, z,      r, g, b
    // front
    -1, -1,  1,     1.00, 0.35, 0.28,
     1, -1,  1,     1.00, 0.35, 0.28,
     1,  1,  1,     1.00, 0.35, 0.28,
    -1, -1,  1,     1.00, 0.35, 0.28,
     1,  1,  1,     1.00, 0.35, 0.28,
    -1,  1,  1,     1.00, 0.35, 0.28,
    // back
    -1, -1, -1,     0.28, 0.55, 1.00,
    -1,  1, -1,     0.28, 0.55, 1.00,
     1,  1, -1,     0.28, 0.55, 1.00,
    -1, -1, -1,     0.28, 0.55, 1.00,
     1,  1, -1,     0.28, 0.55, 1.00,
     1, -1, -1,     0.28, 0.55, 1.00,
    // top
    -1,  1, -1,     0.30, 1.00, 0.62,
    -1,  1,  1,     0.30, 1.00, 0.62,
     1,  1,  1,     0.30, 1.00, 0.62,
    -1,  1, -1,     0.30, 1.00, 0.62,
     1,  1,  1,     0.30, 1.00, 0.62,
     1,  1, -1,     0.30, 1.00, 0.62,
    // bottom
    -1, -1, -1,     1.00, 0.85, 0.25,
     1, -1, -1,     1.00, 0.85, 0.25,
     1, -1,  1,     1.00, 0.85, 0.25,
    -1, -1, -1,     1.00, 0.85, 0.25,
     1, -1,  1,     1.00, 0.85, 0.25,
    -1, -1,  1,     1.00, 0.85, 0.25,
    // right
     1, -1, -1,     0.85, 0.42, 1.00,
     1,  1, -1,     0.85, 0.42, 1.00,
     1,  1,  1,     0.85, 0.42, 1.00,
     1, -1, -1,     0.85, 0.42, 1.00,
     1,  1,  1,     0.85, 0.42, 1.00,
     1, -1,  1,     0.85, 0.42, 1.00,
    // left
    -1, -1, -1,     0.32, 0.95, 1.00,
    -1, -1,  1,     0.32, 0.95, 1.00,
    -1,  1,  1,     0.32, 0.95, 1.00,
    -1, -1, -1,     0.32, 0.95, 1.00,
    -1,  1,  1,     0.32, 0.95, 1.00,
    -1,  1, -1,     0.32, 0.95, 1.00,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

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
    const aspect = canvas.width / canvas.height;

    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);
    const view = mat4.translation(0, 0, -6);
    const model = mat4.multiply(mat4.rotationY(time * 0.85), mat4.rotationX(time * 0.55));
    const viewModel = mat4.multiply(view, model);
    const mvp = mat4.multiply(projection, viewModel);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.03, 0.04, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.uniformMatrix4fv(matrixLocation, false, mvp);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    status.innerHTML = [
      'Pipeline: model → view → projection → clip space',
      `Canvas: ${canvas.width} × ${canvas.height}`,
      `Rotation: ${(time % (Math.PI * 2)).toFixed(2)} rad`,
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
