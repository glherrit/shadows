<script lang="ts">
  import { T, OrbitControls } from "@threlte/core";

  export let castShadowOnOff = true;
  export let ambientValue = 30;
  export let directionalValue = 40;
  export let cameraPosition: [number, number, number] = [-100, 30, 0];

  $: ambientlightintensity = ambientValue / 100;
  $: pLight = directionalValue / 100;
</script>

<T.Group rotation.y={0}>
  <T.PerspectiveCamera makeDefault position={[-100, 30, 0]}>
    <OrbitControls enablePan enableRotate enableZoom />
  </T.PerspectiveCamera>
</T.Group>

<T.DirectionalLight
  castShadow={castShadowOnOff}
  position={[0, 100, 20]}
  intensity={pLight}
>
  <T.PerspectiveCamera
    attach="shadow.camera"
    enablePan
    enableRotate
    enableZoom
  />
</T.DirectionalLight>

<T.DirectionalLight
  castShadow={castShadowOnOff}
  position={[-100, 30, 0]}
  intensity={pLight}
>
  <T.PerspectiveCamera
    attach="shadow.camera"
    enablePan
    enableRotate
    enableZoom
  />
</T.DirectionalLight>
<T.AmbientLight intensity={ambientlightintensity} />
