const fs = require("fs");
const path = require("path");

const ignoredDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".vite",
  ".next",
  "out",
  "coverage",
  "uploads",
]);

const allowlisted = new Set([
  path.normalize("server/.env.example"),
  path.normalize("app/.env.example"),
  path.normalize("scripts/scan-secrets.js"),
]);

const patterns = [
  { name: "Resend API key", regex: /re_[A-Za-z0-9_\-]{20,}/ },
  { name: "JWT-like token", regex: /eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/ },
  {
    name: "Postgres URL with password",
    regex: /postgres(?:ql)?:\/\/(?!test:test@|USER:PASSWORD@)[^\s:@]+:[^\s@]+@/i,
  },
  {
    name: "Weak placeholder JWT secret",
    regex: /JWT_SECRET\s*=\s*["']?dev_secret_change_me["']?/i,
  },
];

const textExtensions = new Set([
  ".js", ".ts", ".tsx", ".json", ".md", ".yml", ".yaml", ".env", ".example", ".local", ".txt", ".toml",
]);

function isTextCandidate(file) {
  const base = path.basename(file);
  if (base.startsWith(".env")) return true;
  return textExtensions.has(path.extname(file));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && isTextCandidate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

const root = process.cwd();
const findings = [];

for (const fullPath of walk(root)) {
  const relative = path.relative(root, fullPath);
  if (allowlisted.has(path.normalize(relative))) continue;

  let content;
  try {
    content = fs.readFileSync(fullPath, "utf8");
  } catch {
    continue;
  }

  for (const pattern of patterns) {
    if (pattern.regex.test(content)) {
      findings.push(`${relative}: ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Secret scan passed.");
