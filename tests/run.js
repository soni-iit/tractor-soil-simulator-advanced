// Run:  node tests/run.js      (no installation needed beyond Node.js)
const T = require('../src/model.js'), D = require('../src/data.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; console.log('  PASS', name, info || ''); } else { fail++; console.log('  FAIL', name, info || ''); } }
const near = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('1. Brixius equations (hand-calculated reference values)');
// Bn=(500*0.4*1.2/10)*(1+5*0.15)/(1+3*0.4/1.2)=24*1.75/2=21 ;  s=0.1 bias
let r = T.brixius({ CI: 500, b: 0.4, d: 1.2, W: 10, s: 0.1, dh: 0.15, radial: false });
ok('Bn = 21', near(r.Bn, 21, 1e-9), r.Bn);
const mu = 0.88 * (1 - Math.exp(-2.1)) * (1 - Math.exp(-0.75)) + 0.04, rho = 1 / 21 + 0.04 + 0.05 / Math.sqrt(21);
ok('mu bias', near(r.mu, mu, 1e-12), r.mu.toFixed(4)); ok('rho bias (1/Bn)', near(r.rho, rho, 1e-12), r.rho.toFixed(4));
r = T.brixius({ CI: 500, b: 0.4, d: 1.2, W: 10, s: 0.1, dh: 0.15, radial: true });
ok('radial rho (0.9/Bn)', near(r.rho, 0.9 / 21 + 0.0325 + 0.05 / Math.sqrt(21), 1e-12));
ok('radial pulls more than bias', r.net > T.brixius({ CI: 500, b: 0.4, d: 1.2, W: 10, s: 0.1, dh: 0.15 }).net);
ok('kCI scales CI', near(T.brixius({ CI: 500, kCI: 0.5, b: .4, d: 1.2, W: 10, s: .1, dh: .15 }).Bn, 10.5, 1e-9));

console.log('2. Contact patch');
const t = T.tyreFromNominal(16.9, 30);
ok('tyre 16.9-30 b=0.429 m', near(t.b, 0.429, 1e-3), t.b.toFixed(3));
ok('tyre 16.9-30 d≈1.49 m (rim + 2·0.85·w)', near(t.d, 1.492, 0.01), t.d.toFixed(3));
let c = T.contact(t, 12, 100, { kp: 1.3, lug: 0.6 });
ok('net A = W/(kp·pi)', near(c.A, 12 / 130, 1e-9), c.A.toFixed(4));
ok('gross A = net/lug', near(c.Ag, 12 / 130 / .6, 1e-9));
ok('δ/h ≈ 0.1–0.2 for typical rated load (sanity vs. tyre practice)', c.dh > .08 && c.dh < .22, c.dh.toFixed(3));
ok('δ/h within bounds', c.dh >= .03 && c.dh <= .45, c.dh.toFixed(3));
ok('lower inflation → larger area', T.contact(t, 12, 60, {}).A > T.contact(t, 12, 120, {}).A);

console.log('3. Whole tractor');
const cfg = { mass: 4072, rearFrac: .6, wheelbase: 2.155, hitchH: .5, drive: '4WD', lead: 0, kp: 1.3,
  rear: Object.assign(T.tyreFromNominal(14.9, 30), { infl: 120 }), front: Object.assign(T.tyreFromNominal(11.2, 20), { infl: 160 }) };
let sol = T.solveForDraft(cfg, { CI: 700 }, 8.1);
ok('inverse solver converges', sol.ok);
ok('pull at solved slip = DP', near(T.tractorAt(cfg, { CI: 700 }, 8.1, sol.res.sR).pull, 8.1, 1e-3));
ok('TE in (0,1)', sol.res.te > 0 && sol.res.te < 1, sol.res.te.toFixed(3));
ok('more draft → more slip', T.solveForDraft(cfg, { CI: 700 }, 12).res.sR > sol.res.sR);
ok('2WD needs more slip than 4WD for same draft', T.solveForDraft(Object.assign({}, cfg, { drive: '2WD' }), { CI: 700 }, 8.1).res.sR > sol.res.sR);
ok('impossible draft rejected', !T.solveForDraft(cfg, { CI: 300 }, 40).ok);
const opt = T.optimum(cfg, { CI: 900 });
ok('optimum slip is interior (2–25%)', opt.s > .02 && opt.s < .25, (opt.s * 100).toFixed(1) + '%');

console.log('4. Field validation: Kim et al. 2022 (3 soils)');
const R = T.tyreFromNominal(14.9, 30), F = T.tyreFromNominal(11.2, 20);
const kcfg = { mass: 4072, rearFrac: .6, wheelbase: 2.155, hitchH: .5, drive: '4WD', lead: 0, kp: 1.3, lug: 0.6, rear: Object.assign({}, R, { infl: 120 }), front: Object.assign({}, F, { infl: 160 }) };
D.KIM_CASES.forEach(k => {
  const tb = T.predictCase(kcfg, k, 1, 1), f = T.fitCase(kcfg, k);
  console.log('    ' + k.soil + ': measured slip ' + k.slip + '% TE ' + k.te + ' | textbook ' + tb.slip.toFixed(1) + '% / ' + tb.te.toFixed(2) + ' | fitted kCI ' + f.kCI.toFixed(2) + ' kRho ' + f.kRho.toFixed(2));
  ok(k.soil + ': textbook under-predicts slip (documented finding)', tb.slip < k.slip);
  ok(k.soil + ': calibration reproduces slip ±0.5 pts', near(f.slip, k.slip, 0.5));
  ok(k.soil + ': calibration reproduces TE ±0.02', near(f.te, k.te, 0.02));
});
const cal = T.calibrate(kcfg, D.KIM_CASES);
ok('single global κ cannot fit all three soils (rms slip > 2 pts) — documented limitation', cal.rmsSlip > 2, 'rms ' + cal.rmsSlip.toFixed(1) + ' pts');

console.log('5. Bekker–Wong cross-check');
const sl = D.BEKKER[1], bw = T.bekkerWheel(sl, 0.4, 1.2, 10, 0.15);
ok('sinkage positive & < 0.45d', bw.z0 > 0 && bw.z0 < .45 * 1.2, bw.z0.toFixed(3));
ok('thrust grows with slip', T.bekkerWheel(sl, .4, 1.2, 10, .3).H > T.bekkerWheel(sl, .4, 1.2, 10, .05).H);
ok('sinkage grows with load', T.bekkerWheel(sl, .4, 1.2, 20, .1).z0 > T.bekkerWheel(sl, .4, 1.2, 10, .1).z0);
ok('softer soil → more compaction resistance', T.bekkerWheel(D.BEKKER[0], .4, 1.2, 10, .1).Rc > 0);

console.log('6. Stress & compaction');
ok('ν=3 reproduces Boussinesq (Keller & Or Eq.1)', near(T.stressAt(100, Math.PI * .04, .3, 3), 100 * (1 - Math.pow(.3, 3) / Math.pow(.04 + .09, 1.5)), 1e-9));
ok('stress at z=0 equals p', near(T.stressAt(100, .3, 0, 5), 100, 1e-9));
ok('stress decays with depth', T.stressAt(100, .3, .5, 5) < T.stressAt(100, .3, .2, 5));
ok('higher ν → more stress at depth', T.stressAt(100, .3, .5, 6) > T.stressAt(100, .3, .5, 3));
ok('Kukharets area(0.08 MPa)=0.395 m²', near(D.KUKHARETS.area_m2(.08), .395, .002));
ok('Kukharets: 59.75 kN wheel / area ≈ 150 kPa (paper: "up to 150 kPa")', near(59.75 / D.KUKHARETS.area_m2(.08), 151, 3));
const V = D.VALERA_PASSES, fit = T.fitLog(V.N.slice(1), V.gamma.slice(1));
ok('Valera density rises ~log with passes (slope > 0)', fit.b > 0, 'A≈' + fit.b.toFixed(0) + ' kg/m³ per decade');
ok('Valera fit within ±25 kg/m³ for passes 1–5', V.N.slice(1).every((n, i) => near(fit.a + fit.b * Math.log10(n), V.gamma.slice(1)[i], 25)));

console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
