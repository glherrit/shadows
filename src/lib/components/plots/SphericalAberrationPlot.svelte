<script lang="ts">
  import type Lens from '$lib/lens'
  import { trace3DRay } from '$lib/raytrace'
  import { getErrorMessage } from '$lib/utils'
  import { Vector3D } from '$lib/vector'
  import { entrancePupilHalfDiameter, type LightSource } from '$src/lib/lightSource'
  import { NoSymbol } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import Chart, { type ChartItem } from 'chart.js/auto'
  import { createEventDispatcher } from 'svelte'
  import { _ } from 'svelte-i18n'

  const dispatch = createEventDispatcher()

  let userClass = ''
  export { userClass as class }

  export let lens: Lens
  export let source: LightSource
  export let refocus = 0

  export let showHeader = false
  export let titleFontSize = 18
  export let axisFontSize = 16
  export let fillColor = 'rgba(255, 255, 5, 0.2)'
  export let borderColor = 'red'
  export let padding = 30

  let gridSize = 51 // number of rays to trace through full aperture

  interface ActdionParams {
    lens: Lens
    source: LightSource | undefined
    refocus: number
    showHeader: boolean
    titleFontSize: number
    axisFontSize: number
    fillColor: string
    borderColor: string
    padding: number
  }

  let didRenderPlot = false
  let yAxisLabel: string

  function genSphericalAberrationData(
    lens: Lens,
    wavelength: number,
    refocus: number,
    halfCa: number
  ): number[][] {
    const zeroDir = new Vector3D(0.0, 0.0, 1.0)
    const inc = (2.0 * halfCa) / (gridSize - 1)
    let maxy = -1e10
    let data: number[][] = []
    for (let row = 0; row < gridSize; row++) {
      let y = -halfCa + row * inc
      let rayout = trace3DRay(new Vector3D(0.0, y, 0.0), zeroDir, lens, refocus, wavelength)
      data.push([y, rayout.pVector.y])
      if (rayout.pVector.y > maxy) {
        maxy = rayout.pVector.y
      }
    }
    if (maxy < 0.01) {
      for (let i = 0; i < data.length; i++) {
        data[i][1] *= 1000
      }
      yAxisLabel = $_('plots.sphAber.yAxis') + '(μm)'
    } else {
      yAxisLabel = $_('plots.sphAber.yAxis') + '(mm)'
    }
    return data
  }

  function drawSphAberPlot(node: HTMLCanvasElement, params: ActdionParams) {
    let chart = renderChart(node, params)
    return {
      update(params: ActdionParams) {
        chart?.destroy()
        chart = renderChart(node, params)
      },
      destroy() {
        chart?.destroy()
      },
    }
  }

  function renderChart(
    node: HTMLCanvasElement,
    {
      lens,
      source,
      refocus,
      showHeader,
      titleFontSize,
      axisFontSize,
      fillColor,
      borderColor,
      padding,
    }: ActdionParams
  ) {
    if (!source) return

    try {
      didRenderPlot = false
      if (!Number.isFinite(lens.EFL(source.wavelengths[0]))) return
      // TODO: update when handle source diameter somehow
      const data = genSphericalAberrationData(
        lens,
        source.wavelengths[0],
        refocus,
        entrancePupilHalfDiameter(source)
      )

      const title = {
        display: showHeader,
        text: $_('plots.sphAber.title'),
        font: { size: titleFontSize, family: 'Times' },
      }

      const legend = {
        display: false,
        labels: {
          usePointStyle: false,
        },
      }

      const scales = {
        y: {
          beginAtZero: true,

          title: {
            display: true,
            text: yAxisLabel,
            font: { size: axisFontSize, family: 'Calibri' },
          },
        },

        x: {
          title: {
            display: true,
            text: $_('plots.sphAber.xAxis'),
            font: { size: axisFontSize, family: 'Calibri' },
          },
        },
      }

      const chart = new Chart(node.getContext('2d') as ChartItem, {
        type: 'scatter',
        data: {
          datasets: [
            {
              data,
              showLine: true,
              backgroundColor: fillColor,
              borderColor,
              borderWidth: 3,
              pointRadius: 1,
              pointStyle: 'cross',
              pointHoverRadius: 6,
              pointBackgroundColor: 'blue',
              fill: true,
            },
          ],
        },
        options: {
          // aspectRatio: 1,
          animation: {
            duration: 500,
          },
          layout: {
            padding: {
              // adjusted by hand so that 1 padding value visually matches
              top: padding + 15,
              bottom: padding,
              left: padding,
              right: padding + 18,
            },
          },
          plugins: {
            legend,
            title,
          },
          scales,
        },
      })
      didRenderPlot = true
      return chart
    } catch (err) {
      dispatch('error', getErrorMessage(err))
      return null
    }
  }
</script>

<div class={`relative w-full bg-white ${userClass}`}>
  <canvas
    use:drawSphAberPlot={{
      lens,
      source,
      refocus,
      showHeader,
      titleFontSize,
      axisFontSize,
      fillColor,
      borderColor,
      padding,
    }}
  />
  {#if !didRenderPlot}
    <div
      class={`absolute top-0 flex h-full w-full flex-col items-center justify-center text-gray-300 ${userClass}`}
    >
      <Icon src={NoSymbol} class="" />
    </div>
  {/if}
</div>
