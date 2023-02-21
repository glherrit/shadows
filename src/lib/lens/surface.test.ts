import Surface from './surface'

describe('class Surface', () => {
  test('toJSON() is expected format', () => {
    const surface = new Surface(25.4, 1 / 50, -1, [1, 2])

    expect(surface.toJSON()).toEqual({
      ap: 25.4,
      c: 0.02,
      k: -1,
      asphericTerms: {
        coefficients: [1, 2, 0, 0],
        definition: 'standard',
      },
    })
  })
})
