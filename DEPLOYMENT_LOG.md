# FVC Protocol Deployment Log

## Network: Base Sepolia (Chain ID: 84532)

### Core Contracts

| Contract | Address | Deployed | Owner/Admin | Notes |
|----------|---------|----------|-------------|-------|
| **FVC (ERC20)** | `0xAA8C1C430634D16b37f8132c88607EfA1924c064` | ✅ | Safe | 1B supply cap, role-gated mint/burn |
| **Staking** | `0x703b8442A8993F4388b7F2a57485432882140f53` | ✅ | Safe | Synthetix-style rewards, FVC→USDC |
| **FVCFaucet** | TBD | ⏳ | - | Testnet-only, 10 FVC per claim |

### Treasury & Yield

| Contract | Address | Status | Notes |
|----------|---------|--------|-------|
| **Treasury.sol** | - | ❌ Removed | Replaced by Safe-only custody |
| **AaveYieldAdapter** | TBD | ⏳ | Optional: principal tracking for Aave |

### Governance & Custody

| Entity | Address | Role |
|--------|---------|------|
| **Gnosis Safe (Multisig)** | `0x468D5B7fb6201f7cFbbA9A08B3bF49474145F61f` | Owner of FVC, Staking; custody & execution |

### External Dependencies (Base Sepolia)

| Token/Protocol | Address | Purpose |
|----------------|---------|---------|
| **USDC** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Staking rewards token |
| **Aave v3 Pool** | `0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b` | Optional yield source |

---

## Current State (2025-01-15)

### Staking Rewards Active ✅
- **First epoch funded:** 5 USDC (5,000,000 base units)
- **Reward rate:** 8 USDC/second
- **Period finish:** 1763327812 (Unix timestamp ≈ 2025-01-22)
- **Duration:** 7 days (604800 seconds)

### Funding Flow
1. Safe holds USDC
2. Safe Transaction Builder multisend:
   - Tx1: ERC20 `transfer(Staking, amount)`
   - Tx2: Staking `notifyRewardAmount(amount)`
3. Rewards accrue proportionally to stakers
4. Users claim via `getReward()`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Gnosis Safe (Multisig)                  │
│                 0x468D5B...145F61f                           │
│  • Custody: USDC, FVC admin                                 │
│  • Owner: FVC, Staking                                      │
│  • Executes: reward top-ups via Transaction Builder         │
└────────────┬────────────────────────────────────────────────┘
             │
             │ owns & funds
             │
    ┌────────▼────────┐              ┌──────────────────┐
    │   FVC (ERC20)   │              │   Staking        │
    │   0xAA8C...c064 │              │   0x703b...0f53  │
    │                 │              │                  │
    │ • 1B cap        │◄─────stake───│ • Stake: FVC     │
    │ • Roles: mint/  │              │ • Earn: USDC     │
    │   burn          │              │ • Synthetix      │
    └─────────────────┘              │   pattern        │
                                     └────────┬─────────┘
                                              │
                                              │ rewards (USDC)
                                              │
                                     ┌────────▼─────────┐
                                     │   USDC (Base)    │
                                     │   0x036C...cf7e  │
                                     └──────────────────┘

Optional (not deployed):
┌──────────────────┐         ┌──────────────────┐
│  AaveYieldAdapter│◄────────│  Aave v3 Pool    │
│  (principal      │  supply │  0x07eA...814b   │
│   tracking)      │  USDC   │                  │
└──────────────────┘         └──────────────────┘
```

---

## Deployment History

### 2025-01-15
- ✅ Deployed new Staking with correct USDC (`0x036C...cf7e`)
- ✅ Transferred ownership to Safe
- ✅ Funded first epoch: 5 USDC
- ✅ Verified: `rewardRate=8`, `periodFinish=1763327812`
- ❌ Removed Treasury.sol (Safe-only custody)

### Previous
- ✅ Deployed FVC (`0xAA8C...c064`)
- ✅ Deployed old Staking (wrong USDC, deprecated)
- ✅ Created Gnosis Safe (`0x468D...F61f`)

---

## Next Deployments

1. **FVCFaucet** (testnet only)
   - Deploy with FVC address
   - Grant `MINTER_ROLE` to faucet
   - Set `NEXT_PUBLIC_FAUCET_ADDRESS` in dapp

2. **AaveYieldAdapter** (optional)
   - Deploy with USDC, Aave Pool, aUSDC, Safe as treasury
   - Safe calls `depositAll()` and `harvest()` manually

---

## Contract Addresses Reference

Copy-paste for dapp `.env.local`:
```
NEXT_PUBLIC_NETWORK=base-sepolia
NEXT_PUBLIC_FVC_ADDRESS=0xAA8C1C430634D16b37f8132c88607EfA1924c064
NEXT_PUBLIC_STAKING_ADDRESS=0x703b8442A8993F4388b7F2a57485432882140f53
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NEXT_PUBLIC_FAUCET_ADDRESS=<TBD>
```

Safe address: `0x468D5B7fb6201f7cFbbA9A08B3bF49474145F61f`

---

## Verification Commands

```bash
# Staking owner
cast call 0x703b8442A8993F4388b7F2a57485432882140f53 "owner()(address)" --rpc-url https://sepolia.base.org

# Staking rewards token
cast call 0x703b8442A8993F4388b7F2a57485432882140f53 "rewardsToken()(address)" --rpc-url https://sepolia.base.org

# Current reward rate
cast call 0x703b8442A8993F4388b7F2a57485432882140f53 "rewardRate()(uint256)" --rpc-url https://sepolia.base.org

# Epoch end timestamp
cast call 0x703b8442A8993F4388b7F2a57485432882140f53 "periodFinish()(uint256)" --rpc-url https://sepolia.base.org

# Safe USDC balance
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e "balanceOf(address)(uint256)" 0x468D5B7fb6201f7cFbbA9A08B3bF49474145F61f --rpc-url https://sepolia.base.org
```
