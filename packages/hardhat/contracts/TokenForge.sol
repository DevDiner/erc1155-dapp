// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IForgeableERC1155 {
    function forgeMint(address to, uint256 tokenId, uint256 amount) external;
    function forgeMintBatch(address to, uint256[] calldata tokenIds, uint256[] calldata amounts) external;
    function forgeBurn(address from, uint256 tokenId, uint256 amount) external;
    function forgeBurnBatch(address from, uint256[] calldata tokenIds, uint256[] calldata amounts) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

contract TokenForge is ReentrancyGuard {
    IForgeableERC1155 public tokenContract;

    // --- EVENTS ---
    event TokenForged(address indexed user, uint256 forgedTokenId, string forgeType);
    event TokenTraded(address indexed user, uint256 tradedTokenId, uint256 baseTokenId);
    event TokenBurned(address indexed user, uint256 burnedTokenId, uint256 amount);

    constructor(address _tokenContract) {
        tokenContract = IForgeableERC1155(_tokenContract);
    }

    // Forge Token 3
    function forgeToken3() external nonReentrant {
        require(tokenContract.balanceOf(msg.sender, 0) >= 1, "Insufficient token 0");
        require(tokenContract.balanceOf(msg.sender, 1) >= 1, "Insufficient token 1");

        uint256[] memory burnIds = new uint256[](2);
        uint256[] memory burnAmounts = new uint256[](2);
        burnIds[0] = 0; burnIds[1] = 1;
        burnAmounts[0] = 1; burnAmounts[1] = 1;

        tokenContract.forgeBurnBatch(msg.sender, burnIds, burnAmounts);
        tokenContract.forgeMint(msg.sender, 3, 1);
        emit TokenForged(msg.sender, 3, "forge3");
    }

    // Forge Token 4
    function forgeToken4() external nonReentrant {
        require(tokenContract.balanceOf(msg.sender, 1) >= 1, "Insufficient token 1");
        require(tokenContract.balanceOf(msg.sender, 2) >= 1, "Insufficient token 2");

        uint256[] memory burnIds = new uint256[](2);
        uint256[] memory burnAmounts = new uint256[](2);
        burnIds[0] = 1; burnIds[1] = 2;
        burnAmounts[0] = 1; burnAmounts[1] = 1;

        tokenContract.forgeBurnBatch(msg.sender, burnIds, burnAmounts);
        tokenContract.forgeMint(msg.sender, 4, 1);
        emit TokenForged(msg.sender, 4, "forge4");
    }

    // Forge Token 5
    function forgeToken5() external nonReentrant {
        require(tokenContract.balanceOf(msg.sender, 0) >= 1, "Insufficient token 0");
        require(tokenContract.balanceOf(msg.sender, 2) >= 1, "Insufficient token 2");

        uint256[] memory burnIds = new uint256[](2);
        uint256[] memory burnAmounts = new uint256[](2);
        burnIds[0] = 0; burnIds[1] = 2;
        burnAmounts[0] = 1; burnAmounts[1] = 1;

        tokenContract.forgeBurnBatch(msg.sender, burnIds, burnAmounts);
        tokenContract.forgeMint(msg.sender, 5, 1);
        emit TokenForged(msg.sender, 5, "forge5");
    }

    // Forge Token 6
    function forgeToken6() external nonReentrant {
        require(tokenContract.balanceOf(msg.sender, 0) >= 1, "Insufficient token 0");
        require(tokenContract.balanceOf(msg.sender, 1) >= 1, "Insufficient token 1");
        require(tokenContract.balanceOf(msg.sender, 2) >= 1, "Insufficient token 2");

        uint256[] memory burnIds = new uint256[](3);
        uint256[] memory burnAmounts = new uint256[](3);
        burnIds[0] = 0; burnIds[1] = 1; burnIds[2] = 2;
        burnAmounts[0] = 1; burnAmounts[1] = 1; burnAmounts[2] = 1;

        tokenContract.forgeBurnBatch(msg.sender, burnIds, burnAmounts);
        tokenContract.forgeMint(msg.sender, 6, 1);
        emit TokenForged(msg.sender, 6, "forge6");
    }

    // Trade any token for a base token (0-2)
    function tradeForBase(uint256 tokenToTrade, uint256 baseTokenId) external nonReentrant {
        require(baseTokenId <= 2, "Can only trade for tokens 0-2");
        require(tokenContract.balanceOf(msg.sender, tokenToTrade) >= 1, "Insufficient token to trade");

        tokenContract.forgeBurn(msg.sender, tokenToTrade, 1);
        tokenContract.forgeMint(msg.sender, baseTokenId, 1);
        emit TokenTraded(msg.sender, tokenToTrade, baseTokenId);
    }

    // Direct burn function for tokens [3–6] for nothing
    function burnToken(uint256 tokenId, uint256 amount) external nonReentrant {
        require(tokenId >= 3 && tokenId <= 6, "Only tokens 3-6 can be burned directly");
        require(tokenContract.balanceOf(msg.sender, tokenId) >= amount, "Insufficient tokens to burn");

        tokenContract.forgeBurn(msg.sender, tokenId, amount);
        emit TokenBurned(msg.sender, tokenId, amount);
    }
}
