// Fermi Dirac Methods here
import type { Vector2 } from 'three'

export interface FermiData {
  data: Vector2[]
  xmax: number
  ymax: number
}

export function fittofermiDirac(
  xs: number[],
  ys: number[],
  betaest = 20,
  radiusest = 0.1,
  peakest = 1.0
): number[] {
  let delta: number
  let b = betaest
  let r = radiusest
  let p = peakest

  for (let k = 0; k < 15; k++) {
    for (let j = 0; j < 15; j++) {
      let db = 1
      let dr = 0.01
      let dp = 1
      const mintweakstep = 1e-5
      for (let i = 0; i < 15; i++) {
        ;[delta] = findDirectionBeta(xs, ys, b, r, p, db)
        b += delta
        if (delta < mintweakstep) {
          db /= 10.0
        }

        ;[delta] = findDirectionRadius(xs, ys, b, r, p, dr)
        r += delta
        if (delta < mintweakstep) {
          dr /= 10.0
        }

        ;[delta] = findDirectionPeak(xs, ys, b, r, p, dp)
        p += delta
        if (delta < mintweakstep) {
          dp /= 10.0
        }
      }
    }
  }

  const yfermi: number[] = [ys.length]
  for (let i = 0; i < ys.length; i++) {
    const y = fermiDirac(xs[i], b, r, p)
    yfermi[i] = y > 1.0 ? 1.0 : y // compenstate for numerical error
  }

  return yfermi
}

export function calcfermiDiracCoef(
  xs: number[],
  ys: number[],
  betaest = 20,
  radiusest = 0.1,
  peakest = 1.0
): [number, number, number] {
  let delta: number
  let b = betaest
  let r = radiusest
  let p = peakest

  for (let k = 0; k < 15; k++) {
    for (let j = 0; j < 15; j++) {
      let db = 1
      let dr = 0.01
      let dp = 1
      const mintweakstep = 1e-5
      for (let i = 0; i < 15; i++) {
        ;[delta] = findDirectionBeta(xs, ys, b, r, p, db)
        b += delta
        if (delta < mintweakstep) {
          db /= 10.0
        }

        ;[delta] = findDirectionRadius(xs, ys, b, r, p, dr)
        r += delta
        if (delta < mintweakstep) {
          dr /= 10.0
        }

        ;[delta] = findDirectionPeak(xs, ys, b, r, p, dp)
        p += delta
        if (delta < mintweakstep) {
          dp /= 10.0
        }
      }
    }
  }
  return [b, r, p]
}

function fermiDirac(xp: number, beta: number, r50p: number, peak: number): number {
  return peak / (1 + Math.exp(beta * (Math.abs(xp) / r50p - 1.0)))
}

function genFermiDirac(beta: number, r50p: number, peak: number, xs: number[]): number[] {
  const ys: number[] = [xs.length]
  for (let i = 0; i < xs.length; i++) {
    ys[i] = fermiDirac(xs[i], beta, r50p, peak)
  }
  return ys
}

function findDirectionBeta(
  xs: number[],
  y0: number[],
  b: number,
  r: number,
  p: number,
  db: number
): [number, number] {
  let betabase = b
  const center = calcErrorFunction(y0, genFermiDirac(betabase, r, p, xs))

  betabase = b + db
  const right = calcErrorFunction(y0, genFermiDirac(betabase, r, p, xs))

  betabase = b - db
  const left = calcErrorFunction(y0, genFermiDirac(betabase, r, p, xs))

  if (left < center) return [-db, left]
  if (right < center) return [db, right]
  return [0.0, center]
}

function findDirectionRadius(
  xs: number[],
  y0: number[],
  b: number,
  r: number,
  p: number,
  dr: number
): [number, number] {
  let radiusbase = r
  const center = calcErrorFunction(y0, genFermiDirac(b, radiusbase, p, xs))

  radiusbase = r + dr
  const right = calcErrorFunction(y0, genFermiDirac(b, radiusbase, p, xs))

  radiusbase = r - dr
  const left = calcErrorFunction(y0, genFermiDirac(b, radiusbase, p, xs))

  if (left < center) return [-dr, left]
  if (right < center) return [dr, right]
  return [0.0, center]
}

function findDirectionPeak(
  xs: number[],
  y0: number[],
  b: number,
  r: number,
  p: number,
  dp: number
): [delta: number, err: number] {
  let peakbase = p
  const center = calcErrorFunction(y0, genFermiDirac(b, r, peakbase, xs))

  peakbase = p + dp
  const right = calcErrorFunction(y0, genFermiDirac(b, r, peakbase, xs))

  peakbase = p - dp
  const left = calcErrorFunction(y0, genFermiDirac(b, r, peakbase, xs))

  if (left < center) return [-dp, left]
  if (right < center) return [dp, right]
  return [0.0, center]
}

function calcErrorFunction(y0: number[], y1: number[]): number {
  let err = 0.0
  for (let i = 0; i < y0.length; i++) {
    err += Math.pow(y0[i] - y1[i], 2)
  }
  return Math.sqrt(err)
}
