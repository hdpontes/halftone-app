import { useEffect, useRef } from 'react';

export default function HalftoneBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const spacing = 32;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * spacing;
          const y = row * spacing;

          // Wave-driven radius
          const wave = Math.sin(x * 0.008 + t) * Math.cos(y * 0.006 + t * 0.7);
          const r = Math.max(0.5, (wave + 1) * 3.5);

          // Distance from center
          const dx = x - width / 2;
          const dy = y - height / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
          const alpha = 0.04 + 0.08 * (1 - dist / maxDist);

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(51, 85, 255, ${alpha})`;
          ctx.fill();
        }
      }

      t += 0.012;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}
