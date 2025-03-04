"use client";

import React, { useState } from "react";
import { createWalletClient, http, parseEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";

/**
 * Single Hardhat client for local usage
 */
const localWalletClient = createWalletClient({
  chain: hardhat,
  transport: http(),
});

const FAUCET_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const NUM_OF_ETH = "1";

export const FaucetButton = () => {
  /**
   * 1) Always define Hooks at the top
   */
  const { address, chain: connectedChain } = useAccount();
  const { data: balance } = useWatchBalance({ address });

  const [loading, setLoading] = useState(false);
  const faucetTxn = useTransactor(localWalletClient);

  /**
   * 2) Conditionally return null AFTER the hooks
   */
  if (connectedChain?.id !== hardhat.id) {
    return null;
  }

  const sendETH = async () => {
    if (!address) return;
    try {
      setLoading(true);
      await faucetTxn({
        account: FAUCET_ADDRESS,
        to: address,
        value: parseEther(NUM_OF_ETH),
      });
      setLoading(false);
    } catch (error) {
      console.error("Error sending 1 ETH from faucet:", error);
      setLoading(false);
    }
  };

  const isBalanceZero = balance && balance.value === 0n;

  return (
    <div
      className={
        !isBalanceZero
          ? "ml-1"
          : "ml-1 tooltip tooltip-bottom tooltip-secondary tooltip-open font-bold before:left-auto before:transform-none before:content-[attr(data-tip)] before:right-0"
      }
      data-tip="Get 1 ETH from local faucet"
    >
      <button
        onClick={sendETH}
        disabled={loading}
        className="inline-flex px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl font-semibold text-sm text-gray-100 hover:opacity-90 transition-colors flex items-center gap-2"
      >
        {!loading ? (
          <BanknotesIcon className="h-4 w-4" />
        ) : (
          <span className="loading loading-spinner loading-xs"></span>
        )}
        <span>Quick 1 ETH</span>
      </button>
    </div>
  );
};
