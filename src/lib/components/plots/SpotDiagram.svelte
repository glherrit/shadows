<script lang="ts">
  import type Lens from '$lib/lens'
  import { trace3DRay } from '$lib/raytrace'
  import { getErrorMessage, getHexRGBColorFromCSSVar } from '$lib/utils'
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

  export let pointColor = getHexRGBColorFromCSSVar('--color-primary-500')
  export let titleColor = getHexRGBColorFromCSSVar('--color-surface-600')
  export let ticksColor = getHexRGBColorFromCSSVar('--color-surface-400')
  export let gridColor = getHexRGBColorFromCSSVar('--color-surface-300')

  export let titleFontSize = 18
  export let axisFontSize = 16
  export let padding = 30

  interface ActionParams {
    lens: Lens
    source: LightSource | undefined
    refocus: number
    pointColor: string
    titleColor: string
    ticksColor: string
    gridColor: string
    showHeader: boolean
    titleFontSize: number
    axisFontSize: number
    padding: number
  }

  let didRenderPlot = false
  let yAxisLabel: string
  let xAxisLabel: string
  let minDataVal: number
  let maxDataVal: number

  function genSpotDiagramSlim(
    lens: Lens,
    wavelength: number,
    refocus: number,
    halfCa: number,
    gridsize: number
  ): number[][] {
    const zeroDir = new Vector3D(0.0, 0.0, 1.0)
    let data: number[][] = []

    let inc = (2.0 * halfCa) / (gridsize - 1)
    const diag = halfCa * halfCa * 1.0001 // add a little extra to make sure and get the cardinal points
    for (let row = 0; row < gridsize; row++) {
      for (let col = 0; col < gridsize; col++) {
        let x = -halfCa + row * inc
        let y = -halfCa + col * inc
        if (diag > x * x + y * y) {
          let rayout = trace3DRay(new Vector3D(x, y, 0.0), zeroDir, lens, refocus, wavelength)
          data.push([rayout.pVector.x, rayout.pVector.y])
        }
      }
    }

    ;[minDataVal, maxDataVal] = data
      .flat()
      .reduce(([min, max], val) => [Math.min(min, val), Math.max(max, val)], [Infinity, -Infinity])

    if (maxDataVal < 0.01) {
      for (let i = 0; i < data.length; i++) {
        for (let k = 0; k < data[i].length; k++) {
          data[i][k] *= 1000
        }
      }
      minDataVal *= 1000
      maxDataVal *= 1000
      xAxisLabel = $_('plots.spotDiagram.xAxis') + ' (μm)'
      yAxisLabel = $_('plots.spotDiagram.yAxis') + ' (μm)'
    } else {
      xAxisLabel = $_('plots.spotDiagram.xAxis')
      yAxisLabel = $_('plots.spotDiagram.yAxis')
    }

    return data
  }

  function drawSpotDiagram(node: HTMLCanvasElement, params: ActionParams) {
    let chart = renderChart(node, params)
    return {
      update(params: ActionParams) {
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
      pointColor,
      titleColor,
      ticksColor,
      gridColor,
      refocus,
      showHeader,
      titleFontSize,
      axisFontSize,
      padding,
    }: ActionParams
  ) {
    if (!source) return

    try {
      didRenderPlot = false
      if (!Number.isFinite(lens.EFL(source.wavelengths[0]))) return

      // TODO: update when handle source diameter somehow
      const data = genSpotDiagramSlim(
        lens,
        source.wavelengths[0],
        refocus,
        entrancePupilHalfDiameter(source),
        51
      )

      const title = {
        display: showHeader,
        text: $_('plots.spotDiagram.title'),
        font: { size: titleFontSize },
      }

      const legend = {
        display: false,
        labels: {
          usePointStyle: false,
        },
      }

      const scales = {
        x: {
          min: minDataVal * 1.1,
          max: maxDataVal * 1.1,
          title: {
            display: true,
            text: xAxisLabel,
            font: { size: axisFontSize },
            color: titleColor,
          },
          border: {
            color: gridColor,
          },
          grid: {
            color: gridColor,
          },
          ticks: {
            color: ticksColor,
          },
        },

        y: {
          min: minDataVal * 1.1,
          max: maxDataVal * 1.1,
          title: {
            display: true,
            text: yAxisLabel,
            font: { size: axisFontSize },
            color: titleColor,
          },
          ticks: {
            color: ticksColor,
          },
          border: {
            color: gridColor,
          },
          grid: {
            color: gridColor,
          },
        },
      }

      const chart = new Chart(node.getContext('2d') as ChartItem, {
        type: 'scatter',
        data: {
          datasets: [
            {
              data,
              showLine: false,
              borderColor: pointColor,
              borderWidth: 3,
              pointRadius: 1,
              pointStyle: 'cross',
              pointHoverRadius: 3,
            },
          ],
        },
        options: {
          aspectRatio: 1,
          maintainAspectRatio: true,
          animation: {
            duration: 0,
          },
          layout: {
            padding: {
              // adjusted by hand so that 1 padding value visually matches
              top: padding + 22,
              bottom: padding + 8,
              left: padding,
              right: padding,
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

<div class={`flex justify-center ${userClass}`}>
  <canvas
    use:drawSpotDiagram={{
      lens,
      source,
      refocus,
      titleColor,
      pointColor,
      ticksColor,
      gridColor,
      showHeader,
      titleFontSize,
      axisFontSize,
      padding,
    }}
  />
  {#if !didRenderPlot}
    <Icon src={NoSymbol} class="h-auto w-20 text-surface-500" />
  {/if}
</div>
