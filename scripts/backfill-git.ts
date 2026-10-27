// One-off: seed `activity` with the last N days of commits from every git repo under dan_file,
// so the feed and the first brief start with real history. Safe to rerun (upsert on sha).
// Usage: npx tsx --env-file=.env.local scripts/backfill-git.ts [days=7]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { normaliseKey, record } from "../lib/feed";
import { createAdminClient } from "../lib/supabase/admin";

const ROOT = "C:\\Users\\Dan\\dan_file";
const days = Number(process.argv[2] ?? 7);

async function main() {
  const db = createAdminClient();
  for (const dir of readdirSync(ROOT, { withFileTypes: true })) {
    if (!dir.isDirectory() || !existsSync(join(ROOT, dir.name, ".git"))) continue;
    const key = normaliseKey(dir.name);
    if (!key) continue;
    let log = "";
    try {
      log = execFileSync("git", ["-C", join(ROOT, dir.name), "log", `--since=${days}.days`, "--format=%H%x09%cI%x09%s"], { encoding: "utf8" });
    } catch {
      continue; // repo with no commits
    }
    const commits = log.split("\n").filter(Boolean);
    for (const line of commits) {
      const [sha, at, subject] = line.split("\t");
      await record(db, { source: "git", ref: sha, key, title: `commit: ${subject}`, body: subject, happened_at: at });
    }
    console.log(`${dir.name}: ${commits.length} commits`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
