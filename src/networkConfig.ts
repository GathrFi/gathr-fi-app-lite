import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        gathrfi: "0x0",
        mockUsdc: "0x0",
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        // === Main Contract
        gathrfi:
          "0xb7e55a7aa4b0148903f85cb4b1d14a68f1865bb74b0e12ce35f3cf0128cd9570",
        // === Mock USDC for token used in the main contract
        mockUsdc:
          "0xb7e55a7aa4b0148903f85cb4b1d14a68f1865bb74b0e12ce35f3cf0128cd9570::mock_usdc::MOCK_USDC",
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        gathrfi: "0x0",
        mockUsdc: "0x0",
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
