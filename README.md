# Tractor–Soil Interaction Simulator v2 Advanced

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23571067.svg)](https://doi.org/10.5281/zenodo.23571067)

**Live:** https://soni-iit.github.io/tractor-soil-simulator-advanced/ · **Basic version:** https://soni-iit.github.io/tractor-soil-simulator/

Complete, offline, single-file simulator that extends the basic version (https://soni-iit.github.io/tractor-soil-simulator/) with field-calibrated physics.
**Author:** Peeyush Soni, Dept. of Agricultural & Food Engineering, IIT Kharagpur · **Licence:** MIT

## Everything from the basic version is kept
USDA texture triangle (click/drag) · typical Indian regions with state map for each class · soil moisture with Atterberg limits and consistency warnings · measured cone-index profile with depth · field view (soil cross-section, tractor, tyres to scale, axle-load arrows, rut, cracks) · 2WD / MFWD / 4WD with front lead · tyre lists (bias and now radial) · single-wheel and whole-tractor results · operating scenarios · drag-on-chart slip setting · citation block.

## What the advanced version adds
| Area | Advanced feature |
|---|---|
| Tractor | Tractor library (class presets + the Kim 2022 TX58 test tractor), 4WD with different front tyre, radial tyres, hitch height, ballast via mass |
| Traction physics | Corrected Brixius/ASABE D497.7 equations (bias and radial), per-wheel loading, contact patch from net pressure and lug ratio, measured-footprint-ready assumptions |
| Operation | “Set drawbar pull” mode: the inverse problem (required pull → slip, TE, power) |
| Field data | Three published plough trials (Kim 2022) loadable with layer-wise cone index; Masiero 2011 surface means; your own tests (CSV) plotted on the charts |
| Calibration | κ_CI and κ_ρ, fitted to one case, the Kim mean, or your own data (global least-squares) |
| Validation | Reality-check table (textbook vs calibrated vs measured), model-vs-measured charts with error bars |
| Soil stress | Subsoil stress vs depth (ν 3–6), SCSI at 0.5 m (Keller & Or 2022), density-vs-passes law (Valera 2012) |
| Cross-checks | Bekker–Wong rigid-wheel theory; Al-Dosary 2023 slip regression with domain-of-validity flag |
| Provenance | Evidence table: DOI and verification status for every source |
| Workflow | CSV slip-sweep export, scenario save/load (JSON), print/PDF |

## How to cite
Version v2.0 (this release):

> Soni, P. (2026). *Tractor–Soil Interaction Simulator v2 Advanced* (Version v2.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.23571068

All versions (concept DOI): https://doi.org/10.5281/zenodo.23571067 · Basic version: https://doi.org/10.5281/zenodo.23560841

## Files
* `index.html` — the advanced simulator (open by double-click; works offline).
* `basic.html` — compact calibrated v2 (no map/triangle).
* `src/` — sources (`model.js` physics, `data.js` evidence base, `advanced.template.html` page, `advanced.js`, `advanced.html`).
* `tests/run.js` — 42 automated checks; `tests/browser_consistency.py` — optional page-vs-core check.
* `docs/` — SOURCES.md, MODEL.md. `CHANGELOG.md` lists all corrections to v1.

## Using it (no programming needed)
1. Open `index.html`. 2. Choose a tractor from the library (or set drive, tyres, mass, axle split), set soil texture, moisture and, if you have it, a cone-index profile. 3. Choose “Set slip” or “Set drawbar pull”. 4. To calibrate, use panel “Calibration” (fit to a loaded field case or paste your own tests).

## Publishing on GitHub Pages
1. github.com → **New repository** → name e.g. `tractor-soil-simulator-advanced` → Public → Create.
2. **Add file → Upload files** → drag all files and folders from this folder → **Commit changes**.
3. **Settings → Pages → Branch main, folder / (root) → Save.** After a minute: `https://<user>.github.io/<repository>/`.
(To replace your existing site instead, upload `index.html` into the `soni-iit.github.io` repository root, keeping `basic` history in a branch or release.)

## Rebuilding / testing (optional; needs Node.js ≥ 18)
```
node tests/run.js   # all checks
node build.js       # regenerate index.html and basic.html from src/
```

## Honest limitations
* The calibration data are three trials on one tractor with bias tyres. κ_CI ≈ 0.3–0.4 and κ_ρ ≈ 0.3–0.5 were needed there; a single pair does not fit all three soils (RMS ≈ 4.7 slip points). Treat factors as soil- and tractor-specific.
* Axle split, inflation and hitch height of the Kim tractor were not reported — assumed. Tractor-library entries other than the TX58 are class values, not specific models.
* Contact-pressure ratio kp (1.3) and lug ratio (0.6) are assumptions. Rut depth from the texture-derived Bekker constants (inherited from v1) is qualitative.
* Brixius/ASABE coefficients and Bekker terrain constants are “recalled” textbook values: verify against your copies before publication.
* Compaction constants (Raghavan A1, B1) for your soil are not in the cited sources; the density curve is indicative.
