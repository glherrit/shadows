<script lang="ts">
  import Lens, { dummyLens } from '$lib/lens'
  import { range } from 'mathjs'
  import * as SC from 'svelte-cubed'
  import * as THREE from 'three'

  export let lens: Lens = dummyLens
  export let height: number
  export let scale = 1

  export let spin = false
  export let spinRate = 0.01

  export let bgColor = 'white' // 'papayawhip'
  export let enableControls = false

  let userClass = ''
  export { userClass as class }

  $: console.debug('3d render lens', lens)

  let spinAmount = 0
  let controlsResetKey = 0 // use this to rerender the orbit controls

  $: lensScale = 0.075 * (1 / scale)
  let width: number

  SC.onFrame(() => {
    if (spin) {
      spinAmount += spinRate
    }
  })

  function resetLensPosition() {
    controlsResetKey++
    spinAmount = 1 // trigger a redraw of the lens by changing the value
    spinAmount = 0
  }

  function getSurfaceGeometry(lens: Lens, surfNum: 1 | 2, divisions = 100) {
    const surf = surfNum === 1 ? lens.surf1 : lens.surf2
    const halfAp = surf.ap / 2

    let sagPoints = [
      ...(range(0, halfAp, halfAp / divisions).toArray() as number[]),
      halfAp,
      ...(lens.diameter > surf.ap ? [halfAp + 1e-5, lens.diameter / 2] : []),
    ]

    // console.debug('sagPoints', sagPoints)

    if (surfNum === 2) {
      sagPoints.reverse()
    }
    const lensPoints = sagPoints.map((x) =>
      x <= halfAp ? new THREE.Vector2(x, surf.sagAt(x)) : new THREE.Vector2(x, surf.sag)
    )
    // console.debug('lensPoints', lensPoints)

    return new THREE.LatheGeometry(lensPoints, divisions, 0, Math.PI * 2)
  }

  function getLensMiddleGeometry(lens: Lens, divisions = 100) {
    return new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, lens.et, 0)),
      divisions,
      lens.diameter / 2,
      divisions,
      true
    )
  }

  // TODO: figure out how to merge geometries into a single shape
  const errOffset = 0.1 // need to shift some so you dont see a gap between surface and lens middle
  $: surf1Geometry = getSurfaceGeometry(lens, 1)
    .rotateZ(-Math.PI / 2)
    .translate(-lens.surf1.sag + errOffset, 0, 0)

  $: lensMiddle = getLensMiddleGeometry(lens)
    .rotateZ(Math.PI / 2)
    .translate(lens.et, 0, 0)

  $: surf2Geometry = getSurfaceGeometry(lens, 2)
    .rotateZ(-Math.PI / 2)
    .translate(lens.et - lens.surf2.sag - errOffset, 0, 0)
</script>

<div class={userClass} style:height={`${height}px`} bind:clientWidth={width}>
  {#key `${controlsResetKey}`}
    <SC.Canvas antialias background={new THREE.Color(bgColor)} {height}>
      <SC.Mesh
        geometry={surf1Geometry}
        material={new THREE.MeshPhongMaterial({
          color: lens.material.color,
          opacity: 0.75,
          transparent: true,
          side: THREE.DoubleSide,
        })}
        rotation={[spinAmount, 0, spinAmount]}
      />
      <SC.Mesh
        geometry={lensMiddle}
        material={new THREE.MeshPhongMaterial({
          color: lens.material.color,
          opacity: 0.75,
          transparent: true,
        })}
        rotation={[spinAmount, 0, spinAmount]}
      />
      <SC.Mesh
        geometry={surf2Geometry}
        material={new THREE.MeshPhongMaterial({
          color: lens.material.color,
          opacity: 0.75,
          transparent: true,
          side: THREE.DoubleSide,
        })}
        rotation={[spinAmount, 0, spinAmount]}
      />

      <SC.OrthographicCamera
        left={(-width * lensScale) / 2}
        right={(width * lensScale) / 2}
        top={(height * lensScale) / 2}
        bottom={(-height * lensScale) / 2}
        near={-1000}
        far={1000}
      />

      {#if enableControls}
        <SC.OrbitControls enableZoom={true} />
      {/if}

      <SC.AmbientLight intensity={0.6} />
      <SC.DirectionalLight intensity={0.6} position={[-2, 3, 2]} />
    </SC.Canvas>

    <slot {resetLensPosition} />
  {/key}
</div>
