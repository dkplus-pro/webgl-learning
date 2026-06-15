(function () {
  'use strict';

  const canvas = document.querySelector('#glCanvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;
    attribute vec3 a_color;
    varying vec3 v_color;

    void main() {
      v_color = a_color;
      gl_Position = vec4(a_position, 0.0, 1.0);
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

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));

  // 每个顶点：x, y, r, g, b。位置和颜色交错存储，减少 buffer 绑定次数。
  const vertices = new Float32Array([
    -0.65,  0.55, 1.0, 0.25, 0.25,
    -0.65, -0.55, 0.25, 1.0, 0.55,
     0.65, -0.55, 0.25, 0.55, 1.0,
     0.65,  0.55, 1.0, 0.9, 0.25,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const colorLocation = gl.getAttribLocation(program, 'a_color');

  function render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.03, 0.05, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  }

  render();
  window.addEventListener('resize', render);
})();
