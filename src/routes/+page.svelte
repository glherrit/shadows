<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import Scene1 from "../threlte/Scene1.svelte";
  import Scene2 from "../threlte/Scene2.svelte";
  import Scene3 from "../threlte/Scene3.svelte";
  import Scene4 from "../threlte/Scene4.svelte";
  import Scene5 from "../threlte/Scene5.svelte";
  import Scene6 from "../threlte/Scene6.svelte";

  let value = 0;
  console.log("value", value);

  function setValue(val: number) {
    value = val;
    console.log("value", value);
  }
</script>

<div class="flex flex-nowrap gap-12 justify-center space-y-10">
  <h1 class="text-3xl font-bold underline">Shadow Animation!</h1>
  <li>
    <button class="btn btn-blue" on:click={() => setValue(1)}> Scene 1 </button>
  </li>
  <li>
    <button class="btn btn-blue" on:click={() => setValue(2)}> Scene 2 </button>
  </li>
  <li>
    <button class="btn btn-blue" on:click={() => setValue(3)}> Scene 3 </button>
  </li>
  <li>
    <button class="btn btn-blue" on:click={() => setValue(4)}> Scene 4 </button>
  </li>
  <li>
    <button class="btn btn-blue" on:click={() => setValue(5)}> Scene 5 </button>
  </li>
  <li>
    <button class="btn btn-blue" on:click={() => setValue(6)}> Scene 6 </button>
  </li>
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
    {/if}
  </Canvas>
</div>

<style>
  .btn {
    @apply font-bold py-2 px-4 rounded;
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
    height: 700px;
    margin-top: 100;
    border: 5px solid black;
    background-color: #464a61;
  }
</style>
