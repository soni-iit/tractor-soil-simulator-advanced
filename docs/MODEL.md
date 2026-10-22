# Model description
See the "Model equations" panel in the app. Key choices and where they come from are listed in `SOURCES.md`.
**Tractive efficiency (exact for unequal axle slips):** TE = DP / Σ[GTR_axle/(1 − s_axle)], because axle input power = GTR·v_theoretical and DP·v = output.
**Calibration:** κ_CI scales the cone index entering Bn; κ_ρ scales ρ. With one test: κ_CI matches slip, κ_ρ matches TE. With ≥3 tests a global least-squares fit minimises Σ[ln(s_pred/s_meas)]² + ((TE_pred − TE_meas)/0.05)².
**Validity:** bias/radial coefficients are for agricultural soils with CI ≈ 400–2200 kPa and slip < 25 %; the compaction law is valid for moisture below optimum and indicative only.
