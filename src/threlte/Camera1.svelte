<script lang="ts">
  import { T, OrbitControls } from "@threlte/core";

  export let castShadowOnOff = true;
  export let ambientValue = 10;
  export let directionalValue = 50;
  export let cameraPosition: [number, number, number] = [-100, 30, 0];

  $: ambientlightintensity = ambientValue / 100;
  $: pLight = directionalValue / 100;
</script>

<T.Group rotation.y={0}>
  <T.PerspectiveCamera makeDefault position={cameraPosition}>
    <OrbitControls enablePan enableRotate enableZoom />
  </T.PerspectiveCamera>
</T.Group>

<T.DirectionalLight
  castShadow={castShadowOnOff}
  position={[0, 100, 0]}
  intensity={pLight}
>
  <T.PerspectiveCamera
    attach="shadow.camera"
    enablePan
    enableRotate
    enableZoom
  />
  {#if castShadowOnOff}
    <T.Vector2 attach="shadow.mapSize" args={[4196, 4196]} />
  {/if}
</T.DirectionalLight>

<T.DirectionalLight
  castShadow={castShadowOnOff}
  position={[0, 100, -10]}
  intensity={pLight}
>
  <T.PerspectiveCamera
    attach="shadow.camera"
    enablePan
    enableRotate
    enableZoom
  />
  {#if castShadowOnOff}
    <T.Vector2 attach="shadow.mapSize" args={[4196, 4196]} />
  {/if}
</T.DirectionalLight>

<T.AmbientLight intensity={ambientlightintensity} />
