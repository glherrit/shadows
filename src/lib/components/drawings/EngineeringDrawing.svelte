<script lang="ts">
  import { page } from '$app/stores'
  import type Lens from '$lib/lens'
  import { saveTextToFile } from '$lib/utils'
  import { toastStore } from '@skeletonlabs/skeleton'
  import { _ } from 'svelte-i18n'
  import LensSVG from './LensWithDimensions.svelte'

  export let lens: Lens
  export let wavelength: number
  export let drawingName: string

  const currentUser = $page.data.user

  const outerWidth = 850
  const outerHeight = 600

  // top left position data
  const topCenter = '40'
  const topBottom = '80'
  const textPosX1 = Array.from(Array(7).keys())
    .map((x) => x * 80)
    .map(String)
  const textPosX2 = Array.from(Array(7).keys())
    .map((x) => 40 + x * 80)
    .map(String)

  const textPosY1 = '25'
  const textPosY2 = '65'

  // Bottom right position data
  const botBoxWidth = 300
  const botBoxDivider = 120

  const botBoxHeight = 80
  const botBoxheightDivider1 = 40 // these work top to bottom
  const botBoxheightDivider2 = 20

  // Bottom right position data
  const botTextPosX = [
    (outerWidth - botBoxWidth).toString(), // -250
    (outerWidth - botBoxDivider).toString(), // -100
    outerWidth.toString(),
  ]
  const botTextPosY = [
    (outerHeight - botBoxHeight).toString(), // -70
    (outerHeight - botBoxheightDivider1).toString(), // -40
    (outerHeight - botBoxheightDivider2).toString(), // -20
    outerHeight.toString(),
  ]

  const titleLabel: Point<string> = {
    x: (outerWidth - botBoxWidth / 2).toString(),
    y: (outerHeight - botBoxheightDivider1 - (botBoxHeight - botBoxheightDivider1) / 3).toString(),
  }

  const userLabel: Point<string> = {
    x: (outerWidth - botBoxWidth / 2 - botBoxDivider / 2).toString(),
    y: (
      outerHeight -
      botBoxheightDivider2 -
      (botBoxheightDivider1 - botBoxheightDivider2) / 3
    ).toString(),
  }
  const userValue: Point<string> = {
    x: (outerWidth - botBoxWidth / 2 - botBoxDivider / 2).toString(),
    y: (outerHeight - botBoxheightDivider2 / 3).toString(),
  }

  const dateLabel: Point<string> = {
    x: (outerWidth - botBoxDivider / 2).toString(),
    y: (
      outerHeight -
      botBoxheightDivider2 -
      (botBoxheightDivider1 - botBoxheightDivider2) / 3
    ).toString(),
  }
  const dateValue: Point<string> = {
    x: (outerWidth - botBoxDivider / 2).toString(),
    y: (outerHeight - botBoxheightDivider2 / 3).toString(),
  }

  const allUnitsX = '10'
  const allUnitsY = (outerHeight - 5).toString()
  const currentDate = new Date().toLocaleDateString()

  let drawingSVG: SVGSVGElement

  function handleSaveSVGClick() {
    if (drawingSVG.outerHTML) {
      saveTextToFile(drawingSVG.outerHTML, `${drawingName}.svg`)
    }
  }

  function handleCopyToClipboardClick() {
    if (drawingSVG.outerHTML) {
      navigator.clipboard.writeText(drawingSVG.outerHTML)
      toastStore.trigger({ message: $_('alert.copySuccess'), preset: 'success' })
    }
  }
</script>

<svg
  name="EngineeringDrawing"
  version="1.1"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox={`0, 0, ${outerWidth.toFixed(0)}, ${outerHeight.toFixed(0)}`}
  bind:this={drawingSVG}
>
  <!-- draw bounding rectangle -->
  <rect
    x="0"
    y="0"
    width={outerWidth}
    height={outerHeight}
    style="fill: #FFFFFF; stroke: black; stroke-width: 3;"
  />
  <!-- draw top left edge boxes -->
  <line
    x1="0"
    y1={topCenter}
    x2={textPosX1[6]}
    y2={topCenter}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1="0"
    y1={topBottom}
    x2={textPosX1[6]}
    y2={topBottom}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={textPosX1[1]}
    y1={topBottom}
    x2={textPosX1[1]}
    y2="0"
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={textPosX1[2]}
    y1={topBottom}
    x2={textPosX1[2]}
    y2="0"
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={textPosX1[3]}
    y1={topBottom}
    x2={textPosX1[3]}
    y2="0"
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={textPosX1[4]}
    y1={topBottom}
    x2={textPosX1[4]}
    y2="0"
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={textPosX1[5]}
    y1={topBottom}
    x2={textPosX1[5]}
    y2="0"
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={textPosX1[6]}
    y1={topBottom}
    x2={textPosX1[6]}
    y2="0"
    fill="none"
    stroke="black"
    stroke-width="1"
  />

  <!-- draw text in top boxes - these are the labels for the parameters in second row -->
  <text class="small" text-anchor="middle" x={textPosX2[0]} y={textPosY1}>
    {$_('drawing.titleMaterial')}
  </text>
  <text class="small" text-anchor="middle" x={textPosX2[1]} y={textPosY1}>
    {$_('drawing.titleWavelength')}
  </text>
  <text class="small" text-anchor="middle" x={textPosX2[2]} y={textPosY1}>
    {$_('drawing.titleIOR')}
  </text>
  <text class="small" text-anchor="middle" x={textPosX2[3]} y={textPosY1}>
    {$_('drawing.titleDiameter')}
  </text>
  <text class="small" text-anchor="middle" x={textPosX2[4]} y={textPosY1}>
    {$_('drawing.titleEFL')}
  </text>
  <text class="small" text-anchor="middle" x={textPosX2[5]} y={textPosY1}>
    {$_('drawing.titleBFL')}
  </text>

  <!-- draw text in top boxes - these are the labels for the parameters in second row -->
  <text class="small2" text-anchor="middle" x={textPosX2[0]} y={textPosY2}>
    {lens.material}
  </text>
  <text class="small2" text-anchor="middle" x={textPosX2[1]} y={textPosY2}>
    {wavelength ? `${wavelength} μm` : 'undefined'}
  </text>
  <text class="small2" text-anchor="middle" x={textPosX2[2]} y={textPosY2}>
    {wavelength ? lens.material.nIndexAt(wavelength).toFixed(5) : 'undefined'}
  </text>
  <text class="small2" text-anchor="middle" x={textPosX2[3]} y={textPosY2}>
    {lens.diameter.toFixed(4)}
  </text>
  <text class="small2" text-anchor="middle" x={textPosX2[4]} y={textPosY2}>
    {wavelength ? lens.EFL(wavelength).toFixed(2) : 'undefined'}
  </text>
  <text class="small2" text-anchor="middle" x={textPosX2[5]} y={textPosY2}>
    {wavelength ? lens.BFL(wavelength).toFixed(2) : 'undefined'}
  </text>

  <!-- draw lower right corner boxes  -->
  <line
    x1={botTextPosX[0]}
    y1={botTextPosY[0]}
    x2={botTextPosX[2]}
    y2={botTextPosY[0]}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={botTextPosX[0]}
    y1={botTextPosY[1]}
    x2={botTextPosX[2]}
    y2={botTextPosY[1]}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={botTextPosX[0]}
    y1={botTextPosY[2]}
    x2={botTextPosX[2]}
    y2={botTextPosY[2]}
    fill="none"
    stroke="black"
    stroke-width="1"
  />

  <line
    x1={botTextPosX[0]}
    y1={botTextPosY[0]}
    x2={botTextPosX[0]}
    y2={botTextPosY[3]}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <line
    x1={botTextPosX[1]}
    y1={botTextPosY[1]}
    x2={botTextPosX[1]}
    y2={botTextPosY[3]}
    fill="none"
    stroke="black"
    stroke-width="1"
  />

  <!-- fill boxes in lower right side -->

  <text class="bottomtitle" text-anchor="middle" x={titleLabel.x} y={titleLabel.y}>
    {drawingName}
  </text>

  <text class="bottomdata" text-anchor="middle" x={userLabel.x} y={userLabel.y}>
    {$_('drawing.titleUser')}
  </text>
  <text class="bottomdata" text-anchor="middle" x={dateLabel.x} y={dateLabel.y}>
    {$_('drawing.titleDate')}
  </text>
  <text class="bottomdata" text-anchor="middle" x={userValue.x} y={userValue.y}>
    {currentUser?.email || ''}
  </text>
  <text class="bottomdata" text-anchor="middle" x={dateValue.x} y={dateValue.y}>
    {currentDate}
  </text>

  <text class="bottomdata2" text-anchor="start" x={allUnitsX} y={allUnitsY}>
    {$_('drawing.unitsNote')}
  </text>

  <LensSVG {lens} {outerWidth} {outerHeight} />
</svg>

<div class="flex justify-end gap-4">
  <button class="btn variant-filled-primary" type="button" on:click={handleCopyToClipboardClick}>
    {$_('buttons.copyToClipboard')}
  </button>
  <button class="btn variant-filled-primary" type="button" on:click={handleSaveSVGClick}>
    {$_('buttons.saveToSVG')}
  </button>
</div>

<style>
  .small {
    font: bold 12px sans-serif;
  }
  .small2 {
    font: bold 12px sans-serif;
  }
  .bottomtitle {
    font: bold 14px sans-serif;
  }
  .bottomdata {
    font: bold 10px sans-serif;
  }
  .bottomdata2 {
    font: italic 9px sans-serif;
  }
</style>
