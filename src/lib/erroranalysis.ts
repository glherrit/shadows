import type Lens from './lens'
import { Vector3D } from './vector'
import { trace3DRay } from './raytrace'
import type { Ray } from './raytrace'
import { entrancePupilHalfDiameter, type LightSource } from './lightSource'

const zeroDir = new Vector3D(0.0, 0.0, 1.0)
//import Decimal from 'decimal.js'

// next two structs or interfaces used just to facilitate moving the data
// back to the caller
export interface BasicStats {
  min: number
  max: number
  pv: number
  average: number
  rms: number
}

export interface LsaResults {
  rayout: Ray
  lsa: number
  aoi: number
}

// calculates the RMS spot size error across one radial slice of the part - of course along the 0 to ymax
// this spot size error is essentially the error function used in the optimization of the lens
// this function should be wired to the main lens design sheet "Error Func" which is probably is not grammatically correct
export function radialRMSError(
  lens: Lens,
  refocus: number,
  halfCa: number,
  raySet: number[],
  wavelength: number
): BasicStats {
  let sumSum = 0
  let Sum = 0.0
  let min = 1.0e20
  let max = -1.0e20
  raySet.forEach(function (value) {
    const p = new Vector3D(0.0, value * halfCa, 0)
    const y = trace3DRay(p, zeroDir, lens, refocus, wavelength).pVector.y

    if (y < min) {
      min = y
    }
    if (y > max) {
      max = y
    }

    Sum += y
    sumSum += y * y
  })

  const average = Sum / raySet.length
  const rms = Math.sqrt(sumSum / raySet.length)
  const eStat: BasicStats = { min: min, max: max, pv: max - min, average: average, rms: rms }
  return eStat
}

// calculates the WFE (wavefront error) across one radial slice of the part - of course along the 0 to ymax
// this function should be wired to the main lens design sheet "WFE Error" which is probably is not grammatically correct
export function raidalWFE(
  lens: Lens,
  refocus: number,
  halfCA: number,
  numsamples: number,
  wavelength: number
): number {
  let min = 1.0e20
  let max = -1.0e20

  for (let i = 0; i <= numsamples; i++) {
    // const y = (halfCA * i) / numsamples
    const p0 = new Vector3D(0.0, (halfCA * i) / numsamples, 0.0)
    const wfe = calcWfeVecs(p0, zeroDir, lens, refocus, wavelength)
    if (wfe < min) {
      min = wfe
    }
    if (wfe > max) {
      max = wfe
    }
    //console.log("y: " + y.toFixed(3) + ",   wfe: " + wfe.toFixed(6))
  }
  return max - min
}

// this function can be used to produce a WFE grid that can be turned into a bitmap or 2d wavefront map
// this will only be useful I guess until the GPU calculators get going???
export function GenWfeMap(
  lens: Lens,
  refocus: number,
  halfCa: number,
  gridsize: number,
  wavelength: number
): number[][] {
  const wfemap: number[][] = []
  const inc = (2.0 * halfCa) / (gridsize - 1)
  const diag = halfCa * halfCa * 1.0001 // add a little extra to make sure and get the cardinal points
  for (let row = 0; row < gridsize; row++) {
    wfemap[row] = []
    for (let col = 0; col < gridsize; col++) {
      const x = -halfCa + row * inc
      const y = -halfCa + col * inc
      if (diag > x * x + y * y) {
        const p = new Vector3D(x, y, 0.0)
        wfemap[row][col] = calcWfeVecs(p, zeroDir, lens, refocus, wavelength)
      } else wfemap[row][col] = -1.0
    }
  }
  return wfemap
}

export function GenSpotDiagram(
  lens: Lens,
  refocus: number,
  halfCa: number,
  gridsize: number,
  wavelength: number
): Ray[] {
  const map: Ray[] = []

  const inc = (2.0 * halfCa) / (gridsize - 1)
  const diag = halfCa * halfCa * 1.0001 // add a little extra to make sure and get the cardinal points
  for (let row = 0; row < gridsize; row++) {
    for (let col = 0; col < gridsize; col++) {
      const x = -halfCa + row * inc
      const y = -halfCa + col * inc
      if (diag > x * x + y * y) {
        map.push(trace3DRay(new Vector3D(x, y, 0.0), zeroDir, lens, refocus, wavelength))
      }
    }
  }
  return map
}

export function CalcRMSSpotSize(spots: Ray[]): BasicStats {
  let sum = 0.0
  let sumsquare = 0.0
  let min = 1.0e20
  let max = -1.0e20

  for (const r of spots) {
    const radialdist = Math.sqrt(r.pVector.x * r.pVector.x + r.pVector.y * r.pVector.y)
    sumsquare += radialdist * radialdist
    sum += radialdist
    if (radialdist < min) {
      min = radialdist
    }
    if (radialdist > max) {
      max = radialdist
    }
  }
  const eStat: BasicStats = {
    min: min,
    max: max,
    pv: max - min,
    average: sum / spots.length,
    rms: Math.sqrt(sumsquare / spots.length),
  }
  return eStat
}

// *************************************************************************
// all functions below would normally not be exported, but they now are so
// that the test1.ts main program can debug or vet their results.
// *************************************************************************

export function calcWFERay(rayin: Ray, lens: Lens, wavelength: number, refocus: number): number {
  return calcWfeVecs(rayin.pVector, rayin.eDir, lens, refocus, wavelength)
}

export function calcWfeVecs(
  p0: Vector3D,
  e0: Vector3D,
  lens: Lens,
  refocus: number,
  wavelength: number
): number {
  const p1 = new Vector3D(p0.x / Math.sqrt(2.0), p0.y / Math.sqrt(2.0), 0.0)

  const rsq = p0.x * p0.x + p0.y * p0.y
  const rsqsq = rsq * rsq

  if (rsq < 1.0e-8) {
    return 0.0
  }

  const lstatm = CalcLSAVecs(p0, e0, lens, 0.0, wavelength)
  const lstatz = CalcLSAVecs(p1, e0, lens, 0.0, wavelength)

  const a = (4.0 * lstatz.lsa - lstatm.lsa) / rsq
  const b = (2.0 * lstatm.lsa - 4.0 * lstatz.lsa) / rsqsq

  //double a = (4 * Yz.LSA - Ym.LSA) / Math.Pow(y0, 2);
  //double b = (2 * Ym.LSA - 4 * Yz.LSA) / Math.Pow(y0, 4);

  /*
    console.log("")
    console.log("p0: " + p0.toString2(3))
    console.log("e0: " + e0.toString2(3));
    console.log("p1: " + p1.toString2(3))
    console.log("rm.v: " + lstatm.rayout.pVector.toString2(6))
    console.log("rz.v: " + lstatz.rayout.pVector.toString2(6))
    console.log("lstatm: " + LsaResToStr(lstatm, 6))
    console.log("lstatz: " + LsaResToStr(lstatz, 6))
    console.log("a: " + a.toFixed(8))
    console.log("b: " + b.toFixed(8))
    */
  //double opd = 1000 * (Math.Sin(Ym.AOI3) * Math.Sin(Ym.AOI3) / 2) *
  //                     (Refocus - a * Math.Pow(y0, 2) / 2 - b * Math.Pow(y0, 4) / 3) / lensp.WL;

  //var yfinal = y0.CalcLSA(lensp, Refocus);

  return (
    (1000.0 *
      ((Math.sin(lstatm.aoi) * Math.sin(lstatm.aoi)) / 2.0) *
      (refocus - (a * rsq) / 2.0 - (b * rsqsq) / 3.0)) /
    wavelength
  )
}

export function CalcLSAVecs(
  p0: Vector3D,
  e0: Vector3D,
  lens: Lens,
  refocus: number,
  wavelength: number
): LsaResults {
  // taken from rust implementation
  //let aoi = self.edir.dot_product(&CPROPV).acos();
  //let lsa = -1.0 * (self.pvector.x.powi(2) + self.pvector.y.powi(2)).sqrt() / aoi.tan();
  //(aoi, lsa)

  // rayout needs to be the ray location at the principle image plane - not the refocused plane
  const rayout = trace3DRay(p0, e0, lens, refocus, wavelength)
  const aoi = Math.acos(Vector3D.dotProduct(rayout.eDir, zeroDir))
  const lsa =
    (-1.0 * Math.sqrt(rayout.pVector.x * rayout.pVector.x + rayout.pVector.y * rayout.pVector.y)) /
    Math.tan(aoi)
  const lsares: LsaResults = { rayout: rayout, lsa: lsa, aoi: aoi }
  return lsares // calls to this function expect radians
}

// this function can be used to produce a WFE line of data through the center
// cross section of the lens pupil
export function genWaveFrontLine(lens: Lens, source: LightSource, gridsize = 101, refocus = 0) {
  const halfCa = entrancePupilHalfDiameter(source)
  const radialPos: number[] = []
  const wfeMap: number[] = []
  const inc = (2 * entrancePupilHalfDiameter(source)) / (gridsize - 1)
  // let inc = 51
  let min = 1e20
  let max = -1e20
  for (let xpos = -halfCa; xpos <= halfCa * 1.001; xpos += inc) {
    radialPos.push(xpos)
    const p = new Vector3D(xpos, 0.0, 0.0)
    const wfe = calcWfeVecs(p, zeroDir, lens, refocus, source.wavelengths[0])
    if (wfe < min) {
      min = wfe
    }
    if (wfe > max) {
      max = wfe
    }
    wfeMap.push(wfe)
  }

  return { radialPos, wfeMap, min, max }
}

// *************************************************************************
// temporary utils
// *************************************************************************

// function LsaResToStr(lsar: LsaResults, places: number) {
//   return '{lsa: ' + lsar.lsa.toFixed(places) + ',  aoi: ' + lsar.aoi.toFixed(places) + '}'
// }
