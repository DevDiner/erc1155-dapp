"use client";

// 1) Import MouseEvent from "react" so we can type the parallax function’s event
import React, { MouseEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
// ABIs
import ForgeableERC1155ABI from "../public/abis/ForgeableERC1155ABI.json";
import TokenForgeABI from "../public/abis/TokenForgeABI.json";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { Toaster, toast } from "react-hot-toast";
import { useAccount, useChainId } from "wagmi";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  FireIcon as FlameIcon,
  SparklesIcon as GemIcon,
  InformationCircleIcon,
  ArrowPathIcon as RefreshIcon,
  ShoppingCartIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
// Components
import { FaucetSection } from "~~/components/scaffold-eth/FaucetSection";
// Hooks
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";
// Addresses
import { networkAddresses } from "~~/networkAddresses";

/** Helper function that only returns a provider if it's MetaMask. */
function getMetaMaskProvider(): ethers.BrowserProvider | null {
  if (typeof window !== "undefined" && window.ethereum?.isMetaMask) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

/**
 * Token metadata type & object
 * Here we declare the shape & fix any index signature type issues.
 */
interface TokenMetadata {
  [key: number]: {
    name: string;
    description: string;
    image: string;
  };
}

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

const TOKEN_METADATA: TokenMetadata = {
  0: {
    name: "Base Token 0",
    description: "The first base token for forging.",
    // 2) image now references IPFS paths but we remove "ipfs://" since we’re prefixing with IPFS_GATEWAY
    image: "QmTib1yQ4uGthB4EXiAoczbH3vGsib7qubwajUnykUVqMV/token00.png",
  },
  1: {
    name: "Base Token 1",
    description: "The second base token for forging.",
    image: "QmTib1yQ4uGthB4EXiAoczbH3vGsib7qubwajUnykUVqMV/token01.png",
  },
  2: {
    name: "Base Token 2",
    description: "The third base token for forging.",
    image: "QmTib1yQ4uGthB4EXiAoczbH3vGsib7qubwajUnykUVqMV/token02.png",
  },
  3: {
    name: "Forged Token 3",
    description: "Forged from Tokens 0 and 1.",
    image: "QmTib1yQ4uGthB4EXiAoczbH3vGsib7qubwajUnykUVqMV/token03.png",
  },
  4: {
    name: "Forged Token 4",
    description: "Forged from Tokens 1 and 2.",
    image: "QmTib1yQ4uGthB4EXiAoczbH3vGsib7qubwajUnykUVqMV/token04.png",
  },
  5: {
    name: "Forged Token 5",
    description: "Forged from Tokens 0 and 2.",
    image: "QmTib1yQ4uGthB4EXiAoczbH3vGsib7qubwajUnykUVqMV/token05.png",
  },
  6: {
    name: "Mythical Token 6",
    description: "A mythical token forged from all three base tokens.",
    image: "QmTib1yQ4uGthB4EXiAoczbH3vGsib7qubwajUnykUVqMV/token06.png",
  },
};

// 3) Replace raw toast.error(...) / toast.success(...) with custom toasts that match your style
const notifySuccess = (message: string) => {
  toast.custom(
    t => (
      <div
        className={`${t.visible ? "animate-enter" : "animate-leave"} max-w-md w-full bg-gradient-to-r from-blue-900 to-indigo-900 shadow-lg rounded-lg pointer-events-auto flex`}
      >
        <div className="flex-1 w-0 p-4 flex items-center">
          <CheckCircleIcon className="w-6 h-6 text-green-400 mr-3" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{message}</p>
          </div>
        </div>
        <div className="flex border-l border-gray-700">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    ),
    { duration: 3000 },
  );
};

const notifyError = (message: string, details?: string) => {
  toast.custom(
    t => (
      <div
        className={`${t.visible ? "animate-enter" : "animate-leave"} max-w-md w-full bg-gradient-to-r from-red-900 to-pink-900 shadow-lg rounded-lg pointer-events-auto flex`}
      >
        <div className="flex-1 w-0 p-4 flex items-start">
          <ExclamationCircleIcon className="w-6 h-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{message}</p>
            {details && (
              <details className="mt-1">
                <summary className="text-xs text-gray-300 cursor-pointer hover:text-white">View details</summary>
                <p className="mt-1 text-xs text-gray-300 break-words max-h-20 overflow-y-auto">{details}</p>
              </details>
            )}
          </div>
        </div>
        <div className="flex border-l border-gray-700">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    ),
    { duration: 5000 },
  );
};

// 4) Type for our TokenImage's props (tokenId)
interface TokenImageProps {
  tokenId: number;
}

const TokenImage: React.FC<TokenImageProps> = ({ tokenId }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // 5) Type our parallax coordinates
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Build a valid IPFS URL by combining the gateway + token’s image path
  // If your metadata includes "ipfs://someHash", remove the "ipfs://" prefix here
  const rawImagePath = TOKEN_METADATA[tokenId].image.replace(/^ipfs:\/\//, "");
  const imageUrl = `${IPFS_GATEWAY}${rawImagePath}`;

  // 6) Type the event parameter as React.MouseEvent<HTMLDivElement> for parallax
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  return (
    <>
      {/* Thumbnail card image */}
      <div
        className="relative w-32 aspect-square bg-gray-800/50 rounded-lg overflow-hidden mb-4 cursor-pointer hover:shadow-lg transition-all duration-300"
        onClick={() => setIsOpen(true)}
      >
        <Image
          src={imageUrl}
          alt={`Token ${tokenId}`}
          // fill
          width={128}
          height={128}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={
            tokenId === 6
              ? "object-cover blur-md hover:blur-none transition-all duration-300"
              : "object-cover hover:scale-105 transition-transform duration-300"
          }
          onError={e => {
            const target = e.currentTarget as HTMLImageElement;
            target.src = "https://via.placeholder.com/400?text=Token+Image+Error";
          }}
        />
      </div>

      {/* Fullscreen modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[80vh] p-2"
            onClick={e => e.stopPropagation()}
            onMouseMove={handleMouseMove}
          >
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 z-10 bg-black/50 rounded-full p-2 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>

            <div className="w-full h-full overflow-hidden rounded-xl">
              <div
                className="relative w-full h-full aspect-square bg-gray-800/30 rounded-xl overflow-hidden transform transition-transform duration-200 ease-out"
                style={{
                  transform: `perspective(1000px)
                              rotateX(${mousePosition.y * 10}deg)
                              rotateY(${-mousePosition.x * 10}deg)
                              scale3d(1.05, 1.05, 1.05)`,
                }}
              >
                <Image
                  src={imageUrl}
                  alt={`Token ${tokenId}`}
                  fill
                  sizes="80vw"
                  className="object-contain"
                  quality={90}
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-4 rounded-b-xl">
                <h3 className="text-xl font-bold text-white">{TOKEN_METADATA[tokenId].name}</h3>
                <p className="text-gray-300 text-sm">{TOKEN_METADATA[tokenId].description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function App(): JSX.Element {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balanceData } = useWatchBalance({ address });

  // 8) Add explicit types for your useState objects
  const [tokenBalances, setTokenBalances] = useState<Record<number, string>>({});
  const [tokenSupplies, setTokenSupplies] = useState<Record<number, string>>({});
  const [burnAmounts, setBurnAmounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [transactionType, setTransactionType] = useState<string>("");

  const tokenIds = [0, 1, 2, 3, 4, 5, 6];

  // If chainId is missing, default to 31337
  const addresses = networkAddresses[Number(chainId)] || networkAddresses[31337];
  const ERC1155_ADDRESS = addresses.erc1155;
  const FORGE_ADDRESS = addresses.forge;

  // Fetch user balances
  const fetchBalances = useCallback(async (): Promise<void> => {
    if (!isConnected || !address || !ERC1155_ADDRESS) return;
    console.log("Using ERC1155_ADDRESS:", ERC1155_ADDRESS);

    const provider = getMetaMaskProvider();
    if (!provider) {
      notifyError("Wallet Error", "Please disable Phantom or install MetaMask!");
      return;
    }

    try {
      const erc1155 = new ethers.Contract(ERC1155_ADDRESS, ForgeableERC1155ABI, provider);
      const balances: Record<number, string> = {};
      for (const id of tokenIds) {
        const bal = await erc1155.balanceOf(address, id);
        balances[id] = bal.toString();
      }
      setTokenBalances(balances);
    } catch (error) {
      console.error("Error fetching balances:", error);
      notifyError("Error fetching token balances", error instanceof Error ? error.message : String(error));
    }
  }, [isConnected, address, ERC1155_ADDRESS]);

  // Fetch total supply
  const fetchTotalSupplies = useCallback(async (): Promise<void> => {
    if (!ERC1155_ADDRESS) return;

    const provider = getMetaMaskProvider();
    if (!provider) {
      notifyError("Wallet Error", "Please disable Phantom or install MetaMask!");
      return;
    }

    try {
      const erc1155 = new ethers.Contract(ERC1155_ADDRESS, ForgeableERC1155ABI, provider);
      const supplies: Record<number, string> = {};
      for (const id of tokenIds) {
        const supply = await erc1155.totalSupply(id);
        supplies[id] = supply.toString();
      }
      setTokenSupplies(supplies);
    } catch (error) {
      console.error("Error fetching total supplies:", error);
      notifyError("Error fetching token supplies", error instanceof Error ? error.message : String(error));
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
      notifyError("Wallet Error", "Please disable Phantom or install MetaMask!");
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
  const handleFreeMint = async (tokenId: number): Promise<void> => {
    if (!ERC1155_ADDRESS) return;

    setTransactionType(`minting token ${tokenId}`);
    setLoading(true);

    const provider = getMetaMaskProvider();
    if (!provider) {
      notifyError("Wallet Error", "Please disable Phantom or install MetaMask!");
      setLoading(false);
      return;
    }

    try {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const erc1155 = new ethers.Contract(ERC1155_ADDRESS, ForgeableERC1155ABI, signer);

      const tx = await erc1155.freeMint(tokenId);
      await tx.wait();
      notifySuccess(`Successfully minted token ${tokenId}`);
      await fetchBalances();
      await fetchTotalSupplies();
    } catch (error) {
      console.error(error);
      notifyError("Failed to mint token", error instanceof Error ? error.message : String(error));
    }
    setLoading(false);
  };

  // Forge tokens (3-6)
  const handleForge = async (forgeType: string): Promise<void> => {
    if (!FORGE_ADDRESS) return;

    setTransactionType(`forging: ${forgeType}`);
    setLoading(true);

    const provider = getMetaMaskProvider();
    if (!provider) {
      notifyError("Wallet Error", "Please disable Phantom or install MetaMask!");
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
      notifySuccess(`Successfully forged token using ${forgeType}`);
    } catch (error) {
      console.error(error);
      notifyError("Failed to forge token", error instanceof Error ? error.message : String(error));
    }
    // 9) Make sure we setLoading(false) after the try/catch is done
    setLoading(false);
  };

  // Trade tokens => base [0,1,2]
  const handleTrade = async (tokenToTrade: number, baseTokenId: number): Promise<void> => {
    if (!FORGE_ADDRESS) return;

    setTransactionType(`trading token ${tokenToTrade} for base token ${baseTokenId}`);
    setLoading(true);

    const provider = getMetaMaskProvider();
    if (!provider) {
      notifyError("Wallet Error", "Please disable Phantom or install MetaMask!");
      setLoading(false);
      return;
    }

    try {
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const forgeContract = new ethers.Contract(FORGE_ADDRESS, TokenForgeABI, signer);

      const tx = await forgeContract.tradeForBase(tokenToTrade, baseTokenId);
      await tx.wait();
      notifySuccess(`Traded token ${tokenToTrade} for base token ${baseTokenId}`);
    } catch (error) {
      console.error(error);
      notifyError("Failed to trade token", error instanceof Error ? error.message : String(error));
    }
    setLoading(false);
  };

  // Burn tokens [3-6]
  const handleBurn = async (tokenId: number): Promise<void> => {
    if (!FORGE_ADDRESS) return;

    setTransactionType(`burning token ${tokenId}`);
    setLoading(true);

    const provider = getMetaMaskProvider();
    if (!provider) {
      notifyError("Wallet Error", "Please disable Phantom or install MetaMask!");
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
      notifySuccess(`Burned ${amount} of token ${tokenId} for nothing!`);
    } catch (error) {
      console.error(error);
      notifyError("Failed to burn token", error instanceof Error ? error.message : String(error));
    }
    setLoading(false);
  };

  // Attempt auto-switch to Sepolia
  useEffect(() => {
    const switchToSepolia = async () => {
      const provider = getMetaMaskProvider();
      if (!provider) return;

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
              notifyError("Network Error", "Please add the Sepolia network to MetaMask.");
            }
          } else {
            notifyError("Network Error", "Please switch your wallet network to Sepolia for this dApp.");
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
      {/* Subtle layered background */}
      <div className="fixed inset-0 z-[-1]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] to-[#18203A] opacity-80"></div>
        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] bg-center opacity-[0.03]"></div>
      </div>

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
        <FaucetSection />

        {isConnected ? (
          <>
            {/* Loading Overlay */}
            {loading && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-[#1E293B] p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                  {/* Display transactionType for clarity */}
                  <p className="text-lg">Processing {transactionType}...</p>
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

            {/* Explanation of dApp logic */}
            <section className="mb-12 bg-[#1E293B] p-6 rounded-2xl shadow-xl border border-gray-700/30">
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                <InformationCircleIcon className="text-blue-400 w-6 h-6" />
                Understanding Token Forge
              </h2>
              <p className="text-gray-400 leading-relaxed">
                Our dApp revolves around seven tokens (ID 0–6). You can freely mint base tokens 0, 1, and 2. Then, by
                burning combinations of those base tokens, you can forge more advanced tokens 3, 4, and 5. Finally,{" "}
                <strong>token 6</strong> requires <em>all three</em> base tokens to forge, making it
                <span className="text-orange-400 font-bold"> extremely rare and valuable</span> compared to the others.
                You can also trade your advanced tokens for base tokens, or burn them entirely—however you see fit.
                Check your collection on OpenSea anytime to see the NFTs you’ve minted, forged, or traded!
              </p>
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
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-purple-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    {/* Show the interactive NFT image */}
                    <TokenImage tokenId={id} />

                    <h3 className="text-xl font-bold text-purple-400">{TOKEN_METADATA[id].name}</h3>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{TOKEN_METADATA[id].description}</p>
                    <p className="text-md mt-2 text-gray-300">
                      <span className="font-medium">Your Balance:</span> {tokenBalances[id] || "0"}
                    </p>
                    <p className="text-md mt-1 text-gray-300">
                      <span className="font-medium">Total Supply:</span> {tokenSupplies[id] || "0"}
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
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-green-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-green-500/10"
                  >
                    <div className="flex flex-col items-center text-center">
                      <TokenImage tokenId={id} />

                      <h3 className="text-xl font-bold mb-4">{TOKEN_METADATA[id].name}</h3>
                      <button
                        onClick={() => handleFreeMint(id)}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/20 flex items-center gap-2"
                      >
                        <GemIcon className="w-5 h-5" />
                        Free Mint
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
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-orange-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/10"
                  >
                    <div className="flex flex-col items-center text-center">
                      {/* Show what the forged token’s image looks like */}
                      <TokenImage tokenId={forge.id} />

                      <h3 className="text-xl font-bold mb-2">Forge Token {forge.id}</h3>
                      <button
                        onClick={() => handleForge(`forge${forge.id}`)}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/20 flex items-center gap-2 mb-3"
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
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-yellow-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-yellow-500/10"
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <h3 className="text-xl font-bold">Token {tradeFrom}</h3>
                      <div className="flex flex-col gap-2">
                        {[0, 1, 2].map(baseId => (
                          <button
                            key={`${tradeFrom}-${baseId}`}
                            onClick={() => handleTrade(tradeFrom, baseId)}
                            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl font-semibold hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-yellow-500/20 flex items-center gap-2"
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
                    className="bg-[#1E293B] p-6 rounded-xl border border-gray-700/30 hover:border-red-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/10"
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
                                   rounded-xl font-semibold hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/20 flex items-center gap-2"
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
