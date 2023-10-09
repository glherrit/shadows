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
    ExtendedSource,
    makeExtendedSorce,
  } from "$lib/lightSource";
  import { genSolidLens } from "$lib/ThreeGutils";
  import { generateRandomRays} from "$lib/raytrace";
  import { Vector3D } from "$lib/vector";
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

  import { cullImagePoints, extenedSrcHisto, genIndices, genVertexColors, sumArrayValues } from "$lib/meshUtils";

  let lens: Lens = new Lens(
    25,
    6,
    Material.FusedSilica,
    new Surface(25, 1 / 22),
    new Surface(25, 0)
  );
  const wlen = 1.07;
  const extSource = makeExtendedSorce(lens.surf1.ap * 0.45, wlen, 0.1);
  //console.log(lens, source);lens.surf1.ap * 0.45

  let conicend = -0.598611;
  let a4end = 2.909919e-7;
  let a6end = -2.13825e-10;
  lens.surf1.k = conicend;
  lens.surf1.asphericTerms.coeffs[0] = a4end;
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
    source: ExtendedSource,
    refocus: number,
    numrays: number = 11
  ): [
    BufferGeometry,
    MeshBasicMaterial,
  ] {

    const efl = lens.EFL(source.wavelengths[0]);
    const halfAng =  source.NA / efl;
    const imageSizeMultiplier = 3;
    const fiber_radius = 0.1;
    const binSize = 0.005;  // bin size in radians
    const numRays = 20_000; 
    const numAngles = 5;  // number of angles to generate rays

    const minbin = -imageSizeMultiplier * fiber_radius;  // max neg bin value
    const maxbin = imageSizeMultiplier * fiber_radius;  // max pos bin value
    const sbin = Math.floor((maxbin - minbin + 0.00005) / binSize) + 1;  // total number of bins
    
    // value to normalize total intensity to 1
    //Number of squares = πr^2 / s^2
    let vscale = ((Math.PI * (sbin - 1.0)) / (2.0)) * ((sbin - 1.0) / (2.0) - Math.SQRT1_2); 
   
    // generate random rays into angular space
    const crays = generateRandomRays(numRays, numAngles, entrancePupilHalfDiameter(source), halfAng);

    // trace rays and generate image plane points
    surfimgpts = cullImagePoints(crays, lens, source, refocus)

    // create a buffer geometry
    let [array, numBins, farray] = extenedSrcHisto(surfimgpts, fiber_radius, imageSizeMultiplier, binSize);
    console.log("======================")
    let iradius = fiber_radius;
    let v2 = fiber_radius;
    let v3 = numRays * numAngles * binSize * binSize / (Math.PI * iradius * iradius);
    console.log("vscale", vscale)
    console.log("🚀 ~ v2:", v2)
    console.log("🚀 ~ total Rays:", numRays * numAngles)
    console.log("🚀 ~ est peak v3:", v3.toFixed(1))
    console.log('maxz', Math.max(...array.flat()))
    console.log('est act bin:', (Math.PI * iradius * iradius / ( binSize * binSize)).toFixed(0) );
    console.log ('est peak:', (numAngles * numRays / (Math.PI * iradius * iradius / ( binSize * binSize))).toFixed(0));
    console.log('packed sqs:', calculatePackedSquares(binSize, iradius));
    let flatarray = array.flat();
    let activeCells = 0;
    let totalIntensity = 0;
    let activeArray = [];
    for (let i = 0; i < flatarray.length; i++) {
      if ( flatarray[i] > 1) {
        activeCells += 1;
        totalIntensity += flatarray[i];
        activeArray.push(flatarray[i]);
      } 
    }
    console.log("🚀 ~ totalCells:", flatarray.length, sbin * sbin)
    console.log("🚀 ~ activeCells:", activeCells)
    console.log("🚀 ~ totalIntensity:", totalIntensity)
    console.log("🚀 ~ aver Int:", (totalIntensity / activeCells).toFixed(1))
    // console.log(activeArray)
    // define colors for vertices
    let colors = genVertexColors(farray, 11);

    // define indices for all vertices
    var indices = genIndices(numBins, numBins);

    var geometry = new BufferGeometry();

    geometry.setAttribute('position', new BufferAttribute(farray, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.normalizeNormals();
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    var material = new MeshPhongMaterial({vertexColors: true, shininess: 100, side: DoubleSide});
    
    return [geometry, material];
  }

  function calculatePackedSquares(a: number, R: number): number {
    const maxSquaresPerRow = Math.floor((2 * R) / a);
    const totalSquares = Math.pow(maxSquaresPerRow, 2);
    return totalSquares;
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

