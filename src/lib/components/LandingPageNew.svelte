<script lang="ts">
  import LensRender3D from '$components/LensRender3D.svelte'
  import Lens, { Material, Surface } from '$lib/lens'
  import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@rgossiaux/svelte-headlessui'
  import { storeLightSwitch } from '@skeletonlabs/skeleton'
  import { Beaker, Calculator, PaperAirplane } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import { _ } from 'svelte-i18n'
  import { fly } from 'svelte/transition'

  $: lensBgColor = $storeLightSwitch ? 'black' : 'white'

  const features = [
    {
      name: 'Reporting',
      summary: 'Stay on top of things with always up-to-date reporting features.',
      description:
        'We talked about reporting in the section above but we needed three items here, so mentioning it one more time for posterity.',
      image: '/analysis.png',
      icon: PaperAirplane,
    },
    {
      name: 'Inventory',
      summary: "Never lose track of what's in stock with accurate inventory tracking.",
      description:
        "We don't offer this as part of our software but that statement is inarguably true. Accurate inventory tracking would help you for sure.",
      image: '/raytrace.png',
      icon: Calculator,
    },
    {
      name: 'Contacts',
      summary: 'Organize all of your contacts, service providers, and invoices in one place.',
      description:
        "This also isn't actually a feature, it's just some friendly advice. We definitely recommend that you do this, you'll feel really organized and professional.",
      image: '/engdrawing.png',
      icon: Beaker,
    },
  ]
</script>

<main class="grid">
  <section class="flex items-center justify-center gap-10 bg-white p-16 dark:bg-black">
    <div class="flex flex-col items-end gap-4">
      <div class="flex items-center">
        <img class="h-16 w-auto" src="/logo.png" alt={$_('branding.sitename')} />
        <span class="ml-2 font-brand text-6xl text-primary-500">
          {$_('branding.sitename')}
        </span>
      </div>
      <h2 class="w-80 text-end !text-4xl tracking-tight text-surface-900-50-token">
        A simple lens design tool kit for everyone
      </h2>
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
        height={300}
        bgColor={lensBgColor}
        spin={true}
        enableControls={false}
      />
    </div>
  </section>

  <section class="relative flex flex-col gap-12 overflow-hidden py-20 text-center">
    <img
      alt=""
      src="/background.jpg"
      decoding="async"
      data-nimg="1"
      class="absolute top-1/2 left-1/2 -z-10 max-w-none translate-x-[-40%] translate-y-[-50%]"
      loading="lazy"
      style="color:transparent"
    />

    <h1 class="tracking-tight !text-white/90">Everything you need to design a lens.</h1>

    <h5 class="-mt-8 tracking-tight !text-white/80">Sub-heading</h5>

    <TabGroup class="flex flex-col gap-8" let:selectedIndex>
      <TabList class="mx-20 grid grid-cols-3 gap-x-8">
        {#each features as feature, featureIndex}
          {@const isSelected = featureIndex === selectedIndex}
          <Tab
            class={`[&:not(:focus-visible)]:focus:outline-none] card variant-glass grid !bg-white p-4 ${
              isSelected ? '!opacity-[85%]' : '!opacity-50'
            }`}
          >
            <div class={`card-header ${isSelected ? 'text-blue-600' : '!text-surface-600'}`}>
              <Icon src={feature.icon} class="h-auto w-9" />
            </div>

            <h3
              class={`mt-6 text-sm font-medium ${
                isSelected ? '!text-blue-600' : '!text-surface-600'
              }`}
            >
              <span class="absolute inset-0" />
              {feature.name}
            </h3>

            <p class="font-display mt-2 !text-xl text-surface-900">
              {feature.summary}
            </p>

            <p class="mt-4 !text-sm text-surface-600">{feature.description}</p>
          </Tab>
        {/each}
      </TabList>

      <TabPanels class="card variant-glass mx-4 mt-4 flex justify-center py-8">
        {#each features as feature, featureIndex}
          <TabPanel>
            <div in:fly={{ x: 50 }}>
              <img class="screenshot" src={feature.image} alt="" sizes="52.75rem" />
            </div>
          </TabPanel>
        {/each}
      </TabPanels>
    </TabGroup>
  </section>

  <section class="flex items-center justify-center gap-10 bg-white p-16 dark:bg-black">
    <h1 class="tracking-tight text-surface-900-50-token">Features 2 section</h1>
  </section>

  <section class="relative flex flex-col items-center gap-12 overflow-hidden py-20">
    <img
      alt=""
      src="/background.jpg"
      decoding="async"
      data-nimg="1"
      class="absolute top-1/2 left-1/2 -z-10 max-w-none translate-x-[-40%] translate-y-[-50%]"
      loading="lazy"
      style="color:transparent"
    />

    <h1 class="tracking-tight !text-white">Call to signup</h1>
    <button
      class="btn variant-filled-surface w-60 rounded-full border-2 border-blue-500 !bg-white/90 text-surface-800 shadow-lg shadow-blue-200/20"
    >
      Sign up for free
    </button>
  </section>

  <section class="flex items-center justify-center gap-10 bg-white p-16 dark:bg-black">
    <h1 class="tracking-tight text-surface-900-50-token">Footer</h1>
  </section>
</main>

<style lang="postcss">
  img.screenshot {
    @apply shadow-xl rounded-token;
  }
</style>
