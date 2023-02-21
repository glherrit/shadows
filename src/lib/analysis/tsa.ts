import type Lens from '$lib/lens'
import { trace3DRay } from '$lib/raytrace'
import { Vector3D } from '$lib/vector'
import { entrancePupilHalfDiameter, type LightSource } from '../lightSource'

// use this dummy array if something is wrong with source or lens
const defaultarray = [
  [-10, -10],
  [-5, 5],
  [0, 0],
  [5, -5],
  [10, 10],
]

export function genTSAData(
  lens: Lens,
  source: LightSource | undefined,
  refocus: number,
  gridSize = 31
): number[][] {
  if (!source) return defaultarray
  if (!Number.isFinite(lens.EFL(source.wavelengths[0]))) {
    throw Error("Lens doesn't have a finite EFL")
  }
  const zeroDir = new Vector3D(0.0, 0.0, 1.0)
  const inc = entrancePupilHalfDiameter(source) / (gridSize - 1)
  const data: number[][] = []

  for (let row = 0; row < gridSize; row++) {
    const y = row * inc
    const rayout = trace3DRay(
      new Vector3D(0.0, y, 0.0),
      zeroDir,
      lens,
      refocus,
      source.wavelengths[0]
    )
    data.push([y, rayout.pVector.y])
    if (row !== 0) {
      data.push([-y, -rayout.pVector.y]) // need to invert both x and y
    }
  }
  data.sort((a, b) => a[0] - b[0])

  return data
}
