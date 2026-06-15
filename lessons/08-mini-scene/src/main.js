(function () {
  'use strict';

  const canvas = document.querySelector('#glCanvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const vertexSource = `
    attribute vec3 a_position;
    attribute vec3 a_color;
    uniform mat4 u_matrix;
    varying vec3 v_color;

    void main() {
      v_color = a_color;
      gl_Position = u_matrix * vec4(a_position, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;
    varying vec3 v_color;

    void main() {
      gl_FragColor = vec4(v_color, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function createProgram() {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  }

  const program = createProgram();

  // 每个面 4 个顶点，让每个面拥有独立颜色；索引负责组成 12 个三角形。
  const vertices = new Float32Array([
    // x, y, z, r, g, b
    -1, -1,  1, 0.95, 0.25, 0.25,  1, -1,  1, 0.95, 0.25, 0.25,  1,  1,  1, 0.95, 0.25, 0.25, -1,  1,  1, 0.95, 0.25, 0.25,
    -1, -1, -1, 0.25, 0.55, 0.95, -1,  1, -1, 0.25, 0.55, 0.95,  1,  1, -1, 0.25, 0.55, 0.95,  1, -1, -1, 0.25, 0.55, 0.95,
    -1,  1, -1, 0.25, 0.9, 0.55, -1,  1,  1, 0.25, 0.9, 0.55,  1,  1,  1, 0.25, 0.9, 0.55,  1,  1, -1, 0.25, 0.9, 0.55,
    -1, -1, -1, 0.95, 0.75, 0.25,  1, -1, -1, 0.95, 0.75, 0.25,  1, -1,  1, 0.95, 0.75, 0.25, -1, -1,  1, 0.95, 0.75, 0.25,
     1, -1, -1, 0.75, 0.35, 0.95,  1,  1, -1, 0.75, 0.35, 0.95,  1,  1,  1, 0.75, 0.35, 0.95,  1, -1,  1, 0.75, 0.35, 0.95,
    -1, -1, -1, 0.35, 0.95, 0.95, -1, -1,  1, 0.35, 0.95, 0.95, -1,  1,  1, 0.35, 0.95, 0.95, -1,  1, -1, 0.35, 0.95, 0.95,
  ]);

  const indices = new Uint16Array([
     0,  1,  2,  0,  2,  3,
     4,  5,  6,  4,  6,  7,
     8,  9, 10,  8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
  ]);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  function perspective(fieldOfViewRadians, aspect, near, far) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewRadians);
    const rangeInv = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0,
    ]);
  }

  function multiply(a, b) {
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
  }

  function translation(x, y, z) {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1,
    ]);
  }

  function rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ]);
  }

  function rotationY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ]);
  }

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const colorLocation = gl.getAttribLocation(program, 'a_color');
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(time) {
    resize();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.02, 0.03, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

    const projection = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    const view = translation(0, 0, -6);
    const model = multiply(rotationY(time * 0.001), rotationX(time * 0.0007));
    const matrix = multiply(multiply(projection, view), model);
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
