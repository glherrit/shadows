import type Lens from '$lib/lens'
import { trace3DRay } from '$lib/raytrace'
import { Vector3D } from '$lib/vector'

export function genSpots(
  lens: Lens,
  wavelength: number,
  refocus: number,
  halfCa: number,
  gridsize: number
): number[][] {
  const zeroDir = new Vector3D(0.0, 0.0, 1.0)
  const data: number[][] = []

  const inc = (2.0 * halfCa) / (gridsize - 1)
  const diag = halfCa * halfCa * 1.0001 // add a little extra to make sure and get the cardinal points
  for (let row = 0; row < gridsize; row++) {
    for (let col = 0; col < gridsize; col++) {
      const x = -halfCa + row * inc
      const y = -halfCa + col * inc
      if (diag > x * x + y * y) {
        const rayout = trace3DRay(new Vector3D(x, y, 0.0), zeroDir, lens, refocus, wavelength)
        data.push([rayout.pVector.x, rayout.pVector.y])
      }
    }
  }
  return data
}

export function findMaxRadius(
  lens: Lens,
  wavelength: number,
  refocus: number,
  halfCa: number,
  gridsize: number
): number {
  const zeroDir = new Vector3D(0.0, 0.0, 1.0)
  const inc = (2 * halfCa) / (gridsize - 1)
  const data = []
  let min = 1e20
  let max = -1e20
  for (let col = 0; col < gridsize; col++) {
    const y = -halfCa + col * inc
    const rayout = trace3DRay(new Vector3D(0, y, 0.0), zeroDir, lens, refocus, wavelength)
    data.push(rayout.pVector.y)
    if (rayout.pVector.y > max) {
      max = rayout.pVector.y
    }
    if (rayout.pVector.y < min) {
      min = rayout.pVector.y
    }
  }
  return (max - min) / 2
}
