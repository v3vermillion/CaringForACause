// Turns Playwright's JSON report into a short Markdown summary of failures.
// Usage: node scripts/summarize-test-failures.mjs playwright-report/results.json
import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "playwright-report/results.json";
const report = JSON.parse(readFileSync(file, "utf8"));
const stripAnsi = (s = "") => s.replace(/\u001b\[[0-9;]*m/g, "");

const failures = [];
const walk = (suite, titles = []) => {
  const path = suite.title ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const final = t.results?.at(-1);
      if (t.status === "unexpected" || t.status === "flaky") {
        failures.push({
          status: t.status,
          project: t.projectName,
          title: [...path.slice(1), spec.title].join(" › "),
          line: `${spec.file}:${spec.line}`,
          error: stripAnsi(final?.error?.message ?? final?.errors?.[0]?.message ?? "")
            .split("\n")
            .slice(0, 12)
            .join("\n"),
        });
      }
    }
  }
  for (const child of suite.suites ?? []) walk(child, path);
};
for (const suite of report.suites ?? []) walk(suite);

const { expected = 0, unexpected = 0, flaky = 0, skipped = 0 } = report.stats ?? {};
const lines = [
  `**Passed:** ${expected} · **Failed:** ${unexpected} · **Flaky:** ${flaky} · **Skipped:** ${skipped}`,
  "",
];
for (const f of failures) {
  lines.push(`### ${f.status === "flaky" ? "Flaky" : "Failed"}: [${f.project}] ${f.title}`);
  lines.push(`\`${f.line}\``, "", "```", f.error || "(no message)", "```", "");
}
console.log(lines.join("\n"));
