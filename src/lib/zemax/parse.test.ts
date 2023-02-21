// tests/demo.js
import { readFileSync } from 'fs'
import path from 'path'
import autoDecode from '../utils/autoDecode'
import { parseZemax, type ZemaxDesign } from './parse'

function getZMXText(fileName: string) {
  const filePath = path.join('zmx_test_files', fileName)
  const { data } = autoDecode(readFileSync(filePath))
  return data
}

describe('translateZemax()', () => {
  let parsedFile: ZemaxDesign
  beforeAll(async () => {
    parsedFile = parseZemax(await getZMXText('fs pos men.zmx'))
  })

  it.skip('parses lens name', () => {
    expect(parsedFile.name).toBe('LE4173 - Positive Menequalcus - UV Fused Silica')
  })

  it.skip('parses wavelengths', () => {
    expect(parsedFile.wavelengths).toEqual([0.4861, 0.5876, 0.6563])
  })

  it('parses primary wavelength index', () => {
    expect(parsedFile.primaryWLIndex).toBe(1)
  })

  it('parses units', () => {
    expect(parsedFile.units).toBe('MM')
  })

  it('parses glass catalog', () => {
    // parsedFile find what is SCHOTT INFRARED MISC line mean?
    expect(parsedFile.glassCat).toBe('SCHOTT')
  })

  it('parses diameter', () => {
    expect(parsedFile.halfdiam).toBe(12.7)
  })

  it('parses entrance pupil', () => {
    expect(parsedFile.entrancePupilHalfDiam).toBe(11.43)
  })

  // TODO: discuss implementation before enabling this test
  it.skip('parses surfaces', () => {
    expect(parsedFile.surfaces[0]).toEqual({
      parms: [],
      index: 0,
      type: 'STANDARD',
      glass: '',
      curvature: 0,
      conic: 0,
      ad: 0,
      ae: 0,
      distanceZ: 100000000000000000000,
      halfdiam: 0,
      coating: '',
    })

    expect(parsedFile.surfaces[1]).toEqual({
      parms: [],
      index: 1,
      type: 'STANDARD',
      glass: 'F_SILICA',
      curvature: 0.032258064516129,
      conic: 0,
      ad: 0,
      ae: 0,
      halfdiam: 12.7,
      distanceZ: 4,
      coating: 'THORUV',
    })

    expect(parsedFile.surfaces[2]).toEqual({
      parms: [],
      index: 2,
      type: 'STANDARD',
      glass: '',
      curvature: 0.0109685203466052,
      conic: 0,
      ad: 0,
      ae: 0,
      distanceZ: 92.86611012172,
      halfdiam: 12.7,
      coating: 'THORUV',
    })

    expect(parsedFile.surfaces[3]).toEqual({
      parms: [],
      index: 3,
      type: 'STANDARD',
      glass: '',
      curvature: 0,
      conic: 0,
      ad: 0,
      ae: 0,
      distanceZ: 0,
      halfdiam: 0.2879434150349,
      coating: '',
    })
  })
})
