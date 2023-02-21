import { Vector2, Vector3, BufferGeometry, LatheGeometry, BufferAttribute } from 'three'
import { Lut } from 'three/examples/jsm/math/Lut.js'
import type Lens from './lens'

export function genSolidLens(lens: Lens, divisionsperlensseg = 31, radialdivisions = 181) {
  const pts1plus = []
  const pts2plus = []
  const stepside1 = lens.surf1.ap / 2 / (divisionsperlensseg - 1)
  const stepside2 = lens.surf2.ap / 2 / (divisionsperlensseg - 1)

  // define lens arc
  for (let i = 0; i < divisionsperlensseg; i++) {
    const r1 = i * stepside1
    const r2 = i * stepside2
    pts1plus.push(new Vector2(r1, lens.surf1.sagAt(r1)))
    pts2plus.push(new Vector2(r2, lens.surf2.sagAt(r2) + lens.ct))
  }
  // add flats - just in case - one extra point won't be missed (??)
  const lensradius = lens.diameter / 2
  pts1plus.push(new Vector2(lensradius, lens.surf1.sagAt(lens.surf1.ap / 2)))
  pts2plus.push(new Vector2(lensradius, lens.surf2.sagAt(lens.surf2.ap / 2) + lens.ct))

  /*
  const pts = pts1plus.concat(pts2plus.reverse())
  let ptstr = 'x, y\n' 
  pts.forEach(function (value) {
    ptstr += value.x.toFixed(3) + ', ' + value.y.toFixed(3) + '\n'
  })
  saveTextToFile(ptstr, 'lens.txt')
  return new LatheGeometry(pts, radialdivisions, 0, Math.PI * 2)
  */
  return new LatheGeometry(pts1plus.concat(pts2plus.reverse()), radialdivisions, 0, Math.PI * 2)
}

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

export function findMinsAndMaxArray(points: number[]): [xmin: number, xmax: number] {
  let xmax = -1e10
  let xmin = 1e10

  for (let i = 0; i < points.length; i++) {
    if (points[i] < xmin) {
      xmin = points[i]
    }
    if (points[i] > xmax) {
      xmax = points[i]
    }
  }
  return [xmin, xmax]
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

export function findVector2MinMaxY(data: Vector2[]): [number, number, number, number] {
  let xmin = 1e10
  let xmax = -1e10
  let ymin = 1e10
  let ymax = -1e10
  data.forEach(function (value) {
    if (value.y < ymin) {
      ymin = value.y
    }
    if (value.y > ymax) {
      ymax = value.y
    }
    if (value.x < xmin) {
      xmin = value.x
    }
    if (value.x > xmax) {
      xmax = value.x
    }
  })
  return [xmin, xmax, ymin, ymax]
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

export function cullVector3DData(
  data: number[][],
  xstep: number,
  vscale: number,
  totalrays: number
): [number[], number[]] {
  const xs: number[] = []
  const ys: number[] = []

  const cpt = (data[0].length - 1) / 2

  const a = data[cpt]
  const b = data.map(function (t) {
    return t[cpt]
  })
  const average = averageArrays(a, b)
  //double ppr = (double)rayct / (Math.PI * xbins * xbins);
  //console.log(xstep, cpt)
  for (let i = cpt; i >= 0; i--) {
    xs.push(xstep * (cpt - i))
    ys.push((average[i] + average[2 * cpt - i]) / 2)
  }
  // divide by total rays to get percentage of power in each bin
  ys.forEach(function (y, i) {
    ys[i] = (y * vscale) / totalrays
  })

  // how many bins in a circle of radius R if each bin is xbin wide

  return [xs, ys]
}

function averageArrays(a: number[], b: number[]) {
  return a.map(function (num, idx) {
    return (num + b[idx]) / 2
  })
}

export function scaleArrays(x: number[], y: number[], scaleA: number, scaleB: number) {
  const xout: number[] = []
  const yout: number[] = []
  const [, xmax] = findMinsAndMaxArray(x)
  for (let i = 0; i < x.length; i++) {
    xout.push(scaleA * (x[i] / xmax))
    yout.push(scaleB * y[i]) // always scale to 1
  }
  return [xout, yout]
}
