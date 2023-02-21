interface ZemaxSurface {
  curvature: number
  conic: number
  parms: string[]
  ad: number
  ae: number
  distanceZ: number
  halfdiam: number

  // no guarantees we actually parse these, better than giving them default values of empty strings
  index?: number
  type?: string
  glass?: string
  coating?: string
}

export interface ZemaxDesign {
  name: string
  units: string
  entrancePupilHalfDiam: number
  glassCat: string
  halfdiam: number
  wavelengths: number[]
  primaryWLIndex: number
  surfaces: ZemaxSurface[]
}

// caveats-assumptions: the lens is defined in surf 1 and 2.
// no provisions have been made to trap and convert special aspheres or doublets

export function parseZemax(textin: string) {
  const lines = textin.split('\n')

  const zlens: Partial<ZemaxDesign> = {}
  zlens.wavelengths = []
  zlens.surfaces = []

  let surfaceRelatedLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    const lparams = line.split(' ')

    switch (lparams[0]) {
      case 'NAME':
        zlens.name = line.split(' ', 2)[1]
        break

      case 'UNIT':
        zlens.units = lparams[1]
        break

      case 'ENPD':
        zlens.entrancePupilHalfDiam = parseFloat(lparams[1]) / 2
        break

      case 'GCAT':
        zlens.glassCat = line.split(' ', 2)[1]
        break

      case 'WAVM':
        zlens.wavelengths.push(parseFloat(lparams[2]))
        break

      case 'PWAV':
        zlens.primaryWLIndex = parseInt(lparams[1]) - 1
        break

      case 'SURF':
        if (surfaceRelatedLines.length > 0) {
          zlens.surfaces.push(parseSurfaceLines(surfaceRelatedLines))
          surfaceRelatedLines = []
        }
        surfaceRelatedLines.push(line)
        break

      default:
        if (surfaceRelatedLines.length > 0 && line.startsWith('  ')) {
          surfaceRelatedLines.push(line.trimStart())
        } else {
          console.debug(`Skipped command: "${lparams[0]}"`)
        }
        break
    }
  }

  if (zlens.wavelengths.length === 0) {
    throw new Error('Could not convert file to lens prescription! - WL List == 0')
  }

  console.debug('Wavelengths: ' + zlens.wavelengths)
  console.debug('Primary WL index: ' + zlens.primaryWLIndex)

  zlens.halfdiam = Math.max(zlens.surfaces[1].halfdiam, zlens.surfaces[2].halfdiam)

  // we are guaranteeing we added enough things at this point to make it a full ZemaxDesign
  return zlens as ZemaxDesign
}

function parseSurfaceLines(surfaceLines: string[]) {
  const zsurf: ZemaxSurface = {
    parms: [],
    curvature: 0,
    conic: 0,
    ad: 0,
    ae: 0,
    distanceZ: 0,
    halfdiam: 0,
  }

  for (let i = 0; i < surfaceLines.length; i++) {
    const lparams = surfaceLines[i].split(' ')

    switch (lparams[0]) {
      case 'SURF':
        zsurf.index = parseInt(lparams[1])
        break

      case 'TYPE':
        zsurf.type = lparams[1]
        break

      case 'CURV':
        zsurf.curvature = parseFloat(lparams[1])
        break

      case 'CONI':
        zsurf.conic = parseFloat(lparams[1])
        break

      case 'PARM':
        zsurf.parms.push(lparams[2]) // push these as strings for now
        break

      case 'DISZ':
        zsurf.distanceZ = lparams[1] === 'INFINITY' ? Infinity : parseFloat(lparams[1])
        break

      case 'GLAS':
        zsurf.glass = lparams[1]
        break

      case 'DIAM':
        zsurf.halfdiam = parseFloat(lparams[1])
        break

      case 'COAT':
        zsurf.coating = lparams[1]
        break

      default:
        console.debug(`Surface skipped command: "${lparams[0]}"`)
        break
    }
  }

  // error check surfaces for type and aspheric order
  // this could be turned into a loop to check all surfaces
  // in the future - maybe sooner??
  // check surface type
  switch (zsurf.type) {
    case 'STANDARD':
      break

    case 'EVENASPH':
      // check that asphere only uses AD and AE
      if (zsurf.parms.length > 0) {
        if (
          zsurf.parms[0] !== '0' ||
          zsurf.parms.at(3) !== '0' ||
          zsurf.parms.at(4) !== '0' ||
          zsurf.parms.at(5) !== '0' ||
          zsurf.parms.at(6) !== '0' ||
          zsurf.parms.at(7) !== '0'
        ) {
          throw new Error(`Surface ${zsurf.index} Asphere order not support!`)
        } else {
          zsurf.ad = parseFloat(zsurf.parms.at(1) || '0')
          zsurf.ae = parseFloat(zsurf.parms.at(2) || '0')
        }
      }
      break

    default:
      throw new Error(`Surface ${zsurf.index} Type not recognized: ${zsurf.type}`)
  }

  return zsurf
}
