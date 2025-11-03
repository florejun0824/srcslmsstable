import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';

/**
 * Internal component to load and display the 3D model.
 * This is separate to allow <Suspense> to work.
 */
function Model({ avatarUrl }) {
  // Check if avatarUrl is provided, otherwise fall back to your existing guide
  const modelPath = avatarUrl || '/characters/guide.glb';
  
  // useGLTF loads the 3D model
  const { scene } = useGLTF(modelPath);

  // We clone the scene to make sure it can be reused without cache issues
  // position={[0, -1, 0]} moves the model down slightly to center it
  return <primitive object={scene.clone()} position={[0, -1, 0]} />;
}

/**
 * A responsive 3D character viewer that loads a Ready Player Me avatar.
 * @param {string} avatarUrl - The .glb URL of the avatar to display.
 */
export default function CharacterViewer({ avatarUrl }) {
  return (
    // Responsive container.
    // h-80 on mobile, h-96 on desktop.
    <div className="w-full h-80 md:h-96 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-inner">
      <Canvas camera={{ position: [0, 0, 2] }}>
        {/* Suspense shows a fallback while the model is loading (null here) */}
        <Suspense fallback={null}>
          {/* Basic lighting */}
          <ambientLight intensity={0.7} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          
          {/* Environment provides nice reflections and ambient light */}
          <Environment preset="sunset" />
          
          {/* The model itself */}
          <Model avatarUrl={avatarUrl} />
          
          {/* Controls to let the user rotate the character with their mouse/finger */}
          {/* We disable zoom and pan to keep it simple */}
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            target={[0, 0, 0]} // Center the rotation
          />
        </Suspense>
      </Canvas>
    </div>
  );
}