<script lang="ts">
  export let value: string
  export let label: string

  let userClass = 'text-base'
  export { userClass as class }
</script>

<div class="flex items-center">
  <span
    class={`card rounded-tr-none rounded-br-none px-2 py-1.5 ring-surface-200 text-surface-600-300-token ${userClass}`}
  >
    {label}
  </span>
  <input
    type="text"
    class={`bg-input input card -ml-[1px] rounded-tl-none rounded-bl-none px-2 py-1.5 ring-surface-200 text-surface-600-300-token ${userClass}`}
    bind:value
  />
</div>
