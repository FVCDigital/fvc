// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBonding {
    struct VestingSchedule {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
    }
    
    struct RoundConfig {
        uint256 roundId;
        uint256 initialDiscount;
        uint256 finalDiscount;
        uint256 epochCap;
        uint256 walletCap;
        uint256 vestingPeriod;
        bool isActive;
        uint256 totalBonded;
    }
    
    function bond(uint256 amount) external;
    function getCurrentDiscount() external view returns (uint256);
    function getVestingSchedule(address user) external view returns (VestingSchedule memory);
    function isLocked(address user) external view returns (bool);
    function getCurrentRound() external view returns (RoundConfig memory);
    function startNewRound(
        uint256 _initialDiscount,
        uint256 _finalDiscount,
        uint256 _epochCap,
        uint256 _walletCap,
        uint256 _vestingPeriod
    ) external;
    
    event Bonded(address indexed user, uint256 amount);
    event VestingScheduleCreated(address indexed user, uint256 amount, uint256 startTime, uint256 endTime);
    event RoundStarted(uint256 indexed roundId, uint256 initialDiscount, uint256 finalDiscount, uint256 epochCap);
    event RoundCompleted(uint256 indexed roundId, uint256 totalBonded);
} 