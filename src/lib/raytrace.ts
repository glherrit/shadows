import type Lens from './lens'
import type { Surface } from './lens'
import type { LightSource } from './lightSource'
import { Vector3D } from './vector'

export interface Ray {
  pVector: Vector3D
  eDir: Vector3D
}

// export function runJSRaytrace(gr: GenRays, lens: Lens, refocus: number) {
export function runJSRaytrace(
  numRays: number,
  numAngles: number,
  fiberRadius: number,
  refocus: number,
  lens: Lens,
  wavelength: number
): Ray[] {
  const randomRays = generateRandomRays(
    numRays,
    numAngles,
    lens.surf1.ap / 2,
    fiberRadius / lens.EFL(wavelength)
  )
  const raysOut: Ray[] = []

  for (const rayIn of randomRays) {
    const rayOut = trace3DRay(rayIn.pVector, rayIn.eDir, lens, refocus, wavelength)
    raysOut.push(rayOut)
  }

  return raysOut
}

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function generateRandomRays(
  numRays: number,
  numAngles: number,
  halfAp: number,
  halfAng: number
): Ray[] {
  const rays = []
  let x: number, y: number, xdir: number, ydir: number
  const diag = halfAp ** 2
  const anglediag = halfAng ** 2

  for (let i = 0; i < numRays; i++) {
    x = randomRange(-halfAp, halfAp)
    y = randomRange(-halfAp, halfAp)
    while (x * x + y * y > diag) {
      x = randomRange(-halfAp, halfAp)
      y = randomRange(-halfAp, halfAp)
    }

    const pVector = new Vector3D(x, y, 0.0)

    for (let i = 0; i < numAngles; i++) {
      xdir = randomRange(-halfAng, halfAng)
      ydir = randomRange(-halfAng, halfAng)
      while (xdir * xdir + ydir * ydir > anglediag) {
        xdir = randomRange(-halfAng, halfAng)
        ydir = randomRange(-halfAng, halfAng)
      }
      const eDir = new Vector3D(xdir, ydir, Math.sqrt(1.0 - xdir ** 2 - ydir ** 2))
      rays.push({ pVector, eDir })
    }
  }
  return rays
}

export function generateCollimatedRayBundle(halfAp: number, stepsize: number, startZ = -10): Ray[] {
  const rays: Ray[] = []
  const diag = halfAp * halfAp
  const e0 = new Vector3D(0, 0, 1)

  for (let x = -halfAp; x <= halfAp * 1.0001; x += stepsize) {
    for (let y = -halfAp; y <= halfAp * 1.0001; y += stepsize) {
      if (x * x + y * y <= diag) {
        rays.push({ pVector: new Vector3D(x, y, startZ), eDir: e0 })
      }
    }
  }
  return rays
}

export function calcSag3D(x: number, y: number, surf: Surface, rTolforZero = 0.001) {
  let c = 0
  if (Math.abs(surf.r) > rTolforZero) {
    c = 1 / surf.r
  }

  const r2 = x ** 2 + y ** 2
  const sqrtvalue = 1 - (1 + surf.k) * c ** 2 * r2

  if (sqrtvalue < 0) {
    return 0
  } else {
    return (c * r2) / (1 + Math.sqrt(sqrtvalue)) + surf.asphericTerms.sagAt(x, y)
  }
}

function calcSlope3D(P: Vector3D, s: Surface): [Vector3D, number] {
  const ad = s.asphericTerms.coeffAt(0)
  const ae = s.asphericTerms.coeffAt(1)
  const af = s.asphericTerms.coeffAt(2)
  const ag = s.asphericTerms.coeffAt(3)

  const p = P.x ** 2 + P.y ** 2
  const q0 = P.z - ad * p ** 2 - ae * p ** 3 - af * p ** 4 - ag * p ** 5
  const q1 = -4 * ad * p - 6 * ae * p ** 2 - 8 * af * p ** 3 - 10 * ag * p ** 4

  const dx = P.x * (-s.c - s.c * (s.k + 1) * q1 * q0 + q1)
  const dy = P.y * (-s.c - s.c * (s.k + 1) * q1 * q0 + q1)
  const dz = 1 - s.c * (s.k + 1) * q0

  const N = new Vector3D(dx, dy, dz)
  const n = N.divide(N.length)
  const F = -(s.c / 2) * p - (s.c / 2) * (s.k + 1) * q0 ** 2 + q0
  return [n, F]
}

function calcDirSines(E: Vector3D, N: Vector3D, nin: number, nout: number) {
  const alpha = Vector3D.dotProduct(E, N)
  //var aoi = Math.Acos(alpha).RadToDeg();
  //var aor = Math.Asin(Math.Sin(Math.Acos(alpha)) * nin / nout).RadToDeg();

  const a = 1.0
  const b = 2 * alpha
  const c = 1 - nout ** 2 / nin ** 2
  const sol2 = (-b + Math.sqrt(b ** 2 - 4 * a * c)) / (2 * a)
  let Ep = E.add(N.multiply(sol2))
  Ep = Ep.divide(Ep.length)
  return Ep
  //return (Ep, aoi, aor);
}

function translateToFlatSurf(P: Vector3D, E: Vector3D, zplane: number) {
  const u = (zplane - P.z) / E.z
  return P.add(E.multiply(u))
}

function traceToSurf(D: Vector3D, E: Vector3D, surf: Surface, plane = 0) {
  if (surf.type === 'plane') {
    return translateToFlatSurf(D, E, plane)
  }

  let zest1 = calcSag3D(D.x, D.y, surf) + plane
  let u = (zest1 - D.z) / E.z

  let P1 = D
  let P2 = D.add(E.multiply(u))

  for (let i = 0; i < 10; i++) {
    if (P1.sub(P2).length > 1e-4) {
      P1 = P2
      zest1 = calcSag3D(P1.x, P1.y, surf) + plane
      u = (zest1 - D.z) / E.z
      P2 = D.add(E.multiply(u))
    } else {
      break
    }
  }

  return P2
}

export function trace3DRay(
  P0: Vector3D,
  E0: Vector3D,
  lens: Lens,
  Refocus: number,
  wavelength: number
): Ray {
  // D or P are position vectors
  // C center points of surfaces
  // E are ray direction cosine vectors
  // N are surface normals
  // Z is the zero vector used as place holder in data table

  const nIndex = lens.material.nIndexAt(wavelength)
  //var P2 = TraceRayToSide1_A(P0, E0, lens);
  const P2 = traceToSurf(P0, E0, lens.surf1, 0.0)
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [N2, F] = calcSlope3D(P2, lens.surf1)
  //var (E2, aoi2, aor2) = CalcDirSines(E0, N2, 1.0, lens_in.n);  // after refraction
  const E2 = calcDirSines(E0, N2, 1.0, nIndex) // after refraction

  // Trace to Surface 2 after refraction
  const P3 = traceToSurf(P2, E2, lens.surf2, lens.ct)

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [N3, _] = calcSlope3D(new Vector3D(P3.x, P3.y, P3.z - lens.ct), lens.surf2) // adjust z for CT of lens

  //var (E3, aoi3, aor3) = CalcDirSines(E2, N3, lens_in.n, 1);
  const E3 = calcDirSines(E2, N3, nIndex, 1)

  // transfer ray to image plane
  const P4 = translateToFlatSurf(P3, E3, lens.ct + lens.BFL(wavelength) + Refocus)
  //var E5 = E3;
  //var N5 = new Vector3D(0, 0, 1);
  //var aoi5 = Math.Acos(Vector3D.DotProduct(E3, N5)).RadToDeg();
  return { pVector: P4, eDir: E3 }
}

export function trace3DRayPath(
  P0: Vector3D,
  E0: Vector3D,
  lens: Lens,
  source: LightSource,
  Refocus: number
): Vector3D[] {
  const pvs: Vector3D[] = []

  pvs.push(P0)

  const nIndex = lens.material.nIndexAt(source.wavelengths[0])
  const P2 = traceToSurf(P0, E0, lens.surf1, 0.0)
  pvs.push(P2)

  const [N2, F] = calcSlope3D(P2, lens.surf1)
  const E2 = calcDirSines(E0, N2, 1.0, nIndex) // after refraction

  // Trace to Surface 2 after refraction
  const P3 = traceToSurf(P2, E2, lens.surf2, lens.ct)
  const [N3, _] = calcSlope3D(new Vector3D(P3.x, P3.y, P3.z - lens.ct), lens.surf2) // adjust z for CT of lens
  const E3 = calcDirSines(E2, N3, nIndex, 1)
  pvs.push(P3)

  const bfl = lens.BFL(source.wavelengths[0])
  const P4 = translateToFlatSurf(P3, E3, lens.ct + bfl + Refocus)
  pvs.push(P4)

  return pvs
}

export function generateRandomRayVectors(ap: number, baseraysct: number): Vector3D[] {
  const rayVectors: Vector3D[] = []
  let x, y
  const hypotsq = ap * ap
  for (let i = 0; i < baseraysct; i++) {
    x = ap * (Math.random() * 2.0 - 1.0)
    y = ap * (Math.random() * 2.0 - 1.0)
    while (x * x + y * y > hypotsq) {
      x = ap * (Math.random() * 2.0 - 1.0)
      y = ap * (Math.random() * 2.0 - 1.0)
    }
    rayVectors.push(new Vector3D(x, y, 0))
  }
  return rayVectors
}

export function generateFibonacciVectors(ap: number, baseraysct: number, beginZ = 0): Vector3D[] {
  const vlist: Vector3D[] = []

  /* math needed to calc fibonacci positions
    for python: from numpy import arange, pi, sin, cos, arccos
    n = 50
    i = arange(0, n, dtype = float) + 0.5
    phi = arccos(1 - 2 * i / n)
    goldenRatio = (1 + 5 * *0.5) / 2
    theta = 2 pi* i / goldenRatio
    x, y, z = cos(theta) * sin(phi), sin(theta) * sin(phi), cos(phi);
    */

  const goldenratio = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < baseraysct; i++) {
    const x = i / goldenratio - Math.trunc(i / goldenratio)
    const y = i / baseraysct
    const theta: number[] = []
    const rad: number[] = []
    if (Math.sqrt(x * x + y * y) <= 10) {
      theta.push(2 * Math.PI * x)
      rad.push(Math.sqrt(y))
      const xs = ap * 0.1 * 10 * Math.sqrt(y) * Math.cos(2 * Math.PI * x)
      const ys = ap * 0.1 * 10 * Math.sqrt(y) * Math.sin(2 * Math.PI * x)
      vlist.push(new Vector3D(xs, ys, beginZ))
    }
  }
  return vlist
}

export function generateFibonacciRays(ap: number, baseraysct: number, beginZ = 0): Ray[] {
  /* math needed to calc fibonacci positions
  for python: from numpy import arange, pi, sin, cos, arccos
  n = 50
  i = arange(0, n, dtype = float) + 0.5
  phi = arccos(1 - 2 * i / n)
  goldenRatio = (1 + 5 * *0.5) / 2
  theta = 2 pi* i / goldenRatio
  x, y, z = cos(theta) * sin(phi), sin(theta) * sin(phi), cos(phi);
  */
  const rays: Ray[] = []
  const e0 = new Vector3D(0, 0, 1)
  const goldenratio = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < baseraysct; i++) {
    const x = i / goldenratio - Math.trunc(i / goldenratio)
    const y = i / baseraysct
    const theta: number[] = []
    const rad: number[] = []
    if (Math.sqrt(x * x + y * y) <= 10) {
      theta.push(2 * Math.PI * x)
      rad.push(Math.sqrt(y))
      const xs = ap * 0.1 * 10 * Math.sqrt(y) * Math.cos(2 * Math.PI * x)
      const ys = ap * 0.1 * 10 * Math.sqrt(y) * Math.sin(2 * Math.PI * x)
      rays.push({ pVector: new Vector3D(xs, ys, beginZ), eDir: e0 })
    }
  }
  return rays
}

export function generateYGrid(ap: number, baseraysct: number, beginZ = 0): Ray[] {
  const rays: Ray[] = []
  const e0 = new Vector3D(0, 0, 1)
  const stepsize = 2 * ap / (baseraysct-1)
  for (let i = 0; i < baseraysct; i++) {
    const ys = -ap + i * stepsize
    rays.push({ pVector: new Vector3D(0, ys, beginZ), eDir: e0 })
  }
  return rays
}

// function gen2DZeroArray(size: number): number[][] {
//   return new Array(size).fill(new Array(size).fill(0))
// }

// export function processVlistData(
//   Vlist: Vector3D[],
//   lens: Lens,
//   Refocus: number,
//   fiber_radius: number
// ) {
//   const maxbin = 2 * fiber_radius
//   const minbin = -maxbin
//   const steps = 201
//   const binsize = (maxbin - minbin) / steps

//   const indata = gen2DZeroArray(steps)
//   let errors = 0
//   Vlist.forEach((p) => {
//     const row = Math.round((p.x - minbin) / binsize)
//     const col = Math.round((p.y - minbin) / binsize)
//     if (row >= 0 && row < steps && col >= 0 && col < steps) {
//       indata[row][col] += 1
//     } else {
//       errors++
//     }
//   })
//   return indata
// }

// export function sliceDataMidPt(data: number[][], border = 0) {
//   const rows = data.length
//   const cols = data[0].length
//   const midrow = Math.round(rows / 2)
//   const odata: number[] = new Array(cols).fill(0)

//   for (let c = 0; c < cols; c++) {
//     let sum = 0
//     for (let r = midrow - border; r <= midrow + border; r++) {
//       sum += data[r][c]
//     }
//     odata[c] = sum / (1 + 2 * border)
//   }

//   return odata
// }

// export interface WFERay {
//   yIn: number
//   yEnd: number
//   zEnd: number
//   AOI: number
//   slope: number
//   LSA: number
//   OPD: number
// }

// export class PointD {
//   x: number
//   y: number

//   constructor(x: number = 0, y: number = 0) {
//     this.x = x
//     this.y = y
//   }

//   isAlmostZero(): boolean {
//     return Math.sqrt(this.x * this.x + this.y * this.y) < 0.05
//   }
// }

// export class RayVector {
//   pBegin: PointD
//   pEnd: PointD
//   AOI: number
//   AOR: number
//   index: number

//   constructor(
//     x0: number,
//     y0: number,
//     x1: number,
//     y1: number,
//     index: number,
//     aoi: number,
//     aor: number
//   ) {
//     this.pBegin = new PointD(x0, y0)
//     this.pEnd = new PointD(x1, y1)
//     this.index = index
//     this.AOI = aoi
//     this.AOR = aor
//   }

//   get OPD(): number {
//     const l = Math.sqrt(
//       (this.pEnd.x - this.pBegin.x) * (this.pEnd.x - this.pBegin.x) +
//         (this.pEnd.y - this.pBegin.y) * (this.pEnd.y - this.pBegin.y)
//     )
//     return l * this.index
//   }
// }
