/**
 * Ensures no file under src/features/<A>/ imports from src/features/<B>/ where A !== B.
 * Run: npm run verify:features
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(ROOT, 'src', 'features');
const FEATURES = ['opd', 'doctor', 'lab', 'nurse', 'pharmacy'];

const IMPORT_RE =
  /(?:import\s+[^'"]+from\s+|export\s+[^'"]+from\s+|import\s*\()\s*['"](@\/features\/([^/'"]+))[^'"]*['"]/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function featureOfFile(filePath) {
  const rel = path.relative(FEATURES_DIR, filePath).replace(/\\/g, '/');
  const top = rel.split('/')[0];
  return FEATURES.includes(top) ? top : null;
}

function checkFile(filePath) {
  const owner = featureOfFile(filePath);
  if (!owner) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  let match;

  while ((match = IMPORT_RE.exec(content)) !== null) {
    const importPath = match[1];
    const importedFeature = match[2];
    if (importedFeature !== owner) {
      violations.push({
        file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
        owner,
        importedFeature,
        importPath,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  return violations;
}

const allFiles = walk(FEATURES_DIR);
const violations = allFiles.flatMap(checkFile);

if (violations.length === 0) {
  console.log(`OK: ${allFiles.length} files scanned — no cross-feature imports.`);
  process.exit(0);
}

console.error(`FAIL: ${violations.length} cross-feature import(s):\n`);
for (const v of violations) {
  console.error(
    `  ${v.file}:${v.line}  features/${v.owner} → ${v.importPath} (features/${v.importedFeature})`
  );
}
process.exit(1);
