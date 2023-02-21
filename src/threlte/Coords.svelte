<script lang="ts">
  import { Line, T } from '@threlte/core'
  import { Text } from '@threlte/extras'
  import { LineBasicMaterial, Vector3 } from 'three'

  export let locXYZ: Vector3 = new Vector3(0, 0, 0)
  export let lengths: number[] = [0, 20, 0, 20, 0, 20]

  export let showX = true
  export let showY = true
  export let showZ = true

  export let colorX = 'red'
  export let colorY = 'green'
  export let colorZ = 'blue'

  const lineLength = Math.min(lengths[1], 20)

  // some arbitary scaling going on here
  const labelOffset = (2 * lineLength) / 15
  const coneArgs = [(0.8 * lineLength) / 15, (3 * lineLength) / 15, 32]
  const fontSize = (3 * lineLength) / 15

  let ptsX: Vector3[] = []
  ptsX.push(new Vector3(lengths[0], 0, 0))
  ptsX.push(new Vector3(lengths[1] + locXYZ.x, locXYZ.y, locXYZ.z))

  let ptsY: Vector3[] = []
  ptsY.push(new Vector3(0, lengths[2], 0))
  ptsY.push(new Vector3(locXYZ.x, lengths[3] + locXYZ.y, locXYZ.z))

  let ptsZ: Vector3[] = []
  ptsZ.push(new Vector3(0, 0, lengths[4]))
  ptsZ.push(new Vector3(locXYZ.x, locXYZ.y, lengths[5] + locXYZ.z))
</script>

<!-- Do all lines within one mesh -->
<T.Mesh>
  {#if showX}
    <Line points={ptsX} material={new LineBasicMaterial({ color: colorX })} />
  {/if}
  {#if showY}
    <Line points={ptsY} material={new LineBasicMaterial({ color: colorY })} />
  {/if}
  {#if showZ}
    <Line points={ptsZ} material={new LineBasicMaterial({ color: colorZ })} />
  {/if}
</T.Mesh>

{#if showX}
  <!-- Add cone and axis label for X Axis -->
  <T.Mesh position={ptsX[1].toArray()} rotation={[0, 0, -Math.PI / 2]} castShadow={true} let:ref>
    <T.ConeGeometry args={coneArgs} />
    <T.MeshStandardMaterial color={colorX} />
  </T.Mesh>

  <T.Mesh
    position={[lengths[1] + locXYZ.x + labelOffset, locXYZ.y, locXYZ.z]}
    castShadow={true}
    let:ref
  >
    <Text text={'X'} color={colorX} {fontSize} anchorX={'left'} anchorY={'middle'} />
  </T.Mesh>
{/if}

{#if showY}
  <!-- Add cone and axis label for Y Axis -->
  <T.Mesh position={ptsY[1].toArray()} castShadow let:ref>
    <T.ConeGeometry args={coneArgs} />
    <T.MeshStandardMaterial color={colorY} />
  </T.Mesh>

  <T.Mesh
    position={[locXYZ.x, lengths[3] + locXYZ.y + labelOffset, locXYZ.z]}
    castShadow={true}
    let:ref
  >
    <Text text={'Y'} color={colorY} {fontSize} anchorX={'center'} anchorY={'bottom-baseline'} />
  </T.Mesh>
{/if}

{#if showZ}
  <!-- Add cone and axis label for Z Axis -->
  <T.Mesh position={ptsZ[1].toArray()} rotation={[Math.PI / 2, 0, 0]} castShadow={true} let:ref>
    <T.ConeGeometry args={coneArgs} />
    <T.MeshStandardMaterial color={colorZ} />
  </T.Mesh>

  <T.Mesh
    position={[locXYZ.x, locXYZ.y, lengths[5] + locXYZ.z + labelOffset]}
    rotation={[0, Math.PI, 0]}
    castShadow={true}
    let:ref
  >
    <Text text={'Z'} color={colorZ} {fontSize} anchorX={'center'} anchorY={'middle'} />
  </T.Mesh>
{/if}
