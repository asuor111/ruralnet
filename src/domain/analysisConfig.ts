// Central, documented thresholds used by the deterministic analysis rules.
// These are deliberately constants (not heuristics hidden in UI code) so the
// methodology can be reviewed, tested and cited from /methodology.

export interface AnalysisThresholds {
  /** Population at/above which demand is considered "high". */
  highPopulation: number;
  /** Fibre closer than this is "proximate"; at/over this it is a gap. */
  fibreWarnKm: number;
  /** Search radius used to look for mapped fibre infrastructure. */
  fibreSearchRadiusKm: number;
  /** Electricity access below this is considered a constraint. */
  electricityLowPct: number;
  /** Fewer mapped towers than this near a populated centre is "sparse". */
  sparseTowers: number;
  /** Coverage below this is "low" for gap purposes. */
  coverageLowPct: number;
  /** Internet uptake below this is "low" for gap purposes. */
  internetLowPct: number;
}

export const ANALYSIS_THRESHOLDS: AnalysisThresholds = {
  highPopulation: 100_000,
  fibreWarnKm: 15,
  fibreSearchRadiusKm: 25,
  electricityLowPct: 50,
  sparseTowers: 3,
  coverageLowPct: 40,
  internetLowPct: 30,
};