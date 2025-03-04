"use client";

import React, { useEffect, useState } from "react";
import { Address as AddressType, createWalletClient, http, parseEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { Address, AddressInput, Balance, EtherInput } from "~~/components/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/**
 * Create a single Hardhat wallet client at the top (not conditionally).
 * This points to http://127.0.0.1:8545 by default.
 */
const localWalletClient = createWalletClient({
  chain: hardhat,
  transport: http(),
});

const FAUCET_ACCOUNT_INDEX = 0;

export const Faucet = () => {
  /**
   * 1) Always call Hooks at the top:
   *    - `useAccount()`, `useState()`, `useEffect()`, etc.
   */
  const { chain: connectedChain } = useAccount();

  const [loading, setLoading] = useState(false);
  const [inputAddress, setInputAddress] = useState<AddressType>();
  const [faucetAddress, setFaucetAddress] = useState<AddressType>();
  const [sendValue, setSendValue] = useState("");

  const faucetTxn = useTransactor(localWalletClient);

  useEffect(() => {
    // Fetch the default Hardhat account on component mount
    const getFaucetAddress = async () => {
      try {
        const accounts = await localWalletClient.getAddresses();
        setFaucetAddress(accounts[FAUCET_ACCOUNT_INDEX]);
      } catch (error) {
        notification.error(
          <>
            <p className="font-bold mt-0 mb-1">Cannot connect to local Hardhat provider</p>
            <p className="m-0">
              - Did you forget to run <code className="italic">yarn chain</code>?
            </p>
            <p className="mt-1 break-normal">
              - Or remove <code className="italic">hardhat</code> from{" "}
              <code className="italic">scaffold.config.ts</code> if not using local
            </p>
          </>,
        );
        console.error("Error in getFaucetAddress:", error);
      }
    };
    getFaucetAddress();
  }, []);

  /**
   * 2) AFTER declaring hooks, we can conditionally return:
   *    If user is not on Hardhat, hide the faucet UI entirely.
   */
  if (connectedChain?.id !== hardhat.id) {
    return null;
  }

  /**
   * 3) The logic to send ETH from Hardhat to an input address.
   */
  const sendETH = async () => {
    if (!faucetAddress || !inputAddress) return;
    try {
      setLoading(true);
      await faucetTxn({
        to: inputAddress,
        value: parseEther(sendValue as `${number}`),
        account: faucetAddress,
      });
      setLoading(false);
      setInputAddress(undefined);
      setSendValue("");
    } catch (error) {
      console.error("Error sending ETH from faucet:", error);
      setLoading(false);
    }
  };

  /**
   * 4) Render the faucet UI if on chain 31337.
   */
  return (
    <div>
      {/* Button to open the Hardhat faucet modal */}
      <label
        htmlFor="faucet-modal"
        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl font-semibold text-sm text-gray-100 hover:opacity-90 transition-colors flex items-center gap-2"
      >
        <BanknotesIcon className="h-4 w-4" />
        <span>Open Hardhat Faucet</span>
      </label>

      {/* The modal itself */}
      <input type="checkbox" id="faucet-modal" className="modal-toggle" />
      <label htmlFor="faucet-modal" className="modal cursor-pointer">
        <label className="modal-box relative bg-[#1E293B] text-gray-100 border border-gray-600 max-w-sm w-full">
          <label
            htmlFor="faucet-modal"
            className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 text-gray-100"
          >
            ✕
          </label>
          <h3 className="text-xl font-bold mb-3">Local Faucet</h3>
          <div className="space-y-3">
            <div className="flex space-x-4 items-center">
              <div>
                <span className="text-sm font-bold">From:</span>
                <Address address={faucetAddress} onlyEnsOrAddress />
              </div>
              <div>
                <span className="text-sm font-bold pl-3">Available:</span>
                <Balance address={faucetAddress} className="ml-2" />
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <AddressInput
                placeholder="Destination Address"
                value={inputAddress ?? ""}
                onChange={value => setInputAddress(value as AddressType)}
              />
              <EtherInput placeholder="Amount to send" value={sendValue} onChange={setSendValue} />
              <button
                onClick={sendETH}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl font-semibold text-sm text-gray-100 hover:opacity-90 transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <BanknotesIcon className="h-5 w-5" />
                )}
                <span>Send</span>
              </button>
            </div>
          </div>
        </label>
      </label>
    </div>
  );
};
