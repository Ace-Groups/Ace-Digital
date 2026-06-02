import { useEffect, useRef } from "react";
import aceLogo from "@/assets/ace-logo.png";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

type AceLogoParticlesProps = {
  className?: string;
  size?: number;
  widthScale?: number;
  particleSize?: number;
  interactive?: boolean;
  sampleStep?: number;
  /** Supersampling + bloom; use "balanced" on small mobile previews */
  quality?: "high" | "balanced";
};

type PointerState = {
  x: number | null;
  y: number | null;
  radius: number;
};

class Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  density: number;
  phase: number;

  constructor(x: number, y: number, r: number, g: number, b: number, radius: number) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.r = r;
    this.g = g;
    this.b = b;
    this.radius = radius;
    this.density = Math.random() * 14 + 4;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(pointer: PointerState, time: number) {
    const drift = 0.35;
    const idleX = Math.sin(time * 0.0012 + this.phase) * drift;
    const idleY = Math.cos(time * 0.001 + this.phase * 1.3) * drift;
    const targetX = this.baseX + idleX;
    const targetY = this.baseY + idleY;

    if (pointer.x != null && pointer.y != null) {
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

      if (distance < pointer.radius) {
        const force = (pointer.radius - distance) / pointer.radius;
        this.x -= (dx / distance) * force * this.density;
        this.y -= (dy / distance) * force * this.density;
      } else {
        this.x += (targetX - this.x) * 0.06;
        this.y += (targetY - this.y) * 0.06;
      }
    } else {
      this.x += (targetX - this.x) * 0.06;
      this.y += (targetY - this.y) * 0.06;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y, radius, r, g, b } = this;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.98)`);
    gradient.addColorStop(0.45, `rgba(${r},${g},${b},0.55)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function setupSmoothContext(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

export function AceLogoParticles({
  className,
  size = 280,
  widthScale = 1,
  particleSize = 2.5,
  interactive = true,
  sampleStep = 2,
  quality = "high",
}: AceLogoParticlesProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef<PointerState>({ x: null, y: null, radius: 160 });
  const rafRef = useRef<number>(0);
  const visibleRef = useRef(true);
  const animatingRef = useRef(false);
  const bloomCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    setupSmoothContext(ctx);

    const bloomCanvas = document.createElement("canvas");
    bloomCanvasRef.current = bloomCanvas;
    const bloomCtx = bloomCanvas.getContext("2d", { alpha: true });
    if (!bloomCtx) return;
    setupSmoothContext(bloomCtx);

    const logo = new Image();
    logo.src = aceLogo;
    logo.decoding = "async";

    const supersample = quality === "high" ? 3 : 2;
    const bloomBlur = quality === "high" ? 14 : 10;

    function getLayoutSize() {
      const rect = container!.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        valid: rect.width >= 1 && rect.height >= 1,
      };
    }

    function resizeCanvas(): boolean {
      const { width, height, valid } = getLayoutSize();
      if (!valid) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(width);
      const h = Math.floor(height);
      const physicalW = Math.max(1, Math.floor(w * dpr));
      const physicalH = Math.max(1, Math.floor(h * dpr));

      canvas!.width = physicalW;
      canvas!.height = physicalH;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;

      bloomCanvas.width = physicalW;
      bloomCanvas.height = physicalH;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      bloomCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function createParticleLogo() {
      if (!logo.complete || !logo.naturalWidth) return;

      const { width: canvasW, height: canvasH, valid } = getLayoutSize();
      if (!valid) return;

      const offCanvas = document.createElement("canvas");
      const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;
      setupSmoothContext(offCtx);

      const scale = size / logo.naturalWidth;
      const logicalW = Math.round(logo.naturalWidth * scale * widthScale);
      const logicalH = Math.round(logo.naturalHeight * scale);

      offCanvas.width = logicalW * supersample;
      offCanvas.height = logicalH * supersample;
      offCtx.drawImage(logo, 0, 0, offCanvas.width, offCanvas.height);

      const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const step = sampleStep * supersample;
      const offsetX = canvasW / 2 - logicalW / 2;
      const offsetY = canvasH / 2 - logicalH / 2;

      const particles: Particle[] = [];
      const data = imageData.data;
      const w = offCanvas.width;

      for (let y = 0; y < offCanvas.height; y += step) {
        for (let x = 0; x < offCanvas.width; x += step) {
          const index = (y * w + x) * 4;
          const alpha = data[index + 3];
          if (alpha > 80) {
            const px = offsetX + x / supersample;
            const py = offsetY + y / supersample;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const alphaFactor = Math.min(alpha / 255, 1);
            const radius = particleSize * (0.85 + alphaFactor * 0.3);
            particles.push(new Particle(px, py, r, g, b, radius));
          }
        }
      }
      particlesRef.current = particles;
    }

    function animate(time: number) {
      rafRef.current = requestAnimationFrame(animate);

      if (!visibleRef.current) return;

      const { width: w, height: h, valid } = getLayoutSize();
      if (!valid || bloomCanvas.width < 1 || bloomCanvas.height < 1) {
        return;
      }

      const pointer = pointerRef.current;
      const particles = particlesRef.current;

      for (const particle of particles) {
        particle.update(pointer, time);
      }

      bloomCtx!.clearRect(0, 0, w, h);
      bloomCtx!.globalCompositeOperation = "lighter";
      for (const particle of particles) {
        particle.draw(bloomCtx!);
      }

      ctx!.clearRect(0, 0, w, h);
      ctx!.globalCompositeOperation = "source-over";

      ctx!.save();
      ctx!.filter = `blur(${bloomBlur}px) brightness(1.12) saturate(1.15)`;
      ctx!.drawImage(bloomCanvas, 0, 0, w, h);
      ctx!.restore();

      ctx!.globalCompositeOperation = "lighter";
      ctx!.drawImage(bloomCanvas, 0, 0, w, h);
      ctx!.globalCompositeOperation = "source-over";
    }

    function startAnimationLoop() {
      if (animatingRef.current) return;
      if (!getLayoutSize().valid) return;
      if (!resizeCanvas()) return;
      animatingRef.current = true;
      rafRef.current = requestAnimationFrame(animate);
    }

    function onVisibilityChange() {
      visibleRef.current = document.visibilityState !== "hidden";
    }

    function rebuild() {
      if (!resizeCanvas()) {
        particlesRef.current = [];
        return;
      }
      createParticleLogo();
      startAnimationLoop();
    }

    function onPointerMove(e: PointerEvent) {
      if (!interactive) return;
      const rect = canvas!.getBoundingClientRect();
      pointerRef.current.x = e.clientX - rect.left;
      pointerRef.current.y = e.clientY - rect.top;
    }

    function onPointerLeave() {
      pointerRef.current.x = null;
      pointerRef.current.y = null;
    }

    const resizeObserver = new ResizeObserver(rebuild);

    logo.onload = rebuild;
    if (logo.complete) rebuild();

    resizeObserver.observe(container);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      animatingRef.current = false;
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      particlesRef.current = [];
      pointerRef.current = { x: null, y: null, radius: 160 };
      bloomCanvasRef.current = null;
    };
  }, [
    reducedMotion,
    size,
    widthScale,
    particleSize,
    interactive,
    sampleStep,
    quality,
  ]);

  if (reducedMotion) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img
          src={aceLogo}
          alt=""
          className="h-auto max-h-full w-auto max-w-full object-contain drop-shadow-[0_0_40px_hsl(211_38%_52%/0.4)]"
          style={{ maxWidth: size * widthScale }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full [image-rendering:auto]"
        aria-hidden
      />
    </div>
  );
}
