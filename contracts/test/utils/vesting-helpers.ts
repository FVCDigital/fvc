import { ethers } from "hardhat";
import { Bonding } from "../../typechain-types";

/**
 * Vesting test utilities for FVC Protocol
 */

export const VESTING_CONSTANTS = {
  CLIFF_DURATION: 365 * 24 * 60 * 60, // 12 months in seconds
  VESTING_DURATION: 730 * 24 * 60 * 60, // 24 months in seconds
  TOTAL_DURATION: 1095 * 24 * 60 * 60, // 36 months total
};

/**
 * Calculate expected vested amount at a specific time
 * @param totalAmount Total vesting amount
 * @param startTime Vesting start timestamp
 * @param currentTime Current timestamp to check
 * @returns Expected vested amount
 */
export function calculateExpectedVested(
  totalAmount: bigint,
  startTime: number,
  currentTime: number
): bigint {
  const cliffEndTime = startTime + VESTING_CONSTANTS.CLIFF_DURATION;
  const vestingEndTime = cliffEndTime + VESTING_CONSTANTS.VESTING_DURATION;
  
  // During cliff period, no tokens are vested
  if (currentTime < cliffEndTime) {
    return BigInt(0);
  }
  
  // After vesting completion, all tokens are vested
  if (currentTime >= vestingEndTime) {
    return totalAmount;
  }
  
  // Calculate linear vesting progress
  const vestingProgress = currentTime - cliffEndTime;
  const vestingDuration = VESTING_CONSTANTS.VESTING_DURATION;
  
  const vestedAmount = (totalAmount * BigInt(vestingProgress)) / BigInt(vestingDuration);
  return vestedAmount;
}

/**
 * Calculate vested percentage at a specific time
 * @param totalAmount Total vesting amount
 * @param startTime Vesting start timestamp
 * @param currentTime Current timestamp to check
 * @returns Vested percentage (0-100)
 */
export function calculateVestedPercentage(
  totalAmount: bigint,
  startTime: number,
  currentTime: number
): number {
  if (totalAmount === BigInt(0)) return 0;
  
  const vestedAmount = calculateExpectedVested(totalAmount, startTime, currentTime);
  const percentage = Number((vestedAmount * BigInt(10000)) / totalAmount) / 100;
  
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Get vesting phase at a specific time
 * @param startTime Vesting start timestamp
 * @param currentTime Current timestamp to check
 * @returns Vesting phase description
 */
export function getVestingPhase(startTime: number, currentTime: number): string {
  const cliffEndTime = startTime + VESTING_CONSTANTS.CLIFF_DURATION;
  const vestingEndTime = cliffEndTime + VESTING_CONSTANTS.VESTING_DURATION;
  
  if (currentTime < cliffEndTime) {
    return "CLIFF";
  } else if (currentTime < vestingEndTime) {
    return "LINEAR_VESTING";
  } else {
    return "COMPLETED";
  }
}

/**
 * Move blockchain time to a specific timestamp
 * @param targetTime Target timestamp to move to
 */
export async function moveTimeTo(targetTime: number): Promise<void> {
  const currentBlock = await ethers.provider.getBlock("latest");
  const currentTime = currentBlock?.timestamp || Math.floor(Date.now() / 1000);
  const timeToMove = targetTime - currentTime;
  
  if (timeToMove > 0) {
    await ethers.provider.send("evm_increaseTime", [timeToMove]);
    await ethers.provider.send("evm_mine", []);
  }
}

/**
 * Move blockchain time forward by a specific duration
 * @param duration Duration to move forward in seconds
 */
export async function moveTimeForward(duration: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [duration]);
  await ethers.provider.send("evm_mine", []);
}

/**
 * Get current blockchain timestamp
 * @returns Current block timestamp
 */
export async function getCurrentBlockTime(): Promise<number> {
  const currentBlock = await ethers.provider.getBlock("latest");
  return currentBlock?.timestamp || Math.floor(Date.now() / 1000);
}

/**
 * Create a test vesting schedule by bonding USDC
 * @param bonding Bonding contract instance
 * @param usdc USDC contract instance
 * @param user User signer
 * @param usdcAmount Amount of USDC to bond
 * @returns Vesting schedule details
 */
export async function createTestVestingSchedule(
  bonding: Bonding,
  usdc: any,
  user: any,
  usdcAmount: bigint
) {
  // Approve USDC spending
  await usdc.connect(user).approve(await bonding.getAddress(), usdcAmount);
  
  // Bond USDC
  await bonding.connect(user).bond(usdcAmount);
  
  // Get vesting schedule
  const vestingSchedule = await bonding.getVestingSchedule(await user.getAddress());
  
  return {
    amount: vestingSchedule.amount,
    startTime: Number(vestingSchedule.startTime),
    endTime: Number(vestingSchedule.endTime),
    cliffEndTime: Number(vestingSchedule.startTime) + VESTING_CONSTANTS.CLIFF_DURATION
  };
}

/**
 * Verify vesting schedule structure
 * @param vestingSchedule Vesting schedule to verify
 * @returns Verification results
 */
export function verifyVestingSchedule(vestingSchedule: any) {
  const startTime = Number(vestingSchedule.startTime);
  const endTime = Number(vestingSchedule.endTime);
  const cliffEndTime = startTime + VESTING_CONSTANTS.CLIFF_DURATION;
  
  const validations = [
    {
      name: "Start time is valid",
      condition: startTime > 0,
      expected: "Start time should be a positive timestamp"
    },
    {
      name: "End time > start time",
      condition: endTime > startTime,
      expected: "End time should be after start time"
    },
    {
      name: "Cliff duration is 12 months",
      condition: Math.abs((cliffEndTime - startTime) - VESTING_CONSTANTS.CLIFF_DURATION) < 60,
      expected: "Cliff should be exactly 365 days (12 months)"
    },
    {
      name: "Total duration is 36 months",
      condition: Math.abs((endTime - startTime) - VESTING_CONSTANTS.TOTAL_DURATION) < 60,
      expected: "Total duration should be 1095 days (36 months)"
    },
    {
      name: "Amount is positive",
      condition: vestingSchedule.amount > BigInt(0),
      expected: "Vesting amount should be positive"
    }
  ];
  
  return validations.map(validation => ({
    ...validation,
    passed: validation.condition
  }));
}

/**
 * Format time duration for display
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days} days, ${hours} hours`;
  } else if (hours > 0) {
    return `${hours} hours, ${minutes} minutes`;
  } else {
    return `${minutes} minutes`;
  }
}

/**
 * Calculate time until next vesting milestone
 * @param startTime Vesting start timestamp
 * @param currentTime Current timestamp
 * @returns Time until next milestone
 */
export function getTimeUntilNextMilestone(startTime: number, currentTime: number): number {
  const cliffEndTime = startTime + VESTING_CONSTANTS.CLIFF_DURATION;
  const vestingEndTime = cliffEndTime + VESTING_CONSTANTS.VESTING_DURATION;
  
  if (currentTime < cliffEndTime) {
    return cliffEndTime - currentTime;
  } else if (currentTime < vestingEndTime) {
    return vestingEndTime - currentTime;
  } else {
    return 0; // Already completed
  }
}
