/*  Tractor–Soil Interaction Simulator v2 — evidence base
 *  Each number carries a source id and a verification status:
 *    'text'       : value read from the article body text / Project book page (open-access full text)
 *    'recalled'   : standard textbook value reproduced from memory of the literature; NOT re-checked against a copy
 *    'derived'    : computed here from 'text' values (formula shown)
 *    'indicative' : fitted/assumed here; use only as a starting point
 *  Anything not stated by the source is recorded as null — it is never guessed.
 */
(function (root) {
  'use strict';
  var D = {};

  D.SOURCES = {
    kim2022:   { cite: 'Kim Y.-S., Lee S.-D., Baek S.-M., Baek S.-Y., Jeon H.-H., Lee J.-H., Kim W.-S., Shim J.-Y., Kim Y.-J. (2022) Analysis of the effect of tillage depth on the working performance of tractor-moldboard plow system under various field environments. Sensors 22(7):2750.', doi: '10.3390/s22072750', pmid: '35408364', status: 'text (tables 1–7 partly truncated; axle loads and tyre inflation not reported)' },
    masiero2011: { cite: 'Masiero F.C., Lanças K.P., Monteiro L.A. (2011) Determinação do rendimento na barra de tração de tratores agrícolas com tração dianteira auxiliar (4x2 TDA). Revista Energia na Agricultura 26(4):55–73.', doi: null, status: 'text (Tables 6–8 values as extracted; "drawbar efficiency" = drawbar power / engine power, not wheel tractive efficiency)' },
    aldosary2023: { cite: 'Al-Dosary N.M.N., Alnajjar F.M., Aboukarima A.E.M. (2023) Estimation of wheel slip in 2WD mode for an agricultural tractor during plowing operation using an artificial neural network. Sci. Rep. 13(1):5975.', doi: '10.1038/s41598-023-32994-7', pmid: '37046038', status: 'text (MLR equations; STI formula garbled in source and not used)' },
    valera2012: { cite: 'Valera D.L., Gil J., Agüera J. (2012) Design of a new sensor for determination of the effects of tractor field usage in southern Spain: soil sinkage and alterations in the cone index and dry bulk density. Sensors 12(10):13480–13490.', doi: '10.3390/s121013480', pmid: '23202006', status: 'text (units of density/CI not stated in table; density assumed kg/m³ - values 1136–1321 are plausible only in kg/m³)' },
    kukharets2025: { cite: 'Kukharets S. et al. (2025) Tractor tyre contact stress and soil stress under CLAAS Xerion 5000 / Trelleborg IF 900/60R42. Sci. Rep. (article s41598-024-84102-y).', doi: '10.1038/s41598-024-84102-y', status: 'text (Eq. 7–11 coefficients; Tables 1–3 not reproduced)' },
    keller2022: { cite: 'Keller T., Or D. (2022) Farm vehicles approaching weights of sauropods exceed safe mechanical limits for soil functioning. PNAS 119(21):e2117699119.', doi: '10.1073/pnas.2117699119', pmid: '35576469', status: 'text (stress model Eq.1–2, ~50 kPa subsoil limit, SCSI>1 criterion)' },
    brixius1987: { cite: 'Brixius W.W. (1987) Traction prediction equations for bias ply tires. ASAE Paper 87-1622; adopted in ASABE D497.7 (2011) Agricultural machinery management data.', doi: null, status: 'recalled (equations reproduced; checked for internal consistency by unit tests)' },
    mckyes1985: { cite: 'McKyes E. (1985) Soil Cutting and Tillage. Elsevier. Ch. 5 (Raghavan et al. 1977 density law); Ch. 6 (tyre rolling resistance).', doi: null, status: 'text (Project book; Eq. 5.1 form only — soil constants not in the extract)' },
    wong2010:  { cite: 'Wong J.Y. (2010) Terramechanics and Off-Road Vehicle Engineering, 2nd ed., Elsevier. Bekker–Wong sinkage, compaction resistance and Janosi–Hanamoto thrust; Table of terrain parameters.', doi: null, status: 'recalled (terrain parameters are widely reproduced; verify against your copy)' },
    thorpe2024: { cite: 'Thorpe D.F. et al. (2024) Impacts of bulk density and water content on the tire-soil contact area of agricultural field vehicles. Acta Sci. Agron. 46(1):e67906.', doi: '10.4025/actasciagron.v46i1.67906', status: 'text, but wheel-load column looks inconsistent with contact areas — NOT used numerically' },
    asabe497: { cite: 'ASABE D497.7 (2011) Agricultural Machinery Management Data — traction chapter; cone-index classes 450/900/1200/1800 kPa.', doi: null, status: 'recalled' }
  };

  /* ---- Field cases for the TE–slip / pull–slip overlay & calibration ---- */
  D.TRACTOR_KIM = { // TX58, 4WD, bias tyres  (Kim 2022)
    name: 'TX58 4WD (Tong Yang Moolsan), 42 kW class', massText: 3894, massTable1: 4072, wheelbase: 2.155,
    rear: { nominal: [14.9, 30], radial: false }, front: { nominal: [11.2, 20], radial: false },
    unknown: ['static axle split', 'tyre inflation', 'hitch height', 'ballast'], source: 'kim2022'
  };
  D.KIM_CASES = [
    { id: 'kim-sl', label: 'Sandy loam (Kim 2022)', soil: 'Sandy loam', CI: 698.7, CIsource: 'mean of SL1–SL3 (0–150 mm): 560.5, 725.3, 810.3', DP: 8.1, DPsd: 1.4, slip: 9.5, slipSd: 0.5, te: 0.70, teSd: 0.02, speed: 6.9, depth_cm: 17.5, w_pct: 17.7, PI: 6.89, source: 'kim2022', status: 'text' },
    { id: 'kim-l',  label: 'Loam (Kim 2022)',       soil: 'Loam',       CI: 563.2, CIsource: 'mean of SL1–SL3: 471.2, 563.1, 655.3',  DP: 10.1, DPsd: 2.5, slip: 13.4, slipSd: 2.4, te: 0.68, teSd: 0.04, speed: 6.2, depth_cm: 16.3, w_pct: 31.6, PI: 13.49, source: 'kim2022', status: 'text' },
    { id: 'kim-cl', label: 'Clay loam (Kim 2022)',  soil: 'Clay loam',  CI: 864.7, CIsource: 'mean of SL1–SL3: 680.8, 900.6, 1012.6', DP: 13.9, DPsd: 2.5, slip: 22.3, slipSd: 3.8, te: 0.61, teSd: 0.03, speed: 4.8, depth_cm: 15.2, w_pct: 24.3, PI: 13.95, source: 'kim2022', status: 'text' }
  ];
  // Kim: clay loam has the HIGHEST CI of the three yet the HIGHEST slip -> CI alone is not a sufficient mobility index in wet, plastic soils.

  /* ---- Surface-class averages: 4×2 TDA (MFWD) tractors, Brazil, tested on concrete & soils (Masiero 2011, Table 7/8) ---- */
  D.MASIERO_SURFACES = [
    { surface: 'Concrete',        eff_pct: 63.2, slip_pct: 7.6,  asabe_eff: 72.2 },
    { surface: 'Firm soil',       eff_pct: 56.5, slip_pct: 11.9, asabe_eff: 63.9 },
    { surface: 'Vegetation cover',eff_pct: 49.7, slip_pct: 14.6, asabe_eff: null },
    { surface: 'Tilled soil',     eff_pct: 44.0, slip_pct: 16.2, asabe_eff: 53.9 }
  ];
  D.MASIERO_NOTE = 'eff = drawbar power / engine power (includes driveline losses). To compare with wheel tractive efficiency divide by the driveline efficiency (assumed 0.85–0.90 here — an assumption, not from the paper).';

  /* ---- Empirical, case-specific slip estimators (valid ONLY inside their domain) ---- */
  D.ALDOSARY = {
    tractor: 'Furat 70 hp, 2WD, drive-wheel inflation 120 kPa (tyre size/ballast not reported)',
    domain: { depth_cm: [10, 25], speed_kmh: [3, 6], mc_pctdb: [8.5, 20.5], STI: [0.342, 0.573], soils: 'clay (STI 0.342) and clay loam (STI 0.573) field plots' },
    eq: {
      chisel:    { c: -6.594, pd: 0.163, mc: -0.109, ps: 2.537, sti: 1.924, R2: 0.967, rmse: 0.570, mean: [6.68, 7.18] },
      moldboard: { c: -8.718, pd: 0.226, mc: -0.092, ps: 3.045, sti: 1.378, R2: 0.919, rmse: 1.514, mean: [8.15, 8.43] },
      disk:      { c: -6.236, pd: 0.227, mc: -0.161, ps: 2.909, sti: 2.034, R2: 0.929, rmse: 0.944, mean: [9.24, 9.59] }
    },
    source: 'aldosary2023', status: 'text'
  };

  /* ---- Tyre contact models measured for specific tyres ---- */
  D.KUKHARETS = {
    tyre: 'Trelleborg IF 900/60R42 on CLAAS Xerion 5000, axle load 119.5 kN, sandy loam (Luvisol)',
    domain: { P_MPa: [0.08, 0.24] },
    area_m2: function (P) { return 0.608 - 3.274 * P + 7.617 * P * P; },   // Eq. 8
    contact_stress_kPa: function (P) { return 41.8 + 1599.4 * P - 3447.2 * P * P; }, // Eq. 9
    permissible: { normal_kPa: 150, shear_kPa: 45, note: 'soil-specific limits stated for that sandy loam' },
    source: 'kukharets2025', status: 'text (R²=0.98 as reported)'
  };
  D.CONTACT_KP = { default: 1.3, range: [1.0, 1.9], note: 'Mean contact pressure / inflation pressure. Default 1.3 is an assumption inside the literature range; override with measured footprint area when you have it.', status: 'indicative' };

  /* ---- Soil mechanics constants ---- */
  D.CI_CLASSES = [ // ASABE D497.7 mobility classes (CI, kPa) 
    { id: 'sand',  label: 'Sand / soft (450 kPa)',     CI: 450 },
    { id: 'soft',  label: 'Soft soil (900 kPa)',       CI: 900 },
    { id: 'tilled',label: 'Tilled soil (1200 kPa)',    CI: 1200 },
    { id: 'firm',  label: 'Firm soil (1800 kPa)',      CI: 1800 }
  ];
  D.BEKKER = [ // kc kN/m^(n+1), kphi kN/m^(n+2), c kPa, phi deg, K m   (Wong 2010 compilation — 'recalled')
    { id: 'drysand',   label: 'Dry sand (LETE)',          n: 1.10, kc: 0.99,  kphi: 1528.43, c: 1.04,  phi: 28, K: 0.025 },
    { id: 'sandyloam', label: 'Sandy loam (Michigan)',    n: 0.70, kc: 5.27,  kphi: 1515.04, c: 1.72,  phi: 29, K: 0.025 },
    { id: 'clayey',    label: 'Clayey soil (Thailand)',   n: 0.50, kc: 13.19, kphi: 692.15,  c: 4.14,  phi: 13, K: 0.025 },
    { id: 'heavyclay', label: 'Heavy clay (wet)',         n: 0.13, kc: 12.70, kphi: 1555.95, c: 68.95, phi: 34, K: 0.006 }
  ];

  D.STRESS = {
    nu: { hard: 4, medium: 5, soft: 6, range: [3, 6], note: 'Fröhlich concentration factor; ν=3 → Boussinesq. Keller & Or 2022 use 3–6 (6 for the upper estimate).' },
    subsoilLimit_kPa: 50, scsiDepth_m: 0.5, source: 'keller2022'
  };

  /* ---- Compaction ---- */
  D.VALERA_PASSES = { // surface dry bulk density vs passes (clay, Spain)  — kg/m3 assumed
    N: [0, 1, 2, 3, 4, 5], gamma: [1135.93, 1245.32, 1285.31, 1287.18, 1307.01, 1320.83],
    ci: [0.982757, 1.26304, 1.27257, 1.29861, 1.31047, 1.31076], ciUnit: 'not stated in paper table (probably MPa)', source: 'valera2012', status: 'text'
  };
  D.RAGHAVAN = { form: 'γd = γ0 + A1·log10(N·p) + B1·log10(w%)   (w below optimum; McKyes 1985 §5.2, Eq. 5.1)', note: 'Soil constants A1, B1 are soil-specific and are NOT provided by the shipped sources; the UI derives an indicative A1 from Valera 2012 (clay) and flags it.', source: 'mckyes1985' };

  /* ---- Tyre database (nominal sizes; geometry derived, AR 0.85 for conventional, listed aspect for radial) ---- */
  D.TYRES = {
    rear: [
      { id: '14.9-30', nom: [14.9, 30], radial: false }, { id: '16.9-30', nom: [16.9, 30], radial: false },
      { id: '18.4-30', nom: [18.4, 30], radial: false }, { id: '18.4-34', nom: [18.4, 34], radial: false },
      { id: '20.8-38', nom: [20.8, 38], radial: false }, { id: '23.1-30', nom: [23.1, 30], radial: false },
      { id: '420/85R30', met: [420, 85, 30], radial: true }, { id: '480/70R34', met: [480, 70, 34], radial: true },
      { id: '520/85R38', met: [520, 85, 38], radial: true }, { id: '650/65R42', met: [650, 65, 42], radial: true }
    ],
    front: [
      { id: '7.50-16', nom: [7.5, 16], radial: false }, { id: '9.5-24', nom: [9.5, 24], radial: false },
      { id: '11.2-20', nom: [11.2, 20], radial: false }, { id: '11.2-24', nom: [11.2, 24], radial: false },
      { id: '13.6-24', nom: [13.6, 24], radial: false }, { id: '14.9-24', nom: [14.9, 24], radial: false },
      { id: '340/85R24', met: [340, 85, 24], radial: true }, { id: '420/70R28', met: [420, 70, 28], radial: true },
      { id: '540/65R30', met: [540, 65, 30], radial: true }
    ],
    note: 'Geometry is nominal. Overall diameter of conventional tyres = rim + 2·0.85·section width. Replace with manufacturer rolling-circumference data for design work.'
  };


  /* ---- Kim et al. 2022: layer data (0–50, 50–100, 100–150, 150–200 mm) used by the "load field case" button ---- */
  D.KIM_LAYERS = {
    'kim-sl': { tex: [68, 20, 12], CI: [560.45, 725.33, 810.29, 879.3],  w: [15.52, 18.07, 19.6, 19.45], BD: [1544, 1644, 1688, 1800], tau: [23.8, 28.75, 36.07, 41.43] },
    'kim-l':  { tex: [40, 48, 12], CI: [471.2, 563.14, 655.3, 1798.1],  w: [32.2, 34.1, 28.4, 24.5],   BD: [1519, 1614, 1662, 1898], tau: [23.9, 30.87, 32.9, 78.4] },
    'kim-cl': { tex: [40, 28, 32], CI: [680.8, 900.6, 1012.6, 1915.5],  w: [26.56, 23.8, 22.49, 20.24], BD: [1899, 1905, 1955, 2021], tau: [64.83, 63.36, 58.49, 87.74] }
  };

  /* ---- Tractor library. 'indicative' = typical class values (NOT a specific model); replace with weighed axle loads. ---- */
  D.TRACTORS = [
    { id: 'mini2',   label: 'Mini 2WD, ~15 kW (indicative)',            kW: 15, drive: '2wd', mass: 750,  fr: 62, wb: 1.45, hd: 0.40, rear: '8.00-18', front: '2wd|5.00-15', inflR: 110, inflF: 220, status: 'indicative' },
    { id: 'compact2',label: 'Compact 2WD, ~20 kW (indicative)',         kW: 20, drive: '2wd', mass: 1100, fr: 62, wb: 1.60, hd: 0.42, rear: '9.5-24',  front: '2wd|5.00-15', inflR: 100, inflF: 220, status: 'indicative' },
    { id: 'utility2',label: 'Utility 2WD, ~30 kW (indicative)',         kW: 30, drive: '2wd', mass: 1500, fr: 63, wb: 1.80, hd: 0.43, rear: '12.4-28', front: '2wd|6.00-16', inflR: 90,  inflF: 200, status: 'indicative' },
    { id: 'std2',    label: 'Standard 2WD, ~37 kW (indicative)',        kW: 37, drive: '2wd', mass: 1900, fr: 65, wb: 1.95, hd: 0.45, rear: '14.9-28', front: '2wd|6.00-16', inflR: 100, inflF: 200, status: 'indicative' },
    { id: 'std4m',   label: 'Standard MFWD, ~45 kW (indicative)',       kW: 45, drive: 'mfwd', mass: 2300, fr: 58, wb: 2.00, hd: 0.45, rear: '14.9-28', front: 'mfwd|9.5-24', inflR: 100, inflF: 150, lead: 2, status: 'indicative' },
    { id: 'large2',  label: 'Large 2WD, ~50 kW (indicative)',           kW: 50, drive: '2wd', mass: 2400, fr: 66, wb: 2.00, hd: 0.46, rear: '16.9-30', front: '2wd|7.50-16', inflR: 100, inflF: 200, status: 'indicative' },
    { id: 'large4m', label: 'Large MFWD, ~60 kW (indicative)',          kW: 60, drive: 'mfwd', mass: 3000, fr: 58, wb: 2.15, hd: 0.48, rear: '16.9-30', front: 'mfwd|13.6-24', inflR: 100, inflF: 140, lead: 2, status: 'indicative' },
    { id: 'hp4m',    label: 'High-power MFWD, ~75 kW, radial (indicative)', kW: 75, drive: 'mfwd', mass: 4000, fr: 58, wb: 2.40, hd: 0.50, rear: '480/70R34', front: 'mfwd|13.6-24', inflR: 100, inflF: 140, lead: 2, status: 'indicative' },
    { id: 'gen4',    label: 'Generic 4WD, equal tyres (v1 default)',    kW: 45, drive: '4wd', mass: 2600, fr: 50, wb: 2.10, hd: 0.45, rear: '14.9-28', front: 'same', inflR: 100, inflF: 100, status: 'indicative' },
    { id: 'tx58',    label: 'TX58 4WD, 42 kW class (Kim et al. 2022)',  kW: 35.6, drive: '4wd', mass: 4072, fr: 60, wb: 2.155, hd: 0.50, rear: '14.9-30', front: '4wd|11.2-20', inflR: 120, inflF: 160, status: 'text: tyres, wheelbase, mass (Table 1; text says 3894 kg). ASSUMED: rear share 60 %, hitch 0.5 m, inflation', note: 'Test tractor of the Kim 2022 field data (bias tyres 14.9-30 / 11.2-20). Static axle split, hitch height and inflation are not reported — assumed.' }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.TSMDATA = D;
})(typeof window !== 'undefined' ? window : this);
