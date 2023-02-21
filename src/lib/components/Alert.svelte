<script lang="ts">
  import { CheckCircle, ExclamationCircle, InformationCircle } from '@steeze-ui/heroicons'
  import { Icon } from '@steeze-ui/svelte-icon'
  import type { IconSource } from '@steeze-ui/svelte-icon/types'
  import { fade } from 'svelte/transition'
  import { getTranslatedError } from '../utils'

  let userClass = ''
  export { userClass as class }
  export let message: string | undefined = undefined
  export let type: AlertType = 'info'

  const icons: Record<AlertType, IconSource> = {
    success: CheckCircle,
    warning: ExclamationCircle,
    info: InformationCircle,
    error: ExclamationCircle,
  }

  const alertClass: Record<AlertType, string> = {
    success: 'variant-ghost-success',
    warning: 'variant-ghost-warning',
    info: 'variant-ghost-primary',
    error: 'variant-ghost-error',
  }

  const textClass: Record<AlertType, string> = {
    success: 'text-success-500',
    warning: 'text-warning-500',
    info: 'text-primary-500',
    error: 'text-error-500',
  }
</script>

{#if Boolean(message)}
  <aside
    class={`alert flex-row items-center gap-2 ${alertClass[type]} ${userClass}`}
    transition:fade={{ duration: 200 }}
  >
    <Icon src={icons[type]} class={`h-6 w-auto ${textClass[type]}`} />

    <p class="!my-auto">{getTranslatedError(message)}</p>
    <slot />
  </aside>
{/if}
