use super::{
    ray_vector::{Ray, Vector3D, CPROPV},
    trace_ray,
};
use crate::lens::Lens;
use std::f64::consts::SQRT_2;

#[derive(Clone)]
#[repr(C)]
pub struct WFE_Ray {
    pub rstart: Ray,
    pub rend: Ray,
    pub opd: f64,
    pub lsa: f64,
    pub ix: i32,
    pub iy: i32,
    pub isvalid: bool,
}

#[derive(Copy, Clone)]
#[repr(C)]
pub struct WFE_Stats {
    pub minopd: f64,
    pub maxopd: f64,
    pub varirms: f64,
}

#[repr(C)]
pub struct ErrorStat {
    peak: f64,
    valley: f64,
    pv: f64,
    average: f64,
    rms: f64,
}

fn calc_wfe_stats(
    ptr1: *mut f64,
    rayct: usize,
    lens: &Lens,
    wavelength: f64,
    refocus: f64,
) -> ErrorStat {
    let ray_ys: &mut [f64] = unsafe { std::slice::from_raw_parts_mut(ptr1, rayct) };

    let mut sum: f64 = 0.0;
    let mut sumsum: f64 = 0.0;
    let mut peak: f64 = -1.0e20;
    let mut valley: f64 = 1.0e20;

    let mut _mlens: Lens = lens.clone();

    for i in 0..rayct {
        let wfe = calc_opd_slim(
            Vector3D {
                x: 0.0,
                y: ray_ys[i] * lens.diameter / 2.,
                z: 0.0,
            },
            CPROPV,
            &lens,
            wavelength,
            refocus,
        );
        if wfe > peak {
            peak = wfe
        }
        if wfe < valley {
            valley = wfe
        }
        sum += wfe;
        sumsum += wfe * wfe;
    }
    let estat = ErrorStat {
        peak,
        valley,
        pv: (peak - valley),
        average: sum / rayct as f64,
        rms: (sumsum / rayct as f64).sqrt(),
    };
    return estat;
}

// this opd calc is used specifically for FFT2D calculations and is optimized for only opd
pub fn calc_opd_slim(
    p0: Vector3D,
    e0: Vector3D,
    lens: &Lens,
    wavelength: f64,
    refocus: f64,
) -> f64 {
    //let sqr2 = 2_f64.sqrt();

    let p1 = Vector3D {
        x: (p0.x / SQRT_2),
        y: (p0.y / SQRT_2),
        z: 1.0,
    };

    let rsq = p0.x * p0.x + p0.y * p0.y;

    if rsq < 1.0e-10 {
        return 0.0_f64;
    }

    let rsqsq = rsq * rsq;

    let rm = trace_ray(
        &Ray {
            pvector: p0.clone(),
            edir: e0.clone(),
        },
        lens,
        0.0,
    );
    //let ym = rm.pvector;
    let (ymaoi, ymlsa) = rm.calc_aoi_lsa();

    let rz = trace_ray(
        &Ray {
            pvector: p1.clone(),
            edir: e0.clone(),
        },
        lens,
        0.0,
    );
    //let yz = rz.pvector;
    let (_yzaoi, yzlsa) = rz.calc_aoi_lsa();

    let rfinal = trace_ray(
        &Ray {
            pvector: p0.clone(),
            edir: e0.clone(),
        },
        lens,
        refocus,
    );
    //let yfinal = rfinal.pvector;
    let (_yfaoi, _yflsa) = rfinal.calc_aoi_lsa();

    let a = (4.0 * yzlsa - ymlsa) / rsq;
    let b = (2.0 * ymlsa - 4.0 * yzlsa) / rsqsq;

    1000.0 * (ymaoi.sin() * ymaoi.sin() / 2.0) * (refocus - a * rsq / 2.0 - b * rsqsq / 3.0)
        / wavelength
}

fn rcalc_wfe(p0: Vector3D, e0: Vector3D, lens: &Lens, wavelength: f64, refocus: f64) -> f64 {
    let p1 = Vector3D {
        x: (p0.x / SQRT_2),
        y: (p0.y / SQRT_2),
        z: 1.0,
    };

    let rsq = p0.x * p0.x + p0.y * p0.y;
    let rsqsq = rsq * rsq;

    let rm = trace_ray(
        &Ray {
            pvector: p0.clone(),
            edir: e0.clone(),
        },
        lens,
        0.0,
    );
    //let ym = rm.pvector;
    let (ymaoi, ymlsa) = rm.calc_aoi_lsa();

    let rz = trace_ray(
        &Ray {
            pvector: p1.clone(),
            edir: e0.clone(),
        },
        lens,
        0.0,
    );
    //let yz = rz.pvector;
    let (_yzaoi, yzlsa) = rz.calc_aoi_lsa();

    //let rfinal = trace_ray(p0, e0, lens, refocus);
    //let yfinal = rfinal.pvector;
    //let (yfaoi, yflsa) = calc_aoi_lsa(rfinal);

    let a = (4.0 * yzlsa - ymlsa) / rsq;
    let b = (2.0 * ymlsa - 4.0 * yzlsa) / rsqsq;

    1000.0 * (ymaoi.sin() * ymaoi.sin() / 2.0) * (refocus - a * rsq / 2.0 - b * rsqsq / 3.0)
        / wavelength
}

fn gen_and_trace_wfe_rays(
    ptr: *mut WFE_Ray,
    npts: usize,
    loopsize: usize,
    lens: Lens,
    wavelength: f64,
    refocus: f64,
) -> WFE_Stats {
    let din: &mut [WFE_Ray] = unsafe { std::slice::from_raw_parts_mut(ptr, npts) };

    gen_wfe_rays(lens.diameter / 2., npts, din, loopsize);

    let mut wstats = WFE_Stats {
        minopd: 1e20,
        maxopd: -1e20,
        varirms: 0.0,
    };

    let mut xsum = 0.0;
    let mut xsumsq = 0.0;
    let mut cts = 1.0;

    for i in 0..npts {
        if din[i].isvalid {
            calc_wfe_ray(&mut din[i], &lens, wavelength, refocus);
            if !din[i].opd.is_nan() {
                if din[i].opd > wstats.maxopd {
                    wstats.maxopd = din[i].opd;
                }
                if din[i].opd < wstats.minopd {
                    wstats.minopd = din[i].opd;
                }

                xsum += din[i].opd;
                xsumsq += din[i].opd * din[i].opd;
                cts += 1.0;
            }
        }
    }
    wstats.varirms = ((xsumsq - xsum * xsum / cts) / (cts - 1.0)).sqrt();

    wstats
}

fn gen_wfe_rays(apert: f64, _size: usize, din: &mut [WFE_Ray], loopsize: usize) {
    let mut x: f64;
    let mut y: f64;
    let diag = apert * apert;

    let step = 2.0 * apert / (loopsize - 1) as f64;
    let mut count = 0usize;

    //let dirvector = Vector3D{x: 0.0f64, y: 0.0f64, z: 1.0f64};

    for row in 0..loopsize {
        y = apert - row as f64 * step;
        for col in 0..loopsize {
            x = -apert + col as f64 * step;

            din[count].rstart.pvector = Vector3D { x: x, y: y, z: 0.0 };
            din[count].rstart.edir = CPROPV;
            din[count].ix = col as i32;
            din[count].iy = row as i32;
            din[count].isvalid = diag > x * x + y * y;

            count += 1
        }
    }
}

fn calc_wfe_ray(wferay: &mut WFE_Ray, lens: &Lens, wavelength: f64, refocus: f64) {
    let p0 = wferay.rstart.pvector.clone();
    let e0 = wferay.rstart.edir.clone();

    let p1 = Vector3D {
        x: (p0.x / SQRT_2),
        y: (p0.y / SQRT_2),
        z: 1.0,
    };

    let rsq = p0.x * p0.x + p0.y * p0.y;

    if rsq < 0.0000001 {
        //wferay.rend = Ray{pvector: Vector3D{x: 0f64, y: 0f64, z: lens.ct + lens.bfl + refocus}, edir: Vector3D{x: 0f64, y: 0f64, z: 1f64}};
        wferay.rend = Ray {
            pvector: Vector3D {
                x: 0.0,
                y: 0.0,
                z: lens.ct + lens.bfl() + refocus,
            },
            edir: CPROPV,
        };
        wferay.lsa = 0.0;
        wferay.opd = 0.0;
    }

    let rsqsq = rsq * rsq;

    let rm = trace_ray(
        &Ray {
            pvector: p0.clone(),
            edir: e0.clone(),
        },
        lens,
        0.0,
    );
    //let ym = rm.pvector;
    let (ymaoi, ymlsa) = rm.calc_aoi_lsa();

    let rz = trace_ray(
        &Ray {
            pvector: p1.clone(),
            edir: e0.clone(),
        },
        lens,
        0.0,
    );
    //let yz = rz.pvector;
    let (_yzaoi, yzlsa) = rz.calc_aoi_lsa();

    let rfinal = trace_ray(
        &Ray {
            pvector: p0.clone(),
            edir: e0.clone(),
        },
        lens,
        refocus,
    );
    //let yfinal = rfinal.pvector;
    let (_yfaoi, yflsa) = rfinal.calc_aoi_lsa();
    wferay.rend = rfinal;
    wferay.lsa = yflsa;

    let a = (4.0 * yzlsa - ymlsa) / rsq;
    let b = (2.0 * ymlsa - 4.0 * yzlsa) / rsqsq;

    wferay.opd =
        1000.0 * (ymaoi.sin() * ymaoi.sin() / 2.0) * (refocus - a * rsq / 2.0 - b * rsqsq / 3.0)
            / wavelength;
}
