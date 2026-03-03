// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @dev Contract with no receive() or fallback() — rejects all ETH transfers.
///      Used to trigger Sale__EthTransferFailed in tests.
contract MockRejectETH {}
