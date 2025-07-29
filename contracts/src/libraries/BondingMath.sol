// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library BondingMath {
    /**
     * @dev Calculate FVC tokens to mint based on USDC amount and discount
     * @param usdcAmount Amount of USDC being bonded
     * @param discount Current discount percentage (0-100)
     * @return fvcAmount Amount of FVC tokens to mint
     */
    function calculateFVCAmount(uint256 usdcAmount, uint256 discount) internal pure returns (uint256 fvcAmount) {
        require(discount <= 100, "Discount cannot exceed 100%");
        fvcAmount = usdcAmount * (100 - discount) / 100;
        return fvcAmount;
    }
    
    /**
     * @dev Calculate FVC tokens with premium-based pricing (targeting $1 FVC)
     * @param usdcAmount Amount of USDC being bonded
     * @param premium Current premium percentage (0-100)
     * @return fvcAmount Amount of FVC tokens to mint
     */
    function calculateFVCAmountWithPremium(uint256 usdcAmount, uint256 premium) internal pure returns (uint256 fvcAmount) {
        require(premium <= 100, "Premium cannot exceed 100%");
        // Formula: FVC = USDC / (1 + premium/100)
        // This ensures 1 USDC = 1 FVC when premium = 0
        fvcAmount = usdcAmount * 100 / (100 + premium);
        return fvcAmount;
    }
    
    /**
     * @dev Calculate current premium based on progress through epoch
     * @param totalBonded Total USDC bonded so far
     * @param epochCap Total USDC that can be bonded in this epoch
     * @param initialPremium Starting premium percentage
     * @param finalPremium Final premium percentage
     * @return currentPremium Current premium percentage
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
     * @dev Calculate current discount based on progress through epoch
     * @param totalBonded Total USDC bonded so far
     * @param epochCap Total USDC that can be bonded in this epoch
     * @param initialDiscount Starting discount percentage
     * @param finalDiscount Final discount percentage
     * @return currentDiscount Current discount percentage
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
     * @dev Calculate vesting end time
     * @param startTime Vesting start time
     * @param vestingPeriod Vesting period in seconds
     * @return endTime Vesting end time
     */
    function calculateVestingEndTime(uint256 startTime, uint256 vestingPeriod) internal pure returns (uint256 endTime) {
        return startTime + vestingPeriod;
    }
    
    /**
     * @dev Check if tokens are still locked in vesting
     * @param currentTime Current timestamp
     * @param endTime Vesting end time
     * @return isLocked True if tokens are still locked
     */
    function isVestingLocked(uint256 currentTime, uint256 endTime) internal pure returns (bool isLocked) {
        return currentTime < endTime;
    }
    
    /**
     * @dev Calculate remaining vesting time
     * @param currentTime Current timestamp
     * @param endTime Vesting end time
     * @return remainingTime Remaining vesting time in seconds
     */
    function calculateRemainingVestingTime(uint256 currentTime, uint256 endTime) internal pure returns (uint256 remainingTime) {
        if (currentTime >= endTime) {
            return 0;
        }
        return endTime - currentTime;
    }
} 