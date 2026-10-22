# Changelog
## v2.0 — Advanced (supersedes the basic version; DOI 10.5281/zenodo.23571068)
* Built on the original page: all graphics and soil tools retained (texture triangle, India map, field scene, Atterberg bar, cone-index profile, tyre lists, 2WD/MFWD/4WD, scenarios).
* Physics core replaced by the tested `src/model.js` (see v2.0.0 fixes below); the page solver matches the core to <0.05 kN across all library tractors.
* Added: tractor library, radial tyres and selectable 4WD front tyre, drawbar-pull (inverse) mode, field cases with layer CI, calibration (κ_CI, κ_ρ) and CSV fitting, validation table and charts, SCSI and subsoil-stress bounds, density-vs-passes, Bekker–Wong and Al-Dosary panels, evidence table, CSV/JSON export, print.
* Removed external web-font request (fully offline).
* `basic.html` keeps the compact v2 interface.
## v2.0.0
* **Fix:** rolling-resistance coefficient for bias tyres now ρ = 1/Bn + 0.04 + 0.5 s/√Bn (v1 used 1.2/Bn, the older Wismer–Luth form). Radial: 0.9/Bn + 0.0325 + 0.5 s/√Bn.
* **Fix:** wheel numeric uses the load on *one wheel* (not the axle load) with that tyre's b and d.
* **Change:** contact patch derived from net contact pressure (kp·inflation) and a lug-contact ratio; δ/h from chord geometry (v1 used an uncalibrated fit). Measured footprints can override.
* **New:** whole-tractor solver, inverse draft solver, calibration (κ_CI, κ_ρ), CSV fitting, field-case overlay, validation table, Bekker–Wong check, Al-Dosary slip estimator, SCSI, density-vs-passes, evidence panel, tests.
* (v2 compact page omitted the triangle/map; this release restores them.)
