/**
 * Mutation testing script for Sale.sol, Vesting.sol and Staking.sol.
 *
 * Applies one mutation at a time, runs the offline test suite, and reports whether
 * the mutation was KILLED (tests caught it) or SURVIVED (tests missed it).
 *
 * A surviving mutant means a test gap: the logic change was undetected.
 * A mutant whose find string is missing is an ERROR and fails the run, so the list
 * cannot silently rot when a contract changes.
 *
 * Run: npx ts-node scripts/mutate.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface Mutation {
  id: string;
  file: string;
  description: string;
  find: string;
  replace: string;
}

const SALE = path.resolve(__dirname, "../src/sale/Sale.sol");
const VESTING = path.resolve(__dirname, "../src/vesting/Vesting.sol");
const STAKING = path.resolve(__dirname, "../src/staking/Staking.sol");

// The mainnet-fork suites (*.e2e.ts) need an archive RPC. Without one they fail on
// every run, which would make every mutant look KILLED.
const TEST_COMMAND = "npx hardhat test test/*[ct].ts";

const mutations: Mutation[] = [
  // ── Sale.sol ──────────────────────────────────────────────────────────────

  {
    id: "S01",
    file: SALE,
    description: "Cap check: > becomes >= (off-by-one allows exact cap breach)",
    find: "if (raised + normalizedAmount > cap) revert Sale__CapExceeded();",
    replace: "if (raised + normalizedAmount >= cap) revert Sale__CapExceeded();",
  },
  {
    id: "S02",
    file: SALE,
    description: "Cap check removed entirely",
    find: "if (raised + normalizedAmount > cap) revert Sale__CapExceeded();",
    replace: "// MUTANT: cap check removed",
  },
  {
    id: "S03",
    file: SALE,
    description: "Token amount: division becomes multiplication (infinite mint)",
    find: "uint256 tokenAmount = (normalizedAmount * 1e18) / effectiveRate;",
    replace: "uint256 tokenAmount = (normalizedAmount * 1e18) * effectiveRate;",
  },
  {
    id: "S04",
    file: SALE,
    description: "raised increment removed (cap tracking broken)",
    find: "        raised += normalizedAmount;",
    replace: "        // MUTANT: raised not incremented",
  },
  {
    id: "S05",
    file: SALE,
    description: "Vesting threshold: >= becomes > (threshold boundary off by 1)",
    find: "normalizedAmount >= vestingThreshold",
    replace: "normalizedAmount > vestingThreshold",
  },
  {
    id: "S06",
    file: SALE,
    description: "Vesting threshold check inverted (always vest)",
    find: "normalizedAmount >= vestingThreshold",
    replace: "normalizedAmount <= vestingThreshold",
  },
  {
    id: "S07",
    file: SALE,
    description: "Mint to msg.sender instead of vestingContract (vesting bypass)",
    find: "            saleToken.mint(address(vestingContract), tokenAmount);",
    replace: "            saleToken.mint(msg.sender, tokenAmount);",
  },
  {
    id: "S08",
    file: SALE,
    description: "ETH cap check removed",
    find: "        if (raised + usdEquivalent > cap) revert Sale__CapExceeded();",
    replace: "        // MUTANT: ETH cap check removed",
  },
  {
    id: "S09",
    file: SALE,
    description: "ETH USD conversion: division becomes multiplication",
    find: "        uint256 usdEquivalent = (msg.value * usdPerEth) / 1e18;",
    replace: "        uint256 usdEquivalent = (msg.value * usdPerEth) * 1e18;",
  },
  {
    id: "S10",
    file: SALE,
    description: "active check removed (sale always active)",
    find: "        if (!active) revert Sale__Inactive();",
    replace: "        // MUTANT: active check removed",
  },
  {
    id: "S11",
    file: SALE,
    description: "OTC cliff > duration guard removed",
    find: '        require(cliff <= duration, "Cliff > duration");',
    replace: "        // MUTANT: cliff guard removed",
  },
  {
    id: "S12",
    file: SALE,
    description: "setDefaultVesting cliff > duration guard removed",
    find: '        require(_cliff <= _duration, "Cliff > duration");',
    replace: "        // MUTANT: cliff guard removed",
  },

  // ── Vesting.sol ───────────────────────────────────────────────────────────

  {
    id: "V01",
    file: VESTING,
    description: "Cliff check: < becomes <= (tokens claimable one second early)",
    find: "        if (elapsed < s.cliff) return 0;",
    replace: "        if (elapsed <= s.cliff) return 0;",
  },
  {
    id: "V02",
    file: VESTING,
    description: "Cliff check removed (no cliff enforced)",
    find: "        if (elapsed < s.cliff) return 0;",
    replace: "        // MUTANT: cliff check removed",
  },
  {
    id: "V03",
    file: VESTING,
    description: "Full duration check: >= becomes > (100% never reached)",
    find: "        if (elapsed >= s.duration) return s.totalAmount;",
    replace: "        if (elapsed > s.duration) return s.totalAmount;",
  },
  {
    id: "V04",
    file: VESTING,
    description: "Linear vesting: elapsedAfterCliff replaced with elapsed (wrong base)",
    find: "        return (s.totalAmount * elapsedAfterCliff) / vestingWindow;",
    replace: "        return (s.totalAmount * elapsed) / vestingWindow;",
  },
  {
    id: "V05",
    file: VESTING,
    description: "Linear vesting: division becomes multiplication (overflow/wrong amount)",
    find: "        return (s.totalAmount * elapsedAfterCliff) / vestingWindow;",
    replace: "        return (s.totalAmount * elapsedAfterCliff) * vestingWindow;",
  },
  {
    id: "V06",
    file: VESTING,
    description: "totalVesting not decremented on release (accounting broken)",
    find: "        s.released += releasable;\n        totalVesting -= releasable;",
    replace: "        s.released += releasable;\n        // MUTANT: totalVesting not decremented",
  },
  {
    id: "V07",
    file: VESTING,
    description: "released not incremented (double-spend possible)",
    find: "        s.released += releasable;\n        totalVesting -= releasable;",
    replace: "        // MUTANT: released not incremented\n        totalVesting -= releasable;",
  },
  {
    id: "V08",
    file: VESTING,
    description: "Insufficient balance check removed (over-commit possible)",
    find: "        if (contractBalance < totalVesting + amount) revert Vesting__InsufficientBalance();",
    replace: "        // MUTANT: balance check removed",
  },
  {
    id: "V09",
    file: VESTING,
    description: "cliff > duration guard removed (invalid schedules accepted)",
    find: "        if (cliff > duration) revert Vesting__InvalidDuration();",
    replace: "        // MUTANT: cliff > duration guard removed",
  },
  {
    id: "V10",
    file: VESTING,
    description: "Revoke refund: totalAmount - vested becomes totalAmount + vested",
    find: "        uint256 refund = s.totalAmount - vested;",
    replace: "        uint256 refund = s.totalAmount + vested;",
  },

  // ── Staking.sol (IDs match the S01 to S14 guards in Staking.spec.test.ts) ──

  {
    id: "K01",
    file: STAKING,
    description: "Zero stake guard removed",
    find: '        require(amount > 0, "Cannot stake 0");',
    replace: "        // MUTANT: zero stake guard removed",
  },
  {
    id: "K02",
    file: STAKING,
    description: "Zero withdraw guard removed",
    find: '        require(amount > 0, "Cannot withdraw 0");',
    replace: "        // MUTANT: zero withdraw guard removed",
  },
  {
    id: "K03",
    file: STAKING,
    description: "Over-withdraw guard removed",
    find: '        require(_balances[msg.sender] >= amount, "Insufficient balance");',
    replace: "        // MUTANT: balance guard removed",
  },
  {
    id: "K04",
    file: STAKING,
    description: "stake() does not increase _totalSupply",
    find: "        _totalSupply += amount;",
    replace: "        // MUTANT: _totalSupply not increased",
  },
  {
    id: "K05",
    file: STAKING,
    description: "Fresh period rate not divided by duration",
    find: "            rewardRate = reward / rewardsDuration;",
    replace: "            rewardRate = reward;",
  },
  {
    id: "K06",
    file: STAKING,
    description: "Mid-period notify drops the leftover",
    find: "            rewardRate = (reward + leftover) / rewardsDuration;",
    replace: "            rewardRate = reward / rewardsDuration;",
  },
  {
    id: "K07",
    file: STAKING,
    description: "Reward balance guard removed",
    find: '        require(rewardRate <= balance / rewardsDuration, "Provided reward too high");',
    replace: "        // MUTANT: reward balance guard removed",
  },
  {
    id: "K08",
    file: STAKING,
    description: "setRewardsDuration allowed during an active period",
    find: "            block.timestamp > periodFinish,",
    replace: "            true,",
  },
  {
    id: "K09",
    file: STAKING,
    description: "recoverERC20 staking token guard removed",
    find: '        require(tokenAddress != address(stakingToken), "Cannot withdraw staking token");',
    replace: "        // MUTANT: staking token guard removed",
  },
  {
    id: "K10",
    file: STAKING,
    description: "recoverERC20 rewards token guard removed",
    find: '        require(tokenAddress != address(rewardsToken), "Cannot withdraw rewards token");',
    replace: "        // MUTANT: rewards token guard removed",
  },
  {
    id: "K11",
    file: STAKING,
    description: "lastTimeRewardApplicable returns max instead of min (rewards accrue past period end)",
    find: "        return block.timestamp < periodFinish ? block.timestamp : periodFinish;",
    replace: "        return block.timestamp > periodFinish ? block.timestamp : periodFinish;",
  },
  {
    id: "K12",
    file: STAKING,
    description: "getReward does not zero the stored reward (double claim)",
    find: "            rewards[msg.sender] = 0;",
    replace: "            // MUTANT: reward not zeroed",
  },
  {
    id: "K13",
    file: STAKING,
    description: "exit() balance check removed",
    find: "        uint256 balance = _balances[msg.sender];\n        if (balance > 0) {",
    replace: "        uint256 balance = _balances[msg.sender];\n        if (true) {",
  },
  {
    id: "K14",
    file: STAKING,
    description: "notifyRewardAmount skips updateReward (accrued rewards lost)",
    find: "updateReward(address(0))",
    replace: "",
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

interface Result {
  id: string;
  description: string;
  status: "KILLED" | "SURVIVED" | "ERROR";
  detail?: string;
}

function runTests(): boolean {
  try {
    execSync(TEST_COMMAND, {
      cwd: path.resolve(__dirname, ".."),
      stdio: "pipe",
      timeout: 600_000,
    });
    return true; // tests passed → mutant SURVIVED
  } catch {
    return false; // tests failed → mutant KILLED
  }
}

function writeStepSummary(results: Result[], score: number) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const rows = results.map((r) => `| ${r.id} | ${r.status} | ${r.description} |`).join("\n");
  fs.appendFileSync(
    summaryPath,
    `## Mutation testing\n\nScore: **${score}%** (threshold 80%)\n\n| ID | Result | Mutation |\n|---|---|---|\n${rows}\n`
  );
}

async function main() {
  if (!runTests()) {
    console.error("Baseline test suite fails on unmutated source. Fix that before mutation testing.");
    process.exit(1);
  }

  console.log("\n══════════════════════════════════════════════════");
  console.log("  FVC Mutation Testing");
  console.log(`  ${mutations.length} mutants across Sale.sol, Vesting.sol and Staking.sol`);
  console.log("══════════════════════════════════════════════════\n");

  const results: Result[] = [];

  let pending: { file: string; original: string } | null = null;
  const restore = () => {
    if (pending) fs.writeFileSync(pending.file, pending.original, "utf8");
    pending = null;
  };
  process.on("SIGINT", () => {
    restore();
    process.exit(130);
  });

  for (const m of mutations) {
    const original = fs.readFileSync(m.file, "utf8");

    if (!original.includes(m.find)) {
      results.push({ id: m.id, description: m.description, status: "ERROR", detail: "find string not present in source" });
      console.log(`[${m.id}] ERROR  find string not found: ${m.description}`);
      continue;
    }

    pending = { file: m.file, original };
    let survived: boolean;
    try {
      fs.writeFileSync(m.file, original.replace(m.find, m.replace), "utf8");
      survived = runTests();
    } finally {
      restore();
    }

    const status: "KILLED" | "SURVIVED" = survived ? "SURVIVED" : "KILLED";
    results.push({ id: m.id, description: m.description, status });
    const icon = status === "KILLED" ? "✓ KILLED  " : "✗ SURVIVED";
    console.log(`[${m.id}] ${icon} ${m.description}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const killed = results.filter((r) => r.status === "KILLED").length;
  const survived = results.filter((r) => r.status === "SURVIVED").length;
  const errors = results.filter((r) => r.status === "ERROR").length;
  const score = Math.round((killed / (killed + survived)) * 100);

  console.log("\n══════════════════════════════════════════════════");
  console.log("  MUTATION SCORE SUMMARY");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Total mutants : ${mutations.length}`);
  console.log(`  Killed        : ${killed}`);
  console.log(`  Survived      : ${survived}`);
  console.log(`  Errors        : ${errors}`);
  console.log(`  Mutation score: ${score}%`);
  console.log("══════════════════════════════════════════════════\n");

  if (survived > 0) {
    console.log("SURVIVING MUTANTS (test gaps):");
    results.filter((r) => r.status === "SURVIVED").forEach((r) => {
      console.log(`  [${r.id}] ${r.description}`);
    });
    console.log("");
  }

  writeStepSummary(results, score);

  if (errors > 0) {
    console.error(`${errors} mutant(s) no longer match the source. Update the mutation list.`);
    process.exit(1);
  }

  if (score < 80) {
    console.error(`Mutation score ${score}% is below 80% threshold.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
