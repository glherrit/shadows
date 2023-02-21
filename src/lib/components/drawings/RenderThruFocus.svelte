<script lang="ts">
  import { dev } from '$app/environment'
  import OptionsMenu from '$components/OptionsMenu.svelte'
  import Coords from '$components/threlte/Coords.svelte'
  import OrthoCameraLightsAction from '$lib/components/threlte/OrthoCameraLightsAction.svelte'
  import type Lens from '$lib/lens'
  import { arrayToScaledVector3 } from '$lib/ThreeGutils'
  import { findMaxRadius, genSpots } from '$src/lib/analysis/spotdiagram'
  import { entrancePupilHalfDiameter, type LightSource } from '$src/lib/lightSource'
  import { formatMMorMicronNumber } from '$src/lib/utils'
  import { RangeSlider, SlideToggle } from '@skeletonlabs/skeleton'
  import { Canvas, T } from '@threlte/core'
  import { Text } from '@threlte/extras'
  import { _ } from 'svelte-i18n'
  import * as THREE from 'three'

  export let lens: Lens
  export let source: LightSource
  export let refocus: number

  export let showOptions = true
  export let title = ''
  export let dotColor = '#b91c1c'
  export let canvasTextColor = 'black'
  let userClass = ''
  export { userClass as class }

  export let showAxes = true
  export let showTitle = true

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

<div class={`relative overflow-hidden ${userClass}`}>
  {#if showTitle && title}
    <h3 class="absolute left-4 top-2 font-bold">{title}</h3>
  {/if}

  <Canvas>
    <OrthoCameraLightsAction cameraPosition={cP} targetView={tV} {zoom} castShadowOnOff={false} />

    <!--
    {#if showgrids}
      <BackgroundGrids 
        verticalSize={0.1}
        horizontalSize={2 *
          xyScale *
          findMaxRadius(lens, source.wavelengths[0], refocus, source.diameter / 2, 21)}
        offset={verticalOffset}
        sideGrids={false}
        rotateX={Math.PI / 2}
      />
    {/if}
    -->

    {#each defocusValues as defocus}
      <T.Mesh
        position={[-defocusMaxY(defocus) * xyScale * 1.1, 0, defocus * zScale]}
        rotation={[0, Math.PI, 0]}
        castShadow={false}
        let:ref
      >
        <Text
          text={defocus === 0
            ? $_('labels.imagePlane')
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
          text={`ø ${maxYString(refocus + defocus)}`}
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
        colorZ={'darkred'}
      />
    {/if}
  </Canvas>

  <div class="absolute bottom-2 right-2 flex gap-2">
    <button type="button" class="btn btn-sm variant-ghost w-full" on:click={resetViewport}>
      {$_('buttons.reset')}
    </button>
    {#if showOptions}
      <OptionsMenu name="tfMenu" sticky>
        <ul class="flex w-40 flex-col gap-2">
          <li>
            <label for="spotSizeSlider">
              <span>{$_('labels.dotSize')}</span>
              <RangeSlider
                name="spotSizeSlider"
                bind:value={spotSize}
                accent="!accent-error-500"
                min={0}
                max={10}
                step={1}
                ticked
                on:change={updateMatPoints}
              />
            </label>
          </li>
          {#if dev}
            <hr />
            <li>
              <SlideToggle
                name="titleToggle"
                bind:checked={showTitle}
                accent="bg-primary-500"
                size="sm"
              >
                Show Title?
              </SlideToggle>
            </li>
            <li>
              <SlideToggle
                name="axesToggle"
                bind:checked={showAxes}
                accent="bg-primary-500"
                size="sm"
              >
                Show Axes?
              </SlideToggle>
            </li>
          {/if}
        </ul>
      </OptionsMenu>
    {/if}
  </div>
</div>
