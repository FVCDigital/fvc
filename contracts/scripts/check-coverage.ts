/**
 * Fails CI when coverage of any production contract drops below its floor.
 *
 * Floors sit just under the measured numbers, so they block regressions without
 * blocking work. Raise a floor whenever coverage improves; never lower one to make
 * a pull request pass.
 *
 * Run after: COVERAGE=true npx hardhat coverage --testfiles "test/*[ct].ts"
 * Run: npx ts-node scripts/check-coverage.ts
 */

import * as fs from "fs";
import * as path from "path";

type Metric = "lines" | "statements" | "functions" | "branches";
type Floors = Record<Metric, number>;

const FLOORS: Record<string, Floors> = {
  "core/FVC.sol": { lines: 100, statements: 100, functions: 100, branches: 100 },
  "sale/Sale.sol": { lines: 85, statements: 85, functions: 80, branches: 70 },
  "staking/Staking.sol": { lines: 100, statements: 100, functions: 100, branches: 83 },
  "vesting/Vesting.sol": { lines: 100, statements: 95, functions: 100, branches: 90 },
};

const summaryPath = path.resolve(__dirname, "../coverage/coverage-summary.json");
if (!fs.existsSync(summaryPath)) {
  console.error(`No coverage summary at ${summaryPath}. Run hardhat coverage first.`);
  process.exit(1);
}

const summary: Record<string, Record<Metric, { pct: number }>> = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const failures: string[] = [];
const rows: string[] = [];

for (const [file, floors] of Object.entries(FLOORS)) {
  const key = Object.keys(summary).find((k) => k.replace(/\\/g, "/").endsWith(`src/${file}`));
  if (!key) {
    failures.push(`${file}: missing from coverage report`);
    continue;
  }
  const cells = (Object.keys(floors) as Metric[]).map((m) => {
    const pct = summary[key][m].pct;
    if (pct < floors[m]) failures.push(`${file}: ${m} ${pct}% is below the ${floors[m]}% floor`);
    return `${pct}%`;
  });
  rows.push(`| ${file} | ${cells.join(" | ")} |`);
}

const table = `| Contract | Lines | Statements | Functions | Branches |\n|---|---|---|---|---|\n${rows.join("\n")}\n`;
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Coverage\n\n${table}\n`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
