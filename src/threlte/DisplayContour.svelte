<script lang="ts">
  import {
    chooseAxisLimits,
    formatAxisLimit,
    generateLatheColors,
    genProfile3D,
    scaleArray,
    xyToVector,
  } from "$lib/gUtils";
  import { InteractiveObject, Line2, T } from "@threlte/core";
  import { Text, useCursor } from "@threlte/extras";
  import * as THREE from "three";
  import { Group, Vector2, Vector3 } from "three";
  import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
  import { Lut } from "three/examples/jsm/math/Lut";
  import BackgroundGrids from "./BackgroundGrids.svelte";

  export let xsraw: number[] = [];
  export let ysraw: number[] = [];

  export let verticalOffset = 0;
  export let horizontalScale = 10;
  export let verticalScale = 10;
  export let fontColor = "white";

  const showGrid = true;
  const showImage = true;
  const showMainShadowScreen = false;

  const horizHalfScale = horizontalScale;

  const stdlinewidths = 7;
  const textVOffset = 0;
  const textHOffset = 0;
  const numLuts = 11;
  const lut = new Lut("rainbow", numLuts);

  const ymin = 0;
  const ymax = 60;
  const ys = scaleArray(ysraw, verticalScale, ymin, ymax); // only scale y's for now, later willl need to scale x's too

  // convert xs and ys to Vector2's
  // format ymin and ymax for display
  const ymindisplay = formatAxisLimit(ymin, "");
  const ymaxdisplay = formatAxisLimit(ymax, "");

  const [xmin, xmax] = chooseAxisLimits(xsraw);
  //console.log('🚀 ~ xlims', xlims);
  const xs = scaleArray(xsraw, horizHalfScale, xmin, xmax);

  // format ymin and ymax for display
  // const xmindisplay = formatAxisLimit(xmin, 'mm', 3)
  const xmaxdisplay = formatAxisLimit(xmax, "mm", 3);
  //console.log(xs);

  // *******************************************************
  // Data used for Solid Color Line
  const data = xyToVector(xs, ys);
  // set color according to grid to ymax
  const colorToGrid = false;
  const yMaxColor = colorToGrid ? verticalScale : Math.max(...ys);

  const image = new THREE.LatheGeometry(data, 51, 0, Math.PI * 2);
  const lathcolors = generateLatheColors(image, yMaxColor, "rainbow", numLuts);
  image.setAttribute("color", new THREE.BufferAttribute(lathcolors, 3));
  // *******************************************************  //

  // *******************************************************
  // Data used for Solid Color Line
  const v3profile: Vector3[] = genProfile3D(xs, ys, -horizHalfScale - 0.15);
  for (let i = 0; i < v3profile.length; i++) {
    v3profile[i].y += verticalOffset;
  }

  const linemat = new LineMaterial({
    color: 0x0000ff,
    linewidth: stdlinewidths, // in pixels
    resolution: new Vector2(window.innerWidth, window.innerHeight),
  });
  // *******************************************************  //

  // *******************************************************
  // Code used for Multi Colored Color Line
  const [yminv, ymaxv] = colorToGrid
    ? // Scale colors to min max of grid pattern
      [verticalOffset, verticalScale + verticalOffset]
    : // Scale colors to min max of data
      [Math.min(...ys) + verticalOffset, Math.max(...ys) + verticalOffset];

  const vmulti: Vector3[][] = [];
  const mats: LineMaterial[] = [];
  for (let i = 1; i < v3profile.length; i++) {
    vmulti.push([v3profile[i - 1], v3profile[i]]);
    const colorindex =
      ((v3profile[i].y + v3profile[i - 1].y) / 2 - yminv) / (ymaxv - yminv);
    mats.push(
      new LineMaterial({
        color: lut.getColor(colorindex).convertLinearToSRGB().getHex(),
        linewidth: stdlinewidths, // in pixels
        resolution: new Vector2(window.innerWidth, window.innerHeight),
      })
    );
  }
  // *******************************************************

  const l2rotation = { x: 0, y: -Math.PI / 2, z: 0 };
  const fontSize = 2;
  const wfmain = 1.0;

  let wfeopacity = wfmain;
</script>

<!--  ===============  Profile Outline of Curve =============  -->
<T.Group position={[0, verticalOffset, 0]}>
  {#if showMainShadowScreen}
    <T.Mesh position.z={-20} receiveShadow>
      <T.PlaneGeometry args={[80, 72]} />
      <T.MeshStandardMaterial color="grey" />
    </T.Mesh>
  {/if}

  {#if showGrid}
    <BackgroundGrids
      horizontalSize={horizontalScale * 2}
      verticalSize={verticalScale}
    />
  {/if}

  <!-- show ymax  label -->
  <Text
    text={ymaxdisplay}
    color={fontColor}
    {fontSize}
    anchorX={"right"}
    anchorY={"middle"}
    position={{
      x: -horizHalfScale - 1,
      y: verticalScale + textVOffset,
      z: -horizHalfScale,
    }}
    rotation={{ x: 0, y: 0, z: 0 }}
    castShadow
  />

  <!-- show ymin label -->
  <Text
    text={ymindisplay}
    color={fontColor}
    {fontSize}
    anchorX={"right"}
    anchorY={"middle"}
    position={{ x: -horizHalfScale - 1, y: textVOffset, z: -horizHalfScale }}
    rotation={{ x: 0, y: 0, z: 0 }}
    castShadow
  />

  <!-- show xmax  label -->
  <Text
    text={xmaxdisplay}
    color={fontColor}
    {fontSize}
    anchorX={"left"}
    anchorY={"middle"}
    position={{
      x: -horizHalfScale,
      y: textVOffset,
      z: horizHalfScale + textHOffset,
    }}
    rotation={{ x: 0, y: -Math.PI / 2, z: 0 }}
    castShadow
  />

  <!-- show xmin label  -->
  <Text
    text={" -" + xmaxdisplay}
    color={fontColor}
    {fontSize}
    anchorX={"left"}
    anchorY={"middle"}
    position={{
      x: horizHalfScale,
      y: textVOffset,
      z: horizHalfScale + textHOffset,
    }}
    rotation={{ x: 0, y: -Math.PI / 2, z: 0 }}
    castShadow
  />

  <!-- show x zero  label  -->
  <Text
    text={"0.0 mm"}
    color={fontColor}
    {fontSize}
    anchorX={"left"}
    anchorY={"middle"}
    position={{ x: 0, y: textVOffset, z: horizHalfScale + textHOffset }}
    rotation={{ x: 0, y: -Math.PI / 2, z: 0 }}
    castShadow
  />
</T.Group>
