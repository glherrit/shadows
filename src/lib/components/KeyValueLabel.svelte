<script lang="ts">
  export let key: string
  export let value: string | number
  let userClass = 'text-base'
  export { userClass as class }
</script>

<div class="flex items-center">
  <span
    class={`card rounded-tr-none rounded-br-none px-2 py-1.5 ring-surface-200 text-surface-600-300-token ${userClass}`}
  >
    {key}
  </span>
  <span
    class={`bg-input card -ml-[1px] rounded-tl-none rounded-bl-none px-2 py-1.5 ring-surface-200 text-surface-600-300-token ${userClass}`}
  >
    {value}
  </span>
</div>
