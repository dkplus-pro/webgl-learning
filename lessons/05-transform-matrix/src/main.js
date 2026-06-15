(function () {
  'use strict';

  const canvas = document.querySelector('#glCanvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;
    uniform mat3 u_matrix;

    void main() {
      vec3 transformed = u_matrix * vec3(a_position, 1.0);
      gl_Position = vec4(transformed.xy, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;
    void main() {
      gl_FragColor = vec4(0.35, 0.9, 0.68, 1.0);
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

  // 一个箭头形状，方便观察旋转方向。
  const vertices = new Float32Array([
    -0.15,  0.5,  0.15,  0.5,  0.15, -0.2,
    -0.15,  0.5,  0.15, -0.2, -0.15, -0.2,
    -0.35, -0.2,  0.35, -0.2,  0.0, -0.55,
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');

  function matrix3({ angle, translation, scale }) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const [tx, ty] = translation;
    const [scaleX, scaleY] = scale;

    // WebGL 按列主序读取矩阵。这里把缩放、旋转、平移组合为一个 mat3。
    return new Float32Array([
      scaleX * c, scaleX * s, 0,
      -scaleY * s, scaleY * c, 0,
      tx, ty, 1,
    ]);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(time) {
    resize();
    gl.clearColor(0.03, 0.04, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix3fv(matrixLocation, false, matrix3({
      angle: time * 0.001,
      translation: [0.0, 0.0],
      scale: [0.85, 0.85],
    }));

    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
