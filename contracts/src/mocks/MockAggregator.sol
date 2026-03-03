// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title MockAggregator
 * @notice Chainlink AggregatorV3Interface mock for testing.
 *         Allows setting price, decimals, and updatedAt timestamp.
 */
contract MockAggregator {
    int256 private _price;
    uint8 private _decimals;
    uint256 private _updatedAt;
    uint80 private _roundId;

    constructor(int256 initialPrice, uint8 decimals_) {
        _price = initialPrice;
        _decimals = decimals_;
        _updatedAt = block.timestamp;
        _roundId = 1;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }

    // ── Test helpers ──────────────────────────────────────────────

    function setPrice(int256 newPrice) external {
        _price = newPrice;
        _updatedAt = block.timestamp;
        _roundId++;
    }

    function setUpdatedAt(uint256 timestamp) external {
        _updatedAt = timestamp;
    }

    function setStale(uint256 secondsAgo) external {
        _updatedAt = block.timestamp - secondsAgo;
    }
}
