<script lang="ts">
  import { T, OrbitControls, useFrame } from "@threlte/core";
  import {
    BufferGeometry,
    BufferAttribute,
    MeshPhongMaterial,
    MeshBasicMaterial,
    DoubleSide
  } from "three";
  import Lens, { Material, Surface } from "$lib/lens";
  import {
    entrancePupilHalfDiameter,
    ExtendedSource,
    makeExtendedSorce,
  } from "$lib/lightSource";
  import { generateRandomRays} from "$lib/raytrace";
  import { cullImagePoints, extenedSrcHisto, genIndices, genVertexColors, sumArrayValues } from "$lib/extSourceUtils";

  let lens: Lens = new Lens(
    25,
    6,
    Material.FusedSilica,
    new Surface(25, 1 / 44.966),
    new Surface(25, -1/1000)
  );
  const wlen = 1.07;
  const extSource = makeExtendedSorce(lens.surf1.ap * 0.45, wlen, 0.1);

  let conicend = -0.59657;
  let a4end = -3.006E-08;
  let a6end = -2.475E-11;
  if ( 1 === 1 ) {
   conicend = 0;
   a4end = 0;
   a6end = 0;
  }
  lens.surf1.k = conicend;
  lens.surf1.asphericTerms.coeffs[0] = a4end;
  lens.surf1.asphericTerms.coeffs[1] = a6end;

  let numsteps = 100;

  let cstep = conicend / numsteps;
  let a4step = a4end / numsteps;
  let a6step = a6end / numsteps;

  let step = 0;
  let ntrys = 0;

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

  function addRays(
    lens: Lens,
    source: ExtendedSource,
    refocus: number,
  ): [
    BufferGeometry,
    MeshBasicMaterial,
  ] {

    const efl = lens.EFL(source.wavelengths[0]);
    const fiber_radius = 0.1;  // fiber radius in mm
    const imageSizeMultiplier = 2;  // image size multiplier
    const halfAng =  fiber_radius / efl;
    const binSize = 2 * fiber_radius / 25;  // bin size in mm
    const numRays = 200_000; // number of base rays to generate
    const numAngles = 5;  // number of angles to generate rays

    const minbin = -imageSizeMultiplier * fiber_radius;  // max neg bin value
    const maxbin = imageSizeMultiplier * fiber_radius;  // max pos bin value
    const sbin = Math.floor((maxbin - minbin + 0.00005) / binSize) + 1;  // total number of bins
    //console.log("🚀 ~ sbin:", sbin)
    //console.log("🚀 ~ binSize:", binSize)
    
    const startTime = performance.now();

    // generate random rays into angular space
    const crays = generateRandomRays(numRays, numAngles, entrancePupilHalfDiameter(source), halfAng);

    // trace rays and generate image plane points
    let surfimgpts = cullImagePoints(crays, lens, source, refocus);

    // create a buffer geometry
    let [array, numBins, farray] = extenedSrcHisto(surfimgpts, fiber_radius, imageSizeMultiplier, binSize);

    // define colors for vertices
    let colors = genVertexColors(farray, 51);

    // define indices for all vertices
    var indices = genIndices(numBins, numBins);

    // create a buffer geometry and set props
    var geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(farray, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.normalizeNormals();
    geometry.setAttribute('color', new BufferAttribute(colors, 3));

    var material = new MeshPhongMaterial({vertexColors: true, shininess: 100, side: DoubleSide});
    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    console.log(`Elapsed time: ${elapsedTime} milliseconds`);
    return [geometry, material];
  }

  let raygroup = addRays(lens, extSource, 0);

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

