// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IL2Registry.sol";

/// @title  TollgateL2Registrar
/// @notice Mints *.tollgate.eth subnames on Base Sepolia via the Durin L2Registry.
///         Called by the Tollgate Next.js API when a developer registers a new MCP server.
///
///         Flow:
///           1. register(label, subnameOwner, keys, values) called by the frontend API
///           2. Calls registry.createSubnode() to mint the ERC-721 subname NFT
///           3. Calls registry.setText() for each tollgate: prefixed record
///           4. Emits SubnameRegistered for off-chain indexing
///
///         After deployment, the owner of the L2Registry must call registry.addRegistrar(address)
///         to grant this contract permission to mint subnames.
contract L2Registrar is Ownable, Pausable {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    IL2Registry public registry;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event SubnameRegistered(string label, address indexed subnameOwner, bytes32 indexed node);
    event RegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _registry) Ownable(msg.sender) {
        require(_registry != address(0), "L2Registrar: zero registry address");
        registry = IL2Registry(_registry);
    }

    // -------------------------------------------------------------------------
    // Core
    // -------------------------------------------------------------------------

    /// @notice Registers a new subname and writes its text records atomically.
    /// @param label        DNS label to register (e.g. "crypto" → "crypto.tollgate.eth")
    /// @param subnameOwner Address that will own the newly minted subname NFT
    /// @param keys         ENS text record keys (use "tollgate:" prefix per spec)
    /// @param values       Text record values, parallel to keys[]
    function register(
        string calldata label,
        address subnameOwner,
        string[] calldata keys,
        string[] calldata values
    ) external whenNotPaused {
        require(bytes(label).length > 0, "L2Registrar: empty label");
        require(subnameOwner != address(0), "L2Registrar: zero owner address");
        require(keys.length == values.length, "L2Registrar: keys/values length mismatch");

        bytes32 node = registry.createSubnode(
            registry.baseNode(),
            label,
            subnameOwner,
            new bytes[](0)
        );

        for (uint256 i = 0; i < keys.length; i++) {
            require(bytes(keys[i]).length > 0, "L2Registrar: empty key");
            registry.setText(node, keys[i], values[i]);
        }

        emit SubnameRegistered(label, subnameOwner, node);
    }

    /// @notice Checks whether a label is available (not yet registered).
    /// @dev    Delegates to the registry's makeNode + ownerOf logic. Returns false on any revert.
    function available(string calldata label) external view returns (bool) {
        bytes32 node = registry.makeNode(registry.baseNode(), label);
        // ownerOf reverts for non-existent tokens — treat that as available
        (bool success, bytes memory data) = address(registry).staticcall(
            abi.encodeWithSignature("ownerOf(uint256)", uint256(node))
        );
        if (!success) return true;
        address currentOwner = abi.decode(data, (address));
        return currentOwner == address(0);
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    /// @notice Points this registrar at a different registry. Owner-only.
    function setRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "L2Registrar: zero registry address");
        address old = address(registry);
        registry = IL2Registry(_registry);
        emit RegistryUpdated(old, _registry);
    }

    /// @notice Halts all registrations. Use during an incident or upgrade.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resumes registrations.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Drains accidentally sent ETH to the owner.
    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "L2Registrar: nothing to withdraw");
        (bool ok, ) = owner().call{value: bal}("");
        require(ok, "L2Registrar: withdrawal failed");
    }

    receive() external payable {}
}
