<script lang="ts">
  import { getErrorMessage } from '$lib/utils'
  import { tooltip as tooltipAction } from '@skeletonlabs/skeleton'
  import { CheckCircle, LockClosed } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import { evaluate } from 'mathjs'
  import { createEventDispatcher } from 'svelte'
  import { createField } from 'felte'

  const dispatch = createEventDispatcher()

  export let name: string
  export let label: string
  export let precision: number | undefined = undefined
  export let exponential = false
  export let readonly = false
  export let hidden = false
  export let tooltip = ''
  export let textSize = 'text-sm'

  export let showToggle = false
  export let isToggledOn = false

  let userClass = ''
  export { userClass as class }

  const validKeysRegex = /^[0-9e.\-+*/]$/

  const { field, onInput } = createField(name)

  function handleKeypress(ev: InputKeyboardEvent) {
    if (ev.key === 'Enter') {
      ev.preventDefault()
      evaluateValue(ev.currentTarget)
    } else if (!ev.key.match(validKeysRegex)) {
      ev.preventDefault()
    }
  }

  function evaluateValue(target: InputKeyboardEvent['currentTarget']) {
    try {
      // console.debug('Numberfield: evaluateValue() before:', target.value)
      const res = evaluate(target.value)
      console.debug('Numberfield: evaluateValue() result:', res)

      if (exponential) {
        target.value =
          typeof precision === 'undefined' ? res.toExponential() : res.toExponential(precision)
      } else {
        target.value = typeof precision === 'undefined' ? res : res.toFixed(precision)
      }
      console.debug('Numberfield: evaluateValue() formatted:', target.value)
      onInput(target.value)
      dispatch('change', res)
    } catch (err) {
      console.error('Numberfield: evaluateValue() error:', err)
      dispatch('error', `Evaluation error: ${getErrorMessage(err)}`)
    }
  }

  function handleToggle() {
    isToggledOn = !isToggledOn
    dispatch('toggle', isToggledOn)
  }
</script>

{#if tooltip}
  <label
    for={`numberfield-${name}`}
    use:tooltipAction={{ content: tooltip }}
    class={`card -mr-px flex h-full items-center justify-center rounded-br-none rounded-tr-none bg-black/5 px-2 py-1.5 text-surface-600-300-token dark:bg-white/5 ${textSize}`}
    class:hidden
  >
    {label}
  </label>
{:else}
  <label
    for={`numberfield-${name}`}
    class={`card -mr-px flex h-full items-center justify-center rounded-br-none rounded-tr-none bg-black/5 px-2 py-1.5 text-surface-600-300-token dark:bg-white/5 ${textSize}`}
    class:hidden
  >
    {label}
  </label>
{/if}

<div class={`relative ${userClass}`} class:hidden>
  <input
    use:field
    type="text"
    name={`numberfield-${name}`}
    class={`input !rounded-tl-none !rounded-bl-none ${textSize}`}
    class:pr-8={showToggle}
    class:border-r-0={showToggle}
    disabled={readonly}
    on:focus={({ currentTarget }) => currentTarget.select()}
    on:keypress={handleKeypress}
    on:blur={({ currentTarget }) => !readonly && evaluateValue(currentTarget)}
  />
  {#if readonly && !hidden}
    <div class="absolute top-0 right-2 h-full">
      <Icon src={LockClosed} class="w-4 text-surface-600-300-token" />
    </div>
  {:else if showToggle && !hidden}
    <button
      type="button"
      class="absolute right-0 top-0 h-full w-8 border border-secondary-500 bg-black/5 px-[3px] text-secondary-500 hover:bg-secondary-500 hover:text-white dark:bg-white/5 dark:hover:bg-secondary-500"
      class:!bg-secondary-500={isToggledOn}
      class:!text-white={isToggledOn}
      style:border-top-right-radius="var(--theme-rounded-base)"
      style:border-bottom-right-radius="var(--theme-rounded-base)"
      on:click={() => handleToggle()}
    >
      {#if isToggledOn}
        <Icon src={CheckCircle} class="" />
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class=""
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <ellipse cx="12" cy="12" rx="8" ry="8" fill="none" stroke-width="1" />
        </svg>
      {/if}
    </button>
  {/if}
</div>
