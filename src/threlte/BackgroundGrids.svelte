<script lang="ts">
  import { Line, T, Line2 } from "@threlte/core";
  import { DoubleSide, LineBasicMaterial, Vector3 } from "three";
  import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

  export let verticalSize = 10;
  export let horizontalSize = 30;
  export let verticalOffset = 0;
  export let horizCenterline = 0;
  export let showSides = true;
  export let showShadowScreens = true;

  let lines: Vector3[][] = [];
  let dashedLines: Vector3[][] = [];
  let gridColor = "orange";
  let centerGridColor = 0x0000ff;
  let shadowScreenColor = "grey";

  let horizontalStep = horizontalSize / 10;
  let verticalStep = verticalSize / 5;
  const halfHoriz = horizontalSize / 2;
  const halfVert = verticalSize / 2;

  for (let i = 0; i <= 10; i++) {
    let line: Vector3[] = [];
    line.push(
      new Vector3(-halfHoriz + horizontalStep * i, verticalOffset, -halfHoriz)
    );
    line.push(
      new Vector3(-halfHoriz + horizontalStep * i, verticalOffset, +halfHoriz)
    );
    lines.push(line);
    line = [];
    line.push(
      new Vector3(-halfHoriz, verticalOffset, -halfHoriz + horizontalStep * i)
    );
    line.push(
      new Vector3(+halfHoriz, verticalOffset, -halfHoriz + horizontalStep * i)
    );
    lines.push(line);
  }

  if (showSides) {
    for (let i = 0; i <= 10; i++) {
      let line: Vector3[] = [];
      line.push(
        new Vector3(-halfHoriz + horizontalStep * i, verticalOffset, -halfHoriz)
      );
      line.push(
        new Vector3(
          -halfHoriz + horizontalStep * i,
          verticalSize + verticalOffset,
          -halfHoriz
        )
      );
      lines.push(line);
      line = [];
      line.push(
        new Vector3(halfHoriz, verticalOffset, -halfHoriz + horizontalStep * i)
      );
      line.push(
        new Vector3(
          halfHoriz,
          verticalSize + verticalOffset,
          -halfHoriz + horizontalStep * i
        )
      );
      lines.push(line);
    }
    for (let i = 0; i <= 5; i++) {
      let line: Vector3[] = [];
      line.push(
        new Vector3(-halfHoriz, verticalStep * i + verticalOffset, -halfHoriz)
      );
      line.push(
        new Vector3(+halfHoriz, verticalStep * i + verticalOffset, -halfHoriz)
      );
      lines.push(line);
      line = [];
      line.push(
        new Vector3(halfHoriz, verticalStep * i + verticalOffset, -halfHoriz)
      );
      line.push(
        new Vector3(halfHoriz, verticalStep * i + verticalOffset, +halfHoriz)
      );
      lines.push(line);
    }

    // Dashed lines
    let dashes: Vector3[] = [];
    // horizontal centerlines
    dashes = [];
    dashes.push(
      new Vector3(halfHoriz, horizCenterline + verticalOffset, -halfHoriz)
    );
    dashes.push(
      new Vector3(halfHoriz, horizCenterline + verticalOffset, +halfHoriz)
    );
    dashedLines.push(dashes);
    dashes = [];
    dashes.push(
      new Vector3(-halfHoriz, horizCenterline + verticalOffset, -halfHoriz)
    );
    dashes.push(
      new Vector3(+halfHoriz, horizCenterline + verticalOffset, -halfHoriz)
    );
    dashedLines.push(dashes);
    // vertical centerlines
    dashes = [];
    dashes.push(new Vector3(0, verticalOffset, -halfHoriz));
    dashes.push(new Vector3(0, verticalSize + verticalOffset, -halfHoriz));
    dashedLines.push(dashes);
    dashes = [];
    dashes.push(new Vector3(halfHoriz, verticalOffset, 0));
    dashes.push(new Vector3(halfHoriz, verticalSize + verticalOffset, 0));
    dashedLines.push(dashes);
  }
  console.log("show grid active");
</script>

<!-- Do all lines within one mesh -->
<T.Mesh>
  {#each lines as line}
    <Line
      points={line}
      material={new LineBasicMaterial({ color: gridColor })}
    />
  {/each}
  {#if dashedLines.length > 0}
    {#each dashedLines as line}
      <Line2
        points={line}
        material={new LineMaterial({
          worldUnits: true,
          dashed: true,
          dashSize: 1,
          linewidth: 0.27,
          color: centerGridColor,
        })}
      />
    {/each}
  {/if}
</T.Mesh>

<!--  ===============  Shadow Screens  ===============  -->
{#if showShadowScreens}
  <T.Mesh
    position={[0, verticalOffset + verticalSize / 2, -halfHoriz - 0.5]}
    rotation={[0, 0, 0]}
    receiveShadow
  >
    <T.BoxGeometry args={[horizontalSize, verticalSize, 0.1]} />
    <T.MeshStandardMaterial side={DoubleSide} color={shadowScreenColor} />
  </T.Mesh>

  <T.Mesh
    position={[halfHoriz + 0.5, verticalOffset + halfVert, 0]}
    rotation={[0, Math.PI / 2, 0]}
    receiveShadow
  >
    <T.BoxGeometry args={[horizontalSize, verticalSize, 0.1]} />
    <T.MeshStandardMaterial side={DoubleSide} color={shadowScreenColor} />
  </T.Mesh>

  <T.Mesh
    position={[0, verticalOffset - 0.5, 0]}
    rotation={[Math.PI / 2, 0, 0]}
    receiveShadow
  >
    <T.BoxGeometry args={[horizontalSize, horizontalSize, 0.1]} />
    <T.MeshStandardMaterial
      side={DoubleSide}
      color={shadowScreenColor}
      transparent
      opacity={0.2}
    />
  </T.Mesh>
{/if}
