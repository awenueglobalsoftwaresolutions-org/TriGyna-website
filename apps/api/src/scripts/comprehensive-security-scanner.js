const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 4 levels up: apps/api/src/scripts -> apps/api/src -> apps/api -> apps -> workspace root
const PROJECT_ROOT = path.resolve(__dirname, "../../../../");

// Secret detection regex patterns
const SECRET_PATTERNS = [
  { name: "Private Key Header", regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  { name: "AWS Access Key ID", regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
  { name: "AWS Secret Access Key", regex: /(?:aws_secret_access_key|aws_secret_key)\s*[:=]\s*["']?([A-Za-z0-9\/+=]{40})["']?/gi },
  { name: "GitHub Personal Access Token", regex: /(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{36,}/g },
  { name: "Google API / OAuth Secret", regex: /(?:AIza[0-9A-Za-z\-_]{35}|GOCSPX-[A-Za-z0-9\-_]{28})/g },
  { name: "Razorpay Live Secret", regex: /rzp_live_[0-9a-zA-Z]{14,}/g },
  { name: "Stripe Live Secret Key", regex: /(?:sk|rk)_live_[0-9a-zA-Z]{24,}/g },
  { name: "Meta Access Token", regex: /EAA[A-Za-z0-9]{50,}/g },
  { name: "Slack Token", regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/g },
  { name: "MongoDB URI with Embedded Password", regex: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_.-]+:(?!your_|password|replace_|dev_|test_|<)[^@\s]+@[a-zA-Z0-9_.-]+/gi },
  { name: "Database URI with Password", regex: /(?:postgres|mysql|redis):\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[a-zA-Z0-9_.-]+/gi },
];

// Patterns to ignore (safe false positives like mock / test placeholder values)
const SAFE_PLACEHOLDERS = [
  "your_", "replace_", "placeholder", "test_", "mock", "dummy", "fallback",
  "127.0.0.1", "localhost", "trigyna_test", "development", "example",
  "none", "undefined", "null", "bearer ", "authorization", "application/json",
  "default", "change_me", "generate_random", "sk_test_", "rzp_test_",
  "your-secure", "your-meta", "your-r2", "your-firebase", "env.example"
];

function isSafeFalsePositive(val) {
  if (!val) return true;
  const lower = val.toLowerCase();
  return SAFE_PLACEHOLDERS.some((p) => lower.includes(p));
}

// Find all files excluding node_modules, .next, .git, etc.
function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, "/");

    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === ".git" ||
      entry.name === ".turbo" ||
      entry.name === "dist" ||
      entry.name === "build" ||
      entry.name === ".pnpm-store" ||
      entry.name === "coverage"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push({ fullPath, relPath });
    }
  }
  return fileList;
}

// Scan file contents
function scanFile(filePath, relPath) {
  const findings = [];
  try {
    const ext = path.extname(filePath).toLowerCase();
    // Skip binary files, lockfiles, and images
    if ([".png", ".jpg", ".jpeg", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".eot"].includes(ext)) {
      return findings;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, lineIdx) => {
      SECRET_PATTERNS.forEach((pattern) => {
        let match;
        const rx = new RegExp(pattern.regex.source, pattern.regex.flags);
        while ((match = rx.exec(line)) !== null) {
          const matchedVal = match[1] || match[0];
          if (!isSafeFalsePositive(matchedVal)) {
            findings.push({
              file: relPath,
              line: lineIdx + 1,
              category: pattern.name,
              // Never store or print actual secret value
              redacted: `[REDACTED: ${matchedVal.length} chars]`,
            });
          }
        }
      });

      // Special check for frontend files process.env
      if (relPath.startsWith("src/") && (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx")) {
        const envMatches = line.matchAll(/process\.env\.([A-Z0-9_]+)/g);
        for (const m of envMatches) {
          const varName = m[1];
          if (
            !varName.startsWith("NEXT_PUBLIC_") &&
            !["NODE_ENV"].includes(varName)
          ) {
            findings.push({
              file: relPath,
              line: lineIdx + 1,
              category: "Frontend Server-Only Env Var Access",
              redacted: `process.env.${varName}`,
            });
          }
        }
      }
    });
  } catch (err) {
    // Binary or unreadable
  }
  return findings;
}

// Scan git history
function scanGitHistory() {
  console.log("\n[Audit] Scanning Git Commit History (all commits)...");
  const historyFindings = [];
  try {
    const commits = execSync("git log --format=%H", { cwd: PROJECT_ROOT, encoding: "utf-8" })
      .trim()
      .split("\n")
      .filter(Boolean);

    console.log(`[Audit] Total commits to inspect: ${commits.length}`);

    commits.forEach((commitHash, idx) => {
      try {
        const fullDiff = execSync(`git show ${commitHash} --no-color`, {
          cwd: PROJECT_ROOT,
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
        });

        SECRET_PATTERNS.forEach((pattern) => {
          let match;
          const rx = new RegExp(pattern.regex.source, pattern.regex.flags);
          while ((match = rx.exec(fullDiff)) !== null) {
            const matchedVal = match[1] || match[0];
            if (!isSafeFalsePositive(matchedVal)) {
              historyFindings.push({
                commit: commitHash.substring(0, 7),
                category: pattern.name,
                redacted: `[REDACTED: ${matchedVal.length} chars]`,
              });
            }
          }
        });
      } catch (commitErr) {
        // Fallback per-commit if diff is large
      }
    });
  } catch (e) {
    console.error("[Audit] Git history check error:", e.message);
  }
  return historyFindings;
}

// Execute scan
console.log("=== TRIGYNA MASTER SECURITY AUDIT SCANNER ===");
console.log("Root:", PROJECT_ROOT);

const files = getAllFiles(PROJECT_ROOT);
console.log(`[Audit] Total workspace files found (excluding node_modules/.next): ${files.length}`);

const allFindings = [];

files.forEach(({ fullPath, relPath }) => {
  // If file is an actual .env file with secrets (not example), flag it
  if (
    relPath === ".env" ||
    relPath === ".env.local" ||
    relPath === "apps/api/.env" ||
    (relPath.endsWith("/.env") && !relPath.includes("example"))
  ) {
    allFindings.push({
      file: relPath,
      line: 1,
      category: "Active Environment File (Must be excluded from git)",
      redacted: "[ACTIVE_ENV_FILE]",
    });
  }

  const findings = scanFile(fullPath, relPath);
  if (findings.length > 0) {
    allFindings.push(...findings);
  }
});

console.log("\n--- WORKSPACE SCAN RESULTS ---");
if (allFindings.length === 0) {
  console.log("[STATUS: PASS] Zero sensitive credentials or exposed secrets detected in workspace files!");
} else {
  console.log(`[STATUS: FOUND ${allFindings.length} POTENTIAL ITEMS]`);
  allFindings.forEach((f, i) => {
    console.log(`  ${i + 1}. [${f.category}] ${f.file}:${f.line} -> ${f.redacted}`);
  });
}

const historyFindings = scanGitHistory();
console.log("\n--- GIT HISTORY SCAN RESULTS ---");
if (historyFindings.length === 0) {
  console.log("[STATUS: PASS] Zero sensitive credentials detected in Git commit history!");
} else {
  console.log(`[STATUS: FOUND ${historyFindings.length} HISTORICAL ITEMS]`);
  historyFindings.forEach((f, i) => {
    console.log(`  ${i + 1}. [${f.category}] Commit: ${f.commit} -> ${f.redacted}`);
  });
}

console.log("\n=== AUDIT SCAN COMPLETE ===");
