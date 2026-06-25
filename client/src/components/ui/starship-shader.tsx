import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";

/** Smooth value noise for iChannel0 — avoids blocky nearest-neighbor squares. */
function createSmoothNoiseTexture(size = 256): THREE.DataTexture {
  const grid = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    grid[i] = Math.random();
  }

  const smooth = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const fade = (t: number) => t * t * (3 - 2 * t);
    const u = fade(xf);
    const v = fade(yf);
    const sample = (px: number, py: number) => {
      const sx = ((px % size) + size) % size;
      const sy = ((py % size) + size) % size;
      return grid[sy * size + sx];
    };
    const a = sample(xi, yi);
    const b = sample(xi + 1, yi);
    const c = sample(xi, yi + 1);
    const d = sample(xi + 1, yi + 1);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(a, b, u),
      THREE.MathUtils.lerp(c, d, u),
      v,
    );
  };

  const data = new Uint8Array(size * size * 4);
  const blurRadius = 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -blurRadius; dy <= blurRadius; dy++) {
        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
          sum += smooth(x + dx, y + dy);
          count++;
        }
      }
      const value = Math.floor((sum / count) * 255);
      const idx = (y * size + x) * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function FullscreenShader() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();

  const noiseTexture = useMemo(() => createSmoothNoiseTexture(256), []);

  const uniforms = useMemo(
    () => ({
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(size.width, size.height) },
      iChannel0: { value: noiseTexture },
    }),
    [noiseTexture, size.width, size.height],
  );

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.iTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.iResolution.value.set(size.width, size.height);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        depthWrite={false}
        depthTest={false}
        transparent={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          precision highp float;

          uniform float iTime;
          uniform vec2 iResolution;
          uniform sampler2D iChannel0;

          vec4 O_color;

          float sampleChannel0(vec2 uv) {
            vec2 px = vec2(1.0 / 256.0);
            return (
              texture(iChannel0, uv).r +
              texture(iChannel0, uv + vec2(px.x, 0.0)).r +
              texture(iChannel0, uv - vec2(px.x, 0.0)).r +
              texture(iChannel0, uv + vec2(0.0, px.y)).r +
              texture(iChannel0, uv - vec2(0.0, px.y)).r
            ) / 5.0;
          }

          void mainImage(out vec4 O, vec2 I)
          {
              vec2 r = iResolution.xy,
                   p = (I+I-r) / r.y * mat2(3.,4.,4.,-3.) / 1e2;

              vec4 S = vec4(0.0);
              vec4 C = vec4(1.,2.,3.,0.);
              vec4 W;

              for(float t=iTime, T=.1*t+p.y, i=0.; i<50.; i+=1.){
                  S += (cos(W=sin(i)*C)+1.)
                       * exp(sin(i+i*T))
                       / length(max(p,
                         p / vec2(2.0, sampleChannel0(p/exp(W.x)+vec2(i,t)/8.)*40.0)
                       )) / 1e4;

                  p += .02 * cos(i*(C.xz+8.0+i) + T + T);
              }

              O = vec4(tanh((S*S).rgb), 1.0);
          }

          void main() {
            vec2 fragCoord = gl_FragCoord.xy;
            vec4 O;
            mainImage(O, fragCoord);
            gl_FragColor = O;
          }
        `}
      />
    </mesh>
  );
}

export function StarshipShader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-0 rounded-lg w-full h-full",
        className,
      )}
    >
      <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }} dpr={[1, 2]}>
        <color attach="background" args={["#000000"]} />
        <FullscreenShader />
      </Canvas>
    </div>
  );
}

/** @deprecated Use StarshipShader — kept for drop-in demo compatibility */
export const Component = StarshipShader;
