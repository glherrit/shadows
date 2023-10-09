import { Vector3 } from 'three'
import type Lens from './lens'
import type { Surface } from './lens'
import type { LightSource } from './lightSource'
import { trace3DRayPath } from './raytrace'
import { Vector3D } from './vector'
import { Lut } from 'three/examples/jsm/math/Lut'

export interface Ray {
  pVector: Vector3D
  eDir: Vector3D
}

export function cullImagePoints(crays: Ray[], lens: Lens, source: LightSource, refocus: number): Vector3[] {
  const surfimgpts: Vector3[] = [];
  crays.forEach((ray) => {
    let ps = trace3DRayPath(ray.pVector, ray.eDir, lens, source, refocus);
    surfimgpts.push(
      new Vector3(
        ps[ps.length - 1].x,
        ps[ps.length - 1].y,
        ps[ps.length - 1].z
      )
    )
  });
  return surfimgpts;
}

export function extenedSrcHisto2( Vlist: Vector3[], fiber_radius: number, imageSizeMultiplier: number, binSize: number): number[][] {
  const minbin = -imageSizeMultiplier * fiber_radius;  // max neg bin value
  const maxbin = imageSizeMultiplier * fiber_radius;  // max pos bin value
  const sbin = Math.floor((maxbin - minbin + 0.00005) / binSize) + 1;  // total number of bins

  let vscale = ((Math.PI * (sbin - 1.0)) / (imageSizeMultiplier * 2.0))
      * ((sbin - 1.0) / (imageSizeMultiplier * 2.0) - Math.SQRT1_2); // value to normalize total intensity to 1

  // init array
  let indata: number[][] = Array.from({ length: sbin }, () => new Array(sbin).fill(0));

  let errors = 0;  // track errors for future use

  for (const P of Vlist) {
    const row = Math.round((P.x - minbin) / binSize);
    const col = Math.round((P.y - minbin) / binSize);

    if (row >= 0 && row < sbin && col >= 0 && col < sbin) {
      indata[row][col] += 1;
    } else {
      errors++;
    }
  }

  let maxz = findMaxValue(indata);
  indata = divideArrayByConstant(indata, vscale * 0.01);
  maxz = findMaxValue(indata);
  console.log('maxz, vscale', maxz, vscale);
  return indata;
}

export function extenedSrcHisto( Vlist: Vector3[], fiber_radius: number, imageSizeMultiplier: number, binSize: number): 
[number[][], number, Float32Array ] {
  const minbin = -imageSizeMultiplier * fiber_radius;  // max neg bin value
  const maxbin = imageSizeMultiplier * fiber_radius;  // max pos bin value

  const sbin = Math.floor((maxbin - minbin + 0.00005) / binSize) + 1;  // total number of bins

  let vscale = ((Math.PI * (sbin - 1.0)) / (imageSizeMultiplier * 2.0))
      * ((sbin - 1.0) / (imageSizeMultiplier * 2.0) - Math.SQRT1_2); // value to normalize total intensity to 1

  // init array
  let indata: number[][] = Array.from({ length: sbin }, () => new Array(sbin).fill(0));

  let errors = 0;  // track errors for future use

  for (const P of Vlist) {
    const row = Math.round((P.x - minbin) / binSize);
    const col = Math.round((P.y - minbin) / binSize);

    if (row >= 0 && row < sbin && col >= 0 && col < sbin) {
      indata[row][col] += 1;
    } else {
      errors++;
    }
  }  
  let mz = findMaxValue(indata);
  
  //console.log("🚀 ~ errors:", errors)
  
  const verticalScale = 1;
  const horizScale = 100;
  let maxz = findMaxValue(indata);
  //indata = divideArrayByConstant(indata, verticalScale);

  var farray = new Float32Array(indata.length * indata[0].length * 3);

  for (let i = 0; i < indata.length; i++) {
    for (let j = 0; j < indata[i].length; j++) {
      const index = (i * indata[i].length + j) * 3;
      farray[index] = (minbin + i * binSize) * horizScale;
      farray[index + 1] = (minbin + j * binSize) * horizScale;
      farray[index + 2] = indata[i][j];
    }
  }

  return [indata, sbin, farray]
}

export function genIndices (w: number, h: number ) {  
  const indices = [];
  
  for (let i = 0; i < w - 1; i++) {
    for (let j = 0; j < h - 1; j++) {
      const topLeft = i * h + j;
      const topRight = topLeft + 1;
      const bottomLeft = (i + 1) * h + j;
      const bottomRight = bottomLeft + 1;

      // Triangle 1
      indices.push(topLeft, bottomLeft, topRight);
      // Triangle 2
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }
  return indices;
}

export function genVertexColors(farray: Float32Array, numColors: number = 101) {
  let zMax = maxFloat32Array(farray) * 0.8;
  const lut = new Lut('rainbow', numColors);
  let colors = new Float32Array(farray.length);
  for (let i = 0; i < farray.length; i += 3) {
    let z = farray[i + 2];
    const color = lut.getColor(z  / zMax);
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }
  return colors;
}

export function maxFloat32Array(farray: Float32Array, position: number = 2) {
  let max = -1.1e-20;
  for(let i = position; i < farray.length; i += 3) {
    if(farray[i] > max) {
      max = farray[i];
    }
  }
  return max;
}

export function findMaxValue(array2D: number[][]): number {
  let maxValue = Number.NEGATIVE_INFINITY; // Initialize with a very small value

  for (const row of array2D) {
    for (const num of row) {
      if (num > maxValue) {
        maxValue = num;
      }
    }
  }

  return maxValue;
}

export function findMaxVector3(vecs: Vector3[]) {
  let maxValue = Number.NEGATIVE_INFINITY; // Initialize with a very small value

  vecs.forEach((vec) => {
    if (vec.z > maxValue) {
      maxValue = vec.z;
    }
  });
  return maxValue;
}

export function sumArrayValues(arr: number[][]): number {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr[i].length; j++) {
      total += arr[i][j];
    }
  }
  return total;
}

export function divideArrayByConstant(array2D: number[][], constant: number): number[][] {
  const result: number[][] = [];

  for (const row of array2D) {
    const newRow: number[] = [];

    for (const value of row) {
      newRow.push(value / constant);
    }

    result.push(newRow);
  }

  return result;
}