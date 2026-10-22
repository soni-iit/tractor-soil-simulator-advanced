  /* =====================================================================
   *  ADVANCED LAYER  (inserted inside the main IIFE: uses its helpers)
   * ===================================================================== */
  var D2 = TSMDATA, USERPTS = [], lastSnap = {};
  var DRV = {"2wd":"2WD","mfwd":"MFWD","4wd":"4WD"};

  function tsCfg(S){
    var r = S.rear, f = S.front;
    return {mass:S.mass, rearFrac:S.fr/100, wheelbase:S.wb, hitchH:S.hd, drive:DRV[S.drive],
      lead: S.drive==="mfwd" ? S.lead/100 : 0, kp:CAL.kp, lug:CAL.lug, nRear:2,
      rear:{b:r.b, d:r.d, h:r.ar*r.b, infl:S.inflR, radial:!!r.radial},
      front:{b:f.b, d:f.d, h:f.ar*f.b, infl:S.inflF, radial:!!f.radial}};
  }
  function withCAL(o, fn){
    var a = {kCI:CAL.kCI, kRho:CAL.kRho}; CAL.kCI = o.kCI; CAL.kRho = o.kRho;
    try { return fn(); } finally { CAL.kCI = a.kCI; CAL.kRho = a.kRho; }
  }
  function kimCfg(){
    var K = D2.TRACTORS.filter(function(t){return t.id==="tx58"})[0];
    var r = tyreByKey(K.rear), f = tyreByKey(K.front);
    return {mass:K.mass, rearFrac:K.fr/100, wheelbase:K.wb, hitchH:K.hd, drive:"4WD", lead:0, kp:CAL.kp, lug:CAL.lug, nRear:2,
      rear:{b:r.b, d:r.d, h:r.ar*r.b, infl:K.inflR, radial:false}, front:{b:f.b, d:f.d, h:f.ar*f.b, infl:K.inflF, radial:false}};
  }
  function kimFactors(){
    var cf = kimCfg(), fs = D2.KIM_CASES.map(function(c){ return TSM.fitCase(cf, c); }), n = fs.length;
    return {kCI:fs.reduce(function(a,f){return a+f.kCI},0)/n, kRho:fs.reduce(function(a,f){return a+f.kRho},0)/n, each:fs};
  }
  var KIM_F = null;
  function kimF(){ if (!KIM_F) KIM_F = kimFactors(); return KIM_F; }   // (re-computed when kp/lug change)

  /* ---------- tractor library ---------- */
  $("tractorLib").innerHTML = '<option value="">— choose a tractor —</option>' + D2.TRACTORS.map(function(t){ return '<option value="'+t.id+'">'+t.label+'</option>'; }).join("");
  function applyTractor(t){
    $("drive-"+t.drive).checked = true; applyDrive(t.drive);
    $("rearTyre").value = t.rear; $("frontTyre").value = t.front;
    ["mass","fr","wb","hd","lead","inflR","inflF"].forEach(function(k){ if (t[k]!=null) $(k).value = t[k]; });
    $("lib-note").textContent = (t.note ? t.note+" " : "") + "Status: "+t.status+".";
    update();
  }
  $("tractorLib").addEventListener("change", function(){
    var id = this.value; if (!id) return;
    applyTractor(D2.TRACTORS.filter(function(t){return t.id===id})[0]);
  });

  /* ---------- field cases ---------- */
  $("caseSel").innerHTML = D2.KIM_CASES.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join("");
  function loadCase(id){
    var c = D2.KIM_CASES.filter(function(x){return x.id===id})[0], L = D2.KIM_LAYERS[id];
    applyTractor(D2.TRACTORS.filter(function(t){return t.id==="tx58"})[0]);
    $("sand").value = L.tex[0]; $("silt").value = L.tex[1]; $("clay").value = L.tex[2];
    document.getElementById("cond-firm").checked = true;
    $("moist").value = c.w_pct;
    // CI profile on the 0/5/10/15/20 cm grid from the four 50-mm layers, scaled so that the 0–150 mm mean equals the reported mean
    var v = [L.CI[0], (L.CI[0]+L.CI[1])/2, (L.CI[1]+L.CI[2])/2, L.CI[2], L.CI[3]];
    var pts = v.map(function(x,i){return {z:CI_DEPTHS[i], v:x}}), f = c.CI/meanTop(pts);
    CI_IDS.forEach(function(idn,i){ $(idn).value = i<5 ? Math.round(v[i]*f) : ""; });
    $("useci").checked = true; $("ci-inputs").hidden = false;
    document.getElementById("mode-draft").checked = true;
    $("dpTarget").value = c.DP; $("speed").value = Math.round(c.speed/(1-c.slip/100)*2)/2;
    update();
    var S = lastSnap.S;
    $("case-note").innerHTML = '<b>'+c.label+'</b> loaded. Measured: draft '+c.DP+' kN, slip '+c.slip+' ± '+c.slipSd+' %, tractive efficiency '+c.te+'. Model now gives slip <b>'+fmt(S.slipR,1)+' %</b> and TE <b>'+fmt(lastSnap.T.eff,2)+'</b> with the current κ. Use “Fit κ to the loaded field case” to calibrate.';
  }
  $("loadCase").addEventListener("click", function(){ loadCase($("caseSel").value); });
  $("kFitCase").addEventListener("click", function(){
    var id = $("caseSel").value, c = D2.KIM_CASES.filter(function(x){return x.id===id})[0];
    loadCase(id);
    var S = readState(), soil = soilFor(S, S.cond);
    var f = TSM.fitCase(tsCfg(S), {CI:ciOf(soil,S.moist), DP:c.DP, slip:c.slip, te:c.te});
    $("kCI").value = f.kCI.toFixed(2); $("kRho").value = f.kRho.toFixed(2); update();
    $("fitOut").textContent = "Fitted to "+c.label+" (n = 1): κCI = "+f.kCI.toFixed(2)+", κρ = "+f.kRho.toFixed(2)+" → slip "+fmt(f.slip,1)+" %, TE "+fmt(f.te,2)+".";
  });
  $("kText").addEventListener("click", function(){ $("kCI").value = 1; $("kRho").value = 1; update(); });
  $("kKim").addEventListener("click", function(){
    KIM_F = null; readState(); var k = kimF();
    $("kCI").value = k.kCI.toFixed(2); $("kRho").value = k.kRho.toFixed(2);
    $("fitOut").textContent = "Mean of the three Kim soils (n = 3, indicative): "+k.each.map(function(f,i){return D2.KIM_CASES[i].soil+" κCI "+f.kCI.toFixed(2)+" / κρ "+f.kRho.toFixed(2)}).join("; ")+".";
    update();
  });
  function parseCSV(){
    return $("csv").value.split(/\n/).map(function(l){ return l.split(/[,;\t ]+/).map(parseFloat); })
      .filter(function(r){ return r.length>=3 && r.slice(0,3).every(function(x){return isFinite(x)}); })
      .map(function(r,i){ return {label:"row "+(i+1), CI:r[0], DP:r[1], slip:r[2], te:isFinite(r[3])?r[3]:null}; });
  }
  $("fit").addEventListener("click", function(){
    var cases = parseCSV(); if (!cases.length){ $("fitOut").textContent = "No valid rows found (need CI, DP, slip[, TE])."; return; }
    var S = readState(), C = tsCfg(S), kc, kr, msg;
    if (cases.length < 3){
      var fs = cases.map(function(c){ return TSM.fitCase(C,c); });
      kc = fs.reduce(function(a,f){return a+f.kCI},0)/fs.length; kr = fs.reduce(function(a,f){return a+f.kRho},0)/fs.length;
      msg = "Mean of "+cases.length+" exact per-test fit(s).";
    } else {
      var cal = TSM.calibrate(C, cases); kc = cal.kCI; kr = cal.kRho;
      msg = "Global fit over "+cases.length+" tests: RMS slip error "+fmt(cal.rmsSlip,1)+" points"+(cal.rmsSlip>2.5 ? " — large; the factors are probably soil-specific, so fit each soil separately." : ".");
    }
    $("kCI").value = kc.toFixed(2); $("kRho").value = kr.toFixed(2);
    $("fitOut").textContent = msg+" κCI = "+kc.toFixed(2)+", κρ = "+kr.toFixed(2)+".";
    update();
  });
  $("csvClear").addEventListener("click", function(){ $("csv").value = ""; $("fitOut").textContent = ""; update(); });

  /* ---------- helpers for charts ---------- */
  function bars(fr, o, x, y, sx, sy, col){
    var g = "";
    if (sx) g += '<line x1="'+fr.xs(x-sx)+'" x2="'+fr.xs(x+sx)+'" y1="'+fr.ys(y)+'" y2="'+fr.ys(y)+'" stroke="'+col+'" stroke-width="1.4"/>';
    if (sy) g += '<line x1="'+fr.xs(x)+'" x2="'+fr.xs(x)+'" y1="'+fr.ys(y-sy)+'" y2="'+fr.ys(y+sy)+'" stroke="'+col+'" stroke-width="1.4"/>';
    return g;
  }
  function wtSweep(S, soil, kappa){
    return withCAL(kappa, function(){
      return SL.map(function(s){ var t = tractorSolve(S, soil, s); return {s:s, DP:t.DP, eff:t.eff, ratio:t.ratio}; });
    });
  }

  /* ---------- main advanced render ---------- */
  function advUpdate(S, soil, T, G, cur, opt, wc){
    var base = {kCI:1, kRho:1}, now = {kCI:CAL.kCI, kRho:CAL.kRho}, calibrated = (now.kCI!==1 || now.kRho!==1);
    var pts = parseCSV(); USERPTS = pts;

    /* status */
    var sh = [];
    if (calibrated) sh.push('<div class="alert good">Calibrated: κ<sub>CI</sub> = '+fmt(CAL.kCI,2)+', κ<sub>ρ</sub> = '+fmt(CAL.kRho,2)+'. Valid for the tractor and soil they were fitted on; the cone index entering B<sub>n</sub> is CI × κ<sub>CI</sub> = '+fmt(cur.CI*CAL.kCI,0)+' kPa.</div>');
    else sh.push('<div class="alert">Textbook model (κ = 1). Expect optimistic slip and tractive efficiency in soft, wet or tilled soil; see the validation table.</div>');
    if (S.draftNote && !S.draftNote.ok) sh.push('<div class="alert crit">The required pull ('+fmt(S.dpTarget,1)+' kN) exceeds the traction capacity of this tractor on this soil (max ≈ '+fmt(S.draftNote.maxDP,1)+' kN at '+fmt(S.draftNote.s,1)+' % slip). Showing the slip at maximum pull.</div>');
    $("cal-status").innerHTML = sh.join("");

    /* cases table */
    var ct = '<tr><th>Case</th><th>Texture</th><th>CI 0–150 mm (kPa)</th><th>w (%)</th><th>PI</th><th>Draft (kN)</th><th>Speed (km/h)</th><th>Slip (%)</th><th>TE</th></tr>';
    D2.KIM_CASES.forEach(function(c){ ct += '<tr><td>'+c.soil+'</td><td>'+D2.KIM_LAYERS[c.id].tex.join("/")+'</td><td>'+c.CI+'</td><td>'+c.w_pct.toFixed(1)+'</td><td>'+c.PI+'</td><td>'+c.DP+' ± '+c.DPsd+'</td><td>'+c.speed+'</td><td>'+c.slip+' ± '+c.slipSd+'</td><td>'+c.te+' ± '+c.teSd+'</td></tr>'; });
    ct += '<tr><td colspan="9" style="text-align:left;color:var(--muted);white-space:normal">Kim et al. (2022), TX58 4WD with moldboard plough, 12–20 cm depth, gear M3. Texture is sand/silt/clay (%); CI is the mean of the 0–50, 50–100 and 100–150 mm layers; w is the mean layer water content. Source status: text.</td></tr>';
    $("caseTab").innerHTML = ct;

    /* a1/a2: model vs measured */
    var tbk = wtSweep(S, soil, base), cal = wtSweep(S, soil, now);
    var o1 = {W:440,H:300,ml:46,mr:14,mt:14,mb:44,x0:0,x1:30,y0:0,y1:100,xt:[0,5,10,15,20,25,30],yt:[0,20,40,60,80,100],xl:"Rear wheel slip (%)",yl:"Tractive efficiency (%)"};
    var f1 = frame(o1), g1 = axes(o1,f1);
    g1 += '<path d="'+path(tbk.map(function(p){return [f1.xs(p.s), f1.ys(clamp(p.eff,0,1)*100)]}))+'" fill="none" stroke="var(--muted)" stroke-width="1.8" stroke-dasharray="5 4"/>';
    g1 += '<path d="'+path(cal.map(function(p){return [f1.xs(p.s), f1.ys(clamp(p.eff,0,1)*100)]}))+'" fill="none" stroke="var(--ntr)" stroke-width="2.8"/>';
    D2.KIM_CASES.forEach(function(c){ g1 += bars(f1,o1,c.slip,c.te*100,c.slipSd,c.teSd*100,"var(--fg)")+'<circle cx="'+f1.xs(c.slip)+'" cy="'+f1.ys(c.te*100)+'" r="5" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/><text x="'+(f1.xs(c.slip)+7)+'" y="'+(f1.ys(c.te*100)-7)+'">'+c.soil+'</text>'; });
    if ($("showMas").checked){
      var eta = clamp(+$("etaD").value||0.88, 0.6, 1);
      D2.MASIERO_SURFACES.forEach(function(m){ g1 += '<rect x="'+(f1.xs(m.slip_pct)-4)+'" y="'+(f1.ys(m.eff_pct/eta)-4)+'" width="8" height="8" fill="none" stroke="var(--tilled)" stroke-width="2"/><text x="'+(f1.xs(m.slip_pct)+7)+'" y="'+(f1.ys(m.eff_pct/eta)+13)+'" style="fill:var(--tilled)">'+m.surface+'</text>'; });
    }
    pts.forEach(function(p){ if (p.te!=null) g1 += '<circle cx="'+f1.xs(p.slip)+'" cy="'+f1.ys(p.te*100)+'" r="5" fill="var(--red)"/>'; });
    g1 += '<circle cx="'+f1.xs(S.slipR)+'" cy="'+f1.ys(T.eff*100)+'" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>';
    $("a1").innerHTML = g1;

    var maxDP = Math.max.apply(null, cal.concat(tbk).map(function(p){return p.DP}).concat(D2.KIM_CASES.map(function(c){return c.DP+c.DPsd}), pts.map(function(p){return p.DP}))), y1 = Math.max(10, Math.ceil(maxDP/5)*5);
    var o2 = {W:440,H:300,ml:46,mr:14,mt:14,mb:44,x0:0,x1:30,y0:0,y1:y1,xt:[0,5,10,15,20,25,30],yt:[0,1,2,3,4].map(function(k){return Math.round(y1*k/4)}),xl:"Rear wheel slip (%)",yl:"Drawbar pull (kN)"};
    var f2 = frame(o2), g2 = axes(o2,f2);
    g2 += '<path d="'+path(tbk.map(function(p){return [f2.xs(p.s), f2.ys(clamp(p.DP,0,y1))]}))+'" fill="none" stroke="var(--muted)" stroke-width="1.8" stroke-dasharray="5 4"/>';
    g2 += '<path d="'+path(cal.map(function(p){return [f2.xs(p.s), f2.ys(clamp(p.DP,0,y1))]}))+'" fill="none" stroke="var(--ntr)" stroke-width="2.8"/>';
    D2.KIM_CASES.forEach(function(c){ g2 += bars(f2,o2,c.slip,c.DP,c.slipSd,c.DPsd,"var(--fg)")+'<circle cx="'+f2.xs(c.slip)+'" cy="'+f2.ys(c.DP)+'" r="5" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/>'; });
    pts.forEach(function(p){ g2 += '<circle cx="'+f2.xs(p.slip)+'" cy="'+f2.ys(p.DP)+'" r="5" fill="var(--red)"/>'; });
    g2 += '<circle cx="'+f2.xs(S.slipR)+'" cy="'+f2.ys(clamp(T.DP,0,y1))+'" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>';
    $("a2").innerHTML = g2;
    var al = [], kc = tsCfg(S), kk = kimCfg();
    var differs = Math.abs(kc.mass-kk.mass)>1 || S.drive!=="4wd" || S.rear.id!=="14.9-30";
    if (differs) al.push('<div class="alert">The black Kim points belong to the TX58 (4WD, 14.9-30 / 11.2-20, 4072 kg). The curves are for the tractor currently configured, so only compare them when the TX58 is selected in the tractor library.</div>');
    $("a-alerts").innerHTML = al.join("");

    /* validation table (independent of the UI tractor) */
    var vt = '<tr><th>Soil</th><th>CI (kPa)</th><th>Draft (kN)</th><th>Measured slip %</th><th>Textbook slip %</th><th>Current κ slip %</th><th>Measured TE</th><th>Textbook TE</th><th>Current κ TE</th><th>Fitted κ<sub>CI</sub> / κ<sub>ρ</sub></th></tr>';
    var K = kimF(), kcfg = kimCfg();
    D2.KIM_CASES.forEach(function(c,i){
      var a = TSM.predictCase(kcfg,c,1,1), b = TSM.predictCase(kcfg,c,CAL.kCI,CAL.kRho);
      var nz = function(x,d){ return isFinite(x) ? fmt(x,d) : 'exceeds capacity'; };
      vt += '<tr><td>'+c.soil+'</td><td>'+c.CI+'</td><td>'+c.DP+'</td><td>'+c.slip+' ± '+c.slipSd+'</td><td>'+nz(a.slip,1)+'</td><td>'+nz(b.slip,1)+'</td><td>'+c.te+'</td><td>'+nz(a.te,2)+'</td><td>'+nz(b.te,2)+'</td><td>'+K.each[i].kCI.toFixed(2)+' / '+K.each[i].kRho.toFixed(2)+'</td></tr>';
    });
    $("valTab").innerHTML = vt;
    $("valNote").innerHTML = 'Computed for the TX58 with the contact-patch assumptions above (rear share 60 %, hitch 0.5 m, inflation 120/160 kPa — Kim et al. did not report them). The clay loam has the <b>highest</b> cone index yet the <b>highest</b> slip: cone index alone does not describe traction in wet, plastic soils, so κ differs per soil (n = 1 each). A single κ pair cannot fit all three.';

    /* subsoil stress, SCSI, compaction */
    var nu = nuOf(soil,S), str = Math.max(10, +$("strength").value||50), Npass = clamp(Math.round(+$("passes").value||5),1,30);
    var s05 = TSM.stressAt(G.pc, G.A, 0.5, nu), s05lo = TSM.stressAt(G.pc, G.A, 0.5, 3), s05hi = TSM.stressAt(G.pc, G.A, 0.5, 6);
    var Valera = D2.VALERA_PASSES, fit = TSM.fitLog(Valera.N.slice(1), Valera.gamma.slice(1)), rr = S.infl/110;
    var gam = fit.a + fit.b*Math.log10(Npass*rr);
    var risk = s05/str;
    $("kpis3").innerHTML = [
      ["Mean contact pressure", fmt(G.pc,0)+'<span>kPa</span>', "net area "+fmt(G.A*1e4,0)+" cm², gross "+fmt(G.Ag*1e4,0)+" cm²"],
      ["Stress at 0.3 m", fmt(TSM.stressAt(G.pc,G.A,0.3,nu),0)+'<span>kPa</span>', "ν = "+fmt(nu,1)],
      ["Stress at 0.5 m", fmt(s05,0)+'<span>kPa</span>', "ν 3 → 6: "+fmt(s05lo,0)+" – "+fmt(s05hi,0)+" kPa"],
      ["SCSI (0.5 m)", fmt(risk,2), risk>1?'<b class="pill crit">Risk</b>':(s05hi/str>1?'<b class="pill warn">If wet</b>':'<b class="pill good">Low</b>')],
      ["Surface density, "+Npass+" passes", fmt(gam,0)+'<span>kg/m³</span>', "Δ "+fmt(gam-Valera.gamma[0],0)+" from untrafficked (indicative)"]
    ].map(function(k){ return '<div class="kpi"><div class="l">'+k[0]+'</div><div class="v">'+k[1]+'</div><div class="h">'+k[2]+'</div></div>'; }).join("");
    var sa = [];
    if (risk>1) sa.push('<div class="alert crit">SCSI = '+fmt(risk,2)+' &gt; 1: stress at 0.5 m ('+fmt(s05,0)+' kPa) exceeds the assumed subsoil strength ('+str+' kPa). Chronic subsoil compaction is likely (Keller &amp; Or 2022). Reduce wheel load, lower inflation or use a larger footprint.</div>');
    else if (s05hi/str>1) sa.push('<div class="alert">SCSI ≤ 1 for ν = '+fmt(nu,1)+' but &gt; 1 for ν = 6 (wet, soft soil): the risk depends on soil moisture.</div>');
    else sa.push('<div class="alert good">Stress at 0.5 m is below the subsoil strength limit for all ν between 3 and 6.</div>');
    if (S.slipR>25) sa.push('<div class="alert">Rear slip above 25 %: outside the range where the traction equations and the Raghavan-type compaction law were validated.</div>');
    $("s-alerts").innerHTML = sa.join("");

    var o3 = {W:440,H:300,ml:46,mr:14,mt:14,mb:44,x0:0,x1:Math.max(60,Math.ceil(G.pc*1.1/20)*20),y0:0,y1:1,xt:[],yt:[0,0.2,0.4,0.6,0.8,1.0],fy:function(t){return t.toFixed(1)},xl:"Vertical stress on axis (kPa)",yl:"Depth (m)"};
    for (var q=0;q<=4;q++) o3.xt.push(Math.round(o3.x1*q/4));
    var f3 = frame(o3); f3.ys = function(z){ return o3.mt + z*(o3.H-o3.mt-o3.mb); };
    var g3 = axes(o3,f3);
    function prof(n){ var a=[]; for (var z=0.0; z<=1.0001; z+=0.02) a.push([f3.xs(TSM.stressAt(G.pc,G.A,z,n)), f3.ys(z)]); return a; }
    g3 += '<line x1="'+f3.xs(str)+'" x2="'+f3.xs(str)+'" y1="'+o3.mt+'" y2="'+(o3.H-o3.mb)+'" stroke="var(--crit)" stroke-dasharray="4 3"/><text x="'+(f3.xs(str)+4)+'" y="'+(o3.mt+11)+'" style="fill:var(--crit)">'+str+' kPa</text>';
    g3 += '<line x1="'+o3.ml+'" x2="'+(o3.W-o3.mr)+'" y1="'+f3.ys(0.5)+'" y2="'+f3.ys(0.5)+'" stroke="var(--muted)" stroke-dasharray="2 3"/><text x="'+(o3.W-o3.mr-4)+'" y="'+(f3.ys(0.5)-4)+'" text-anchor="end">SCSI depth 0.5 m</text>';
    [3,6].forEach(function(n){ g3 += '<path d="'+path(prof(n))+'" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 4"/>'; });
    g3 += '<path d="'+path(prof(nu))+'" fill="none" stroke="var(--accent)" stroke-width="2.8"/>';
    g3 += '<circle cx="'+f3.xs(s05)+'" cy="'+f3.ys(0.5)+'" r="5" fill="var(--surface)" stroke="var(--fg)" stroke-width="2.4"/>';
    $("a3").innerHTML = g3;

    var o4 = {W:440,H:300,ml:52,mr:14,mt:14,mb:44,x0:0,x1:30,y0:1100,y1:1500,xt:[0,5,10,15,20,25,30],yt:[1100,1200,1300,1400,1500],xl:"Passes in the same track",yl:"Surface dry density (kg/m³)"};
    var f4 = frame(o4), g4 = axes(o4,f4), a0=[], a1=[];
    for (var n=1;n<=30;n+=0.5){ a0.push([f4.xs(n), f4.ys(fit.a+fit.b*Math.log10(n))]); a1.push([f4.xs(n), f4.ys(fit.a+fit.b*Math.log10(n*rr))]); }
    g4 += '<line x1="'+o4.ml+'" x2="'+(o4.W-o4.mr)+'" y1="'+f4.ys(Valera.gamma[0])+'" y2="'+f4.ys(Valera.gamma[0])+'" stroke="var(--muted)" stroke-dasharray="2 3"/><text x="'+(o4.ml+4)+'" y="'+(f4.ys(Valera.gamma[0])-4)+'">untrafficked '+fmt(Valera.gamma[0],0)+'</text>';
    g4 += '<path d="'+path(a0)+'" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4"/><path d="'+path(a1)+'" fill="none" stroke="var(--ntr)" stroke-width="2.8"/>';
    Valera.N.slice(1).forEach(function(nn,i){ g4 += '<circle cx="'+f4.xs(nn)+'" cy="'+f4.ys(Valera.gamma[i+1])+'" r="4.5" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/>'; });
    g4 += '<circle cx="'+f4.xs(Npass)+'" cy="'+f4.ys(gam)+'" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>';
    $("a4").innerHTML = g4;
    $("s-note").innerHTML = 'Stress: σ<sub>z</sub> = p[1 − (z²/(a²+z²))<sup>ν/2</sup>] under a uniformly loaded circle of equal area (ν = 3 is Boussinesq; solid line uses the soil-dependent ν, dashed lines ν = 3 and 6). Density: log-law fitted to Valera et al. (2012) clay data (○, '+fmt(fit.b,0)+' kg/m³ per decade); grey dashed = their tractor, green = this tyre with passes scaled by inflation/110 kPa (assumption). Indicative only: Raghavan soil constants for your soil are not in the cited sources.';

    /* Bekker–Wong */
    var bk = D2.BEKKER[+$("bekSel").value], sB = clamp((+$("bekS").value||15)/100, 0.01, 0.6);
    var q = TSM.bekkerWheel(bk, G.b, G.d, S.load, sB);
    var br = TSM.brixius({CI:cur.CI, kCI:CAL.kCI, kRho:CAL.kRho, b:G.b, d:G.d, W:S.load, s:sB, dh:G.dh, radial:!!S.tyreObj.radial});
    $("bekOut").innerHTML = '<tr><th>Model</th><th>Sinkage z₀ (mm)</th><th>Thrust coeff. μ</th><th>Resistance coeff. ρ</th><th>Net coeff.</th></tr>'
      + '<tr><td>Bekker–Wong rigid wheel ('+bk.label+')</td><td>'+fmt(q.z0*1000,0)+'</td><td>'+fmt(q.mu,2)+'</td><td>'+fmt(q.rho,3)+'</td><td>'+fmt(q.mu-q.rho,2)+'</td></tr>'
      + '<tr><td>Brixius / ASABE (current κ, s = '+fmt(sB*100,0)+' %)</td><td>–</td><td>'+fmt(br.mu,2)+'</td><td>'+fmt(br.rho,3)+'</td><td>'+fmt(br.mu-br.rho,2)+'</td></tr>'
      + '<tr><td>Simulator rut depth (texture-derived Bekker constants)</td><td>'+fmt(sinkage(soil,S,G,sB*100)*1000,0)+'</td><td colspan="3" style="text-align:left;color:var(--muted)">n = '+fmt(soil.n,2)+', k<sub>c</sub> = '+fmt(soil.kc,1)+', k<sub>φ</sub> = '+fmt(soil.kphi,0)+(sinkage(soil,S,G,sB*100)/q.z0>3||sinkage(soil,S,G,sB*100)/q.z0<1/3?' — differs from rigid-wheel theory by more than 3×: treat rut depth as qualitative':'')+'</td></tr>';

    /* Al-Dosary */
    var e = D2.ALDOSARY.eq[$("adImp").value], PD=+$("adPD").value, PS=+$("adPS").value, MC=+$("adMC").value, STI=+$("adSTI").value, dm = D2.ALDOSARY.domain;
    var sl = e.c + e.pd*PD + e.mc*MC + e.ps*PS + e.sti*STI;
    var out = PD<dm.depth_cm[0]||PD>dm.depth_cm[1]||PS<dm.speed_kmh[0]||PS>dm.speed_kmh[1]||MC<dm.mc_pctdb[0]||MC>dm.mc_pctdb[1]||STI<dm.STI[0]||STI>dm.STI[1];
    $("adOut").innerHTML = '<p style="margin:4px 0"><b>Estimated rear slip: '+fmt(sl,1)+' %</b> (RMSE '+e.rmse+' %, R² '+e.R2+') '+(out?'<span class="pill crit">outside validated domain</span>':'<span class="pill good">inside domain</span>')+'</p><p class="note">Regression for one tractor: '+dm.soils+'; '+D2.ALDOSARY.tractor+'. Valid for depth '+dm.depth_cm.join("–")+' cm, speed '+dm.speed_kmh.join("–")+' km/h, moisture '+dm.mc_pctdb.join("–")+' % d.b., STI '+dm.STI.join("–")+'. Never extrapolate to other tractors. Compare with the simulator slip of '+fmt(S.slipR,1)+' % (different tractor).</p>';

    lastSnap = {S:S, soil:soil, T:T, G:G, cur:cur, cal:cal, tbk:tbk};
  }

  /* ---------- evidence table ---------- */
  (function(){
    var use = {kim2022:"Field validation and calibration (3 soils, TX58)", masiero2011:"Surface-class efficiency overlay", aldosary2023:"Case-specific slip estimator", valera2012:"Density-vs-passes law", kukharets2025:"Tyre contact area / stress (unit-test check)", keller2022:"Stress model, SCSI, ~50 kPa subsoil limit", brixius1987:"Wheel-numeric traction equations", mckyes1985:"Raghavan compaction law (form)", wong2010:"Bekker–Wong cross-check, terrain constants", thorpe2024:"Reviewed, not used (inconsistent table)", asabe497:"Cone-index classes"};
    var h = '<tr><th>Source</th><th>Used for</th><th>Verification status</th></tr>';
    Object.keys(D2.SOURCES).forEach(function(k){
      var s = D2.SOURCES[k], cls = /^text/.test(s.status) ? "st-text" : (/^recalled/.test(s.status) ? "st-rec" : "st-ind");
      h += '<tr><td>'+s.cite+(s.doi?' <a href="https://doi.org/'+s.doi+'" target="_blank" rel="noopener">DOI</a>':'')+'</td><td>'+(use[k]||"")+'</td><td class="'+cls+'">'+s.status+'</td></tr>';
    });
    $("evid").innerHTML = h;
  })();
  D2.BEKKER.forEach(function(b,i){ var o=document.createElement("option"); o.value=i; o.textContent=b.label; if (i===1) o.selected=true; $("bekSel").appendChild(o); });

  /* ---------- export / import ---------- */
  function download(name, text, type){
    var blob = new Blob([text], {type:type||"text/plain"}), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  var SKEYS = ["sand","silt","clay","moist","load","slip","speed","mass","fr","wb","hd","lead","inflR","inflF","dpTarget","strength","passes","kCI","kRho","kp","lug","adPD","adPS","adMC","adSTI","etaD","bekS"];
  function scenario(){
    var S = readState(), o = {app:"Tractor-Soil Simulator Advanced", version:"3.0.0", drive:S.drive, rearTyre:S.rearTyre, frontTyre:S.frontTyre, cond:S.cond, wheel:S.wheel, mode:S.mode, autoload:S.autoload, useCI:S.useCI, ci:S.ci, csv:$("csv").value};
    SKEYS.forEach(function(k){ o[k] = $(k).value; });
    return o;
  }
  $("expJson").addEventListener("click", function(){ download("tractor-soil-scenario.json", JSON.stringify(scenario(), null, 2), "application/json"); });
  $("impJsonBtn").addEventListener("click", function(){ $("impJson").click(); });
  $("impJson").addEventListener("change", function(){
    var f = this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(){
      try {
        var o = JSON.parse(r.result);
        $("drive-"+o.drive).checked = true; applyDrive(o.drive);
        $("rearTyre").value = o.rearTyre; $("frontTyre").value = o.frontTyre;
        document.getElementById("cond-"+o.cond).checked = true; document.getElementById("wheel-"+o.wheel).checked = true; document.getElementById("mode-"+o.mode).checked = true;
        $("autoload").checked = !!o.autoload;
        SKEYS.forEach(function(k){ if (o[k]!=null) $(k).value = o[k]; });
        $("useci").checked = !!o.useCI; $("ci-inputs").hidden = !o.useCI;
        (o.ci||[]).forEach(function(v,i){ $("ci"+i).value = isFinite(v) ? v : ""; });
        $("csv").value = o.csv || "";
        update();
      } catch(e){ alert("Could not read this scenario file."); }
    };
    r.readAsText(f); this.value = "";
  });
  $("expCsv").addEventListener("click", function(){
    var S = readState(), soil = soilFor(S, S.cond), now = {kCI:CAL.kCI, kRho:CAL.kRho};
    var hdr = ["# Tractor-Soil Simulator Advanced v3.0.0 slip sweep", "# "+new Date().toISOString(),
      "# drive="+S.drive+" rear="+S.rear.label+" front="+S.front.label+" mass_kg="+S.mass+" rear_static_pct="+S.fr+" wheelbase_m="+S.wb+" hitch_m="+S.hd+" lead_pct="+S.lead+" infl_rear_kPa="+S.inflR+" infl_front_kPa="+S.inflF,
      "# sand/silt/clay="+S.sand+"/"+S.silt+"/"+S.clay+" moisture_pct="+S.moist+" condition="+S.cond+" CI_kPa="+fmt(ciOf(soil,S.moist),0),
      "# kCI="+CAL.kCI+" kRho="+CAL.kRho+" kp="+CAL.kp+" lug="+CAL.lug, "slip_pct,DP_kN,DP_over_W,TE_whole_tractor,DP_textbook_kN,TE_textbook"];
    var cal = wtSweep(S, soil, now), tbk = wtSweep(S, soil, {kCI:1,kRho:1});
    var rows = cal.map(function(p,i){ return [p.s, p.DP.toFixed(3), p.ratio.toFixed(4), p.eff.toFixed(4), tbk[i].DP.toFixed(3), tbk[i].eff.toFixed(4)].join(","); });
    download("tractor-soil-sweep.csv", hdr.concat(rows).join("\n"), "text/csv");
  });
  $("printBtn").addEventListener("click", function(){ window.print(); });

  /* ---------- wiring ---------- */
  ["dpTarget","kCI","kRho","kp","lug","strength","passes","showMas","etaD","bekSel","bekS","adImp","adPD","adPS","adMC","adSTI"].forEach(function(k){
    $(k).addEventListener("input", function(){ if (k==="kp"||k==="lug") KIM_F = null; update(); });
    $(k).addEventListener("change", function(){ if (k==="kp"||k==="lug") KIM_F = null; update(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('input[name="mode"]'), function(r){ r.addEventListener("change", update); });

  window.__TSM_DEBUG = {tsCfg:tsCfg, snap:function(){return lastSnap}, solve:tractorSolve, soilFor:soilFor, ciOf:ciOf, readState:readState};
