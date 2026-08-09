/*
 * Notability iCloud / CloudKit guard + announcement injector for Loon
 * Scope: responses of https://notability.com/global and
 *        https://notability.com/global/zendesk/v2/help_center/articles/search.json
 *
 * Goals:
 * 1. Hide/disable the manual Notability Cloud migration entry.
 * 2. Keep automatic migration disabled.
 * 3. Keep the observed "CloudKit Unused Asset Deletion" experiment disabled.
 * 4. Inject a custom announcement into the home screen notification center
 *    ("Latest Updates" feed, section 200815918). Both a zh-cn and an en-us
 *    copy are prepended so the card shows regardless of device language.
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

  if (
    root &&
    Array.isArray(root.results) &&
    $request &&
    typeof $request.url === "string" &&
    $request.url.indexOf("/global/zendesk/") !== -1
  ) {
    injectAnnouncement(root);
    $done({ body: JSON.stringify(root) });
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

  function injectAnnouncement(root) {
    const id = 9900000000001;
    if (root.results.some((a) => a && a.id === id)) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const base = {
      id,
      url:
        "https://notability.zendesk.com/api/v2/help_center/zh-cn/articles/" +
        id +
        ".json",
      html_url: "https://support.gingerlabs.com/hc/zh-cn/articles/" + id,
      author_id: 372617689631,
      comments_disabled: true,
      draft: false,
      promoted: true,
      position: 0,
      vote_sum: 0,
      vote_count: 0,
      section_id: 200815918,
      created_at: nowIso,
      updated_at: nowIso,
      edited_at: nowIso,
      outdated: false,
      outdated_locales: [],
      user_segment_id: null,
      permission_group_id: 155352,
      content_tag_ids: [],
      label_names: [],
      result_type: "article"
    };

    const title = "公告";
    const snippet = "这是注入的测试公告。";
    const bodyHtml =
      "<h2>公告</h2><p>这是注入的测试公告，如果这条内容显示出来，说明注入成功。</p>";

    const zh = Object.assign({}, base, {
      source_locale: "zh-cn",
      locale: "zh-cn",
      name: title,
      title,
      snippet,
      body: bodyHtml
    });

    const en = Object.assign({}, base, {
      id: id + 1,
      source_locale: "en-us",
      locale: "en-us",
      name: "Announcement",
      title: "Announcement",
      snippet: "This is an injected test announcement.",
      body: "<h2>Announcement</h2><p>This is an injected test announcement.</p>"
    });

    root.results.unshift(zh, en);
    if (typeof root.count === "number") root.count += 2;
    console.log("[Notability Guard] Injected announcement articles");
  }
})();
