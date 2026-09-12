import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = process.cwd();
const documentationRoot = path.join(repositoryRoot, "docs");
const markdownLinkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

function localTarget(rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.endsWith(">")) {
    target = target.slice(1, -1);
  }
  if (
    !target ||
    target.startsWith("#") ||
    /^(?:https?:|mailto:|tel:)/i.test(target)
  ) {
    return undefined;
  }

  return decodeURIComponent(target.split("#", 1)[0]);
}

const markdownFiles = [
  path.join(repositoryRoot, "README.md"),
  ...(await collectMarkdownFiles(documentationRoot)),
];
const failures = [];

for (const markdownFile of markdownFiles) {
  const source = await readFile(markdownFile, "utf8");
  for (const match of source.matchAll(markdownLinkPattern)) {
    const target = localTarget(match[1]);
    if (!target) continue;

    const resolvedTarget = path.resolve(path.dirname(markdownFile), target);
    const relativeTarget = path.relative(repositoryRoot, resolvedTarget);
    if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
      failures.push(
        `${path.relative(repositoryRoot, markdownFile)}: link escapes the repository: ${target}`
      );
      continue;
    }

    try {
      await stat(resolvedTarget);
    } catch {
      failures.push(
        `${path.relative(repositoryRoot, markdownFile)}: missing link target: ${target}`
      );
    }
  }
}

const requiredLivingDocuments = [
  "docs/README.md",
  "docs/developer-guide.md",
  "docs/admin-support-guide.md",
  "docs/environment-reference.md",
  "docs/documentation-governance.md",
  "docs/runbooks/staff-onboarding.md",
  "docs/runbooks/child-app-onboarding.md",
  "docs/implementation-slice-register.md",
  "docs/policy-decision-register.md",
];

for (const requiredDocument of requiredLivingDocuments) {
  try {
    await stat(path.join(repositoryRoot, requiredDocument));
  } catch {
    failures.push(`required living document is missing: ${requiredDocument}`);
  }
}

if (failures.length > 0) {
  console.error("Documentation verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Documentation verification passed for ${markdownFiles.length} Markdown files.`);
}
