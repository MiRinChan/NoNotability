/*
 * Notability iCloud / CloudKit guard for Loon
 * Scope: response of https://notability.com/global
 *
 * Goals:
 * 1. Hide/disable the manual Notability Cloud migration entry.
 * 2. Keep automatic migration disabled.
 * 3. Keep the observed "CloudKit Unused Asset Deletion" experiment disabled.
 *
 * Note: cloudKitDeleteUnusedAssets is only an observed remote flag. Its exact
 * deletion target (local cached asset vs. orphan CloudKit asset) is not proven
 * by the packet capture, so this script conservatively forces it OFF only when
 * the server already returns that known key/experiment.
 */

(function () {
  const body = $response && $response.body;
  if (!body || typeof body !== "string") {
    $done({});
    return;
  }

  let root;
  try {
    root = JSON.parse(body);
  } catch (e) {
    console.log("[Notability Guard] Non-JSON response, skipped");
    $done({});
    return;
  }

  const data = root && root.data && root.data.updateExperimentData;
  if (!data) {
    $done({});
    return;
  }

  let changed = false;

  const forcedExperiments = {
    "China CloudKit Migration Settings": "control",
    "China CloudKit Auto Migration": "control",
    "CloudKit Unused Asset Deletion": "control"
  };

  const forcedValues = {
    chinaCloudKitMigrationSettings: "off",
    chinaCloudKitAutoMigration: "off",
    cloudKitDeleteUnusedAssets: "off"
  };

  if (Array.isArray(data.experiments)) {
    for (const item of data.experiments) {
      if (!item || typeof item.experimentName !== "string") continue;
      const target = forcedExperiments[item.experimentName];
      if (target !== undefined && item.variantName !== target) {
        console.log(
          `[Notability Guard] ${item.experimentName}: ${item.variantName} -> ${target}`
        );
        item.variantName = target;
        changed = true;
      }
    }
  }

  if (Array.isArray(data.values)) {
    for (const item of data.values) {
      if (!item || typeof item.parameterName !== "string") continue;
      const target = forcedValues[item.parameterName];
      if (target !== undefined && item.value !== target) {
        console.log(
          `[Notability Guard] ${item.parameterName}: ${item.value} -> ${target}`
        );
        item.value = target;
        changed = true;
      }
    }
  }

  if (!changed) {
    console.log("[Notability Guard] Known flags already safe; no change");
    $done({});
    return;
  }

  $done({ body: JSON.stringify(root) });
})();
