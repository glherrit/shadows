import Lens from './lens'
import { Vector3D } from './vector'
import { trace3DRay, type Ray } from './raytrace'
import { Surface } from './lens'
import { calcWFERay } from './erroranalysis'
import type Material from './lens/material'

const CPROPV = new Vector3D(0.0, 0.0, 1.0)

// these are also used as keys in translations as shown in comments
export enum LensShape {
  BestForm, // $_('lensShape.BestForm')
  PlanoConvexOrConcave, // $_('lensShape.PlanoConvexOrConcave')
  EquiConvexOrConcave, // $_('lensShape.EquiConvexOrConcave')
}

export interface OptimizationSettings {
  s1cc?: boolean
  s1as0?: boolean
  s1as1?: boolean
  s1as2?: boolean
  s1as3?: boolean

  s2cc?: boolean
  s2as0?: boolean
  s2as1?: boolean
  s2as2?: boolean
  s2as3?: boolean
}

export function designBasicLens(
  lensShape: LensShape,
  matl: Material,
  wavelength: number,
  diameter: number,
  ct: number,
  targetEFL: number
): Lens {
  let surf1: Surface
  let surf2: Surface
  const sigdigits = 4
  const n = matl.nIndexAt(wavelength)

  switch (lensShape) {
    case LensShape.BestForm: {
      const a = (-2 * (n * n - 1)) / (n + 2)
      const q = (a + 1) / (a - 1)
      const C = -1 / (targetEFL * (n - 1))
      const B = 1 - q
      const A = ((n - 1) * ct * q) / n

      // we only want to use the pos solution here
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const [m, POS] = quadSolution(A, B, C)

      // hack to round numbers to fixed number of points
      const R1 = parseFloat((1 / POS).toFixed(sigdigits))
      const R2 = parseFloat(calcR2(R1, n, ct, targetEFL).toFixed(sigdigits))
      surf1 = new Surface(diameter, 1 / R1)
      surf2 = new Surface(diameter, 1 / R2)
      break
    }

    //b = -2 * f * (n-1)
    //c = f * ((n-1)^2/n)*ct

    case LensShape.EquiConvexOrConcave: {
      const b = -2 * targetEFL * (n - 1)
      const c = (targetEFL * (n - 1) ** 2 * ct) / n
      //console.log(targetEFL, b, c)
      const [m, p] = quadSolution(1, b, c)
      if (targetEFL < 0) {
        surf1 = new Surface(diameter, 1 / parseFloat(m.toFixed(sigdigits)))
        surf2 = new Surface(diameter, -1 / parseFloat(m.toFixed(sigdigits)))
      } else {
        surf1 = new Surface(diameter, 1 / parseFloat(p.toFixed(sigdigits)))
        surf2 = new Surface(diameter, -1 / parseFloat(p.toFixed(sigdigits)))
      }
      break
    }

    case LensShape.PlanoConvexOrConcave:
      surf1 = new Surface(diameter, 1 / parseFloat((targetEFL * (n - 1)).toFixed(sigdigits)))
      surf2 = new Surface(diameter, 0)
      break

    default:
      throw new Error(`Unknown lens shape: ${lensShape}`)
  }

  return new Lens(diameter, ct, matl, surf1, surf2)
}

function quadSolution(a: number, b: number, c: number): [number, number] {
  const radical = b ** 2 - 4 * a * c
  if (radical < 0) {
    return [0, 0]
  }
  const p = (-b + Math.sqrt(radical)) / (2 * a)
  const m = (-b - Math.sqrt(radical)) / (2 * a)
  return [m, p]
}

function calcR2(r1: number, n: number, ct: number, efl: number): number {
  let C1 = 0,
    C2 = 0,
    Cf = 0

  if (Math.abs(r1) > 0.1) C1 = 1 / r1
  if (Math.abs(efl) > 0.1) Cf = 1 / efl

  C2 = (C1 - Cf / (n - 1)) / (1 - ((n - 1) * ct * C1) / n)
  return 1 / C2
}

export function optimizeLens(
  lens: Lens,
  wavelength: number,
  refocus: number,
  settings: OptimizationSettings,
  raySet: number[]
) {
  console.time('optimizeLens')

  const rays = raySet.map((r) => ({
    pVector: new Vector3D(0, (r * lens.surf1.ap) / 2, 0),
    eDir: CPROPV,
  }))

  console.debug(`rays :>> `, rays)
  const startwfe = calc_err_slim(lens, rays, wavelength)
  const wfetarget = startwfe < 0.1 ? startwfe / 10 : 0.01

  for (let k = 0; k < 3; k++) {
    for (let j = 0; j < 10; j++) {
      let deltk = 0.6
      let deltad = 3.1e-7
      let deltae = 1.1e-9
      let deltaf = 1.1e-11
      let deltag = 1.1e-13
      const mintweakstep = 1e-15

      for (let i = 0; i < 10; i++) {
        if (settings.s1cc) {
          const dv = findDirectionConic(lens, lens.surf1, rays, deltk, wavelength, refocus)
          lens.surf1.k += dv
          if (Math.abs(dv) < mintweakstep) {
            deltk /= 10.0
          }
        }

        if (settings.s1as0) {
          const dv = findDirectionAS(lens, lens.surf1, 0, rays, deltad, wavelength, refocus)
          lens.surf1.asphericTerms.setCoeffAt(0, lens.surf1.asphericTerms.coeffAt(0) + dv)
          if (Math.abs(dv) < mintweakstep) {
            deltad /= 10.0
          }
        }

        if (settings.s1as1) {
          const dv = findDirectionAS(lens, lens.surf1, 1, rays, deltae, wavelength, refocus)
          lens.surf1.asphericTerms.setCoeffAt(1, lens.surf1.asphericTerms.coeffAt(1) + dv)
          if (Math.abs(dv) < mintweakstep) {
            deltae /= 10.0
          }
        }

        if (settings.s1as2) {
          const dv = findDirectionAS(lens, lens.surf1, 2, rays, deltaf, wavelength, refocus)
          lens.surf1.asphericTerms.setCoeffAt(2, lens.surf1.asphericTerms.coeffAt(2) + dv)
          if (Math.abs(dv) < mintweakstep) {
            deltaf /= 10.0
          }
        }

        if (settings.s1as3) {
          const dv = findDirectionAS(lens, lens.surf1, 3, rays, deltag, wavelength, refocus)
          lens.surf1.asphericTerms.setCoeffAt(3, lens.surf1.asphericTerms.coeffAt(3) + dv)
          if (Math.abs(dv) < mintweakstep) {
            deltag /= 10.0
          }
        }

        if (settings.s2cc) {
          const dv = findDirectionConic(lens, lens.surf2, rays, deltk, wavelength, refocus)
          lens.surf2.k += dv
          if (Math.abs(dv) < mintweakstep) {
            deltk /= 10.0
          }
        }

        if (settings.s2as0) {
          const dv = findDirectionAS(lens, lens.surf2, 0, rays, deltad, wavelength, refocus)
          lens.surf2.asphericTerms.setCoeffAt(0, lens.surf2.asphericTerms.coeffAt(0) + dv)
          if (Math.abs(dv) < mintweakstep) {
            deltad /= 10.0
          }
        }

        if (settings.s2as1) {
          const dv = findDirectionAS(lens, lens.surf2, 1, rays, deltae, wavelength, refocus)
          lens.surf2.asphericTerms.setCoeffAt(1, lens.surf2.asphericTerms.coeffAt(1) + dv)
          if (Math.abs(dv) < mintweakstep) {
            deltae /= 10.0
          }
        }

        if (settings.s2as2) {
          const dv = findDirectionAS(lens, lens.surf2, 2, rays, deltaf, wavelength, refocus)
          lens.surf2.asphericTerms.setCoeffAt(2, lens.surf2.asphericTerms.coeffAt(2) + dv)
          if (Math.abs(dv) < mintweakstep) {
            deltaf /= 10.0
          }
        }

        if (settings.s2as3) {
          const dv = findDirectionAS(lens, lens.surf2, 3, rays, deltag, wavelength, refocus)
          lens.surf2.asphericTerms.setCoeffAt(3, lens.surf2.asphericTerms.coeffAt(3) + dv)
          if (Math.abs(dv) < mintweakstep) {
            deltag /= 10.0
          }
        }
      }

      if (calc_err_slim(lens, rays, wavelength) < wfetarget) {
        break
      }
    }
  }
  console.timeEnd('optimizeLens')
}

export function minimizePVWFE(
  lens: Lens,
  wavelength: number,
  sourceRadius: number,
  rays: number[]
): number {
  let refocus = 0
  let err
  let deltaref = 0.1
  let dref
  const mintweakstep = 1e-10

  const raySet: Ray[] = []
  for (let i = 0; i < rays.length; i++) {
    raySet.push({ pVector: new Vector3D(0.0, rays[i] * sourceRadius, 0.0), eDir: CPROPV })
  }

  for (let j = 0; j < 3; j++) {
    deltaref = 0.1
    for (let i = 0; i < 15; i++) {
      dref = findWFEPVDirectionRefocus(lens, raySet, wavelength, refocus, deltaref)
      refocus += dref
      if (Math.abs(dref) < mintweakstep) {
        deltaref /= 10.0
      } else {
        err = calc_wfe_slim(lens, raySet, wavelength, refocus)
        if (Math.abs(deltaref) < mintweakstep) deltaref /= 10.0
      }
    }
  }
  return refocus
}

export function minimizeSA(lens: Lens, wavelength: number, sourceDiameter: number): number {
  let refocus = 0
  let err
  let deltaref = 0.1
  let dref
  const mintweakstep = 1e-10
  const numrays = 21

  const stepsize = sourceDiameter / (numrays - 1)

  const raySet: Ray[] = []
  for (let i = 0; i < numrays; i++) {
    const y = -sourceDiameter / 2 + i * stepsize
    raySet.push({ pVector: new Vector3D(0.0, y, 0.0), eDir: CPROPV })
  }

  for (let j = 0; j < 3; j++) {
    deltaref = 0.1
    for (let i = 0; i < 15; i++) {
      dref = findSADirectionRefocus(lens, raySet, wavelength, refocus, deltaref)
      refocus += dref
      if (Math.abs(dref) < mintweakstep) {
        deltaref /= 10.0
      } else {
        err = calc_wfe_slim(lens, raySet, wavelength, refocus)
        if (Math.abs(deltaref) < mintweakstep) deltaref /= 10.0
      }
    }
  }
  return refocus
}

function findWFEPVDirectionRefocus(
  lens: Lens,
  rays: Ray[],
  wavelength: number,
  refocus: number,
  dx: number
): number {
  const dref = refocus
  const center = calc_wfe_slim(lens, rays, wavelength, refocus)
  const right = calc_wfe_slim(lens, rays, wavelength, refocus + dx)
  const left = calc_wfe_slim(lens, rays, wavelength, refocus - dx)

  if (left < center) {
    return -dx
  }
  if (right < center) {
    return dx
  }
  return 0.0
}

function findSADirectionRefocus(
  lens: Lens,
  rays: Ray[],
  wavelength: number,
  refocus: number,
  dx: number
): number {
  const dref = refocus
  const center = calc_lsa_slim(lens, rays, wavelength, refocus)
  const right = calc_lsa_slim(lens, rays, wavelength, refocus + dx)
  const left = calc_lsa_slim(lens, rays, wavelength, refocus - dx)

  if (left < center) {
    return -dx
  }
  if (right < center) {
    return dx
  }
  return 0.0
}

function findDirectionConic(
  lens: Lens,
  surf: Surface,
  rays: Ray[],
  dx: number,
  wavelength: number,
  refocus = 0.0
): number {
  const base = surf.k
  const center = calc_err_slim(lens, rays, wavelength)
  lens.surf1.k = base + dx
  const right = calc_err_slim(lens, rays, wavelength)
  lens.surf1.k = base - dx
  const left = calc_err_slim(lens, rays, wavelength)
  lens.surf1.k = base

  if (left < center) {
    return -dx
  }
  if (right < center) {
    return dx
  }
  return 0.0
}

function findDirectionAS(
  lens: Lens,
  surf: Surface,
  term: 0 | 1 | 2 | 3,
  rays: Ray[],
  dx: number,
  wavelength: number,
  refocus = 0.0
): number {
  const base = surf.asphericTerms.coeffAt(term)
  const center = calc_err_slim(lens, rays, wavelength)
  surf.asphericTerms.setCoeffAt(term, base + dx)
  const right = calc_err_slim(lens, rays, wavelength)
  surf.asphericTerms.setCoeffAt(term, base - dx)
  const left = calc_err_slim(lens, rays, wavelength)
  surf.asphericTerms.setCoeffAt(term, base)

  if (left < center) {
    return -dx
  }
  if (right < center) {
    return dx
  }
  return 0.0
}

function calc_err_slim(lens: Lens, rays: Ray[], wavelength: number, refocus = 0.0): number {
  let sumsum = 0.0
  for (const ray of rays) {
    const { pVector } = trace3DRay(ray.pVector, ray.eDir, lens, refocus, wavelength)
    sumsum += pVector.y ** 2
  }
  return Math.sqrt(sumsum / rays.length)
}

function calc_wfe_slim(lens: Lens, rays: Ray[], wavelength: number, refocus = 0.0): number {
  let sumsum = 0.0

  for (const ray of rays) {
    const pvwfe = calcWFERay(ray, lens, wavelength, refocus)
    sumsum = pvwfe ** 2
  }
  return Math.sqrt(sumsum / rays.length)
}

function calc_lsa_slim(lens: Lens, rays: Ray[], wavelength: number, refocus = 0.0): number {
  let lsamin = 1e10
  let lsamax = -1e10
  for (const ray of rays) {
    const p = trace3DRay(ray.pVector, ray.eDir, lens, refocus, wavelength).pVector
    if (p.y > lsamax) {
      lsamax = p.y
    }
    if (p.y < lsamin) {
      lsamin = p.y
    }
  }
  return lsamax - lsamin
}
