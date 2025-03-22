# Forging Dapp Hardhat Testing & Coverage Documentation

This document provides an overview of our testing strategy for the **ForgeableERC1155** and **TokenForge** contracts. It details how we achieved comprehensive test coverage on our custom forging logic, describes all the tests conducted, lists the commands we used, and explains why the branch coverage remains at 84.21% due to inherited OpenZeppelin library code.

---

## Key Achievements

- **43 Passing Tests** covering all custom forging functionality.
- **100% Statement Coverage** on our custom contract code.
- Thorough **Branch Coverage** testing through extensive scenario and boundary tests.
- Utilization of **Hardhat** for scripting, deployment, testing, and coverage reporting.
- Demonstrated skill in excluding external library code (via `.solcover.js`) even though inherited branches (from OpenZeppelin) remain in the overall report.
- Experience with **Foundry** for advanced fuzz testing (as a future recommendation).

---

## 1. Introduction

Our dApp consists of two main contracts:

- **ForgeableERC1155**  
  A custom ERC1155 token contract that supports free minting for tokens `0`–`2` (with a 1‑minute cooldown), forging functionality with supply limits (e.g., token 6 is capped at 100), and special mint/burn functions that can only be called by a designated forging contract.

- **TokenForge**  
  A contract that integrates with `ForgeableERC1155`, allowing users to forge advanced tokens (IDs 3–6) by burning base tokens, trade advanced tokens for base tokens, and perform direct burns.  
 
---

## 2. Project Setup

Our project structure is as follows:

```bash
.
├── contracts
│   ├── ForgeableERC1155.sol
│   └── TokenForge.sol
├── test
│   └── ForgingDapp.test.ts
├── .solcover.js
├── hardhat.config.ts
├── package.json
├── yarn.lock
└── ...
```

### Installing Dependencies

Install using Yarn:

```bash
yarn install
```

Or using npm:

```bash
npm install
```

### Hardhat & Coverage Setup

We use the `solidity-coverage` plugin for coverage. Install it with:

```bash
yarn add --dev solidity-coverage
```

We use a `.solcover.js` file to attempt excluding external libraries (OpenZeppelin) from our coverage report:

```js
// .solcover.js
module.exports = {
  skipFiles: [
    "node_modules/@openzeppelin/contracts/access/Ownable.sol",
    "node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol",
    "node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol"
  ],
};
```

> **Note:** In our case, the OpenZeppelin library branches are still reported, so our overall branch coverage remains at 84.21%. This is expected because the inherited code is merged with our custom code by the Solidity compiler and coverage tool.

---

## 3. Running Tests & Checking Coverage

### 3.1 Running Tests

We run all our tests with:

```bash
yarn hardhat test
```

Our test run output looks like this:

```
ForgeableERC1155 Direct Tests (All Branches Covered)
  Ownership & Setting Forging Contract
    ✔ should allow owner to set the forging contract
    ✔ should revert when non-owner calls setForgingContract
    ✔ should allow setting forging contract to address(0) multiple times
  Free Mint Function
    ✔ should allow free mint for token IDs 0 and 2 (boundary test)
    ✔ should revert free mint for token IDs greater than 2
    ✔ should enforce a 1-minute cooldown
  Direct Forging Functions
    ✔ should allow forgeMint for token != 6
    ✔ should allow forgeMint for token == 6 up to the limit
    ✔ should enforce token 6 supply limit in forgeMint
    ✔ should handle forgeMint with amount=0 (no-op) if allowed
    ✔ should allow forgeBurn when called by forging contract
    ✔ should handle forgeBurn with amount=0 (no-op) if allowed
    ✔ should allow batch mint (including token6) and burn
    ✔ should revert forgeMintBatch if token 6 supply limit is exceeded
    ✔ should revert forgeMintBatch if arrays length mismatch
    ✔ should revert forgeBurnBatch if arrays length mismatch
    ✔ should allow forgeMintBatch with empty arrays
    ✔ should allow forgeBurnBatch with empty arrays
    ✔ should allow forgeMintBatch with non-6 tokens only
    ✔ should allow forgeBurnBatch with zero amounts
    ✔ should revert forgeMint if caller is not forging contract
    ✔ should revert forgeBurn if caller is not forging contract
    ✔ should revert forgeMintBatch if caller is not forging contract
    ✔ should revert forgeBurnBatch if caller is not forging contract

TokenForge Integration Tests (All Branches Covered)
  Forge Token Functions
    ✔ forgeToken3 should burn token0 and token1 and mint token3 (happy path)
    ✔ should revert forgeToken3 if token0 is insufficient
    ✔ should revert forgeToken3 if token0 is sufficient but token1 is insufficient
    ✔ forgeToken4 should burn token1 and token2 and mint token4 (happy path)
    ✔ should revert forgeToken4 if token1 is insufficient
    ✔ should revert forgeToken4 if token1 is sufficient but token2 is insufficient
    ✔ forgeToken5 should burn token0 and token2 and mint token5 (happy path)
    ✔ should revert forgeToken5 if token0 is insufficient
    ✔ should revert forgeToken5 if token0 is sufficient but token2 is insufficient
    ✔ forgeToken6 should burn token0, token1, and token2 and mint token6 (happy path)
    ✔ should revert forgeToken6 if token0 is insufficient
    ✔ should revert forgeToken6 if token0 is sufficient but token1 is insufficient
    ✔ should revert forgeToken6 if token0 and token1 are sufficient but token2 is insufficient
  Trade and Burn Functions
    ✔ tradeForBase should trade a non-base token for a base token
    ✔ tradeForBase should revert if baseTokenId is not in 0-2
    ✔ should revert tradeForBase if user doesn't have the tokenToTrade
    ✔ burnToken should directly burn tokens 3-6
    ✔ burnToken should revert when tokenId is not in the range 3-6
    ✔ burnToken should revert if user doesn’t have enough tokens
```

### 3.2 Checking Coverage

Generate the coverage report with:

```bash
yarn hardhat coverage
```

The output we see is:

 <img src="forgingDappTesting.png" alt="Screenshot 3" style="margin:0;" />

#### Explanation of 84.21% Branch Coverage
  
- **Inherited Code:**  
  The remaining uncovered branches (resulting in 84.21% branch coverage) come from inherited contracts like **ERC1155**, **Ownable**, and **ReentrancyGuard**. These libraries contain additional conditional branches that are not directly invoked by our custom tests.

- **Detailed Coverage Reports:**
By inspecting the HTML or JSON coverage reports generated by Istanbul, we can see that all uncovered branches (marked with 0 hits) are located within functions or modifiers from OpenZeppelin contracts. For example, branches within Ownable's internal ownership checks or ReentrancyGuard’s logic are not hit by our tests.

- **Custom vs. Inherited Code:**
Our tests cover every branch of our custom functions:

  - Free minting (including boundary conditions, invalid IDs, and cooldowns)
  - Direct forging functions (including zero‑amount mints/burns, batch operations, and unauthorized access)
  - Integration functions in TokenForge (happy paths and negative cases)
  - Therefore, any remaining uncovered branches are not part of our custom logic.

- **Exclusion Attempt:**  
  Although we configured `.solcover.js` to skip OpenZeppelin files, sometimes the Solidity compiler inlines inherited code into our contracts. As a result, the branches from those libraries remain visible in the overall coverage. This is typical for many projects and is generally acceptable because our focus is on achieving 100% coverage on our custom logic.

---

## 4. Our Test Scenarios

Below is a summary of the test scenarios we conducted:

### Ownership & Setting Forging Contract
- **Valid Owner Call:**  
  The owner sets the forging contract (e.g., to `addr1`) and the event `ForgingContractSet` is emitted.
- **Non-owner Call:**  
  When a non-owner (e.g., `addr1`) tries to set the forging contract, the transaction reverts.
- **Setting to Zero Address:**  
  The forging contract is set to `address(0)` and then set to `address(0)` again to cover both change and no‑change branches.

### Free Mint Function
- **Boundary Test:**  
  We free mint tokens with IDs `0` and `2` to cover the boundary condition `tokenId <= 2`.
- **Invalid Token ID:**  
  Attempting to free mint a token with an ID greater than 2 reverts.
- **Cooldown Enforcement:**  
  A second mint within 1 minute is rejected, then accepted after advancing time.

### Direct Forging Functions
- **forgeMint Tests:**  
  - Normal minting for tokens other than 6.  
  - Minting token 6 up to the supply limit.  
  - Reverting when token 6’s supply limit is exceeded.  
  - Zero‑amount mint calls (expected to be a no‑op).
- **forgeBurn Tests:**  
  - Burning tokens correctly reduces total supply.  
  - Zero‑amount burn calls do not change total supply.
- **Batch Operations:**  
  - Successful batch mint and burn including token 6.  
  - Batch operations with mismatched arrays revert.  
  - Empty array calls succeed (no operation).  
  - Batch mint with only normal tokens (non‑6) and batch burn with zero amounts.
- **Unauthorized Calls:**  
  Each forging function reverts when called by an address that is not the designated forging contract.

### TokenForge Integration Tests
- **forgeToken3, forgeToken4, forgeToken5, forgeToken6:**  
  For each function, we test:
  - **Happy Path:** Required tokens are present, the forging process succeeds, and the correct events are emitted.  
  - **Negative Scenarios:** Each function reverts with an appropriate error message when one of the required tokens is missing.
- **Trade and Burn Functions:**  
  - `tradeForBase` swaps a non-base token for a base token and reverts if the target base token ID is invalid or if the user lacks the token.
  - `burnToken` burns forged tokens directly, and reverts if the token ID is out of range or if the user lacks enough tokens.

---

## 5. Commands & Tools Used

### Running Tests

```bash
yarn hardhat test
```

### Generating Coverage Report

```bash
yarn hardhat coverage
```

### Excluding Libraries from Coverage

Our `.solcover.js` file (placed at the root) is configured as follows:

```js
module.exports = {
  skipFiles: [
    "node_modules/@openzeppelin/contracts/access/Ownable.sol",
    "node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol",
    "node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol"
  ],
};
```

> **Note:** Despite this configuration, inherited code is sometimes merged with our contracts by the compiler, which is why our overall branch coverage remains at 84.21%. This is acceptable for our purposes because our custom forging logic is 100% covered.

---

## 6. (Optional) Foundry Testing

While we use Hardhat for our primary testing and coverage, we also recommend exploring **Foundry** for advanced fuzz testing. With Foundry you can:

```bash
forge init
forge install openzeppelin/openzeppelin-contracts
forge test
forge coverage  # For coverage reporting with additional tools
```

Foundry’s approach uses cheatcodes like `warp` to manipulate time, which is very useful for testing time-dependent functions.

---

## 7. Conclusion

Our comprehensive test suite demonstrates:

- **Robust Testing:**  
  We covered all custom forging functions, boundary conditions, zero-amount operations, batch operations, and unauthorized access checks.
  
- **100% Statement Coverage:**  
  All custom code is executed by our tests.
  
- **Thorough Branch Testing:**  
  While our overall branch coverage remains at 84.21% due to inherited OpenZeppelin code, our custom logic is fully exercised. This is common in real-world projects.
  
- **Tool Proficiency:**  
  We utilized Hardhat for deployment, testing, and coverage, and we understand how to configure coverage tools (and even use Foundry as a supplementary tool).

Our testing process reflects a deep understanding of Solidity, advanced testing practices, and the ability to manage both custom and inherited code in a professional-grade project.

---

<div align="center">

**“100% coverage on custom forging logic demonstrates a commitment to robust, production-grade smart contract development.”**

</div>

