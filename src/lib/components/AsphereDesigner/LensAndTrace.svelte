<script lang="ts">
  import type Lens from '$lib/lens'
  import { genSolidLens } from '$lib/ThreeGutils'
  import { entrancePupilHalfDiameter, type LightSource } from '$src/lib/lightSource'
  import { generateFibonacciRays, trace3DRayPath, generateYGrid } from '$src/lib/raytrace'
  import { Vector3D } from '$src/lib/vector'
  import { InteractiveObject, Object3DInstance, OrbitControls, T } from '@threlte/core'
  import { useCursor } from '@threlte/extras'
  import { createEventDispatcher } from 'svelte'
  import {
    BackSide,
    BufferGeometry,
    GridHelper,
    LatheGeometry,
    Line,
    LineBasicMaterial,
    PointsMaterial,
    Vector2,
    Vector3,
  } from 'three'

  export let lens: Lens
  export let source: LightSource
  export let refocus = 0.0

  export let showSolid = true
  export let showBeam = true
  export let showSurfLongandLat = true
  export let enableSelections = false
  export let highlightLens = false

  let highlightColor = '#990099'
  let selectionColor = '#FF00CC'

  const dispatch = createEventDispatcher()

  const rayInitialZPosition = -5

  let controls: OrbitControls['controls']

  // save the initial state whenever it binds
  $: controls?.saveState()

  $: lcolor = lens.material.color
  $: raygroup = addRays(lens, source, refocus)
  $: surfmapgroup = drawSurfaceCross(lens)

  $: solidBeam = (relaperture: number) => {
    return addConeBeam2(lens, source, refocus, relaperture).rotateX(Math.PI / 2)
  }

  let lensopacity = 0.95
  let beamopacity = 0.7
  let imageopacity = 0.85
  const {
    hovering: hoveringLens,
    onPointerEnter: onPointerEnterLens,
    onPointerLeave: onPointerLeaveLens,
  } = useCursor()

  const {
    hovering: hoveringBeam,
    onPointerEnter: onPointerEnterBeam,
    onPointerLeave: onPointerLeaveBeam,
  } = useCursor()

  // const {
  //   hovering: hoveringImage,
  //   onPointerEnter: onPointerEnterImage,
  //   onPointerLeave: onPointerLeaveImage,
  // } = useCursor()

  let surf1pts: Vector3[] = []
  let surf2pts: Vector3[] = []
  let surfimgpts: Vector3[] = []

  function addRays(lens: Lens, source: LightSource, refocus: number) {
    // const material = new LineBasicMaterial({ color: 0xff0000, linewidth: 1 })
    const linegroup: THREE.Line[] = []
    // let halfap = source.diameter / 2
    surf1pts = []
    surf2pts = []
    surfimgpts = []
    //const crays = generateCollimatedRayBundle(halfap, 1, rayInitialZPosition)
    //const crays = generateFibonacciRays(entrancePupilHalfDiameter(source), 500, rayInitialZPosition)
    const crays = generateYGrid(entrancePupilHalfDiameter(source), 11, rayInitialZPosition)
    crays.forEach((ray) => {
      let ps = trace3DRayPath(ray.pVector, ray.eDir, lens, source, refocus)
      surf1pts.push(new Vector3(ps[1].x, ps[1].y, ps[1].z))
      surf2pts.push(new Vector3(ps[2].x, ps[2].y, ps[2].z))
      surfimgpts.push(new Vector3(ps[ps.length - 1].x, ps[ps.length - 1].y, ps[ps.length - 1].z))
      // add this next line with extra z distance if needing to extend focus into image plane
      //ps.push(new Vector3D(ps[ps.length - 1].x, ps[ps.length - 1].y, ps[ps.length - 1].z = extra z))
      let ps3ray = convert3Dto3(ps)
      linegroup.push(
        new Line(
          new BufferGeometry().setFromPoints(ps3ray),
          new LineBasicMaterial({ color: 0xff0000, linewidth: 5 })
        )
      )
    })
    return linegroup
  }

  function addRays2(lens: Lens, source: LightSource, refocus: number) {
    // const material = new LineBasicMaterial({ color: 0xff0000, linewidth: 1 })
    const linegroup: THREE.Line[] = []
    // let halfap = source.diameter / 2
    surf1pts = []
    surf2pts = []
    surfimgpts = []
    //const crays = generateCollimatedRayBundle(halfap, 1, rayInitialZPosition)
    const crays = generateFibonacciRays(entrancePupilHalfDiameter(source), 500, rayInitialZPosition)
    crays.forEach((ray) => {
      let ps = trace3DRayPath(ray.pVector, ray.eDir, lens, source, refocus)
      surf1pts.push(new Vector3(ps[1].x, ps[1].y, ps[1].z))
      surf2pts.push(new Vector3(ps[2].x, ps[2].y, ps[2].z))
      surfimgpts.push(new Vector3(ps[ps.length - 1].x, ps[ps.length - 1].y, ps[ps.length - 1].z))
      // add this next line with extra z distance if needing to extend focus into image plane
      //ps.push(new Vector3D(ps[ps.length - 1].x, ps[ps.length - 1].y, ps[ps.length - 1].z = extra z))
      let ps3ray = convert3Dto3(ps)
      linegroup.push(
        new Line(
          new BufferGeometry().setFromPoints(ps3ray),
          new LineBasicMaterial({ color: 0xff0000, linewidth: 5 })
        )
      )
    })
    return linegroup
  }

  function convert3Dto3(pts3d: Vector3D[]) {
    const pts3: THREE.Vector3[] = []
    pts3d.forEach((element) => {
      pts3.push(new Vector3(element.x, element.y, element.z))
    })
    return pts3
  }

  function mapMaxY(ps1: Vector3D[], ps2: Vector3D[]) {
    for (let i = 0; i < ps1.length; i++) {
      if (ps1[i].y < ps2[i].y) {
        ps1[i].y = ps2[i].y
      }
    }
    return ps1
  }

  function generateCone(ps: Vector3D[]) {
    const pout: Vector3D[] = []
    const x0 = ps[2].z
    const y0 = ps[2].y
    const x1 = ps[3].z
    const y1 = ps[3].y

    pout.push(ps[0])
    pout.push(ps[1])
    pout.push(ps[2])

    //y = ax + b
    // (y1 = a x1 + b)
    // (y0 = a x0 + b)
    // (y1 - y0) = a (x1 - x0)
    const a = (y1 - y0) / (x1 - x0)
    const b = y0 - a * x0

    const xp0 = x1 - 10
    const npts = 51
    // npts = number of points (21)
    const xinc = (x1 - xp0) / (npts - 1)

    for (let x = xp0; x <= x1 * 1.0001; x += xinc) {
      let yp = a * x + b
      pout.push(new Vector3D(0, Math.abs(yp), x))
    }
    return pout
  }

  function drawSurfaceCross(lens: Lens) {
    const linegroup: THREE.Line[] = []
    // let halfap = source.diameter / 2
    let surf1longitude: Vector3[] = []
    let surf1latitude: Vector3[] = []

    surf1longitude.push(new Vector3(-lens.diameter / 2, 0, lens.surf1.sagAt(lens.surf1.ap / 2)))
    surf1latitude.push(new Vector3(0, -lens.diameter / 2, lens.surf1.sagAt(lens.surf1.ap / 2)))
    for (let x = -lens.surf1.ap / 2; x <= lens.surf1.ap / 2 + 0.0001; x += lens.surf1.ap / 2 / 20) {
      const sag1 = lens.surf1.sagAt(x)
      surf1longitude.push(new Vector3(x, 0, sag1))
      surf1latitude.push(new Vector3(0, x, sag1))
    }
    surf1longitude.push(new Vector3(lens.diameter / 2, 0, lens.surf1.sagAt(lens.surf1.ap / 2)))
    surf1latitude.push(new Vector3(0, lens.diameter / 2, lens.surf1.sagAt(lens.surf1.ap / 2)))

    let surf2longitude: Vector3[] = []
    let surf2latitude: Vector3[] = []
    surf2longitude.push(
      new Vector3(-lens.diameter / 2, 0, lens.ct + lens.surf2.sagAt(lens.surf2.ap / 2))
    )
    surf2latitude.push(
      new Vector3(0, -lens.diameter / 2, lens.ct + lens.surf2.sagAt(lens.surf2.ap / 2))
    )
    for (let x = -lens.surf2.ap / 2; x <= lens.surf2.ap / 2 + 0.0001; x += lens.surf2.ap / 2 / 20) {
      const sag2 = lens.surf2.sagAt(x)
      surf2longitude.push(new Vector3(x, 0, lens.ct + sag2))
      surf2latitude.push(new Vector3(0, x, lens.ct + sag2))
    }
    surf2longitude.push(
      new Vector3(lens.diameter / 2, 0, lens.ct + lens.surf2.sagAt(lens.surf2.ap / 2))
    )
    surf2latitude.push(
      new Vector3(0, lens.diameter / 2, lens.ct + lens.surf2.sagAt(lens.surf2.ap / 2))
    )

    linegroup.push(
      new Line(
        new BufferGeometry().setFromPoints(surf1longitude),
        new LineBasicMaterial({ color: 0x000000, linewidth: 1 })
      )
    )
    linegroup.push(
      new Line(
        new BufferGeometry().setFromPoints(surf1latitude),
        new LineBasicMaterial({ color: 0x000000, linewidth: 1 })
      )
    )
    linegroup.push(
      new Line(
        new BufferGeometry().setFromPoints(surf2longitude),
        new LineBasicMaterial({ color: 0x000000, linewidth: 1 })
      )
    )
    linegroup.push(
      new Line(
        new BufferGeometry().setFromPoints(surf2latitude),
        new LineBasicMaterial({ color: 0x000000, linewidth: 1 })
      )
    )
    return linegroup
  }

  function addConeBeam2(
    lens: Lens,
    source: LightSource,
    refocus: number,
    relativeap: number,
    divisions = 101
  ) {
    let vdata: Vector2[] = []
    const halfDiameter = entrancePupilHalfDiameter(source)

    let pstart1 = trace3DRayPath(
      new Vector3D(0, halfDiameter, rayInitialZPosition),
      new Vector3D(0, 0, 1),
      lens,
      source,
      refocus
    )
    let ps = generateCone(pstart1)

    for (let relap = 0.2; relap < 0.81; relap += 0.1) {
      let pstart2 = trace3DRayPath(
        new Vector3D(0, relap * halfDiameter, rayInitialZPosition),
        new Vector3D(0, 0, 1),
        lens,
        source,
        0.0
      )
      let ps2 = generateCone(pstart2)
      ps = mapMaxY(ps, ps2)
    }

    vdata.push(new Vector2(0, ps[0].z))
    ps.forEach((lseg) => {
      vdata.push(new Vector2(lseg.y, lseg.z))
    })
    //console.log('ps', ps)
    vdata.push(new Vector2(ps[ps.length - 1].y, ps[ps.length - 1].z))
    vdata.push(new Vector2(0, ps[ps.length - 1].z))
    return new LatheGeometry(vdata, divisions, 0, Math.PI * 2)
  }

  let showSurfPoints = true
  let showMultiLines = false
</script>

<!-- Add individual ray interesetion points to surface,
  this is kind of like an in-situ beam footprint analysis-->
{#if showBeam && !showSolid && showSurfPoints}
  <T.Points
    geometry={new BufferGeometry().setFromPoints(surf1pts)}
    material={new PointsMaterial({ color: 0x000000, size: 3 })}
    position={[0, 0, -0.01]}
    let:ref
  />

  <T.Points
    geometry={new BufferGeometry().setFromPoints(surf2pts)}
    material={new PointsMaterial({ color: 0x000000, size: 3 })}
    position={[0, 0, 0.01]}
    let:ref
  />
{/if}

<!-- show surfae multi lines surface one only - don't really like this one -->
{#if showMultiLines}
  <T.Line
    geometry={new BufferGeometry().setFromPoints(surf1pts)}
    material={new LineBasicMaterial({ color: 0xffffff, linewidth: 3 })}
  />
{/if}

<!-- Add surface longitude and latitude lines - both sides -->
{#if showSurfLongandLat}
  {#each surfmapgroup as surfline}
    <T.Line geometry={surfline.geometry} material={surfline.material} />
  {/each}
{/if}

<!-- Add lens -->
<T.Mesh
  geometry={genSolidLens(lens, 31, 201)}
  position={[0, 0, 0]}
  rotation={[Math.PI / 2, 0, 0]}
  let:ref
>
  <T.MeshPhongMaterial color={lcolor} opacity={lensopacity} />
  <InteractiveObject
    object={ref}
    interactive
    on:pointerenter={onPointerEnterLens}
    on:pointerleave={onPointerLeaveLens}
    on:click={() => dispatch('click:lens', lens)}
  />
</T.Mesh>

{#if highlightLens || (enableSelections && $hoveringLens)}
  <T.Mesh
    geometry={genSolidLens(lens, 201, 201)}
    position={[0, 0, 0]}
    rotation={[Math.PI / 2, 0, 0]}
    scale={1.04}
  >
    <T.MeshBasicMaterial color={$hoveringLens ? selectionColor : highlightColor} side={BackSide} />
  </T.Mesh>
{/if}

<!-- Add either conical shaped solid beam or individual rays -->
{#if showBeam}
  {#if showSolid}
    <T.Mesh geometry={solidBeam(0.5)} position={[0, 0, 0]} rotation={[0, 0, 0]} let:ref>
      <T.MeshPhongMaterial color={'red'} opacity={beamopacity} transparent={true} />
      <InteractiveObject
        object={ref}
        interactive
        on:pointerenter={onPointerEnterBeam}
        on:pointerleave={onPointerLeaveBeam}
        on:click={() => dispatch('click:beam')}
      />
    </T.Mesh>
    {#if $hoveringBeam}
      <T.Mesh
        geometry={solidBeam(0.5)}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[1.06, 1.06, 1]}
      >
        <T.MeshBasicMaterial color={highlightColor} side={BackSide} />
      </T.Mesh>
    {/if}
  {:else}
    {#each raygroup as ray}
      <T.Line geometry={ray.geometry} material={ray.material} />
    {/each}
  {/if}
{/if}

<!-- Add image plane -->
<T.Mesh position={[0, 0, lens.ct + lens.BFL(source.wavelengths[0]) + refocus + 0.2]} let:ref>
  <T.BoxGeometry args={[9, 9, 0.4]} />
  <T.MeshPhongMaterial color="green" opacity={imageopacity} transparent={true} />
  <InteractiveObject object={ref} interactive on:click={() => dispatch('click:image')} />
</T.Mesh>

<!-- Add image plane helper Grid -->
<Object3DInstance
  object={new GridHelper(9, 9, 0x000000, 0x111111)}
  position={new Vector3(0, 0, lens.ct + lens.BFL(source.wavelengths[0]) + refocus)}
  rotation={new Vector3(Math.PI / 2, 0, 0)}
/>

<!-- Add Ray Points on Image Plane -->
<T.Points
  geometry={new BufferGeometry().setFromPoints(surfimgpts)}
  material={new PointsMaterial({ color: 0x000000, size: 3 })}
  position={[0, 0, -0.0]}
  let:ref
/>
