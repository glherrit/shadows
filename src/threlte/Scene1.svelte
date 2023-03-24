<script lang="ts">
  import { T, useFrame, useTexture } from "@threlte/core";
  import * as THREE from "three";
  import { LatheGeometry } from "three";
  import Camera1New from "./Camera1New.svelte";
  import { HTML } from "@threlte/extras";
  import BackgroundGrids from "$lib/components/threlte/BackgroundGrids.svelte";
  import VerticalGrid from "./VerticalGrid.svelte";

  const lensshape = [
    [0.0, 0.0],
    [0.423, 0.002],
    [0.847, 0.009],
    [1.27, 0.02],
    [1.693, 0.036],
    [2.117, 0.056],
    [2.54, 0.081],
    [2.963, 0.11],
    [3.387, 0.144],
    [3.81, 0.182],
    [4.233, 0.224],
    [4.657, 0.272],
    [5.08, 0.323],
    [5.503, 0.38],
    [5.927, 0.441],
    [6.35, 0.506],
    [6.773, 0.576],
    [7.197, 0.651],
    [7.62, 0.73],
    [8.043, 0.814],
    [8.467, 0.903],
    [8.89, 0.996],
    [9.313, 1.094],
    [9.737, 1.197],
    [10.16, 1.304],
    [10.583, 1.417],
    [11.007, 1.534],
    [11.43, 1.656],
    [11.853, 1.783],
    [12.277, 1.914],
    [12.7, 2.051],
    [12.7, 2.051],
    [12.7, 3.93],
    [12.7, 3.93],
    [12.277, 4.069],
    [11.853, 4.203],
    [11.43, 4.332],
    [11.007, 4.456],
    [10.583, 4.575],
    [10.16, 4.688],
    [9.737, 4.797],
    [9.313, 4.901],
    [8.89, 5.0],
    [8.467, 5.094],
    [8.043, 5.183],
    [7.62, 5.267],
    [7.197, 5.347],
    [6.773, 5.422],
    [6.35, 5.493],
    [5.927, 5.558],
    [5.503, 5.62],
    [5.08, 5.676],
    [4.657, 5.728],
    [4.233, 5.775],
    [3.81, 5.818],
    [3.387, 5.856],
    [2.963, 5.89],
    [2.54, 5.919],
    [2.117, 5.944],
    [1.693, 5.964],
    [1.27, 5.98],
    [0.847, 5.991],
    [0.423, 5.998],
    [0.0, 6.0],
  ];

  let rotation = 0;
  let onoff = false;
  const { start, stop, started } = useFrame(({ clock }) => {
    if (onoff) {
      rotation += 0.02;
      //console.log("rotate", clock.getDelta());
    } else {
      //console.log("no rotation", clock.getDelta());
    }
    onoff = !onoff;
  });

  /*
    if (totalRotations < goalRotations) {
      rotation += 0.02;
      totalRotations++;
    }

    if (rotationTimer > 0) {
      rotation += 0.02;
      rotationTimer -= clock.getDelta();
      //console.log(rotationTimer);
      //console.log(clock.getDelta());
    }
        */

  const toggleUseFrame = () => {
    if ($started) {
      console.log("stopping");
      stop();
    } else {
      console.log("starting");
      start();
    }
  };

  const ptsvector: THREE.Vector2[] = [];
  lensshape.forEach((pt) => {
    ptsvector.push(new THREE.Vector2(pt[0], pt[1]));
  });

  const lktexture = useTexture("lenskitcircle.png");
</script>

<Camera1New />

<!--
  <VerticalGrid verticalOffset={0} horizontalOffset={0} />
-->

<T.Mesh
  receiveShadow
  castShadow
  position={[0, 30, 0]}
  rotation={[rotation, 0, rotation]}
  geometry={new LatheGeometry(ptsvector, 201, 0, Math.PI * 2)}
  material={new THREE.MeshPhongMaterial({
    color: "red",
    transparent: true,
    opacity: 0.75,
    shininess: 5000,
    side: THREE.DoubleSide,
  })}
/>

<!-- Floor -->
<T.Mesh position.z={0} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} receiveShadow>
  <T.CircleGeometry args={[40, 128]} />
  <T.MeshPhongMaterial map={lktexture} />
</T.Mesh>

<HTML
  position={{ x: 0, y: 30, z: -60 }}
  rotation={{ x: 0, y: -1.6, z: 0 }}
  scale={7}
  transform
>
  <button
    on:click={toggleUseFrame}
    class="rounded-full px-5 text-black bg-green-500 hover:opacity-90 active:opacity-70"
  >
    Start/Stop
  </button>
</HTML>
