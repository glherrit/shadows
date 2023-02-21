import type Lens from '$lib/lens'
import { Vector3D } from '../vector'
import { Vector2 } from 'three'
import { serializeToRustStruct } from '$lib/lens'
import init, { runWASMRaytrace } from '$tracer'
import { entrancePupilHalfDiameter, type LightSource } from '../lightSource'

const defaultarray = [new Vector3D(0, 0, 0), new Vector3D(1, 1, 0)]

export async function genExtSrcData(
  lens: Lens,
  source: LightSource | undefined,
  refocus: number,
  numRays = 1_111,
  numAngles = 3,
  fiberRadius = 0.1
) {
  if (!source) return defaultarray
  if (!Number.isFinite(lens.EFL(source.wavelengths[0]))) {
    throw Error("Lens doesn't have a finite EFL")
  }

  //console.time('genExtSrcData: WASM raytrace')
  const rustStruct = serializeToRustStruct(lens, source)
  //console.log("🚀 ~ rustStruct - CA", rustStruct.clear_ap)

  const { memory } = await init()
  const rays = runWASMRaytrace(
    numRays,
    numAngles,
    fiberRadius,
    entrancePupilHalfDiameter(source),
    refocus,
    rustStruct
  )
  const pVecs = new Float64Array(memory.buffer, rays.pPtr, rays.pSize)
  //console.timeEnd('genExtSrcData: WASM raytrace')
  return pVecs
}

export function dummyVlistData() {
  const vlistdummy = [
    new Vector2(0, 25),
    new Vector2(0.6, 25),
    new Vector2(1.2, 25),
    new Vector2(1.8, 25),
    new Vector2(2.4, 0),
    new Vector2(3.0, 0),
    new Vector2(3.6, 0),
    new Vector2(4.2, 0),
    new Vector2(4.8, 25),
    new Vector2(5.4, 25),
    new Vector2(6.0, 25),
    new Vector2(6.6, 25),
    new Vector2(7.2, 0),
    new Vector2(7.8, 0),
    new Vector2(8.4, 0),
    new Vector2(9.0, 0),
    new Vector2(9.6, 25),
    new Vector2(10.2, 25),
    new Vector2(10.8, 25),
    new Vector2(11.4, 25),
    new Vector2(12, 0),
    new Vector2(12.6, 0),
    new Vector2(13.2, 0),
    new Vector2(13.8, 0),
    new Vector2(14.0, 0),
    new Vector2(15, 0),
  ]
  return vlistdummy
}

export function dummyProfileData() {
  const dummyprofile = [
    new Vector2(-15, 5.417922473162516e-48),
    new Vector2(-14.399999999999999, 4.0858550494834157e-44),
    new Vector2(-13.799999999999999, 3.0812939033520724e-40),
    new Vector2(-13.199999999999998, 2.323717313475158e-36),
    new Vector2(-12.6, 1.7524008816782463e-32),
    new Vector2(-11.999999999999998, 1.3215501009088882e-28),
    new Vector2(-11.399999999999999, 9.9662964534674e-25),
    new Vector2(-10.8, 7.515951527685581e-21),
    new Vector2(-10.2, 5.668056095889884e-17),
    new Vector2(-9.6, 4.274490034669908e-13),
    new Vector2(-8.999999999999998, 3.2235504985701148e-9),
    new Vector2(-8.399999999999999, 0.000024309955837395067),
    new Vector2(-7.8, 0.18182322068390935),
    new Vector2(-7.199999999999999, 21.766435615846422),
    new Vector2(-6.599999999999999, 22.11455071381261),
    new Vector2(-5.999999999999999, 22.114597612902518),
    new Vector2(-5.4, 22.11459761912144),
    new Vector2(-4.8, 22.114597619122264),
    new Vector2(-4.199999999999999, 22.114597619122264),
    new Vector2(-3.5999999999999996, 22.114597619122264),
    new Vector2(-2.9999999999999996, 22.114597619122264),
    new Vector2(-2.4, 22.114597619122264),
    new Vector2(-1.7999999999999998, 22.114597619122264),
    new Vector2(-1.2, 22.114597619122264),
    new Vector2(-0.6, 22.114597619122264),
    new Vector2(0, 22.114597619122264),
    new Vector2(0.6, 22.114597619122264),
    new Vector2(1.2, 22.114597619122264),
    new Vector2(1.7999999999999998, 22.114597619122264),
    new Vector2(2.4, 22.114597619122264),
    new Vector2(2.9999999999999996, 22.114597619122264),
    new Vector2(3.5999999999999996, 22.114597619122264),
    new Vector2(4.199999999999999, 22.114597619122264),
    new Vector2(4.8, 22.114597619122264),
    new Vector2(5.4, 22.11459761912144),
    new Vector2(5.999999999999999, 22.114597612902518),
    new Vector2(6.599999999999999, 22.11455071381261),
    new Vector2(7.199999999999999, 21.766435615846422),
    new Vector2(7.8, 0.18182322068390935),
    new Vector2(8.399999999999999, 0.000024309955837395067),
    new Vector2(8.999999999999998, 3.2235504985701148e-9),
    new Vector2(9.6, 4.274490034669908e-13),
    new Vector2(10.2, 5.668056095889884e-17),
    new Vector2(10.8, 7.515951527685581e-21),
    new Vector2(11.399999999999999, 9.9662964534674e-25),
    new Vector2(11.999999999999998, 1.3215501009088882e-28),
    new Vector2(12.6, 1.7524008816782463e-32),
    new Vector2(13.199999999999998, 2.323717313475158e-36),
    new Vector2(13.799999999999999, 3.0812939033520724e-40),
    new Vector2(14.399999999999999, 4.0858550494834157e-44),
    new Vector2(15, 5.417922473162516e-48),
  ]
  return dummyprofile
}
