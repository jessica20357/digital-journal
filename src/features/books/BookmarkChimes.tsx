import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import * as THREE from 'three';

export function BookmarkChimes({
  snow = false,
  soundEnabled = true,
  volume = 0.5,
}: {
  snow?: boolean;
  soundEnabled?: boolean;
  volume?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const masterGainRef = useRef<GainNode | null>(null);
  const soundSettingsRef = useRef({ soundEnabled, volume });
  soundSettingsRef.current = { soundEnabled, volume };
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = soundEnabled ? volume : 0;
  }, [soundEnabled, volume]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    let createdRenderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let disposed = false;
    let audio: AudioContext | undefined;
    let reverbNode: ConvolverNode | undefined;
    let reverbBus: GainNode | undefined;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const pendulums: {
      group: THREE.Group;
      phase: number;
      speed: number;
      amplitude: number;
      velocity: number;
      ropeBend: number;
    }[] = [];
    const ropes: { geometry: THREE.BufferGeometry; anchorX: number; index: number }[] = [];
    const bells: THREE.Object3D[] = [];
    const swayWaves: { origin: number; direction: number; started: number; strength: number }[] =
      [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      createdRenderer = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0, 0);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-6, 6, 3, -0.4, 0.1, 30);
      camera.position.z = 10;
      scene.add(new THREE.HemisphereLight(0xf6fcff, 0x544337, 2.1));
      const warm = new THREE.DirectionalLight(0xffdfad, 2.6);
      warm.position.set(-3, 5, 5);
      scene.add(warm);
      const cool = new THREE.DirectionalLight(0xbceeff, 2.3);
      cool.position.set(3, 1, 4);
      scene.add(cool);

      const palettes = [
        { cord: '#65ad55', paper: '#e8f2da', flower: '#e79e9c', leaf: '#639a57', glass: '#c9f0cc' },
        { cord: '#74a9d0', paper: '#e5f0f5', flower: '#e9c84d', leaf: '#68aab4', glass: '#c6eaff' },
        { cord: '#c27657', paper: '#f4e4d9', flower: '#dc805e', leaf: '#6c9e73', glass: '#ffd5c4' },
        { cord: '#9dae49', paper: '#f0eed9', flower: '#e9e2bd', leaf: '#859b43', glass: '#eff3c5' },
        { cord: '#4d7896', paper: '#e5eee4', flower: '#91b999', leaf: '#568b77', glass: '#c9e7ee' },
        { cord: '#659954', paper: '#e3f0e2', flower: '#8abf82', leaf: '#528d5b', glass: '#d0edce' },
        { cord: '#708d4c', paper: '#ecedd3', flower: '#e2ad63', leaf: '#5f8a50', glass: '#e9edbd' },
      ];
      const glassMaterials = palettes.map((palette) => {
        const material = new THREE.MeshPhysicalMaterial({
          color: palette.glass,
          roughness: 0.035,
          metalness: 0.015,
          transmission: 0.74,
          thickness: 1.25,
          ior: 1.24,
          transparent: true,
          opacity: 0.42,
          clearcoat: 1,
          clearcoatRoughness: 0.025,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        materials.push(material);
        return material;
      });
      const rimMaterials = palettes.map((color) => {
        const material = new THREE.MeshStandardMaterial({
          color: color.cord,
          roughness: 0.31,
          metalness: 0.12,
          transparent: true,
          opacity: 0.84,
        });
        materials.push(material);
        return material;
      });
      const globeGeometry = new THREE.SphereGeometry(0.42, 32, 24);
      geometries.push(globeGeometry);
      const beadGeometry = new THREE.SphereGeometry(0.045, 16, 12);
      geometries.push(beadGeometry);
      const snowCapGeometry = new THREE.SphereGeometry(0.405, 32, 18, 0, Math.PI * 2, 0, 0.72);
      geometries.push(snowCapGeometry);
      const snowCapMaterial = new THREE.MeshBasicMaterial({
        color: 0xf7fbfa,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      materials.push(snowCapMaterial);
      const bookmarkShape = new THREE.Shape();
      bookmarkShape.moveTo(-0.16, 0.42);
      bookmarkShape.lineTo(0.16, 0.42);
      bookmarkShape.lineTo(0.16, -0.39);
      bookmarkShape.lineTo(0, -0.31);
      bookmarkShape.lineTo(-0.16, -0.39);
      bookmarkShape.closePath();
      const bookmarkGeometry = new THREE.ExtrudeGeometry(bookmarkShape, {
        depth: 0.025,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.012,
        bevelThickness: 0.008,
      });
      geometries.push(bookmarkGeometry);
      const tagSnowShape = new THREE.Shape();
      tagSnowShape.moveTo(-0.18, -1.22);
      tagSnowShape.lineTo(0.18, -1.22);
      tagSnowShape.lineTo(0.18, -1.12);
      for (let i = 1; i <= 20; i++) {
        const x = 0.18 - (i * 0.36) / 20;
        tagSnowShape.lineTo(x, -1.115 + Math.sin(i * 0.82) * 0.014 + Math.sin(i * 0.31) * 0.009);
      }
      tagSnowShape.closePath();
      const tagSnowGeometry = new THREE.ShapeGeometry(tagSnowShape, 8);
      geometries.push(tagSnowGeometry);
      const tagSnowMaterial = new THREE.MeshBasicMaterial({
        color: 0xf5faf9,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      materials.push(tagSnowMaterial);
      const positions = [0.15, 0.26, 0.37, 0.49, 0.6, 0.71, 0.8];
      const hangingHeights = [2.2, 1.95, 2.35, 2.03, 2.25, 1.9, 2.18];
      const ornamentScales = [0.83, 1.08, 0.92, 1.14, 0.86, 1.04, 0.9];
      const floralTextures: THREE.CanvasTexture[] = [];
      const innerTextures: THREE.CanvasTexture[] = [];
      const bookmarkMaterials = palettes.map((palette, index) => {
        const art = document.createElement('canvas');
        art.width = 256;
        art.height = 512;
        const paint = art.getContext('2d');
        if (!paint) throw new Error('bookmark artwork unavailable');
        const wash = paint.createLinearGradient(0, 0, 256, 512);
        wash.addColorStop(0, palette.paper);
        wash.addColorStop(1, index % 2 ? '#cfe2d4' : '#f6d9c8');
        paint.fillStyle = wash;
        paint.fillRect(0, 0, 256, 512);
        for (let mark = 0; mark < 38; mark++) {
          const x = ((mark * 67 + index * 31) % 244) + 6,
            y = ((mark * 109 + index * 57) % 500) + 6;
          const radius = 5 + (mark % 4) * 2;
          paint.globalAlpha = 0.24 + (mark % 3) * 0.08;
          if (mark % 3 === 0) {
            paint.fillStyle = palette.leaf;
            paint.save();
            paint.translate(x, y);
            paint.rotate((mark % 5) * 0.55);
            paint.beginPath();
            paint.ellipse(0, 0, radius * 1.8, radius * 0.7, 0, 0, Math.PI * 2);
            paint.fill();
            paint.strokeStyle = '#fff9';
            paint.lineWidth = 1;
            paint.beginPath();
            paint.moveTo(-radius, 0);
            paint.lineTo(radius, 0);
            paint.stroke();
            paint.restore();
          } else {
            paint.fillStyle = palette.flower;
            for (let petal = 0; petal < 5; petal++) {
              paint.save();
              paint.translate(x, y);
              paint.rotate((petal * Math.PI * 2) / 5);
              paint.beginPath();
              paint.ellipse(0, -radius * 0.78, radius * 0.48, radius * 0.8, 0, 0, Math.PI * 2);
              paint.fill();
              paint.restore();
            }
            paint.fillStyle = '#e3b65a';
            paint.beginPath();
            paint.arc(x, y, radius * 0.24, 0, Math.PI * 2);
            paint.fill();
          }
        }
        paint.globalAlpha = 1;
        const texture = new THREE.CanvasTexture(art);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        floralTextures.push(texture);
        const innerArt = document.createElement('canvas');
        innerArt.width = 256;
        innerArt.height = 256;
        const innerPaint = innerArt.getContext('2d');
        if (!innerPaint) throw new Error('glass illustration unavailable');
        innerPaint.strokeStyle = `${palette.leaf}cc`;
        innerPaint.lineWidth = 5;
        innerPaint.lineCap = 'round';
        innerPaint.beginPath();
        innerPaint.moveTo(128, 242);
        innerPaint.bezierCurveTo(116, 197, 151, 168, 130, 120);
        innerPaint.stroke();
        for (let leafIndex = 0; leafIndex < 6; leafIndex++) {
          const y = 150 + leafIndex * 13;
          const side = leafIndex % 2 ? 1 : -1;
          innerPaint.fillStyle = `${palette.leaf}b8`;
          innerPaint.beginPath();
          innerPaint.ellipse(128 + side * 20, y, 17, 7, side * -0.55, 0, Math.PI * 2);
          innerPaint.fill();
        }
        [
          [80, 94],
          [132, 72],
          [181, 105],
        ].forEach(([x, y], flowerIndex) => {
          innerPaint.fillStyle = flowerIndex % 2 ? '#f3d77c' : palette.flower;
          for (let petal = 0; petal < 5; petal++) {
            innerPaint.save();
            innerPaint.translate(x, y);
            innerPaint.rotate((petal * Math.PI * 2) / 5);
            innerPaint.beginPath();
            innerPaint.ellipse(0, -13, 7, 13, 0, 0, Math.PI * 2);
            innerPaint.fill();
            innerPaint.restore();
          }
          innerPaint.fillStyle = '#d8a85e';
          innerPaint.beginPath();
          innerPaint.arc(x, y, 5, 0, Math.PI * 2);
          innerPaint.fill();
        });
        const innerTexture = new THREE.CanvasTexture(innerArt);
        innerTexture.colorSpace = THREE.SRGBColorSpace;
        innerTextures.push(innerTexture);
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.88,
          side: THREE.DoubleSide,
        });
        materials.push(material);
        return material;
      });
      const positionsList = positions;
      positions.forEach((fraction, index) => {
        const anchorX = (fraction - 0.5) * camera.right * 2;
        const pendulum = new THREE.Group();
        pendulum.position.set(anchorX, hangingHeights[index], 0);
        pendulum.scale.setScalar(ornamentScales[index]);
        scene.add(pendulum);
        pendulums.push({
          group: pendulum,
          phase: index * 1.17,
          speed: 0.82 + (index % 3) * 0.16,
          amplitude: 0.31 + (index % 2) * 0.06,
          velocity: 0,
          ropeBend: 0,
        });
        const palette = palettes[index];
        const cord = new THREE.LineBasicMaterial({
          color: palette.cord,
          transparent: true,
          opacity: 0.92,
        });
        materials.push(cord);
        // Each thread reaches the top edge of the visible canvas; the lower end
        // meets the crown of the glass globe.
        // The anchor stays pinned to the page edge while the thread bends
        // softly between the anchor and the moving glass globe.
        const ropeGeometry = new THREE.BufferGeometry();
        ropeGeometry.setAttribute(
          'position',
          new THREE.BufferAttribute(new Float32Array(17 * 3), 3).setUsage(THREE.DynamicDrawUsage),
        );
        geometries.push(ropeGeometry);
        scene.add(new THREE.Line(ropeGeometry, cord));
        ropes.push({ geometry: ropeGeometry, anchorX, index });
        const globePivot = new THREE.Group();
        globePivot.position.y = -0.38;
        pendulum.add(globePivot);
        const globe = new THREE.Mesh(globeGeometry, glassMaterials[index]);
        globe.scale.setScalar(1);
        globePivot.add(globe);
        bells.push(globe);
        globe.userData.pendulumIndex = index;
        const snowCap = new THREE.Mesh(snowCapGeometry, snowCapMaterial);
        snowCap.position.y = 0.025;
        snowCap.visible = snow;
        globePivot.add(snowCap);
        const floralGeometry = new THREE.PlaneGeometry(0.67, 0.54);
        geometries.push(floralGeometry);
        const floralMaterial = new THREE.MeshBasicMaterial({
          map: innerTextures[index],
          transparent: true,
          opacity: 0.94,
          depthTest: false,
          side: THREE.DoubleSide,
        });
        materials.push(floralMaterial);
        const floral = new THREE.Mesh(floralGeometry, floralMaterial);
        floral.scale.set(1, 0.78, 1);
        floral.position.set(0, -0.01, 0.28);
        floral.renderOrder = 1;
        globePivot.add(floral);
        const reflectionCurve = new THREE.EllipseCurve(
          -0.12,
          0.105,
          0.205,
          0.205,
          0.18,
          2.08,
          false,
          0,
        );
        const reflectionGeometry = new THREE.BufferGeometry().setFromPoints(
          reflectionCurve.getPoints(30).map((point) => new THREE.Vector3(point.x, point.y, 0.31)),
        );
        geometries.push(reflectionGeometry);
        const reflectionMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.82,
        });
        materials.push(reflectionMaterial);
        globePivot.add(new THREE.Line(reflectionGeometry, reflectionMaterial));
        const hangingPin = new THREE.Mesh(beadGeometry, rimMaterials[index]);
        hangingPin.position.set(0, -0.39, 0.03);
        globePivot.add(hangingPin);
        const tagCord = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -0.72, 0.03),
          new THREE.Vector3(0, -1.14, 0.03),
        ]);
        geometries.push(tagCord);
        pendulum.add(new THREE.Line(tagCord, cord));
        const bookmark = new THREE.Mesh(bookmarkGeometry, bookmarkMaterials[index]);
        bookmark.position.set(0, -1.55, 0);
        bookmark.userData.pendulumIndex = index;
        pendulum.add(bookmark);
        bells.push(bookmark);
        const tagSnow = new THREE.Mesh(tagSnowGeometry, tagSnowMaterial);
        tagSnow.position.z = 0.03;
        tagSnow.visible = snow;
        pendulum.add(tagSnow);
        const eye = new THREE.Mesh(beadGeometry, rimMaterials[index]);
        eye.scale.set(0.75, 0.75, 0.75);
        eye.position.set(0, -1.14, 0.045);
        pendulum.add(eye);
      });

      const resize = () => {
        if (!host.clientWidth || !host.clientHeight) return;
        const aspect = host.clientWidth / host.clientHeight;
        camera.left = -1.7 * aspect;
        camera.right = 1.7 * aspect;
        camera.top = 3;
        camera.bottom = -0.4;
        camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight, false);
        pendulums.forEach((pendulum, i) => {
          pendulum.group.position.x = (positionsList[i] - 0.5) * camera.right * 2;
          pendulum.group.scale.setScalar(ornamentScales[i] * (host.clientWidth < 720 ? 0.82 : 1));
        });
        ropes.forEach((rope) => {
          rope.anchorX = (positionsList[rope.index] - 0.5) * camera.right * 2;
        });
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();
      const pickBell = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(bells, false)[0]?.object;
      };
      let hoveredBell: THREE.Object3D | undefined;
      let previousBellIndex: number | undefined;
      let previousPointer: { x: number; y: number; time: number } | undefined;
      const ring = (bellIndex: number, sweepDirection: number) => {
        try {
          audio ||= new AudioContext();
          if (!masterGainRef.current) {
            masterGainRef.current = audio.createGain();
            masterGainRef.current.gain.value = soundSettingsRef.current.soundEnabled
              ? soundSettingsRef.current.volume
              : 0;
            masterGainRef.current.connect(audio.destination);
          }
          if (audio.state === 'suspended') void audio.resume();
          const now = audio.currentTime;
          // Seven bells play the first score line left-to-right and the second
          // line right-to-left. Reverse the second line for physical left-to-right indices.
          const firstLine = [440, 493.88, 523.25, 493.88, 523.25, 659.25, 493.88]; // 6 7 1̇ 7 1̇ 3̇ 7
          const secondLineRightToLeft = [659.25, 659.25, 440, 392, 440, 523.25, 392]; // 3 3 6 5 6 1̇ 5
          const secondLineLeftToRight = [...secondLineRightToLeft].reverse();
          const notes = sweepDirection >= 0 ? firstLine : secondLineLeftToRight;
          const fundamental = notes[bellIndex % notes.length];
          if (!reverbNode || !reverbBus) {
            const impulseLength = Math.floor(audio.sampleRate * 2.8);
            const impulse = audio.createBuffer(2, impulseLength, audio.sampleRate);
            for (let channel = 0; channel < 2; channel++) {
              const data = impulse.getChannelData(channel);
              for (let sample = 0; sample < impulseLength; sample++) {
                const fade = 1 - sample / impulseLength;
                data[sample] = (Math.random() * 2 - 1) * fade * fade * fade * 0.22;
              }
            }
            reverbNode = audio.createConvolver();
            reverbNode.buffer = impulse;
            reverbBus = audio.createGain();
            reverbBus.gain.value = 0.52;
            reverbNode.connect(reverbBus);
            reverbBus.connect(masterGainRef.current);
          }
          [fundamental, fundamental * 2.756, fundamental * 4.18].forEach((frequency, index) => {
            const oscillator = audio!.createOscillator();
            const gain = audio!.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, now);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.997, now + 0.08);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime([0.13, 0.035, 0.014][index], now + 0.004);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + [1.5, 1.05, 0.72][index]);
            oscillator.connect(gain);
            gain.connect(masterGainRef.current!);
            gain.connect(reverbNode!);
            oscillator.start(now);
            oscillator.stop(now + 1.7);
          });
        } catch {
          /* sound remains optional where Web Audio is unavailable */
        }
      };
      const onMove = (event: PointerEvent) => {
        const bell = pickBell(event);
        renderer.domElement.style.cursor = bell ? 'grab' : 'default';
        const now = performance.now();
        const cursorSpeed = previousPointer
          ? Math.hypot(event.clientX - previousPointer.x, event.clientY - previousPointer.y) /
            Math.max(0.008, (now - previousPointer.time) / 1000)
          : 500;
        const speedFactor = Math.min(1.6, Math.max(0.12, cursorSpeed / 1100));
        if (bell && bell !== hoveredBell) {
          const index = Number(bell.userData.pendulumIndex);
          const deltaX = previousPointer ? event.clientX - previousPointer.x : 0;
          const bellDelta = previousBellIndex === undefined ? 0 : index - previousBellIndex;
          const sweepDirection = Math.sign(bellDelta || deltaX || 1);
          const direction = sweepDirection * speedFactor;
          pendulums[index].velocity = Math.max(
            -6.2,
            Math.min(6.2, pendulums[index].velocity + direction * 2.8),
          );
          pendulums[index].ropeBend = Math.max(
            -1.8,
            Math.min(1.8, pendulums[index].ropeBend - direction),
          );
          swayWaves.push({
            origin: index,
            direction: Math.sign(direction),
            started: now,
            strength: direction * 2.2,
          });
          if (soundEnabledRef.current) ring(index, sweepDirection);
          previousBellIndex = index;
        }
        hoveredBell = bell;
        previousPointer = { x: event.clientX, y: event.clientY, time: now };
      };
      const onLeave = () => {
        hoveredBell = undefined;
        previousBellIndex = undefined;
        previousPointer = undefined;
        renderer.domElement.style.cursor = 'default';
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerleave', onLeave);
      let last = performance.now();
      const render = (time: number) => {
        frame = requestAnimationFrame(render);
        if (disposed) return;
        const delta = Math.min(0.05, (time - last) / 1000);
        last = time;
        pendulums.forEach((item, index) => {
          const wind = Math.sin(time * 0.0011 * item.speed + item.phase) * item.amplitude;
          let wave = 0;
          swayWaves.forEach((ripple) => {
            const distance = (index - ripple.origin) * ripple.direction;
            if (distance < 1 || distance > 3) return;
            const age = (time - ripple.started) / 1000 - distance * 0.13;
            if (age >= 0 && age < 0.58)
              wave +=
                ripple.strength *
                Math.exp(-distance * 0.58) *
                Math.sin((Math.PI * age) / 0.58) *
                2.4;
          });
          item.velocity +=
            (-item.group.rotation.z * 7.2 - item.velocity * 2.15 + wind + wave) * delta;
          item.group.rotation.z += item.velocity * delta;
          item.ropeBend *= Math.exp(-4.6 * delta);
        });
        ropes.forEach((rope) => {
          const item = pendulums[rope.index];
          const end = item.group.localToWorld(new THREE.Vector3(0, 0.035, 0.035));
          const start = new THREE.Vector3(rope.anchorX, 2.99, 0.035);
          const sag =
            0.035 +
            Math.min(0.2, Math.abs(item.ropeBend) * 0.095 + Math.abs(item.velocity) * 0.018);
          const control = new THREE.Vector3(
            (start.x + end.x) * 0.5 -
              item.group.rotation.z * 0.11 +
              item.ropeBend * 0.13 -
              item.velocity * 0.025,
            (start.y + end.y) * 0.5 - sag,
            0.035,
          );
          const positions = rope.geometry.getAttribute('position') as THREE.BufferAttribute;
          for (let point = 0; point < 17; point++) {
            const t = point / 16,
              inverse = 1 - t;
            positions.setXYZ(
              point,
              inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
              inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
              inverse * inverse * start.z + 2 * inverse * t * control.z + t * t * end.z,
            );
          }
          positions.needsUpdate = true;
          rope.geometry.computeBoundingSphere();
        });
        for (let i = swayWaves.length - 1; i >= 0; i--)
          if (time - swayWaves[i].started > 1150) swayWaves.splice(i, 1);
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(render);
      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerleave', onLeave);
        masterGainRef.current = null;
        void audio?.close();
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        [...floralTextures, ...innerTextures].forEach((texture) => texture.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    } catch {
      createdRenderer?.dispose();
      return;
    }
  }, [snow]);
  return (
    <div ref={hostRef} className="bookmark-chimes-layer" aria-label="可拨动的檀木书签与玻璃风铃" />
  );
}
