import { Box, Flex, Text, Badge, Button } from "@radix-ui/themes";
import { useUsdcBalance } from "../hooks/useUsdcBalance";

interface UsdcBalanceProps {
  showRefreshButton?: boolean;
  size?: "1" | "2" | "3" | "4";
}

export function UsdcBalance({ showRefreshButton = false, size = "2" }: UsdcBalanceProps) {
  const { formattedBalance, isLoading, error, refetch } = useUsdcBalance();

  if (error) {
    return (
      <Box>
        <Text size={size} color="red">
          Error loading balance
        </Text>
      </Box>
    );
  }

  return (
    <Flex align="center" gap="2">
      <Box>
        <Text size="1" color="gray">USDC Balance</Text>
        <Flex align="center" gap="2">
          <Text size={size} weight="bold">
            {isLoading ? "Loading..." : `${formattedBalance} USDC`}
          </Text>
          <Badge color="green" size="1">
            Mock
          </Badge>
        </Flex>
      </Box>
      
      {showRefreshButton && (
        <Button 
          variant="ghost" 
          size="1" 
          onClick={refetch}
          disabled={isLoading}
        >
          🔄
        </Button>
      )}
    </Flex>
  );
}