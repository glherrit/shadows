<script lang="ts">
  import { PAN_SPEED, ROTATE_SPEED, ZOOM_SPEED } from '$src/lib/constants'
  import { T, OrbitControls } from '@threlte/core'

  export let zoomSpeed = ZOOM_SPEED
  export let panSpeed = PAN_SPEED
  export let rotateSpeed = ROTATE_SPEED

  export let castShadowOnOff = true
  export let ambientValue = 20
  export let directionalValue = 40
  export let cameraPosition: [number, number, number] = [-50, 35, 50]

  $: ambientlightintensity = ambientValue / 100
  $: pLight = directionalValue / 100
</script>

<T.PerspectiveCamera makeDefault position={cameraPosition} fov={50}>
  <OrbitControls enableZoom {zoomSpeed} enablePan {panSpeed} enableRotate {rotateSpeed} />
</T.PerspectiveCamera>

<T.DirectionalLight castShadow={castShadowOnOff} position={[0, 0, 100]} intensity={pLight}>
  <T.PerspectiveCamera attach="shadow.camera" enablePan enableRotate enableZoom />
  {#if castShadowOnOff}
    <T.Vector2 attach="shadow.mapSize" args={[4196, 4196]} />
  {/if}
</T.DirectionalLight>

<T.DirectionalLight castShadow={castShadowOnOff} position={[-100, 0, 0]} intensity={pLight}>
  <T.PerspectiveCamera attach="shadow.camera" enablePan enableRotate enableZoom />
  {#if castShadowOnOff}
    <T.Vector2 attach="shadow.mapSize" args={[4196, 4196]} />
  {/if}
</T.DirectionalLight>

<T.AmbientLight intensity={ambientlightintensity} />
