import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Weather, ShelfWeather } from '../../domain/journal';

export function PageWeatherFx({
  weather,
  intensity,
  sunIntensity = 2,
  cloudDensity = 2,
}: {
  weather: Weather;
  intensity: number;
  sunIntensity?: number;
  cloudDensity?: number;
}) {
  if (weather === 'rain') return <RainGlassFx intensity={intensity} workbench={false} />;
  if (weather === 'sun')
    return (
      <div
        className="page-weather-fx page-weather-sun"
        style={{ opacity: 0.45 + sunIntensity * 0.18, '--sunlight': sunIntensity } as CSSProperties}
        aria-hidden="true"
      />
    );
  if (weather === 'cloud')
    return (
      <div
        className={`page-weather-fx page-weather-cloud cloud-${cloudDensity}`}
        style={{ '--cloud-density': cloudDensity } as CSSProperties}
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    );
  return <SnowWeatherFx intensity={intensity} workbench={false} />;
}

export function WorkbenchWeatherFx({
  weather,
  intensity,
  wallpaper,
}: {
  weather: ShelfWeather;
  intensity: number;
  wallpaper: string;
}) {
  if (weather === 'normal') return null;
  if (weather === 'rain')
    return <RainGlassFx intensity={intensity} workbench wallpaper={wallpaper} />;
  if (weather === 'snow') return <SnowWeatherFx intensity={intensity} workbench />;
  return null;
}

export function SnowWeatherFx({ intensity, workbench }: { intensity: number; workbench: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    const canvas = host?.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!host || !canvas || !context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let width = 0,
      height = 0,
      dpr = 1;
    const random = (seed: number) => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const flakes = Array.from({ length: 46 * intensity }, (_, i) => ({
      x: random(i + 1),
      y: random(i + 61),
      size: 1.2 + random(i + 129) * 3.5,
      speed: 0.08 + random(i + 213) * 0.22,
      drift: -0.06 + random(i + 299) * 0.12,
      phase: random(i + 391) * 6.28,
    }));
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const draw = (time: number) => {
      const ctx = context;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      flakes.forEach((flake) => {
        const x =
          (((flake.x * width +
            Math.sin(time * 0.00035 + flake.phase) * 34 +
            flake.drift * time * 0.025) %
            width) +
            width) %
          width;
        const y =
          ((flake.y * (height + 24) + time * flake.speed * (reducedMotion ? 0.08 : 0.42)) %
            (height + 16)) -
          8;
        ctx.fillStyle = `rgba(255,255,255,${0.48 + flake.size * 0.08})`;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = flake.size * 2.2;
        ctx.beginPath();
        ctx.arc(x, y, flake.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [intensity]);
  return (
    <div
      ref={hostRef}
      className={`page-weather-fx page-weather-snow ${workbench ? 'workbench-weather-fx' : ''}`}
      aria-hidden="true"
    >
      <canvas />
    </div>
  );
}

/** Canvas-stamped water normals feed the WebGL lens shader; Canvas owns droplet motion and wiping. */
export function RainGlassFx({
  intensity,
  workbench,
  wallpaper,
}: {
  intensity: number;
  workbench: boolean;
  wallpaper?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current,
      canvas = host?.querySelector('canvas');
    if (!host || !canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) return;
    const vertex = `attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
    const fragment = `precision mediump float;
      varying vec2 vUv; uniform vec2 uResolution; uniform float uSceneRatio; uniform float uRevealBackground; uniform sampler2D uScene; uniform sampler2D uGlassScene; uniform sampler2D uWater; uniform sampler2D uWipe; uniform float uStrength;
      vec2 coverUv(vec2 uv){float screenRatio=uResolution.x/uResolution.y;if(screenRatio>uSceneRatio)uv.y=(uv.y-.5)*(uSceneRatio/screenRatio)+.5;else uv.x=(uv.x-.5)*(screenRatio/uSceneRatio)+.5;return clamp(uv,vec2(.002),vec2(.998));}
      void main(){
        vec2 uv=vec2(vUv.x,1.-vUv.y); vec4 water=texture2D(uWater,uv); float wiped=clamp(texture2D(uWipe,uv).a,0.,1.); float reveal=wiped*uRevealBackground;
        vec2 offset=(vec2(water.g,water.r)-.5)*2.; float depth=water.b; float mask=clamp(water.a*4.-1.,0.,1.)*(1.-wiped);
        vec2 refractedUv=coverUv(uv+offset*(256.+depth*256.)/uResolution.x*uStrength);
        vec3 base=texture2D(uScene,coverUv(uv)).rgb; vec3 glassBase=texture2D(uGlassScene,coverUv(uv)).rgb; vec3 refracted=texture2D(uGlassScene,refractedUv).rgb;
        float edge=clamp(length(offset),0.,1.); float rim=smoothstep(.08,.46,edge)*mask;
        float shine=pow(max(0.,dot(normalize(offset+vec2(.0001)),normalize(vec2(-.48,.78)))),9.)*mask;
        float fog=.28*(1.-wiped);
        vec3 lens=mix(refracted,vec3(.82,.91,.94),.08)+vec3(.16,.24,.27)*rim*.25+vec3(.9,.96,1.)*shine-vec3(.08,.13,.16)*rim*.13;
        vec3 glass=mix(glassBase,vec3(.82,.87,.88),fog);
        float rainAlpha=mask+(1.-mask)*fog;
        vec3 rainColor=(lens*mask+glass*(1.-mask)*fog)/max(rainAlpha,.0001);
        float alpha=reveal+(1.-reveal)*rainAlpha;
        vec3 color=(base*reveal+rainColor*rainAlpha*(1.-reveal))/max(alpha,.0001);
        gl_FragColor=vec4(color,alpha);
      }`;
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) || 'shader compile');
      return s;
    };
    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) || 'shader link');
    } catch (error) {
      console.warn('Rain glass shader unavailable', error);
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = (unit: number) => {
      const tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    let sceneW = 768,
      sceneH = 512,
      sceneRatio = sceneW / sceneH;
    const sceneTex = texture(0),
      waterTex = texture(1),
      wipeTex = texture(2),
      glassSceneTex = texture(3);
    const scene = document.createElement('canvas');
    scene.width = sceneW;
    scene.height = sceneH;
    const glassScene = document.createElement('canvas');
    glassScene.width = sceneW;
    glassScene.height = sceneH;
    const sc = scene.getContext('2d')!,
      gsc = glassScene.getContext('2d')!;
    const paintPreset = (preset: string) => {
      const linear = sc.createLinearGradient(0, 0, sceneW, sceneH);
      if (preset === 'dusk') {
        linear.addColorStop(0, '#39434a');
        linear.addColorStop(0.52, '#716b70');
        linear.addColorStop(1, '#2c3740');
        sc.fillStyle = linear;
        sc.fillRect(0, 0, sceneW, sceneH);
        const a = sc.createRadialGradient(
          sceneW * 0.78,
          sceneH * 0.2,
          0,
          sceneW * 0.78,
          sceneH * 0.2,
          sceneW * 0.48,
        );
        a.addColorStop(0, '#c5917a99');
        a.addColorStop(1, '#c5917a00');
        sc.fillStyle = a;
        sc.fillRect(0, 0, sceneW, sceneH);
        const b = sc.createRadialGradient(
          sceneW * 0.14,
          sceneH * 0.8,
          0,
          sceneW * 0.14,
          sceneH * 0.8,
          sceneW * 0.45,
        );
        b.addColorStop(0, '#74798bbb');
        b.addColorStop(1, '#74798b00');
        sc.fillStyle = b;
        sc.fillRect(0, 0, sceneW, sceneH);
      } else if (preset === 'garden') {
        linear.addColorStop(0, '#657466');
        linear.addColorStop(0.5, '#a8a88c');
        linear.addColorStop(1, '#394f48');
        sc.fillStyle = linear;
        sc.fillRect(0, 0, sceneW, sceneH);
        const a = sc.createRadialGradient(
          sceneW * 0.18,
          sceneH * 0.3,
          0,
          sceneW * 0.18,
          sceneH * 0.3,
          sceneW * 0.45,
        );
        a.addColorStop(0, '#a4a887aa');
        a.addColorStop(1, '#a4a88700');
        sc.fillStyle = a;
        sc.fillRect(0, 0, sceneW, sceneH);
        const b = sc.createRadialGradient(
          sceneW * 0.84,
          sceneH * 0.83,
          0,
          sceneW * 0.84,
          sceneH * 0.83,
          sceneW * 0.5,
        );
        b.addColorStop(0, '#506b5cbb');
        b.addColorStop(1, '#506b5c00');
        sc.fillStyle = b;
        sc.fillRect(0, 0, sceneW, sceneH);
      } else {
        linear.addColorStop(0, '#88948a');
        linear.addColorStop(0.49, '#c3c4b5');
        linear.addColorStop(1, '#777f79');
        sc.fillStyle = linear;
        sc.fillRect(0, 0, sceneW, sceneH);
        const a = sc.createRadialGradient(
          sceneW * 0.16,
          sceneH * 0.14,
          0,
          sceneW * 0.16,
          sceneH * 0.14,
          sceneW * 0.42,
        );
        a.addColorStop(0, '#a8b0a5aa');
        a.addColorStop(1, '#a8b0a500');
        sc.fillStyle = a;
        sc.fillRect(0, 0, sceneW, sceneH);
        const b = sc.createRadialGradient(
          sceneW * 0.83,
          sceneH * 0.73,
          0,
          sceneW * 0.83,
          sceneH * 0.73,
          sceneW * 0.4,
        );
        b.addColorStop(0, '#7d8678bb');
        b.addColorStop(1, '#7d867800');
        sc.fillStyle = b;
        sc.fillRect(0, 0, sceneW, sceneH);
      }
    };
    paintPreset(wallpaper || 'mist');
    const uploadCanvas = (unit: number, target: WebGLTexture, source: HTMLCanvasElement) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    };
    const uploadScene = () => uploadCanvas(0, sceneTex, scene);
    const uploadGlassScene = () => {
      glassScene.width = sceneW;
      glassScene.height = sceneH;
      gsc.save();
      const blur = Math.max(8, Math.min(22, sceneW * 0.012));
      gsc.filter = `blur(${blur}px)`;
      gsc.drawImage(scene, -blur * 2, -blur * 2, sceneW + blur * 4, sceneH + blur * 4);
      gsc.restore();
      uploadCanvas(3, glassSceneTex, glassScene);
    };
    uploadScene();
    uploadGlassScene();
    if (wallpaper?.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        const imageScale = Math.min(1, 2048 / img.width, 2048 / img.height);
        sceneW = Math.max(1, Math.round(img.width * imageScale));
        sceneH = Math.max(1, Math.round(img.height * imageScale));
        scene.width = sceneW;
        scene.height = sceneH;
        sceneRatio = sceneW / sceneH;
        sc.drawImage(img, 0, 0, sceneW, sceneH);
        uploadScene();
        uploadGlassScene();
        gl.uniform1f(uniforms.sceneRatio, sceneRatio);
      };
      img.src = wallpaper;
    }
    const waterMap = document.createElement('canvas'),
      sprayMap = document.createElement('canvas'),
      wipeMap = document.createElement('canvas'),
      wipeOutputMap = document.createElement('canvas');
    const wm = waterMap.getContext('2d')!,
      sm = sprayMap.getContext('2d')!,
      wipe = wipeMap.getContext('2d')!,
      wipeOutput = wipeOutputMap.getContext('2d')!;
    const upload = (unit: number, source: HTMLCanvasElement, tex: WebGLTexture) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    };
    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      sceneRatio: gl.getUniformLocation(program, 'uSceneRatio'),
      revealBackground: gl.getUniformLocation(program, 'uRevealBackground'),
      scene: gl.getUniformLocation(program, 'uScene'),
      glassScene: gl.getUniformLocation(program, 'uGlassScene'),
      water: gl.getUniformLocation(program, 'uWater'),
      wipe: gl.getUniformLocation(program, 'uWipe'),
      strength: gl.getUniformLocation(program, 'uStrength'),
    };
    gl.useProgram(program);
    gl.uniform1i(uniforms.scene, 0);
    gl.uniform1i(uniforms.water, 1);
    gl.uniform1i(uniforms.wipe, 2);
    gl.uniform1i(uniforms.glassScene, 3);
    gl.uniform1f(uniforms.sceneRatio, sceneRatio);
    gl.uniform1f(uniforms.revealBackground, workbench ? 1 : 0);
    gl.uniform1f(uniforms.strength, intensity === 1 ? 0.82 : 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const stampSize = 128,
      depthVariants = Array.from({ length: 16 }, (_, variant) => {
        const stamp = document.createElement('canvas');
        stamp.width = stamp.height = stampSize;
        const ctx = stamp.getContext('2d')!,
          data = ctx.createImageData(stampSize, stampSize),
          cx = stampSize / 2,
          cy = stampSize / 2;
        for (let py = 0; py < stampSize; py++)
          for (let px = 0; px < stampSize; px++) {
            const dx = (px - cx) / cx;
            let dy = (py - cy) / cy;
            dy *= 1 + dy * 0.15;
            const dist = Math.hypot(dx, dy);
            if (dist > 1) continue;
            const nx = dist > 0.001 ? dx / dist : 0,
              ny = dist > 0.001 ? dy / dist : 0,
              depth = Math.sqrt(Math.max(0, 1 - dist * dist)),
              alpha = Math.max(0, 1 - Math.pow(dist / 0.45, 6)) * 255,
              index = (py * stampSize + px) * 4;
            data.data[index] = Math.round(ny * 60 * dist + 128);
            data.data[index + 1] = Math.round(nx * 60 * dist + 128);
            data.data[index + 2] = Math.min(255, Math.round(depth * 255) + variant * 8);
            data.data[index + 3] = Math.round(alpha);
          }
        ctx.putImageData(data, 0, 0);
        return stamp;
      });
    type Drop = {
      id: number;
      x: number;
      y: number;
      r: number;
      momentum: number;
      momentumX: number;
      lastSpawn: number;
      nextSpawn: number;
      spreadX: number;
      spreadY: number;
      parent?: number;
      isNew: boolean;
      killed: boolean;
      shrink: number;
    };
    let drops: Drop[] = [],
      nextDropId = 1;
    type Droplet = { x: number; y: number; r: number };
    let spray: Droplet[] = [];
    const random = (min: number, max: number) => min + Math.random() * (max - min);
    let width = 0,
      height = 0,
      scale = 1,
      raf = 0,
      previous = performance.now(),
      rainCounter = 0,
      sprayCounter = 0,
      wiping = false,
      lastWipeAt = 0,
      lastPoint: { x: number; y: number } | undefined;
    const areaScale = () => Math.sqrt(Math.max(1, width * height) / (1024 * 768));
    const limits = () => Math.max(80, Math.min(240, Math.round(170 * areaScale())));
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      scale = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas!.width = Math.max(1, Math.round(width * scale));
      canvas!.height = Math.max(1, Math.round(height * scale));
      waterMap.width = Math.max(1, Math.round(width * 0.68));
      waterMap.height = Math.max(1, Math.round(height * 0.68));
      sprayMap.width = waterMap.width;
      sprayMap.height = waterMap.height;
      const wipeScale = Math.min(1, 1024 / Math.max(1, width), 768 / Math.max(1, height));
      wipeMap.width = Math.max(256, Math.round(width * wipeScale));
      wipeMap.height = Math.max(256, Math.round(height * wipeScale));
      wipeOutputMap.width = wipeMap.width;
      wipeOutputMap.height = wipeMap.height;
      wm.setTransform(
        waterMap.width / Math.max(1, width),
        0,
        0,
        waterMap.height / Math.max(1, height),
        0,
        0,
      );
      sm.setTransform(
        sprayMap.width / Math.max(1, width),
        0,
        0,
        sprayMap.height / Math.max(1, height),
        0,
        0,
      );
      gl.viewport(0, 0, canvas!.width, canvas!.height);
      gl.uniform2f(uniforms.resolution, canvas!.width, canvas!.height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const drawStamp = (ctx: CanvasRenderingContext2D, drop: Drop | Droplet) => {
      const d = drop as Drop,
        variant = Math.max(0, Math.min(15, Math.floor((drop.r - 2) / 1.5))),
        bitmap = depthVariants[variant],
        spreadX = d.spreadX || 0,
        spreadY = d.spreadY || 0,
        w = drop.r * 2 * (1 + spreadX),
        h = drop.r * 3 * (1 + spreadY);
      ctx.drawImage(bitmap, drop.x - w / 2, drop.y - h / 2, w, h);
    };
    const addSpray = (x: number, y: number, r: number) => {
      const drop = { x, y, r };
      drawStamp(sm, drop);
      spray.push(drop);
    };
    const seedSpray = () => {
      const count = Math.min(
        1900,
        Math.round(((width * height) / 1800) * (intensity === 1 ? 0.76 : 1)),
      );
      let left = count;
      while (left > 0) {
        if (Math.random() < 0.8 && left >= 4) {
          const amount = Math.min(left, 4 + Math.floor(Math.random() * 5)),
            cx = random(0, width),
            cy = random(0, height);
          for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2,
              distance = Math.random() * random(4, 13);
            addSpray(
              cx + Math.cos(angle) * distance,
              cy + Math.sin(angle) * distance,
              random(1.1, 3.5),
            );
          }
          left -= amount;
        } else {
          addSpray(random(0, width), random(0, height), random(1.1, 3.5));
          left--;
        }
      }
    };
    seedSpray();
    const addDrop = (opts: Partial<Drop> & Pick<Drop, 'x' | 'y' | 'r'>) => {
      if (drops.length >= limits()) return;
      drops.push({
        id: nextDropId++,
        x: opts.x,
        y: opts.y,
        r: opts.r,
        momentum: opts.momentum ?? 0,
        momentumX: opts.momentumX ?? 0,
        lastSpawn: opts.lastSpawn ?? 0,
        nextSpawn: opts.nextSpawn ?? random(12, 30),
        spreadX: opts.spreadX ?? 0,
        spreadY: opts.spreadY ?? 0,
        parent: opts.parent,
        isNew: true,
        killed: false,
        shrink: 0,
      });
    };
    const initialDrops = Math.min(30, Math.floor(limits() * 0.2));
    for (let i = 0; i < initialDrops; i++)
      addDrop({
        x: random(0, width),
        y: random(0, height),
        r: random(8, 19),
        momentum: Math.random() < 0.12 ? random(0.5, 2.5) : 0,
      });
    const eraseSpray = (x: number, y: number, r: number, fromX = x, fromY = y) => {
      sm.save();
      sm.globalCompositeOperation = 'destination-out';
      sm.lineCap = 'round';
      sm.lineJoin = 'round';
      sm.lineWidth = r * 2;
      sm.beginPath();
      sm.moveTo(fromX, fromY);
      sm.lineTo(x, y);
      sm.stroke();
      sm.restore();
    };
    const point = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const brushRadius = () => Math.max(11, Math.min(17, Math.min(width, height) * 0.018));
    const pushDropsAlong = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      radius: number,
    ) => {
      const vx = toX - fromX,
        vy = toY - fromY,
        length2 = vx * vx + vy * vy,
        length = Math.sqrt(length2),
        dirX = length ? vx / length : 0,
        dirY = length ? vy / length : 0;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i],
          t = length2
            ? Math.max(0, Math.min(1, ((d.x - fromX) * vx + (d.y - fromY) * vy) / length2))
            : 0,
          nearX = fromX + t * vx,
          nearY = fromY + t * vy,
          dx = d.x - nearX,
          dy = d.y - nearY,
          dist = Math.hypot(dx, dy),
          reach = radius + d.r * 0.45;
        if (dist < reach) {
          const falloff = 1 - dist / reach,
            sideX = dx / (dist || 1),
            sideY = dy / (dist || 1),
            push = (5 + radius * 0.8) * falloff;
          d.x += sideX * push - dirY * push * 0.26;
          d.y += sideY * push + dirX * push * 0.26;
          d.momentumX += sideX * falloff * 0.42 - dirY * falloff * 0.22;
          d.momentum += Math.max(0, sideY) * falloff * 0.32;
          d.spreadX = Math.max(d.spreadX, falloff * 0.11);
          d.spreadY = Math.max(d.spreadY, falloff * 0.1);
        }
      }
    };
    const wipeAt = (x: number, y: number) => {
      lastWipeAt = 0;
      const radius = brushRadius(),
        sx = wipeMap.width / Math.max(1, width),
        sy = wipeMap.height / Math.max(1, height);
      eraseSpray(x, y, radius * 0.88);
      wipe.save();
      wipe.setTransform(sx, 0, 0, sy, 0, 0);
      const g = wipe.createRadialGradient(x, y, radius * 0.08, x, y, radius);
      g.addColorStop(0, 'rgba(255,255,255,.98)');
      g.addColorStop(0.62, 'rgba(255,255,255,.92)');
      g.addColorStop(0.86, 'rgba(255,255,255,.62)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      wipe.fillStyle = g;
      wipe.beginPath();
      wipe.arc(x, y, radius, 0, Math.PI * 2);
      wipe.fill();
      wipe.restore();
      pushDropsAlong(x, y, x, y, radius);
    };
    const wipeStroke = (fromX: number, fromY: number, toX: number, toY: number) => {
      lastWipeAt = 0;
      const radius = brushRadius(),
        sx = wipeMap.width / Math.max(1, width),
        sy = wipeMap.height / Math.max(1, height);
      eraseSpray(toX, toY, radius * 0.88, fromX, fromY);
      wipe.save();
      wipe.setTransform(sx, 0, 0, sy, 0, 0);
      wipe.lineCap = 'round';
      wipe.lineJoin = 'round';
      wipe.beginPath();
      wipe.moveTo(fromX, fromY);
      wipe.lineTo(toX, toY);
      for (const [widthFactor, alpha] of [
        [2.15, 0.22],
        [1.72, 0.34],
        [1.34, 0.5],
        [0.98, 0.76],
      ] as const) {
        wipe.strokeStyle = `rgba(255,255,255,${alpha})`;
        wipe.lineWidth = radius * widthFactor;
        wipe.stroke();
      }
      wipe.restore();
      pushDropsAlong(fromX, fromY, toX, toY, radius);
    };
    let activePointer: number | undefined;
    const down = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest('button,a,input,textarea,[role="button"]')
      )
        return;
      event.preventDefault();
      activePointer = event.pointerId;
      wiping = true;
      lastPoint = point(event);
      wipeAt(lastPoint.x, lastPoint.y);
    };
    const move = (event: PointerEvent) => {
      if (!wiping || event.pointerId !== activePointer) return;
      const current = point(event);
      if (lastPoint) wipeStroke(lastPoint.x, lastPoint.y, current.x, current.y);
      lastPoint = current;
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      wiping = false;
      activePointer = undefined;
      lastPoint = undefined;
      lastWipeAt = performance.now();
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    const tick = (now: number) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - previous) / 1000)),
        timeScale = dt * 60;
      previous = now;
      const cap = limits(),
        minR = 8,
        maxR = 23;
      rainCounter += 5.5 * areaScale() * intensity * dt;
      while (rainCounter >= 1 && drops.length < cap) {
        rainCounter--;
        const r = minR + (maxR - minR) * Math.pow(Math.random(), 3);
        addDrop({
          x: random(0, width),
          y: random(-height * 0.08, height * 0.95),
          r,
          momentum: 1 + (r - minR) * 0.1 + random(0, 2),
          spreadX: 0.16,
          spreadY: 0.16,
          nextSpawn: random(12, 28),
        });
      }
      sprayCounter += 120 * areaScale() * intensity * dt;
      while (sprayCounter >= 1 && spray.length < 2500) {
        sprayCounter--;
        if (Math.random() < 0.8) {
          const amount = 4 + Math.floor(Math.random() * 5),
            cx = random(0, width),
            cy = random(0, height);
          for (let i = 0; i < amount && spray.length < 2500; i++) {
            const angle = Math.random() * Math.PI * 2,
              distance = Math.random() * random(4, 13);
            addSpray(
              cx + Math.cos(angle) * distance,
              cy + Math.sin(angle) * distance,
              random(1.1, 3.5),
            );
          }
        } else addSpray(random(0, width), random(0, height), random(1.1, 3.5));
      }
      drops.sort((a, b) => a.y - b.y);
      const newborn: Drop[] = [];
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        if (d.killed) continue;
        if (Math.random() < Math.max(0, (((d.r - 7) * 0.1) / 16) * timeScale * 0.6))
          d.momentum += random(0.5, 2.5);
        if (d.r <= 8 && Math.random() < 0.05 * timeScale) d.shrink += 0.01 * timeScale;
        d.r -= d.shrink * timeScale;
        if (d.r <= 0) {
          d.killed = true;
          continue;
        }
        const wasMoving = d.momentum > 0.5;
        if (wasMoving) {
          d.lastSpawn += d.momentum * timeScale;
          if (d.lastSpawn > d.nextSpawn && drops.length + newborn.length < cap) {
            newborn.push({
              id: nextDropId++,
              x: d.x + random(-d.r, d.r) * 0.1,
              y: d.y - d.r * 0.01,
              r: d.r * random(0.25, 0.35),
              momentum: d.momentum * 0.1,
              momentumX: d.momentumX * 0.3,
              lastSpawn: 0,
              nextSpawn: random(11, 24),
              spreadX: 0,
              spreadY: d.momentum * 0.1,
              parent: d.id,
              isNew: true,
              killed: false,
              shrink: 0,
            });
            d.r *= Math.pow(0.97, timeScale);
            d.lastSpawn = 0;
            d.nextSpawn = Math.max(10, random(8, 24) - d.momentum * 2 + (maxR - d.r));
          }
          d.y += d.momentum * timeScale;
          d.x += d.momentumX * timeScale;
          eraseSpray(d.x, d.y, d.r * 0.28);
          if (d.y > height + d.r) d.killed = true;
        }
        d.spreadX *= Math.pow(0.4, timeScale);
        d.spreadY *= Math.pow(0.7, timeScale);
        d.momentum *= Math.pow(0.95, timeScale);
        d.momentumX *= Math.pow(0.7, timeScale);
        d.isNew = false;
        if (d.killed) continue;
        const end = Math.min(i + 30, drops.length);
        for (let j = i + 1; j < end; j++) {
          const other = drops[j];
          if (other.killed || d.r <= other.r || d.parent === other.id || other.parent === d.id)
            continue;
          const dx = other.x - d.x,
            dy = other.y - d.y;
          if (dx * dx + dy * dy < Math.pow((d.r + other.r) * 0.45, 2)) {
            d.r = Math.min(maxR, Math.sqrt(d.r * d.r + other.r * other.r * 0.8));
            d.momentum += 1.5;
            d.spreadX = Math.max(d.spreadX, 0.25);
            d.spreadY = Math.max(d.spreadY, 0.15);
            other.killed = true;
          }
        }
      }
      drops = drops.filter((d) => !d.killed);
      drops.push(...newborn);
      wm.setTransform(waterMap.width / width, 0, 0, waterMap.height / height, 0, 0);
      wm.clearRect(0, 0, width, height);
      wm.drawImage(sprayMap, 0, 0, width, height);
      for (const d of drops) {
        const variant = Math.max(0, Math.min(15, Math.floor((d.r - 2) / 1.5))),
          bitmap = depthVariants[variant],
          drawW = d.r * 2 * (1 + d.spreadX),
          drawH = d.r * 3 * (1 + d.spreadY);
        wm.drawImage(bitmap, d.x - drawW / 2, d.y - drawH / 2, drawW, drawH);
      }
      upload(1, waterMap, waterTex);
      wipeOutput.clearRect(0, 0, wipeOutputMap.width, wipeOutputMap.height);
      if (wiping) {
        wipeOutput.globalAlpha = 1;
        wipeOutput.drawImage(wipeMap, 0, 0);
      } else if (lastWipeAt) {
        const progress = Math.min(1, Math.max(0, (now - lastWipeAt) / 6500)),
          eased = progress * progress * (3 - 2 * progress);
        wipeOutput.globalAlpha = 1 - eased;
        wipeOutput.drawImage(wipeMap, 0, 0);
        wipeOutput.globalAlpha = 1;
        if (progress >= 1) {
          wipe.clearRect(0, 0, wipeMap.width, wipeMap.height);
          lastWipeAt = 0;
        }
      }
      upload(2, wipeOutputMap, wipeTex);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden)
        raf = requestAnimationFrame(tick);
    };
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reducedMotion && !raf) {
        previous = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', visibility);
    tick(performance.now());
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', visibility);
      observer.disconnect();
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      gl.deleteTexture(sceneTex);
      gl.deleteTexture(glassSceneTex);
      gl.deleteTexture(waterTex);
      gl.deleteTexture(wipeTex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [intensity, wallpaper, workbench]);
  return (
    <div
      ref={hostRef}
      className={`page-weather-fx page-weather-rain ${workbench ? 'workbench-weather-fx' : ''}`}
      aria-hidden="true"
    >
      <canvas />
    </div>
  );
}
