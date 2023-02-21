<script lang="ts">
  import type Lens from '$lib/lens'
  import { trace3DRayPath } from '$lib/raytrace'
  import { Vector3D } from '$lib/vector'
  import { entrancePupilHalfDiameter, type LightSource } from '$src/lib/lightSource'
  import { saveTextToFile } from '$src/lib/utils'

  export let lens: Lens
  export let source: LightSource
  export let outerWidth: number
  export let outerHeight: number

  interface ActionParams {
    lens: Lens
    source: LightSource
    outerWidth: number
    outerHeight: number
  }

  function svgText(
    value: string,
    x: number,
    y: number,
    fontsize: string,
    fontweight = 'normal',
    horiztextanchor = 'start'
  ): SVGTextElement {
    const side1 = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    side1.setAttribute('x', x.toFixed(0))
    side1.setAttribute('y', y.toFixed(0))
    side1.setAttribute('font-size', fontsize)
    side1.setAttribute('font-family', 'Arial')
    side1.setAttribute('font-weight', fontweight)
    side1.setAttribute('font-color', 'black')
    side1.setAttribute('text-anchor', horiztextanchor)
    side1.innerHTML = value
    return side1
  }

  function calculateOptimumScale(
    lens: Lens,
    source: LightSource,
    xrtwidth: number,
    yrtheight: number
  ): number {
    const localBFL = lens.BFL(source.wavelengths[0])
    let scalex = 1
    if (localBFL > 0.0) {
      scalex = xrtwidth / (10 + lens.ct + localBFL)
    } else {
      scalex = xrtwidth / (lens.ct - localBFL)
    }
    const scaley = yrtheight / lens.diameter
    //console.log(scalex, scaley)
    return (scalex < scaley ? scalex : scaley) * 1
  }

  function pointsToPath(pts: Point<number>[], filled: boolean): string {
    let path = `M ${pts[0].x.toFixed(0)} ${pts[0].y.toFixed(0)} L`
    for (let i = 1; i < pts.length; i++) {
      path += ` ${pts[i].x.toFixed(0)} ${pts[i].y.toFixed(0)}`
    }
    if (filled) {
      path += ' Z'
    }
    return path
  }

  function svgLensPath(
    lens: Lens,
    source: LightSource,
    npts: number,
    xc: number,
    yc: number,
    xrtwidth: number,
    yrtheight: number,
    fillcolor: string
  ): SVGPathElement {
    const newElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    let pts = traceLensShapeFull(lens, source, npts, xc, yc, xrtwidth, yrtheight)
    //console.log(pts)
    let path = pointsToPath(pts, true)
    //console.log(pts)

    newElement.setAttribute('d', path)

    newElement.style.stroke = '#000'
    newElement.style.strokeWidth = '1px'
    newElement.style.fill = fillcolor
    return newElement
  }

  function svgRayPaths(
    pts: Point<number>[],
    linecolor: string,
    linewidth = 1,
    dashline = false
  ): SVGPathElement {
    const newElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    let path = `M ${pts[0].x.toFixed(0)} ${pts[0].y.toFixed(0)}`
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${pts[i].x.toFixed(0)} ${pts[i].y.toFixed(0)}`
    }
    newElement.setAttribute('d', path)

    newElement.style.fill = 'none'
    newElement.style.stroke = linecolor
    newElement.style.strokeWidth = linewidth.toFixed(0) + 'px'
    if (dashline) {
      newElement.style.strokeDasharray = '5'
    }
    return newElement
  }

  function svgVertLine(pt: Point<number>, nlen: number): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    let x1 = pt.x.toFixed(0)
    let y1 = (parseInt(pt.y.toFixed(0)) - 2).toString()
    let x2 = pt.x.toFixed(0)
    let y2 = (parseInt(pt.y.toFixed(0)) + nlen - 2).toString()

    line.setAttribute('x1', x1)
    line.setAttribute('y1', y1)
    line.setAttribute('x2', x2)
    line.setAttribute('y2', y2)
    line.setAttribute('stroke', 'black')
    line.setAttribute('stroke-width', '1')
    line.setAttribute('stroke-dasharray', '3')

    return line
  }

  function svgArrowPath(
    xc: number,
    yc: number,
    size = 10,
    fillcolor = 'black',
    rotation = '0'
  ): SVGPathElement {
    const newElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    let aspectratio = 0.8
    let x1 = (-size).toFixed(0)
    let y1 = ((-size / 2) * aspectratio).toFixed(0)
    let x2 = '0'
    let y2 = (size * aspectratio).toFixed(0)

    let path = `m ${xc} ${yc} l ${x1} ${y1} ${x2} ${y2}` // ' l -8 3 0 -6 z'

    newElement.setAttribute('d', path)
    newElement.setAttribute('transform', `rotate(${rotation}, ${xc.toFixed(0)}, ${yc.toFixed(0)})`)
    newElement.style.stroke = fillcolor
    newElement.style.strokeWidth = '1px'
    newElement.style.fill = fillcolor
    return newElement
  }

  function convertVectorToPts(
    vectors: Vector3D[],
    yscale: number,
    yoffset: number,
    zscale: number,
    zoffset: number,
    yrtcenter: number
  ): Point<number>[] {
    let pts: Point<number>[] = []
    for (let i = 0; i < vectors.length; i++) {
      let x = vectors[i].z * zscale + zoffset // xrtleft + lensbegin
      let y = yrtcenter - vectors[i].y * yscale + yoffset
      pts.push({ x, y })
    }
    return pts
  }

  function traceLensShapeFull(
    lens: Lens,
    source: LightSource,
    npts: number,
    xc: number,
    yc: number,
    xrtwidth: number,
    yrtheight: number
  ): Point<number>[] {
    let pts1plus: Point<number>[] = []
    let pts1neg: Point<number>[] = []
    let pts2plus: Point<number>[] = []
    let pts2neg: Point<number>[] = []

    const radius = lens.diameter / 2

    const apradius1 = lens.surf1.ap / 2
    const stepsize1 = apradius1 / (npts - 1)

    const apradius2 = lens.surf2.ap / 2
    const stepsize2 = apradius2 / (npts - 1)

    // define lens arc
    for (let i = 0; i < npts; i++) {
      const r1 = i * stepsize1
      const r2 = i * stepsize2
      pts1plus.push({ x: lens.surf1.sagAt(r1), y: r1 })
      pts1neg.push({ x: lens.surf1.sagAt(r1), y: -r1 })

      pts2plus.push({ x: lens.surf2.sagAt(r2) + lens.ct, y: r2 })
      pts2neg.push({ x: lens.surf2.sagAt(r2) + lens.ct, y: -r2 })
    }
    // add flats if existing
    pts1plus.push({ x: lens.surf1.sagAt(stepsize1 * (npts - 1)), y: radius })
    pts1neg.push({ x: lens.surf1.sagAt(stepsize1 * (npts - 1)), y: -radius })
    pts2plus.push({ x: lens.surf2.sagAt(stepsize2 * (npts - 1)) + lens.ct, y: radius })
    pts2neg.push({ x: lens.surf2.sagAt(stepsize2 * (npts - 1)) + lens.ct, y: -radius })

    // reverse the negs and concat
    pts2plus.reverse()
    pts1neg.reverse()

    pts1plus.concat(pts2plus)
    pts1plus.concat(pts2neg)
    pts1plus.concat(pts1neg)

    let pts = pts1plus.concat(pts2plus, pts2neg, pts1neg)

    let scale = calculateOptimumScale(lens, source, xrtwidth, yrtheight)

    //let ptstr: string = 'x, y\n'
    for (let i = 0; i < pts.length; i++) {
      pts[i].x = pts[i].x * scale + xc
      pts[i].y = pts[i].y * scale + yc
      //ptstr += pts[i].x.toFixed(4) + ', ' + pts[i].y.toFixed(4) + '\n'
      //console.log(i, pts[i].x.toFixed(0), pts[i].y.toFixed(0))
    }

    //saveTextToFile(ptstr, 'lensshape')

    return pts
  }

  function drawRaytraceSVG(node: SVGSVGElement, params: ActionParams) {
    renderSVG(node, params)
    return {
      update(params: ActionParams) {
        node.innerHTML = ''
        renderSVG(node, params)
      },
    }
  }

  function renderSVG(node: SVGSVGElement, { lens, source, outerWidth, outerHeight }: ActionParams) {
    if (node) {
      const topboxes = 80
      const bottomboxes = 70
      let lensbegin = 50
      let raysbegin = 50

      // ****************
      // data for drawing ray trace box
      const xrtleft = 50
      const xrtright = outerWidth - 50
      const xrtwidth = xrtright - xrtleft

      const yrttop = topboxes + 15
      const yrtbot = outerHeight - bottomboxes - 15
      const yrtcenter = (outerHeight - topboxes - bottomboxes) / 2 + topboxes
      const yrtheight = yrtbot - yrttop

      const localBFL = lens.BFL(source.wavelengths[0])
      let e0 = new Vector3D(0, 0, 1)
      let scale = calculateOptimumScale(lens, source, xrtwidth, yrtheight) // convert data by  world = pixels / scale
      let zscalestart = -raysbegin / scale // this is begining z in world coords
      if (localBFL < 0.0) {
        lensbegin = outerWidth - (outerWidth + localBFL * scale) / 2 - 75
      }

      // calculate scale factor
      node.appendChild(
        svgLensPath(
          lens,
          source,
          5,
          xrtleft + lensbegin,
          yrtcenter,
          xrtwidth,
          yrtheight,
          lens.material.color
        )
      )
      //svg.appendChild(svgRayCenterLine(design, 'red'))

      let halfap = entrancePupilHalfDiameter(source)
      for (let y = -halfap; y <= halfap + 0.0001; y += halfap / 4) {
        if (Math.abs(y) > 0.001) {
          let p0 = new Vector3D(0, y, zscalestart)
          let ps = trace3DRayPath(p0, e0, lens, source, 0.0)
          let pts = convertVectorToPts(ps, scale, 0.0, scale, xrtleft + lensbegin, yrtcenter)
          node.appendChild(svgRayPaths(pts, 'blue'))
        }
      }

      // trace and label axial ray or center line through lens
      let p0 = new Vector3D(0, 0, zscalestart - 2)
      let ps = trace3DRayPath(p0, e0, lens, source, 0.0)
      let pts = convertVectorToPts(ps, scale, 0.0, scale, xrtleft + lensbegin, yrtcenter)
      //pts[pts.length-1].x += 20  // not sure I like this
      node.appendChild(svgRayPaths(pts, 'red', 2, true))

      // add arraow to axial ray ***** may not include in final code??

      if (localBFL >= 0.0) {
        let xarrow = pts[2].x + 0.1 * (pts[3].x - pts[2].x)
        node.appendChild(svgArrowPath(xarrow, pts[3].y, 15, 'red'))
        node.appendChild(svgText('CL', pts[0].x, pts[0].y + 5, '14px', 'bold', 'start'))
      } else {
        let xarrow = (pts[0].x + pts[3].x) / 1.25
        console.log(pts)
        node.appendChild(svgArrowPath(xarrow, pts[3].y, 15, 'red', '180'))
        node.appendChild(svgText('CL', pts[0].x, pts[0].y + 5, '14px', 'bold', 'start'))
      }

      /*
      svg.appendChild(svgArrowPath(xarrow+20, pts[3].y, 15, 'red', '90'))
      svg.appendChild(svgArrowPath(xarrow+40, pts[3].y, 15, 'red', '180'))
      svg.appendChild(svgArrowPath(xarrow+60, pts[3].y, 15, 'red', '270'))
      svg.appendChild(svgArrowPath(xarrow+80, pts[3].y, 15, 'red', 'ddd'))
      */

      // add image plane - plane
      let linelength = 100
      let x = pts[pts.length - 1].x
      let y = pts[pts.length - 1].y
      node.appendChild(
        svgVertLine(
          { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y - linelength / 2 },
          linelength
        )
      )
      if (localBFL >= 0.0) {
        node.appendChild(
          svgText('Image Plane ', x - 5, y - linelength / 2 + 5, '12px', 'normal', 'end')
        )
      } else {
        node.appendChild(
          svgText('Virtual Image Plane ', x + 5, y - linelength / 2 + 5, '12px', 'normal', 'start')
        )
      }
    }
  }
</script>

<svg use:drawRaytraceSVG={{ lens, source, outerWidth, outerHeight }} />
