<script lang="ts">
  import { formatMMorMicronNumber, getErrorMessage, getHexRGBColorFromCSSVar } from '$lib/utils'
  import { LightSourceKind, type LightSource } from '$src/lib/lightSource'
  import { NoSymbol } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import Chart, { ChartOptions, type ChartItem } from 'chart.js/auto'
  import { createEventDispatcher } from 'svelte'
  import { _ } from 'svelte-i18n'

  const dispatch = createEventDispatcher()

  let userClass = ''
  export { userClass as class }

  export let data: number[][]
  export let source: LightSource

  export let showGaussDiameter = false

  export let showTitle = false
  export let titlestr = ''
  export let titleFontSize = 8

  export let xAxisTitle = 'x'
  export let yAxisTitle = 'y'
  export let axisFontSize = 18
  export let annotationFontSize = 16

  export let lineColor = getHexRGBColorFromCSSVar('--color-primary-500')
  export let fillColor = getHexRGBColorFromCSSVar('--color-primary-500') + '30'
  export let titleColor = getHexRGBColorFromCSSVar('--color-surface-600')
  export let ticksColor = getHexRGBColorFromCSSVar('--color-surface-400')
  export let gridColor = getHexRGBColorFromCSSVar('--color-surface-300')

  export let padding = 0

  interface ActionParams {
    data: number[][]
    showTitle: boolean
    titleFontSize: number
    lineColor: string
    fillColor: string
    titleColor: string
    ticksColor: string
    gridColor: string
    axisFontSize: number
    padding: number
  }

  let didRenderPlot = false

  function calcGaussDiameterAndPeak() {
    const xsraw = data.slice(Math.floor(data.length / 2)).map((row) => row[0])
    const ysraw = data.slice(Math.floor(data.length / 2)).map((row) => row[1])
    const peak = ysraw[0] * 0.135
    for (let i = 1; i < xsraw.length; i++) {
      if (ysraw[i - 1] > peak && ysraw[i] <= peak) {
        //console.log(xsraw[i - 1].toFixed(3), ysraw[i - 1].toFixed(3))
        //console.log(xsraw[i].toFixed(3), ysraw[i].toFixed(3))
        const gaussDiameter =
          2 * //multiply by two for diameter
          (xsraw[i - 1] -
            ((ysraw[i - 1] - peak) * (xsraw[i - 1] - xsraw[i])) / (ysraw[i - 1] - ysraw[i]))
        //console.log('gauss point at ', gaussDiameter.toFixed(1))
        return { gaussDiameter, peak }
      }
    }
    throw new Error("Couldn't find gauss diameter")
  }

  function LinePlot2D(node: HTMLCanvasElement, params: ActionParams) {
    if (!data) return
    if (!source) return

    //console.log('********************************')
    //console.log('🚀 ~ source.kind', source.kind)
    //console.log('titlestr', titlestr)
    //console.log('label', $_('plots.psfLine.title'))

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

  function getAnnotations() {
    if (source.kind === LightSourceKind.CollimatedGaussian && showGaussDiameter) {
      try {
        const { gaussDiameter, peak } = calcGaussDiameterAndPeak()
        const formattedDia = formatMMorMicronNumber(gaussDiameter)
        return {
          annotation: {
            annotations: {
              line: {
                type: 'line',
                borderColor: titleColor,
                borderWidth: 4,
                borderDash: [5, 5],
                yMin: peak,
                yMax: peak,
                xMin: -gaussDiameter / 2,
                xMax: gaussDiameter / 2,
              },
              text: {
                type: 'label',
                color: titleColor,
                position: 'center',
                yValue: peak,
                xAdjust: 0,
                yAdjust: peak - annotationFontSize,
                content: [$_('plots.psfLine.gaussDia', { values: { dia: formattedDia } })],
                font: { size: annotationFontSize },
              },
            },
          },
        } as ChartOptions
      } catch (err) {
        console.error(`getAnnotations() error, returning no annotations :>> `, err)
        // TODO: check w/ Gary about what is the correct thing to do here, for now return undefined
      }
    }
  }

  // https://svelte.dev/tutorial/actions
  function renderChart(
    node: HTMLCanvasElement,
    {
      data,
      showTitle,
      titleFontSize,
      axisFontSize,
      lineColor,
      fillColor,
      titleColor,
      ticksColor,
      gridColor,
      padding,
    }: ActionParams
  ) {
    try {
      didRenderPlot = false

      const chart = new Chart(node.getContext('2d') as ChartItem, {
        type: 'scatter',
        data: {
          datasets: [
            {
              data,
              showLine: true,
              backgroundColor: fillColor,
              borderColor: lineColor,
              borderWidth: 3,
              tension: 0.0,
              pointRadius: 0,
              pointStyle: 'circle',
              pointHoverRadius: 15,
              pointBackgroundColor: 'blue',
              fill: true,
            },
          ],
        },

        options: {
          aspectRatio: 1.3,
          // maintainAspectRatio: true,
          animation: { duration: 0 },
          layout: {
            padding: {
              // adjusted by hand so that 1 padding value visually matches
              top: padding + 15,
              bottom: padding,
              left: padding,
              right: padding + 18,
            },
          },

          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: yAxisTitle,
                font: { size: axisFontSize },
                color: titleColor,
              },
              grid: {
                color: gridColor,
              },
              ticks: {
                font: { size: axisFontSize },
                color: ticksColor,
              },
            },

            x: {
              title: {
                display: true,
                text: xAxisTitle,
                font: { size: axisFontSize },
                color: titleColor,
              },
              grid: {
                color: gridColor,
              },
              ticks: {
                font: { size: axisFontSize },
                color: ticksColor,
              },
            },
          },

          plugins: {
            title: {
              display: showTitle,
              text: titlestr,
              font: { size: titleFontSize },
              color: titleColor,
              padding: { top: 10, bottom: 20 },
            },

            legend: {
              display: false,
              labels: {
                usePointStyle: false,
              },
            },

            ...getAnnotations(),
          },
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
    class:hidden={!didRenderPlot}
    use:LinePlot2D={{
      data,
      showTitle,
      lineColor,
      fillColor,
      titleColor,
      ticksColor,
      gridColor,
      titleFontSize,
      axisFontSize,
      padding,
    }}
  />

  {#if !didRenderPlot}
    <Icon src={NoSymbol} class="w-20 text-surface-200-700-token" />
  {/if}
</div>
