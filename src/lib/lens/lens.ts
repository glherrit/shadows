import type { ZemaxDesign } from '../zemax'
import { radialRMSError, raidalWFE } from '../erroranalysis'
import { entrancePupilHalfDiameter, type LightSource } from '../lightSource'
import Material from './material'
import Surface, { type SurfaceJSON } from './surface'
import { ensureNumber } from './utils'

export const raySet1 = [0.0, 0.15, 0.3, 0.45, 0.6, 0.7, 0.8, 0.875, 0.925, 0.975, 1.0]
//let raySet2 = [ 0.0, 0.087, 0.170, 0.249, 0.324, 0.395, 0.463, 0.527, 0.586, 0.642, 0.695, 0.743, 0.787, 0.828, 0.865, 0.897, 0.926, 0.952, 0.973, 0.990, 1.0 ]
//let raySet3 = [ 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0 ]
//let raySet4 = [ 0.0, 0.2, 0.4, 0.6, 0.8, 1.0 ]

export interface LensJSON {
  type: 'lens'
  diameter: number
  ct: number
  material: string
  surf1: SurfaceJSON
  surf2: SurfaceJSON
}

export default class Lens {
  #diameter: number
  material: Material
  ct: number
  surf1: Surface
  surf2: Surface

  constructor(
    diameter: number | string,
    ct: number | string,
    material: Material,
    surf1: Surface,
    surf2: Surface
  ) {
    this.material = material
    this.surf1 = surf1
    this.surf2 = surf2
    this.ct = ensureNumber(ct)

    this.#diameter = -1 // set temporarily explictly because we have to, but handle seeting in the setter
    this.diameter = diameter
  }

  static new() {
    return new Lens(25.4, 5, Material.FusedSilica, new Surface(25.4), new Surface(25.4))
  }

  static fromZemaxDesign(design: ZemaxDesign) {
    if (!design.surfaces[1].glass) throw Error('Surface[1] must have a glass')
    return new Lens(
      design.halfdiam * 2,
      design.surfaces[1].distanceZ,
      Material.fromZemaxGlass(design.surfaces[1].glass),
      new Surface(
        design.surfaces[1].halfdiam * 2,
        design.surfaces[1].curvature,
        design.surfaces[1].conic,
        [design.surfaces[1].ad, design.surfaces[1].ae]
      ),
      new Surface(
        design.surfaces[2].halfdiam * 2,
        design.surfaces[2].curvature,
        design.surfaces[2].conic,
        [design.surfaces[2].ad, design.surfaces[2].ae]
      )
    )
  }

  get diameter(): number {
    return this.#diameter
  }

  public set diameter(v: string | number) {
    const oldDiameter = this.#diameter
    this.#diameter = ensureNumber(v)

    // set surface apertures to match new diameter unless they were something else
    this.surf1.ap =
      this.surf1.ap === oldDiameter ? this.#diameter : Math.min(this.surf1.ap, this.#diameter)

    this.surf2.ap =
      this.surf2.ap === oldDiameter ? this.#diameter : Math.min(this.surf2.ap, this.#diameter)
  }

  get et(): number {
    return this.ct - this.surf1.sag + this.surf2.sag
  }

  set et(val: number | string) {
    val = ensureNumber(val)
    this.ct = val + this.surf1.sag - this.surf2.sag
  }

  rmserr(refocus: number, source: LightSource): number {
    const { rms } = radialRMSError(
      this,
      refocus,
      entrancePupilHalfDiameter(source),

      raySet1,
      source.wavelengths[0]
    )
    return rms
  }

  wfeerr(refocus: number, source: LightSource, numSamples = 21): number {
    return raidalWFE(
      this,
      refocus,
      entrancePupilHalfDiameter(source),
      numSamples,
      source.wavelengths[0]
    )
  }

  get flat1(): number {
    return (this.diameter - this.surf1.ap) / 2
  }

  get flat2(): number {
    return (this.diameter - this.surf2.ap) / 2
  }

  static calcEFL(
    s1c: number | string,
    s2c: number | string,
    ct: number | string,
    material: Material,
    wavelength: number | string
  ) {
    s1c = ensureNumber(s1c)
    s2c = ensureNumber(s2c)
    ct = ensureNumber(ct)
    wavelength = ensureNumber(wavelength)

    const nIndex = material.nIndexAt(wavelength)
    const phi = (nIndex - 1) * (s1c - s2c + ((nIndex - 1) * ct * s1c * s2c) / nIndex)
    return 1 / phi
  }

  EFL(wavelength: number | string): number {
    return Lens.calcEFL(this.surf1.c, this.surf2.c, this.ct, this.material, wavelength)
  }

  static calcBFL(
    s1c: number | string,
    s2c: number | string,
    ct: number | string,
    material: Material,
    wavelength: number | string
  ) {
    s1c = ensureNumber(s1c)
    s2c = ensureNumber(s2c)
    ct = ensureNumber(ct)
    wavelength = ensureNumber(wavelength)

    const nIndex = material.nIndexAt(wavelength)
    const efl = Lens.calcEFL(s1c, s2c, ct, material, wavelength)
    const pp = (nIndex - 1) * s1c * efl * (1 / nIndex) * ct
    return efl - pp
  }

  BFL(wavelength: number | string): number {
    return Lens.calcBFL(this.surf1.c, this.surf2.c, this.ct, this.material, wavelength)
  }

  toJSON(): LensJSON {
    return {
      type: 'lens',
      diameter: this.diameter,
      ct: this.ct,
      material: this.material.toString(),
      surf1: this.surf1.toJSON(),
      surf2: this.surf2.toJSON(),
    }
  }

  static fromJSON(designInfo: LensJSON | string) {
    const design = typeof designInfo === 'string' ? JSON.parse(designInfo) : designInfo

    return new Lens(
      parseFloat(design.diameter),
      parseFloat(design.ct),
      Material.fromString(design.material),
      Surface.fromJSON(design.surf1),
      Surface.fromJSON(design.surf2)
    )
  }

  clone() {
    return new Lens(this.diameter, this.ct, this.material, this.surf1.clone(), this.surf2.clone())
  }
}

export const dummyLens = new Lens(
  25,
  6,
  Material.FusedSilica,
  new Surface(25, 1 / 22.4830, 0),
  new Surface(25, 0)
)

export function serializeToRustStruct(lens: Lens, source: LightSource) {
  return {
    diameter: lens.diameter,
    // TODO: figure out best meaning for clear_ap here
    clear_ap: Math.min(lens.surf1.ap, lens.surf2.ap),
    ct: lens.ct,
    n_index: lens.material.nIndexAt(source.wavelengths[0]),
    side1: lens.surf1.toRustStruct(),
    side2: lens.surf2.toRustStruct(),
  }
}
