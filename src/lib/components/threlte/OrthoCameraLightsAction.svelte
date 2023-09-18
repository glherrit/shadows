<script lang="ts">
  import { PAN_SPEED, ROTATE_SPEED, ZOOM_SPEED } from '$lib/constants'
  import { OrbitControls, T } from '@threlte/core'

  export let zoomSpeed = ZOOM_SPEED
  export let panSpeed = PAN_SPEED
  export let rotateSpeed = ROTATE_SPEED

  export let castShadowOnOff = true
  export let ambientValue = 20
  export let directionalValue = 40
  export let cameraPosition: [number, number, number] = [-60, 35, -60]
  export let targetView = { x: 0, y: 0, z: 0 }
  export let zoom = 15

  const ambientlightintensity = ambientValue / 100
  const pLight = directionalValue / 100
</script>

<T.OrthographicCamera makeDefault position={cameraPosition} fov={50} {zoom}>
  <OrbitControls
    target={targetView}
    enableZoom
    {zoomSpeed}
    enablePan
    {panSpeed}
    enableRotate
    {rotateSpeed}
  />
</T.OrthographicCamera>

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
