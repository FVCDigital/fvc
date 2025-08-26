export const BONDING_ABI = [
  "constructor()",
  "error AddressEmptyCode(address target)",
  "error Bonding__AmountMustBeGreaterThanZero()",
  "error Bonding__EpochCapExceeded()",
  "error Bonding__ExceedsWalletCap()",
  "error Bonding__InvalidDiscountRange()",
  "error Bonding__InvalidVestingPeriod()",
  "error Bonding__NoMoreRounds()",
  "error Bonding__RoundAlreadyActive()",
  "error Bonding__RoundNotActive()",
  "error Bonding__TokensLockedInVesting()",
  "error ERC1967InvalidImplementation(address implementation)",
  "error ERC1967NonPayable()",
  "error FailedCall()",
  "error InvalidInitialization()",
  "error NotInitializing()",
  "error OwnableInvalidOwner(address owner)",
  "error OwnableUnauthorizedAccount(address account)",
  "error SafeERC20FailedOperation(address token)",
  "error UUPSUnauthorizedCallContext()",
  "error UUPSUnsupportedProxiableUUID(bytes32 slot)",
  "event Bonded(address indexed user, uint256 amount)",
  "event EpochCapUpdated(uint256 newCap)",
  "event Initialized(uint64 version)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event RoundCompleted(uint256 indexed roundId, uint256 totalBonded)",
  "event RoundStarted(uint256 indexed roundId, uint256 initialDiscount, uint256 finalDiscount, uint256 epochCap)",
  "event Upgraded(address indexed implementation)",
  "event VestingPeriodUpdated(uint256 newPeriod)",
  "event VestingScheduleCreated(address indexed user, uint256 amount, uint256 startTime, uint256 endTime)",
  "event WalletCapUpdated(uint256 newCap)",
  "function UPGRADE_INTERFACE_VERSION() view returns (string)",
  "function bond(uint256 amount)",
  "function completeCurrentRound()",
  "function currentRoundId() view returns (uint256)",
  "function epochCap() view returns (uint256)",
  "function finalDiscount() view returns (uint256)",
  "function fvc() view returns (address)",
  "function getCurrentDiscount() view returns (uint256)",
  "function getCurrentRound() view returns ((uint256 roundId, uint256 initialDiscount, uint256 finalDiscount, uint256 epochCap, uint256 walletCap, uint256 vestingPeriod, bool isActive, uint256 totalBonded))",
  "function getVestingSchedule(address user) view returns ((uint256 amount, uint256 startTime, uint256 endTime))",
  "function initialDiscount() view returns (uint256)",
  "function initialize(address _fvc, address _usdc, address _treasury, uint256 _initialDiscount, uint256 _finalDiscount, uint256 _epochCap, uint256 _walletCap, uint256 _vestingPeriod)",
  "function isLocked(address user) view returns (bool)",
  "function owner() view returns (address)",
  "function proxiableUUID() view returns (bytes32)",
  "function renounceOwnership()",
  "function rounds(uint256) view returns (uint256 roundId, uint256 initialDiscount, uint256 finalDiscount, uint256 epochCap, uint256 walletCap, uint256 vestingPeriod, bool isActive, uint256 totalBonded)",
  "function setEpochCap(uint256 _epochCap)",
  "function setTreasury(address _treasury)",
  "function setVestingPeriod(uint256 _vestingPeriod)",
  "function setWalletCap(uint256 _walletCap)",
  "function startNewRound(uint256 _initialDiscount, uint256 _finalDiscount, uint256 _epochCap, uint256 _walletCap, uint256 _vestingPeriod)",
  "function startNextRound()",
  "function totalBonded() view returns (uint256)",
  "function transferOwnership(address newOwner)",
  "function treasury() view returns (address)",
  "function upgradeToAndCall(address newImplementation, bytes data) payable",
  "function usdc() view returns (address)",
  "function userBonded(uint256, address) view returns (uint256)",
  "function vestingPeriod() view returns (uint256)",
  "function vestingSchedules(address) view returns (uint256 amount, uint256 startTime, uint256 endTime)",
  "function walletCap() view returns (uint256)"
];
export const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
export const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
export const USDC_ADDRESS = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";

// Single private seeding round configuration
export const PRIVATE_SEEDING_CONFIG = {
    name: "Private Seeding Round",
    fvcAllocation: "225000000",     // 225M FVC (22.5%)
    epochCap: "20000000",           // 20M USDC target
    walletCap: "2000000",           // 2M USDC per wallet
    vestingPeriod: 1080 * 24 * 60 * 60, // 36 months (12-month cliff + 24-month vesting)
    milestones: [
        { usdcSold: "0", price: 0.025, fvcSold: "16666667", name: "Early Bird" },      // 0-416,667 USDC: 16.67M FVC @ $0.025
        { usdcSold: "416667", price: 0.05, fvcSold: "16666667", name: "Early Adopters" }, // 416,667-833,333 USDC: 16.67M FVC @ $0.05
        { usdcSold: "833333", price: 0.075, fvcSold: "16666667", name: "Strategic" },     // 833,333-1,250,000 USDC: 16.67M FVC @ $0.075
        { usdcSold: "1250000", price: 0.1, fvcSold: "175000000", name: "Final Tier" },   // 1,250,000-20,000,000 USDC: 175M FVC @ $0.10
        { usdcSold: "20000000", price: 0.1, fvcSold: "0", name: "Round Complete" } // Round complete at 20M USDC
    ],
    targetPrice: "$0.025 - $0.1",
    notes: "Four gradual milestones: $0.025 → $0.05 → $0.075 → $0.10 per FVC. Heavily weighted toward $0.10 to guarantee 20M USDC from 225M FVC."
};

// Public launch configuration (after private round completes)
export const PUBLIC_LAUNCH_CONFIG = {
    name: "Public Launch",
    targetPrice: "Market Determined",
    vestingPeriod: 0, // No vesting for public launch
    notes: "Price determined by market after private round completes"
};