// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface for the Durin L2Registry — only the methods L2Registrar calls.
/// @dev The actual deployed L2Registry on Base Sepolia implements far more (ERC-721, resolver
///      profiles, etc.). This subset is sufficient for the Tollgate Registrar to interact with it.
interface IL2Registry {
    /// @notice Returns the base ENS node this registry manages (e.g. namehash of "tollgate.eth")
    function baseNode() external view returns (bytes32);

    /// @notice Deterministically computes the node for a child label under a parent node
    function makeNode(bytes32 parentNode, string calldata label) external pure returns (bytes32);

    /// @notice Mints a new subname NFT and returns its node
    /// @param parentNode The parent node (use baseNode() for direct children)
    /// @param label      The DNS label to register (e.g. "crypto" for "crypto.tollgate.eth")
    /// @param owner      The address that will own the subname
    /// @param data       Extra resolver multicall data; pass new bytes[](0) for none
    function createSubnode(
        bytes32 parentNode,
        string calldata label,
        address owner,
        bytes[] calldata data
    ) external returns (bytes32);

    /// @notice Writes an ENS text record for a node — used for all tollgate: prefixed records
    function setText(bytes32 node, string calldata key, string calldata value) external;
}
