<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import Alert from '$components/Alert.svelte'
  import RayTrace3D from '$components/AsphereDesigner/RayTrace3D.svelte'
  import KeyValueLabel from '$components/KeyValueLabel.svelte'
  import type Lens from '$lib/lens/lens'
  import type { LightSource } from '$lib/lightSource'
  import { parseOpticalDesignRecord, type OpticalDesign } from '$lib/opticaldesign'
  import { getErrorMessage, saveTextToFile, setTimeoutAsync } from '$lib/utils'
  import { serializeToZemax } from '$lib/zemax'
  import { NAVBAR_HEIGHT } from '$src/lib/constants'
  import { makeScreenIsFn } from '$src/lib/utils/screenSize'
  import type { OpticalDesignsResponse } from '$src/pocketbase'
  import makeDesignUrl from '$src/routes/(app)/asphere/[designName]/makeDesignUrl'
  import { showSidebar } from '$src/stores/settings'
  import {
    Drawer,
    drawerStore,
    modalStore,
    Tab,
    TabGroup,
    toastStore,
    tooltip,
    type ModalSettings,
  } from '@skeletonlabs/skeleton'
  import { ArrowPath, ArrowsPointingOut, Bars3, PencilSquare, Trash } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import { createForm, getValue } from 'felte'
  import { _ } from 'svelte-i18n'
  import { fade, fly } from 'svelte/transition'
  import OptionsMenu from '../OptionsMenu.svelte'
  import Analysis from './Analysis.svelte'
  import LensEditForm from './LensEditForm.svelte'
  import Numberfield from './Numberfield.svelte'
  import SourceForm from './SourceForm.svelte'

  export let design: OpticalDesign

  const currentUser = $page.data.user

  // the optical design is made up of lens, light source, and refocus, so take those values out
  // of the design object and use them as the "current" values for the UI, so we can always reset

  // LENS
  // in the future this will represent the currently selected lens, but since only 1 element
  // systems are supported for now, we will just use the design's lens and no UI for changing it
  let selectedLens: Lens = design.lens

  // keep track of the updated lens object from the edit form if there are any changes
  let updatedLens: Lens | undefined = undefined

  // so the "current" lens we should be using is either the updated lens or the selected one
  // currently only one, so default to the only lens in the design for calculations if not selected
  $: currentLens = updatedLens || selectedLens

  // SOURCE
  // keep track of the updated source object from the edit form if there are any changes
  let updatedSource: LightSource | undefined = undefined

  // so the "current" source we should be using is either the updated source or one on design
  $: currentSource = updatedSource || design.source

  // the selected wavelength that we are currently working with for calculations. in the future this
  // could be selected similarly to how the lens is selected, but for now we will just use the first
  $: selectedWavelength = currentSource.wavelengths[0]

  // REFOCUS
  $: refocus = parseFloat(getValue($formData, 'refocus'))

  // UI SETTINGS
  let detailPanelTab = 1 // lens params
  let isSavingDesign = false
  let isEditingName = false
  let errorMessage = ''
  // keep track of tailwind screen size breakpoints when we resize
  let screenIs = makeScreenIsFn()

  // UI BINDINGS
  let designNameInput: HTMLInputElement
  let lensEditDrawerForm: LensEditForm | undefined
  let lensEditForm: LensEditForm | undefined
  let sourceForm: SourceForm | undefined

  // FORM SETUP
  interface DesignForm {
    designName: string
    refocus: string
  }
  const initialValues: DesignForm = {
    designName: design.name,
    refocus: design.refocus.toFixed(precisionForField('refocus')),
  }
  const {
    form,
    data: formData,
    setFields,
    reset: resetForm,
  } = createForm<DesignForm>({ initialValues })

  // SETTERS
  function safeSetUpdatedLens(sussLens: Lens) {
    try {
      // see if valid, this will throw in all cases where the lens is invalid (i think)
      sussLens.EFL(selectedWavelength)
      errorMessage = ''
      updatedLens = sussLens
    } catch (err) {
      errorMessage = getErrorMessage(err)
    }
  }

  function safeSetUpdatedSource(sussSource: LightSource) {
    try {
      // see if valid, this will throw in all cases where the lens is invalid (i think)
      currentLens.EFL(sussSource.wavelengths[0])
      updatedSource = sussSource
      errorMessage = ''
    } catch (err) {
      errorMessage = getErrorMessage(err)
    }
  }

  function setRefocus(newRecocus: number | string) {
    if (typeof newRecocus === 'string') {
      newRecocus = parseFloat(newRecocus)
    }
    setFields('refocus', newRecocus.toFixed(precisionForField('refocus')), true)
  }

  async function setDesignNameEditingAndFocus(isEditing: boolean) {
    isEditingName = isEditing
    if (isEditing) {
      // not sure why but need to set to run next tick
      await setTimeoutAsync(1)
      designNameInput.focus()
    }
  }

  // FORMATTERS
  function precisionForField(field: keyof DesignForm) {
    switch (field) {
      case 'refocus':
        return 6
      default:
        return 4
    }
  }

  function formatFL(fl: number) {
    return !Number.isNaN(fl) && Number.isFinite(fl) ? fl.toFixed(2) : '-'
  }

  // ACTION HANDLERS
  function discardChanges() {
    updatedLens = undefined
    updatedSource = undefined
    lensEditForm?.reset()
    lensEditDrawerForm?.reset()
    sourceForm?.reset()
    errorMessage = ''
    resetForm()
  }

  async function saveChanges() {
    const { pb } = $page.data
    if (!pb) throw new Error('No PB client!')

    // either we have an updated lens object or just use the current one if no updates
    const lens = updatedLens || design.lens
    const updatedParams = {
      owner: currentUser.id,
      name: getValue($formData, 'designName').trim(),
      optic_info: lens.toJSON(),
      source_info: currentSource,
      material: lens.material.toString(),
      refocus: refocus,
      origin: design?.origin || null,
    }

    isSavingDesign = true

    try {
      const updatedDesignRecord = design.id
        ? await pb
            .collection('optical_designs')
            .update<OpticalDesignsResponse>(design.id, updatedParams)
        : await pb.collection('optical_designs').create<OpticalDesignsResponse>(updatedParams)

      const updatedDesign = parseOpticalDesignRecord(updatedDesignRecord)

      console.debug(
        `src/lib/components/AsphereDesigner/AsphereDesigner.svelte(315): updatedDesign :>> `,
        updatedDesignRecord,
        updatedDesign
      )

      // TODO: see if better way to do this then a semi-hard refresh
      goto(makeDesignUrl(updatedDesign), { invalidateAll: true })
      toastStore.trigger({ message: $_('alert.saveSuccess'), preset: 'success' })
    } catch (err) {
      errorMessage = getErrorMessage(err)
    } finally {
      isSavingDesign = false
    }
  }

  function exportToZemaxFile() {
    if (!currentLens) return
    try {
      const zemaxText = serializeToZemax(currentLens, currentSource)
      saveTextToFile(zemaxText, `${getValue($formData, 'designName')}.zmx`)
      console.debug(
        `src/lib/components/AsphereDesigner/AsphereDesigner.svelte(128): zemaxText :>> `,
        zemaxText
      )
    } catch (err) {
      errorMessage = getErrorMessage(err)
    } finally {
      isSavingDesign = false
    }
  }

  function show3DDesignModal() {
    const modal: ModalSettings = {
      type: 'component',
      component: {
        ref: RayTrace3D,
        props: {
          lens: currentLens,
          source: currentSource,
          class: 'rounded-token bg-3d-gradient',
          refocus,
          showTitle: true,
          showOptions: true,
        },
      },
      modalClasses: '!max-w-[90%] !min-h-[90%] grid !p-0',
    }
    modalStore.trigger(modal)
  }

  function onDeleteClick() {
    modalStore.trigger({
      type: 'confirm',
      title: $_('modals.confirm.title'),
      body: $_('modals.delete.body'),
      response: async (confirmed: boolean) => {
        if (confirmed) {
          if (!design.id) throw Error('databaseId is null')

          const { pb } = $page.data
          if (!pb) throw new Error('No PB client!')

          try {
            await pb.collection('optical_designs').delete(design.id)
            toastStore.trigger({ message: $_('alert.deleteSuccess'), preset: 'success' })
            goto('/asphere')
          } catch (err) {
            errorMessage = getErrorMessage(err)
          }
        }
      },
    })
  }

  $: isNewDesign = design.id === undefined
  // tried using $isDirty but seemingly doesnt work or does something else??
  // so just check if any of the fields have changed
  $: formValuesChanged = (Object.keys(initialValues) as (keyof DesignForm)[]).some(
    (key) => initialValues[key] !== $formData[key]
  )
  $: designHasChanges = updatedLens || updatedSource || formValuesChanged
  $: showSaveUI = isNewDesign || designHasChanges || errorMessage

  // TODO: look into a better solution for canvas resize issue
  // ok this is my least favorite kind of comment but i digress. we want to set the zoom level
  // dynamically based on the EFL of the lens, so we need to have the clientWidth. the canvas by
  // default sizes to its container but when we show/hide the sidebar it seems not be able to update
  // in this case, but looks smooth when we reize the browser window otherwise. If we hardset the
  // canvas to the width then it will look good when the sidebar is shown/hidden, but it will flicker
  // when the window is resized, so we go with the first option and the hack is to force redraw
  // whenever the sidebar changes, the downside is losing the orbit controls state
</script>

<svelte:window on:resize={() => (screenIs = makeScreenIsFn())} />

{#if !screenIs('xl')}
  <Drawer position="right" width="w-[340px]">
    <div class="p-4">
      <TabGroup flex="flex-1">
        <!-- no idea why the on:click needs to be there but it does -->
        <Tab
          bind:group={detailPanelTab}
          name="sourceTab"
          value={0}
          on:click={() => (detailPanelTab = 0)}
        >
          {$_('labels.sourceSettings')}
        </Tab>
        <Tab
          bind:group={detailPanelTab}
          name="lensTab"
          value={1}
          on:click={() => (detailPanelTab = 1)}
        >
          {$_('labels.selectedLens', { values: { num: 1 } })}
        </Tab>
      </TabGroup>

      {#if detailPanelTab === 0}
        <SourceForm
          bind:this={sourceForm}
          source={currentSource}
          on:change={({ detail }) => safeSetUpdatedSource(detail)}
        />
      {:else if detailPanelTab === 1}
        <LensEditForm
          bind:this={lensEditDrawerForm}
          lens={currentLens}
          name={getValue($formData, 'designName')}
          wavelength={selectedWavelength}
          on:change={({ detail }) => safeSetUpdatedLens(detail)}
          on:optimized={() => setRefocus(0)}
        />
      {/if}
    </div>
  </Drawer>
{/if}

<form class="grid grid-cols-1 xl:grid-cols-[1fr_340px]" use:form>
  <div class="grid grid-cols-[minmax(0,64rem)] justify-center">
    <div class="flex flex-col gap-4 p-4">
      <div class={`absolute right-20 top-0 z-10 flex ${NAVBAR_HEIGHT} flex-col justify-center`}>
        <div use:tooltip={{ content: $_('drawing.unitsNote'), position: 'left' }}>
          <KeyValueLabel key={$_('labels.units')} value="mm" class="text-sm" />
        </div>
      </div>

      <div class="flex flex-col gap-4 md:flex-row md:items-baseline">
        <div class="flex flex-1 self-start md:justify-self-start">
          {#if !isEditingName}
            <div
              class="group flex cursor-pointer gap-2 px-2 py-1 rounded-token hover:bg-surface-hover-token dark:hover:bg-white/10"
              on:click={() => setDesignNameEditingAndFocus(true)}
              on:keypress={() => setDesignNameEditingAndFocus(true)}
            >
              <h4 class="whitespace-nowrap font-bold">
                {getValue($formData, 'designName')}
              </h4>
              <Icon src={PencilSquare} class="hidden h-auto w-4 group-hover:block" />
            </div>
          {/if}
          <input
            bind:this={designNameInput}
            type="text"
            maxlength="30"
            name="designName"
            class="max-w-xs px-2 py-1"
            class:w-0={!isEditingName}
            class:invisible={!isEditingName}
            on:focus={(ev) => ev.currentTarget.select()}
            on:blur={() => setDesignNameEditingAndFocus(false)}
            on:keypress={({ key }) => {
              if (key === 'Enter') setDesignNameEditingAndFocus(false)
            }}
          />
        </div>

        {#if showSaveUI}
          <div class="flex gap-4" in:fly={{ y: -20 }} out:fade>
            <button
              class="btn btn-sm variant-ghost-success flex-1"
              type="button"
              on:click={saveChanges}
            >
              {#if isSavingDesign}
                <Icon src={ArrowPath} class="mr-2 h-auto w-5 animate-spin-cc" />
              {/if}
              {$_('buttons.saveLens')}
            </button>
            <button class="btn btn-sm variant-ghost" type="button" on:click={discardChanges}>
              {$_('buttons.discardChanges')}
            </button>
          </div>
        {/if}

        <div class="flex gap-4">
          <OptionsMenu name="designMenu" wrapperClasses="flex-1 flex" buttonClasses="flex-1">
            <ul>
              <li>
                <button class="option w-full" type="button" on:click={exportToZemaxFile}>
                  {$_('buttons.exportzemaxfile')}
                </button>
              </li>
              <hr />
              <li>
                <button
                  class="option w-full text-red-600 hover:!bg-red-600/10 dark:text-red-400"
                  type="button"
                  on:click={onDeleteClick}
                >
                  <Icon src={Trash} class="mr-2 h-auto w-4" />
                  {$_('buttons.deleteDesign')}
                </button>
              </li>
            </ul>
          </OptionsMenu>

          <div class="xl:hidden">
            <button
              type="button"
              class="btn-neutral btn"
              use:tooltip={{ content: $_('tooltips.showDetailPanel'), position: 'left' }}
              on:click={() => drawerStore.open()}
            >
              <Icon src={Bars3} class="h-auto w-4" />
            </button>
          </div>
        </div>
      </div>

      <Alert type="error" message={errorMessage} />

      <div class="relative">
        {#key $showSidebar}
          <RayTrace3D
            class="bg-3d-gradient relative h-[300px] border border-surface-200-700-token rounded-token"
            lens={currentLens}
            source={currentSource}
            refocus={parseFloat(getValue($formData, 'refocus'))}
            enableSelections
            on:click:beam={() => {
              detailPanelTab = 0
              if (!screenIs('xl')) drawerStore.open()
            }}
            on:click:lens={() => {
              detailPanelTab = 1
              if (!screenIs('xl')) drawerStore.open()
            }}
            on:click:image={() => console.log('clicked image')}
          />
        {/key}
        <span class="absolute right-2 top-2">
          <button
            type="button"
            use:tooltip={{ content: $_('tooltips.showFullscreen') }}
            class="btn-xs btn hover:variant-ghost-primary"
            on:click={show3DDesignModal}
          >
            <Icon src={ArrowsPointingOut} class="h-auto w-5" />
          </button>
        </span>
        <span class="absolute left-2 bottom-2 flex gap-2">
          <KeyValueLabel
            key={$_('labels.efl')}
            value={formatFL(currentLens.EFL(selectedWavelength))}
            class="text-xs"
          />
          <KeyValueLabel
            key={$_('labels.bfl')}
            value={formatFL(currentLens.BFL(selectedWavelength))}
            class="text-xs"
          />
        </span>
      </div>

      <div class="card grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <span class="text-xl font-bold text-surface-600-300-token md:col-span-2">
          {$_('labels.analysis')}
        </span>
        <div class="flex gap-y-2 md:col-span-2">
          <Numberfield
            name="refocus"
            precision={precisionForField('refocus')}
            tooltip={$_('tooltips.refocus')}
            label={$_('labels.refocus')}
          />
        </div>
        <Analysis
          lens={currentLens}
          source={currentSource}
          wavelength={selectedWavelength}
          {refocus}
          on:refocus={({ detail }) => setRefocus(detail)}
          on:error={({ detail }) => (errorMessage = detail)}
        />
      </div>
    </div>
  </div>

  {#if screenIs('xl')}
    <div class="border-dim border-l bg-white/50 px-2 pt-3 dark:bg-black/10">
      <TabGroup flex="flex-1">
        <!-- no idea why the on:click needs to be there but it does -->
        <Tab
          bind:group={detailPanelTab}
          name="sourceTab"
          value={0}
          on:click={() => (detailPanelTab = 0)}
        >
          {$_('labels.sourceSettings')}
        </Tab>
        <Tab
          bind:group={detailPanelTab}
          name="lensTab"
          value={1}
          on:click={() => (detailPanelTab = 1)}
        >
          {$_('labels.selectedLens', { values: { num: 1 } })}
        </Tab>
      </TabGroup>

      {#if detailPanelTab === 0}
        <SourceForm
          bind:this={sourceForm}
          source={currentSource}
          on:change={({ detail }) => safeSetUpdatedSource(detail)}
        />
      {:else if detailPanelTab === 1}
        <LensEditForm
          bind:this={lensEditForm}
          lens={currentLens}
          name={getValue($formData, 'designName')}
          wavelength={selectedWavelength}
          on:change={({ detail }) => safeSetUpdatedLens(detail)}
          on:optimized={() => setRefocus(0)}
        />
      {/if}
    </div>
  {/if}
</form>
