# Optional maintainer check (needs: pip install playwright). Confirms the page's whole-tractor solver equals the unit-tested core.
# Edit the file:// path below to your local index.html.
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    pg=b.new_page(viewport={'width':1400,'height':1000}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/work/repo/index.html'); pg.wait_for_timeout(500)
    # consistency of page solver vs tested TSM core across drives / tractors / slips
    js="""(tid)=>{
      const sel=document.getElementById('tractorLib'); sel.value=tid; sel.dispatchEvent(new Event('change'));
      const out=[]; const D=window.__TSM_DEBUG;
      for (const s of [4,8,12,20]) {
        document.getElementById('slip').value=s; document.getElementById('slip').dispatchEvent(new Event('input'));
        const S=D.readState(); const soil=D.soilFor(S,S.cond); const T=D.solve(S,soil,s);
        const C=D.tsCfg(S); const CI=D.ciOf(soil,S.moist);
        const r=TSM.pullCapacity(C,{CI:CI,kCI:1,kRho:1},s/100);
        out.push([tid,s,+T.DP.toFixed(3),+r.pull.toFixed(3),+T.eff.toFixed(3),+r.te.toFixed(3)]);
      } return out; }"""
    bad=0
    for tid in ['mini2','std2','std4m','large4m','hp4m','gen4','tx58']:
        for row in pg.evaluate(js,tid):
            ok=abs(row[2]-row[3])<0.05 and abs(row[4]-row[5])<0.02
            bad+= (not ok); print(row,'OK' if ok else 'DIFF')
    print('diffs',bad,'errs',errs); b.close()
