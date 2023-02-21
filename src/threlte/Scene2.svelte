<script lang="ts">
  import { T, OrbitControls, useFrame, useTexture } from "@threlte/core";
  import * as THREE from "three";
  import { BoxGeometry } from "three";
  import Coords from "./Coords.svelte";

  const texture = useTexture("src/lib/Fig-12a.jpg", {
    onError: (error) => {
      console.warn(`An error occured loading the texture: ${error.message}`);
    },
  });

  const mat1 = new THREE.MeshStandardMaterial({ map: texture });

  const texts = useTexture([
    "src/pixs/Fig-5.jpg",
    "src/pixs/Fig-9.jpg",
    "src/pixs/Fig-10b.jpg",
    "src/pixs/Fig-11b.jpg",
    "src/pixs/Fig-12a.jpg",
    "src/pixs/Picture1.jpg",
  ]);

  const matmulti = [
    new THREE.MeshStandardMaterial({ map: texts[0] }),
    new THREE.MeshStandardMaterial({ map: texts[1] }),
    new THREE.MeshStandardMaterial({ map: texts[2] }),
    new THREE.MeshStandardMaterial({ map: texts[3] }),
    new THREE.MeshStandardMaterial({ map: texts[4] }),
    new THREE.MeshStandardMaterial({ map: texts[5] }),
  ];
  let cameraPosition: [number, number, number] = [-100, 0, 0];

  let rotation = 0;
  useFrame(() => {
    rotation += 0.0;
  });

  const boxsize = 30;
  const axissize = 20;
  const showCoords = false;
</script>

<T.Group rotation={[rotation / 3, 0, rotation]}>
  <T.PerspectiveCamera makeDefault position={cameraPosition}>
    <OrbitControls enableRotate enableZoom enableDamping dampingFactor={0.03} />
    <T.DirectionalLight position={[-100, 0, 0]} intensity={1.0} />
  </T.PerspectiveCamera>
</T.Group>
<T.AmbientLight intensity={0.04} />

{#if showCoords}
  <Coords
    lengths={[-axissize, axissize, -axissize, axissize, -axissize, axissize]}
  />
{/if}

<T.Mesh
  geometry={new BoxGeometry(boxsize, boxsize, boxsize)}
  material={matmulti}
/>
