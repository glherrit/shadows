<script lang="ts">
  import Chart, { type ChartItem } from 'chart.js/auto'
  import type Lens from '$lib/lens'

  let userClass = ''
  export { userClass as class }

  export let lens: Lens

  export let showHeader = true
  export let titleFontSize = 18
  export let axisFontSize = 16
  export let padding = 30

  interface ActionParams {
    lens: Lens
    showHeader: boolean
    titleFontSize: number
    axisFontSize: number
    padding: number
  }

  function drawIndexVsWavelength(node: HTMLCanvasElement, params: ActionParams) {
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

  // https://svelte.dev/tutorial/actions
  function renderChart(
    node: HTMLCanvasElement,
    { lens, showHeader, titleFontSize, axisFontSize, padding }: ActionParams
  ) {
    try {
      const npts = 51
      let xydata: number[][] = []
      const matl = lens.material
      const wlinc = matl.maxWlen / (npts - 1)

      for (let i = 0; i < npts; i++) {
        let ithwl = matl.minWlen + i * wlinc
        if (ithwl < matl.minWlen) {
          ithwl = matl.minWlen
        }
        if (ithwl > matl.maxWlen) {
          ithwl = matl.maxWlen
        }
        xydata.push([ithwl, matl.nIndexAt(ithwl)])
      }

      const title = {
        display: showHeader,
        text: 'Index Chart for ' + matl,
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
          min: matl.minWlen,
          title: {
            display: true,
            text: 'Wavelength - λ (μm)',
            font: { size: axisFontSize, family: 'Calibri' },
          },
          ticks: { autoSkip: false },
        },
      }

      const chart = new Chart(node.getContext('2d') as ChartItem, {
        type: 'scatter',
        data: {
          datasets: [
            {
              data: xydata,
              showLine: true,
              backgroundColor: 'rgba(255, 255, 5, 0.2)',
              borderColor: 'red',
              borderWidth: 3,
              tension: 0.04,
              pointRadius: 0,
              pointStyle: 'circle',
              pointHoverRadius: 15,
              pointBackgroundColor: 'blue',
              fill: true,
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
    use:drawIndexVsWavelength={{ lens, showHeader, titleFontSize, axisFontSize, padding }}
  />
</div>
