// packages/nextjs/networkAddresses.ts

export const networkAddresses: Record<number, { erc1155: string; forge: string }> = {
  // Hardhat local (chainId 31337)
  // 31337: {
  //   erc1155: process.env.NEXT_PUBLIC_ERC1155_ADDRESS_LOCAL || "",
  //   forge: process.env.NEXT_PUBLIC_FORGE_ADDRESS_LOCAL || "",
  // },
  // Sepolia (chainId 11155111)
  11155111: {
    erc1155: process.env.NEXT_PUBLIC_ERC1155_ADDRESS_SEPOLIA || "",
    forge: process.env.NEXT_PUBLIC_FORGE_ADDRESS_SEPOLIA || "",
  },
  // Mainnet (chainId 1) - If you deploy there:
  1: {
    erc1155: process.env.NEXT_PUBLIC_ERC1155_ADDRESS_MAINNET || "",
    forge: process.env.NEXT_PUBLIC_FORGE_ADDRESS_MAINNET || "",
  },
  // If you want to add other networks (polygon, etc.), do so here
};
