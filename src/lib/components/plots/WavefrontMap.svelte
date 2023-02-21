<script lang="ts">
  import { calcWfeVecs } from '$lib/erroranalysis'
  import type Lens from '$lib/lens'
  import { getErrorMessage } from '$lib/utils'
  import { Vector3D } from '$lib/vector'
  import { entrancePupilHalfDiameter, type LightSource } from '$src/lib/lightSource'
  import { NoSymbol } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import { createEventDispatcher } from 'svelte'
  import { _ } from 'svelte-i18n'
  import ContourMap from './ContourMap.svelte'

  const dispatch = createEventDispatcher()

  let userClass = ''
  export { userClass as class }

  export let lens: Lens
  export let showHeader = false
  export let source: LightSource | undefined
  export let refocus = 0
  export let gridSize = 101
  export let backgroundColor = '#ffffff'

  let data: number[]
  $: data = source
    ? genFlatWfeMap(
        lens,
        source.wavelengths[0],
        refocus,
        entrancePupilHalfDiameter(source),
        gridSize
      )
    : []

  let didRenderPlot = false

  function genFlatWfeMap(
    lens: Lens,
    wavelength: number,
    refocus: number,
    halfCa: number,
    gridsize: number
  ) {
    try {
      didRenderPlot = false

      if (gridsize < 2) {
        throw Error('Gridsize cant be less than 2')
      }

      const zeroDir = new Vector3D(0.0, 0.0, 1.0)

      let wfemap: number[] = []
      let inc = (2.0 * halfCa) / (gridsize - 1)
      const diag = halfCa * halfCa * 1.0001 // add a little extra to make sure and get the cardinal points

      let ctx = 0
      let sum = 0
      let sumsum = 0

      for (let row = 0; row < gridsize; row++) {
        for (let col = 0; col < gridsize; col++) {
          let x = -halfCa + row * inc
          let y = -halfCa + col * inc
          if (diag > x * x + y * y) {
            let p = new Vector3D(x, y, 0.0)
            let wfe = calcWfeVecs(p, zeroDir, lens, refocus, wavelength)
            sum += wfe
            sumsum += wfe * wfe
            ctx += 1
            wfemap.push(wfe)
          } else {
            wfemap.push(NaN)
          }
        }
      }

      const varirms = Math.sqrt((sumsum - (sum * sum) / ctx) / (ctx - 1.0))
      console.debug('Mapper WFE RMS: ' + varirms)

      didRenderPlot = true
      return wfemap
    } catch (err) {
      dispatch('error', getErrorMessage(err))
      return []
    }
  }

  // TS cant recognize the let:max/min syntax on slot, so this fixes type errors
  /* eslint-disable @typescript-eslint/no-unused-vars */
  let min: number, max: number
</script>

{#if data.length > 0 && didRenderPlot}
  <ContourMap
    class={userClass}
    header={$_('plots.wavefrontMap.title')}
    {showHeader}
    {data}
    {backgroundColor}
  >
    <slot name="maxValue" slot="maxValue" let:max {max}>
      <span>
        {$_('plots.wavefrontMap.max', { values: { max } })}
      </span>
    </slot>

    <slot name="minValue" slot="minValue" let:min {min}>
      <span>
        {$_('plots.wavefrontMap.min', { values: { min } })}
      </span>
    </slot>
  </ContourMap>
{:else}
  <div
    class={`flex h-full w-full flex-col items-center justify-center bg-white text-gray-300 ${userClass}`}
  >
    <Icon src={NoSymbol} class="" />
  </div>
{/if}
