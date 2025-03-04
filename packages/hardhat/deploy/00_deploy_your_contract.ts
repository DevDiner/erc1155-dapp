/**
 * Deploys the ForgeableERC1155 and TokenForge contracts, then sets
 * the forging contract address in ForgeableERC1155.
 *
 * Original notes from Scaffold-ETH:
 * - On localhost, the deployer account is the one that comes with Hardhat, which is already funded.
 * - When deploying to live networks (e.g. `yarn deploy --network sepolia`), the deployer account
 *   should have sufficient balance to pay for gas fees for contract creation.
 * - You can generate a random account with `yarn generate` or `yarn account:import` to import your
 *   existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts).
 * - You can run the `yarn account` command to check your balance in every network.
 *
 * New Comments:
 * - We provide a base URI for our ERC1155 token's metadata (with `{id}` in the URI).
 * - After deploying both contracts, we call `setForgingContract(...)` so that TokenForge
 *   is recognized as the contract that can call `forgeMint` and `forgeBurn` on the ERC1155.
 */

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
/*
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployForgeContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, ethers, getNamedAccounts } = hre;
  const { deploy } = deployments;

  // The deployer account is automatically set up by Hardhat Named Accounts in scaffold-eth
  const { deployer } = await getNamedAccounts();

  // 1) Deploy the ForgeableERC1155 contract
  //    Provide a base URI for the metadata, e.g. "https://yourdomain.com/metadata/{id}.json"
  const baseURI = "ipfs://QmS7C6YNrgE93AWjkG7eijDPwgYxc4Lsg6yVtjcWQCXMQQ/{id}.json";

  const forgeableERC1155Deployment = await deploy("ForgeableERC1155", {
    from: deployer,
    args: [baseURI], // constructor(string memory uri)
    log: true,
    autoMine: true, // speeds up deployment on local networks by mining the tx
  });

  console.log("ForgeableERC1155 deployed at:", forgeableERC1155Deployment.address);

  // 2) Deploy the TokenForge contract
  //    Pass the ForgeableERC1155 address to the constructor so it can call forging methods
  const tokenForgeDeployment = await deploy("TokenForge", {
    from: deployer,
    // Contract constructor arguments
    args: [forgeableERC1155Deployment.address],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  console.log("TokenForge deployed at:", tokenForgeDeployment.address);

  // 3) Wire them together: call setForgingContract(...) on ForgeableERC1155
  //    so that TokenForge is recognized as the only forging contract
  const forgeableERC1155 = await ethers.getContract<Contract>("ForgeableERC1155", deployer);
  const tx = await forgeableERC1155.setForgingContract(tokenForgeDeployment.address);
  await tx.wait();

  console.log("✔ setForgingContract() called on ForgeableERC1155 with address:", tokenForgeDeployment.address);
};

export default deployForgeContracts;

// By tagging, you can selectively deploy these via `yarn deploy --tags ForgeContracts`
deployForgeContracts.tags = ["ForgeContracts"];
