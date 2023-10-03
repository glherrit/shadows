<script lang="ts">
  import { T, OrbitControls, useFrame, useTexture } from "@threlte/core";
  import { HTML } from "@threlte/extras";
  import * as THREE from "three";
  import { BoxGeometry } from "three";
  import Coords from "./Coords.svelte";
  import { tweened } from "svelte/motion";

  const texts = useTexture([
    "src/pixs/thrufocus.jpg",
    "src/pixs/raytrace.jpg",
    "src/pixs/wavefront.jpg",
    "src/pixs/psf.jpg",
    "src/pixs/extsource.jpg",
    "src/pixs/sphAb.jpg",
  ]);

  const matmulti = [
    new THREE.MeshStandardMaterial({ map: texts[0] }),
    new THREE.MeshStandardMaterial({ map: texts[1] }),
    new THREE.MeshStandardMaterial({ map: texts[2] }),
    new THREE.MeshStandardMaterial({ map: texts[3] }),
    new THREE.MeshStandardMaterial({ map: texts[4] }),
    new THREE.MeshStandardMaterial({ map: texts[5] }),
  ];
  let cameraPosition = [-100, 0, 0];

  const zfactor = 70;

  const cps = [
    [-zfactor, 0, 0],
    [0, 0, zfactor],
    [zfactor, 0, 0],
    [0, 0, -zfactor],
    [-zfactor, 0, 0],
    [0, 0, zfactor],
    [0, zfactor, 0],
    [0, 0, zfactor],
    [0, -zfactor, 0],

  ];



  let rotation = 0;
  let i = 0;
  //let x = 0;
  let isPaused = false;
  /*
  useFrame(() => {
    rotation += 0.00;
    cameraPosition = cps[1];
    i++;
    if (i > 5) i = 0;
  });
  */

  /*
  const { start, stop, started } = useFrame(({ clock }) => {
    if (isPaused) {
      x += clock.getDelta();
      if (x > 0.002) {
        x = 0;
        isPaused = false;
      }
    } else {
      rotation += 0.0
      cameraPosition = cps[i];
      i++;
      if (i > 5) i = 0;
      isPaused = true;
    }
  });
*/


// Create tweened stores for each component of the position vector
const x = tweened(cps[0][0], { duration: 1000 }); // Change duration as needed
const y = tweened(cps[0][1], { duration: 1000 });
const z = tweened(cps[0][2], { duration: 1000 });

let time = 0;
const delayfactor = 0.001;
const { start, stop, started } = useFrame(({ clock }) => {
    if (isPaused) {
      time += clock.getDelta();
      if (time > delayfactor) {
        time = 0;
        isPaused = false;
      }
    } else {
      x.set(cps[i][0]);
      y.set(cps[i][1]);
      z.set(cps[i][2]);
      i++;
      if (i > cps.length-1) i = 0;
      isPaused = true;
    }
  });

  const toggleUseFrame = () => {
    if ($started) {
      stop();
    } else {
      start();
    }
  };


  const boxsize = 30;
  const axissize = 20;
  const showCoords = false;
</script>

<T.Group rotation={[rotation/3, 0, rotation]}>
  <T.PerspectiveCamera makeDefault position={[$x, $y, $z]}>
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

<T.Group rotation={[0, 0, 0]}>
  <T.Mesh
    geometry={new BoxGeometry(boxsize, boxsize, boxsize)}
    material={matmulti}
  />
</T.Group>

