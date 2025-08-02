import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";
import { useState, useEffect } from "react";

export function useUsdcBalance() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const mockUsdcType = useNetworkVariable("mockUsdc");
  
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!currentAccount || !mockUsdcType) {
        setBalance("0");
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const coins = await suiClient.getCoins({
          owner: currentAccount.address,
          coinType: mockUsdcType,
        });

        // Calculate total balance from all coins
        const totalBalance = coins.data.reduce((sum, coin) => {
          return sum + parseInt(coin.balance);
        }, 0);

        setBalance(totalBalance.toString());
      } catch (err) {
        console.error("Error fetching USDC balance:", err);
        setError("Failed to fetch balance");
        setBalance("0");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
    
    // Set up interval to refresh balance periodically
    const interval = setInterval(fetchBalance, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [currentAccount, mockUsdcType, suiClient]);

  const formatBalance = (balance: string) => {
    return (parseInt(balance) / 1000000).toFixed(2);
  };

  return {
    balance,
    formattedBalance: formatBalance(balance),
    isLoading,
    error,
    refetch: async () => {
      if (currentAccount && mockUsdcType) {
        setIsLoading(true);
        try {
          const coins = await suiClient.getCoins({
            owner: currentAccount.address,
            coinType: mockUsdcType,
          });

          const totalBalance = coins.data.reduce((sum, coin) => {
            return sum + parseInt(coin.balance);
          }, 0);

          setBalance(totalBalance.toString());
        } catch (err) {
          console.error("Error refetching USDC balance:", err);
          setError("Failed to fetch balance");
        } finally {
          setIsLoading(false);
        }
      }
    }
  };
}