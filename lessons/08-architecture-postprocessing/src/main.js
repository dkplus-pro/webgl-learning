(() => {
  'use strict';

  const canvas = document.querySelector('#gl-canvas');
  const status = document.querySelector('#status');
  const gl = canvas.getContext('webgl2', { antialias: false });

  if (!gl) {
    status.textContent = '当前浏览器不支持 WebGL2，请使用最新版 Chrome / Edge / Firefox。';
    return;
  }

  class Program {
    constructor(vertexSource, fragmentSource) {
      this.handle = gl.createProgram();
      const vertexShader = this.compile(gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = this.compile(gl.FRAGMENT_SHADER, fragmentSource);
      gl.attachShader(this.handle, vertexShader);
      gl.attachShader(this.handle, fragmentShader);
      gl.linkProgram(this.handle);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (!gl.getProgramParameter(this.handle, gl.LINK_STATUS)) {
        throw new Error(`Program 链接失败: ${gl.getProgramInfoLog(this.handle)}`);
      }
      this.uniformCache = new Map();
    }

    compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`Shader 编译失败: ${gl.getShaderInfoLog(shader)}`);
      }
      return shader;
    }

    use() {
      gl.useProgram(this.handle);
      return this;
    }

    uniform(name) {
      if (!this.uniformCache.has(name)) {
        this.uniformCache.set(name, gl.getUniformLocation(this.handle, name));
      }
      return this.uniformCache.get(name);
    }
  }

  class Geometry {
    constructor(attributes, vertexCount) {
      this.vertexCount = vertexCount;
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      for (const attribute of attributes) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, attribute.data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(attribute.location);
        gl.vertexAttribPointer(attribute.location, attribute.size, gl.FLOAT, false, 0, 0);
      }
      gl.bindVertexArray(null);
    }

    draw(mode = gl.TRIANGLES) {
      gl.bindVertexArray(this.vao);
      gl.drawArrays(mode, 0, this.vertexCount);
      gl.bindVertexArray(null);
    }
  }

  class RenderTarget {
    constructor(width, height, label) {
      this.label = label;
      this.width = width;
      this.height = height;
      this.framebuffer = gl.createFramebuffer();
      this.texture = gl.createTexture();
      this.depth = gl.createRenderbuffer();
      this.allocate(width, height);
    }

    allocate(width, height) {
      this.width = width;
      this.height = height;
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`${this.label} FBO 不完整`);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    bind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.viewport(0, 0, this.width, this.height);
    }
  }

  const quad = new Geometry([{ location: 0, size: 2, data: new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
  ]) }], 6);

  const sceneGeometry = new Geometry([
    { location: 0, size: 2, data: new Float32Array([
       0.0,  0.62, -0.56, -0.38,  0.56, -0.38,
      -0.22, 0.22, -0.82, -0.72,  0.30, -0.66,
       0.22, 0.22,  0.82, -0.72, -0.30, -0.66,
    ]) },
    { location: 1, size: 3, data: new Float32Array([
      1.0, 0.34, 0.42, 0.35, 0.78, 1.0, 0.85, 1.0, 0.44,
      0.92, 0.46, 1.0, 0.36, 0.72, 1.0, 1.0, 0.78, 0.28,
      0.42, 1.0, 0.82, 1.0, 0.52, 0.38, 0.60, 0.68, 1.0,
    ]) },
  ], 9);

  const sceneProgram = new Program(`#version 300 es
    layout(location = 0) in vec2 a_position;
    layout(location = 1) in vec3 a_color;
    uniform float u_time;
    uniform vec2 u_resolution;
    out vec3 v_color;

    void main() {
      float shape = floor(float(gl_VertexID) / 3.0);
      float angle = u_time * (0.55 + shape * 0.22) + shape * 2.1;
      float s = sin(angle);
      float c = cos(angle);
      mat2 rotate = mat2(c, -s, s, c);
      vec2 offset = vec2(cos(u_time * 0.35 + shape * 2.4), sin(u_time * 0.42 + shape * 1.7)) * 0.22;
      vec2 p = rotate * a_position * (0.72 - shape * 0.08) + offset;
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

  const blurProgram = new Program(`#version 300 es
    layout(location = 0) in vec2 a_position;
    out vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `, `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_source;
    uniform vec2 u_texel;
    out vec4 outColor;

    void main() {
      // 9-tap 横向模糊：真实 Bloom 会再接一个纵向 pass，本课保留最小架构闭环。
      vec3 color = texture(u_source, v_uv).rgb * 0.18;
      color += texture(u_source, v_uv + vec2( u_texel.x, 0.0)).rgb * 0.15;
      color += texture(u_source, v_uv + vec2(-u_texel.x, 0.0)).rgb * 0.15;
      color += texture(u_source, v_uv + vec2( 2.0 * u_texel.x, 0.0)).rgb * 0.12;
      color += texture(u_source, v_uv + vec2(-2.0 * u_texel.x, 0.0)).rgb * 0.12;
      color += texture(u_source, v_uv + vec2( 4.0 * u_texel.x, 0.0)).rgb * 0.08;
      color += texture(u_source, v_uv + vec2(-4.0 * u_texel.x, 0.0)).rgb * 0.08;
      color += texture(u_source, v_uv + vec2( 7.0 * u_texel.x, 0.0)).rgb * 0.06;
      color += texture(u_source, v_uv + vec2(-7.0 * u_texel.x, 0.0)).rgb * 0.06;
      outColor = vec4(color, 1.0);
    }
  `);

  const compositeProgram = new Program(`#version 300 es
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
    uniform sampler2D u_blur;
    uniform vec2 u_resolution;
    uniform float u_time;
    out vec4 outColor;

    void main() {
      vec2 texel = 1.0 / u_resolution;
      float chroma = 1.5 + sin(u_time) * 0.6;
      vec3 scene;
      scene.r = texture(u_scene, v_uv + vec2(chroma * texel.x, 0.0)).r;
      scene.g = texture(u_scene, v_uv).g;
      scene.b = texture(u_scene, v_uv - vec2(chroma * texel.x, 0.0)).b;
      vec3 blur = texture(u_blur, v_uv).rgb;

      float scanline = 0.94 + 0.06 * sin(gl_FragCoord.y * 1.7);
      float vignette = smoothstep(0.9, 0.2, distance(v_uv, vec2(0.5)));
      vec3 color = (scene + blur * 0.75) * scanline * vignette;
      color += vec3(0.015, 0.025, 0.055);
      outColor = vec4(color, 1.0);
    }
  `);

  let sceneTarget = null;
  let blurTarget = null;

  function ensureTargets() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width === width && canvas.height === height && sceneTarget && blurTarget) return;
    canvas.width = width;
    canvas.height = height;
    sceneTarget = new RenderTarget(width, height, 'SceneTarget');
    blurTarget = new RenderTarget(width, height, 'BlurTarget');
  }

  function bindTexture(unit, texture, uniformLocation) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniformLocation, unit);
  }

  function render(timeMs) {
    ensureTargets();
    const t = timeMs * 0.001;

    // ScenePass：写入 sceneTarget。
    sceneTarget.bind();
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.015, 0.018, 0.04, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    sceneProgram.use();
    gl.uniform1f(sceneProgram.uniform('u_time'), t);
    gl.uniform2f(sceneProgram.uniform('u_resolution'), canvas.width, canvas.height);
    sceneGeometry.draw();

    // BlurPass：读取 sceneTarget，写入 blurTarget。
    blurTarget.bind();
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    blurProgram.use();
    bindTexture(0, sceneTarget.texture, blurProgram.uniform('u_source'));
    gl.uniform2f(blurProgram.uniform('u_texel'), 1 / canvas.width, 1 / canvas.height);
    quad.draw();

    // CompositePass：读取原场景和模糊纹理，输出到默认帧缓冲。
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.01, 0.012, 0.02, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    compositeProgram.use();
    bindTexture(0, sceneTarget.texture, compositeProgram.uniform('u_scene'));
    bindTexture(1, blurTarget.texture, compositeProgram.uniform('u_blur'));
    gl.uniform2f(compositeProgram.uniform('u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(compositeProgram.uniform('u_time'), t);
    quad.draw();

    status.textContent = `Pipeline: SceneTarget -> BlurTarget -> Screen | ${canvas.width} × ${canvas.height}`;
    requestAnimationFrame(render);
  }

  try {
    requestAnimationFrame(render);
  } catch (error) {
    console.error(error);
    status.textContent = error.message;
  }
})();
