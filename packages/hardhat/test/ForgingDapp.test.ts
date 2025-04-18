import { deployments, ethers } from "hardhat";
import { expect } from "chai";
import { ForgeableERC1155, TokenForge } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("ForgeableERC1155 Direct Tests (All Branches Covered)", function () {
  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  /*let addrs: SignerWithAddress[];*/
  let forgeable: ForgeableERC1155;

  beforeEach(async function () {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [deployer, addr1, addr2, /*..._addrs*/] = await ethers.getSigners();
    // Deploy from scratch for each test
    await deployments.fixture(["ForgeContracts"]);
    forgeable = (await ethers.getContract("ForgeableERC1155", deployer)) as ForgeableERC1155;
  });

  describe("Ownership & Setting Forging Contract", function () {
    it("should allow owner to set the forging contract", async function () {
      await expect(forgeable.connect(deployer).setForgingContract(addr1.address))
        .to.emit(forgeable, "ForgingContractSet")
        .withArgs(addr1.address);
    });

    it("should revert when non-owner calls setForgingContract", async function () {
      // Expect a revert when a non-owner attempts to set the forging contract.
      await expect(forgeable.connect(addr1).setForgingContract(addr2.address))
        .to.be.reverted;
    });

    it("should allow setting forging contract to address(0) multiple times", async function () {
      // 1) Set forgingContract to zero
      await expect(forgeable.connect(deployer).setForgingContract(ethers.ZeroAddress))
        .to.emit(forgeable, "ForgingContractSet")
        .withArgs(ethers.ZeroAddress);
      expect(await forgeable.forgingContract()).to.equal(ethers.ZeroAddress);

      // 2) Set forgingContract to zero again (cover branch if contract checks for changes)
      await forgeable.connect(deployer).setForgingContract(ethers.ZeroAddress);
      expect(await forgeable.forgingContract()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Free Mint Function", function () {
    it("should allow free mint for token IDs 0 and 2 (boundary test)", async function () {
      // Mint token 0
      await expect(forgeable.connect(addr1).freeMint(0))
        .to.emit(forgeable, "FreeMint")
        .withArgs(addr1.address, 0, anyValue);
      expect(await forgeable.totalSupply(0)).to.equal(1);

      // Mint token 2 (upper boundary)
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine", []);
      await expect(forgeable.connect(addr1).freeMint(2))
        .to.emit(forgeable, "FreeMint")
        .withArgs(addr1.address, 2, anyValue);
      expect(await forgeable.totalSupply(2)).to.equal(1);
    });

    it("should revert free mint for token IDs greater than 2", async function () {
      await expect(forgeable.connect(addr1).freeMint(3))
        .to.be.revertedWith("Only tokens 0-2 can be free minted");
    });

    it("should enforce a 1-minute cooldown", async function () {
      await forgeable.connect(addr1).freeMint(1);
      await expect(forgeable.connect(addr1).freeMint(1))
        .to.be.revertedWith("Cooldown: wait 1 minute");
      // Increase EVM time and mine a block
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine", []);
      await expect(forgeable.connect(addr1).freeMint(1))
        .to.emit(forgeable, "FreeMint");
    });
  });

  describe("Direct Forging Functions", function () {
    beforeEach(async function () {
      // Set forging contract to addr1 for these tests
      await forgeable.connect(deployer).setForgingContract(addr1.address);
    });

    it("should allow forgeMint for token != 6", async function () {
      await expect(forgeable.connect(addr1).forgeMint(addr2.address, 3, 5))
        .to.emit(forgeable, "ForgeMint")
        .withArgs(addr2.address, 3, 5);
      expect(await forgeable.totalSupply(3)).to.equal(5);
    });

    it("should allow forgeMint for token == 6 up to the limit", async function () {
      await expect(forgeable.connect(addr1).forgeMint(addr2.address, 6, 50))
        .to.emit(forgeable, "ForgeMint")
        .withArgs(addr2.address, 6, 50);
      expect(await forgeable.totalSupply(6)).to.equal(50);
    });

    it("should enforce token 6 supply limit in forgeMint", async function () {
      await forgeable.connect(addr1).forgeMint(addr2.address, 6, 50);
      await expect(forgeable.connect(addr1).forgeMint(addr2.address, 6, 51))
        .to.be.revertedWith("Token 6 supply limit reached");
    });

    // Zero-amount mint test
    it("should handle forgeMint with amount=0 (no-op) if allowed", async function () {
      await expect(forgeable.connect(addr1).forgeMint(addr2.address, 3, 0))
        .to.not.be.reverted;
      // totalSupply(3) should remain 0
      expect(await forgeable.totalSupply(3)).to.equal(0);
    });

    it("should allow forgeBurn when called by forging contract", async function () {
      await forgeable.connect(addr1).forgeMint(addr2.address, 2, 3);
      await expect(forgeable.connect(addr1).forgeBurn(addr2.address, 2, 2))
        .to.emit(forgeable, "ForgeBurn")
        .withArgs(addr2.address, 2, 2);
      expect(await forgeable.totalSupply(2)).to.equal(1);
    });

    // Zero-amount burn test (includes your suggested forgeBurn(..., 0))
    it("should handle forgeBurn with amount=0 (no-op) if allowed", async function () {
      await forgeable.connect(addr1).forgeMint(addr2.address, 2, 5);
      await expect(forgeable.connect(addr1).forgeBurn(addr2.address, 2, 0))
        .to.not.be.reverted;
      // totalSupply(2) should remain 5
      expect(await forgeable.totalSupply(2)).to.equal(5);
    });

    it("should allow batch mint (including token6) and burn", async function () {
      const tokenIds = [0, 6];
      const amounts = [1, 10];
      await forgeable.connect(addr1).forgeMintBatch(addr2.address, tokenIds, amounts);
      expect(await forgeable.totalSupply(0)).to.equal(1);
      expect(await forgeable.totalSupply(6)).to.equal(10);

      await expect(forgeable.connect(addr1).forgeBurnBatch(addr2.address, tokenIds, amounts))
        .to.emit(forgeable, "ForgeBurn");
      expect(await forgeable.totalSupply(0)).to.equal(0);
      expect(await forgeable.totalSupply(6)).to.equal(0);
    });

    it("should revert forgeMintBatch if token 6 supply limit is exceeded", async function () {
      await forgeable.connect(addr1).forgeMint(addr2.address, 6, 95);
      await expect(forgeable.connect(addr1).forgeMintBatch(addr2.address, [6], [10]))
        .to.be.revertedWith("Token 6 supply limit reached");
    });

    it("should revert forgeMintBatch if arrays length mismatch", async function () {
      await expect(forgeable.connect(addr1).forgeMintBatch(addr2.address, [0, 6], [1]))
        .to.be.revertedWith("Array lengths mismatch");
    });

    it("should revert forgeBurnBatch if arrays length mismatch", async function () {
      await expect(forgeable.connect(addr1).forgeBurnBatch(addr2.address, [0, 6], [1]))
        .to.be.revertedWith("Array lengths mismatch");
    });

    it("should allow forgeMintBatch with empty arrays", async function () {
      await expect(forgeable.connect(addr1).forgeMintBatch(addr2.address, [], []))
        .to.not.be.reverted;
    });

    it("should allow forgeBurnBatch with empty arrays", async function () {
      await expect(forgeable.connect(addr1).forgeBurnBatch(addr2.address, [], []))
        .to.not.be.reverted;
    });

    // Batch tests with only normal tokens (no token6)
    it("should allow forgeMintBatch with non-6 tokens only", async function () {
      const tokenIds = [2, 3];
      const amounts = [2, 3];
      await forgeable.connect(addr1).forgeMintBatch(addr2.address, tokenIds, amounts);
      expect(await forgeable.totalSupply(2)).to.equal(2);
      expect(await forgeable.totalSupply(3)).to.equal(3);
    });

    it("should allow forgeBurnBatch with zero amounts", async function () {
      await forgeable.connect(addr1).forgeMintBatch(addr2.address, [2, 3], [2, 3]);
      await expect(
        forgeable.connect(addr1).forgeBurnBatch(addr2.address, [2, 3], [0, 0])
      ).to.not.be.reverted;
      // totalSupply remains unchanged
      expect(await forgeable.totalSupply(2)).to.equal(2);
      expect(await forgeable.totalSupply(3)).to.equal(3);
    });

    // --- UNAUTHORIZED CALL TESTS ---
    it("should revert forgeMint if caller is not forging contract", async function () {
      await expect(forgeable.connect(deployer).forgeMint(addr2.address, 3, 1))
        .to.be.revertedWith("Only forging contract allowed");
    });

    it("should revert forgeBurn if caller is not forging contract", async function () {
      await forgeable.connect(addr1).forgeMint(addr2.address, 3, 1);
      await expect(forgeable.connect(deployer).forgeBurn(addr2.address, 3, 1))
        .to.be.revertedWith("Only forging contract allowed");
    });

    it("should revert forgeMintBatch if caller is not forging contract", async function () {
      const tokenIds = [0, 6];
      const amounts = [1, 2];
      await expect(forgeable.connect(deployer).forgeMintBatch(addr2.address, tokenIds, amounts))
        .to.be.revertedWith("Only forging contract allowed");
    });

    it("should revert forgeBurnBatch if caller is not forging contract", async function () {
      await forgeable.connect(addr1).forgeMintBatch(addr2.address, [0], [1]);
      await expect(forgeable.connect(deployer).forgeBurnBatch(addr2.address, [0], [1]))
        .to.be.revertedWith("Only forging contract allowed");
    });
  });
});

describe("TokenForge Integration Tests (All Branches Covered)", function () {
  let deployer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let forgeable: ForgeableERC1155;
  let tokenForge: TokenForge;

  beforeEach(async function () {
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();
    await deployments.fixture(["ForgeContracts"]);
    forgeable = (await ethers.getContract("ForgeableERC1155", deployer)) as ForgeableERC1155;
    tokenForge = (await ethers.getContract("TokenForge", deployer)) as TokenForge;
    // Mint base tokens (0,1,2) for addr1 with proper 1-minute cooldowns
    await forgeable.connect(addr1).freeMint(0);
    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);
    await forgeable.connect(addr1).freeMint(1);
    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);
    await forgeable.connect(addr1).freeMint(2);
  });

  describe("Forge Token Functions", function () {
    // forgeToken3 tests
    it("forgeToken3 should burn token0 and token1 and mint token3 (happy path)", async function () {
      expect(await forgeable.balanceOf(addr1.address, 0)).to.equal(1);
      expect(await forgeable.balanceOf(addr1.address, 1)).to.equal(1);
      await expect(tokenForge.connect(addr1).forgeToken3())
        .to.emit(tokenForge, "TokenForged")
        .withArgs(addr1.address, 3, "forge3");
      expect(await forgeable.balanceOf(addr1.address, 0)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 1)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 3)).to.equal(1);
    });

    it("should revert forgeToken3 if token0 is insufficient", async function () {
      // Only mint token1 for addr2
      await forgeable.connect(addr2).freeMint(1);
      await expect(tokenForge.connect(addr2).forgeToken3())
        .to.be.revertedWith("Insufficient token 0");
    });

    it("should revert forgeToken3 if token0 is sufficient but token1 is insufficient", async function () {
      // Only mint token0 for addr2
      await forgeable.connect(addr2).freeMint(0);
      await expect(tokenForge.connect(addr2).forgeToken3())
        .to.be.revertedWith("Insufficient token 1");
    });

    // forgeToken4 tests
    it("forgeToken4 should burn token1 and token2 and mint token4 (happy path)", async function () {
      expect(await forgeable.balanceOf(addr1.address, 1)).to.equal(1);
      expect(await forgeable.balanceOf(addr1.address, 2)).to.equal(1);
      await expect(tokenForge.connect(addr1).forgeToken4())
        .to.emit(tokenForge, "TokenForged")
        .withArgs(addr1.address, 4, "forge4");
      expect(await forgeable.balanceOf(addr1.address, 1)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 2)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 4)).to.equal(1);
    });

    it("should revert forgeToken4 if token1 is insufficient", async function () {
      // Only mint token2 for addr2
      await forgeable.connect(addr2).freeMint(2);
      await expect(tokenForge.connect(addr2).forgeToken4())
        .to.be.revertedWith("Insufficient token 1");
    });

    it("should revert forgeToken4 if token1 is sufficient but token2 is insufficient", async function () {
      // Only mint token1 for addr2
      await forgeable.connect(addr2).freeMint(1);
      await expect(tokenForge.connect(addr2).forgeToken4())
        .to.be.revertedWith("Insufficient token 2");
    });

    // forgeToken5 tests
    it("forgeToken5 should burn token0 and token2 and mint token5 (happy path)", async function () {
      expect(await forgeable.balanceOf(addr1.address, 0)).to.equal(1);
      expect(await forgeable.balanceOf(addr1.address, 2)).to.equal(1);
      await expect(tokenForge.connect(addr1).forgeToken5())
        .to.emit(tokenForge, "TokenForged")
        .withArgs(addr1.address, 5, "forge5");
      expect(await forgeable.balanceOf(addr1.address, 0)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 2)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 5)).to.equal(1);
    });

    it("should revert forgeToken5 if token0 is insufficient", async function () {
      // Only mint token2 for addr2
      await forgeable.connect(addr2).freeMint(2);
      await expect(tokenForge.connect(addr2).forgeToken5())
        .to.be.revertedWith("Insufficient token 0");
    });

    it("should revert forgeToken5 if token0 is sufficient but token2 is insufficient", async function () {
      // Only mint token0 for addr2
      await forgeable.connect(addr2).freeMint(0);
      await expect(tokenForge.connect(addr2).forgeToken5())
        .to.be.revertedWith("Insufficient token 2");
    });

    // forgeToken6 tests
    it("forgeToken6 should burn token0, token1, and token2 and mint token6 (happy path)", async function () {
      expect(await forgeable.balanceOf(addr1.address, 0)).to.equal(1);
      expect(await forgeable.balanceOf(addr1.address, 1)).to.equal(1);
      expect(await forgeable.balanceOf(addr1.address, 2)).to.equal(1);
      await expect(tokenForge.connect(addr1).forgeToken6())
        .to.emit(tokenForge, "TokenForged")
        .withArgs(addr1.address, 6, "forge6");
      expect(await forgeable.balanceOf(addr1.address, 0)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 1)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 2)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 6)).to.equal(1);
    });

    it("should revert forgeToken6 if token0 is insufficient", async function () {
      // Only mint token1 and token2 for addr2
      await forgeable.connect(addr2).freeMint(1);
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine", []);
      await forgeable.connect(addr2).freeMint(2);
      await expect(tokenForge.connect(addr2).forgeToken6())
        .to.be.revertedWith("Insufficient token 0");
    });

    it("should revert forgeToken6 if token0 is sufficient but token1 is insufficient", async function () {
      // Only mint token0 and token2 for addr2
      await forgeable.connect(addr2).freeMint(0);
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine", []);
      await forgeable.connect(addr2).freeMint(2);
      await expect(tokenForge.connect(addr2).forgeToken6())
        .to.be.revertedWith("Insufficient token 1");
    });

    it("should revert forgeToken6 if token0 and token1 are sufficient but token2 is insufficient", async function () {
      // Only mint token0 and token1 for addr2
      await forgeable.connect(addr2).freeMint(0);
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine", []);
      await forgeable.connect(addr2).freeMint(1);
      await expect(tokenForge.connect(addr2).forgeToken6())
        .to.be.revertedWith("Insufficient token 2");
    });
  });

  describe("Trade and Burn Functions", function () {
    beforeEach(async function () {
      // Forge token3 for addr1 so it can be traded or burned
      await tokenForge.connect(addr1).forgeToken3();
    });

    it("tradeForBase should trade a non-base token for a base token", async function () {
      await expect(tokenForge.connect(addr1).tradeForBase(3, 0))
        .to.emit(tokenForge, "TokenTraded")
        .withArgs(addr1.address, 3, 0);
      expect(await forgeable.balanceOf(addr1.address, 3)).to.equal(0);
      expect(await forgeable.balanceOf(addr1.address, 0)).to.equal(1);
    });

    it("tradeForBase should revert if baseTokenId is not in 0-2", async function () {
      await expect(tokenForge.connect(addr1).tradeForBase(3, 3))
        .to.be.revertedWith("Can only trade for tokens 0-2");
    });

    it("should revert tradeForBase if user doesn't have the tokenToTrade", async function () {
      await expect(tokenForge.connect(addr1).tradeForBase(4, 0))
        .to.be.revertedWith("Insufficient token to trade");
    });

    it("burnToken should directly burn tokens 3-6", async function () {
      await expect(tokenForge.connect(addr1).burnToken(3, 1))
        .to.emit(tokenForge, "TokenBurned")
        .withArgs(addr1.address, 3, 1);
      expect(await forgeable.balanceOf(addr1.address, 3)).to.equal(0);
    });

    it("burnToken should revert when tokenId is not in the range 3-6", async function () {
      await expect(tokenForge.connect(addr1).burnToken(0, 1))
        .to.be.revertedWith("Only tokens 3-6 can be burned directly");
    });

    it("burnToken should revert if user doesn’t have enough tokens", async function () {
      // Burn token3 once
      await tokenForge.connect(addr1).burnToken(3, 1);
      // Now token 3 balance is 0, so burning again should revert
      await expect(tokenForge.connect(addr1).burnToken(3, 1))
        .to.be.revertedWith("Insufficient tokens to burn");
    });
  });
});
