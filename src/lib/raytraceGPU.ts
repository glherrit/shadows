import { GPU } from 'gpu.js'
import type Lens from './lens'

export function runGPURaytrace(
  numRays: number,
  numAngles: number,
  fiberRadius: number,
  refocus: number,
  lens: Lens,
  wavelength: number
) {
  const gpu = new GPU({ mode: 'gpu' })

  gpu.addFunction(calcSlope3D)
  gpu.addFunction(calcDirSines)
  gpu.addFunction(translateToFlatSurf)
  gpu.addFunction(calcSag3D)
  gpu.addFunction(traceToSurf)
  gpu.addFunction(trace3DRay)

  const rayTraceKernel = gpu.createKernel(rayTrace).setOutput([numRays * numAngles])

  return rayTraceKernel(
    lens.surf1.ap / 2,
    lens.ct,
    lens.material.nIndexAt(wavelength),
    lens.BFL(wavelength),
    lens.surf1.typeNumber,
    lens.surf1.c,
    lens.surf1.k,
    lens.surf1.asphericTerms.coeffAt(0),
    lens.surf1.asphericTerms.coeffAt(1),
    lens.surf2.typeNumber,
    lens.surf2.c,
    lens.surf2.k,
    lens.surf2.asphericTerms.coeffAt(0),
    lens.surf2.asphericTerms.coeffAt(1),
    fiberRadius / lens.EFL(wavelength),
    refocus
  )
}

// TODO: discuss with gary about the differences on GPU
// Original algorithm makes N angles per aperture position, but in the GPU we are currently generating
// the same number of rays but each ray is a random position and angle since we have to return 1 output ray
// per input ray and cant generate N angles per 1 random position since the GPU is handling looping
function rayTrace(
  halfAperture: number,
  lensCT: number,
  matIndex: number,
  lensBFL: number,
  s1type: number,
  s1C: number,
  s1K: number,
  s1AD: number,
  s1AE: number,
  s2type: number,
  s2C: number,
  s2K: number,
  s2AD: number,
  s2AE: number,
  halfAngle: number,
  refocus: number
) {
  const r = halfAperture * Math.sqrt(Math.random())
  const theta = Math.random() * Math.PI * 2

  const angR = halfAngle * Math.sqrt(Math.random())
  const angTheta = Math.random() * Math.PI * 2
  const xdir = angR * Math.cos(angTheta)
  const ydir = angR * Math.sin(angTheta)

  const [Px, Py, Ex, Ey] = trace3DRay(
    r * Math.cos(theta),
    r * Math.sin(theta),
    0,
    xdir,
    ydir,
    Math.sqrt(1.0 - xdir ** 2 - ydir ** 2),
    lensCT,
    matIndex,
    lensBFL,
    s1type,
    s1C,
    s1K,
    s1AD,
    s1AE,
    s2type,
    s2C,
    s2K,
    s2AD,
    s2AE,
    refocus
  )
  return [Px, Py, Ex, Ey]
}

function trace3DRay(
  P0x: number,
  P0y: number,
  P0z: number,
  E0x: number,
  E0y: number,
  E0z: number,
  lensCT: number,
  matIndex: number,
  lensBFL: number,
  s1type: number,
  s1C: number,
  s1K: number,
  s1AD: number,
  s1AE: number,
  s2type: number,
  s2C: number,
  s2K: number,
  s2AD: number,
  s2AE: number,
  refocus: number
) {
  // D or P are position vectors
  // C center points of surfaces
  // E are ray direction cosine vectors
  // N are surface normals
  // Z is the zero vector used as place holder in data table

  //var P2 = TraceRayToSide1_A(P0, E0, lens);
  const [P2x, P2y, P2z] = traceToSurf(
    P0x,
    P0y,
    P0z,
    E0x,
    E0y,
    E0z,
    s1type,
    s1C,
    s1K,
    s1AD,
    s1AE,
    0.0
  )
  const [N2x, N2y, N2z] = calcSlope3D(P2x, P2y, P2z, s1C, s1K, s1AD, s1AE)
  const [E2x, E2y, E2z] = calcDirSines(E0x, E0y, E0z, N2x, N2y, N2z, 1.0, matIndex) // after refraction

  // Trace to Surface 2 after refraction
  const [P3x, P3y, P3z] = traceToSurf(
    P2x,
    P2y,
    P2z,
    E2x,
    E2y,
    E2z,
    s2type,
    s2C,
    s2K,
    s2AD,
    s2AE,
    lensCT
  )
  const [N3x, N3y, N3z] = calcSlope3D(P3x, P3y, P3z - lensCT, s1C, s1K, s1AD, s1AE) // adjust z for CT of lens
  //var (E3, aoi3, aor3) = CalcDirSines(E2, N3, lens_in.n, 1);
  const [E3x, E3y, E3z] = calcDirSines(E2x, E2y, E2z, N3x, N3y, N3z, matIndex, 1)

  // transfer ray to image plane
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [P4x, P4y, P4z] = translateToFlatSurf(
    P3x,
    P3y,
    P3z,
    E3x,
    E3y,
    E3z,
    lensCT + lensBFL + refocus
  )
  // return { pVector: P4, eDir: E3 }
  return [P4x, P4y, E3x, E3y]
}

function traceToSurf(
  Dx: number,
  Dy: number,
  Dz: number,
  Ex: number,
  Ey: number,
  Ez: number,
  sType: number,
  sC: number,
  sK: number,
  sAD: number,
  sAE: number,
  plane: number
) {
  if (sType === 0) {
    return translateToFlatSurf(Dx, Dy, Dz, Ex, Ey, Ez, plane)
  }

  let zest1 = calcSag3D(Dx, Dy, sC, sK, sAD, sAE) + plane
  let u = (zest1 - Dz) / Ez

  let P1x = Dx
  let P1y = Dy
  let P1z = Dz

  let P2x = Dx + Ex * u
  let P2y = Dy + Ey * u
  let P2z = Dz + Ez * u

  for (let i = 0; i < 10; i++) {
    const e = Math.sqrt((P1x - P2x) ** 2 + (P2y - P2y) ** 2 + (P2z - P2z) ** 2)
    if (e > 1e-4) {
      P1x = P2x
      P1y = P2y
      P1z = P2z
      zest1 = calcSag3D(P1x, P1y, sC, sK, sAD, sAE) + plane
      u = (zest1 - Dz) / Ez
      P2x = Dx + Ex * u
      P2y = Dy + Ey * u
      P2z = Dz + Ez * u
    } else {
      break
    }
  }

  return [P2x, P2y, P2z]
}

function translateToFlatSurf(
  Px: number,
  Py: number,
  Pz: number,
  Ex: number,
  Ey: number,
  Ez: number,
  zplane: number
) {
  const u = (zplane - Pz) / Ez
  return [Px + Ex * u, Py + Ey * u, Pz + Ez * u]
}
function calcSlope3D(
  Px: number,
  Py: number,
  Pz: number,
  sC: number,
  sK: number,
  sAD: number,
  sAE: number
) {
  const p = Px ** 2 + Py ** 2
  const q0 = Pz - sAD * p ** 2 - sAE * p ** 3
  const q1 = -4 * sAD * p - 6 * sAE * p ** 2

  const dx = Px * (-sC - sC * (sK + 1) * q1 * q0 + q1)
  const dy = Py * (-sC - sC * (sK + 1) * q1 * q0 + q1)
  const dz = 1 - sC * (sK + 1) * q0

  const Nlength = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)
  const Nx = dx / Nlength
  const Ny = dy / Nlength
  const Nz = dz / Nlength

  return [Nx, Ny, Nz]
}

function calcDirSines(
  Ex: number,
  Ey: number,
  Ez: number,
  Nx: number,
  Ny: number,
  Nz: number,
  nin: number,
  nout: number
) {
  const alpha = Ex * Nx + Ey * Ny + Ez * Nz

  const a = 1.0
  const b = 2 * alpha
  const c = 1 - nout ** 2 / nin ** 2
  const sol2 = (-b + Math.sqrt(b ** 2 - 4 * a * c)) / (2 * a)

  const Epx = Ex + sol2 * Nx
  const Epy = Ey + sol2 * Ny
  const Epz = Ez + sol2 * Nz
  const EpLength = Math.sqrt(Epx ** 2 + Epy ** 2 + Epz ** 2)
  return [Epx / EpLength, Epy / EpLength, Epz / EpLength]
}

function calcSag3D(x: number, y: number, sC: number, sK: number, sAD: number, sAE: number) {
  const r2 = x ** 2 + y ** 2
  const sqrtvalue = 1 - (1 + sK) * sC ** 2 * r2

  if (sqrtvalue < 0) {
    return 0
  } else {
    return (sC * r2) / (1 + Math.sqrt(sqrtvalue)) + sAD * r2 ** 2 + sAE * r2 ** 3
  }
}
