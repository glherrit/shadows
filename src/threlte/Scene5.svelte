<script lang="ts">
  import { T, OrbitControls, useFrame, Line2, useTexture } from "@threlte/core";
  import {
    BufferGeometry,
    Line,
    LineBasicMaterial,
    Vector3,
    DoubleSide,
    OrthographicCamera,
    Vector2,
    LatheGeometry,
    Mesh,
  } from "three";
  import Lens, { Material, Surface } from "$lib/lens";
  import {
    entrancePupilHalfDiameter,
    makeCollimatedFlattop,
    type LightSource,
  } from "$lib/lightSource";
  import { genSolidLens } from "$lib/ThreeGutils";
  import {
    generateCircleGrid,
    generateYGrid,
    trace3DRayPath,
  } from "$lib/raytrace";
  import { Vector3D } from "$lib/vector";
  import { HTML } from "@threlte/extras";
  import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

  let lens: Lens = new Lens(
    25,
    6,
    Material.FusedSilica,
    new Surface(25, 1 / 22, -0.598611, [2.909919e-7, -2.13825e-10, 0, 0]),
    new Surface(25, 0)
  );
  const wlen = 1.07;
  const source = makeCollimatedFlattop(lens.surf1.ap * 0.45, wlen);

  let numberofrays = 11;
  let step = 0;
  let ntrys = 0;
  const rotRadius = 5.0;
  const rotMaxAngle = Math.atan(rotRadius / lens.EFL(source.wavelengths[0]));
  let rotx = 0;
  let roty = 0;
  let rotz = 0;
  let rotation = 0;
  // create an array of Vector3 points for the lens surface
  const zimage = lens.ct + lens.BFL(wlen) - 0.0;
  const zlineLength = 40;
  let focusPoints = new Array<Vector3>(zlineLength);
  for (let i = 0; i < focusPoints.length; i++) {
    let xposi = -Math.cos((Math.PI * 2 * i) / 200) * rotRadius;
    let yposi = -Math.sin((Math.PI * 2 * i) / 200) * rotRadius;
    focusPoints[i] = new Vector3(xposi, yposi, zimage);
  }

  console.log(focusPoints[0]);
  const { start, stop, started } = useFrame(() => {
    rotx = Math.sin(rotation) * rotMaxAngle;
    let xposi = -Math.cos(rotation) * rotRadius;
    let yposi = -Math.sin(rotation) * rotRadius;
    //console.log(xposi, yposi, zimage);
    roty = Math.cos(rotation) * rotMaxAngle;
    rotation += 0.04;
    //focusPoints.pop(); // remove the last element
    //focusPoints.unshift(new Vector3(xposi, yposi, zimage)); // add 0 to the front
    //console.log(focusPoints[0], focusPoints[focusLine.length - 1]);
  });

  const toggleUseFrame = () => {
    if ($started) {
      console.log("stopping");
      stop();
    } else {
      console.log("starting");
      start();
    }
  };

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
    return linegroup;
  }

  function convert3Dto3(pts3d: Vector3D[]) {
    const pts3: THREE.Vector3[] = [];
    pts3d.forEach((element) => {
      pts3.push(new Vector3(element.x, element.y, element.z));
    });
    return pts3;
  }

  function addConeBeam2(
    lens: Lens,
    source: LightSource,
    refocus: number,
    relativeap: number,
    divisions = 51
  ) {
    let vdata: Vector2[] = [];
    const halfDiameter = entrancePupilHalfDiameter(source);

    let pstart1 = trace3DRayPath(
      new Vector3D(0, halfDiameter, -5),
      new Vector3D(0, 0, 1),
      lens,
      source,
      refocus
    );
    let ps = generateCone(pstart1);

    vdata.push(new Vector2(0, ps[0].z));
    ps.forEach((lseg) => {
      vdata.push(new Vector2(lseg.y, lseg.z));
    });
    //console.log('ps', ps)
    vdata.push(new Vector2(ps[ps.length - 1].y, ps[ps.length - 1].z));
    vdata.push(new Vector2(0, ps[ps.length - 1].z));
    return new LatheGeometry(vdata, divisions, 0, Math.PI * 2);
  }

  function generateCone(ps: Vector3D[]) {
    const pout: Vector3D[] = [];
    const x0 = ps[2].z;
    const y0 = ps[2].y;
    const x1 = ps[3].z;
    const y1 = ps[3].y;

    pout.push(ps[0]);
    pout.push(ps[1]);
    pout.push(ps[2]);

    //y = ax + b
    // (y1 = a x1 + b)
    // (y0 = a x0 + b)
    // (y1 - y0) = a (x1 - x0)
    const a = (y1 - y0) / (x1 - x0);
    const b = y0 - a * x0;

    const xp0 = x1 - 10;
    const npts = 51;
    // npts = number of points (21)
    const xinc = (x1 - xp0) / (npts - 1);

    for (let x = xp0; x <= x1 * 1.0001; x += xinc) {
      let yp = a * x + b;
      pout.push(new Vector3D(0, Math.abs(yp), x));
    }
    return pout;
  }

  $: raygroup = addRays(lens, source, 0, numberofrays);

  let focusLine = new Line(
    new BufferGeometry().setFromPoints(focusPoints),
    new LineBasicMaterial({ color: 0xff0000, linewidth: 5 })
  );

  let cameraPosition: [number, number, number] = [-50, 0, -30];

  $: solidBeam = (relaperture: number) => {
    return addConeBeam2(lens, source, 0.0, relaperture).rotateX(Math.PI / 2);
  };

  const showSolidBeam = true;
  const showRays = false;
  const lktexture = useTexture("lenskitcircle.png");
</script>

<T.Group rotation={[0, 0, 0]}>
  <T.OrthographicCamera makeDefault position={cameraPosition} zoom={10}>
    <OrbitControls enableRotate enableZoom enableDamping dampingFactor={0.03} />
    <T.DirectionalLight position={[-100, 0, 0]} intensity={0.0} />
    <T.DirectionalLight position={[0, 0, -100]} intensity={0.0} />
  </T.OrthographicCamera>
</T.Group>
<T.AmbientLight intensity={1} />

<T.Group position={[0, 0, 0]} rotation={[rotx, roty, rotz]}>
  {#if showSolidBeam}
    <T.Mesh
      geometry={solidBeam(0.5)}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      let:ref
    >
      <T.MeshPhongMaterial color={"red"} opacity={1} transparent={true} />
    </T.Mesh>
  {/if}

  <T.Mesh
    geometry={genSolidLens(lens, 201, 201)}
    position={[0, 0, 0]}
    rotation={[Math.PI / 2, 0, 0]}
    let:ref
  >
    <T.MeshPhongMaterial
      color={"orange"}
      transparent={true}
      opacity={0.75}
      shininess={5000}
      side={DoubleSide}
    />
  </T.Mesh>

  {#if showRays}
    {#each raygroup as ray}
      <T.Line geometry={ray.geometry} material={ray.material} />
    {/each}
  {/if}
</T.Group>

<T.Group position={[0, 0, 0]} rotation={[0, 0, -rotation + Math.PI]}>
  <T.Line geometry={focusLine.geometry} material={focusLine.material} />
  <T.Mesh position={[focusPoints[0].x, focusPoints[0].y, zimage]}>
    <T.CircleGeometry args={[0.4, 30]} />
    <T.MeshStandardMaterial color="red" side={DoubleSide} />
  </T.Mesh>
</T.Group>

<!-- Add image plane helper Grid -->
<T.Mesh position.z={zimage + 0.01} rotation.y={Math.PI}>
  <T.CircleGeometry args={[10, 100]} />
  <T.MeshStandardMaterial map={lktexture} />
</T.Mesh>
/>

<HTML
  position={{ x: 0, y: 20, z: -40 }}
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
