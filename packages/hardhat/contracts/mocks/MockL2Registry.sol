// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Minimal mock of the Durin L2Registry for unit tests.
///      Only implements the methods that L2Registrar actually calls.
///      NOT a real ERC-721 — do not use outside of tests.
contract MockL2Registry {
    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    bytes32 private constant BASE_NODE = bytes32(uint256(0xba5e000000000000000000000000000000000000000000000000000000000000));

    /// node → owner address (set on createSubnode)
    mapping(bytes32 => address) public nodeOwners;

    /// node → key → value (set via setText)
    mapping(bytes32 => mapping(string => string)) public textRecords;

    /// label → node (for test assertions)
    mapping(string => bytes32) public labelToNode;

    // -------------------------------------------------------------------------
    // Events (mirror real registry for test tracing)
    // -------------------------------------------------------------------------

    event SubnodeCreated(bytes32 indexed parentNode, string label, address owner, bytes32 node);
    event TextSet(bytes32 indexed node, string key, string value);

    // -------------------------------------------------------------------------
    // IL2Registry subset
    // -------------------------------------------------------------------------

    function baseNode() external pure returns (bytes32) {
        return BASE_NODE;
    }

    function makeNode(bytes32 parentNode, string calldata label) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
    }

    function createSubnode(
        bytes32 parentNode,
        string calldata label,
        address owner,
        bytes[] calldata /* data */
    ) external returns (bytes32) {
        bytes32 node = keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
        nodeOwners[node] = owner;
        labelToNode[label] = node;
        emit SubnodeCreated(parentNode, label, owner, node);
        return node;
    }

    function setText(bytes32 node, string calldata key, string calldata value) external {
        textRecords[node][key] = value;
        emit TextSet(node, key, value);
    }

    // -------------------------------------------------------------------------
    // Helpers for test assertions
    // -------------------------------------------------------------------------

    function getTextRecord(bytes32 node, string calldata key) external view returns (string memory) {
        return textRecords[node][key];
    }

    function getTextRecordByLabel(
        string calldata label,
        string calldata key
    ) external view returns (string memory) {
        bytes32 node = labelToNode[label];
        return textRecords[node][key];
    }
}
