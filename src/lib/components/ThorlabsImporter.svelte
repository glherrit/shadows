<script lang="ts">
  import { goto } from '$app/navigation'
  import { showSidebar } from '$src/stores/settings'
  import { modalStore } from '@skeletonlabs/skeleton'
  import { field } from 'svelte-forms'
  import { pattern } from 'svelte-forms/validators'
  import { _ } from 'svelte-i18n'

  let thorUrl = field<string>('thorUrl', '', [
    pattern(/^http.+?\.thorlabs\.com\/.+filename=.+\.zmx.*$/i),
  ])
</script>

<span>
  {$_('thor.instructions1')}
  <a href="https://www.thorlabs.com/navigation.cfm?guide_id=2087" target="_blank" rel="noreferrer">
    ThorLabs
  </a>
  {$_('thor.instructions2')}
</span>

<img class="" src="/thor_instructions.png" alt="Copy ThorLabs URL Instructions" />

<div class="">
  <label for="thorUrl" class="">
    {$_('thor.pasteLabel')}
    <input
      name="thorUrl"
      type="text"
      placeholder={$_('thor.pastePlaceholder')}
      class=""
      bind:value={$thorUrl.value}
    />
  </label>

  {#if $thorUrl.errors.length > 0}
    <span class="">
      <!-- list possible errors here so they dont get purged in i18n scan -->
      <!-- $_("formError.min") -->
      <!-- $_("formError.required") -->
      <!-- $_("formError.thorUrl") -->
      {$thorUrl.errors
        .map((e) => (e === 'pattern' ? $_('formError.thorUrl') : $_(`formError.${e}`)))
        .join(', ')}
    </span>
  {/if}
</div>

<button
  class="btn variant-filled-primary w-full"
  disabled={!$thorUrl.value || $thorUrl.invalid}
  on:click={async () => {
    await goto(`/asphere/thor/${encodeURIComponent($thorUrl.value)}`)
    $showSidebar = false
    thorUrl.reset()
    modalStore.close()
  }}
>
  {$_('thor.fetchButton')}
</button>
