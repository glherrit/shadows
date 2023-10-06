<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import Scene8 from "../threlte/Scene8.svelte";

  let value = 0;

  function setValue(val: number) {
    value = val;
  }

</script>

<div class="text-sm gap-1 justify-center space-y-1 ml-10">
  <button class="btn btn-blue" on:click={() => setValue(0)}> Home </button>
  <button class="btn btn-blue" on:click={() => setValue(8)}> Scene 8 </button>
</div>
<br />

<div class="scene">
  <Canvas>
    {#if value === 8}
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
