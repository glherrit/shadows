import { Vector2, Vector3, BufferGeometry, BufferAttribute } from 'three'
import { Lut } from 'three/examples/jsm/math/Lut'
import type { Vector3D } from './vector'
import type Lens from "$lib/lens";
import type { LightSource } from "../lib/lightSource";


export function generateLatheColors(
  image: BufferGeometry,
  maxZ: number,
  colorscheme = 'rainbow',
  numcolors = 101
): Float32Array {
  const lut = new Lut(colorscheme, numcolors)
  const numVectors = (image.getAttribute('position') as BufferAttribute).array.length / 3
  const lathcolors = new Float32Array(numVectors * 3)
  let lcolposi = 0

  for (let i = 0; i < numVectors; i++) {
    const yh = (image.getAttribute('position') as BufferAttribute).array[3 * i + 1]
    const colorindex = yh / maxZ
    lathcolors.set(
      [lut.getColor(colorindex).r, lut.getColor(colorindex).g, lut.getColor(colorindex).b],
      lcolposi
    )
    lcolposi += 3
  }
  return lathcolors
}

export function findMinsAndMaxs(
  points: number[][]
): [xmin: number, xmax: number, ymin: number, ymax: number] {
  let xmax = -1e10
  let xmin = 1e10
  let ymax = -1e10
  let ymin = 1e10
  for (let i = 0; i < points.length; i++) {
    if (points[i][1] < ymin) {
      ymin = points[i][1]
    }
    if (points[i][1] > ymax) {
      ymax = points[i][1]
    }
    if (points[i][0] < xmin) {
      xmin = points[i][0]
    }
    if (points[i][0] > xmax) {
      xmax = points[i][0]
    }
  }
  return [xmin, xmax, ymin, ymax]
}

export function doubleArrayToVector2(points: number[][], scalex: number, scaley: number) {
  const vdata: Vector2[] = []
  for (let i = 0; i < points.length; i++) {
    vdata.push(new Vector2(points[i][0] * scalex, points[i][1] * scaley))
  }
  return vdata
}

export function arrayToScaledVector2(
  points: number[][],
  xmin: number,
  xmax: number,
  scaledX: number,
  ymin: number,
  ymax: number,
  scaledY: number
) {
  const vdata: Vector2[] = []
  for (let i = 0; i < points.length; i++) {
    const newx = (scaledX * (points[i][0] - xmin)) / (xmax - xmin)
    const newy = (scaledY * (points[i][1] - ymin)) / (ymax - ymin)
    vdata.push(new Vector2(newx, newy))
  }
  return vdata
}

export function arrayToScaledVector3(
  points: number[][],
  plotScale: number,
  zPosition: number,
  zScale: number
) {
  const vdata: Vector3[] = []
  for (let i = 0; i < points.length; i++) {
    vdata.push(new Vector3(plotScale * points[i][0], plotScale * points[i][1], zPosition * zScale))
  }
  return vdata
}

export function findVector2MinMaxY(data: Vector2[]): [number, number] {
  let max = -1e10
  let min = 1e10
  data.forEach(function (value) {
    if (value.y > max) {
      max = value.y
    }
    if (value.y < min) {
      min = value.y
    }
  })
  return [min, max]
}

export function findVector3MaxZ(data: Vector3[]): number {
  let max = -1e10
  data.forEach(function (value) {
    if (value.z > max) {
      max = value.z
    }
  })
  return max
}

export function interoplateZ(r: number, p: number[][]): number {
  for (let i = 0; i < p.length - 1; i++) {
    if (r >= p[i][0] && r < p[i + 1][0]) {
      const slope = (p[i + 1][0] - p[i][0]) / (p[i + 1][1] - p[i][1])
      return (r - p[i][0]) / slope + p[i][1]
    }
  }
  return 0.0
}

// creates a 3d point cloud from a double array
export function create3DPts(
  pts: number[][],
  npts: number,
  scale: number,
  scaleI: number
): Vector3[] {
  const array: Vector3[] = []
  const [, , , ymax] = findMinsAndMaxs(pts)
  const inc = (2 * ymax) / (npts - 1)
  for (let x = -ymax; x <= ymax * 1.0001; x += inc) {
    for (let y = -ymax; y <= ymax * 1.0001; y += inc) {
      const r = Math.sqrt(x * x + y * y)
      if (r > ymax) {
        array.push(new Vector3(x * scale, y * scale, 0))
      } else {
        array.push(new Vector3(x * scale, y * scale, interoplateZ(r, pts) * scaleI))
      }
    }
  }
  return array
}

export function processRayData(
  vlist: Vector3D[],
  fiber_radius: number,
  sbins: number,
  multiplier = 3
): [number[][], number] {
  const minbin = -multiplier * fiber_radius
  const maxbin = multiplier * fiber_radius
  const binsize = (2 * maxbin) / (sbins - 1)
  let errors = 0

  // generate 2d map of ray data
  const indata = Array(sbins)
    .fill(0)
    .map(() => Array(sbins).fill(0))
  //let errors = 0
  vlist.forEach((P) => {
    const row = Math.round((P.x - minbin) / binsize)
    const col = Math.round((P.y - minbin) / binsize)
    if (row >= 0 && row < sbins && col >= 0 && col < sbins) {
      indata[row][col] = indata[row][col] + 1
    } else {
      errors++
    }
  })

  return [indata, errors]
}

export function processRustRayData(
  vlist: Vector3D[] | Float64Array,
  fiber_radius: number,
  sbins: number,
  multiplier = 3
): [number[][], number] {
  const minbin = -multiplier * fiber_radius
  const maxbin = multiplier * fiber_radius
  const binsize = (2 * maxbin) / (sbins - 1)
  let errors = 0

  // generate 2d map of ray data
  const indata = Array(sbins)
    .fill(0)
    .map(() => Array(sbins).fill(0))

  for (let i = 0; i < vlist.length - 3; i += 3) {
    const row = Math.round((Number(vlist[i]) - minbin) / binsize)
    const col = Math.round((Number(vlist[i + 1]) - minbin) / binsize)
    if (row >= 0 && row < sbins && col >= 0 && col < sbins) {
      indata[row][col] = indata[row][col] + 1
    } else {
      errors++
    }
  }

  return [indata, errors]
}

export function genProfile2D(x: number[], y: number[]): Vector2[] {
  const vprofileData = []
  for (let i = x.length - 1; i > 0; i--) {
    vprofileData.push(new Vector2(-x[i], y[i]))
  }
  for (let i = 0; i < x.length; i++) {
    vprofileData.push(new Vector2(x[i], y[i]))
  }
  return vprofileData
}

export function genProfile3D(x: number | number[], y: number[], z: number | number[]): Vector3[] {
  const vprofileData = []
  // use this for plots in the z-y plane offset in x
  if (typeof x === 'number' && typeof z === 'object') {
    for (let i = z.length - 1; i > 0; i--) {
      vprofileData.push(new Vector3(x, y[i], -z[i]))
    }
    for (let i = 0; i < z.length; i++) {
      vprofileData.push(new Vector3(x, y[i], z[i]))
    }
  }
  // use this for plots in the x-y plane offset in z
  if (typeof x === 'object' && typeof z === 'number') {
    for (let i = x.length - 1; i > 0; i--) {
      vprofileData.push(new Vector3(-x[i], y[i], z))
    }
    for (let i = 0; i < x.length; i++) {
      vprofileData.push(new Vector3(x[i], y[i], z))
    }
  }
  return vprofileData
}

export function saveTextToFile(dataStr: string, filename: string) {
  const a = document.createElement('a')
  a.href = window.URL.createObjectURL(new Blob([dataStr], { type: 'text/plain' }))
  a.download = filename
  a.click()
}

function getExponent(x: number) {
  return Math.floor(Math.log10(x))
}

export function chooseAxisLimits(values: number[], ntics = 5): [number, number] {
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue
  let min = 0
  let max = 0
  // special cases for data range
  if (Math.abs(maxValue) === Math.abs(minValue)) {
    min = -maxValue
    max = maxValue
    return [min, max]
  }

  const inc = range / ntics
  const exp = getExponent(inc)
  const inc2 = Math.ceil(inc / Math.pow(10, exp)) * Math.pow(10, exp)

  // find closest increment to range
  min = Math.floor(minValue / inc2) * inc2
  max = Math.ceil(maxValue / inc2) * inc2

  // TODO: Do we want this behavior?
  // check for special cases where min is zero
  const minMaxLimit = 0.00001
  if (Math.abs(minValue) < minMaxLimit && Math.abs(maxValue) < minMaxLimit) {
    // limit min/max bipolar axes
    min = -minMaxLimit
    max = minMaxLimit
  } else if (minValue >= 0 && maxValue < minMaxLimit) {
    // min value close to 0
    min = 0.0
  } else if (maxValue > -minMaxLimit && maxValue <= 0) {
    // max value close to 0
    max = 0.0
  }

  return [min, max]
}

export function formatAxisLimit(value: number, suffix: string, digits = 3): string {
  if (Math.abs(value) < 0.0000001) {
    return '0' + ' ' + suffix
  }

  const exp = getExponent(Math.abs(value))
  if (Math.abs(exp) > 3 || Math.abs(exp) < -3) {
    return value.toExponential(digits) + ' ' + suffix
  } else {
    return value.toFixed(digits) + ' ' + suffix
  }
}

export function scaleArray(arr: number[], scale: number, min: number, max: number): number[] {
  const range = max - min
  const scaled = arr.map((x) => ((x - min) / range) * scale)
  return scaled
}

export function Extents(x: number[], y: number[]): [number, number, number, number] {
  const xmin = Math.min(...x)
  const xmax = Math.max(...x)
  const ymin = Math.min(...y)
  const ymax = Math.max(...y)
  return [xmin, xmax, ymin, ymax]
}

export function xyToVector(x: number[], y: number[]): Vector2[] {
  const data: Vector2[] = []
  for (let i = 0; i < x.length; i++) {
    data.push(new Vector2(x[i], y[i]))
  }
  return data
}
