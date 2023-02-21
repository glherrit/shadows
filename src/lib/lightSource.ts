export enum LightSourceKind {
  CollimatedFlattop = 'collimatedFlattop',
  CollimatedGaussian = 'collimatedGaussian',
  // PointSource = 'point',
  ExtendedSource = 'extended',
}

interface LightSourceBase {
  kind: LightSourceKind
  wavelengths: number[]
}

export interface CollimatedFlattop extends LightSourceBase {
  kind: LightSourceKind.CollimatedFlattop
  halfDiameter: number
}

export interface CollimatedGaussian extends LightSourceBase {
  kind: LightSourceKind.CollimatedGaussian
  halfDiameter: number
  e2halfDiameter: number
}

// export interface PointSource extends LightSourceBase {
//   kind: LightSourceKind.PointSource
//   halfDiameter: number
//   NA: number
// }

export interface ExtendedSource extends LightSourceBase {
  kind: LightSourceKind.ExtendedSource
  halfDiameter: number
  NA: number
}

export type LightSource = CollimatedFlattop | CollimatedGaussian | ExtendedSource // | PointSource

export function makeCollimatedFlattop(halfDiameter: number, wavelengths: number | number[]) {
  return {
    kind: LightSourceKind.CollimatedFlattop,
    halfDiameter,
    wavelengths: Array.isArray(wavelengths) ? wavelengths : [wavelengths],
  } as CollimatedFlattop
}

export function entrancePupilHalfDiameter(source: LightSource) {
  switch (source.kind) {
    case LightSourceKind.CollimatedFlattop:
    case LightSourceKind.CollimatedGaussian:
      // case LightSourceKind.PointSource:
      return source.halfDiameter
    case LightSourceKind.ExtendedSource:
      return source.halfDiameter
  }
}
