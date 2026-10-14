/** Builds import/no-restricted-paths zones for cross-feature boundary enforcement */
// Platform Admin: isolated from every hospital feature
const FEATURES = ['opd', 'doctor', 'lab', 'nurse', 'pharmacy', 'Platform Admin'];

function buildCrossFeatureZones() {
  const zones = [];
  for (const target of FEATURES) {
    for (const from of FEATURES) {
      if (target === from) continue;
      zones.push({
        target: `./src/features/${target}`,
        from: `./src/features/${from}`,
        message: `Cross-feature import blocked: features/${target} cannot import from features/${from}. Move shared code to @/shared/.`,
      });
    }
  }
  return zones;
}

module.exports = { buildCrossFeatureZones, FEATURES };