use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub enum SurfaceType {
    Plane,
    Sphere,
    Asphere,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Side {
    pub r: f64,
    pub k: f64,
    pub ad: f64,
    pub ae: f64,
}

impl Side {
    pub fn new(r: f64, k: f64, ad: f64, ae: f64) -> Side {
        Side { r, k, ad, ae }
    }

    pub fn surf_type(&self) -> SurfaceType {
        if f64::abs(self.r) < 0.01
            && f64::abs(self.k) < 1e-8
            && f64::abs(self.ad) < 1e-20
            && f64::abs(self.ae) < 1e-20
        {
            SurfaceType::Plane
        } else if f64::abs(self.ad) < 1e-20 && f64::abs(self.ae) < 1e-20 {
            SurfaceType::Sphere
        } else {
            SurfaceType::Asphere
        }
    }

    pub fn curv(&self) -> f64 {
        if self.r == 0. {
            0.
        } else {
            1. / self.r
        }
    }

    // #[wasm_bindgen(js_name = curv, setter)]
    pub fn set_curv(&mut self, curv: f64) {
        if curv == 0. {
            self.r = 0.;
        } else {
            self.r = 1. / curv;
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lens {
    pub diameter: f64,
    pub clear_ap: f64,
    pub ct: f64,
    pub n_index: f64,
    pub side1: Side,
    pub side2: Side,
}

impl Lens {
    pub fn new(
        diameter: f64,
        clear_ap: f64,
        ct: f64,
        n_index: f64,
        side1: Side,
        side2: Side,
    ) -> Self {
        Self {
            diameter,
            clear_ap,
            ct,
            n_index,
            side1,
            side2,
        }
    }

    pub fn efl(&self) -> f64 {
        let phi = (self.n_index - 1.)
            * (self.side1.curv() - self.side2.curv()
                + ((self.n_index - 1.) * self.ct * self.side1.curv() * self.side2.curv())
                    / self.n_index);
        1. / phi
    }

    pub fn bfl(&self) -> f64 {
        let efl = self.efl();
        let pp = (self.n_index - 1.) * self.side1.curv() * efl * (1. / self.n_index) * self.ct;
        efl - pp
    }
}
