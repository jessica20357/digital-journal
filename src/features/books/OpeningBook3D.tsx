import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import * as THREE from 'three';
import type { ShelfBook } from '../../domain/journal';

export function OpeningBook3D({ book: openingBook }: { book: ShelfBook }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let disposed = false;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    try {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      host.replaceChildren(renderer.domElement);

      const scene = new THREE.Scene();
      const aspect = width / height;
      const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 40);
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      camera.position.set(
        0,
        0.38,
        Math.max(
          4.4,
          1.18 * Math.max(2.42 / Math.tan(halfFov), 3.32 / (Math.tan(halfFov) * aspect)),
        ),
      );
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.HemisphereLight(0xfffaf0, 0x57564e, 2));
      const key = new THREE.DirectionalLight(0xfff4df, 2.8);
      key.position.set(-2.8, 4.4, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xc8d9d4, 1.1);
      fill.position.set(3, -0.5, 2.2);
      scene.add(fill);
      const bookRoot = new THREE.Group();
      // Keep the book itself centered in the viewport across portrait and
      // landscape canvases; the camera's framing leaves room around the spread.
      bookRoot.position.set(-1.3, 0.8, 0);
      scene.add(bookRoot);

      const coverColor = openingBook.coverColor || '#b5b39e';
      const ribbonColor = openingBook.ribbonColor || '#ece3cc';
      const paper = new THREE.MeshStandardMaterial({ color: 0xf7f4eb, roughness: 0.96 });
      const paperEdge = new THREE.MeshStandardMaterial({ color: 0xe0dacd, roughness: 0.88 });
      const boardEdge = new THREE.MeshStandardMaterial({
        color: new THREE.Color(coverColor).multiplyScalar(0.68),
        roughness: 0.84,
      });
      // The animation uses a plain physical cover instead of the shelf's cover-image
      // artwork, so that image can never appear to linger over the inside pages.
      const coverFront = new THREE.MeshStandardMaterial({
        color: coverColor,
        roughness: 0.78,
        metalness: 0.01,
      });
      const coverBack = new THREE.MeshStandardMaterial({ color: 0xf5f1e7, roughness: 0.94 });
      materials.push(paper, paperEdge, boardEdge, coverFront, coverBack);

      const pageGeometry = new THREE.BoxGeometry(1.6, 2.4, 0.06);
      geometries.push(pageGeometry);
      const pageMaterials = [paperEdge, paperEdge, paperEdge, paperEdge, paper, paper];
      const leftPages = new THREE.Mesh(pageGeometry, pageMaterials);
      leftPages.position.set(-0.81, 0, -0.025);
      bookRoot.add(leftPages);
      const rightPages = new THREE.Mesh(pageGeometry, pageMaterials);
      rightPages.position.set(0.81, 0, -0.025);
      bookRoot.add(rightPages);
      const gutterGeometry = new THREE.PlaneGeometry(0.08, 2.32);
      geometries.push(gutterGeometry);
      const gutterMaterial = new THREE.MeshBasicMaterial({
        color: 0x786f60,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      });
      materials.push(gutterMaterial);
      const gutter = new THREE.Mesh(gutterGeometry, gutterMaterial);
      gutter.position.set(0, 0, 0.047);
      bookRoot.add(gutter);

      const hinge = new THREE.Group();
      hinge.position.set(0, 0, 0.012);
      bookRoot.add(hinge);
      const coverGeometry = new THREE.BoxGeometry(1.61, 2.4, 0.018);
      geometries.push(coverGeometry);
      const coverSheet = new THREE.Mesh(coverGeometry, [
        boardEdge,
        boardEdge,
        boardEdge,
        boardEdge,
        coverFront,
        coverBack,
      ]);
      coverSheet.position.set(0.805, 0, 0);
      hinge.add(coverSheet);
      const ribbonMaterial = new THREE.MeshStandardMaterial({
        color: ribbonColor,
        roughness: 0.88,
        transparent: true,
        opacity: 0.8,
      });
      const ribbonGeometry = new THREE.PlaneGeometry(0.23, 2.34);
      geometries.push(ribbonGeometry);
      materials.push(ribbonMaterial);
      const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
      ribbon.position.set(0.3, 0, 0.01);
      hinge.add(ribbon);

      const pageTurnPivots: THREE.Group[] = [];
      const leafGeometry = new THREE.BoxGeometry(1.6, 2.385, 0.004);
      geometries.push(leafGeometry);
      const leafPaper = new THREE.MeshStandardMaterial({
        color: 0xfaf8f1,
        roughness: 0.985,
        side: THREE.DoubleSide,
      });
      const leafEdges = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.96 });
      materials.push(leafPaper, leafEdges);
      for (let index = 0; index < 3; index++) {
        const pagePivot = new THREE.Group();
        pagePivot.position.set(0, 0, 0.024 + index * 0.003);
        const leaf = new THREE.Mesh(leafGeometry, [
          leafEdges,
          leafEdges,
          leafEdges,
          leafEdges,
          leafPaper,
          leafPaper,
        ]);
        leaf.position.x = 0.8;
        pagePivot.add(leaf);
        bookRoot.add(pagePivot);
        pageTurnPivots.push(pagePivot);
      }

      const resize = () => {
        if (!renderer || !host.clientWidth || !host.clientHeight) return;
        renderer.setSize(host.clientWidth, host.clientHeight, false);
        camera.aspect = host.clientWidth / host.clientHeight;
        const newAspect = camera.aspect;
        camera.position.set(
          0,
          0.38,
          Math.max(
            4.4,
            1.18 * Math.max(2.42 / Math.tan(halfFov), 3.32 / (Math.tan(halfFov) * newAspect)),
          ),
        );
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const coverDuration = 720;
      const pageFlipStart = 620;
      const pageFlipStagger = 210;
      const pageFlipDuration = 390;
      const duration =
        pageFlipStart + pageFlipStagger * (pageTurnPivots.length - 1) + pageFlipDuration;
      const start = performance.now();
      const render = (now: number) => {
        if (disposed || !renderer) return;
        const elapsed = now - start;
        const coverProgress = reducedMotion ? 1 : Math.min(1, elapsed / coverDuration);
        hinge.rotation.y = -Math.PI * (1 - Math.pow(1 - coverProgress, 3));
        pageTurnPivots.forEach((pivot, index) => {
          const progress = reducedMotion
            ? 1
            : Math.max(
                0,
                Math.min(1, (elapsed - pageFlipStart - index * pageFlipStagger) / pageFlipDuration),
              );
          pivot.rotation.y = -Math.PI * (1 - Math.pow(1 - progress, 3));
        });
        renderer.render(scene, camera);
        if (elapsed < duration && !document.hidden) frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        renderer?.dispose();
        renderer?.domElement.remove();
      };
    } catch {
      const fallback = document.createElement('div');
      fallback.className = 'opening-book-fallback';
      const front = document.createElement('span');
      front.className = 'opening-book-fallback-front';
      front.style.backgroundColor = openingBook.coverColor || '#b5b39e';
      front.style.backgroundImage = `linear-gradient(90deg, transparent 0 18%, ${openingBook.ribbonColor || '#ece3cc'}cc 18% 32%, transparent 32%)`;
      const back = document.createElement('span');
      back.className = 'opening-book-fallback-back';
      fallback.append(front, back);
      host.replaceChildren(fallback);
      return () => host.replaceChildren();
    }
  }, [openingBook]);

  return <div ref={hostRef} className="opening-book-canvas" />;
}
