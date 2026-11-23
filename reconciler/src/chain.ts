import { AbiCoder, Contract, JsonRpcProvider, getAddress, id as topicId, keccak256, zeroPadValue } from "ethers";
import type { ConfirmationPolicy } from "./config.ts";
import type { Address, Deposit, LoanStatus, LoanView, RecordedRepayment, TokenView, Tranche } from "./types.ts";

/** What the reconciler reads from the chain. Everything is by block number, so tests can fake it. */
export interface ChainSource {
  chainId(): Promise<number>;
  head(): Promise<number>;
  confirmedHead(policy: ConfirmationPolicy): Promise<number>;
  blockHash(blockNumber: number): Promise<string>;
  /** Every ERC-20 Transfer (3 topics) to `to`, from any contract, in [fromBlock, toBlock]. */
  transfersTo(to: Address, fromBlock: number, toBlock: number): Promise<Deposit[]>;
  /** The Transfer logs to `to` inside one transaction (for signers verifying a batch). */
  transfersInTx(txHash: string, to: Address): Promise<{ deposits: Deposit[]; blockNumber: number } | null>;
  tokenDecimals(token: Address): Promise<number>;
}

/**
 * What the reconciler reads from the Loan Registry. `blockTag` pins a read to a block, so the
 * snapshot agrees with the events ingested up to the same confirmed block; omitted means latest.
 */
export interface RegistryReader {
  safe(): Promise<Address>;
  loan(loanId: bigint, blockTag?: number): Promise<LoanView | null>;
  refUsed(ref: string, blockTag?: number): Promise<boolean>;
  tokenConfig(token: Address, blockTag?: number): Promise<TokenView>;
  repayments(fromBlock: number, toBlock: number): Promise<RecordedRepayment[]>;
  trancheByPayoutRef(payoutRef: string, fromBlock: number, toBlock: number): Promise<Tranche | null>;
}

export const TRANSFER_TOPIC = topicId("Transfer(address,address,uint256)");
export const REPAYMENT_TOPIC = topicId("RepaymentRecorded(uint256,uint256,address,uint256,bytes32)");
export const TRANCHE_TOPIC = topicId("TrancheDisbursed(uint256,uint256,address,uint256,bytes32,address)");

const coder = AbiCoder.defaultAbiCoder();

/** `settlementRef` for a settlement, `returnRef` for a bounced payout, `payoutRef` for a tranche (partner-integration.md section 5). */
export function partnerRef(kind: "settlement" | "return" | "payout", partnerId: string): string {
  return keccak256(coder.encode(["string", "string"], [`fvc.${kind}.v1`, partnerId]));
}

export const REGISTRY_ABI = [
  "function safe() view returns (address)",
  "function loanCount() view returns (uint256)",
  "function loans(uint256) view returns (bytes32 agreementHash, bytes32 smeRef, uint256 facilityGbp, uint256 feeGbp, uint256 disbursedGbp, uint256 repaidGbp, uint64 createdAt, uint8 status, bool drawingClosed)",
  "function outstandingGbp(uint256) view returns (uint256)",
  "function refUsed(bytes32) view returns (bool)",
  "function tokenConfig(address) view returns (bool allowed, bool known, uint8 decimals, uint32 minRateBps, uint32 maxRateBps, uint256 maxPayout, uint256 dailyLimit)",
  "function recordRepayment(uint256 loanId, uint256 gbpAmount, address token, uint256 tokenAmount, bytes32 settlementRef)",
  "event RepaymentRecorded(uint256 indexed loanId, uint256 gbpAmount, address indexed token, uint256 tokenAmount, bytes32 indexed settlementRef)",
];

export const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const lower = (a: string): Address => getAddress(a).toLowerCase();
const topicToAddress = (topic: string): Address => lower("0x" + topic.slice(26));

export class EthersChain implements ChainSource, RegistryReader {
  readonly provider: JsonRpcProvider;
  private readonly registry: Contract;
  private readonly registryAddress: Address;

  constructor(rpcUrl: string, registry: Address) {
    this.provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true, batchMaxCount: 1 });
    this.registryAddress = registry;
    this.registry = new Contract(registry, REGISTRY_ABI, this.provider);
  }

  async chainId(): Promise<number> {
    return Number((await this.provider.getNetwork()).chainId);
  }

  head(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async confirmedHead(policy: ConfirmationPolicy): Promise<number> {
    if (policy.mode === "finalized") {
      const block = await this.provider.getBlock("finalized");
      if (!block) throw new Error("RPC returned no finalized block");
      return block.number;
    }
    return Math.max(-1, (await this.head()) - policy.blocks);
  }

  async blockHash(blockNumber: number): Promise<string> {
    const block = await this.provider.getBlock(blockNumber);
    if (!block || !block.hash) throw new Error(`no block ${blockNumber}`);
    return block.hash.toLowerCase();
  }

  private async depositsFromLogs(logs: readonly any[]): Promise<Deposit[]> {
    const chainId = await this.chainId();
    return logs
      .filter((l) => l.topics.length === 3 && l.topics[0] === TRANSFER_TOPIC && l.data.length === 66)
      .map((l) => ({
        id: `${chainId}:${l.transactionHash.toLowerCase()}:${l.index}`,
        chainId,
        txHash: l.transactionHash.toLowerCase(),
        logIndex: l.index,
        blockNumber: l.blockNumber,
        blockHash: l.blockHash.toLowerCase(),
        token: lower(l.address),
        from: topicToAddress(l.topics[1]),
        amount: BigInt(l.data),
      }));
  }

  async transfersTo(to: Address, fromBlock: number, toBlock: number): Promise<Deposit[]> {
    const logs = await this.provider.getLogs({ fromBlock, toBlock, topics: [TRANSFER_TOPIC, null, zeroPadValue(to, 32)] });
    return this.depositsFromLogs(logs);
  }

  async transfersInTx(txHash: string, to: Address): Promise<{ deposits: Deposit[]; blockNumber: number } | null> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return null;
    const toTopic = zeroPadValue(to, 32).toLowerCase();
    const logs = receipt.logs.filter((l) => l.topics.length === 3 && l.topics[2].toLowerCase() === toTopic);
    return { deposits: await this.depositsFromLogs(logs), blockNumber: receipt.blockNumber };
  }

  async tokenDecimals(token: Address): Promise<number> {
    return Number(await new Contract(token, ERC20_ABI, this.provider).decimals());
  }

  async safe(): Promise<Address> {
    return lower(await this.registry.safe());
  }

  async loan(loanId: bigint, blockTag?: number): Promise<LoanView | null> {
    const o = { blockTag };
    if (loanId === 0n || loanId > (await this.registry.loanCount(o))) return null;
    const l = await this.registry.loans(loanId, o);
    return {
      loanId,
      status: Number(l.status) as LoanStatus,
      disbursedGbp: l.disbursedGbp,
      feeGbp: l.feeGbp,
      repaidGbp: l.repaidGbp,
      outstandingGbp: await this.registry.outstandingGbp(loanId, o),
    };
  }

  refUsed(ref: string, blockTag?: number): Promise<boolean> {
    return this.registry.refUsed(ref, { blockTag });
  }

  async tokenConfig(token: Address, blockTag?: number): Promise<TokenView> {
    const c = await this.registry.tokenConfig(token, { blockTag });
    return {
      allowed: c.allowed,
      known: c.known,
      decimals: Number(c.decimals),
      minRateBps: BigInt(c.minRateBps),
      maxRateBps: BigInt(c.maxRateBps),
    };
  }

  async repayments(fromBlock: number, toBlock: number): Promise<RecordedRepayment[]> {
    const logs = await this.provider.getLogs({ address: this.registryAddress, fromBlock, toBlock, topics: [REPAYMENT_TOPIC] });
    return logs.map((l) => {
      const [gbpAmount, tokenAmount] = coder.decode(["uint256", "uint256"], l.data);
      return {
        loanId: BigInt(l.topics[1]),
        gbpAmount,
        token: topicToAddress(l.topics[2]),
        tokenAmount,
        settlementRef: l.topics[3].toLowerCase(),
        txHash: l.transactionHash.toLowerCase(),
        blockNumber: l.blockNumber,
        logIndex: l.index,
      };
    });
  }

  async trancheByPayoutRef(payoutRef: string, fromBlock: number, toBlock: number): Promise<Tranche | null> {
    const logs = await this.provider.getLogs({
      address: this.registryAddress,
      fromBlock,
      toBlock,
      topics: [TRANCHE_TOPIC, null, null, payoutRef],
    });
    if (logs.length !== 1) return null;
    const [gbpAmount, tokenAmount] = coder.decode(["uint256", "uint256", "address"], logs[0].data);
    return {
      loanId: BigInt(logs[0].topics[1]),
      gbpAmount,
      token: topicToAddress(logs[0].topics[2]),
      tokenAmount,
      payoutRef: payoutRef.toLowerCase(),
    };
  }
}
