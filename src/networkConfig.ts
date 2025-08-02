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
          "0xad3ce58354518721aa95b3d99ba0fc430fd7ab618f5c38095835dfb5bb1201d4",
        // === Mock USDC for token used in the main contract
        mockUsdc:
          "0xad3ce58354518721aa95b3d99ba0fc430fd7ab618f5c38095835dfb5bb1201d4::mock_usdc::MOCK_USDC",
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
