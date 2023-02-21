<script lang="ts">
  import { dev } from '$app/environment'
  import OptionsMenu from '$components/OptionsMenu.svelte'
  import BackgroundGrids from '$components/threlte/BackgroundGrids.svelte'
  import Coords from '$components/threlte/Coords.svelte'
  import CameraLightsAction from '$lib/components/threlte/CameraLightsAction.svelte'
  import DisplayContour from '$lib/components/threlte/DisplayContour.svelte'
  import { chooseAxisLimits } from '$src/lib/gUtils'
  import { SlideToggle } from '@skeletonlabs/skeleton'
  import { Canvas } from '@threlte/core'
  import { Vector3 } from 'three'

  let userClass = ''
  export { userClass as class }
  export let data: number[][] = []
  export let title = ''
  export let titleColor = 'black'

  let showTitle = Boolean(title)

  let showGrid = true
  let showCoords = false
  let showShadowScreens = true
  let castShadowOnOff = true
  let showSides = true
  let allowInteractivity = false

  let verticalOffset = -5
  let verticalScale = 30
  let horizontalScale = 20

  const xsraw = data.slice(Math.floor(data.length / 2)).map((row) => row[0])
  const ysraw = data.slice(Math.floor(data.length / 2)).map((row) => row[1])
  const [ymin, ymax] = chooseAxisLimits(ysraw)
  const horizCenterline = (-ymin / (ymax - ymin)) * verticalScale
</script>

<div class={`relative ${userClass}`}>
  {#if showTitle}
    <h3 class="absolute left-4 top-2 font-bold">{title}</h3>
  {/if}

  <Canvas>
    <CameraLightsAction {castShadowOnOff} cameraPosition={[-50, 30, 50]} />

    <DisplayContour
      {xsraw}
      {ysraw}
      {verticalOffset}
      {verticalScale}
      {horizontalScale}
      {allowInteractivity}
      fontColor={titleColor}
    />

    {#if showCoords}
      <Coords locXYZ={new Vector3(0, 0, 0)} />
    {/if}

    {#if showGrid}
      <BackgroundGrids
        horizontalSize={horizontalScale * 2}
        verticalSize={verticalScale}
        {horizCenterline}
        {verticalOffset}
        {showSides}
        {showShadowScreens}
      />
    {/if}
  </Canvas>

  <div class="absolute bottom-2 right-2">
    {#if dev}
      <OptionsMenu name="wfeMenu">
        <ul class="w-56">
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
              bind:checked={showCoords}
              accent="bg-primary-500"
              size="sm"
            >
              Show axes?
            </SlideToggle>
          </li>
          <li>
            <SlideToggle
              name="gridToggle"
              bind:checked={showGrid}
              accent="bg-primary-500"
              size="sm"
            >
              Show Grid?
            </SlideToggle>
          </li>
          <li>
            <SlideToggle
              name="screensToggle"
              bind:checked={showShadowScreens}
              accent="bg-primary-500"
              size="sm"
            >
              Show vertical screens?
            </SlideToggle>
          </li>
          <li>
            <SlideToggle
              name="shadowsToggle"
              bind:checked={castShadowOnOff}
              accent="bg-primary-500"
              size="sm"
            >
              Cast shadows?
            </SlideToggle>
          </li>
          <li>
            <SlideToggle
              name="interactivityToggle"
              bind:checked={allowInteractivity}
              accent="bg-primary-500"
              size="sm"
            >
              Allow interactivity?
            </SlideToggle>
          </li>
        </ul>
      </OptionsMenu>
    {/if}
  </div>
</div>
