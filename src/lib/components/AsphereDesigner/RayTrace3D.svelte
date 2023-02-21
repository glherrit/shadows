<script lang="ts">
  import { dev } from '$app/environment'
  import OptionsMenu from '$components/OptionsMenu.svelte'
  import Coords from '$components/threlte/Coords.svelte'
  import type Lens from '$lib/lens'
  import { PAN_SPEED, ROTATE_SPEED, ZOOM_SPEED } from '$src/lib/constants'
  import type { LightSource } from '$src/lib/lightSource'
  import { SlideToggle } from '@skeletonlabs/skeleton'
  import { Canvas, OrbitControls, T } from '@threlte/core'
  import { _ } from 'svelte-i18n'
  import { Vector3 } from 'three'
  import LensAndTrace from './LensAndTrace.svelte'

  export let lens: Lens
  export let source: LightSource
  export let refocus = 0.0
  export let highlightLens = false

  export let zoomSpeed = ZOOM_SPEED
  export let rotateSpeed = ROTATE_SPEED
  export let panSpeed = PAN_SPEED

  export let showOptions = false
  export let optionsPosition: 'left' | 'right' = 'right'

  export let enableSelections = false
  export let showBeam = true
  export let showSolid = false
  export let showAxes = false
  export let showTitle = false
  export let showSurfLongandLat = false

  let userClass = ''
  export { userClass as class }

  let width: number
  let height: number

  let cameraPosition: [number, number, number]
  let cameraTarget: Partial<Vector3>
  let lensEFL = lens.EFL(source.wavelengths[0]) // purposefully not reactive

  $: axisLength = lens.diameter / 2 + 5

  $: isAsphere = lens.surf1.type === 'asphere' || lens.surf2.type === 'asphere'
  $: title =
    lens.material +
    (isAsphere ? ' Asphere ' : ' ') +
    `${lens.diameter.toFixed(2)} mm Dia. x ` +
    `${lens.EFL(source.wavelengths[0]).toFixed(2)} mm EFL`

  function setViewport(view: 'side' | 'ortho' | 'centered' | 'image-back' | 'image-front') {
    const wavelength = source.wavelengths[0]
    const EFL = lens.EFL(wavelength)
    const BFL = lens.BFL(wavelength)
    lensEFL = EFL

    const zMidPoint = (BFL + lens.ct) / 2
    const xViewOffset = EFL + 5

    switch (view) {
      case 'side':
        // TODO: figure out why this is the side view ???
        cameraPosition = [-150, 0, zMidPoint]
        cameraTarget = { z: zMidPoint }
        break

      case 'ortho':
        cameraPosition = [-xViewOffset, 20, -xViewOffset / 2]
        cameraTarget = { z: zMidPoint }
        break

      case 'image-back':
        cameraPosition = [0, 0, lens.ct + BFL + 1]
        cameraTarget = { z: lens.ct + BFL }
        break

      case 'centered':
        cameraPosition = [-xViewOffset, 0, 0]
        cameraTarget = { z: 0 }
        break

      case 'image-front':
        cameraPosition = [-2, 0, lens.ct + BFL - 6]
        cameraTarget = { z: lens.ct + BFL }
        break
    }
  }

  setViewport('side')
</script>

<div class={`relative ${userClass}`} bind:clientWidth={width} bind:clientHeight={height}>
  {#if showTitle && title}
    <h3 class="card-header font-bold">{title}</h3>
  {/if}

  <Canvas>
    <T.OrthographicCamera
      makeDefault
      near={0.1}
      far={3000}
      position={cameraPosition}
      zoom={(0.75 * width) / lensEFL}
    >
      <OrbitControls
        target={cameraTarget}
        enableZoom
        {zoomSpeed}
        enablePan
        {panSpeed}
        enableRotate
        {rotateSpeed}
      />
    </T.OrthographicCamera>

    <T.AmbientLight color="white" intensity={0.3} />
    <T.DirectionalLight position={[0, 0, -50]} intensity={0.4} />
    <T.DirectionalLight position={[0, 0, 50]} intensity={0.4} />

    {#if showAxes}
      <Coords
        locXYZ={new Vector3(0, 0, 0)}
        lengths={[0, axisLength, 0, axisLength, 0, axisLength]}
      />
    {/if}

    <!-- Add lens -->
    <LensAndTrace
      {lens}
      {source}
      {showSolid}
      {showBeam}
      {refocus}
      {showSurfLongandLat}
      {enableSelections}
      {highlightLens}
      on:click:image
      on:click:lens
      on:click:beam
    />
  </Canvas>

  <div
    class="absolute bottom-2 flex gap-2"
    class:right-2={optionsPosition === 'right'}
    class:left-2={optionsPosition === 'left'}
  >
    <button
      type="button"
      class="btn btn-sm variant-ghost w-full"
      on:click={() => setViewport('side')}
    >
      {$_('buttons.reset')}
    </button>

    {#if showOptions}
      <OptionsMenu name="renderMenu" sticky>
        <ul class="flex w-44 flex-col gap-2">
          <li>
            <OptionsMenu label="View Options" name="viewMenu" buttonClasses="w-full">
              <ul class="">
                <li>
                  <button class="option" on:click={() => setViewport('side')}>
                    {$_('viewport.side')}
                  </button>
                </li>
                <li>
                  <button class="option" on:click={() => setViewport('ortho')}>
                    {$_('viewport.ortho')}
                  </button>
                </li>
                <li>
                  <button class="option" on:click={() => setViewport('centered')}>
                    {$_('viewport.opticCentered')}
                  </button>
                </li>
                <li>
                  <button class="option" on:click={() => setViewport('image-back')}>
                    {$_('viewport.imageBack')}
                  </button>
                </li>
                <li>
                  <button class="option" on:click={() => setViewport('image-front')}>
                    {$_('viewport.imageFront')}
                  </button>
                </li>
              </ul>
            </OptionsMenu>
          </li>
          <li>
            <SlideToggle
              name="beamToggle"
              bind:checked={showBeam}
              accent="bg-primary-500"
              size="sm"
            >
              {$_('labels.showBeam')}
            </SlideToggle>
          </li>

          <li>
            <SlideToggle
              name="axesToggle"
              bind:checked={showAxes}
              accent="bg-primary-500"
              size="sm"
            >
              {$_('labels.showAxes')}
            </SlideToggle>
          </li>
          {#if dev}
            <li>
              <SlideToggle
                name="solidBeamToggle"
                bind:checked={showSolid}
                accent="bg-primary-500"
                size="sm"
              >
                Solid Beam?
              </SlideToggle>
            </li>
            <li>
              <SlideToggle
                name="surfLineToggle"
                bind:checked={showSurfLongandLat}
                accent="bg-primary-500"
                size="sm"
              >
                Show Surf Lines?
              </SlideToggle>
            </li>
          {/if}
        </ul>
      </OptionsMenu>
    {/if}
  </div>
</div>
