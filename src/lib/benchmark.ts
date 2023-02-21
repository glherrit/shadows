import now from 'performance-now'

const UI_CATCHUP_DELAY = 200

function avg(arr: number[]) {
  console.debug(`runs :>> `, arr)
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function timeFn(fn: () => void): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = now()
      fn()
      resolve((now() - start) / 1000)
    }, UI_CATCHUP_DELAY)
  })
}

export default async function benchmark(fn: () => void, runCount = 1) {
  const runTimes = []
  for (let i = 0; i < runCount; i++) {
    const t = await timeFn(fn)
    console.debug(`Run ${i + 1} took ${t} seconds`)
    runTimes.push(t)
  }
  return `${avg(runTimes).toFixed(3)} s` + (runCount > 1 ? ` (avg over ${runCount} runs)` : '')
}
