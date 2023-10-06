#[macro_use]
extern crate impl_ops;

mod fermi;
mod fft;
mod lens;
mod optimize;
mod raytrace;
mod utils;

use fermi::fittofermi_dirac;
use fft::{
    _rustfftmidline, rustfft,
    utils::{gen_zero_2d, get_complex_vec, slicecore},
};
use lens::{Lens, Side, SurfaceType};
use raytrace::{
    gen_random_rays,
    ray_vector::{Vector3D, CPROPV},
    trace_ray,
    wfe::calc_opd_slim,
};
use std::f64::consts::PI;
use std::f64::consts::SQRT_2;
use utils::set_panic_hook;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct TraceResults {
    p_vectors: Vec<f64>,
    e_vectors: Vec<f64>,
}

#[wasm_bindgen]
impl TraceResults {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TraceResults {
        TraceResults {
            p_vectors: vec![],
            e_vectors: vec![],
        }
    }

    #[wasm_bindgen(getter, js_name = "pPtr")]
    pub fn p_ptr(&self) -> *const f64 {
        self.p_vectors.as_ptr()
    }

    #[wasm_bindgen(getter, js_name = "pSize")]
    pub fn p_size(&self) -> usize {
        self.p_vectors.len()
    }

    #[wasm_bindgen(getter, js_name = "ePtr")]
    pub fn e_ptr(&self) -> *const f64 {
        self.e_vectors.as_ptr()
    }

    #[wasm_bindgen(getter, js_name = "eSize")]
    pub fn e_size(&self) -> usize {
        self.e_vectors.len()
    }
}

#[wasm_bindgen(js_name = "runWASMRaytrace")]
pub fn run_raytrace(
    num_rays: usize,
    num_angles: usize,
    fiber_radius: f64,
    source_radius: f64,
    refocus: f64,
    lens_payload: &JsValue,
) -> TraceResults {
    set_panic_hook();

    let lens: Lens = lens_payload.into_serde().unwrap();
    //log(&format!("rusty {:?}", lens));
    // log(&format!("rusty {:?}", lens));
    //log(&format!("rusty {:?}", source_radius));

    let half_ang = fiber_radius / lens.efl();

    let in_rays = gen_random_rays(num_rays, num_angles, source_radius, half_ang);
    // let out_rays = Vec::with_capacity(num_rays * num_angles);

    let mut p_vecs = Vec::with_capacity(in_rays.len() * 3);
    let mut e_vecs = Vec::with_capacity(in_rays.len() * 3);

    for in_r in &in_rays {
        let out_r = trace_ray(&in_r, &lens, refocus);
        p_vecs.push(out_r.pvector.x);
        p_vecs.push(out_r.pvector.y);
        p_vecs.push(out_r.pvector.z);

        e_vecs.push(out_r.edir.x);
        e_vecs.push(out_r.edir.y);
        e_vecs.push(out_r.edir.z);
    }
    TraceResults {
        p_vectors: p_vecs,
        e_vectors: e_vecs,
    }
}

#[wasm_bindgen]
pub struct PSFResult {
    data: Vec<f64>,
}

#[wasm_bindgen]
impl PSFResult {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PSFResult {
        PSFResult { data: vec![] }
    }

    #[wasm_bindgen(getter, js_name = "dataPtr")]
    pub fn data_ptr(&self) -> *const f64 {
        self.data.as_ptr()
    }

    #[wasm_bindgen(getter, js_name = "dataSize")]
    pub fn data_size(&self) -> usize {
        self.data.len()
    }
}

#[wasm_bindgen(js_name = "genPSF")]
pub fn genpsf(
    loopsize: usize,
    totalsize: usize,
    psfgridsize: usize,
    wavelength: f64,
    source_radius: f64,
    refocus: f64,
    lens_payload: &JsValue,
) -> PSFResult {
    set_panic_hook();
    let lens: Lens = lens_payload.into_serde().unwrap();
    let mut amp = gen_zero_2d(loopsize);
    let mut mask = gen_zero_2d(loopsize);

    let mut x: f64;
    let mut y: f64;
    let diag = source_radius * source_radius;

    let step = 2.0 * source_radius / (loopsize - 1) as f64;

    for row in 0..psfgridsize {
        y = source_radius - row as f64 * step;
        for col in 0..psfgridsize {
            x = -source_radius + col as f64 * step;
            if (x * x + y * y) < diag {
                let p0 = Vector3D { x, y, z: 0.0 };
                amp[row][col] = 2.0 * PI * calc_opd_slim(p0, CPROPV, &lens, wavelength, refocus); // multiply by 2pi to scale for fft
                mask[row][col] = 1.0;
            } else {
                amp[row][col] = 0.0;
                mask[row][col] = 0.0;
            }
        }
    }

    let mut data = get_complex_vec(&amp, &mask, totalsize);
    let mut datadl = get_complex_vec(&mask, &mask, totalsize);
    let datafull = rustfft(&mut data, &mut datadl);
    let _datatoc = slicecore(datafull, psfgridsize);
    //console.log(_datatoc);
    //console.log("lib.rs:  ***************");
    let mut psfdata: Vec<f64> = vec![];

    for row in 0..psfgridsize {
        for col in 0..psfgridsize {
            psfdata.push(_datatoc[row][col]);
        }
    }
    PSFResult { data: psfdata }
}

#[wasm_bindgen(js_name = "genPSFLine")]
pub fn genpsfline(
    gridsize: usize,
    totalsize: usize,
    wavelength: f64,
    source_radius: f64,
    refocus: f64,
    lens_payload: &JsValue,
) -> PSFResult {
    set_panic_hook();
    let lens: Lens = lens_payload.into_serde().unwrap();
    //log(&format!("rusty {:?}", lens));

    let mut amp = gen_zero_2d(gridsize);
    let mut mask = gen_zero_2d(gridsize);
    let zero = gen_zero_2d(gridsize);

    let mut x: f64;
    let mut y: f64;
    let diag = source_radius * source_radius;

    let step = 2.0 * source_radius / (gridsize - 1) as f64;

    for row in 0..gridsize {
        y = source_radius - row as f64 * step;
        for col in 0..gridsize {
            x = -source_radius + col as f64 * step;
            if (x * x + y * y) < diag {
                let p0 = Vector3D { x, y, z: 0.0 };
                amp[row][col] = 2.0 * PI * calc_opd_slim(p0, CPROPV, &lens, wavelength, refocus); // multiply by 2pi to scale for fft
                mask[row][col] = 1.0;
            } else {
                amp[row][col] = 0.0;
                mask[row][col] = 0.0;
            }
        }
    }

    let mut data = get_complex_vec(&amp, &mask, totalsize);
    let mut datadl = get_complex_vec(&zero, &mask, totalsize);
    let dataout = _rustfftmidline(&mut data, &mut datadl, gridsize);

    PSFResult { data: dataout }
}

#[wasm_bindgen(js_name = "genGaussLine")]
pub fn gengaussline(
    gridsize: usize,
    totalsize: usize,
    wavelength: f64,
    source_radius: f64,
    source_e2pt: f64,
    refocus: f64,
    lens_payload: &JsValue,
) -> PSFResult {
    set_panic_hook();
    let lens: Lens = lens_payload.into_serde().unwrap();
    //log(&format!("rusty {:?}", lens));

    let mut amp = gen_zero_2d(gridsize);
    let mut mask = gen_zero_2d(gridsize);
    let zero = gen_zero_2d(gridsize);

    let mut x: f64;
    let mut y: f64;
    let diag = source_radius * source_radius;

    let step = 2.0 * source_radius / (gridsize - 1) as f64;
    let e2ptsquared = source_e2pt * source_e2pt;
    for row in 0..gridsize {
        y = source_radius - row as f64 * step;
        for col in 0..gridsize {
            x = -source_radius + col as f64 * step;
            let r2 = x * x + y * y;
            if r2 < diag {
                let p0 = Vector3D { x, y, z: 0.0 };
                amp[row][col] = 2.0 * PI * calc_opd_slim(p0, CPROPV, &lens, wavelength, refocus); // multiply by 2pi to scale for fft
                mask[row][col] = (-1.0 * r2 / e2ptsquared).exp();
            } else {
                amp[row][col] = 0.0;
                mask[row][col] = 0.0;
            }
        }
    }

    let mut data = get_complex_vec(&amp, &mask, totalsize);
    let mut datadl = get_complex_vec(&zero, &mask, totalsize);
    let dataout = _rustfftmidline(&mut data, &mut datadl, gridsize);

    PSFResult { data: dataout }
}

#[wasm_bindgen]
pub struct ExtSrcResult {
    xdata: Vec<f64>,
    ydata: Vec<f64>,
    num_errors: i32,
}

#[wasm_bindgen]
impl ExtSrcResult {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ExtSrcResult {
        ExtSrcResult {
            xdata: vec![],
            ydata: vec![],
            num_errors: i32::MIN,
        }
    }

    #[wasm_bindgen(getter, js_name = "xdataPtr")]
    pub fn data_ptr(&self) -> *const f64 {
        self.xdata.as_ptr()
    }

    #[wasm_bindgen(getter, js_name = "ydataPtr")]
    pub fn ydata_ptr(&self) -> *const f64 {
        self.ydata.as_ptr()
    }

    #[wasm_bindgen(getter, js_name = "xdataSize")]
    pub fn xdata_size(&self) -> usize {
        self.xdata.len()
    }

    #[wasm_bindgen(getter, js_name = "ydataSize")]
    pub fn ydata_size(&self) -> usize {
        self.ydata.len()
    }

    #[wasm_bindgen(getter, js_name = "numErrors")]
    pub fn num_errors(&self) -> i32 {
        self.num_errors
    }
}

#[wasm_bindgen(js_name = "runExtSrcTrace")]
pub fn run_extsource(
    num_rays: usize,
    num_angles: usize,
    fiber_radius: f64,
    source_radius: f64,
    refocus: f64,
    sbins: usize, // this value should be odd
    multiplier: f64,
    use_fermi: bool,
    lens_payload: &JsValue,
) -> ExtSrcResult {
    set_panic_hook();

    let lens: Lens = lens_payload.into_serde().unwrap();
    // log(&format!("rusty {:?}", lens));
    //log(&format!("rusty {:?}", source_radius));

    let half_ang = fiber_radius / lens.efl();

    let in_rays = gen_random_rays(num_rays, num_angles, source_radius, half_ang);
    // let out_rays = Vec::with_capacity(num_rays * num_angles);

    let mut p_vecs = Vec::with_capacity(in_rays.len() * 2);

    for in_r in &in_rays {
        let out_r = trace_ray(&in_r, &lens, refocus);
        p_vecs.push(out_r.pvector.x);
        p_vecs.push(out_r.pvector.y);
        //p_vecs.push(out_r.pvector.z);
    }

    let nbins = sbins as f64;
    let cell_size = (fiber_radius * multiplier * 2.0) / (nbins - 1.0);
    let vscale = ((PI * (nbins - 1.0)) / (multiplier * 2.0))
        * ((nbins - 1.0) / (multiplier * 2.0) - 1.0 / SQRT_2); // value to normalize total intensity to 1

    let (datamap, errors) =
        process_rust_ray_data(&p_vecs, fiber_radius, sbins, multiplier as usize);
    let (xs, ys) = cull_vector3d_data(&datamap, cell_size, vscale, num_rays * num_angles);

    // find max ys value
    let mut max_y = 0.0;
    for y in &ys {
        if *y > max_y {
            max_y = *y;
        }
    }
    // this snippet is thanks to ChatGPT
    let (xdata, ydata) = if use_fermi && max_y > 0.6 {
        let yfermi = fittofermi_dirac(&xs, &ys, 20.0, 0.1, 1.0);
        mirror_data_array(&xs, &yfermi)
    } else {
        mirror_data_array(&xs, &ys)
    };
    return ExtSrcResult {
        xdata,
        ydata,
        num_errors: errors as i32,
    };
}

fn process_rust_ray_data(
    vlist: &[f64],
    fiber_radius: f64,
    sbins: usize,
    multiplier: usize,
) -> (Vec<Vec<f64>>, usize) {
    let min_xy = -((multiplier as f64) * fiber_radius);
    let max_xy = (multiplier as f64) * fiber_radius;
    let binsize = 2.0 * max_xy / (sbins - 1) as f64;
    let num_bins = sbins as isize;

    // generate 2d map of ray data
    let mut indata = vec![vec![0.0; sbins]; sbins];
    let mut errors = 0;

    for chunk in vlist.chunks_exact(2) {
        let row = ((chunk[0] - min_xy) / binsize).floor() as isize;
        let col = ((chunk[1] - min_xy) / binsize).floor() as isize;
        if row >= 0 && row < num_bins && col >= 0 && col < num_bins {
            indata[row as usize][col as usize] += 1.0;
        } else {
            errors += 1;
        }
    }
    (indata, errors)
}

fn _cull_vector3d_data2(
    data: &[Vec<f64>],
    xstep: f64,
    vscale: f64,
    totalrays: usize,
) -> (Vec<f64>, Vec<f64>) {
    let cpt = data[0].len() / 2;

    let ys = (0..data[0].len())
        .map(|i| vscale * (data[i][cpt] + data[cpt][i]) / (2.0 * totalrays as f64))
        .collect::<Vec<f64>>();

    let xs = (0..cpt).map(|i| xstep * i as f64).collect::<Vec<f64>>();

    let ys2 = ys[cpt..]
        .iter()
        .zip(ys[cpt - 1..].iter().rev())
        .map(|(y1, y2)| (y1 + y2) / 2.0)
        .collect::<Vec<f64>>();

    let mut ys = ys[..cpt].to_vec();
    ys.append(&mut ys2.clone());

    (xs, ys)
}

fn cull_vector3d_data(
    data: &Vec<Vec<f64>>,
    xstep: f64,
    vscale: f64,
    totalrays: usize,
) -> (Vec<f64>, Vec<f64>) {
    let cpt = data[0].len() / 2; // if passing an even array???

    let mut ytemp: Vec<f64> = Vec::new();
    let mut ys: Vec<f64> = Vec::new();

    // generate x data
    let xs = (0..cpt).map(|i| xstep * i as f64).collect::<Vec<f64>>();

    // average center row and center columns to smooth data
    for i in 0..data[0].len() {
        ytemp.push(vscale * (data[i][cpt] + data[cpt][i]) / (2.0 * totalrays as f64));
    }

    // Average front half and back have of line data
    for i in 0..cpt {
        ys.push((ytemp[cpt - i] + ytemp[cpt + i]) / 2.0);
    }

    (xs, ys)
}

// not sure this is the best way to do this.
// this function will take an x data array with values from 0.0 to some number +xi
// and create mirrored arrays for -xi to xi
// -xi & xi have the same y values
fn mirror_data_array(xs: &[f64], ys: &[f64]) -> (Vec<f64>, Vec<f64>) {
    let mut xdata = vec![0.0; xs.len() * 2];
    let mut ydata = vec![0.0; ys.len() * 2];

    let midpt = xs.len();

    for i in 0..xs.len() {
        xdata[midpt + i] = xs[i];
        ydata[midpt + i] = ys[i];
        xdata[midpt - i] = -xs[i];
        ydata[midpt - i] = ys[i];
    }

    xdata.remove(0);
    ydata.remove(0);

    (xdata, ydata)
}

// average center rows
fn _average_center_rows(array: &Vec<Vec<f64>>) -> Vec<f64> {
    let num_rows = array.len();
    let num_cols = array[0].len();
    let mut result = vec![0.0; num_cols];

    if num_rows % 2 == 0 {
        let middle_row = num_rows / 2;
        let upper_row = middle_row - 1;
        let lower_row = middle_row;

        for j in 0..num_cols {
            result[j] = (array[upper_row][j] + array[lower_row][j]) / 2.0;
        }
    } else {
        let middle_row = num_rows / 2;
        let upper_row = middle_row - 1;
        let lower_row = middle_row + 1;

        for j in 0..num_cols {
            result[j] = (array[upper_row][j] + array[middle_row][j] + array[lower_row][j]) / 3.0;
        }
    }

    result
}

// average_center_cols
fn _average_center_cols(array: &Vec<Vec<f64>>) -> Vec<f64> {
    let num_rows = array.len();
    let num_cols = array[0].len();
    let mut result = vec![0.0; num_rows];

    if num_cols % 2 == 0 {
        let middle_col = num_cols / 2;
        let left_col = middle_col - 1;
        let right_col = middle_col;

        for j in 0..num_rows {
            result[j] = (array[j][left_col] + array[j][right_col]) / 2.0;
        }
    } else {
        let middle_col = num_cols / 2;
        let left_col = middle_col - 1;
        let right_col = middle_col + 1;

        for j in 0..num_rows {
            result[j] = (array[j][left_col] + array[j][middle_col] + array[j][right_col]) / 3.0;
        }
    }

    result
}

fn _average_halves(array: &Vec<f64>) -> Vec<f64> {
    let num_elements = array.len();
    let middle_index = num_elements / 2;
    let mut result = vec![0.0; middle_index];

    for j in 0..middle_index {
        result[j] = (array[j] + array[num_elements - j - 1]) / 2.0;
    }

    if num_elements % 2 != 0 {
        result.push(array[middle_index]);
    }

    result
}
