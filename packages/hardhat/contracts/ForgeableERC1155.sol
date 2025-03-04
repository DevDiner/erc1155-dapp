// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ForgeableERC1155 is ERC1155, Ownable, ReentrancyGuard {
    // 1-minute cooldown for free minting (tokens 0-2)
    mapping(address => uint256) public lastMintTimestamp;

    // The forging contract with special privileges
    address public forgingContract;

    // We track total supply for *all* token IDs here
    mapping(uint256 => uint256) public totalSupply;

    // Maximum supply for token 6 (rare token)
    uint256 public constant MAX_SUPPLY_TOKEN6 = 100;

    // --- EVENTS ---
    event FreeMint(address indexed minter, uint256 tokenId, uint256 timestamp);
    event ForgeMint(address indexed recipient, uint256 tokenId, uint256 amount);
    event ForgeBurn(address indexed from, uint256 tokenId, uint256 amount);
    event ForgingContractSet(address forgingContract);

    constructor(string memory uri) ERC1155(uri) Ownable(msg.sender) ReentrancyGuard() {}

    // Set forging contract address (onlyOwner)
    function setForgingContract(address _forgingContract) external onlyOwner nonReentrant {
        forgingContract = _forgingContract;
        emit ForgingContractSet(_forgingContract);
    }

    // Free mint for tokens 0-2 (with a 1-minute cooldown)
    function freeMint(uint256 tokenId) external nonReentrant {
        require(tokenId <= 2, "Only tokens 0-2 can be free minted");
        require(block.timestamp >= lastMintTimestamp[msg.sender] + 60, "Cooldown: wait 1 minute");
        lastMintTimestamp[msg.sender] = block.timestamp;

        // Increment total supply
        totalSupply[tokenId] += 1;

        _mint(msg.sender, tokenId, 1, "");
        emit FreeMint(msg.sender, tokenId, block.timestamp);
    }

    // Mint function (only callable by forging contract)
    function forgeMint(address to, uint256 tokenId, uint256 amount) external nonReentrant {
        require(msg.sender == forgingContract, "Only forging contract allowed");
        if (tokenId == 6) {
            require(totalSupply[6] + amount <= MAX_SUPPLY_TOKEN6, "Token 6 supply limit reached");
        }
        // Increment total supply for the minted token
        totalSupply[tokenId] += amount;

        _mint(to, tokenId, amount, "");
        emit ForgeMint(to, tokenId, amount);
    }

    // Burn function (only callable by forging contract)
    function forgeBurn(address from, uint256 tokenId, uint256 amount) external nonReentrant {
        require(msg.sender == forgingContract, "Only forging contract allowed");

        // Decrement total supply
        totalSupply[tokenId] -= amount;

        _burn(from, tokenId, amount);
        emit ForgeBurn(from, tokenId, amount);
    }

    // Batch mint function (only forging contract)
    function forgeMintBatch(
        address to,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(msg.sender == forgingContract, "Only forging contract allowed");
        require(tokenIds.length == amounts.length, "Array lengths mismatch");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == 6) {
                require(totalSupply[6] + amounts[i] <= MAX_SUPPLY_TOKEN6, "Token 6 supply limit reached");
            }
            totalSupply[tokenIds[i]] += amounts[i];
        }

        _mintBatch(to, tokenIds, amounts, "");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            emit ForgeMint(to, tokenIds[i], amounts[i]);
        }
    }

    // Batch burn function (only forging contract)
    function forgeBurnBatch(
        address from,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(msg.sender == forgingContract, "Only forging contract allowed");
        require(tokenIds.length == amounts.length, "Array lengths mismatch");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            totalSupply[tokenIds[i]] -= amounts[i];
        }

        _burnBatch(from, tokenIds, amounts);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            emit ForgeBurn(from, tokenIds[i], amounts[i]);
        }
    }
}
