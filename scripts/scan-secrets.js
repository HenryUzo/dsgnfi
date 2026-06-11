const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

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

function gitTrackedFiles(cwd) {
  try {
    return execFileSync("git", ["ls-files"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => path.join(cwd, entry))
      .filter((entry) => {
        try {
          return fs.statSync(entry).isFile();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

function nestedGitDirs(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== ".git" && entry.name !== "node_modules")
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, ".git")));
}

const root = process.cwd();
const findings = [];
const files = Array.from(
  new Set([
    ...gitTrackedFiles(root),
    ...nestedGitDirs(root).flatMap((dir) => gitTrackedFiles(dir)),
  ])
);

for (const fullPath of files) {
  if (!isTextCandidate(fullPath)) continue;
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
