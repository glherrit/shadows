<script lang="ts">
  import { T } from '@threlte/core'
  import { Vector3 } from 'three'

  export let points: Vector3[]
  export let radius = 0.5
  export let color = 'green'

  interface LineSeg {
    v: Vector3
    r: Vector3
    seglen: number
  }

  $: points

  function createLineSegs(points: Vector3[]) {
    const segs: LineSeg[] = []
    let seglen = 1
    for (let i = 1; i < points.length; i++) {
      seglen = points[i - 1].distanceTo(points[i])
      const midpt = new Vector3(
        (points[i - 1].x + points[i].x) / 2,
        (points[i - 1].y + points[i].y) / 2,
        (points[i - 1].z + points[i].z) / 2
      )
      const r = calcRotations(points[i - 1], points[i])
      segs.push({ v: midpt, r, seglen })
    }
    return segs
  }

  function calcRotations(p0: Vector3, p1: Vector3) {
    const v1 = new Vector3(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z)
    const v1length = v1.length()
    return new Vector3(
      Math.acos(v1.x / v1length),
      Math.acos(v1.y / v1length) + Math.PI / 2,
      Math.acos(v1.z / v1length)
    )
  }

  $: ps = createLineSegs(points)
</script>

{#each ps as p, i}
  <T.Mesh castShadow position={[p.v.x, p.v.y, p.v.z]} rotation={[p.r.x, p.r.y, p.r.z]}>
    <T.CylinderGeometry args={[radius, radius, p.seglen]} />
    <T.MeshStandardMaterial {color} />
  </T.Mesh>
{/each}
