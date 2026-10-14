import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import * as THREE from 'three';

export function BookCover3D({
  title,
  coverColor,
  ribbonColor,
  image,
  snow = false,
}: {
  title: string;
  coverColor: string;
  ribbonColor: string;
  image?: string;
  snow?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    let frame = 0;
    let disposed = false;
    let texture: THREE.CanvasTexture | undefined;
    let shadowTexture: THREE.CanvasTexture | undefined;
    const geometries: THREE.BufferGeometry[] = [];
    let materials: THREE.Material[] = [];
    let book: THREE.Group | undefined;
    let pointer = { x: 0, y: 0, inside: false };
    let smooth = { x: 0, y: 0, lift: 0 };
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      host.prepend(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        31,
        host.clientWidth / Math.max(1, host.clientHeight),
        0.1,
        30,
      );
      camera.position.set(0, 0.12, 7.5);
      scene.add(new THREE.HemisphereLight(0xfff8e8, 0x45483f, 2.25));
      const key = new THREE.DirectionalLight(0xfff5df, 3.2);
      key.position.set(-3.5, 5, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xd3e0dd, 1.6);
      rim.position.set(4, 1, -3);
      scene.add(rim);

      const coverCanvas = document.createElement('canvas');
      coverCanvas.width = 768;
      coverCanvas.height = 1080;
      const ctx = coverCanvas.getContext('2d');
      if (!ctx) throw new Error('Unable to create cover canvas');
      const paintCover = (source?: HTMLImageElement) => {
        if (disposed) return;
        ctx.clearRect(0, 0, coverCanvas.width, coverCanvas.height);
        ctx.fillStyle = coverColor;
        ctx.fillRect(0, 0, coverCanvas.width, coverCanvas.height);
        if (source?.complete && source.naturalWidth > 0) {
          const scale = Math.max(
            coverCanvas.width / source.naturalWidth,
            coverCanvas.height / source.naturalHeight,
          );
          const width = source.naturalWidth * scale,
            height = source.naturalHeight * scale;
          ctx.drawImage(
            source,
            (coverCanvas.width - width) / 2,
            (coverCanvas.height - height) / 2,
            width,
            height,
          );
        }
        ctx.fillStyle = `${ribbonColor}c9`;
        ctx.fillRect(74, 0, 110, coverCanvas.height);
        ctx.fillStyle = '#ffffff42';
        ctx.fillRect(74, 0, 3, coverCanvas.height);
        ctx.fillStyle = '#00000012';
        ctx.fillRect(181, 0, 3, coverCanvas.height);
        if (texture) texture.needsUpdate = true;
      };
      paintCover();
      texture = new THREE.CanvasTexture(coverCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (image) {
        const img = new Image();
        img.onload = () => paintCover(img);
        img.src = image;
      }

      const edge = new THREE.MeshStandardMaterial({
        color: new THREE.Color(coverColor).multiplyScalar(0.72),
        roughness: 0.83,
      });
      const pagesMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e3, roughness: 0.96 });
      const front = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.76,
        metalness: 0.02,
      });
      const rear = new THREE.MeshStandardMaterial({
        color: new THREE.Color(coverColor).multiplyScalar(0.62),
        roughness: 0.9,
      });
      const spine = new THREE.MeshStandardMaterial({
        color: new THREE.Color(coverColor).multiplyScalar(0.68),
        roughness: 0.84,
      });
      materials = [pagesMat, edge, front, rear, spine];
      book = new THREE.Group();
      const addBlock = (
        width: number,
        height: number,
        depth: number,
        blockMaterials: THREE.Material[],
        z: number,
        x = 0,
      ) => {
        const blockGeometry = new THREE.BoxGeometry(width, height, depth);
        geometries.push(blockGeometry);
        const mesh = new THREE.Mesh(blockGeometry, blockMaterials);
        mesh.position.set(x, 0, z);
        book!.add(mesh);
      };
      // Page block, rear board, raised front board, and a rounded-looking spine form a real book silhouette.
      addBlock(
        1.98,
        2.82,
        0.27,
        [pagesMat, pagesMat, pagesMat, pagesMat, pagesMat, pagesMat],
        -0.005,
      );
      addBlock(2.08, 2.94, 0.105, [rear, spine, rear, rear, rear, rear], -0.195);
      addBlock(2.08, 2.94, 0.105, [pagesMat, spine, pagesMat, pagesMat, front, rear], 0.195);
      addBlock(0.16, 2.94, 0.42, [spine, spine, spine, spine, spine, spine], -0.98);
      const snowShape = new THREE.Shape();
      snowShape.moveTo(-1.08, 1.455);
      snowShape.lineTo(1.08, 1.455);
      snowShape.lineTo(1.08, 1.5);
      for (let i = 1; i <= 64; i++) {
        const x = 1.08 - (i * 2.16) / 64;
        const wave =
          Math.sin(i * 0.62) * 0.025 +
          Math.sin(i * 0.24 + 0.8) * 0.018 +
          Math.max(0, Math.sin(i * 0.14)) * 0.025;
        snowShape.lineTo(x, 1.5 + wave);
      }
      snowShape.closePath();
      const snowGeometry = new THREE.ShapeGeometry(snowShape, 10);
      geometries.push(snowGeometry);
      const snowMaterial = new THREE.MeshBasicMaterial({
        color: 0xf5f8f5,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      materials.push(snowMaterial);
      const snowDrift = new THREE.Mesh(snowGeometry, snowMaterial);
      snowDrift.position.z = 0.19;
      snowDrift.visible = snow;
      book.add(snowDrift);
      book.rotation.y = -0.3;
      book.rotation.x = 0.035;
      scene.add(book);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = shadowCanvas.height = 256;
      const shadowContext = shadowCanvas.getContext('2d');
      if (shadowContext) {
        const gradient = shadowContext.createRadialGradient(128, 128, 5, 128, 128, 124);
        gradient.addColorStop(0, 'rgba(26,28,24,.3)');
        gradient.addColorStop(0.34, 'rgba(26,28,24,.22)');
        gradient.addColorStop(0.68, 'rgba(26,28,24,.08)');
        gradient.addColorStop(1, 'rgba(26,28,24,0)');
        shadowContext.fillStyle = gradient;
        shadowContext.fillRect(0, 0, 256, 256);
        shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      }
      const shadowGeometry = new THREE.PlaneGeometry(2.75, 1.05);
      geometries.push(shadowGeometry);
      const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        toneMapped: false,
      });
      materials.push(shadowMaterial);
      const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadow.position.set(0.2, -1.505, -0.09);
      shadow.rotation.x = -Math.PI / 2;
      scene.add(shadow);
      const contactGeometry = new THREE.PlaneGeometry(2.12, 0.42);
      geometries.push(contactGeometry);
      const contactMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        toneMapped: false,
      });
      materials.push(contactMaterial);
      const contactShadow = new THREE.Mesh(contactGeometry, contactMaterial);
      contactShadow.position.set(0.03, -1.493, 0.045);
      contactShadow.rotation.x = -Math.PI / 2;
      scene.add(contactShadow);

      const resize = () => {
        if (!renderer || !host.clientWidth || !host.clientHeight) return;
        renderer.setSize(host.clientWidth, host.clientHeight, false);
        camera.aspect = host.clientWidth / host.clientHeight;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      const move = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        pointer = {
          x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
          inside: true,
        };
        if (!frame) frame = requestAnimationFrame(render);
      };
      const leave = () => {
        pointer = { ...pointer, inside: false };
        if (!frame) frame = requestAnimationFrame(render);
      };
      const targetRotation = () => ({
        x: pointer.inside ? 0.035 + pointer.y * 0.14 : 0.035,
        y: pointer.inside ? -0.3 + pointer.x * 0.24 : -0.3,
        lift: pointer.inside ? 0.13 : 0,
      });
      const render = () => {
        frame = 0;
        if (disposed) return;
        const target = targetRotation();
        smooth.x += (target.x - smooth.x) * 0.11;
        smooth.y += (target.y - smooth.y) * 0.11;
        smooth.lift += (target.lift - smooth.lift) * 0.12;
        book!.rotation.x = smooth.x;
        book!.rotation.y = smooth.y;
        book!.position.y = smooth.lift;
        renderer.render(scene, camera);
        if (
          pointer.inside ||
          Math.abs(target.x - smooth.x) +
            Math.abs(target.y - smooth.y) +
            Math.abs(target.lift - smooth.lift) >
            0.001
        )
          frame = requestAnimationFrame(render);
      };
      host.addEventListener('pointermove', move);
      host.addEventListener('pointerleave', leave);
      render();
      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        host.removeEventListener('pointermove', move);
        host.removeEventListener('pointerleave', leave);
        geometries.forEach((item) => item.dispose());
        materials.forEach((material) => material.dispose());
        texture?.dispose();
        shadowTexture?.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    } catch {
      setFallback(true);
      return;
    }
  }, [coverColor, ribbonColor, image, snow]);

  return (
    <span ref={hostRef} className="cover-3d-shell" aria-label={`${title} 纯色或图片封面，带彩带`}>
      {fallback && (
        <span
          className="cover-3d-fallback"
          style={{
            backgroundColor: coverColor,
            backgroundImage: image ? `url("${image}")` : undefined,
          }}
        >
          <em style={{ backgroundColor: ribbonColor }} />
        </span>
      )}
    </span>
  );
}
