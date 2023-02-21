<script lang="ts">
  import EngineeringDrawing from '$components/drawings/EngineeringDrawing.svelte'
  import Lens, { raySet1, type LensJSON } from '$lib/lens/lens'
  import { Material, Surface } from '$src/lib/lens'
  import type { OptimizationSettings } from '$src/lib/optimize'
  import { modalStore, Tab, TabGroup, tooltip, type ModalSettings } from '@skeletonlabs/skeleton'
  import { ArrowPath } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import { createForm, getValue } from 'felte'
  import { createEventDispatcher } from 'svelte'
  import { _ } from 'svelte-i18n'
  import OptionsMenu from '../OptionsMenu.svelte'
  import Numberfield from './Numberfield.svelte'
  import { makeWorkerMessage } from './optimize.worker'
  import OptimizeWorker from './optimize.worker?worker'

  export let lens: Lens
  export let name: string
  export let wavelength: number

  let userClass = ''
  export { userClass as class }
  export let groupClass = ''

  const dispatch = createEventDispatcher()

  let surfaceTab = 0

  let optimizationSettings: OptimizationSettings = {
    s1cc: false,
    s1as0: false,
    s1as1: false,
    s2cc: false,
    s2as0: false,
    s2as1: false,
  }

  interface LensForm {
    material: string
    diameter: string
    CT: string
    ET: string
    s1Aperture: string
    s1Radius: string
    s1Conic: string
    s1AS0: string
    s1AS1: string
    s2Aperture: string
    s2Radius: string
    s2Conic: string
    s2AS0: string
    s2AS1: string
  }
  const {
    form,
    setFields,
    data: formData,
    reset: resetForm,
  } = createForm<LensForm>({
    initialValues: {
      material: lens.material.toString(),
      diameter: lens.diameter.toFixed(precisionForField('diameter')),
      CT: lens.ct.toFixed(precisionForField('CT')),
      ET: lens.et.toFixed(precisionForField('ET')),
      s1Aperture: lens.surf1.ap.toFixed(precisionForField('s1Aperture')),
      s1Radius: lens.surf1.r.toFixed(precisionForField('s1Radius')),
      s1Conic: lens.surf1.k.toFixed(precisionForField('s1Conic')),
      s1AS0: lens.surf1.asphericTerms.coeffAt(0).toExponential(precisionForField('s1AS0')),
      s1AS1: lens.surf1.asphericTerms.coeffAt(1).toExponential(precisionForField('s1AS1')),
      s2Aperture: lens.surf2.ap.toFixed(precisionForField('s2Aperture')),
      s2Radius: lens.surf2.r.toFixed(precisionForField('s2Radius')),
      s2Conic: lens.surf2.k.toFixed(precisionForField('s2Conic')),
      s2AS0: lens.surf2.asphericTerms.coeffAt(0).toExponential(precisionForField('s2AS0')),
      s2AS1: lens.surf2.asphericTerms.coeffAt(1).toExponential(precisionForField('s2AS1')),
    },
  })

  export function reset() {
    resetForm()
  }

  function precisionForField(field: keyof LensForm) {
    switch (field) {
      case 's1AS0':
      case 's1AS1':
      case 's2AS0':
      case 's2AS1':
        return 6
      case 's1Conic':
      case 's2Conic':
        return 6
      default:
        return 4
    }
  }

  function updateET(value: number) {
    const formLens = makeLensFromForm()
    formLens.et = value
    setFields('CT', formLens.ct.toFixed(precisionForField('CT')))
    setFields('ET', formLens.et.toFixed(precisionForField('ET')))
    dispatchUpdatedLens()
  }

  function dispatchUpdatedLens() {
    const updatedLens = makeLensFromForm()
    dispatch('change', updatedLens)

    // these fields could have changed when we create a new lens
    setFields('s1Aperture', updatedLens.surf1.ap.toFixed(precisionForField('s1Aperture')))
    setFields('s2Aperture', updatedLens.surf2.ap.toFixed(precisionForField('s2Aperture')))
    setFields('ET', updatedLens.et.toFixed(precisionForField('ET')))
  }

  let optimizeWorker: Worker | null
  let isOptimizing = false
  $: optimizeDisabled = Object.values(optimizationSettings).every((v) => !v)

  function makeLensFromForm() {
    return getValue($formData, (d) => {
      return new Lens(
        d.diameter,
        d.CT,
        Material.fromString(d.material),
        new Surface(d.s1Aperture, Surface.calcCurvature(parseFloat(d.s1Radius)), d.s1Conic, [
          d.s1AS0,
          d.s1AS1,
        ]),
        new Surface(d.s2Aperture, Surface.calcCurvature(parseFloat(d.s2Radius)), d.s2Conic, [
          d.s2AS0,
          d.s2AS1,
        ])
      )
    })
  }

  function setFormToLens(newLens: Lens, shouldTouch = false) {
    setFields('material', newLens.material.toString(), shouldTouch)
    setFields('diameter', newLens.diameter.toFixed(precisionForField('diameter')), shouldTouch)
    setFields('CT', newLens.ct.toFixed(precisionForField('CT')), shouldTouch)
    setFields('s1Aperture', newLens.surf1.ap.toFixed(precisionForField('s1Aperture')), shouldTouch)
    setFields('s1Radius', newLens.surf1.r.toFixed(precisionForField('s1Radius')), shouldTouch)
    setFields('s1Conic', newLens.surf1.k.toFixed(precisionForField('s1Conic')), shouldTouch)
    setFields(
      's1AS0',
      newLens.surf1.asphericTerms.coeffAt(0).toExponential(precisionForField('s1AS0')),
      shouldTouch
    )
    setFields(
      's1AS1',
      newLens.surf1.asphericTerms.coeffAt(1).toExponential(precisionForField('s1AS1')),
      shouldTouch
    )
    setFields('s2Aperture', newLens.surf2.ap.toFixed(precisionForField('s2Aperture')), shouldTouch)
    setFields('s2Radius', newLens.surf2.r.toFixed(precisionForField('s2Radius')), shouldTouch)
    setFields('s2Conic', newLens.surf2.k.toFixed(precisionForField('s2Conic')), shouldTouch)
    setFields(
      's2AS0',
      newLens.surf2.asphericTerms.coeffAt(0).toExponential(precisionForField('s2AS0')),
      shouldTouch
    )
    setFields(
      's2AS1',
      newLens.surf2.asphericTerms.coeffAt(1).toExponential(precisionForField('s2AS1')),
      shouldTouch
    )
  }
  function optimizeLens() {
    if (!optimizeWorker) {
      optimizeWorker = new OptimizeWorker()
      if (!optimizeWorker) throw new Error('Couldnt create optimization workder!')

      interface WorkerMessage {
        data: { lens: LensJSON; error?: string }
      }
      optimizeWorker.onmessage = ({ data }: WorkerMessage) => {
        isOptimizing = false
        const { lens, error } = data
        console.debug(`fn: optimize() onmessage :>> `, lens, error)
        if (error) {
          dispatch('error', error)
        } else {
          const optimized = Lens.fromJSON(lens)
          console.debug(`fn: optimize() onmessage - optimized lens :>> `, optimized)
          setFormToLens(optimized, true)
          dispatchUpdatedLens()
          dispatch('optimized')
        }
      }
    }

    isOptimizing = true
    console.debug(`fn: optimize() postMessage :>> `, lens, wavelength)
    optimizeWorker.postMessage(
      makeWorkerMessage(lens, wavelength, 0, raySet1, optimizationSettings)
    )
  }

  function showEngDrawingModal() {
    const modal: ModalSettings = {
      type: 'component',
      component: {
        ref: EngineeringDrawing,
        props: {
          lens,
          wavelength,
          drawingName: $_('drawing.blockTitle') + ' - ' + name,
        },
      },
      modalClasses: '!max-w-[80%]',
    }
    modalStore.trigger(modal)
  }
</script>

<slot {reset} />

<form class={`grid grid-cols-1 gap-4 p-2 ${userClass}`} use:form>
  <span class={`relative ${groupClass}`}>
    <div class="flex items-center justify-between pt-2">
      <div use:tooltip={{ content: $_('tooltips.optimizeNotReady'), position: 'right' }}>
        <button
          class="btn btn-sm variant-ghost-secondary"
          type="button"
          disabled={optimizeDisabled}
          on:click={optimizeLens}
        >
          {#if isOptimizing}
            <Icon src={ArrowPath} class="mr-2 h-auto w-5 animate-spin-cc" />
          {/if}
          {$_('buttons.optimize')}
        </button>
      </div>

      <OptionsMenu name="lensMenu">
        <ul>
          <li>
            <button class="option w-full" type="button" on:click={showEngDrawingModal}>
              {$_('buttons.showEngDrawing')}
            </button>
          </li>
        </ul>
      </OptionsMenu>
    </div>
  </span>

  <div class={`${groupClass}`}>
    <h5 class="-mb-2">{$_('labels.dimensions')}</h5>
    <hr />
    <div class="grid grid-cols-[auto_minmax(0,_1fr)] gap-y-4 text-center">
      <label
        for="material"
        class="card -mr-px flex items-center justify-center rounded-br-none rounded-tr-none bg-black/5 text-sm text-surface-600-300-token dark:!bg-white/5"
      >
        {$_('labels.material')}
      </label>
      <select
        name="material"
        class="select !rounded-tl-none !rounded-bl-none text-sm rounded-token"
        on:change={({ currentTarget }) => {
          // this is needed since using the change event causes the store not to be updated
          setFields('material', currentTarget.value, true)
          dispatchUpdatedLens()
        }}
      >
        {#each Material.allMaterials as mat}
          <option value={mat}>{mat}</option>
        {/each}
      </select>

      <Numberfield
        name="diameter"
        label={$_('labels.diameter')}
        precision={precisionForField('diameter')}
        on:change={dispatchUpdatedLens}
      />

      <Numberfield
        name="CT"
        label={$_('labels.ct')}
        precision={precisionForField('CT')}
        on:change={dispatchUpdatedLens}
      />

      <Numberfield
        name="ET"
        label={$_('labels.et')}
        precision={precisionForField('ET')}
        on:change={({ detail }) => updateET(detail)}
      />
    </div>
  </div>

  <TabGroup flex="flex-1">
    <!-- no idea why the on:click needs to be there but it does -->
    <Tab bind:group={surfaceTab} name="surfaceTab" value={0} on:click={() => (surfaceTab = 0)}>
      {$_('labels.surf1')}
    </Tab>

    <Tab bind:group={surfaceTab} name="surfaceTab" value={1} on:click={() => (surfaceTab = 1)}>
      {$_('labels.surf2')}
    </Tab>

    <svelte:fragment slot="panel">
      <!-- with the way the fields work we cant just use if/else to show/hide these -->
      <div class="grid grid-cols-[auto_minmax(0,_1fr)] gap-y-4 text-center">
        <!-- SURFACE 1 -->
        <Numberfield
          name="s1Aperture"
          label={$_('labels.aperture')}
          precision={precisionForField('s1Aperture')}
          hidden={surfaceTab !== 0}
          on:change={dispatchUpdatedLens}
        />

        <Numberfield
          name="s1Radius"
          label={$_('labels.radius')}
          precision={precisionForField('s1Radius')}
          hidden={surfaceTab !== 0}
          on:change={dispatchUpdatedLens}
        />

        <Numberfield
          name="s1Conic"
          label={$_('labels.conic')}
          precision={precisionForField('s1Conic')}
          hidden={surfaceTab !== 0}
          showToggle
          bind:isToggledOn={optimizationSettings.s1cc}
          on:change={dispatchUpdatedLens}
        />

        <Numberfield
          name="s1AS0"
          label={$_('labels.ad')}
          precision={precisionForField('s1AS0')}
          hidden={surfaceTab !== 0}
          exponential
          showToggle
          bind:isToggledOn={optimizationSettings.s1as0}
          on:change={dispatchUpdatedLens}
        />

        <Numberfield
          name="s1AS1"
          label={$_('labels.ae')}
          precision={precisionForField('s1AS1')}
          hidden={surfaceTab !== 0}
          exponential
          showToggle
          bind:isToggledOn={optimizationSettings.s1as1}
          on:change={dispatchUpdatedLens}
        />

        <!-- SURFACE 2 -->

        <Numberfield
          name="s2Aperture"
          label={$_('labels.aperture')}
          precision={precisionForField('s2Aperture')}
          hidden={surfaceTab === 0}
          on:change={dispatchUpdatedLens}
        />

        <Numberfield
          name="s2Radius"
          label={$_('labels.radius')}
          precision={precisionForField('s2Radius')}
          hidden={surfaceTab === 0}
          on:change={dispatchUpdatedLens}
        />

        <Numberfield
          name="s2Conic"
          label={$_('labels.conic')}
          precision={precisionForField('s2Conic')}
          hidden={surfaceTab === 0}
          showToggle
          bind:isToggledOn={optimizationSettings.s2cc}
          on:change={dispatchUpdatedLens}
        />

        <Numberfield
          name="s2AS0"
          label={$_('labels.ad')}
          precision={precisionForField('s2AS0')}
          hidden={surfaceTab === 0}
          exponential
          showToggle
          bind:isToggledOn={optimizationSettings.s2as0}
          on:change={dispatchUpdatedLens}
        />

        <Numberfield
          name="s2AS1"
          label={$_('labels.ae')}
          precision={precisionForField('s2AS1')}
          hidden={surfaceTab === 0}
          exponential
          showToggle
          bind:isToggledOn={optimizationSettings.s2as1}
          on:change={dispatchUpdatedLens}
        />
      </div>
    </svelte:fragment>
  </TabGroup>
</form>
