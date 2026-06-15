import { mkdir, readdir, readFile, rm, stat, copyFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const output = path.join(root, "public");
const checkOnly = process.argv.includes("--check-only");

const htmlFiles = ["index.html", "message.html"];
const staticFiles = ["styles.css"];
const referencedAssets = new Set();
const forbiddenText = [
  {
    value: "https://forms.gle/18Y4WUax4FM4wuzQ7",
    message: "古い相談フォームURLが残っています。"
  },
  {
    value: 'href="#"',
    message: '空リンク href="#" が残っています。'
  },
  {
    value: "href='#'",
    message: "空リンク href='#' が残っています。"
  }
];

const failures = [];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyRecursive(from, to) {
  const info = await stat(from);
  if (info.isDirectory()) {
    await mkdir(to, { recursive: true });
    const entries = await readdir(from);
    await Promise.all(
      entries.map((entry) => copyRecursive(path.join(from, entry), path.join(to, entry)))
    );
    return;
  }
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
}

function isExternalReference(value) {
  return /^(https?:|mailto:|tel:|data:|javascript:)/.test(value);
}

function normalizeLocalPath(pageFile, reference) {
  const [withoutHash] = reference.split("#");
  const clean = decodeURI(withoutHash);
  if (!clean || clean.startsWith("#")) {
    return null;
  }
  const baseDir = path.dirname(path.join(root, pageFile));
  return path.normalize(path.join(baseDir, clean));
}

function collectIds(html) {
  const ids = new Set();
  const idPattern = /\sid=["']([^"']+)["']/g;
  for (const match of html.matchAll(idPattern)) {
    ids.add(match[1]);
  }
  return ids;
}

async function verifyHtmlFile(file) {
  const htmlPath = path.join(root, file);
  const html = await readFile(htmlPath, "utf8");
  const ids = collectIds(html);

  for (const rule of forbiddenText) {
    if (html.includes(rule.value)) {
      failures.push(`${file}: ${rule.message}`);
    }
  }

  const referencePattern = /\b(?:href|src)=["']([^"']+)["']/g;
  for (const match of html.matchAll(referencePattern)) {
    const reference = match[1];

    if (!reference || isExternalReference(reference)) {
      continue;
    }

    if (reference.startsWith("#")) {
      const id = reference.slice(1);
      if (id && !ids.has(id)) {
        failures.push(`${file}: #${id} に対応するIDがありません。`);
      }
      continue;
    }

    const localPath = normalizeLocalPath(file, reference);
    if (localPath && !(await exists(localPath))) {
      failures.push(`${file}: ${reference} が見つかりません。`);
    }

    if (localPath && path.relative(root, localPath).startsWith(`assets${path.sep}`)) {
      referencedAssets.add(path.relative(root, localPath));
    }

    const hash = reference.split("#")[1];
    if (hash && reference.endsWith(`#${hash}`)) {
      const targetFile = reference.split("#")[0] || file;
      const targetPath = path.join(root, targetFile);
      if (await exists(targetPath)) {
        const targetHtml = await readFile(targetPath, "utf8");
        const targetIds = collectIds(targetHtml);
        if (!targetIds.has(hash)) {
          failures.push(`${file}: ${reference} の移動先IDがありません。`);
        }
      }
    }
  }
}

async function verifyCssFile(file) {
  const cssPath = path.join(root, file);
  const css = await readFile(cssPath, "utf8");
  const urlPattern = /url\((["']?)([^"')]+)\1\)/g;

  for (const match of css.matchAll(urlPattern)) {
    const reference = match[2].trim();
    if (!reference || reference.startsWith("#") || isExternalReference(reference)) {
      continue;
    }

    const localPath = normalizeLocalPath(file, reference);
    if (localPath && !(await exists(localPath))) {
      failures.push(`${file}: ${reference} が見つかりません。`);
    }

    if (localPath && path.relative(root, localPath).startsWith(`assets${path.sep}`)) {
      referencedAssets.add(path.relative(root, localPath));
    }
  }
}

async function verifyRequiredFiles() {
  for (const file of [...htmlFiles, ...staticFiles]) {
    if (!(await exists(path.join(root, file)))) {
      failures.push(`${file} が見つかりません。`);
    }
  }

  if (!(await exists(path.join(root, "assets")))) {
    failures.push("assets/ が見つかりません。");
  }
}

async function build() {
  await verifyRequiredFiles();

  for (const file of htmlFiles) {
    if (await exists(path.join(root, file))) {
      await verifyHtmlFile(file);
    }
  }

  for (const file of staticFiles) {
    if (await exists(path.join(root, file)) && file.endsWith(".css")) {
      await verifyCssFile(file);
    }
  }

  if (failures.length > 0) {
    console.error("Build check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  if (checkOnly) {
    console.log("Static site check passed.");
    return;
  }

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  for (const file of [...htmlFiles, ...staticFiles]) {
    await copyRecursive(path.join(root, file), path.join(output, file));
  }

  for (const asset of referencedAssets) {
    await copyRecursive(path.join(root, asset), path.join(output, asset));
  }

  console.log("Build completed: public/");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
