<script lang="ts">
  import type Lens from '$lib/lens'

  export let lens: Lens
  export let outerWidth: number
  export let outerHeight: number

  interface ActionParams {
    lens: Lens
    outerWidth: number
    outerHeight: number
  }

  const coefnames = ['A4', 'A6', 'A8', 'A10']
  //  const coefnames = ['AD', 'AE', 'AF', 'AG']

  const arrowlinelen = 25
  // const arrowheightdy = 3
  // const arrowheightdx = 8
  const offsurf = 3
  let scale: number
  let ctleft: Point<number>
  let ctright: Point<number>
  let etleft: Point<number>
  let etright: Point<number>
  let etrighttexact: Point<number>
  let etleftexact: Point<number>

  function calculateOptimumScale(
    pts: Point<number>[],
    outerWidth: number,
    outerHeight: number
  ): number {
    const [minx, maxx, miny, maxy] = calclimits(pts)

    const scalex = outerWidth / (maxx - minx)
    const scaley = outerHeight / (maxy - miny)

    scale = (scalex < scaley ? scalex : scaley) * 0.4
    return scale
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

  function svgLensPath(
    lens: Lens,
    npts: number,
    outerWidth: number,
    outerHeight: number,
    xc: number,
    yc: number,
    fillcolor: string
  ): SVGPathElement {
    const newElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    const pts = traceLensShapeFull(lens, npts, xc, yc, outerWidth, outerHeight)
    //console.log(pts)
    const path = pointsToPath(pts, true)
    //console.log(pts)

    newElement.setAttribute('d', path)

    newElement.style.stroke = '#000'
    newElement.style.strokeWidth = '1px'
    newElement.style.fill = fillcolor
    return newElement
  }

  function svgHorizLine(pt: Point<number>, nlen: number): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    const x1 = pt.x.toFixed(0)
    const y1 = pt.y.toFixed(0)
    const x2 = (parseInt(pt.x.toFixed(0)) + nlen).toString()
    const y2 = pt.y.toFixed(0)

    //console.log(x1, y1, x2, y2)

    line.setAttribute('x1', x1)
    line.setAttribute('y1', y1)
    line.setAttribute('x2', x2)
    line.setAttribute('y2', y2)
    line.setAttribute('stroke', 'black')
    line.setAttribute('stroke-width', '1')

    //console.log(pt)
    return line
  }

  function svgVertLine(pt: Point<number>, nlen: number): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    const x1 = pt.x.toFixed(0)
    const y1 = (parseInt(pt.y.toFixed(0)) - 2).toString()
    const x2 = pt.x.toFixed(0)
    const y2 = (parseInt(pt.y.toFixed(0)) + nlen - 2).toString()

    line.setAttribute('x1', x1)
    line.setAttribute('y1', y1)
    line.setAttribute('x2', x2)
    line.setAttribute('y2', y2)
    line.setAttribute('stroke', 'black')
    line.setAttribute('stroke-width', '1')
    line.setAttribute('stroke-dasharray', '3')

    //console.log('V Line: ', x1, y1, x2, y2)
    return line
  }

  function svgEmbedImg(
    imgx: string,
    imgy: string,
    imgwidth: string,
    imgheight: string,
    imagesrc: string
  ): SVGImageElement {
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')

    image.setAttribute('x', imgx)
    image.setAttribute('y', imgy)
    image.setAttribute('width', imgwidth)
    image.setAttribute('height', imgheight)
    image.setAttribute('href', imagesrc)

    //    <image x="40" y="350" width="264" height="60" xlink:href="/AspEquation.PNG"/>

    return image
  }

  function svgArrowPath(
    xc: number,
    yc: number,
    size = 10,
    fillcolor = 'black',
    rotation = '0'
  ): SVGPathElement {
    const newElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    const aspectratio = 0.8
    const x1 = (-size).toFixed(0)
    const y1 = ((-size / 2) * aspectratio).toFixed(0)
    const x2 = '0'
    const y2 = (size * aspectratio).toFixed(0)

    const path = `m ${xc} ${yc} l ${x1} ${y1} ${x2} ${y2}` // ' l -8 3 0 -6 z'p

    newElement.setAttribute('d', path)
    newElement.setAttribute('transform', `rotate(${rotation}, ${xc.toFixed(0)}, ${yc.toFixed(0)})`)
    newElement.style.stroke = fillcolor
    newElement.style.strokeWidth = '1px'
    newElement.style.fill = fillcolor
    return newElement
  }

  function traceLensShapeFull(
    lens: Lens,
    npts: number,
    xc: number,
    yc: number,
    outerWidth: number,
    outerHeight: number
  ): Point<number>[] {
    const pts1plus: Point<number>[] = []
    const pts1neg: Point<number>[] = []
    const pts2plus: Point<number>[] = []
    const pts2neg: Point<number>[] = []

    const radius = lens.diameter / 2

    const apradius1 = lens.surf1.ap / 2
    const stepsize1 = apradius1 / (npts - 1)

    const apradius2 = lens.surf2.ap / 2
    const stepsize2 = apradius2 / (npts - 1)

    // define lens arc
    for (let i = 0; i < npts; i++) {
      const r1 = i * stepsize1
      const r2 = i * stepsize2
      pts1plus.push({ x: lens.surf1.sagAt(r1) - lens.ct / 2, y: r1 })
      pts1neg.push({ x: lens.surf1.sagAt(r1) - lens.ct / 2, y: -r1 })

      pts2plus.push({ x: lens.surf2.sagAt(r2) + lens.ct / 2, y: r2 })
      pts2neg.push({ x: lens.surf2.sagAt(r2) + lens.ct / 2, y: -r2 })
    }
    // add flats if existing
    pts1plus.push({ x: lens.surf1.sagAt(stepsize1 * (npts - 1)) - lens.ct / 2, y: radius })
    pts1neg.push({ x: lens.surf1.sagAt(stepsize1 * (npts - 1)) - lens.ct / 2, y: -radius })
    pts2plus.push({ x: lens.surf2.sagAt(stepsize2 * (npts - 1)) + lens.ct / 2, y: radius })
    pts2neg.push({ x: lens.surf2.sagAt(stepsize2 * (npts - 1)) + lens.ct / 2, y: -radius })

    // reverse the negs and concat
    pts2plus.reverse()
    pts1neg.reverse()

    pts1plus.concat(pts2plus)
    pts1plus.concat(pts2neg)
    pts1plus.concat(pts1neg)

    // const offsetpt: Point = { x: xc, y: yc }

    const pts = pts1plus.concat(pts2plus, pts2neg, pts1neg)

    const scale = calculateOptimumScale(pts, outerWidth, outerHeight)

    for (let i = 0; i < pts.length; i++) {
      pts[i].x = pts[i].x * scale + xc
      pts[i].y = pts[i].y * scale + yc
      //console.log(i, pts[i].x.toFixed(0), pts[i].y.toFixed(0))
    }

    // load these parameters as the locations of the ct and et callout
    // this was an after thought - rather than recalculate make them global
    // these points needed for arrows and label at CT
    ctleft = { x: pts[0].x - offsurf, y: yc }
    ctright = { x: pts[npts * 2 + 1].x + offsurf, y: yc }

    // these points needed for arrows and label at ET
    const topedgeloc = -radius * scale + yc
    etright = { x: pts[3 * npts + 1].x + offsurf, y: topedgeloc - 14 }
    etleft = { x: pts[3 * npts + 3].x - offsurf, y: topedgeloc - 14 }

    // these points need for vertical lines at ET
    etrighttexact = { x: pts[3 * npts + 1].x, y: topedgeloc }
    etleftexact = { x: pts[3 * npts + 3].x, y: topedgeloc }

    return pts
  }

  function calclimits(pts: Point<number>[]): [number, number, number, number] {
    let minx = 1e10
    let miny = 1e10
    let maxx = -1e10
    let maxy = -1e10

    for (let i = 0; i < pts.length; i++) {
      if (pts[i].x < minx) {
        minx = pts[i].x
      }
      if (pts[i].x > maxx) {
        maxx = pts[i].x
      }
      if (pts[i].y < miny) {
        miny = pts[i].y
      }
      if (pts[i].y > maxy) {
        maxy = pts[i].y
      }
    }

    return [minx, maxx, miny, maxy]
  }

  function drawLensSVG(node: SVGSVGElement, params: ActionParams) {
    renderSVG(node, params)
    return {
      update(params: ActionParams) {
        node.innerHTML = ''
        renderSVG(node, params)
      },
    }
  }

  function renderSVG(node: SVGSVGElement, { lens, outerWidth, outerHeight }: ActionParams) {
    if (node) {
      const ftsreg = '12px'
      const ftstit = '14px'

      // add lens pix to drawing
      node.appendChild(svgLensPath(lens, 5, outerWidth, outerHeight, 550, 275, lens.material.color))

      // add CT callouts
      node.appendChild(svgHorizLine(ctleft, -arrowlinelen))
      node.appendChild(svgArrowPath(ctleft.x, ctleft.y, 10, 'black', '0'))
      node.appendChild(svgHorizLine(ctright, arrowlinelen))
      node.appendChild(svgArrowPath(ctright.x, ctright.y, 10, 'black', '180'))

      node.appendChild(
        svgText(`CT: ${lens.ct.toFixed(3)}`, ctright.x + arrowlinelen + 4, ctright.y + 4, ftsreg)
      )

      // add ET call outs
      node.appendChild(svgHorizLine(etright, arrowlinelen))
      node.appendChild(svgArrowPath(etright.x, etright.y, 10, 'black', '180'))
      node.appendChild(svgHorizLine(etleft, -arrowlinelen))
      node.appendChild(svgArrowPath(etleft.x, etleft.y, 10, 'black', '0'))

      node.appendChild(svgVertLine(etrighttexact, -arrowlinelen))
      node.appendChild(svgVertLine(etleftexact, -arrowlinelen))

      node.appendChild(
        svgText(`ET: ${lens.et.toFixed(3)}`, etright.x + arrowlinelen + 4, etright.y + 4, ftsreg)
      )

      // add side 1 and side parameters listing to page
      const yinc = 20
      const beginsy = 150
      const underlinelength = 100

      // add side 1 parameters
      let sx = 50
      let sy = beginsy
      let surfno = lens.surf1
      let surfcoefs = lens.surf1.asphericTerms.coeffs
      node.appendChild(svgText('Side 1 Data', sx, sy, ftstit, 'bold'))
      node.appendChild(svgHorizLine({ x: sx, y: (sy += yinc / 2) }, underlinelength))
      node.appendChild(svgText(`Radius: ${surfno.r.toFixed(3)}`, sx, (sy += yinc), ftsreg))
      if (lens.surf1.ap < lens.diameter) {
        node.appendChild(
          svgText(`  Inside Aperture: ${lens.surf1.ap.toFixed(3)}`, sx, (sy += yinc), ftsreg)
        )
        node.appendChild(
          svgText(
            `  Flat Width: ${((lens.diameter - lens.surf1.ap) / 2).toFixed(3)}`,
            sx,
            (sy += yinc),
            ftsreg
          )
        )
      }
      node.appendChild(
        svgText(`Sag: ${surfno.sagAt(lens.surf1.ap / 2).toFixed(4)}`, sx, (sy += yinc), ftsreg)
      )
      node.appendChild(
        svgText(
          `@ rad posi: ${(lens.surf1.ap / 2).toFixed(3)}`,
          sx + 3,
          (sy += 0.75 * yinc),
          ftsreg
        )
      )

      if (Math.abs(surfno.k) > 0.00001) {
        node.appendChild(svgText(`K: ${surfno.k.toFixed(4)}`, sx, (sy += yinc), ftsreg))
      } else {
        sy += yinc
      }

      sy += yinc
      if (surfno.type === 'asphere') {
        node.appendChild(svgText('Side 1 Aspheric Coefs', sx, (sy += 0.75 * yinc), ftsreg, 'bold'))
        surfcoefs.forEach((coef: number, k: number) => {
          if (Math.abs(coef) > 1e-25) {
            node.appendChild(
              svgText(
                `${coefnames[k]}: ${coef.toExponential(4)} mm^-${3 + 2 * k}`,
                sx,
                (sy += yinc),
                ftsreg
              )
            )
          }
        })
      }

      // add side 2 parameters
      sx = 240
      sy = beginsy
      surfno = lens.surf2
      surfcoefs = lens.surf2.asphericTerms.coeffs
      node.appendChild(svgText('Side 2 Data', sx, sy, ftstit, 'bold'))
      node.appendChild(svgHorizLine({ x: sx, y: (sy += yinc / 2) }, underlinelength))
      node.appendChild(svgText(`Radius: ${surfno.r.toFixed(3)}`, sx, (sy += yinc), ftsreg))
      if (lens.surf2.ap < lens.diameter) {
        node.appendChild(
          svgText(`  Inside Aperture: ${lens.surf2.ap.toFixed(3)}`, sx, (sy += yinc), ftsreg)
        )
        node.appendChild(
          svgText(
            `  Flat Width: ${((lens.diameter - lens.surf2.ap) / 2).toFixed(3)}`,
            sx,
            (sy += yinc),
            ftsreg
          )
        )
      }
      node.appendChild(
        svgText(`Sag: ${surfno.sagAt(lens.surf2.ap / 2).toFixed(4)}`, sx, (sy += yinc), ftsreg)
      )
      node.appendChild(
        svgText(
          `@ rad posi: ${(lens.surf2.ap / 2).toFixed(3)}`,
          sx + 3,
          (sy += 0.75 * yinc),
          ftsreg
        )
      )

      if (Math.abs(surfno.k) > 0.00001) {
        node.appendChild(svgText(`K: ${surfno.k.toFixed(4)}`, sx, (sy += yinc), ftsreg))
      } else {
        sy += yinc
      }

      sy += yinc
      if (surfno.type === 'asphere') {
        node.appendChild(svgText('Side 2 Aspheric Coefs', sx, (sy += 0.75 * yinc), ftsreg, 'bold'))
        surfcoefs.forEach((coef: number, k: number) => {
          if (Math.abs(coef) > 1e-25) {
            node.appendChild(
              svgText(
                `${coefnames[k]}:  ${coef.toExponential(4)} mm^-${3 + 2 * k}`,
                sx,
                (sy += yinc),
                ftsreg
              )
            )
          }
        })
      }

      if (lens.surf1.type === 'asphere' || lens.surf2.type === 'asphere') {
        node.appendChild(
          svgEmbedImg('40', (outerHeight - 100).toString(), '360', '80', '/asphere_equation.png')
        )
      }
    }
  }
</script>

<svg use:drawLensSVG={{ lens, outerWidth, outerHeight }} />
