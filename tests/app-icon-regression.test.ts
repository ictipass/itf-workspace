import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  APP_ICON_KEYS,
  APP_ICON_OPTIONS,
  DEFAULT_APP_ICON_KEY,
  isAppIconKey,
  resolveAppIconKey,
} from "../lib/apps/app-icons";

describe("curated application icon catalogue", () => {
  test("provides one labelled option for every stable icon key", () => {
    assert.equal(APP_ICON_OPTIONS.length, APP_ICON_KEYS.length);
    assert.equal(new Set(APP_ICON_KEYS).size, APP_ICON_KEYS.length);
    assert.deepEqual(
      APP_ICON_OPTIONS.map((option) => option.key),
      APP_ICON_KEYS
    );
    assert.ok(APP_ICON_OPTIONS.every((option) => option.label.trim().length > 0));
  });

  test("accepts only curated icon keys", () => {
    assert.equal(isAppIconKey("workflow"), true);
    assert.equal(isAppIconKey("<script>alert(1)</script>"), false);
    assert.equal(isAppIconKey("https://untrusted.example/icon.svg"), false);
  });

  test("uses a deterministic fallback for missing or legacy values", () => {
    assert.equal(resolveAppIconKey(null), DEFAULT_APP_ICON_KEY);
    assert.equal(resolveAppIconKey("legacy-icon-name"), DEFAULT_APP_ICON_KEY);
    assert.equal(resolveAppIconKey("hand-coins"), "hand-coins");
  });
});
