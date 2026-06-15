(function () {
  'use strict';

  const canvas = document.querySelector('#glCanvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;

    void main() {
      // 裁剪空间坐标：x/y 在 -1 到 1 之间会出现在屏幕内。
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;

    void main() {
      gl_FragColor = vec4(0.18, 0.72, 0.96, 1.0);
    }
  `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  const program = createProgram(
    createShader(gl.VERTEX_SHADER, vertexSource),
    createShader(gl.FRAGMENT_SHADER, fragmentSource),
  );

  const positions = new Float32Array([
     0.0,  0.7,
    -0.7, -0.5,
     0.7, -0.5,
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render() {
    resize();
    gl.clearColor(0.03, 0.04, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  render();
  window.addEventListener('resize', render);
})();
