<script lang="ts">
  import { menu } from '@skeletonlabs/skeleton'
  import { _ } from 'svelte-i18n'

  export let name: string
  export let label = $_('menu.options')
  export let sticky = false
  export let buttonClasses = ''
  export let wrapperClasses = ''
</script>

<span class={`relative ${wrapperClasses}`}>
  <button
    type="button"
    class={`btn-neutral group btn !space-x-0 !py-1.5 ${buttonClasses}`}
    use:menu={{ menu: name, interactive: sticky }}
  >
    <span class="text-sm">{label}</span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 512"
      class="w-2.5 fill-black opacity-50 transition ease-in-out group-hover:-translate-y-[2px] dark:fill-white"
    >
      <path
        d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"
      />
    </svg>
  </button>
  <nav class="card list-nav p-2 text-sm shadow-lg" data-menu={name}>
    <slot />
  </nav>
</span>
