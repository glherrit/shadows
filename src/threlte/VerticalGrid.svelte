<script lang="ts">
  import { Line, T, Line2 } from "@threlte/core";
  import { DoubleSide, LineBasicMaterial, Vector3 } from "three";
  import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

  export let verticalSize = 10;
  export let horizontalSize = 50;
  export let verticalOffset = 0;
  export let horizontalOffset = 30;

  let lines: Vector3[][] = [];
  let dashedLines: Vector3[][] = [];
  let gridColor = "orange";
  let centerGridColor = 0x0000ff;

  let horizontalStep = horizontalSize / 10;
  const halfHoriz = horizontalSize / 2;

  for (let i = 0; i <= 10; i++) {
    let line: Vector3[] = [];
    line.push(
      new Vector3(
        -halfHoriz + horizontalStep * i + horizontalOffset,
        -halfHoriz + verticalOffset + horizontalOffset,
        0
      )
    );
    line.push(
      new Vector3(
        -halfHoriz + horizontalStep * i + horizontalOffset,
        +halfHoriz + verticalOffset,
        0
      )
    );
    lines.push(line);
    line = [];
    line.push(
      new Vector3(
        -halfHoriz + horizontalOffset,
        -halfHoriz + horizontalStep * i + verticalOffset,
        0
      )
    );
    line.push(
      new Vector3(
        +halfHoriz + horizontalOffset,
        -halfHoriz + horizontalStep * i + verticalOffset,
        0
      )
    );
    lines.push(line);
  }
</script>

<!-- Do all lines within one mesh -->
<T.Mesh position={[30, 30, 0]}>
  {#each lines as line}
    <Line
      points={line}
      material={new LineBasicMaterial({ color: gridColor })}
      rotation={{ x: 0, y: Math.PI / 2, z: 0 }}
    />
  {/each}
</T.Mesh>
