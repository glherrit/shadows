import type Lens from '$lib/lens'
import { trace3DRay } from '$lib/raytrace'
import { Vector3D } from '$lib/vector'

export function genLSAData(
  lens: Lens,
  wavelength: number,
  refocus: number,
  halfCa: number,
  gridSize: number
): number[][] {
  const zeroDir = new Vector3D(0.0, 0.0, 1.0)
  const inc = halfCa / (gridSize - 1)

  const data: number[][] = []

  for (let row = 0; row < gridSize; row++) {
    const y = row * inc
    const rayout = trace3DRay(new Vector3D(0.0, y, 0.0), zeroDir, lens, refocus, wavelength)
    data.push([y, rayout.pVector.y])
  }
  return data
}
