import AsphericTerms from './asphericTerms'

describe('class AsphericTerms', () => {
  it('throws if you pass more than 4 coeffs', () => {
    expect(() => new AsphericTerms([1, 2, 3, 4, 5, 6])).toThrow(Error)
  })

  it('fills missing terms with 0 when less than 4 passed', () => {
    const short = new AsphericTerms([1, 2])
    expect(short.coeffs).toEqual([1, 2, 0, 0])

    const gaps = [1]
    gaps[3] = 4
    const at2 = new AsphericTerms(gaps)
    expect(at2.coeffs).toEqual([1, 0, 0, 4])
  })
})
