(() => {
  'use strict';

  const canvas = document.querySelector('#gl-canvas');
  const status = document.querySelector('#status');
  const resetButton = document.querySelector('#reset-button');
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
    attribute vec3 a_color;
    uniform float u_angle;
    uniform vec2 u_pointer;
    varying vec3 v_color;

    void main() {
      float c = cos(u_angle);
      float s = sin(u_angle);
      mat2 rotate = mat2(c, s, -s, c);
      vec2 orbitOffset = u_pointer * 0.18;
      gl_Position = vec4(rotate * a_position + orbitOffset, 0.0, 1.0);
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
  const angleLocation = gl.getUniformLocation(program, 'u_angle');
  const pointerLocation = gl.getUniformLocation(program, 'u_pointer');

  // WebGL 资源在循环外创建；每帧只更新 uniform 和 draw call，避免重复分配。
  const vertices = new Float32Array([
    // x, y,     r, g, b
     0.00,  0.58, 1.00, 0.42, 0.70,
    -0.50, -0.36, 0.35, 0.78, 1.00,
     0.50, -0.36, 0.82, 1.00, 0.42,
     0.00, -0.08, 1.00, 1.00, 1.00,
    -0.12, -0.82, 0.75, 0.48, 1.00,
     0.12, -0.82, 0.75, 0.48, 1.00,
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const initialState = {
    angle: 0,
    angularVelocity: 0.9,
    paused: false,
    pointerX: 0,
    pointerY: 0,
    dragging: false,
    lastClientX: 0,
    lastClientY: 0,
    frames: 0,
  };
  const state = { ...initialState };

  function resetState() {
    Object.assign(state, initialState);
  }

  function normalizePointer(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    return { x, y };
  }

  // 输入事件只修改 state，不直接调用 WebGL 绘制；绘制统一由 RAF 循环调度。
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    const pointer = normalizePointer(event);
    state.dragging = true;
    state.pointerX = pointer.x;
    state.pointerY = pointer.y;
    state.lastClientX = event.clientX;
    state.lastClientY = event.clientY;
  });

  canvas.addEventListener('pointermove', (event) => {
    const pointer = normalizePointer(event);
    state.pointerX = pointer.x;
    state.pointerY = pointer.y;
    if (!state.dragging) return;

    const dx = event.clientX - state.lastClientX;
    const dy = event.clientY - state.lastClientY;
    state.lastClientX = event.clientX;
    state.lastClientY = event.clientY;
    // 拖拽速度映射为角速度，松手后由 update 中的阻尼逐渐衰减。
    state.angularVelocity += dx * 0.018 - dy * 0.006;
  });

  canvas.addEventListener('pointerup', (event) => {
    state.dragging = false;
    canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointercancel', () => {
    state.dragging = false;
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      state.paused = !state.paused;
    }
  });

  resetButton.addEventListener('click', resetState);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function update(deltaTime) {
    if (state.paused) return;
    state.angle += state.angularVelocity * deltaTime;
    if (!state.dragging) {
      // 阻尼让交互产生惯性，但不会无限加速。
      const damping = Math.pow(0.88, deltaTime * 60);
      state.angularVelocity = state.angularVelocity * damping + 0.42 * (1 - damping);
    }
    state.frames += 1;
  }

  function render() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.06, 0.025, 0.10, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.uniform1f(angleLocation, state.angle);
    gl.uniform2f(pointerLocation, state.pointerX, state.pointerY);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  let previousTime = 0;
  function frame(timeMs) {
    resize();
    const currentTime = timeMs * 0.001;
    const deltaTime = Math.min(0.05, currentTime - previousTime || 0);
    previousTime = currentTime;

    update(deltaTime);
    render();

    status.innerHTML = [
      `Loop: input → state → update(${deltaTime.toFixed(3)}s) → render`,
      `Paused: ${state.paused ? 'yes' : 'no'}`,
      `Angle: ${state.angle.toFixed(2)} rad`,
      `Angular velocity: ${state.angularVelocity.toFixed(2)} rad/s`,
      `Pointer: (${state.pointerX.toFixed(2)}, ${state.pointerY.toFixed(2)})`,
      `Frames: ${state.frames}`,
    ].join('<br>');

    requestAnimationFrame(frame);
  }

  try {
    requestAnimationFrame(frame);
  } catch (error) {
    console.error(error);
    status.textContent = error.message;
  }
})();
