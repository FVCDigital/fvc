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

// Round configurations for private rounds targeting $0.025-$0.1 FVC valuation
export const ROUND_CONFIGS = [
    {
        name: "Round 0 - Private Alpha",
        initialDiscount: 25,
        finalDiscount: 15,
        epochCap: "5000000",
        walletCap: "500000",
        vestingPeriod: 180 * 24 * 60 * 60, // 6 months
        targetPrice: "$0.025 - $0.035"
    },
    {
        name: "Round 1 - Private Beta",
        initialDiscount: 20,
        finalDiscount: 10,
        epochCap: "10000000",
        walletCap: "1000000",
        vestingPeriod: 180 * 24 * 60 * 60, // 6 months
        targetPrice: "$0.035 - $0.050"
    },
    {
        name: "Round 2 - Strategic Partners",
        initialDiscount: 15,
        finalDiscount: 5,
        epochCap: "15000000",
        walletCap: "2000000",
        vestingPeriod: 180 * 24 * 60 * 60, // 6 months
        targetPrice: "$0.050 - $0.075"
    },
    {
        name: "Round 3 - Pre-Public",
        initialDiscount: 10,
        finalDiscount: 2,
        epochCap: "20000000",
        walletCap: "3000000",
        vestingPeriod: 180 * 24 * 60 * 60, // 6 months
        targetPrice: "$0.075 - $0.100"
    }
];

// Public launch configuration (after private rounds complete)
export const PUBLIC_LAUNCH_CONFIG = {
    name: "Public Launch",
    targetPrice: "Market Determined",
    vestingPeriod: 0, // No vesting for public launch
    notes: "Price determined by market after private rounds complete"
};