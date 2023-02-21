import type { OpticalDesignsResponse } from '$src/pocketbase'
import Lens from './lens'
import {
  LightSourceKind,
  type CollimatedFlattop,
  type LightSource,
  type CollimatedGaussian,
  type ExtendedSource,
} from './lightSource'

export interface OpticalDesign {
  lens: Lens
  source: LightSource
  name: string
  refocus: number

  id?: string
  origin?: string
  createdAt?: Date
  updatedAt?: Date
}

export function parseOpticalDesignRecord(record: OpticalDesignsResponse): OpticalDesign {
  const si = record.source_info

  const sharedSourceParams = {
    kind: si.kind,
    wavelengths: si.wavelengths.map((w: string | number) =>
      typeof w === 'string' ? parseFloat(w) : w
    ),
  }

  let source: LightSource

  switch (si.kind) {
    case LightSourceKind.CollimatedFlattop:
      source = {
        ...sharedSourceParams,
        halfDiameter: si['halfDiameter'],
      } as CollimatedFlattop
      break

    case LightSourceKind.CollimatedGaussian:
      source = {
        ...sharedSourceParams,
        halfDiameter: si['halfDiameter'],
        e2halfDiameter: si['e2halfDiameter'],
      } as CollimatedGaussian
      break

    // case LightSourceKind.PointSource:
    //   source = {
    //     ...sharedSourceParams,
    //     halfDiameter: si['halfDiameter'],
    //     NA: si['NA'],
    //   } as PointSource
    //   break

    case LightSourceKind.ExtendedSource:
      source = {
        ...sharedSourceParams,
        halfDiameter: si['halfDiameter'],
        NA: si['NA'],
      } as ExtendedSource
      break

    default:
      throw new Error(`Unknown source kind: ${si.kind}`)
  }

  return {
    id: record.id,
    name: record.name,
    origin: record.origin,

    lens: Lens.fromJSON(record.optic_info),
    source,
    refocus: record.refocus || 0,

    createdAt: new Date(record.created),
    updatedAt: new Date(record.updated),
  }
}
