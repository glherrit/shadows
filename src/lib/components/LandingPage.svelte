<script lang="ts">
  import LensRender3D from '$components/LensRender3D.svelte'
  import Lens, { Material, Surface } from '$lib/lens'
  import { getHexRGBColorFromCSSVar } from '$src/lib/utils'
  import { storeLightSwitch } from '@skeletonlabs/skeleton'
  import { _ } from 'svelte-i18n'

  $: lensBgColor = $storeLightSwitch
    ? getHexRGBColorFromCSSVar('--color-surface-900')
    : getHexRGBColorFromCSSVar('--color-surface-50', 0.5)
</script>

<div class="flex items-center justify-center gap-10 p-16">
  <div class="flex flex-col items-end gap-4">
    <div class="flex items-center">
      <img class="h-16 w-auto" src="/logo.png" alt={$_('branding.sitename')} />
      <span class="ml-2 font-brand text-6xl text-primary-500">
        {$_('branding.sitename')}
      </span>
    </div>
    <h2 class="w-80 text-end text-4xl">{$_('landingPage.heroText')}</h2>
  </div>
  <div class="w-[300px]">
    <LensRender3D
      lens={new Lens(
        18,
        5.5,
        Material.FusedSilica,
        new Surface(18, 1 / 25),
        new Surface(18, -1 / 25)
      )}
      scale={0.5}
      height={200}
      bgColor={lensBgColor}
      spin
    />
  </div>
</div>

<div class="mx-auto mt-12 flex max-w-6xl flex-col items-center gap-20 px-8">
  <h2 class="text-center text-2xl">
    {$_('landingPage.valueProposition')}
  </h2>

  <div class="grid grid-cols-1 items-center gap-20 lg:grid-cols-2">
    <img src="/lensdesigner.png" alt="lens designer app" class="screenshot" />
    <img src="/raytrace.png" alt="ray trace" class="screenshot" />
  </div>

  <h1 class="-mb-10 rounded p-2 px-4 text-center text-3xl text-tertiary-500">
    {$_('landingPage.getStarted')}
  </h1>

  <img src="/lensform.png" alt="lens designer app" class="screenshot" />

  <div class="grid grid-cols-1 gap-20 lg:grid-cols-2">
    <div class="flex flex-col gap-6">
      <h2 class="text-center text-2xl">{$_('landingPage.analysisNote')}</h2>
      <img src="/analysis.png" alt="analysis" class="screenshot" />
    </div>
    <div class="flex flex-col gap-6">
      <h2 class="text-center text-2xl">{$_('landingPage.drawingNote')}</h2>
      <img src="/engdrawing.png" alt="engineering drawing" class="screenshot" />
    </div>
  </div>

  <a href="/register" class="btn variant-filled-primary mb-20 w-full max-w-4xl" type="button">
    {$_('buttons.createAccount')}
  </a>
</div>

<style lang="postcss">
  img.screenshot {
    @apply rounded border-2 border-surface-700/50 shadow-xl;
  }
</style>
