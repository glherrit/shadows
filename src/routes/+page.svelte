<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import Scene1 from "../threlte/Scene1.svelte";
  import Scene2 from "../threlte/Scene2.svelte";
  import Scene3 from "../threlte/Scene3.svelte";
</script>

<section />

<h2>Title Here</h2>

<div class="scene">
  <Canvas>
    <Scene1 />
  </Canvas>
</div>

<style>
  .scene {
    position: relative;
    width: auto;
    height: 700px;
    border: 5px solid black;
    background-color: #464a61;
  }
</style>
