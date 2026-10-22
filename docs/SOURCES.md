# Evidence base and verification status
Status codes: **text** = value read from the open-access full text / Project book; **recalled** = standard literature value not re-checked against a copy; **derived** = computed here; **indicative** = assumed/fitted here.

| Id | Reference | DOI / PMID | Used for | Status |
|---|---|---|---|---|
| kim2022 | Kim Y.-S. et al. (2022) Sensors 22(7):2750 | 10.3390/s22072750 · PMID 35408364 | 3 field cases (CI, draft, slip, TE), TX58 4WD tractor | text; axle loads, inflation, hitch height not reported |
| masiero2011 | Masiero F.C., Lanças K.P., Monteiro L.A. (2011) Rev. Energia na Agricultura 26(4):55–73 | – | Surface-class drawbar efficiency & slip (concrete 63.2 %/7.6 %, firm 56.5/11.9, vegetation 49.7/14.6, tilled 44.0/16.2) | text; efficiency = drawbar/engine power |
| aldosary2023 | Al-Dosary N.M.N., Alnajjar F.M., Aboukarima A.E.M. (2023) Sci. Rep. 13:5975 | 10.1038/s41598-023-32994-7 · PMID 37046038 | MLR slip equations (chisel/moldboard/disk) with domain | text; STI formula garbled in source, not used |
| valera2012 | Valera D.L., Gil J., Agüera J. (2012) Sensors 12(10):13480 | 10.3390/s121013480 · PMID 23202006 | Dry density vs passes (clay) | text; units not stated (kg/m³ assumed) |
| kukharets2025 | Kukharets S. et al. (2025) Sci. Rep. | 10.1038/s41598-024-84102-y | Contact area/stress regressions for 900/60R42 (unit tests) | text |
| keller2022 | Keller T., Or D. (2022) PNAS 119(21):e2117699119 | 10.1073/pnas.2117699119 · PMID 35576469 | Stress model, SCSI, ~50 kPa subsoil limit | text |
| brixius1987 | Brixius W.W. (1987) ASAE Paper 87-1622; ASABE D497.7 | – | Wheel-numeric traction equations | recalled |
| mckyes1985 | McKyes E. (1985) Soil Cutting and Tillage, Elsevier | – | Raghavan density law form | text (form only) |
| wong2010 | Wong J.Y. (2010) Terramechanics and Off-Road Vehicle Engineering | – | Bekker–Wong; terrain constants | recalled |
| thorpe2024 | Thorpe D.F. et al. (2024) Acta Sci. Agron. 46(1):e67906 | 10.4025/actasciagron.v46i1.67906 | Reviewed; wheel-load column inconsistent with contact areas → not used | text |

## Findings that matter
* On Kim's three soils the textbook model under-predicted rear slip by 45–62 % (e.g. 8.4 vs 22.3 % on clay loam) and the clay loam had the highest CI yet the highest slip: CI alone does not describe traction in wet, plastic soils.
* Per-case fitted factors (κ_CI / κ_ρ): sandy loam 0.30/0.30, loam 0.37/0.33, clay loam 0.29/0.50 (assumed 4072 kg, 60 % rear, 120/160 kPa, hitch 0.5 m, kp 1.3, lug 0.6). n = 1 per soil.
