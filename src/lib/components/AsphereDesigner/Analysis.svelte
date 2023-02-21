<script lang="ts">
  import Render3DPlot from '$components/drawings/Render3DPlot.svelte'
  import RenderThruFocus from '$components/drawings/RenderThruFocus.svelte'
  import LinePlot2D from '$components/plots/LinePlot2D.svelte'
  import SpotDiagram from '$components/plots/SpotDiagram.svelte'
  import { simFocusData } from '$src/lib/analysis/simFocusData'
  import { genTSAData } from '$src/lib/analysis/tsa'
  import { genWFEData } from '$src/lib/analysis/wfe'
  import type Lens from '$src/lib/lens/lens'
  import { raySet1 } from '$src/lib/lens/lens'
  import {
    entrancePupilHalfDiameter,
    LightSourceKind,
    type LightSource,
  } from '$src/lib/lightSource'
  import { minimizePVWFE, minimizeSA } from '$src/lib/optimize'
  import { getHexRGBColorFromCSSVar } from '$src/lib/utils'
  import { modalStore, storeLightSwitch, tooltip, type ModalSettings } from '@skeletonlabs/skeleton'
  import { ArrowsPointingOut, Calculator, Cube } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import { createEventDispatcher } from 'svelte'
  import { _ } from 'svelte-i18n'

  export let lens: Lens
  export let source: LightSource
  export let wavelength: number
  export let refocus: number

  const dispatch = createEventDispatcher()

  $: simFocusDataPromise = simFocusData(lens, source, refocus)
  $: wfeDataPromise = genWFEData(lens, source, refocus)
  $: tsaDataPromise = genTSAData(lens, source, refocus)

  const smallFont = 12
  const smallTitleFont = 14
  const largeFont = 16
  const largeTitleFont = 18

  // passed to all LinePlot2D
  const plot2DClasses = 'card grid p-2 aspect-square items-center bg-white/90 dark:!bg-black/50'
  // passed to all LinePlot2D when rendered in a modal
  const plot2DModalClass = 'rounded bg-white/90 dark:!bg-black/50 grid'

  $: titleColor = $storeLightSwitch
    ? getHexRGBColorFromCSSVar('--color-surface-200')
    : getHexRGBColorFromCSSVar('--color-surface-900')

  $: ticksColor = $storeLightSwitch
    ? getHexRGBColorFromCSSVar('--color-surface-400')
    : getHexRGBColorFromCSSVar('--color-surface-400')

  $: gridColor = $storeLightSwitch
    ? getHexRGBColorFromCSSVar('--color-surface-700')
    : getHexRGBColorFromCSSVar('--color-surface-200')

  function show3DPlotModal(data: number[][], title: string) {
    const modal: ModalSettings = {
      type: 'component',
      component: {
        ref: Render3DPlot,
        props: {
          class: 'grid bg-3d-gradient',
          data,
          titleColor,
          title,
        },
      },
      modalClasses: 'grid !p-0 !min-w-[95%] !min-h-[95%] lg:!min-w-[75%] lg:!min-h-[75%]',
    }
    modalStore.trigger(modal)
  }

  function showThruFocusModal() {
    const canvasTextColor = $storeLightSwitch
      ? getHexRGBColorFromCSSVar('--color-surface-50')
      : '#111'
    const modal: ModalSettings = {
      type: 'component',
      component: {
        ref: RenderThruFocus,
        props: {
          class: 'grid bg-3d-gradient',
          lens,
          source,
          refocus,
          titleColor,
          canvasTextColor,
          showOptions: true,
          title: $_('plots.thruFocus.title'),
        },
      },
      modalClasses: 'grid !p-0 !min-w-[95%] !min-h-[95%] lg:!min-w-[75%] lg:!min-h-[75%]',
    }
    modalStore.trigger(modal)
  }

  function showAnalysisModal(analysisComponent: any, props: Record<string, any>) {
    const modal: ModalSettings = {
      type: 'component',
      component: {
        ref: analysisComponent,
        props,
      },
      modalClasses: '!min-w-[95%] lg:!min-w-[75%] grid',
    }
    modalStore.trigger(modal)
  }

  function refocusForMinTSA() {
    const refocus = minimizeSA(lens, wavelength, entrancePupilHalfDiameter(source) * 2)
    dispatch('refocus', refocus)
  }

  function refocusForMinWFE() {
    const refocus = minimizePVWFE(lens, wavelength, entrancePupilHalfDiameter(source), raySet1)
    dispatch('refocus', refocus)
  }
</script>

<div class="">
  {#await wfeDataPromise then wfeData}
    <div class="flex items-center justify-between">
      <h5>{$_('labels.wavefront')}</h5>
      <div class="flex gap-3">
        <button
          type="button"
          class="btn-xs btn hover:variant-ghost-primary"
          use:tooltip={{ content: $_('tooltips.refocusWFE') }}
          on:click={refocusForMinWFE}
        >
          <Icon src={Calculator} class="h-auto w-5" />
        </button>
        <button
          type="button"
          class="btn-xs btn hover:variant-ghost-primary"
          use:tooltip={{ content: $_('tooltips.show3DPlot') }}
          on:click={() => show3DPlotModal(wfeData, $_('plots.wfeLineAber.title'))}
        >
          <Icon src={Cube} class="h-auto w-5" />
        </button>
      </div>
    </div>

    <hr />

    <LinePlot2D
      data={wfeData}
      {source}
      class={plot2DClasses}
      {titleColor}
      {ticksColor}
      {gridColor}
      showTitle={false}
      titlestr={$_('plots.wfeLineAber.title')}
      titleFontSize={largeTitleFont}
      xAxisTitle={$_('plots.wfeLineAber.xAxis')}
      yAxisTitle={$_('plots.wfeLineAber.yAxis')}
      axisFontSize={smallFont}
      on:error
    />
  {/await}
</div>

<div class="">
  {#await simFocusDataPromise then focusData}
    <div class="flex items-center justify-between">
      {#if source.kind === LightSourceKind.CollimatedFlattop}
        <h5>{$_('labels.psf')}</h5>
      {:else if source.kind === LightSourceKind.CollimatedGaussian}
        <h5>{$_('labels.gaussPSF')}</h5>
      {:else if source.kind === LightSourceKind.ExtendedSource}
        <h5>{$_('labels.extended')}</h5>
      {:else}
        <h5>Error - Unknown Source Type</h5>
      {/if}
      <!-- eventually add another if for extended focus here 
            with default always being labels.psf -->
      <div class="flex gap-3">
        <button
          type="button"
          class="btn-xs btn hover:variant-ghost-primary"
          use:tooltip={{ content: $_('tooltips.show3DPlot') }}
          on:click={() => show3DPlotModal(focusData, $_('plots.psfLine.title'))}
        >
          <Icon src={Cube} class="h-auto w-5" />
        </button>
      </div>
    </div>

    <hr />

    <LinePlot2D
      data={focusData}
      showGaussDiameter={source.kind === LightSourceKind.CollimatedGaussian}
      {source}
      class={plot2DClasses}
      {titleColor}
      {ticksColor}
      {gridColor}
      showTitle={false}
      titlestr={$_('plots.psfLine.title')}
      titleFontSize={smallTitleFont}
      xAxisTitle={$_('plots.psfLine.xAxis')}
      yAxisTitle={$_('plots.psfLine.yAxis')}
      axisFontSize={smallFont}
      on:error
    />
  {/await}
</div>

<div class="">
  {#await tsaDataPromise then tsaData}
    <div class="flex items-center justify-between">
      <h5>{$_('labels.sphAber')}</h5>
      <div class="flex gap-3">
        <button
          type="button"
          class="btn-xs btn hover:variant-ghost-primary"
          use:tooltip={{ content: $_('tooltips.refocusTSA') }}
          on:click={refocusForMinTSA}
        >
          <Icon src={Calculator} class="h-auto w-5" />
        </button>
        <button
          type="button"
          class="btn-xs btn hover:variant-ghost-primary"
          use:tooltip={{ content: $_('tooltips.showFullscreen') }}
          on:click={() =>
            showAnalysisModal(LinePlot2D, {
              data: tsaData,
              class: plot2DModalClass,
              source,
              titleColor,
              ticksColor,
              gridColor,
              showTitle: true,
              titlestr: $_('plots.sphAber.title'),
              titleFontSize: largeTitleFont,
              xAxisTitle: $_('plots.sphAber.xAxis'),
              yAxisTitle: $_('plots.sphAber.yAxis'),
              axisFontSize: largeFont,
              padding: 8,
            })}
        >
          <Icon src={ArrowsPointingOut} class="h-auto w-5" />
        </button>
      </div>
    </div>
    <hr />
    <LinePlot2D
      data={tsaData}
      {source}
      class={plot2DClasses}
      {titleColor}
      {ticksColor}
      {gridColor}
      showTitle={false}
      titlestr={$_('plots.sphAber.title')}
      titleFontSize={smallTitleFont}
      xAxisTitle={$_('plots.sphAber.xAxis')}
      yAxisTitle={$_('plots.sphAber.yAxis')}
      axisFontSize={smallFont}
      on:error
    />
  {/await}
</div>

<div class="">
  <div class="flex items-center justify-between">
    <h5>{$_('labels.spotDiagram')}</h5>
    <div class="flex gap-3">
      <button
        type="button"
        class="btn-xs btn hover:variant-ghost-primary"
        use:tooltip={{ content: $_('tooltips.showThruFocus') }}
        on:click={() => showThruFocusModal()}
      >
        <Icon src={ArrowsPointingOut} class="h-auto w-5" />
      </button>
    </div>
  </div>
  <hr />
  <SpotDiagram
    {lens}
    {source}
    {refocus}
    {titleColor}
    {ticksColor}
    {gridColor}
    pointColor={'#ef4444'}
    class={plot2DClasses}
    showHeader={false}
    padding={0}
    axisFontSize={12}
    on:error
  />
</div>
