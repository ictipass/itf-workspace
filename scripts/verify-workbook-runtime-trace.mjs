import { readFile } from "node:fs/promises";
import path from "node:path";

const traceFiles = [
  ".next/server/app/dashboard/admin/setup/page.js.nft.json",
  ".next/server/app/api/admin/setup/organization-workbook/route.js.nft.json",
];

const requiredRuntimePackages = [
  "@excel.js/exceljs",
  "@excel.js/jszip",
  "es-pako",
  "fast-csv",
  "@fast-csv/format",
  "@fast-csv/parse",
  "dayjs",
  "saxes",
  "xmlchars",
  "lodash.escaperegexp",
  "lodash.groupby",
  "lodash.uniq",
];

function hasPackage(files, packageName) {
  const packagePath = `/node_modules/${packageName}/`;
  return files.some((file) => `/${file.replaceAll("\\", "/")}`.includes(packagePath));
}

const failures = [];

for (const traceFile of traceFiles) {
  let trace;

  try {
    trace = JSON.parse(await readFile(path.resolve(traceFile), "utf8"));
  } catch (error) {
    failures.push(`${traceFile}: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  if (!Array.isArray(trace.files)) {
    failures.push(`${traceFile}: trace does not contain a files array`);
    continue;
  }

  const missingPackages = requiredRuntimePackages.filter(
    (packageName) => !hasPackage(trace.files, packageName),
  );

  if (missingPackages.length > 0) {
    failures.push(`${traceFile}: missing ${missingPackages.join(", ")}`);
  }
}

if (failures.length > 0) {
  console.error("Organization workbook runtime trace verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Organization workbook runtime dependencies are present in the deployment traces.");
}
