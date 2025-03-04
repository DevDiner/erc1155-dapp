"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useChainId } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { Faucet } from "~~/components/scaffold-eth/Faucet";
import { FaucetButton } from "~~/components/scaffold-eth/FaucetButton";

export const FaucetSection = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // Hide the entire section if user is not connected
  if (!isConnected) {
    return null;
  }

  if (!chainId) {
    // chain data hasn't loaded yet
    return null;
  }

  return (
    <section className="mb-6 bg-[#1E293B] p-6 rounded-xl border border-gray-700/30">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-gray-100">
        <BanknotesIcon className="w-6 h-6 text-green-400" />
        Faucet
      </h2>

      {/* Hardhat local chain (chainId = 31337) */}
      {chainId === 31337 && (
        <div className="space-y-2">
          <p className="text-gray-400">
            You are on <span className="font-bold">Hardhat local network</span>. Use the faucet below to get test ETH.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {/* The modal-based Hardhat faucet */}
            <Faucet />
            {/* Quick 1 ETH button */}
            <FaucetButton />
          </div>
        </div>
      )}

      {/* Sepolia chain (chainId = 11155111) */}
      {chainId === 11155111 && (
        <div className="space-y-2">
          <p className="text-gray-400">
            You are on <span className="font-bold">Sepolia</span>. Get test ETH from the official Google Cloud faucet:
          </p>
          <a
            href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-2
              px-6 py-3
              bg-gradient-to-r from-blue-500 to-blue-600
              rounded-xl font-semibold text-sm text-gray-100
              hover:opacity-90 transition-colors
            "
          >
            <BanknotesIcon className="w-4 h-4" />
            <span>Get Sepolia ETH</span>
          </a>
        </div>
      )}

      {/* Fallback for other networks */}
      {chainId !== 31337 && chainId !== 11155111 && (
        <p className="text-gray-400">
          Faucet is only available for Hardhat local or Sepolia testnet. Please switch networks.
        </p>
      )}
    </section>
  );
};
