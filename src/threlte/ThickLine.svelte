<script lang="ts">
  import { T } from '@threlte/core'
  import { Vector3 } from 'three'

  export let p0: Vector3
  export let p1: Vector3
  export let radius = 0.5
  export let color = 'green'

  const length = p0.distanceTo(p1)
  const midpt = new Vector3((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2)
  const r = calcRotations(p0, p1)

  function calcRotations(p0: Vector3, p1: Vector3) {
    const v1 = new Vector3(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z)
    const v1length = v1.length()
    return new Vector3(
      Math.acos(v1.x / v1length),
      Math.acos(v1.y / v1length) + Math.PI / 2,
      Math.acos(v1.z / v1length)
    )
  }
</script>

<T.Mesh castShadow position={[midpt.x, midpt.y, midpt.z]} rotation={[r.x, r.y, r.z]}>
  <T.CylinderGeometry args={[radius, radius, length]} />
  <T.MeshStandardMaterial {color} />
</T.Mesh>
