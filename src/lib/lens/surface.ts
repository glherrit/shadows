import AsphericTerms, { type AsphereDefinition } from './asphericTerms'
import { ensureNumber } from './utils'

export type SurfaceType = 'plane' | 'sphere' | 'asphere'

export interface SurfaceJSON {
  ap: number
  c: number
  k: number
  asphericTerms: {
    definition: AsphereDefinition
    coefficients: number[]
  }
}

export default class Surface {
  ap: number // full aperture
  #c: number // curvature
  #r: number // radius
  k: number // conic
  asphericTerms: AsphericTerms

  constructor(
    fullAperture: number | string,
    curvature: number | string = 0,
    conic: number | string = 0,
    asphericCoeffients: (number | string)[] = [],
    asphereDefinition: AsphereDefinition = 'standard'
  ) {
    this.ap = ensureNumber(fullAperture)
    this.#c = ensureNumber(curvature)
    this.#r = Surface.calcRadius(this.#c)
    this.k = ensureNumber(conic)
    this.asphericTerms = new AsphericTerms(asphericCoeffients, asphereDefinition)
  }

  get type(): SurfaceType {
    if (
      Math.abs(this.c) > 100 &&
      Math.abs(this.k) < 1e-8 &&
      this.asphericTerms.coeffs.every((c) => Math.abs(c) < 1e-20)
    ) {
      return 'plane'
    }

    if (this.asphericTerms.coeffs.every((c) => Math.abs(c) < 1e-20)) {
      return 'sphere'
    }

    return 'asphere'
  }

  get typeNumber() {
    switch (this.type) {
      case 'sphere':
        return 1
      case 'asphere':
        return 2
      default:
        return 0
    }
  }

  static calcCurvature(radius: number) {
    return this.calcRadius(radius) // re-use inverse function
  }

  static calcRadius(curvature: number) {
    return curvature === 0 ? 0 : 1 / curvature
  }

  get c() {
    return this.#c
  }

  set c(c: number) {
    this.#c = c
    this.#r = Surface.calcRadius(c)
  }

  get r() {
    return this.#r
  }

  set r(r: number) {
    this.#r = r
    this.#c = Surface.calcCurvature(r) // says calcRadius but its just the inverse so use here also
  }

  static calcSag(curvature: number, conic: number, asphericTerms: AsphericTerms, x: number, y = 0) {
    const hyp = x ** 2 + y ** 2
    const sqrtvalue = 1 - (1 + conic) * curvature ** 2 * hyp
    return sqrtvalue < 0
      ? 0
      : (curvature * hyp) / (1 + Math.sqrt(sqrtvalue)) + asphericTerms.sagAt(x, y)
  }

  sagAt(x: number, y = 0) {
    return Surface.calcSag(this.c, this.k, this.asphericTerms, x, y)
  }

  get sag() {
    return this.sagAt(this.ap / 2)
  }

  toJSON(): SurfaceJSON {
    return {
      ap: this.ap,
      c: this.c,
      k: this.k,
      asphericTerms: {
        coefficients: this.asphericTerms.coeffs,
        definition: this.asphericTerms.definition,
      },
    }
  }

  static fromJSON(surfaceInfo: SurfaceJSON) {
    return new Surface(
      surfaceInfo.ap,
      surfaceInfo.c,
      surfaceInfo.k,
      surfaceInfo.asphericTerms.coefficients,
      surfaceInfo.asphericTerms.definition
    )
  }

  // need to format the values to match the struct in rust
  toRustStruct() {
    return {
      r: this.r,
      c: this.c,
      k: this.k,
      ad: this.asphericTerms.coeffAt(0),
      ae: this.asphericTerms.coeffAt(1),
      surf_type: this.type === 'plane' ? 0 : this.type === 'sphere' ? 1 : 2,
    }
  }

  clone() {
    return new Surface(
      this.ap,
      this.c,
      this.k,
      [...this.asphericTerms.coeffs],
      this.asphericTerms.definition
    )
  }
}
