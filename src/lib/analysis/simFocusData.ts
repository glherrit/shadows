import type Lens from '$lib/lens'
import { serializeToRustStruct } from '$lib/lens'
import init, { genPSFLine, genGaussLine, runWASMRaytrace, PSFResult, TraceResults } from '$tracer'
import { cullVector3DData } from '../ThreeGutils'
import { fittofermiDirac } from '../fermi'
import { processRustRayData } from '../gUtils'
import { entrancePupilHalfDiameter, LightSourceKind, type LightSource } from '../lightSource'

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

export async function simFocusData(
  lens: Lens,
  source: LightSource,
  refocus: number,
  pupilWidth = 101,
  outerGrid = 1024
) {
  if (!source) return defaultarray
  if (!Number.isFinite(lens.EFL(source.wavelengths[0]))) {
    throw Error("Lens doesn't have a finite EFL")
  }

  //console.log('simFocusData', source.kind)

  const { memory } = await init()

  switch (source.kind) {
    case LightSourceKind.CollimatedFlattop: {
      const psfresult: PSFResult = genPSFLine(
        pupilWidth,
        outerGrid,
        source.wavelengths[0],
        entrancePupilHalfDiameter(source),
        refocus,
        serializeToRustStruct(lens, source)
      )
      if (psfresult === undefined) return defaultarray
      return rustPSFToData(
        new Float64Array(memory.buffer, psfresult.dataPtr, psfresult.dataSize),
        lens,
        source,
        outerGrid
      )
      break
    }

    case LightSourceKind.CollimatedGaussian: {
      const psfresult: PSFResult = genGaussLine(
        pupilWidth,
        outerGrid,
        source.wavelengths[0],
        entrancePupilHalfDiameter(source),
        source.e2halfDiameter,
        refocus,
        serializeToRustStruct(lens, source)
      )
      if (psfresult === undefined) return defaultarray
      return rustPSFToData(
        new Float64Array(memory.buffer, psfresult.dataPtr, psfresult.dataSize),
        lens,
        source,
        outerGrid
      )
      break
    }

    case LightSourceKind.ExtendedSource: {
      const imagesize = lens.EFL(source.wavelengths[0]) * source.NA
      const sbins = 101
      const numPositions = 50_000
      const numAngles = 5
      const multiplier = 3
      const rays: TraceResults = runWASMRaytrace(
        numPositions,
        numAngles,
        imagesize,
        entrancePupilHalfDiameter(source),
        refocus,
        serializeToRustStruct(lens, source)
      )
      if (rays === undefined) return defaultarray
      return rustExtSrcToData(
        new Float64Array(memory.buffer, rays.pPtr, rays.pSize),
        imagesize,
        numPositions,
        numAngles,
        sbins,
        multiplier
      )
      break
    }

    default: {
      console.log('simFocusData: unknow source type')
      return defaultarray
      break
    }
  }
}

// *****************************************************************
// condense the psf float64array from rust function to data[][] array
function rustExtSrcToData(
  peVecs: Float64Array,
  imagesize: number,
  numPositions: number,
  numAngles: number,
  sbins: number,
  multiplier: number
) {
  const cellSize = (imagesize * multiplier * 2) / (sbins - 1)
  //const vscale2 = (Math.PI * imagesize * imagesize) / (cellSize * cellSize) - (Math.PI * imagesize) / Math.sqrt(2 * cellSize * cellSize)
  const vscale: number =
    ((Math.PI * (sbins - 1)) / (multiplier * 2)) *
    ((sbins - 1) / (multiplier * 2) - 1 / Math.sqrt(2))
  //console.log ('cell, vscale', cellSize, vscale, vscale2)

  const [datamap, errors] = processRustRayData(peVecs, imagesize, sbins, multiplier)
  console.log('extended errors', errors)

  const [xs, ys] = cullVector3DData(datamap, cellSize, vscale, numPositions * numAngles)

  const yfermi = fittofermiDirac(xs, ys)

  const data: number[][] = []
  for (let i = 0; i < xs.length; i++) {
    data.push([xs[i], yfermi[i]])
    if (i !== 0) data.push([-xs[i], yfermi[i]])
  }
  data.sort((a, b) => a[0] - b[0])
  return data
}

// *****************************************************************
// condense the psf float64array from rust function to data[][] array
function rustPSFToData(ypts: Float64Array, lens: Lens, source: LightSource, outerGrid: number) {
  const pixelscale =
    ((source.wavelengths[0] / 1000.0) * lens.EFL(source.wavelengths[0])) /
    (entrancePupilHalfDiameter(source) * 2) /
    (outerGrid / ypts.length)

  const xends = (-pixelscale * (ypts.length - 1)) / 2
  const xpts: number[] = []

  for (let i = 0; i < ypts.length; i++) {
    xpts.push(xends + pixelscale * i)
  }

  return xpts.map((el, index) => [el, ypts[index]])
}
