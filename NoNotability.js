/*
 * NoNotability for Loon
 * Scope: responses of https://notability.com/global
 *
 * Goals:
 * 1. Hide/disable the manual Notability Cloud migration entry.
 * 2. Keep automatic migration disabled.
 * 3. Keep the observed "CloudKit Unused Asset Deletion" experiment disabled.
 * 4. Present the subscription as "plus" so Lite-tier upgrade prompts and
 *    feature gates disappear. Server-side billing is not affected.
 *
 * Note: cloudKitDeleteUnusedAssets is only an observed remote flag. Its exact
 * deletion target (local cached asset vs. orphan CloudKit asset) is not proven
 * by the packet capture, so this script conservatively forces it OFF only when
 * the server already returns that known key/experiment.
 */

(function () {
  const FORCED_TIER = "plus";
  const FAR_FUTURE_MS = 4102444799000; // 2099-12-31T23:59:59Z
  const FAR_FUTURE_ISO = "2099-12-31T23:59:59.000Z";

  const body = $response && $response.body;
  if (!body || typeof body !== "string") {
    $done({});
    return;
  }

  let root;
  try {
    root = JSON.parse(body);
  } catch (e) {
    console.log("[NoNotability] Non-JSON response, skipped");
    $done({});
    return;
  }

  const data = root && root.data;
  let changed = false;

  if (data && data.updateExperimentData) {
    changed = guardExperimentData(data.updateExperimentData);
  } else if (data && (data.processAppleReceipt || data.associateAppStoreTransactions)) {
    changed = upgradeSubscription(data);
  }

  if (!changed) {
    console.log("[NoNotability] Nothing to change; passed through");
    $done({});
    return;
  }

  $done({ body: JSON.stringify(root) });

  function guardExperimentData(ed) {
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

    if (Array.isArray(ed.experiments)) {
      for (const item of ed.experiments) {
        if (!item || typeof item.experimentName !== "string") continue;
        const target = forcedExperiments[item.experimentName];
        if (target !== undefined && item.variantName !== target) {
          console.log(
            `[NoNotability] ${item.experimentName}: ${item.variantName} -> ${target}`
          );
          item.variantName = target;
          changed = true;
        }
      }
    }

    if (Array.isArray(ed.values)) {
      for (const item of ed.values) {
        if (!item || typeof item.parameterName !== "string") continue;
        const target = forcedValues[item.parameterName];
        if (target !== undefined && item.value !== target) {
          console.log(
            `[NoNotability] ${item.parameterName}: ${item.value} -> ${target}`
          );
          item.value = target;
          changed = true;
        }
      }
    }

    return changed;
  }

  function upgradeSubscription(data) {
    let changed = false;

    const patch = (sub) => {
      if (!sub) return;
      if (sub.tier && sub.tier !== FORCED_TIER) {
        console.log(`[NoNotability] subscription.tier: ${sub.tier} -> ${FORCED_TIER}`);
        sub.tier = FORCED_TIER;
        changed = true;
      }
      if (sub.status && sub.status !== "active") {
        console.log(`[NoNotability] subscription.status: ${sub.status} -> active`);
        sub.status = "active";
        changed = true;
      }
      if (typeof sub.expirationDate === "number") {
        if (sub.expirationDate < FAR_FUTURE_MS) {
          console.log(
            `[NoNotability] subscription.expirationDate -> ${FAR_FUTURE_MS}`
          );
          sub.expirationDate = FAR_FUTURE_MS;
          changed = true;
        }
      } else if (sub.expirationDate && sub.expirationDate !== FAR_FUTURE_ISO) {
        console.log(`[NoNotability] subscription.expirationDate -> ${FAR_FUTURE_ISO}`);
        sub.expirationDate = FAR_FUTURE_ISO;
        changed = true;
      }
    };

    if (data.processAppleReceipt) {
      patch(data.processAppleReceipt.subscription);
    }

    const overview = data.associateAppStoreTransactions;
    if (overview) {
      if (overview.tier && overview.tier !== FORCED_TIER) {
        console.log(`[NoNotability] overview.tier: ${overview.tier} -> ${FORCED_TIER}`);
        overview.tier = FORCED_TIER;
        changed = true;
      }
      patch(overview.current);
      if (overview.prior) patch(overview.prior);
    }

    return changed;
  }
})();
