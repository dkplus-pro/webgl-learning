(function () {
  'use strict';

  const canvas = document.querySelector('#glCanvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const quad = new Float32Array([
    -1, -1, 0, 0,
     1, -1, 1, 0,
    -1,  1, 0, 1,
    -1,  1, 0, 1,
     1, -1, 1, 0,
     1,  1, 1, 1,
  ]);

  function program(vertexSource, fragmentSource) {
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    const linked = gl.createProgram();
    gl.attachShader(linked, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(linked, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(linked);
    if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(linked));
    return linked;
  }

  const vertexSource = `
    attribute vec2 a_position;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main() {
      v_uv = a_uv;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const sceneProgram = program(vertexSource, `
    precision mediump float;
    uniform float u_time;
    varying vec2 v_uv;
    void main() {
      float ring = sin(distance(v_uv, vec2(0.5)) * 42.0 - u_time * 4.0);
      vec3 color = mix(vec3(0.08, 0.18, 0.45), vec3(1.0, 0.55, 0.12), ring * 0.5 + 0.5);
      gl_FragColor = vec4(color, 1.0);
    }
  `);

  const postProgram = program(vertexSource, `
    precision mediump float;
    uniform sampler2D u_scene;
    uniform vec2 u_resolution;
    varying vec2 v_uv;
    void main() {
      vec4 color = texture2D(u_scene, v_uv);
      float vignette = smoothstep(0.82, 0.25, distance(v_uv, vec2(0.5)));
      float scanline = 0.92 + 0.08 * sin(gl_FragCoord.y * 1.7);
      gl_FragColor = vec4(color.rgb * vignette * scanline, 1.0);
    }
  `);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  let renderTarget = null;

  function createRenderTarget(width, height) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return { texture, framebuffer, width, height };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);
    canvas.width = width;
    canvas.height = height;
    if (!renderTarget || renderTarget.width !== width || renderTarget.height !== height) {
      renderTarget = createRenderTarget(width, height);
    }
  }

  function bindQuad(activeProgram) {
    gl.useProgram(activeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    const position = gl.getAttribLocation(activeProgram, 'a_position');
    const uv = gl.getAttribLocation(activeProgram, 'a_uv');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
  }

  function render(time) {
    resize();

    gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.framebuffer);
    gl.viewport(0, 0, renderTarget.width, renderTarget.height);
    bindQuad(sceneProgram);
    gl.uniform1f(gl.getUniformLocation(sceneProgram, 'u_time'), time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    bindQuad(postProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderTarget.texture);
    gl.uniform1i(gl.getUniformLocation(postProgram, 'u_scene'), 0);
    gl.uniform2f(gl.getUniformLocation(postProgram, 'u_resolution'), canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
