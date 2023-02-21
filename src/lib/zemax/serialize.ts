import { Material, type Surface } from '$lib/lens'
import type Lens from '$lib/lens'
import type { OpticalDesign } from '$lib/opticaldesign'
import { entrancePupilHalfDiameter, type LightSource } from '../lightSource'

export function serializeDesignToZemax(design: OpticalDesign): string {
  return serializeToZemax(design.lens, design.source)
}

export function serializeToZemax(lens: Lens, source: LightSource): string {
  const wlen = source.wavelengths[0]
  return `MODE SEQ
UNIT MM X W X CM MR CPMM
ENPD ${entrancePupilHalfDiameter(source) * 2}
ENVD 20 1 0
GFAC 0 0
GCAT SCHOTT MISC INFRARED
RAIM 0 0 1 1 0 0 0 0 0 1
FTYP 0 0 1 1 0 0 0 1
WAVM 1 ${wlen} 1
PWAV 1
POLS 1 0 1 0 0 1 0
GLRS 1 0
GSTD 0 100.000 100.000 100.000 100.000 100.000 100.000 0 1 1 0 0 1 1 1 1 1 1
NSCD 100 500 0 0.001 10 9.9999999999999995e-07 0 0 0 0 0 0 1000000 0 2
COFN QF "COATING.DAT" "SCATTER_PROFILE.DAT" "ABG_DATA.DAT" "PROFILE.GRD"
COFN COATING.DAT SCATTER_PROFILE.DAT ABG_DATA.DAT PROFILE.GRD
LUID 4
SURF 0
  TYPE STANDARD
  CURV 0.0
  DISZ INFINITY
SURF 1
${formZemaxSurfString(lens.surf1, lens.ct, true, lens.material.toString())}
SURF 2
${formZemaxSurfString(lens.surf2, 0.0)}
SURF 3
  TYPE STANDARD
  CURV 0.0
  SLAB 4
  DISZ ${lens.BFL(wlen)}
  MAZH 0 0
SURF 4
  TYPE STANDARD
  CURV 0.0
  DISZ 0`
}

function formZemaxSurfString(
  surface: Surface,
  nextthickness: number,
  isstop?: boolean,
  surfmaterial?: string
): string {
  const lines = []

  if (isstop === true) {
    lines.push(`STOP`)
  }

  lines.push(`CURV ${surface.c}`)

  if (Math.abs(surface.k) > 1e-5) {
    lines.push(`CONI ${surface.k}`)
  }

  if (surface.type === 'asphere') {
    lines.push(`XDAT 1 5.0`)
    lines.push(`XDAT 2 1.0`)
    lines.push(`XDAT 3 0.0`)
    lines.push(`XDAT 4 ${surface.asphericTerms.coeffs[0]}`)
    lines.push(`XDAT 5 ${surface.asphericTerms.coeffs[1]}`)
    lines.push(`XDAT 6 ${surface.asphericTerms.coeffs[2]}`)
    lines.push(`XDAT 7 ${surface.asphericTerms.coeffs[3]}`)
    lines.push(`TYPE XASPHERE`)
  } else {
    lines.push(`TYPE STANDARD`)
  }

  lines.push(`DIAM ${surface.ap / 2} 1 0 0`)
  lines.push(`MEMA ${surface.ap / 2} 1 0 0`)
  lines.push(`DISZ ${nextthickness}`)

  if (surfmaterial) {
    lines.push(`GLAS ${Material.toZemaxGlassString(surfmaterial)}`)
  }

  const indent = '  '
  return indent + lines.join(`\n${indent}`)
}
