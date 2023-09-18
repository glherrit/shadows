<script lang="ts">
  import Coords from '../threlte/Coords.svelte'
  import OrthoCameraLightsAction from '$lib/components/threlte/OrthoCameraLightsAction.svelte'
  import type Lens from '$lib/lens'
  import { arrayToScaledVector3 } from '$lib/ThreeGutils'
  import { findMaxRadius, genSpots } from '../lib/analysis/spotdiagram'
  import { entrancePupilHalfDiameter, type LightSource } from '../lib/lightSource'
  import { formatMMorMicronNumber } from '../lib/utils'
  import { T } from '@threlte/core'
  import { Text } from '@threlte/extras'
  import * as THREE from 'three'

  export let lens: Lens
  export let source: LightSource
  export let refocus: number = 0
  export let dotColor = '#b91c1c'
  export let canvasTextColor = 'black'

  let showAxes = true

  let pvstrloc: number
  const annotationFontSize = 2

  // somewhat tortureous way of defining number of spots and spaceings and begining position
  const stepSize = 0.25
  const numSpots = 9
  const begin = -((numSpots - 1) / 2) * stepSize
  const defocusValues = Array.from({ length: numSpots }, (_, i) => begin + i * stepSize)
  //console.log('🚀 ~ defocusValues', defocusValues)

  const xyScale = 50 // scale for spot diagram
  const ZaxisLength = 50
  const ZaxisExtenstion = 5
  const zScale = (2 * ZaxisLength) / (numSpots - 1) / stepSize
  //console.log('🚀 ~ zScale', zScale)

  const axisLength = 10

  function imageGeometry(
    lens: Lens,
    source: LightSource,
    refocus: number,
    zPosition: number,
    numberRays = 11
  ) {
    let pts = genSpots(
      lens,
      source.wavelengths[0],
      refocus + zPosition,
      entrancePupilHalfDiameter(source),
      numberRays
    )
    let vectordata = arrayToScaledVector3(pts, xyScale, zPosition, zScale)
    let geometry = new THREE.BufferGeometry()
    geometry.setFromPoints(vectordata)
    return geometry
  }

  // this material used in point clouds - user can change size
  let spotSize = 2
  let matpoints = new THREE.PointsMaterial({ color: dotColor, size: spotSize })
  $: updateMatPoints = () => {
    matpoints.color.set(new THREE.Color(dotColor))
    matpoints.size = spotSize
  }

  $: imageMapGeometry = (zposi: number) => {
    return imageGeometry(lens, source, refocus, zposi, 21)
  }

  $: defocusMaxY = (defocus: number) => {
    const maxy = findMaxRadius(
      lens,
      source.wavelengths[0],
      refocus + defocus,
      entrancePupilHalfDiameter(source),
      21
    )
    return maxy
  }

  $: maxYString = (defocus: number) => {
    const spotDia =
      findMaxRadius(lens, source.wavelengths[0], defocus, entrancePupilHalfDiameter(source), 21) * 2

    return formatMMorMicronNumber(spotDia)
  }

  let zoom = 10 // eventaully group these two near top
  let cP: [number, number, number] = [-55, 30, -75]
  let tV = { x: 0, y: 0, z: 0 }
  $: controlsResetKey = 0 // use this to rerender the orbit controls
  function resetViewport() {
    cP = [-55, 30, -75]
    tV = { x: 0, y: 0, z: 0 }
    zoom = 10
    spotSize = 2
    updateMatPoints()
    controlsResetKey++
  }

  const maxy = findMaxRadius(
    lens,
    source.wavelengths[0],
    refocus,
    entrancePupilHalfDiameter(source),
    21
  )
  pvstrloc = -maxy * xyScale
</script>

    <OrthoCameraLightsAction cameraPosition={cP} targetView={tV} {zoom} castShadowOnOff={false} />

    {#each defocusValues as defocus}
      <T.Mesh
        position={[-defocusMaxY(defocus) * xyScale * 1.1, 0, defocus * zScale]}
        rotation={[0, Math.PI, 0]}
        castShadow={false}
        let:ref
      >
        <Text
          text={defocus === 0
            ? 'Image Plane'
            : `dZ ${defocus > 0 ? '+' : ''}${defocus.toFixed(2)}`}
          color={canvasTextColor}
          fontSize={annotationFontSize}
          anchorX={'left'}
          anchorY={'center'}
        />
      </T.Mesh>

      <T.Mesh
        position={[0, defocusMaxY(defocus) * 1.1 * xyScale, defocus * zScale]}
        rotation={[0, Math.PI, 0]}
        castShadow={false}
        let:ref
      >
        <Text
          text="ø {maxYString(refocus + defocus)}"
          color={canvasTextColor}
          fontSize={annotationFontSize}
          anchorX={'center'}
          anchorY={'bottom'}
        />
      </T.Mesh>

      <T.Points args={[imageMapGeometry(defocus), matpoints]} />
    {/each}

    {#if showAxes}
      <Coords
        lengths={[
          0,
          axisLength,
          0,
          axisLength,
          -ZaxisLength - ZaxisExtenstion,
          ZaxisLength + ZaxisExtenstion,
        ]}
        showX={false}
        showY={false}
        showZ={true}
      />
    {/if}


