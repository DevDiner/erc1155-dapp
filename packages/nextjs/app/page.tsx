"use client";

import React, { useCallback, useEffect, useState } from "react";
// ABIs
import ForgeableERC1155ABI from "../public/abis/ForgeableERC1155ABI.json";
import TokenForgeABI from "../public/abis/TokenForgeABI.json";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { Toaster, toast } from "react-hot-toast";
import { useAccount, useChainId } from "wagmi";
import {
  FireIcon as FlameIcon,
  SparklesIcon as GemIcon,
  ArrowPathIcon as RefreshIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/solid";
// Components
import { FaucetSection } from "~~/components/scaffold-eth/FaucetSection";
// Hooks
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";
// Addresses
import { networkAddresses } from "~~/networkAddresses";

/**
 * Helper function that only returns a provider if it's actually MetaMask.
 * If Phantom overshadowed or no MetaMask is installed, returns null.
 */
function getMetaMaskProvider(): ethers.BrowserProvider | null {
  if (typeof window !== "undefined" && window.ethereum?.isMetaMask) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

export default function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balanceData } = useWatchBalance({ address });

  const [tokenBalances, setTokenBalances] = useState<{ [key: number]: string }>({});
  const [tokenSupplies, setTokenSupplies] = useState<{ [key: number]: string }>({});
  const [burnAmounts, setBurnAmounts] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);

  const tokenIds = [0, 1, 2, 3, 4, 5, 6];

  const addresses = networkAddresses[Number(chainId)] || networkAddresses[31337];
  const ERC1155_ADDRESS = addresses.erc1155;
  const FORGE_ADDRESS = addresses.forge;

  // Fetch user balances
  const fetchBalances = useCallback(async () => {
    if (!isConnected || !address || !ERC1155_ADDRESS) return;
    console.log("Using ERC1155_ADDRESS:", ERC1155_ADDRESS);

    // Force MetaMask check
    const provider = getMetaMaskProvider();
    if (!provider) {
      toast.error("Please disable Phantom or install MetaMask!");
      return;
    }

    try {
      const erc1155 = new ethers.Contract(ERC1155_ADDRESS, ForgeableERC1155ABI, provider);
      const balances: { [key: number]: string } = {};
      for (const id of tokenIds) {
        const bal = await erc1155.balanceOf(address, id);
        balances[id] = bal.toString();
      }
      setTokenBalances(balances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [isConnected, address, ERC1155_ADDRESS]);

  // Fetch total supply for each token
  const fetchTotalSupplies = useCallback(async () => {
    if (!ERC1155_ADDRESS) return;

    // Force MetaMask
    const provider = getMetaMaskProvider();
    if (!provider) {
      toast.error("Please disable Phantom or install MetaMask!");
      return;
    }

    try {
      const erc1155 = new ethers.Contract(ERC1155_ADDRESS, ForgeableERC1155ABI, provider);
      const supplies: { [key: number]: string } = {};
      for (const id of tokenIds) {
        const supply = await erc1155.totalSupply(id);
        supplies[id] = supply.toString();
      }
      setTokenSupplies(supplies);
    } catch (error) {
      console.error("Error fetching total supplies:", error);
    }
  }, [ERC1155_ADDRESS, tokenIds]);

  // Initial data fetch
  useEffect(() => {
    fetchBalances();
    fetchTotalSupplies();
  }, [fetchBalances, fetchTotalSupplies]);

  // Listen for forging/trading/burning events
  useEffect(() => {
    if (!isConnected || !FORGE_ADDRESS) return;

    const provider = getMetaMaskProvider();
    if (!provider) {
      toast.error("Please disable Phantom or install MetaMask!");
      return;
    }

    (async () => {
      const forgeContract = new ethers.Contract(FORGE_ADDRESS, TokenForgeABI, provider);

      const refreshAll = () => {
        fetchBalances();
        fetchTotalSupplies();
      };

      forgeContract.on("TokenForged", refreshAll);
      forgeContract.on("TokenTraded", refreshAll);
      forgeContract.on("TokenBurned", refreshAll);

      return () => {
        forgeContract.off("TokenForged", refreshAll);
        forgeContract.off("TokenTraded", refreshAll);
        forgeContract.off("TokenBurned", refreshAll);
      };
    })();
  }, [isConnected, FORGE_ADDRESS, fetchBalances, fetchTotalSupplies]);

  // Free mint (tokens 0-2)
  const handleFreeMint = async (tokenId: number) => {
    if (!ERC1155_ADDRESS) return;
    setLoading(true);

    const provider = getMetaMaskProvider();
    if (!provider) {
      toast.error("Please disable Phantom or install MetaMask!");
      setLoading(false);
      return;
    }

    try {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const erc1155 = new ethers.Contract(ERC1155_ADDRESS, ForgeableERC1155ABI, signer);

      const tx = await erc1155.freeMint(tokenId);
      await tx.wait();
      toast.success(`Successfully minted token ${tokenId}`);
      fetchBalances();
      fetchTotalSupplies();
    } catch (error) {
      console.error(error);
      toast.error("Error minting token. Check console for details.");
    }
    setLoading(false);
  };

  // Forge tokens (3-6)
  const handleForge = async (forgeType: string) => {
    if (!FORGE_ADDRESS) return;
    setLoading(true);

    const provider = getMetaMaskProvider();
    if (!provider) {
      toast.error("Please disable Phantom or install MetaMask!");
      setLoading(false);
      return;
    }

    try {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const forgeContract = new ethers.Contract(FORGE_ADDRESS, TokenForgeABI, signer);

      let tx;
      if (forgeType === "forge3") tx = await forgeContract.forgeToken3();
      else if (forgeType === "forge4") tx = await forgeContract.forgeToken4();
      else if (forgeType === "forge5") tx = await forgeContract.forgeToken5();
      else if (forgeType === "forge6") tx = await forgeContract.forgeToken6();

      await tx?.wait();
      toast.success(`Successfully forged token using ${forgeType}`);
    } catch (error) {
      console.error(error);
      toast.error("Error forging token. Check console for details.");
    }
    setLoading(false);
  };

  // Trade tokens => base tokens [0-2]
  const handleTrade = async (tokenToTrade: number, baseTokenId: number) => {
    if (!FORGE_ADDRESS) return;
    setLoading(true);

    const provider = getMetaMaskProvider();
    if (!provider) {
      toast.error("Please disable Phantom or install MetaMask!");
      setLoading(false);
      return;
    }

    try {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const forgeContract = new ethers.Contract(FORGE_ADDRESS, TokenForgeABI, signer);

      const tx = await forgeContract.tradeForBase(tokenToTrade, baseTokenId);
      await tx.wait();
      toast.success(`Traded token ${tokenToTrade} for base token ${baseTokenId}`);
    } catch (error) {
      console.error(error);
      toast.error("Error trading token. Check console for details.");
    }
    setLoading(false);
  };

  // Burn tokens [3-6] with user-specified amount
  const handleBurn = async (tokenId: number) => {
    if (!FORGE_ADDRESS) return;
    setLoading(true);

    const provider = getMetaMaskProvider();
    if (!provider) {
      toast.error("Please disable Phantom or install MetaMask!");
      setLoading(false);
      return;
    }

    try {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const forgeContract = new ethers.Contract(FORGE_ADDRESS, TokenForgeABI, signer);

      const amount = burnAmounts[tokenId] || 1;
      const tx = await forgeContract.burnToken(tokenId, amount);
      await tx.wait();
      toast.success(`Burned ${amount} of token ${tokenId} for nothing!`);
    } catch (error) {
      console.error(error);
      toast.error("Error burning token. Check console for details.");
    }
    setLoading(false);
  };

  // Attempt auto-switch to Sepolia if not already connected
  useEffect(() => {
    const switchToSepolia = async () => {
      const provider = getMetaMaskProvider();
      if (!provider) {
        return; // If no MetaMask, skip
      }

      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }], // Hex for 11155111
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0xaa36a7",
                    chainName: "Sepolia Test Network",
                    nativeCurrency: {
                      name: "Sepolia ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: [`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`],
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
            } catch (addError) {
              toast.error("Please add the Sepolia network to MetaMask.");
            }
          } else {
            toast.error("Please switch your wallet network to Sepolia for this dApp.");
          }
        }
      }
    };

    if (typeof window !== "undefined" && window.ethereum) {
      switchToSepolia();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0F172A] text-gray-100 font-sans">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="py-6 bg-[#1E293B]/80 backdrop-blur-lg fixed w-full z-50 border-b border-gray-700/30">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FlameIcon className="text-orange-500 w-8 h-8 animate-pulse" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              Token Forge
            </h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-28 pb-20">
        {/* Faucet Section */}
        <FaucetSection />

        {isConnected ? (
          <>
            {/* Loading Overlay */}
            {loading && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-[#1E293B] p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                  <p className="text-lg">Processing transaction...</p>
                </div>
              </div>
            )}

            {/* Wallet Info */}
            <section className="mb-12 bg-[#1E293B] p-6 rounded-2xl shadow-xl border border-gray-700/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                    <GemIcon className="text-blue-400 w-6 h-6" />
                    Wallet Information
                  </h2>
                  <p className="text-gray-400">
                    <span className="font-medium text-gray-300">Address:</span>{" "}
                    <span className="font-mono">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </p>
                </div>
                <div className="bg-[#2D3B54] px-6 py-3 rounded-xl">
                  <p className="text-gray-400">
                    <span className="font-medium text-gray-300">Balance:</span>{" "}
                    <span className="text-xl font-semibold text-blue-400">
                      {balanceData ? `${Number(balanceData.formatted).toFixed(4)} ${balanceData.symbol}` : "Loading..."}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* Token Balances & Supply */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <GemIcon className="text-purple-400 w-6 h-6" />
                Token Balances & Supply
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tokenIds.map(id => (
                  <div
                    key={id}
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-purple-500/50 transition-colors"
                  >
                    <h3 className="text-xl font-bold text-purple-400">Token {id}</h3>
                    <p className="text-md mt-2 text-gray-300">
                      <span className="font-medium">Your Balance:</span> {tokenBalances[id] || 0}
                    </p>
                    <p className="text-md mt-1 text-gray-300">
                      <span className="font-medium">Total Supply:</span> {tokenSupplies[id] || 0}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Mint Section (Tokens 0-2) */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <GemIcon className="text-green-400 w-6 h-6" />
                Mint Base Tokens
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map(id => (
                  <div
                    key={id}
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-green-500/50 transition-all"
                  >
                    <div className="flex flex-col items-center text-center">
                      <h3 className="text-xl font-bold mb-4">Token {id}</h3>
                      <button
                        onClick={() => handleFreeMint(id)}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                        <GemIcon className="w-5 h-5" /> Free Mint
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Forge Section (Tokens 3-6) */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <FlameIcon className="text-orange-400 w-6 h-6" />
                Forge New Tokens
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 3, type: "forge3", requires: "Token 0 & Token 1" },
                  { id: 4, type: "forge4", requires: "Token 1 & Token 2" },
                  { id: 5, type: "forge5", requires: "Token 0 & Token 2" },
                  { id: 6, type: "forge6", requires: "Token 0, Token 1 & Token 2", limited: true },
                ].map(forge => (
                  <div
                    key={forge.id}
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-orange-500/50 transition-all"
                  >
                    <div className="flex flex-col items-center text-center">
                      <h3 className="text-xl font-bold mb-2">Forge Token {forge.id}</h3>
                      <button
                        onClick={() => handleForge(`forge${forge.id}`)}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mb-3"
                      >
                        <FlameIcon className="w-5 h-5" />
                        Forge Now
                      </button>
                      {forge.limited && (
                        <p className="text-orange-400 text-sm font-semibold">Limited: Only 100 available!</p>
                      )}
                      <p className="text-gray-400 mt-2">Burns: {forge.requires}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Trade Section (Any token => base [0,1,2]) */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <RefreshIcon className="text-yellow-400 w-6 h-6" />
                Trade Tokens
              </h2>
              <p className="text-gray-400 mb-4">Exchange any token for tokens 0 to 2.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[3, 4, 5, 6].map(tradeFrom => (
                  <div
                    key={tradeFrom}
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-yellow-500/50 transition-all"
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <h3 className="text-xl font-bold">Token {tradeFrom}</h3>
                      <div className="flex flex-col gap-2">
                        {[0, 1, 2].map(baseId => (
                          <button
                            key={`${tradeFrom}-${baseId}`}
                            onClick={() => handleTrade(tradeFrom, baseId)}
                            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                          >
                            <RefreshIcon className="w-5 h-5" />
                            Trade Token {tradeFrom} for Token {baseId}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Burn Section (Tokens 3-6) with user-specified amount */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <FlameIcon className="text-red-400 w-6 h-6" />
                Burn Tokens 3–6
              </h2>
              <p className="text-gray-400 mb-4">
                Burn your forged tokens 3 to 6 for nothing. Enter the amount you want to burn.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[3, 4, 5, 6].map(burnId => (
                  <div
                    key={burnId}
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-red-500/50 transition-all"
                  >
                    <div className="flex flex-col items-center text-center">
                      <h3 className="text-xl font-bold mb-2">Burn Token {burnId}</h3>
                      <label htmlFor={`burn-input-${burnId}`} className="text-sm font-medium text-gray-100 mb-1">
                        Amount to Burn
                      </label>
                      <input
                        id={`burn-input-${burnId}`}
                        type="number"
                        min="1"
                        value={burnAmounts[burnId] || ""}
                        onChange={e => setBurnAmounts({ ...burnAmounts, [burnId]: Number(e.target.value) })}
                        placeholder="Enter amount"
                        className="w-32 px-3 py-2 border border-gray-600 rounded bg-[#2D3B54] text-gray-200 
                                   focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent
                                   placeholder-gray-400 placeholder:text-sm text-sm text-center mb-4"
                      />
                      <button
                        onClick={() => handleBurn(burnId)}
                        className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 
                                   rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                        <FlameIcon className="w-5 h-5" />
                        Burn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* OpenSea Link */}
            <section className="text-center">
              <h2 className="text-2xl font-semibold mb-6 flex items-center justify-center gap-2">
                <ShoppingCartIcon className="text-blue-400 w-6 h-6" />
                Explore Your Collection
              </h2>
              <a
                href="https://testnets.opensea.io/account"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                View on OpenSea
              </a>
            </section>
          </>
        ) : (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <GemIcon className="w-16 h-16 text-purple-400 mb-6 animate-bounce" />
            <h2 className="text-3xl font-bold mb-4">Welcome to Token Forge</h2>
            <p className="text-gray-400 text-lg mb-8">Connect your wallet to start minting and forging tokens</p>
            <div className="animate-bounce">
              <ConnectButton />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 bg-[#1E293B]/80 backdrop-blur-lg border-t border-gray-700/30">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© {new Date().getFullYear()} Token Forge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
