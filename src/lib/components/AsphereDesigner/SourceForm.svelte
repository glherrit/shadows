<script lang="ts">
  import {
    LightSourceKind,
    type CollimatedFlattop,
    type CollimatedGaussian,
    type ExtendedSource,
    type LightSource,
  } from '$src/lib/lightSource'
  import { createForm, getValue } from 'felte'
  import { createEventDispatcher } from 'svelte'
  import { _ } from 'svelte-i18n'
  import Numberfield from './Numberfield.svelte'

  export let source: LightSource
  let userClass = ''
  export { userClass as class }

  const dispatch = createEventDispatcher()

  const sourceKinds = Object.values(LightSourceKind)
    .filter((n) => typeof n === 'string')
    .sort() as string[]

  interface SourceForm {
    sourceKind: string
    wavelength: string
    diameter: string
    e2Diameter: string
    NA: string
    distance: string
  }

  const initialValues = {
    wavelength: source.wavelengths[0],
    diameter: source.halfDiameter * 2,
    e2Diameter:
      (source.kind === LightSourceKind.CollimatedGaussian ? source.e2halfDiameter : 12.7) * 1.5,
    NA: source.kind === LightSourceKind.ExtendedSource ? source.NA : 0.0005,
    distance: 0,
    // distance: source.kind === LightSourceKind.ExtendedSource ? source.distance : 50,
  }

  let {
    form,
    data: formData,
    setFields,
    reset: resetForm,
  } = createForm<SourceForm>({
    initialValues: {
      sourceKind: source.kind,
      wavelength: initialValues.wavelength.toFixed(precisionForField('wavelength')),
      diameter: initialValues.diameter.toFixed(precisionForField('diameter')),
      e2Diameter: initialValues.e2Diameter.toFixed(precisionForField('e2Diameter')),
      NA: initialValues.NA.toFixed(precisionForField('NA')),
      distance: initialValues.distance.toFixed(precisionForField('distance')),
    },
  })

  export function reset() {
    resetForm()
  }

  function precisionForField(field: keyof SourceForm) {
    switch (field) {
      case 'distance':
        return 1
      case 'e2Diameter':
      case 'wavelength':
        return 3
      case 'NA':
        return 5
      default:
        return 2
    }
  }

  function dispatchUpdatedSource() {
    const updatedSource = getValue($formData, (d) => {
      const wavelengths = [parseFloat(d.wavelength)]
      let source: LightSource
      switch (d.sourceKind) {
        case LightSourceKind.CollimatedFlattop:
          source = {
            kind: LightSourceKind.CollimatedFlattop,
            wavelengths,
            halfDiameter: parseFloat(d.diameter) / 2,
          } as CollimatedFlattop
          break
        case LightSourceKind.CollimatedGaussian:
          source = {
            kind: LightSourceKind.CollimatedGaussian,
            wavelengths,
            halfDiameter: parseFloat(d.diameter) / 2,
            e2halfDiameter: parseFloat(d.e2Diameter) / 2,
          } as CollimatedGaussian
          break
        // case LightSourceKind.PointSource:
        //   source = {
        //     kind: LightSourceKind.PointSource,
        //     wavelengths,
        //     halfDiameter: parseFloat(d.diameter) / 2,
        //     NA: parseFloat(d.NA),
        //   } as PointSource
        //   break
        case LightSourceKind.ExtendedSource:
          source = {
            kind: LightSourceKind.ExtendedSource,
            wavelengths,
            halfDiameter: parseFloat(d.diameter) / 2,
            NA: parseFloat(d.NA),
          } as ExtendedSource
          break
        default:
          throw new Error(`Couldnt parse source from data ${JSON.stringify(d)}`)
      }
      return source
    })
    dispatch('change', updatedSource)
  }

  $: selectedType = getValue($formData, 'sourceKind')
</script>

<slot {reset} />

<form class={`grid grid-cols-1 gap-4 p-2 ${userClass}`} use:form>
  <div class="mt-3 grid grid-cols-[auto_minmax(0,_1fr)] gap-y-4 text-center">
    <label
      for="sourceKind"
      class="card -mr-px flex items-center justify-center rounded-br-none rounded-tr-none bg-black/5 text-sm text-surface-600-300-token dark:!bg-white/5"
    >
      {$_('labels.sourceKind')}
    </label>
    <select
      name="sourceKind"
      class="select !rounded-tl-none !rounded-bl-none text-sm"
      on:change={({ currentTarget }) => {
        // this is needed since using the change event causes the store not to be updated
        setFields('sourceKind', currentTarget.value, true)
        dispatchUpdatedSource()
      }}
    >
      {#each sourceKinds as kind}
        <!-- list possible options since we are programatically making the translation key (prevent purge) -->
        <!-- $_("sourceKind.collimatedFlattop") -->
        <!-- $_("sourceKind.collimatedGaussian") -->
        <!-- $_("sourceKind.extended") -->
        <!-- $_("sourceKind.point") -->
        <option class="text-sm" value={kind}>{$_(`sourceKind.${kind}`)}</option>
      {/each}
    </select>

    <Numberfield
      name="wavelength"
      label={$_('labels.wavelengthLambda')}
      precision={precisionForField('wavelength')}
      on:change={dispatchUpdatedSource}
    />

    <Numberfield
      name="diameter"
      label={selectedType === LightSourceKind.CollimatedGaussian
        ? $_('labels.fullDiameter')
        : $_('labels.diameter')}
      precision={precisionForField('diameter')}
      on:change={dispatchUpdatedSource}
    />

    <Numberfield
      name="e2Diameter"
      label={$_('labels.e2Diameter')}
      hidden={selectedType !== LightSourceKind.CollimatedGaussian}
      precision={precisionForField('e2Diameter')}
      on:change={dispatchUpdatedSource}
    />

    <Numberfield
      name="NA"
      label={$_('labels.NA')}
      hidden={selectedType !== LightSourceKind.ExtendedSource}
      precision={precisionForField('NA')}
      on:change={dispatchUpdatedSource}
    />
  </div>
</form>
