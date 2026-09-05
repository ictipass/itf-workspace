// tsx asks Node for the current OS user when process.geteuid is unavailable.
// Some managed Windows runners deny that lookup, so use a deterministic,
// test-only temporary-directory suffix before tsx is loaded.
if (process.platform === "win32" && typeof process.geteuid !== "function") {
  Object.defineProperty(process, "geteuid", {
    configurable: true,
    value: () => 0,
  });
}
