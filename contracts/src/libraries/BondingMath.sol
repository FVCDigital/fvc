// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BondingMath
 * @notice Mathematical utilities for FVC Protocol bonding calculations
 * @dev Provides pure functions for discount, premium, and vesting calculations
 * @custom:security All functions are pure and stateless
 */
library BondingMath {
    /**
     * @notice Calculate FVC tokens to mint based on USDC amount and discount
     * @dev Uses discount-based pricing: FVC = USDC * (1 + discount/100)
     * @param usdcAmount Amount of USDC being bonded (in 6 decimals)
     * @param discount Current discount percentage (0-100)
     * @return fvcAmount Amount of FVC tokens to mint (in 18 decimals)
     * @custom:security Validates discount is <= 100%
     */
    function calculateFVCAmount(uint256 usdcAmount, uint256 discount) internal pure returns (uint256 fvcAmount) {
        require(discount <= 100, "Discount cannot exceed 100%");
        // Use discount-based pricing: FVC = USDC * (1 + discount/100)
        // Convert from USDC (6 decimals) to FVC (18 decimals) by multiplying by 10^12
        fvcAmount = usdcAmount * (100 + discount) / 100 * 1e12;
        return fvcAmount;
    }
    
    /**
     * @notice Calculate FVC tokens with premium-based pricing (targeting $1 FVC)
     * @dev Uses premium-based pricing: FVC = USDC / (1 + premium/100)
     * @param usdcAmount Amount of USDC being bonded (in 6 decimals)
     * @param premium Current premium percentage (0-100)
     * @return fvcAmount Amount of FVC tokens to mint (in 18 decimals)
     * @custom:security Validates premium is <= 100%
     */
    function calculateFVCAmountWithPremium(uint256 usdcAmount, uint256 premium) internal pure returns (uint256 fvcAmount) {
        require(premium <= 100, "Premium cannot exceed 100%");
        // Formula: FVC = USDC / (1 + premium/100)
        // This ensures 1 USDC = 1 FVC when premium = 0
        fvcAmount = usdcAmount * 100 / (100 + premium);
        return fvcAmount;
    }
    
    /**
     * @notice Calculate current premium based on progress through epoch
     * @dev Linear interpolation between initial and final premium
     * @param totalBonded Total USDC bonded so far (in 6 decimals)
     * @param epochCap Total USDC that can be bonded in this epoch (in 6 decimals)
     * @param initialPremium Starting premium percentage (0-100)
     * @param finalPremium Final premium percentage (0-100)
     * @return currentPremium Current premium percentage (0-100)
     * @custom:security Uses 10000 precision to avoid integer division loss
     */
    function calculateCurrentPremium(
        uint256 totalBonded,
        uint256 epochCap,
        uint256 initialPremium,
        uint256 finalPremium
    ) internal pure returns (uint256 currentPremium) {
        if (totalBonded == 0) {
            return initialPremium;
        }
        
        if (totalBonded >= epochCap) {
            return finalPremium;
        }
        
        // Use higher precision to avoid integer division loss
        uint256 progress = (totalBonded * 10000) / epochCap; // 10000 = 100%
        uint256 premiumRange = finalPremium - initialPremium;
        currentPremium = initialPremium + (progress * premiumRange / 10000);
        
        return currentPremium < finalPremium ? currentPremium : finalPremium;
    }
    
    /**
     * @notice Calculate current discount based on progress through epoch
     * @dev Linear interpolation between initial and final discount
     * @param totalBonded Total USDC bonded so far (in 6 decimals)
     * @param epochCap Total USDC that can be bonded in this epoch (in 6 decimals)
     * @param initialDiscount Starting discount percentage (0-100)
     * @param finalDiscount Final discount percentage (0-100)
     * @return currentDiscount Current discount percentage (0-100)
     * @custom:security Uses 10000 precision to avoid integer division loss
     */
    function calculateCurrentDiscount(
        uint256 totalBonded,
        uint256 epochCap,
        uint256 initialDiscount,
        uint256 finalDiscount
    ) internal pure returns (uint256 currentDiscount) {
        if (totalBonded == 0) {
            return initialDiscount;
        }
        
        if (totalBonded >= epochCap) {
            return finalDiscount;
        }
        
        // Use higher precision to avoid integer division loss
        uint256 progress = (totalBonded * 10000) / epochCap; // 10000 = 100%
        uint256 discountRange = initialDiscount - finalDiscount;
        currentDiscount = initialDiscount - (progress * discountRange / 10000);
        
        return currentDiscount > finalDiscount ? currentDiscount : finalDiscount;
    }
    
    /**
     * @notice Calculate vesting end time
     * @dev Simple addition of vesting period to start time
     * @param startTime Vesting start timestamp
     * @param vestingPeriod Vesting period in seconds
     * @return endTime Vesting end timestamp
     */
    function calculateVestingEndTime(uint256 startTime, uint256 vestingPeriod) internal pure returns (uint256 endTime) {
        return startTime + vestingPeriod;
    }
    
    /**
     * @notice Check if tokens are still locked in vesting
     * @dev Compares current time with vesting end time
     * @param currentTime Current timestamp
     * @param endTime Vesting end timestamp
     * @return isLocked True if tokens are still locked, false if unlocked
     */
    function isVestingLocked(uint256 currentTime, uint256 endTime) internal pure returns (bool isLocked) {
        return currentTime < endTime;
    }
    
    /**
     * @notice Calculate remaining vesting time
     * @dev Returns 0 if vesting period has ended
     * @param currentTime Current timestamp
     * @param endTime Vesting end timestamp
     * @return remainingTime Remaining vesting time in seconds (0 if ended)
     */
    function calculateRemainingVestingTime(uint256 currentTime, uint256 endTime) internal pure returns (uint256 remainingTime) {
        if (currentTime >= endTime) {
            return 0;
        }
        return endTime - currentTime;
    }

    /**
     * @notice Calculate USDC amount needed for a given FVC amount and discount
     * @dev Reverse calculation: USDC = FVC / (1 + discount/100)
     * @param fvcAmount Amount of FVC tokens desired (in 18 decimals)
     * @param discount Current discount percentage (0-100)
     * @return usdcAmount Amount of USDC needed (in 6 decimals)
     * @custom:security Validates discount is <= 100%
     */
    function calculateUSDCAmount(uint256 fvcAmount, uint256 discount) internal pure returns (uint256 usdcAmount) {
        require(discount <= 100, "Discount cannot exceed 100%");
        // Reverse calculation: USDC = FVC / (1 + discount/100)
        // Convert from FVC (18 decimals) to USDC (6 decimals) by dividing by 10^12
        usdcAmount = fvcAmount / (100 + discount) * 100 / 1e12;
        return usdcAmount;
    }
} 