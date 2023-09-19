<script lang="ts">
  import { T, OrbitControls, useFrame, Line2 } from "@threlte/core";
  import {
    BufferGeometry,
    Line,
    LineBasicMaterial,
    Vector3,
    DoubleSide,
    LatheGeometry,
    BufferAttribute,
    Vector2,
    Group,
  } from "three";
  import Lens, { Material, Surface } from "$lib/lens";
  import {
    entrancePupilHalfDiameter,
    makeCollimatedFlattop,
    type LightSource,
  } from "$lib/lightSource";
  import { genSolidLens } from "$lib/ThreeGutils";
  import { generateCircleGrid, trace3DRayPath } from "$lib/raytrace";
  import type { Vector3D } from "$lib/vector";
  import { HTML } from "@threlte/extras";
  import DisplayContour from "./DisplayContour.svelte";
  import { genWFEData } from "$lib/wfe";
  import { Text, useCursor } from "@threlte/extras";
  import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
  import { Lut } from "three/examples/jsm/math/Lut";
  import {
    chooseAxisLimits,
    formatAxisLimit,
    generateLatheColors,
    genProfile3D,
    scaleArray,
    xyToVector,
  } from "$lib/gUtils";

  let lens: Lens = new Lens(
    25,
    6,
    Material.FusedSilica,
    new Surface(25, 1 / 22),
    new Surface(25, 0)
  );
  const wlen = 1.07;
  const source = makeCollimatedFlattop(lens.surf1.ap * 0.45, wlen);
  //console.log(lens, source);

  let conicend = -0.598611;
  let a4end = 2.909919e-7;
  let a6end = -2.13825e-10;

  let numsteps = 100;

  let cstep = conicend / numsteps;
  let a4step = a4end / numsteps;
  let a6step = a6end / numsteps;

  let rotation = 0;
  let numberofrays = 11;
  let step = 0;
  let ntrys = 0;

  const horizontalScale = 20;
  const verticalScale = 15;
  const verticalOffset = -10;
  const wfeOffsetZ = 20;

  const numLuts = 11;
  const lut = new Lut("rainbow", numLuts);
  const l2rotation = { x: 0, y: -Math.PI / 2, z: 0 };
  let x = 0;
  let isPaused = false;
  const { start, stop, started } = useFrame(({ clock }) => {
    if (isPaused) {
      x += clock.getDelta();
      if (x > 0.002) {
        x = 0;
        isPaused = false;
      }
    } else {
      lens.surf1.k = cstep * step;
      lens.surf1.asphericTerms.coeffs[0] = a4step * step;
      lens.surf1.asphericTerms.coeffs[1] = a6step * step;
      step += 1;

      if (step > numsteps) {
        step = 0;
        x = 0;
        isPaused = true;
      }
  }
  });

  const toggleUseFrame = () => {
    if ($started) {
      console.log("stopping");
      stop();
    } else {
      console.log("starting");
      start();
      ntrys = 0;
    }
  };

  let surf1pts: Vector3[] = [];
  let surf2pts: Vector3[] = [];
  let surfimgpts: Vector3[] = [];
  const stdlinewidths = 7;

  function addRays(
    lens: Lens,
    source: LightSource,
    refocus: number,
    numrays: number = 11
  ): [
    THREE.Line[],
    number[],
    number[],
    string,
    LatheGeometry,
    Vector3[][],
    LineMaterial[]
  ] {
    // const material = new LineBasicMaterial({ color: 0xff0000, linewidth: 1 })
    const linegroup: THREE.Line[] = [];
    // let halfap = source.diameter / 2
    surf1pts = [];
    surf2pts = [];
    surfimgpts = [];
    //const crays = generateCollimatedRayBundle(halfap, 1, rayInitialZPosition)
    const crays = generateCircleGrid(
      entrancePupilHalfDiameter(source),
      numrays,
      -5,
      true
    );
    crays.forEach((ray) => {
      let ps = trace3DRayPath(ray.pVector, ray.eDir, lens, source, refocus);
      surf1pts.push(new Vector3(ps[1].x, ps[1].y, ps[1].z));
      surf2pts.push(new Vector3(ps[2].x, ps[2].y, ps[2].z));
      surfimgpts.push(
        new Vector3(
          ps[ps.length - 1].x,
          ps[ps.length - 1].y,
          ps[ps.length - 1].z
        )
      );
      // add this next line with extra z distance if needing to extend focus into image plane
      //ps.push(new Vector3D(ps[ps.length - 1].x, ps[ps.length - 1].y, ps[ps.length - 1].z = extra z))
      let ps3ray = convert3Dto3(ps);
      linegroup.push(
        new Line(
          new BufferGeometry().setFromPoints(ps3ray),
          new LineBasicMaterial({ color: 0xff0000, linewidth: 5 })
        )
      );
    });

    let wfeData = genWFEData(lens, source, 0.0, 11);

    const xsraw: number[] = wfeData.map(([num]) => num);
    const ysraw: number[] = wfeData.map(([, num]) => num);
    //let p = peak value in ys
    let pk = Math.max(...ysraw).toFixed(1);

    const ys = scaleArray(ysraw, 25, 0, 100);
    const [xmin, xmax] = chooseAxisLimits(xsraw);
    const xs = scaleArray(xsraw, horizontalScale / 2, xmin, xmax);

    // *******************************************************
    // Data used for Solid Color Line
    const data = xyToVector(xs, ys);
    // set color according to grid to ymax
    const colorToGrid = false;
    const yMaxColor = colorToGrid ? verticalScale : Math.max(...ys);

    const image = new LatheGeometry(data, 51, 0, Math.PI * 2);
    const lathcolors = generateLatheColors(
      image,
      yMaxColor,
      "rainbow",
      numLuts
    );
    image.setAttribute("color", new BufferAttribute(lathcolors, 3));

    const v3profile: Vector3[] = genProfile3D(
      xs,
      ys,
      -horizontalScale / 2 - 0.15
    );
    for (let i = 0; i < v3profile.length; i++) {
      v3profile[i].y += verticalOffset;
    }

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

    return [linegroup, xsraw, ysraw, pk, image, vmulti, mats];
  }

  function convert3Dto3(pts3d: Vector3D[]) {
    const pts3: THREE.Vector3[] = [];
    pts3d.forEach((element) => {
      pts3.push(new Vector3(element.x, element.y, element.z));
    });
    return pts3;
  }

  $: raygroup = addRays(lens, source, 0, numberofrays);

  const showLineMultiColor = true;
</script>

<!-- Camera Section -->
<T.Group rotation={[0, 0, 0]}>
  <T.OrthographicCamera makeDefault position={[-50, 15, 0]} zoom={12}>
    <OrbitControls enableRotate enableZoom enableDamping dampingFactor={0.03} />
    <T.DirectionalLight position={[-100, 0, 0]} intensity={1.0} />
    <T.DirectionalLight position={[0, 0, -100]} intensity={1.0} />
  </T.OrthographicCamera>
</T.Group>
<T.AmbientLight intensity={0.2} />

<!-- Lens Section -->
<T.Group
  position={[0, verticalOffset, -60]}
  rotation={[0, 0.4, 0]}
  visible={true}
>
  <T.Mesh
    geometry={genSolidLens(lens, 51, 51)}
    position={[0, 0, 0]}
    rotation={[Math.PI / 2, 0, 0]}
    let:ref
  >
    <T.MeshPhongMaterial
      color={"orange"}
      opacity={0.5}
      shininess={100}
      reflectivity={1}
    />
  </T.Mesh>

  {#each raygroup[0] as ray}
    <T.Line geometry={ray.geometry} material={ray.material} />
  {/each}

  <!-- Add image plane helper Grid -->
  <T.Mesh position.z={lens.ct + lens.BFL(wlen)} receiveShadow>
    <T.PlaneGeometry args={[10, 10]} />
    <T.MeshStandardMaterial color="green" side={DoubleSide} />
  </T.Mesh>
  />
</T.Group>

<!-- wavefront background -->
<T.Group position={[0, 0, wfeOffsetZ]} rotation={[0, -0.9, 0]} visible={true}>
  <DisplayContour
    xsraw={raygroup[1]}
    ysraw={raygroup[2]}
    horizontalScale={horizontalScale / 2}
    {verticalScale}
    {verticalOffset}
  />
</T.Group>

<!-- shows the contour profile lines -->
<T.Group position={[0, 0, wfeOffsetZ]} rotation={[0, -0.9, 0]} visible={true}>
  {#if showLineMultiColor}
    {#each raygroup[5] as v, i}
      <Line2 points={v} material={raygroup[6][i]} />
      <Line2 points={v} material={raygroup[6][i]} rotation={l2rotation} />
    {/each}
  {/if}
</T.Group>

<!-- full contour shape -->
<T.Mesh
  geometry={raygroup[4]}
  position={[0, verticalOffset, wfeOffsetZ]}
  rotation={[0, 0, 0]}
  castShadow={true}
  let:ref
>
  <T.MeshPhongMaterial vertexColors={true} opacity={0.8} transparent side={2} />
</T.Mesh>

<!-- WFE Title -->
<Text
  text={"WFE  " + raygroup[3] + " waves"}
  color={"white"}
  fontSize={3}
  anchorX={"center"}
  anchorY={"middle"}
  position={{
    x: 0,
    y: verticalOffset + verticalScale + 8,
    z: wfeOffsetZ / 1.9 + 10,
  }}
  rotation={{
    x: 0,
    y: -1.5,
    z: 0,
  }}
/>

<!-- Ray Trace Title -->
<Text
  text={"Ray Trace"}
  color={"white"}
  fontSize={3}
  anchorX={"center"}
  anchorY={"middle"}
  position={{
    x: 0,
    y: verticalOffset + verticalScale + 8,
    z: -40,
  }}
  rotation={{
    x: 0,
    y: -1.5,
    z: 0,
  }}
/>

<HTML
  position={{ x: 0, y: 30, z: -10 }}
  rotation={{ x: 0, y: -1.6, z: 0 }}
  scale={7}
  transform
>
  <button
    on:click={toggleUseFrame}
    class="rounded-full px-5 text-black bg-green-500 hover:opacity-90 active:opacity-70"
  >
    Start/Stop
  </button>
</HTML>
