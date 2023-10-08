<script lang="ts">
  import { T, OrbitControls, useFrame, Line2 } from "@threlte/core";
  import {
    BufferGeometry,
    Vector3,
    BufferAttribute,
    MeshPhongMaterial,
    MeshBasicMaterial,

    DoubleSide

  } from "three";
  import Lens, { Material, Surface } from "$lib/lens";
  import {
    entrancePupilHalfDiameter,
    makeCollimatedFlattop,
    type LightSource,
    makeExtendedSorce,
  } from "$lib/lightSource";
  import { genSolidLens } from "$lib/ThreeGutils";
  import { generateRandomRays2, trace3DRayPath } from "$lib/raytrace";
  import type { Vector3D } from "$lib/vector";
  import { Lut } from "three/examples/jsm/math/Lut";
  import {
    chooseAxisLimits,
    formatAxisLimit,
    generateLatheColors,
    genProfile3D,
    saveTextToFile,
    scaleArray,
    xyToVector,
  } from "$lib/gUtils";

  import { cullImagePoints, extenedSrcHisto, genIndices } from "$lib/meshUtils";

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
  lens.surf1.k = conicend;
  lens.surf1.asphericTerms.coeffs[0] = a4end
  lens.surf1.asphericTerms.coeffs[1] = a6end;

  let numsteps = 100;

  let cstep = conicend / numsteps;
  let a4step = a4end / numsteps;
  let a6step = a6end / numsteps;

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
    BufferGeometry,
    MeshBasicMaterial,
  ] {
    // const material = new LineBasicMaterial({ color: 0xff0000, linewidth: 1 })
    const linegroup: THREE.Line[] = [];
    // let halfap = source.diameter / 2

    // generate random rays into angular space
    const crays = generateRandomRays2(10001, 5, entrancePupilHalfDiameter(source), 0.001);

    // trace rays and generate image plane points
    surfimgpts = cullImagePoints(crays, lens, source, refocus)

    // create a buffer geometry
    let [array, numBins, farray] = extenedSrcHisto(surfimgpts, 0.1, 1, 0.005);
    
    let str = '';
    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array[i].length; j++) {
        if (j == 0) { 
          str += array[i][j];
        } else { 
          str += ", " + array[i][j];
       }
      }
      str += "\n";
    }
    //saveTextToFile(str, 'test.txt');

    let str2 = '';
    for (let i = 0; i < farray.length; i += 3) {
      str2 += i/3 + ", " + farray[i] + ", " + farray[i + 1] + ", " + farray[i + 2] + "\n";
    } 
    //saveTextToFile(str2, 'test2.txt');

    var geometry = new BufferGeometry();
    var indices = genIndices(numBins, numBins);
    let str3 = '';
    for (let i = 0; i < indices.length; i += 3) {
      let zaver = farray[indices[i] * 3 + 2]  + farray[indices[i + 1] * 3 + 2] + farray[indices[i + 2] * 3 + 2] / 3;
      str3 += i/3 + ", " + indices[i] + ", " + indices[i + 1] + ", " + indices[i + 2] + ", " + zaver.toFixed(3) + "\n";
    } 
    //saveTextToFile(str3, 'str3.txt');

    // set the position and color attributes of the geometry
    geometry.setIndex(indices);
    geometry.setAttribute('position', new BufferAttribute(farray, 3));
    geometry.computeVertexNormals();
    geometry.normalizeNormals();

    let zMax = -1.1e-20;
    for(let i = 2; i < farray.length; i += 3) {
      if(farray[i] > zMax) {
        zMax = farray[i];
      }
    }
    console.log('zMax', zMax)
    const lut = new Lut('rainbow', 101);
    
    let colors = new Float32Array(indices.length);
    let zs = [];
    let zColors = [];
    for (let i = 0; i < indices.length; i += 3) {
      let i0 = indices[i];
      let i1 = indices[i + 1];
      let i2 = indices[i + 2];
      let z = (farray[i0 * 3 + 2] + farray[i1 * 3 + 2] + farray[i2 * 3 + 2]) / 3;
      const color = lut.getColor(z * 40 / zMax);
      zColors.push(color);
      zs.push(z / zMax);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    var material = new MeshPhongMaterial({vertexColors: true, shininess: 100, side: DoubleSide});
    
    return [geometry, material];
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
    <T.DirectionalLight position={[0, 100, 0]} intensity={0.2} />
    <T.DirectionalLight position={[0, 0, -100]} intensity={0} />
  </T.OrthographicCamera>
</T.Group>
<T.AmbientLight intensity={0.2} />


<!-- full contour shape -->
<T.Mesh
  geometry={raygroup[0]}
  material={raygroup[1]}
  position={[0, -15, 0]}
  rotation={[-Math.PI / 2, 0, 0]}
  castShadow={true}
  />

