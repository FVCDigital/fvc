import type { ChainSource, RegistryReader } from "./chain.ts";
import type { Config } from "./config.ts";
import type { Emit } from "./deliveries.ts";
import type { State } from "./state.ts";

export class HaltError extends Error {}

/**
 * Reads confirmed blocks only, from the cursor to the confirmed head, in chunks. Logs each chunk's
 * deposits and registry records before moving the cursor, so a crash at any point is safe to rerun.
 * Stops if the cursor block's hash changed (a reorg deeper than the confirmation policy).
 */
export async function ingestChain(
  state: State,
  chain: ChainSource,
  registry: RegistryReader,
  config: Config,
  emit: Emit
): Promise<{ head: number; confirmedHead: number }> {
  const head = await chain.head();
  const confirmedHead = await chain.confirmedHead(config.confirmation);

  if (state.cursor) {
    const now = await chain.blockHash(state.cursor.blockNumber);
    if (now !== state.cursor.blockHash) {
      emit({
        type: "Alert",
        kind: "DEEP_REORG",
        detail: `block ${state.cursor.blockNumber} was ${state.cursor.blockHash}, now ${now}; nothing processed, a person must check`,
      });
      throw new HaltError(`reorg below the confirmation depth at block ${state.cursor.blockNumber}`);
    }
  }

  let from = state.cursor ? state.cursor.blockNumber + 1 : config.startBlock;
  while (from <= confirmedHead) {
    const to = Math.min(confirmedHead, from + config.chunkSize - 1);
    const deposits = (await chain.transfersTo(config.safe, from, to)).sort(
      (a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex
    );
    for (const deposit of deposits) {
      if (deposit.chainId !== config.chainId) throw new HaltError(`deposit from chain ${deposit.chainId}`);
      if (!state.deposits.has(deposit.id)) emit({ type: "DepositConfirmed", deposit });
    }
    for (const record of await registry.repayments(from, to)) {
      if (!state.recorded.has(record.settlementRef)) emit({ type: "RecordedOnChain", record });
    }
    emit({ type: "CursorAdvanced", blockNumber: to, blockHash: await chain.blockHash(to) });
    from = to + 1;
  }
  return { head, confirmedHead };
}
