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
    PlaneGeometry,
    MeshPhongMaterial,
  } from "three";
  import Lens, { Material, Surface } from "$lib/lens";
  import {
    entrancePupilHalfDiameter,
    makeCollimatedFlattop,
    type LightSource,
    makeExtendedSorce,
  } from "$lib/lightSource";
  import { genSolidLens } from "$lib/ThreeGutils";
  import { generateCircleGrid, generateFibonacciRays, generateRandomRayVectors, generateRandomRays, generateRandomRays2, trace3DRayPath } from "$lib/raytrace";
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
  const extSource = makeExtendedSorce(lens.surf1.ap * 0.45, wlen, 0.1);
  //console.log(lens, source);lens.surf1.ap * 0.45

  let conicend = -0.598611;
  let a4end = 2.909919e-7;
  let a6end = -2.13825e-10;

  let numsteps = 100;

  let cstep = conicend / numsteps;
  let a4step = a4end / numsteps;
  let a6step = a6end / numsteps;

  let rotation = 0;
  let numberofrays = 501;
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
  let raycount = 101;

  const { start, stop, started } = useFrame(({ clock }) => {
    if (isPaused) {
      x += clock.getDelta();
      if (x > 0.001) {
        x = 0;
        isPaused = false;
      }
    } else {
      lens.surf1.k = cstep * step;
      lens.surf1.asphericTerms.coeffs[0] = a4step * step;
      lens.surf1.asphericTerms.coeffs[1] = a6step * step;
      step += 1;
      raycount += 0;
      if (raycount > 1001) {
        raycount = 101;
      }

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
    LineMaterial[],
    BufferGeometry,
    MeshPhongMaterial,
  ] {
    // const material = new LineBasicMaterial({ color: 0xff0000, linewidth: 1 })
    const linegroup: THREE.Line[] = [];
    // let halfap = source.diameter / 2
    surf1pts = [];
    surf2pts = [];
    surfimgpts = [];

    const crays = generateRandomRays2(10001, 5, entrancePupilHalfDiameter(source), 0.001);
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

    // create a buffer geometry
    let histo = extenedSrcHisto(surfimgpts, 0.1, 2, 0.004);
    const height = histo.length;
    const width = histo.length > 0 ? histo[0].length : 0; 
    const n = height * width
    const maxZ = findMaxValue(histo);

    //convert histo to points
    const points = [];
    for (let i = 0; i < histo.length; i++) {
      for (let j = 0; j < histo[i].length; j++) {
        points.push(new Vector3(i, j, histo[i][j]));
      }
    }

    var geometry = new BufferGeometry();
    var positions = new Float32Array(n * 3);  // position array
    var colors = new Float32Array(n * 3);  // color array

    // loop through the points array and fill the position and color arrays
    for (var i = 0; i < n; i++) {
      // get the point at index i
      var point = points[i];

      // set the position data at index i * 3, i * 3 + 1, and i * 3 + 2
      positions[i * 3] = point.x / 2.5;
      positions[i * 3 + 1] = point.y / 2.5;
      positions[i * 3 + 2] = point.z * 2;

      // set the color data based on the z value
      // you can use any color mapping function you want
      // here we use a simple linear interpolation between blue and red

      var z = point.z;
      var r = Math.max(0, Math.min(1, z / maxZ));
      var b = 1 - r;
      var g = 0;

      // set the color data at index i * 3, i * 3 + 1, and i * 3 + 2
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    // set the position and color attributes of the geometry
    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    const lcs = generateLatheColors(
      geometry,
      yMaxColor,
      "rainbow",
      numLuts
    );
    geometry.setAttribute("color", new BufferAttribute(lathcolors, 3));

    // create a material that uses vertex colors
    var material = new MeshPhongMaterial({vertexColors: true});

    return [linegroup, xsraw, ysraw, pk, image, vmulti, mats, geometry, material];
  }

  function extenedSrcHisto( Vlist: Vector3[], fiber_radius: number, imageSizeMultiplier: number, binSize: number) {
    const minbin = -imageSizeMultiplier * fiber_radius;  // max neg bin value
    const maxbin = imageSizeMultiplier * fiber_radius;  // max pos bin value
    const sbin = Math.floor((maxbin - minbin + 0.00005) / binSize) + 1;  // total number of bins

    let vscale = ((Math.PI * (sbin - 1.0)) / (imageSizeMultiplier * 2.0))
        * ((sbin - 1.0) / (imageSizeMultiplier * 2.0) - Math.SQRT1_2); // value to normalize total intensity to 1

    // init array
    let indata: number[][] = Array.from({ length: sbin }, () => new Array(sbin).fill(0));

    let errors = 0;  // track errors for future use

    for (const P of Vlist) {
      const row = Math.round((P.x - minbin) / binSize);
      const col = Math.round((P.y - minbin) / binSize);

      if (row >= 0 && row < sbin && col >= 0 && col < sbin) {
        indata[row][col] += 1;
      } else {
        errors++;
      }
    }

    let maxz = findMaxValue(indata);
    indata = divideArrayByConstant(indata, vscale * 0.01);
    maxz = findMaxValue(indata);
    console.log('maxz, vscale', maxz, vscale);
    return indata;
  }

  function convert3Dto3(pts3d: Vector3D[]) {
    const pts3: THREE.Vector3[] = [];
    pts3d.forEach((element) => {
      pts3.push(new Vector3(element.x, element.y, element.z));
    });
    return pts3;
  }

  function findMaxValue(array2D: number[][]): number {
    let maxValue = Number.NEGATIVE_INFINITY; // Initialize with a very small value

    for (const row of array2D) {
      for (const num of row) {
        if (num > maxValue) {
          maxValue = num;
        }
      }
    }

    return maxValue;
  }

  function divideArrayByConstant(array2D: number[][], constant: number): number[][] {
    const result: number[][] = [];

    for (const row of array2D) {
      const newRow: number[] = [];

      for (const value of row) {
        newRow.push(value / constant);
      }

      result.push(newRow);
    }

    return result;
  }

  let raygroup = addRays(lens, extSource, 0, raycount);

  const showLineMultiColor = true;
</script>

<!-- Camera Section -->
<T.Group rotation={[0, 0, 0]}>
  <T.OrthographicCamera makeDefault position={[-80, 10, 0]} zoom={12}>
    <OrbitControls enableRotate enableZoom enableDamping dampingFactor={0.03} />
    <T.DirectionalLight position={[-100, 0, 0]} intensity={1.0} />
    <T.DirectionalLight position={[0, 0, -100]} intensity={1.0} />
  </T.OrthographicCamera>
</T.Group>
<T.AmbientLight intensity={0.2} />


<!-- full contour shape -->
<T.Mesh
  geometry={raygroup[7]}
  material={raygroup[8]}
  position={[0, 0, 0]}
  rotation={[-Math.PI / 2, 0, 0]}
  castShadow={true}
  />

