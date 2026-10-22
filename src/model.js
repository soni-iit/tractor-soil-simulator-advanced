/*  Tractor–Soil Interaction Simulator v2 — physics core
 *  Works in the browser (window.TSM) and in Node (require).
 *  Units: SI.  Forces kN, lengths m, pressure/CI kPa, mass kg.
 *  Every equation here is documented in docs/MODEL.md with its source.
 */
(function (root) {
  'use strict';
  var G = 9.81;
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var TSM = {};

  /* ---------- 1. Tyre geometry (nominal size → b, d, section height) ---------- */
  // Nominal agricultural tyre: section width w [in], rim diameter [in]. Overall d = rim + 2·AR·w.
  TSM.tyreFromNominal = function (wIn, rimIn, ar) {
    ar = ar || 0.85;
    var b = wIn * 0.0254, d = (rimIn + 2 * ar * wIn) * 0.0254;
    return { b: b, d: d, h: (d - rimIn * 0.0254) / 2 };
  };


  // Metric/radial designation e.g. 480/70R34 : section width [mm], aspect ratio [%], rim [in]
  TSM.tyreFromMetric = function (swMm, arPct, rimIn) {
    var b = swMm / 1000, h = b * arPct / 100, d = rimIn * 0.0254 + 2 * h;
    return { b: b, d: d, h: h };
  };

  /* ---------- 2. Contact patch & deflection ratio δ/h ----------
   * Mean contact pressure p_c = kp · p_i   (kp ≈ 1.0–1.9 reported, default 1.3; data.js)
   * A = W / p_c ;  L = A / (π/4·b) ;  δ from chord geometry  L = 2√(dδ − δ²)  ->  δ = d/2·(1 − √(1 − (L/d)²))
   * If the user knows the measured footprint area, it overrides the estimate.               */
  TSM.contact = function (t, Wkn, infl_kPa, opt) {
    opt = opt || {};
    var kp = opt.kp || 1.3, lug = opt.lug || 0.6;
    var pc = kp * infl_kPa;                          // mean NET contact pressure (lug-contact area basis)
    var Ag = opt.areaM2 || (Wkn / pc / lug);         // GROSS footprint (envelope incl. lug gaps)
    var A = opt.areaM2 ? opt.areaM2 * lug : Wkn / pc; // net area used for stress
    var L = clamp(Ag / (Math.PI / 4 * t.b), 0.05, 0.95 * t.d);
    var delta = t.d / 2 * (1 - Math.sqrt(1 - Math.pow(L / t.d, 2)));
    var dh = clamp(delta / t.h, 0.03, 0.45);
    return { A: A, Ag: Ag, L: L, pc: Wkn / A, delta: delta, dh: dh };
  };

  /* ---------- 3. Brixius (1987) / ASABE D497.7 wheel-numeric traction ----------
   * Bn = (CI·b·d / W) · (1+5δ/h)/(1+3b/d)
   * Bias:   μg = 0.88(1−e^{−0.1Bn})(1−e^{−7.5s}) + 0.04 ;  ρ = 1/Bn + 0.04 + 0.5 s/√Bn
   * Radial: μg = 0.88(1−e^{−0.1Bn})(1−e^{−9.5s}) + 0.0325 ; ρ = 0.9/Bn + 0.0325 + 0.5 s/√Bn
   * kCI and kRho are field-calibration multipliers (1 = textbook).                      */
  TSM.brixius = function (p) {
    var CI = p.CI * (p.kCI || 1);
    var Bn = (CI * p.b * p.d / p.W) * (1 + 5 * p.dh) / (1 + 3 * p.b / p.d);
    var s = clamp(p.s, 0, 0.95), mu, rho;
    if (p.radial) {
      mu = 0.88 * (1 - Math.exp(-0.1 * Bn)) * (1 - Math.exp(-9.5 * s)) + 0.0325;
      rho = 0.9 / Bn + 0.0325 + 0.5 * s / Math.sqrt(Bn);
    } else {
      mu = 0.88 * (1 - Math.exp(-0.1 * Bn)) * (1 - Math.exp(-7.5 * s)) + 0.04;
      rho = 1 / Bn + 0.04 + 0.5 * s / Math.sqrt(Bn);
    }
    rho *= (p.kRho || 1);
    return { Bn: Bn, mu: mu, rho: rho, gross: p.W * mu, roll: p.W * rho, net: p.W * (mu - rho),
             te: (mu - rho) / mu * (1 - s) };
  };

  /* ---------- 4. Whole-tractor model ----------
   * cfg: { mass, rearFrac, wheelbase, hitchH, drive:'2WD'|'MFWD'|'4WD', lead (front lead, 0.0–0.08),
   *        rear:{b,d,h,infl,radial,areaM2?}, front:{...}, nRear:2|4(duals count wheels), kp }
   * soil: { CI [kPa], kCI, kRho }
   * Axle loads: static + dynamic transfer ΔW = DP·hd/WB (drawbar pull DP, hitch height hd).
   * Front slip: sF = 1 − (1−sR)/(1+lead)  (negative lead clipped at 0 slip when lead<0).   */
  TSM.axleLoads = function (cfg, DP) {
    var W = cfg.mass * G / 1000;
    var Wr0 = cfg.rearFrac * W, Wf0 = W - Wr0;
    var dW = DP * cfg.hitchH / cfg.wheelbase;
    var Wr = Wr0 + dW, Wf = Math.max(0.02 * W, Wf0 - dW);
    return { W: W, Wr: Wr, Wf: Wf, dW: dW };
  };

  function axleResult(t, Wax, nW, s, soil, driven, kp, lug) {
    var Wwheel = Wax / nW;
    var c = TSM.contact(t, Wwheel, t.infl, { kp: kp, lug: lug, areaM2: t.areaM2 });
    var r = TSM.brixius({ CI: soil.CI, b: t.b, d: t.d, W: Wwheel, s: driven ? s : 0, dh: c.dh,
                          radial: t.radial, kCI: soil.kCI, kRho: soil.kRho });
    return { contact: c, br: r, gross: driven ? Wax * r.mu : 0, roll: Wax * r.rho,
             pull: driven ? Wax * (r.mu - r.rho) : -Wax * r.rho };
  }

  // Evaluate the tractor at rear-wheel slip sR for a given drawbar pull (load transfer depends on DP).
  TSM.tractorAt = function (cfg, soil, DP, sR) {
    var ax = TSM.axleLoads(cfg, DP);
    var frontDriven = cfg.drive !== '2WD';
    var sF = frontDriven ? Math.max(0, 1 - (1 - sR) / (1 + (cfg.lead || 0))) : 0;
    var R = axleResult(cfg.rear, ax.Wr, cfg.nRear || 2, sR, soil, true, cfg.kp, cfg.lug);
    var F = axleResult(cfg.front, ax.Wf, 2, sF, soil, frontDriven, cfg.kp, cfg.lug);
    var pull = R.pull + F.pull;
    var gross = R.gross + F.gross;
    // Exact tractive efficiency with different axle slips: TE = DP / Σ(GTR_ax /(1−s_ax))
    var inP = R.gross / (1 - sR) + (frontDriven ? F.gross / (1 - sF) : 0);
    // rolling-resistance of free front wheels is already inside pull; add it back to "input" via net balance
    var te = DP > 0 && inP > 0 ? DP / (inP) : 0;
    return { ax: ax, sR: sR, sF: sF, R: R, F: F, pull: pull, gross: gross, te: clamp(te, 0, 1), frontDriven: frontDriven };
  };

  // Net pull available at slip sR when the *required* DP is itself used for load transfer: solve self-consistently.
  TSM.pullCapacity = function (cfg, soil, sR) {
    var DP = 0;
    for (var k = 0; k < 40; k++) {
      var r = TSM.tractorAt(cfg, soil, DP, sR);
      var nd = Math.max(0, r.pull);
      if (Math.abs(nd - DP) < 1e-6) { DP = nd; break; }
      DP = DP + 0.6 * (nd - DP);
    }
    return TSM.tractorAt(cfg, soil, DP, sR);
  };

  // Curve over slip (self-consistent pull)
  TSM.curve = function (cfg, soil, n, smax) {
    n = n || 80; smax = smax || 0.4; var out = [];
    for (var i = 0; i <= n; i++) {
      var s = smax * i / n, r = TSM.pullCapacity(cfg, soil, s);
      out.push({ s: s, pull: r.pull, te: r.te, gross: r.gross, ratio: r.pull / r.ax.W, r: r });
    }
    return out;
  };

  // Inverse problem: given drawbar pull DP (kN) find slip & TE.  null if beyond capacity.
  TSM.solveForDraft = function (cfg, soil, DP) {
    var lo = 0.0005, hi = 0.6, f = function (s) { return TSM.tractorAt(cfg, soil, DP, s).pull - DP; };
    // pull(s) rises then may fall: find the max by scan, then bisect on the rising branch
    var smax = lo, fmax = -1e9;
    for (var s = 0.002; s <= hi; s += 0.002) { var v = f(s); if (v > fmax) { fmax = v; smax = s; } }
    if (fmax < 0) return { ok: false, maxPull: DP + fmax, sAtMax: smax };
    var a = lo, b = smax;
    if (f(a) >= 0) return { ok: true, res: TSM.tractorAt(cfg, soil, DP, a) };
    for (var i = 0; i < 60; i++) { var m = (a + b) / 2; if (f(m) < 0) a = m; else b = m; }
    return { ok: true, res: TSM.tractorAt(cfg, soil, DP, b) };
  };

  // Slip at maximum tractive efficiency (self-consistent curve)
  TSM.optimum = function (cfg, soil) {
    var c = TSM.curve(cfg, soil, 160, 0.4), best = c[0];
    for (var i = 1; i < c.length; i++) if (c[i].te > best.te) best = c[i];
    return best;
  };

  /* ---------- 5. Field calibration ----------
   * Given measured cases [{CI, DP, slip(%), te, label}] for the same tractor, find (kCI, kRho)
   * minimising  Σ [ (ln(s_pred/s_meas))² + ((te_pred−te_meas)/0.05)² ].
   * Returns {kCI,kRho,rms_slip_pts,rms_te,rows}.  With one case the problem is under-determined:
   * we fit kCI only to the slip and report kRho=1 unless useTE is requested. */
  TSM.predictCase = function (cfg, c, kCI, kRho) {
    var soil = { CI: c.CI, kCI: kCI, kRho: kRho };
    var r = TSM.solveForDraft(cfg, soil, c.DP);
    return r.ok ? { slip: r.res.sR * 100, te: r.res.te } : { slip: NaN, te: NaN };
  };

  // Exact two-parameter fit for ONE case: kCI matches the measured slip, kRho the measured tractive efficiency.
  TSM.fitCase = function (cfg, c) {
    var kRho = 1, kCI = 1, it, p;
    function fitK(kr) { var b = [1e9, 1]; for (var k = 0.1; k <= 2.0001; k += 0.005) { var q = TSM.predictCase(cfg, c, k, kr); if (!isNaN(q.slip)) { var e = Math.abs(q.slip - c.slip); if (e < b[0]) b = [e, k]; } } return b[1]; }
    for (it = 0; it < 6; it++) {
      kCI = fitK(kRho);
      if (!c.te) break;
      var bb = [1e9, kRho];
      for (var r = 0.1; r <= 2.0001; r += 0.01) { var q = TSM.predictCase(cfg, c, kCI, r); if (!isNaN(q.te)) { var e = Math.abs(q.te - c.te); if (e < bb[0]) bb = [e, r]; } }
      if (Math.abs(bb[1] - kRho) < 0.005) { kRho = bb[1]; break; }
      kRho = bb[1];
    }
    kCI = fitK(kRho); p = TSM.predictCase(cfg, c, kCI, kRho);
    return { kCI: kCI, kRho: kRho, slip: p.slip, te: p.te };
  };
  TSM.calibrate = function (cfg, cases, opt) {
    opt = opt || {};
    var fitRho = opt.fitRho !== false && cases.length >= 3;
    var best = { err: 1e18, kCI: 1, kRho: 1 };
    var ks = [], kr = [];
    for (var k = 0.3; k <= 1.6001; k += 0.02) ks.push(k);
    if (fitRho) for (var j = 0.3; j <= 1.6001; j += 0.04) kr.push(j); else kr = [1];
    ks.forEach(function (a) {
      kr.forEach(function (b) {
        var e = 0;
        cases.forEach(function (c) {
          var p = TSM.predictCase(cfg, c, a, b);
          if (isNaN(p.slip)) { e += 50; return; }
          e += Math.pow(Math.log(p.slip / c.slip), 2);
          if (fitRho && c.te) e += Math.pow((p.te - c.te) / 0.05, 2);
        });
        if (e < best.err) best = { err: e, kCI: a, kRho: b };
      });
    });
    var rows = cases.map(function (c) {
      var p0 = TSM.predictCase(cfg, c, 1, 1), p1 = TSM.predictCase(cfg, c, best.kCI, best.kRho);
      return { label: c.label, meas: { slip: c.slip, te: c.te }, textbook: p0, calibrated: p1 };
    });
    var rs = 0, rt = 0, n = 0;
    rows.forEach(function (r) { if (!isNaN(r.calibrated.slip)) { rs += Math.pow(r.calibrated.slip - r.meas.slip, 2); rt += Math.pow(r.calibrated.te - (r.meas.te || r.calibrated.te), 2); n++; } });
    return { kCI: best.kCI, kRho: best.kRho, rows: rows, rmsSlip: Math.sqrt(rs / Math.max(1, n)), rmsTE: Math.sqrt(rt / Math.max(1, n)), n: cases.length, fitRho: fitRho };
  };

  /* ---------- 6. Bekker–Wong rigid-wheel cross-check (independent theory) ----------
   * p = (kc/b + kφ) z^n.  Rigid-wheel sinkage  z0 = [3W /((3−n)(kc/b+kφ)√d)]^{2/(2n+1)}
   * Compaction resistance Rc = b (kc/b+kφ) z0^{n+1}/(n+1)   (Bekker 1960; Wong 2010)
   * Thrust (Janosi–Hanamoto) H = (A c + W tanφ)[1 − (K/(sL))(1 − e^{−sL/K})],  A=bL, L=√(d·z0)·… (contact length ≈ √(d z0)·√... )
   * Units: kc [kN/m^{n+1}], kφ [kN/m^{n+2}], c [kPa], K [m], W [kN].                           */
  TSM.bekkerWheel = function (soil, b, d, Wkn, s) {
    var n = soil.n, kk = soil.kc / b + soil.kphi;
    var z0 = Math.pow(3 * Wkn / ((3 - n) * kk * Math.sqrt(d)), 2 / (2 * n + 1));
    z0 = Math.min(z0, 0.45 * d);
    var Rc = b * kk * Math.pow(z0, n + 1) / (n + 1);
    var L = Math.sqrt(d * z0) * 1.0 + 0.0;                 // chord of the rigid-wheel arc ≈ 2√(d z0)/2 *2 ⇒ use half-chord ×2 below
    L = 2 * Math.sqrt(d * z0 - z0 * z0);
    var A = b * L, tphi = Math.tan(soil.phi * Math.PI / 180);
    var sL = Math.max(s * L, 1e-9);
    var H = (A * soil.c + Wkn * tphi) * (1 - (soil.K / sL) * (1 - Math.exp(-sL / soil.K)));
    var Rr = Rc + 0.04 * 0;                                // bulldozing / tyre hysteresis neglected (rigid wheel)
    return { z0: z0, Rc: Rc, H: H, DP: H - Rc, L: L, mu: H / Wkn, rho: Rc / Wkn };
  };

  /* ---------- 7. Stress under the tyre & subsoil compaction risk ----------
   * Fröhlich/Söhne concentration-factor form for a uniformly loaded circle, on the axis:
   *   σz = p·[1 − (z²/(a²+z²))^{ν/2}]      (ν=3 reproduces Boussinesq, Keller & Or 2022, Eq. 1)
   * a = √(A/π) equivalent radius, p = W/A mean contact stress.                          */
  TSM.stressAt = function (p_kPa, A_m2, z, nu) {
    var a = Math.sqrt(A_m2 / Math.PI);
    return p_kPa * (1 - Math.pow(z * z / (a * a + z * z), (nu || 4) / 2));
  };
  TSM.stressProfile = function (p_kPa, A_m2, nu, zmax) {
    var out = [];
    for (var z = 0; z <= (zmax || 1.0) + 1e-9; z += 0.025) out.push({ z: z, s: TSM.stressAt(p_kPa, A_m2, z, nu) });
    return out;
  };
  // SCSI = σ(0.5 m) / strength(0.5 m)  >1 → risk of chronic subsoil compaction (Keller & Or 2022)
  TSM.scsi = function (p_kPa, A_m2, nu, strength_kPa) {
    var s = TSM.stressAt(p_kPa, A_m2, 0.5, nu);
    return { stress: s, scsi: s / (strength_kPa || 50) };
  };

  /* ---------- 8. Compaction law (Raghavan-type) ----------
   * Δγd = A · log10(N · p/p0) · fw   — maximum density change vs passes N and contact pressure p
   * (McKyes 1985 §5, after Raghavan et al. 1977: γd = γ0 + A1 log(Np) + B1 log(w%), w < optimum).
   * A, p0 are soil-specific.  The shipped presets are *indicative* (see data.js).            */
  TSM.compaction = function (gamma0, N, p_kPa, A, p0, wRatio) {
    var x = N * p_kPa / (p0 || 100);
    var d = A * Math.log10(Math.max(x, 1));
    return gamma0 + d * clamp(wRatio == null ? 1 : wRatio, 0.2, 1.2);
  };

  /* ---------- 9. Utilities ---------- */
  TSM.G = G; TSM.clamp = clamp;
  TSM.fitLog = function (xs, ys) {                // y = a + b·log10 x
    var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    xs.forEach(function (x, i) { var lx = Math.log10(x); sx += lx; sy += ys[i]; sxx += lx * lx; sxy += lx * ys[i]; });
    var b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n;
    return { a: a, b: b };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TSM; else root.TSM = TSM;
})(typeof window !== 'undefined' ? window : this);
