import { LineSegments } from 'three'
import { MeshBasicMaterial } from 'three'
import { Float32BufferAttribute } from 'three'
import { BufferGeometry } from 'three'

class RectGridHelper extends LineSegments {
  constructor(
    xwidth: number,
    xstep: number,
    zheight: number,
    zstep: number,
    XorY: string,
    color1 = 0x444444
  ) {
    const xstart = -xwidth / 2
    const zstart = -zheight / 2

    const vertices = []
    if (XorY === 'X') {
      for (let z = 0; z <= zheight; z += zstep) {
        vertices.push(-xstart, 0, zstart + z)
        vertices.push(xstart, 0, zstart + z)
      }

      for (let x = 0; x <= xwidth; x += xstep) {
        vertices.push(xstart + x, 0, -zstart)
        vertices.push(xstart + x, 0, zstart)
      }
    } else {
      for (let z = 0; z <= zheight; z += zstep) {
        vertices.push(0, -xstart, zstart + z)
        vertices.push(0, xstart, zstart + z)
      }

      for (let x = 0; x <= xwidth; x += xstep) {
        vertices.push(0, xstart + x, -zstart)
        vertices.push(0, xstart + x, zstart)
      }
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))

    const material = new MeshBasicMaterial({ color: color1 })

    super(geometry, material)

    this.type = 'GridHelper'
  }
}

export { RectGridHelper }
