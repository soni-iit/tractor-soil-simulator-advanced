(function () {
  'use strict';
  var T = window.TSM, D = window.TSMDATA;
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var v = parseFloat($(id).value); return isNaN(v) ? null : v; };
  var fmt = function (x, n) { return (x == null || isNaN(x)) ? '–' : x.toFixed(n == null ? 1 : n); };
  var css = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };
  var ref = { kim: null };           // tractor setup that calibration refers to

  /* ---------- tyre lists ---------- */
  function tyreOf(e) { var g = e.nom ? T.tyreFromNominal(e.nom[0], e.nom[1]) : T.tyreFromMetric(e.met[0], e.met[1], e.met[2]); g.radial = e.radial; g.id = e.id; return g; }
  function fillSel(id, list, def) { var s = $(id); list.forEach(function (e, i) { var o = document.createElement('option'); o.value = i; o.textContent = e.id + (e.radial ? ' (radial)' : ' (bias)'); if (e.id === def) o.selected = true; s.appendChild(o); }); }
  fillSel('rearTyre', D.TYRES.rear, '18.4-34'); fillSel('frontTyre', D.TYRES.front, '13.6-24');
  var ps = $('ciPreset'); [{ label: '— custom —', CI: null }].concat(D.CI_CLASSES).concat(D.KIM_CASES.map(function (k) { return { label: k.label + ' (CI ' + k.CI + ')', CI: k.CI }; })).forEach(function (p) { var o = document.createElement('option'); o.textContent = p.label; o.value = p.CI == null ? '' : p.CI; ps.appendChild(o); });
  var bs = $('bekSel'); D.BEKKER.forEach(function (b, i) { var o = document.createElement('option'); o.value = i; o.textContent = b.label; if (i === 1) o.selected = true; bs.appendChild(o); });

  /* ---------- state ---------- */
  function cfg() {
    var r = tyreOf(D.TYRES.rear[+$('rearTyre').value]), f = tyreOf(D.TYRES.front[+$('frontTyre').value]);
    r.infl = num('rearInfl'); f.infl = num('frontInfl');
    var ra = num('rearArea'), fa = num('frontArea'); if (ra) r.areaM2 = ra / 1e4; if (fa) f.areaM2 = fa / 1e4;
    return { mass: num('mass'), rearFrac: num('rearFrac'), wheelbase: num('wb'), hitchH: num('hd'), drive: $('drive').value,
      lead: (num('lead') || 0) / 100, kp: num('kp'), lug: num('lug'), nRear: +$('nRear').value, rear: r, front: f };
  }
  function soil() { return { CI: num('ci'), kCI: num('kCI'), kRho: num('kRho') }; }

  /* ---------- chart helper ---------- */
  function setup(cv) { var dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); return { c: c, w: w, h: h }; }
  function nice(a, b, n) { var s = (b - a) / n, p = Math.pow(10, Math.floor(Math.log10(s))), m = s / p; var st = (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p, t = [], v = Math.ceil(a / st - 1e-9) * st; for (; v <= b + 1e-9; v += st) t.push(+v.toFixed(10)); return t; }
  function plot(cv, o) {
    var S = setup(cv), c = S.c, W = S.w, H = S.h, L = 46, R = o.y2 ? 44 : 12, Tp = 12, B = 34, pw = W - L - R, ph = H - Tp - B;
    var X = function (x) { return L + (x - o.x[0]) / (o.x[1] - o.x[0]) * pw; };
    var Y = function (y) { var f = (y - o.y[0]) / (o.y[1] - o.y[0]); return o.yinv ? Tp + f * ph : Tp + ph - f * ph; };
    var Y2 = o.y2 ? function (y) { return Tp + ph - (y - o.y2[0]) / (o.y2[1] - o.y2[0]) * ph; } : null;
    c.font = '11px system-ui'; c.fillStyle = css('--mut'); c.strokeStyle = css('--line'); c.lineWidth = 1;
    nice(o.x[0], o.x[1], 6).forEach(function (t) { c.beginPath(); c.moveTo(X(t), Tp); c.lineTo(X(t), Tp + ph); c.stroke(); c.textAlign = 'center'; c.fillText(t, X(t), Tp + ph + 14); });
    nice(o.y[0], o.y[1], 5).forEach(function (t) { c.beginPath(); c.moveTo(L, Y(t)); c.lineTo(L + pw, Y(t)); c.stroke(); c.textAlign = 'right'; c.fillText(t, L - 4, Y(t) + 3); });
    if (o.y2) nice(o.y2[0], o.y2[1], 5).forEach(function (t) { c.textAlign = 'left'; c.fillText(t, L + pw + 4, Y2(t) + 3); });
    c.textAlign = 'center'; c.fillText(o.xl, L + pw / 2, H - 4);
    c.save(); c.translate(11, Tp + ph / 2); c.rotate(-Math.PI / 2); c.fillText(o.yl, 0, 0); c.restore();
    if (o.y2) { c.save(); c.translate(W - 6, Tp + ph / 2); c.rotate(Math.PI / 2); c.fillText(o.y2l, 0, 0); c.restore(); }
    (o.bands || []).forEach(function (b) { c.fillStyle = b.color; c.globalAlpha = .18; var ya = Y(b.hi), yb = Y(b.lo); c.fillRect(L, ya, pw, yb - ya); c.globalAlpha = 1; });
    (o.hl || []).forEach(function (h) { c.strokeStyle = h.color; c.setLineDash([5, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(L, Y(h.y)); c.lineTo(L + pw, Y(h.y)); c.stroke(); c.setLineDash([]); c.fillStyle = h.color; c.textAlign = 'left'; c.fillText(h.label, L + 4, Y(h.y) - 4); });
    (o.vl || []).forEach(function (h) { c.strokeStyle = h.color; c.setLineDash([5, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(h.x), Tp); c.lineTo(X(h.x), Tp + ph); c.stroke(); c.setLineDash([]); });
    (o.lines || []).forEach(function (s) { c.strokeStyle = s.color; c.lineWidth = s.w || 2; c.setLineDash(s.dash || []); c.beginPath(); s.pts.forEach(function (p, i) { var yy = (s.axis2 ? Y2 : Y)(p[1]); i ? c.lineTo(X(p[0]), yy) : c.moveTo(X(p[0]), yy); }); c.stroke(); c.setLineDash([]); });
    (o.dots || []).forEach(function (s) { c.fillStyle = s.hollow ? 'transparent' : s.color; c.strokeStyle = s.color; c.lineWidth = 2; s.pts.forEach(function (p) { var yy = (s.axis2 ? Y2 : Y)(p[1]); c.beginPath(); c.arc(X(p[0]), yy, s.r || 4.5, 0, 6.3); if (!s.hollow) c.fill(); c.stroke(); if (p[2]) { c.fillStyle = css('--ink'); c.textAlign = 'left'; c.fillText(p[2], X(p[0]) + 7, yy - 5); c.fillStyle = s.hollow ? 'transparent' : s.color; } }); });
    c.strokeStyle = css('--mut'); c.strokeRect(L, Tp, pw, ph);
  }
  function legend(id, items) { $(id).innerHTML = items.map(function (i) { return '<i style="border-color:' + i[0] + (i[2] ? ';border-top-style:dashed' : '') + '"></i>' + i[1]; }).join(''); }

  /* ---------- core evaluation ---------- */
  var last = {};
  function update() {
    var C = cfg(), S = soil(), DP = num('dp'), v = num('speed') || 7;
    $('ciV').textContent = S.CI + ' kPa'; $('dpV').textContent = fmt(DP, 1) + ' kN';
    var sol = T.solveForDraft(C, S, DP), alerts = [];
    var cap = T.curve(C, S, 120, 0.45), maxPull = Math.max.apply(null, cap.map(function (p) { return p.pull; }));
    var res = sol.ok ? sol.res : null;
    var opt = T.optimum(C, S);
    var cal = (S.kCI !== 1 || S.kRho !== 1);
    $('calBadge').innerHTML = cal ? '<span class="badge b-warn">Calibrated κ<sub>CI</sub>=' + fmt(S.kCI, 2) + ', κ<sub>ρ</sub>=' + fmt(S.kRho, 2) + '</span>' : '<span class="badge b-bad">Textbook (uncalibrated)</span>';
    $('calNote').textContent = cal ? ' Factors absorb unmeasured axle loads, tyre deformation, tillage-induced soil state and test definitions — valid for the tractor/soil they were fitted on.' : ' Kim et al. (2022) measured 45–60 % higher slip than this textbook model on three soils — consider calibrating (panel 3).';
    if (!sol.ok) alerts.push(['bad', 'Required pull (' + fmt(DP, 1) + ' kN) exceeds the traction capacity of this tractor on this soil (max ≈ ' + fmt(maxPull, 1) + ' kN). Increase ballast, reduce draft, or use 4WD.']);
    else if (res.sR > 0.25) alerts.push(['warn', 'Rear slip above 25 %: outside the range where the traction equations and compaction law are validated; tractive efficiency is poor.']);
    if (S.CI < 400 || S.CI > 2200) alerts.push(['warn', 'Cone index outside 400–2200 kPa: extrapolation beyond typical D497.7 data.']);
    if (cal && ref.kim && (C.mass !== ref.kim.mass || C.drive !== ref.kim.drive)) alerts.push(['warn', 'κ values come from a different tractor (TX58 4WD, Kim 2022); treat results as indicative only.']);
    var Rc = res ? res.R.contact : T.tractorAt(C, S, 0, 0.1).R.contact, Rtyre = res ? res.R : T.tractorAt(C, S, 0, 0.1).R;
    var ax = res ? res.ax : T.axleLoads(C, DP);
    var pw = ax.Wr / (C.nRear), p = Rc.pc, A = Rc.A;
    var nu = +$('nu').value, strength = num('strength');
    var sc = T.scsi(p, A, nu, strength), scHi = T.scsi(p, A, 6, strength), scLo = T.scsi(p, A, 3, strength);
    if (sc.scsi > 1) alerts.push(['bad', 'SCSI = ' + fmt(sc.scsi, 2) + ' > 1: subsoil stress at 0.5 m exceeds the strength limit (' + strength + ' kPa) — risk of chronic subsoil compaction (Keller & Or 2022).']);
    else if (scHi.scsi > 1) alerts.push(['warn', 'SCSI ≤ 1 for ν=' + nu + ' but > 1 for ν=6 (wet/soft soil): risk depends on soil moisture.']);
    $('alerts').innerHTML = alerts.map(function (a) { return '<div class="alert ' + a[0] + '">' + a[1] + '</div>'; }).join('');
    var Pdb = DP * v / 3.6;
    var k = [
      ['Rear slip', res ? fmt(res.sR * 100, 1) + ' %' : '—', 'optimum ' + fmt(opt.s * 100, 1) + ' % (TE ' + fmt(opt.te, 2) + ')'],
      ['Tractive efficiency', res ? fmt(res.te, 2) : '—', 'wheel TE, = DP·v / axle input power'],
      ['Drawbar power', fmt(Pdb, 1) + ' kW', res ? 'axle input ≈ ' + fmt(Pdb / res.te, 1) + ' kW' : ''],
      ['Pull / weight', res ? fmt(DP / ax.W, 2) : '—', 'max on this soil ' + fmt(maxPull / ax.W, 2)],
      ['Rear contact pressure', fmt(p, 0) + ' kPa', 'net A = ' + fmt(A * 1e4, 0) + ' cm² per wheel, δ/h = ' + fmt(Rc.dh, 2)],
      ['SCSI @0.5 m', fmt(sc.scsi, 2), 'σ = ' + fmt(sc.stress, 0) + ' kPa (ν=' + nu + ')'],
      ['Wheel numeric Bn', fmt(Rtyre.br.Bn, 1), 'rear, per wheel']];
    $('kpis').innerHTML = k.map(function (x) { return '<div class="kpi"><span>' + x[0] + '</span><b>' + x[1] + '</b><span>' + x[2] + '</span></div>'; }).join('');
    last = { C: C, S: S, DP: DP, sol: sol, res: res, opt: opt, sc: sc, cap: cap };

    /* chart 1: TE & pull ratio vs slip (calibrated = current κ, textbook dashed) */
    var tb = T.curve(C, { CI: S.CI, kCI: 1, kRho: 1 }, 100, 0.4), cu = T.curve(C, S, 100, 0.4);
    var lines = [{ pts: cu.map(function (q) { return [q.s * 100, q.te]; }), color: css('--acc'), w: 2.5 },
                 { pts: cu.map(function (q) { return [q.s * 100, q.ratio]; }), color: css('--blue'), w: 2.5, axis2: true }];
    if (cal) { lines.push({ pts: tb.map(function (q) { return [q.s * 100, q.te]; }), color: css('--acc'), dash: [5, 4], w: 1.5 }, { pts: tb.map(function (q) { return [q.s * 100, q.ratio]; }), color: css('--blue'), dash: [5, 4], w: 1.5, axis2: true }); }
    var dots = [];
    if (res) dots.push({ pts: [[res.sR * 100, res.te, 'operating']], color: css('--acc2'), r: 6 });
    var fk = D.KIM_CASES.map(function (c) { return [c.slip, c.te, c.soil]; });
    dots.push({ pts: fk, color: css('--ink'), hollow: true, r: 5 });
    if ($('showMas').checked) { var eta = num('etaD') || .88; dots.push({ pts: D.MASIERO_SURFACES.map(function (m) { return [m.slip_pct, m.eff_pct / 100 / eta, m.surface]; }), color: css('--acc2'), hollow: true, r: 4 }); }
    plot($('c1'), { x: [0, 40], y: [0, 1], y2: [0, 0.8], xl: 'Rear-wheel slip, %', yl: 'Tractive efficiency', y2l: 'Net pull / tractor weight', lines: lines, dots: dots, vl: [{ x: opt.s * 100, color: css('--mut') }] });
    legend('l1', [[css('--acc'), 'TE'], [css('--blue'), 'pull/weight'], [css('--mut'), 'textbook (κ=1)', 1], [css('--ink'), '○ Kim 2022 field points (Kim tractor only!)'], [css('--acc2'), '● operating point']]);

    /* chart 2: stress vs depth */
    var prof = function (n) { return T.stressProfile(p, A, n, 1.0).map(function (q) { return [q.s, q.z]; }); };
    var cvs = $('c2'), S2 = setup(cvs);
    // draw depth on y (inverted): use plot with swapped axes via transformed coordinates
    var lo = prof(3), hi = prof(6), md = prof(nu);
    plot(cvs, { x: [0, Math.ceil(p / 50) * 50], y: [0, 1], xl: 'Vertical stress on axis, kPa', yl: 'Depth z, m', yinv: true, lines: [
      { pts: lo.map(function (q) { return [q[0], q[1]]; }), color: css('--blue'), dash: [4, 4], w: 1.5 },
      { pts: hi.map(function (q) { return [q[0], q[1]]; }), color: css('--blue'), dash: [4, 4], w: 1.5 },
      { pts: md.map(function (q) { return [q[0], q[1]]; }), color: css('--acc'), w: 2.5 }],
      vl: [{ x: strength, color: css('--bad') }], hl: [{ y: 0.5, color: css('--mut'), label: 'SCSI depth 0.5 m' }],
      dots: [{ pts: [[sc.stress, 0.5, fmt(sc.stress, 0) + ' kPa']], color: css('--acc2'), r: 5 }] });
    legend('l2', [[css('--acc'), 'ν = ' + nu], [css('--blue'), 'ν = 3 and 6 bounds', 1], [css('--bad'), strength + ' kPa subsoil limit']]);

    /* chart 3: axle loads and traction split (bars) */
    drawBars(res || T.tractorAt(C, S, 0, 0.1), C);

    /* chart 4: compaction */
    drawCompaction(C, Rc);
    renderValidation(); renderBek(C); renderAD();
    last.ready = true;
  }

  function drawBars(r, C) {
    var S = setup($('c3')), c = S.c, W = S.w, H = S.h, items = [
      ['Rear static', C.rearFrac * r.ax.W, 'a'], ['Rear dynamic', r.ax.Wr, 'b'], ['Front static', (1 - C.rearFrac) * r.ax.W, 'a'], ['Front dynamic', r.ax.Wf, 'b'],
      ['Rear gross traction', r.R.gross, 'c'], ['Rear rolling res.', r.R.roll, 'd'], ['Front gross traction', r.F.gross, 'c'], ['Front rolling res.', r.F.roll, 'd']];
    var mx = Math.max.apply(null, items.map(function (i) { return i[1]; })) * 1.12, bw = (W - 60) / items.length;
    var col = { a: css('--mut'), b: css('--blue'), c: css('--acc'), d: css('--acc2') };
    c.font = '11px system-ui'; c.textAlign = 'center';
    items.forEach(function (it, i) { var h = (H - 70) * it[1] / mx, x = 50 + i * bw + 4; c.fillStyle = col[it[2]]; c.fillRect(x, H - 40 - h, bw - 8, h); c.fillStyle = css('--ink'); c.fillText(fmt(it[1], 1), x + (bw - 8) / 2, H - 44 - h); c.fillStyle = css('--mut'); var w = it[0].split(' '); c.fillText(w[0], x + (bw - 8) / 2, H - 26); c.fillText(w.slice(1).join(' '), x + (bw - 8) / 2, H - 14); });
    c.save(); c.translate(11, H / 2); c.rotate(-Math.PI / 2); c.fillStyle = css('--mut'); c.fillText('kN', 0, 0); c.restore();
    legend('l3', [[css('--mut'), 'static axle load'], [css('--blue'), 'with draft load transfer (ΔW = DP·h/WB = ' + fmt(r.ax.dW, 2) + ' kN)'], [css('--acc'), 'gross traction'], [css('--acc2'), 'rolling resistance']]);
  }

  function drawCompaction(C, Rc) {
    var V = D.VALERA_PASSES, fit = T.fitLog(V.N.slice(1), V.gamma.slice(1)), rr = (C.rear.infl) / 110;
    var N = parseInt($('passes').value) || 5, pts = [], ptsRef = [];
    for (var n = 1; n <= 30; n += 0.5) { pts.push([n, fit.a + fit.b * Math.log10(n * rr)]); ptsRef.push([n, fit.a + fit.b * Math.log10(n)]); }
    var yv = fit.a + fit.b * Math.log10(N * rr);
    plot($('c4'), { x: [0, 30], y: [1100, 1500], xl: 'Passes in the same track', yl: 'Surface dry density, kg/m³',
      lines: [{ pts: ptsRef, color: css('--mut'), dash: [5, 4], w: 1.5 }, { pts: pts, color: css('--acc'), w: 2.5 }],
      dots: [{ pts: V.N.slice(1).map(function (n, i) { return [n, V.gamma[i + 1]]; }), color: css('--ink'), hollow: true }, { pts: [[N, yv, fmt(yv, 0)]], color: css('--acc2'), r: 6 }], hl: [{ y: V.gamma[0], color: css('--mut'), label: 'untrafficked 1136' }] });
    legend('l4', [[css('--ink'), '○ Valera 2012 clay, 4WD tractor'], [css('--mut'), 'log fit ' + fmt(fit.b, 0) + ' kg/m³ per decade', 1], [css('--acc'), 'shifted by rear inflation / 110 kPa (assumption)']]);
  }

  function renderValidation() {
    var C = last.C, h = '<table><tr><th>Soil</th><th>CI</th><th>DP kN</th><th>Meas. slip %</th><th>Textbook slip</th><th>Current-κ slip</th><th>Meas. TE</th><th>Textbook TE</th><th>Current-κ TE</th></tr>';
    D.KIM_CASES.forEach(function (k) { var a = T.predictCase(C, k, 1, 1), b = T.predictCase(C, k, last.S.kCI, last.S.kRho); h += '<tr><td>' + k.soil + '</td><td>' + k.CI + '</td><td>' + k.DP + '</td><td>' + k.slip + ' ± ' + k.slipSd + '</td><td>' + fmt(a.slip) + '</td><td>' + fmt(b.slip) + '</td><td>' + k.te + '</td><td>' + fmt(a.te, 2) + '</td><td>' + fmt(b.te, 2) + '</td></tr>'; });
    $('valTab').innerHTML = h + '</table>';
    $('valNote').innerHTML = 'Meaningful only when the tractor panel matches the TX58 (use “Load Kim TX58 setup”). Kim did not report static axle loads, tyre inflation or hitch height, so these are assumptions (rear share 0.60, 120/160 kPa, 0.5 m). Note the clay loam has the <i>highest</i> CI yet the <i>highest</i> slip: CI alone does not capture wet, plastic soils.';
  }
  function renderBek() {
    var b = D.BEKKER[+$('bekSel').value], s = (num('bekS') || 15) / 100, C = last.C, r = last.res || T.tractorAt(C, last.S, 0, .1), W = r.ax.Wr / C.nRear;
    var q = T.bekkerWheel(b, C.rear.b, C.rear.d, W, s), br = r.R.br;
    $('bekOut').innerHTML = '<table><tr><th></th><th>Sinkage z₀ (mm)</th><th>μ (thrust/W)</th><th>ρ (resistance/W)</th><th>net coeff.</th></tr><tr><td>Bekker–Wong rigid wheel (' + b.label + ')</td><td>' + fmt(q.z0 * 1000, 0) + '</td><td>' + fmt(q.mu, 2) + '</td><td>' + fmt(q.rho, 3) + '</td><td>' + fmt(q.mu - q.rho, 2) + '</td></tr><tr><td>Brixius (current κ, slip ' + fmt(s * 100, 0) + '%)</td><td>–</td><td>' + fmt(T.brixius({ CI: last.S.CI, kCI: last.S.kCI, kRho: last.S.kRho, b: C.rear.b, d: C.rear.d, W: W, s: s, dh: r.R.contact.dh, radial: C.rear.radial }).mu, 2) + '</td><td>' + fmt(T.brixius({ CI: last.S.CI, kCI: last.S.kCI, kRho: last.S.kRho, b: C.rear.b, d: C.rear.d, W: W, s: s, dh: r.R.contact.dh, radial: C.rear.radial }).rho, 3) + '</td><td>–</td></tr></table><div class="note">Rigid-wheel theory over-estimates resistance for inflated tyres (tyre deflection flattens the contact patch) and uses wheel terrain constants (n, k<sub>c</sub>, k<sub>φ</sub>, c, φ, K) rather than cone index. Use it as an independent order-of-magnitude check, not a replacement. Terrain constants are textbook values (status: recalled — verify against your copy of Wong).</div>';
  }
  function renderAD() {
    var e = D.ALDOSARY.eq[$('adImp').value], PD = num('adPD'), PS = num('adPS'), MC = num('adMC'), STI = num('adSTI'), dm = D.ALDOSARY.domain;
    var slip = e.c + e.pd * PD + e.mc * MC + e.ps * PS + e.sti * STI;
    var out = PD < dm.depth_cm[0] || PD > dm.depth_cm[1] || PS < dm.speed_kmh[0] || PS > dm.speed_kmh[1] || MC < dm.mc_pctdb[0] || MC > dm.mc_pctdb[1] || STI < dm.STI[0] || STI > dm.STI[1];
    $('adOut').innerHTML = '<b>Estimated rear slip: ' + fmt(slip, 1) + ' %</b> (RMSE ' + e.rmse + ' %, R² ' + e.R2 + ') ' + (out ? '<span class="badge b-bad">outside validated domain</span>' : '<span class="badge b-ok">inside domain</span>') + '<div class="note">Valid only for: ' + D.ALDOSARY.tractor + '; depth ' + dm.depth_cm.join('–') + ' cm, speed ' + dm.speed_kmh.join('–') + ' km/h, moisture ' + dm.mc_pctdb.join('–') + ' %db, STI ' + dm.STI.join('–') + '. A regression for that tractor — never extrapolate to other tractors.</div>';
  }

  /* ---------- static panels ---------- */
  function renderEvidence() {
    var h = '<table><tr><th>Source</th><th>Used for</th><th>Verification status</th></tr>';
    var use = { kim2022: 'Field validation & calibration (3 soils)', masiero2011: 'Surface-class efficiency overlay', aldosary2023: 'Case-specific slip estimator', valera2012: 'Density-vs-passes law', kukharets2025: 'Tyre contact-area/stress check (tests)', keller2022: 'Subsoil stress, SCSI, 50 kPa limit', brixius1987: 'Wheel-numeric traction equations', mckyes1985: 'Raghavan compaction form', wong2010: 'Bekker–Wong cross-check, terrain constants', thorpe2024: 'Reviewed, not used (inconsistent table)', asabe497: 'Cone-index classes' };
    Object.keys(D.SOURCES).forEach(function (k) { var s = D.SOURCES[k]; h += '<tr><td class="l">' + s.cite + (s.doi ? ' <a href="https://doi.org/' + s.doi + '" target="_blank" rel="noopener">DOI</a>' : '') + '</td><td class="l">' + (use[k] || '') + '</td><td class="l">' + s.status + '</td></tr>'; });
    $('evid').innerHTML = h + '</table><div class="note">“text” = number read from the article/book text. “recalled” = standard literature value not re-checked against a copy. Items an article did not report are left blank in the data file instead of being guessed.</div>';
  }
  function renderEq() {
    $('eqs').innerHTML = '<details open><summary>Traction (Brixius 1987 / ASABE D497.7)</summary><pre>Bn = (CI·b·d / W) · (1 + 5δ/h) / (1 + 3b/d)         W = load per wheel (kN), CI (kPa) × κCI\nBias :  μg = 0.88 (1−e^−0.1Bn)(1−e^−7.5s) + 0.04     ρ = 1/Bn + 0.04   + 0.5 s/√Bn\nRadial: μg = 0.88 (1−e^−0.1Bn)(1−e^−9.5s) + 0.0325   ρ = 0.9/Bn + 0.0325 + 0.5 s/√Bn\nρ ← κρ·ρ ;  NTR = W(μg − ρ) ;  wheel TE = (NTR/GTR)(1 − s)</pre></details>' +
    '<details><summary>Whole tractor</summary><pre>ΔW = DP·h_d / WB ;  W_rear = W_r0 + ΔW ; W_front = W_f0 − ΔW\nFront slip: s_F = 1 − (1 − s_R)/(1 + lead)  (MFWD/4WD) ; 2WD front wheels are free-rolling\nDP = Σ axle NTR ;   TE = DP / Σ [ GTR_ax / (1 − s_ax) ]</pre></details>' +
    '<details><summary>Contact patch &amp; stress</summary><pre>A = W / (kp·p_i) (or measured) ;  L = A/(π b/4) ;  δ = d/2 [1 − √(1 − (L/d)²)]\nσ_z = p [1 − ( z²/(a²+z²) )^(ν/2)] , a = √(A/π)   (ν = 3 → Boussinesq)\nSCSI = σ_z(0.5 m) / strength(0.5 m) ; > 1 → chronic subsoil compaction risk</pre></details>' +
    '<details><summary>Bekker–Wong (rigid wheel)</summary><pre>p = (kc/b + kφ) z^n ;  z0 = [3W / ((3−n)(kc/b+kφ)√d)]^(2/(2n+1))\nRc = b(kc/b+kφ) z0^(n+1)/(n+1) ;  H = (A c + W tanφ)[1 − (K/(sL))(1 − e^(−sL/K))]</pre></details>' +
    '<details><summary>Compaction</summary><pre>Raghavan et al. 1977 (McKyes 1985 Eq. 5.1):  γd = γ0 + A1 log(N·p) + B1 log(w%)  (w below optimum)\nHere: γd(N) = a + b log10(N·r) fitted to Valera et al. 2012 clay data; r = rear inflation/110 kPa (assumption)</pre></details>';
  }

  /* ---------- calibration actions ---------- */
  function kimCfg() { var K = D.TRACTOR_KIM, r = T.tyreFromNominal(K.rear.nominal[0], K.rear.nominal[1]), f = T.tyreFromNominal(K.front.nominal[0], K.front.nominal[1]); r.infl = 120; f.infl = 160; r.radial = f.radial = false; return { mass: 4072, rearFrac: .6, wheelbase: K.wheelbase, hitchH: .5, drive: '4WD', lead: 0, kp: 1.3, lug: 0.6, nRear: 2, rear: r, front: f }; }
  function kimFactors() { var cf = kimCfg(), fs = D.KIM_CASES.map(function (c) { return T.fitCase(cf, c); }); return { kCI: fs.reduce(function (a, f) { return a + f.kCI; }, 0) / 3, kRho: fs.reduce(function (a, f) { return a + f.kRho; }, 0) / 3, each: fs }; }
  function setSel(id, val) { var s = $(id); for (var i = 0; i < s.options.length; i++) if (s.options[i].text.indexOf(val) === 0) { s.selectedIndex = i; return; } }
  $('kText').onclick = function () { $('kCI').value = 1; $('kRho').value = 1; update(); };
  $('kKim').onclick = function () { var k = kimFactors(); $('kCI').value = k.kCI.toFixed(2); $('kRho').value = k.kRho.toFixed(2); ref.kim = kimCfg(); $('fitOut').textContent = 'Mean of three Kim soils: ' + k.each.map(function (f, i) { return D.KIM_CASES[i].soil + ' κCI ' + f.kCI.toFixed(2) + '/κρ ' + f.kRho.toFixed(2); }).join('; ') + '. n = 3 → indicative only.'; update(); };
  $('loadKim').onclick = function () {
    $('mass').value = 4072; $('rearFrac').value = .6; $('wb').value = 2.155; $('hd').value = .5; $('drive').value = '4WD'; $('lead').value = 0; setSel('rearTyre', '14.9-30'); setSel('frontTyre', '11.2-20'); $('rearInfl').value = 120; $('frontInfl').value = 160; $('nRear').value = 2; $('kp').value = 1.3; $('rearArea').value = ''; $('frontArea').value = '';
    $('csv').value = 'CI,DP,slip,TE\n' + D.KIM_CASES.map(function (k) { return [k.CI, k.DP, k.slip, k.te].join(','); }).join('\n'); ref.kim = kimCfg(); update();
  };
  $('fit').onclick = function () {
    var rows = $('csv').value.split(/\n/).map(function (l) { return l.split(/[,;\t]/).map(parseFloat); }).filter(function (r) { return r.length >= 3 && r.slice(0, 3).every(function (x) { return !isNaN(x); }); });
    if (!rows.length) { $('fitOut').textContent = 'No valid rows found (need CI, DP, slip[, TE]).'; return; }
    var C = cfg(), cases = rows.map(function (r, i) { return { label: 'row ' + (i + 1), CI: r[0], DP: r[1], slip: r[2], te: isNaN(r[3]) ? null : r[3] }; }), kc, kr, msg;
    if (cases.length < 3) { var fs = cases.map(function (c) { return T.fitCase(C, c); }); kc = fs.reduce(function (a, f) { return a + f.kCI; }, 0) / fs.length; kr = fs.reduce(function (a, f) { return a + f.kRho; }, 0) / fs.length; msg = 'Mean of ' + cases.length + ' per-case fit(s).'; }
    else { var cal = T.calibrate(C, cases); kc = cal.kCI; kr = cal.kRho; msg = 'Global fit over ' + cases.length + ' cases: RMS slip error ' + fmt(cal.rmsSlip, 1) + ' pts' + (cal.rmsSlip > 2.5 ? ' — large; factors are probably soil-specific, fit each soil separately.' : '.'); }
    $('kCI').value = kc.toFixed(2); $('kRho').value = kr.toFixed(2); $('fitOut').textContent = msg + ' κCI = ' + kc.toFixed(2) + ', κρ = ' + kr.toFixed(2) + '.'; ref.kim = C; update();
  };
  $('ciPreset').onchange = function () { if (this.value) { $('ci').value = this.value; update(); } };
  ['mass', 'rearFrac', 'wb', 'hd', 'drive', 'lead', 'rearTyre', 'nRear', 'rearInfl', 'rearArea', 'frontTyre', 'frontInfl', 'frontArea', 'kp', 'ci', 'dp', 'speed', 'nu', 'strength', 'passes', 'kCI', 'kRho', 'showMas', 'etaD', 'bekSel', 'bekS', 'adImp', 'adPD', 'adPS', 'adMC', 'adSTI'].forEach(function (id) { $(id).addEventListener('input', update); $(id).addEventListener('change', update); });
  $('ci').addEventListener('input', function () { $('ciPreset').selectedIndex = 0; });
  window.addEventListener('resize', update);
  renderEvidence(); renderEq(); update();
  window.__TSM_APP = { update: update, last: function () { return last; } };
})();
