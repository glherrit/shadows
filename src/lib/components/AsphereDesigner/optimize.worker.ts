import Lens from '$lib/lens'
import { optimizeLens, type OptimizationSettings } from '$lib/optimize'

type MessagePayload = [string, number, number, number[], OptimizationSettings]

if (globalThis) {
  globalThis.onmessage = ({ data }: { data: MessagePayload }) => {
    if (!Array.isArray(data) || data.length !== 5) {
      console.warn(`Invalid message data sent to optimze.ts :>> `, data)
      return
    }

    const [lensJson, wavelength, refocus, raySet, settings] = data

    try {
      const lens = Lens.fromJSON(lensJson)
      const start = new Date().getTime()
      optimizeLens(lens, wavelength, refocus, settings, raySet)
      const elapsed = new Date().getTime() - start

      console.debug(`optimized in ${elapsed} :>> `, lens)
      globalThis.postMessage({ lens: JSON.stringify(lens.toJSON()) })
    } catch (error) {
      globalThis.postMessage({ error: `${error}` })
    }
  }
}

export function makeWorkerMessage(
  lens: Lens,
  wavelength: number,
  refocus: number,
  raySet: number[],
  settings: OptimizationSettings
): MessagePayload {
  return [JSON.stringify(lens.toJSON()), wavelength, refocus, raySet, settings]
}
