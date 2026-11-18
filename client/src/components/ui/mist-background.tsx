import React, { useEffect, useRef } from 'react';
import { createCappedPaintLoop } from '@/lib/cappedFrameLoop';
import { cursorGlowRadius } from '@/lib/cursorGlowRadius';
import { logger } from '@/lib/logger';
import { getViewportSize } from '@/lib/viewportSize';

/** Desktop cursor glow, as a fraction of screen height. Phones use a tighter spot. */
const SLEEP_CURSOR_GLOW = 0.35;

function createWebGL1Context(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const attempts: WebGLContextAttributes[] = [
    {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
    },
    {},
  ];
  for (const attrs of attempts) {
    const gl = canvas.getContext('webgl', attrs);
    if (gl) return gl;
  }
  return null;
}

type MistBackgroundProps = {
  /** When false (restore into an active sleep), start at full opacity. */
  fadeIn?: boolean;
};

/**
 * Mist Background Component
 * Technology: WebGL 2D Fragment Shaders (GLSL)
 * Style: Ethereal Generative Fluid / Mist
 *
 * Fade-in is CSS-only (see `.sleep-mist-fade-in`). Driving opacity with
 * requestAnimationFrame + setState while also using `transition-opacity`
 * made the mist jump on iOS Safari instead of rising smoothly.
 */
const MistBackground: React.FC<MistBackgroundProps> = ({ fadeIn = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = createWebGL1Context(canvas);
    if (!gl) {
      logger.warn('[MistBackground] WebGL context not available');
      return;
    }

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_glowRadius;

      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 6; i++) {
              v += a * noise(p);
              p *= 2.0;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          uv.x *= u_resolution.x / u_resolution.y;

          vec2 mPos = u_mouse / u_resolution.xy;
          mPos.x *= u_resolution.x / u_resolution.y;
          float dist = distance(uv, mPos);

          vec2 q = vec2(0.0);
          q.x = fbm(uv + 0.07 * u_time);
          q.y = fbm(uv + vec2(1.0, 1.0));

          vec2 r = vec2(0.0);
          r.x = fbm(uv + 1.0 * q + vec2(1.7, 9.2) + 0.15 * u_time);
          r.y = fbm(uv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time);

          float f = fbm(uv + r);

          // Deep zinc palette with misty highlights
          vec3 baseColor = vec3(0.02, 0.028, 0.06);
          vec3 mistColor = vec3(0.16, 0.18, 0.22);
          vec3 accentColor = vec3(0.3, 0.35, 0.45);

          vec3 color = mix(baseColor, mistColor, f);
          color = mix(color, accentColor, dot(q, r) * 0.5);

          // Subtle mouse glow. Radius is in the same height-normalized space as dist.
          float mouseGlow = smoothstep(u_glowRadius, 0.0, dist);
          color += mouseGlow * 0.05 * vec3(0.6, 0.7, 1.0);

          // Post-processing
          color = pow(color, vec3(1.1)) * 1.4;
          gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const glowLoc = gl.getUniformLocation(program, 'u_glowRadius');

    let mouse = { x: 0, y: 0 };
    const syncPointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1 || canvas.width < 1 || canvas.height < 1) return;
      mouse.x = ((clientX - rect.left) / rect.width) * canvas.width;
      mouse.y = (1 - (clientY - rect.top) / rect.height) * canvas.height;
    };
    const handleMouseMove = (e: MouseEvent) => {
      syncPointer(e.clientX, e.clientY);
    };
    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      syncPointer(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });

    const paintLoop = createCappedPaintLoop(1000 / 20, (time) => {
      const viewport = getViewportSize();
      if (canvas.width !== viewport.width || canvas.height !== viewport.height) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.uniform1f(timeLoc, time * 0.001);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform2f(mouseLoc, mouse.x, mouse.y);
      gl.uniform1f(glowLoc, cursorGlowRadius(SLEEP_CURSOR_GLOW, viewport.width, viewport.height));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    paintLoop.start();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      paintLoop.stop();
    };
  }, []);

  return (
    <div
      className={
        fadeIn
          ? "absolute inset-0 pointer-events-none sleep-mist-fade-in"
          : "absolute inset-0 pointer-events-none"
      }
      style={{ background: "#09090b" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};

export default MistBackground;