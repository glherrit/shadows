<script lang="ts">
  import Chart, { type ChartItem } from 'chart.js/auto'
  import Material from '$lib/lens/material'
  import type { LightSource } from '$src/lib/lightSource'

  let userClass = ''
  export { userClass as class }

  export let source: LightSource | undefined

  export let showHeader = true
  export let titleFontSize = 18
  export let axisFontSize = 16
  export let fillColor = 'rgba(255, 255, 5, 0.2)'
  export let borderColor = 'red'
  export let padding = 30

  interface ActionParams {
    source: LightSource | undefined
    showHeader: boolean
    titleFontSize: number
    axisFontSize: number
    fillColor: string
    borderColor: string
    padding: number
  }

  type NPairs = {
    mat: string
    n: number
  }

  function drawIndexVsMaterials(node: HTMLCanvasElement, params: ActionParams) {
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
      source,
      showHeader,
      titleFontSize,
      axisFontSize,
      fillColor,
      borderColor,
      padding,
    }: ActionParams
  ) {
    if (!source) return

    try {
      const pairs: NPairs[] = []
      const mats = Material.allMaterials
      const wlen = source.wavelengths[0]

      mats.forEach((element) => {
        const mattype = Material.fromString(element)
        if (mattype.minWlen < wlen && wlen < mattype.maxWlen) {
          pairs.push({ mat: mattype.toString(), n: mattype.nIndexAt(wlen) })
        }
      })

      // sort pairs in ascending order
      pairs.sort((a, b) => (a.n > b.n ? 1 : -1))

      const title = {
        display: showHeader,
        text: `Various Material Indices at ${wlen} μm`,
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
          beginAtZero: false,
          title: {
            display: true,
            text: 'Index (unitless)',
            font: { size: axisFontSize, family: 'Calibri' },
          },
        },

        x: {
          title: {
            display: false,
            text: 'Material Type',
            font: { size: axisFontSize, family: 'Calibri' },
          },
          ticks: { autoSkip: false },
        },
      }

      const chart = new Chart(node.getContext('2d') as ChartItem, {
        type: 'line',
        data: {
          labels: pairs.map((obj) => obj.mat),
          datasets: [
            {
              data: pairs.map((obj) => obj.n),
              showLine: false,
              backgroundColor: fillColor,
              borderColor: borderColor,
              borderWidth: 3,
              tension: 0.04,
              pointRadius: 4,
              pointStyle: 'triangle',
              pointHoverRadius: 15,
              //pointBackgroundColor: 'blue',
              fill: false,
            },
          ], // end of datasets
        }, // end of data
        options: {
          animation: { duration: 250 },
          layout: { padding: padding },
          plugins: { title, legend }, // end of plugins
          scales,
        },
      })
      return chart
    } catch (err) {
      console.error(err)
      return null
    }
  }
</script>

<div class="">
  <canvas
    class={`bg-white ${userClass}`}
    use:drawIndexVsMaterials={{
      source,
      showHeader,
      titleFontSize,
      axisFontSize,
      fillColor,
      borderColor,
      padding,
    }}
  />
</div>
