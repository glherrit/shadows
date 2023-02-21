import type Lens from '../lens'
import { Vector3D } from '../vector'
import { calcWfeVecs } from '../erroranalysis'
import { entrancePupilHalfDiameter, type LightSource } from '../lightSource'

const defaultarray = [
  [0.0, 0.0336],
  [0.0011, 0.0338],
  [0.0021, 0.0343],
  [0.0032, 0.0344],
  [0.0043, 0.0333],
  [0.0053, 0.0306],
  [0.0064, 0.0261],
  [0.0075, 0.0204],
  [0.0085, 0.0148],
  [0.0096, 0.0103],
  [0.0107, 0.0075],
  [0.0117, 0.006],
  [0.0128, 0.0053],
  [0.0139, 0.0047],
  [0.0149, 0.004],
  [0.016, 0.0032],
  [0.0171, 0.0026],
  [0.0181, 0.0025],
  [0.0192, 0.0028],
  [0.0203, 0.0032],
  [0.0213, 0.0034],
  [0.0224, 0.0033],
  [0.0234, 0.0028],
  [0.0245, 0.0023],
  [0.0256, 0.0021],
  [0.0266, 0.0022],
]

export async function genWFEData(
  lens: Lens,
  source: LightSource | undefined,
  refocus: number,
  gridSize = 61
) {
  if (!source) return defaultarray
  if (!Number.isFinite(lens.EFL(source.wavelengths[0]))) {
    throw Error("Lens doesn't have a finite EFL")
  }
  const data: number[][] = []
  const halfCa = entrancePupilHalfDiameter(source)
  const zeroDir = new Vector3D(0.0, 0.0, 1.0)
  const stepsize = halfCa / (gridSize - 1)
  for (let i = 0; i < gridSize; i++) {
    const y = i * stepsize
    const wfe = calcWfeVecs(
      new Vector3D(0.0, y, 0.0),
      zeroDir,
      lens,
      refocus,
      source.wavelengths[0]
    )
    data.push([-y, wfe])
    data.push([y, wfe])
  }

  data.sort((a, b) => a[0] - b[0])

  return data
}
