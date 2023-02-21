<script lang="ts">
  import { colorMap as rainbow } from '$lib/colormap'
  import { hexToRgb } from '$lib/utils'

  let userClass = ''
  export { userClass as class }

  export let header = 'Contour Map'
  export let showHeader = true
  export let data: number[]
  export let backgroundColor = '#ffffff'
  export let colorMap = rainbow

  interface ActionParams {
    data: number[]
    backgroundColor: string
    colorMap: number[][]
  }

  let minValue: number
  let maxValue: number

  $: formattedMin =
    minValue && Math.abs(minValue) < 0.005 ? minValue.toExponential(2) : (minValue || 0).toFixed(3)
  $: formattedMax =
    maxValue && Math.abs(maxValue) < 0.005 ? maxValue.toExponential(2) : (maxValue || 0).toFixed(3)

  function minMax(arr: number[]) {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    arr.forEach((val) => {
      if (val < min) {
        min = val
      }
      if (val > max) {
        max = val
      }
    })
    return [min, max]
  }

  function drawContour(node: HTMLCanvasElement, params: ActionParams) {
    render(node, params)
    return {
      update(params: ActionParams) {
        render(node, params)
      },
    }
  }

  function render(node: HTMLCanvasElement, { data, backgroundColor, colorMap }: ActionParams) {
    if (!data) {
      console.warn('No data to draw')
      return
    }

    if (Math.sqrt(data.length) % 1 !== 0) {
      throw new Error(`Data must be square`)
    }

    const ctx = node.getContext('2d')
    if (!ctx) throw Error("Couldn't get canvas context")

    ctx.clearRect(0, 0, node.width, node.height)

    const gridSize = Math.round(Math.sqrt(data.length))
    node.width = gridSize
    node.height = gridSize
    ;[minValue, maxValue] = minMax(data)

    const diff = maxValue - minValue
    let normalizedData = data.map((val) =>
      // use -1 to indicate no data (draw background in image)
      isNaN(val) ? -1 : Math.round(((colorMap.length - 1) * (val - minValue)) / diff)
    )
    const imageData = ctx.createImageData(gridSize, gridSize)
    const bgColor = hexToRgb(backgroundColor)

    for (let p = 0; p < imageData.data.length; p += 4) {
      const colorIdx = normalizedData[p / 4]
      const isBackground = colorIdx === -1
      imageData.data[p + 0] = isBackground ? bgColor[0] : colorMap[colorIdx][0]
      imageData.data[p + 1] = isBackground ? bgColor[1] : colorMap[colorIdx][1]
      imageData.data[p + 2] = isBackground ? bgColor[2] : colorMap[colorIdx][2]
      imageData.data[p + 3] = 255
    }
    ctx.putImageData(imageData, 0, 0)
  }

  function drawColorScale(node: HTMLCanvasElement) {
    const ctx = node.getContext('2d')
    if (!ctx) throw Error("Couldn't get canvas context")

    // this can be super low res
    node.height = 30
    node.width = 1

    const colorScale = ctx.createImageData(node.width, node.height)
    for (let row = 0; row < node.height; row++) {
      for (let col = 0; col < node.width; col++) {
        const posi = col * 4 + row * 4 * node.width
        const cmaposi = colorMap.length - Math.round((row * colorMap.length) / node.height) - 1
        colorScale.data[posi + 0] = colorMap[cmaposi][0]
        colorScale.data[posi + 1] = colorMap[cmaposi][1]
        colorScale.data[posi + 2] = colorMap[cmaposi][2]
        colorScale.data[posi + 3] = 255
      }
    }
    ctx.putImageData(colorScale, 0, 0)
  }
</script>

<div
  class={`grid grid-cols-2 items-center justify-around p-4 ${userClass}`}
  style:background-color={backgroundColor}
  style:aspect-ratio={2 / 1}
>
  {#if showHeader}
    <h3 class="">
      {header}
    </h3>
  {/if}
  <canvas class="" use:drawContour={{ data, backgroundColor, colorMap }} />

  <div class="">
    <slot name="maxValue" max={formattedMax}>
      {#if typeof maxValue !== 'undefined'}
        <span>{formattedMax}</span>
      {/if}
    </slot>
    <canvas class="" use:drawColorScale style:aspect-ratio={1 / 5} />
    <slot name="minValue" min={formattedMin}>
      {#if typeof minValue !== 'undefined'}
        <span>{formattedMin}</span>
      {/if}
    </slot>
  </div>
</div>
