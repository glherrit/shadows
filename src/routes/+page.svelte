<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import Scene1 from "../threlte/Scene1.svelte";
  import Scene2 from "../threlte/Scene2.svelte";
  import Scene3 from "../threlte/Scene3.svelte";
  import Scene4 from "../threlte/Scene4.svelte";
  import Scene5 from "../threlte/Scene5.svelte";
  import Scene6 from "../threlte/Scene6.svelte";
  import Scene7 from "../threlte/Scene7.svelte";
  import Scene8 from "../threlte/Scene8.svelte";

  let value = 0;

  function setValue(val: number) {
    value = val;
  }

</script>

<div class="text-sm gap-1 justify-center space-y-1 ml-10">
  <button class="btn btn-blue" on:click={() => setValue(0)}> Home </button>
  <button class="btn btn-blue" on:click={() => setValue(1)}> Scene 1 </button>
  <button class="btn btn-blue" on:click={() => setValue(2)}> Scene 2 </button>
  <button class="btn btn-blue" on:click={() => setValue(3)}> Scene 3 </button>
  <button class="btn btn-blue" on:click={() => setValue(4)}> Scene 4 </button>
  <button class="btn btn-blue" on:click={() => setValue(7)}> Scene 7 </button>
  <button class="btn btn-blue" on:click={() => setValue(5)}> Scene 5 </button>
  <button class="btn btn-blue" on:click={() => setValue(6)}> Scene 6 </button>
  <button class="btn btn-blue" on:click={() => setValue(8)}> Scene 8 </button>
</div>
<br />

<div class="scene">
  <Canvas>
    {#if value === 1}
      <Scene1 />
    {:else if value === 2}
      <Scene2 />
    {:else if value === 3}
      <Scene3 />
    {:else if value === 4}
      <Scene4 />
    {:else if value === 5}
      <Scene5 />
    {:else if value === 6}
    <Scene6 />
    {:else if value === 7}
    <Scene7 />
    {:else if value === 8}
    <Scene8 />
    {/if}
  </Canvas>
</div>

<style>
  .btn {
    @apply  py-1 px-4 rounded;
  }
  .btn-blue {
    @apply bg-blue-500 text-white;
  }
  .btn-blue:hover {
    @apply bg-blue-700;
  }

  .scene {
    position: relative;
    width: auto;
    height: 650px;
    margin-top: 10;
    border: 5px solid black;
    background-color: #464a61;
  }
</style>
