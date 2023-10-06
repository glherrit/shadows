pub fn fittofermi_dirac(
    xs: &[f64],
    ys: &[f64],
    betaest: f64,
    radiusest: f64,
    peakest: f64,
) -> Vec<f64> {
    let mut delta: f64;
    let mut b = betaest;
    let mut r = radiusest;
    let mut p = peakest;

    for _k in 0..15 {
        for _j in 0..15 {
            let mut db = 1.0;
            let mut dr = 0.01;
            let mut dp = 1.0;
            let mintweakstep = 1e-5;
            for _i in 0..15 {
                let res = find_direction_beta(&xs, &ys, b, r, p, db);
                delta = res.0;
                b += delta;
                if delta < mintweakstep {
                    db /= 10.0;
                }

                let res = find_direction_radius(&xs, &ys, b, r, p, dr);
                delta = res.0;
                r += delta;
                if delta < mintweakstep {
                    dr /= 10.0;
                }

                let res = find_direction_peak(&xs, &ys, b, r, p, dp);
                delta = res.0;
                p += delta;
                if delta < mintweakstep {
                    dp /= 10.0;
                }
            }
        }
    }

    let mut yfermi = vec![0.0; ys.len()];
    for (i, y) in ys.iter().enumerate() {
        let yval = fermi_dirac(xs[i], b, r, p);
        yfermi[i] = if yval > 1.0 { 1.0 } else { yval }; // compensate for numerical error
                                                         //yfermi[i] = yval;
    }

    yfermi
}

pub fn calc_fermi_dirac_coef(
    xs: &[f64],
    ys: &[f64],
    betaest: f64,
    radiusest: f64,
    peakest: f64,
) -> (f64, f64, f64) {
    let mut delta: f64;
    let mut b = betaest;
    let mut r = radiusest;
    let mut p = peakest;

    for _k in 0..15 {
        for _j in 0..15 {
            let mut db = 1.0;
            let mut dr = 0.01;
            let mut dp = 1.0;
            let mintweakstep = 1e-5;
            for _i in 0..15 {
                let res = find_direction_beta(&xs, &ys, b, r, p, db);
                delta = res.0;
                b += delta;
                if delta < mintweakstep {
                    db /= 10.0;
                }

                let res = find_direction_radius(&xs, &ys, b, r, p, dr);
                delta = res.0;
                r += delta;
                if delta < mintweakstep {
                    dr /= 10.0;
                }

                let res = find_direction_peak(&xs, &ys, b, r, p, dp);
                delta = res.0;
                p += delta;
                if delta < mintweakstep {
                    dp /= 10.0;
                }
            }
        }
    }

    (b, r, p)
}

fn fermi_dirac(xp: f64, beta: f64, r50p: f64, peak: f64) -> f64 {
    peak / (1.0 + (beta * (xp.abs() / r50p - 1.0)).exp())
}

fn gen_fermi_dirac(beta: f64, r50p: f64, peak: f64, xs: &[f64]) -> Vec<f64> {
    let mut ys: Vec<f64> = vec![0.0; xs.len()];
    for (i, &x) in xs.iter().enumerate() {
        ys[i] = fermi_dirac(x, beta, r50p, peak);
    }
    ys
}

fn find_direction_beta(xs: &[f64], y0: &[f64], b: f64, r: f64, p: f64, db: f64) -> (f64, f64) {
    let mut betabase = b;
    let center = calc_error_function(y0, &gen_fermi_dirac(betabase, r, p, xs));

    betabase = b + db;
    let right = calc_error_function(y0, &gen_fermi_dirac(betabase, r, p, xs));

    betabase = b - db;
    let left = calc_error_function(y0, &gen_fermi_dirac(betabase, r, p, xs));

    if left < center {
        return (-db, left);
    }
    if right < center {
        return (db, right);
    }
    (0.0, center)
}

fn find_direction_radius(xs: &[f64], y0: &[f64], b: f64, r: f64, p: f64, dr: f64) -> (f64, f64) {
    let mut radiusbase = r;
    let center = calc_error_function(y0, &gen_fermi_dirac(b, radiusbase, p, xs));

    radiusbase = r + dr;
    let right = calc_error_function(y0, &gen_fermi_dirac(b, radiusbase, p, xs));

    radiusbase = r - dr;
    let left = calc_error_function(y0, &gen_fermi_dirac(b, radiusbase, p, xs));

    if left < center {
        return (-dr, left);
    }
    if right < center {
        return (dr, right);
    }
    (0.0, center)
}

fn find_direction_peak(xs: &[f64], y0: &[f64], b: f64, r: f64, p: f64, dp: f64) -> (f64, f64) {
    let mut peakbase = p;
    let center = calc_error_function(y0, &gen_fermi_dirac(b, r, peakbase, xs));

    peakbase = p + dp;
    let right = calc_error_function(y0, &gen_fermi_dirac(b, r, peakbase, xs));

    peakbase = p - dp;
    let left = calc_error_function(y0, &gen_fermi_dirac(b, r, peakbase, xs));

    if left < center {
        return (-dp, left);
    }
    if right < center {
        return (dp, right);
    }
    (0.0, center)
}

fn calc_error_function(y0: &[f64], y1: &[f64]) -> f64 {
    let mut err = 0.0;
    for i in 0..y0.len() {
        err += (y0[i] - y1[i]).powi(2);
    }
    err.sqrt()
}
