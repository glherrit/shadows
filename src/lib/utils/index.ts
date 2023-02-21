import { browser } from '$app/environment'

export { default as autoDecode } from './autoDecode'
export * from './error'

export function saveTextToFile(dataStr: string, filename: string) {
  const a = document.createElement('a')
  a.href = window.URL.createObjectURL(new Blob([dataStr], { type: 'text/plain' }))
  a.download = filename
  a.click()
}

export function roundFloat(num: number, maxDecimals = 10) {
  return parseFloat(num.toFixed(maxDecimals))
}

export function formatMMorMicronNumber(num: number, thresholdForMicro = 0.5) {
  const units = num < thresholdForMicro ? ' µm' : ''
  num = num < thresholdForMicro ? num * 1000 : num

  let precision = 1
  if (num < 1) {
    precision = 3
  } else if (num < 10) {
    precision = 2
  }
  return num.toFixed(precision) + units
}

// effective opacity is used to calculate the RGB background color on top of
// the background (default #ffffff), this is needed in the case that you actually are setting
// the background color to something other than the value of a css variable
// which i am for the light mode background. check "app.postcss"
export function getHexRGBColorFromCSSVar(
  varName: string,
  opacity = 1,
  defaultColor = '#ffffff',
  backgroundColor = '#ffffff'
) {
  if (!browser) return defaultColor
  const [bgR, bgG, bgB] = hexToRgb(backgroundColor)

  try {
    const varValue = getComputedStyle(document.documentElement).getPropertyValue(varName)
    let [r, g, b] = varValue
      .trim()
      .split(' ')
      .map((x) => parseInt(x))

    opacity = Math.min(1, Math.max(0, opacity))
    if (opacity !== 1) {
      r = Math.round(bgR * (1 - opacity) + r * opacity)
      g = Math.round(bgG * (1 - opacity) + g * opacity)
      b = Math.round(bgB * (1 - opacity) + b * opacity)
    }
    return '#' + r.toString(16) + g.toString(16) + b.toString(16)
  } catch (err) {
    console.error(`Couldn't get color from ${varName}!`, err)
    return defaultColor
  }
}

export function hexToRgb(
  hex: string,
  defaultColor: [number, number, number] = [255, 255, 255]
): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : defaultColor
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function orderByKey<T extends Record<string, any>>(
  objects: T[],
  key: string,
  caseInsensitive = true
) {
  return objects.sort(function (a: T, b: T) {
    const x = a[key]
    const y = b[key]

    const xStr = caseInsensitive && typeof x === 'string' ? x.toLowerCase() : `${x}`
    const yStr = caseInsensitive && typeof y === 'string' ? y.toLowerCase() : `${y}`

    return xStr < yStr ? -1 : xStr > yStr ? 1 : 0
  })
}

export function setTimeoutAsync(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const serializeNonPOJOs = (obj: any) => {
  return JSON.parse(JSON.stringify(obj))
}
