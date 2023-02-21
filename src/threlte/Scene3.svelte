<script lang="ts">
  import { T, OrbitControls, useFrame } from "@threlte/core";
  import {
    BufferGeometry,
    Line,
    LineBasicMaterial,
    Vector3,
    DoubleSide,
    OrthographicCamera,
  } from "three";
  import Lens, { Material, Surface } from "$lib/lens";
  import {
    entrancePupilHalfDiameter,
    makeCollimatedFlattop,
    type LightSource,
  } from "$lib/lightSource";
  import { genSolidLens } from "$lib/ThreeGutils";
  import { generateYGrid, trace3DRayPath } from "$lib/raytrace";
  import type { Vector3D } from "$lib/vector";

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

  useFrame(() => {
    lens.surf1.k = -conicend + cstep * step;
    lens.surf1.asphericTerms.coeffs[0] = -a4end + a4step * step;
    lens.surf1.asphericTerms.coeffs[1] = -a6end + a6step * step;
    step += 1;
    if (step > numsteps * 2) {
      step = 0;
      ntrys += 1;
    }

    if (ntrys > 5) {
      cstep = 0;
      a4step = 0;
      a6step = 0;
    }
  });

  let surf1pts: Vector3[] = [];
  let surf2pts: Vector3[] = [];
  let surfimgpts: Vector3[] = [];

  function addRays(
    lens: Lens,
    source: LightSource,
    refocus: number,
    numrays: number = 11
  ) {
    // const material = new LineBasicMaterial({ color: 0xff0000, linewidth: 1 })
    const linegroup: THREE.Line[] = [];
    // let halfap = source.diameter / 2
    surf1pts = [];
    surf2pts = [];
    surfimgpts = [];
    //const crays = generateCollimatedRayBundle(halfap, 1, rayInitialZPosition)
    const crays = generateYGrid(entrancePupilHalfDiameter(source), numrays, -5);
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
    return linegroup;
  }

  function convert3Dto3(pts3d: Vector3D[]) {
    const pts3: THREE.Vector3[] = [];
    pts3d.forEach((element) => {
      pts3.push(new Vector3(element.x, element.y, element.z));
    });
    return pts3;
  }

  $: raygroup = addRays(lens, source, 0, numberofrays);

  let cameraPosition: [number, number, number] = [-50, 0, 0];
</script>

<T.Group rotation={[rotation / 3, 0, rotation]}>
  <T.OrthographicCamera makeDefault position={cameraPosition} zoom={10}>
    <OrbitControls enableRotate enableZoom enableDamping dampingFactor={0.03} />
    <T.DirectionalLight position={[-100, 0, 0]} intensity={1.0} />
    <T.DirectionalLight position={[0, 0, -100]} intensity={1.0} />
  </T.OrthographicCamera>
</T.Group>
<T.AmbientLight intensity={0.2} />

<T.Group position={[0, 0, -25]}>
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

  {#each raygroup as ray}
    <T.Line geometry={ray.geometry} material={ray.material} />
  {/each}

  <!-- Add image plane helper Grid -->
  <T.Mesh position.z={lens.ct + lens.BFL(wlen)} receiveShadow>
    <T.PlaneGeometry args={[10, 10]} />
    <T.MeshStandardMaterial color="green" side={DoubleSide} />
  </T.Mesh>
  />
</T.Group>
