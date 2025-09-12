
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import BackgroundPaperShaders from './background-paper-shaders'

export default function Demo() {
  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <BackgroundPaperShaders 
          intensity={0.3}
          color1={[0.95, 0.9, 0.8]}
          color2={[0.8, 0.7, 0.5]}
        />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
