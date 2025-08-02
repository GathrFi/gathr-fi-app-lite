import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Box, Button, Dialog, Flex, Text, Badge, Separator } from "@radix-ui/themes";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../networkConfig";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Expense {
  objectId: string;
  payer: string;
  amount: string;
  amount_settled: string;
  description: string;
  fully_settled: boolean;
}

interface ExpenseDetailDialogProps {
  expense: Expense;
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseDetailDialog({
  expense,
  isOpen,
  onClose,
}: ExpenseDetailDialogProps) {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const gathrfiContract = useNetworkVariable("gathrfi");
  const mockUsdcType = useNetworkVariable("mockUsdc");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isSettling, setIsSettling] = useState(false);
  const [expenseDetails, setExpenseDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch detailed expense data including members
  useEffect(() => {
    const fetchExpenseDetails = async () => {
      if (!expense.objectId || !isOpen) return;

      setIsLoading(true);
      try {
        const expenseObject = await suiClient.getObject({
          id: expense.objectId,
          options: { showContent: true },
        });

        if (expenseObject.data?.content && expenseObject.data.content.dataType === "moveObject") {
          const fields = expenseObject.data.content.fields as any;
          console.log("Expense details fetched:", fields);
          console.log("Members data:", fields.members);
          setExpenseDetails(fields);
        }
      } catch (error) {
        console.error("Failed to fetch expense details:", error);
        toast.error("Failed to load expense details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenseDetails();
  }, [expense.objectId, isOpen, suiClient]);

  const formatAmount = (amount: string) => {
    return (parseInt(amount) / 1000000).toFixed(2);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSettle = async () => {
    if (!currentAccount || !gathrfiContract || !mockUsdcType) return;

    setIsSettling(true);
    try {
      console.log("Starting settlement process...");
      console.log("Contract:", gathrfiContract);
      console.log("Mock USDC Type:", mockUsdcType);
      console.log("Expense ID:", expense.objectId);

      // First, get user's USDC coins
      const coins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: mockUsdcType,
      });

      console.log("User coins:", coins.data);

      if (coins.data.length === 0) {
        toast.error("No USDC coins found. Please get some USDC first.");
        return;
      }

      // Get the amount owed by this user for this expense
      const expenseObject = await suiClient.getObject({
        id: expense.objectId,
        options: { showContent: true },
      });

      if (!expenseObject.data?.content || expenseObject.data.content.dataType !== "moveObject") {
        throw new Error("Failed to fetch expense details");
      }

      const tx = new Transaction();

      // Merge coins if there are multiple
      let coinToUse = coins.data[0].coinObjectId;
      if (coins.data.length > 1) {
        const coinIds = coins.data.slice(1).map(coin => coin.coinObjectId);
        tx.mergeCoins(coinToUse, coinIds);
      }

      // Call settle_expense function - it returns the remaining coin
      const [remainingCoin] = tx.moveCall({
        target: `${gathrfiContract}::gathrfi::settle_expense`,
        arguments: [
          tx.object(expense.objectId),
          tx.object(coinToUse),
        ],
        // No type arguments needed since the function uses MOCK_USDC directly
      });

      // Transfer the remaining coin back to the user
      tx.transferObjects([remainingCoin], currentAccount.address);

      console.log("Transaction created, executing...");

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("Settlement successful:", result);
            toast.success("Expense settled successfully!");
            onClose();
          },
          onError: (error) => {
            console.error("Settlement failed:", error);
            toast.error(`Failed to settle expense: ${error.message || error}`);
          },
        }
      );
    } catch (error) {
      console.error("Settlement error:", error);
      toast.error("Failed to settle expense. Please try again.");
    } finally {
      setIsSettling(false);
    }
  };

  const progressPercentage = Math.round(
    (parseInt(expense.amount_settled) / parseInt(expense.amount)) * 100
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Expense Details</Dialog.Title>
        
        <Flex direction="column" gap="3" mt="4">
          {/* Basic Expense Information */}
          <Box>
            <Text size="2" color="gray">Description</Text>
            <Text size="3" weight="bold">{expense.description || "No description"}</Text>
          </Box>

          <Box>
            <Text size="2" color="gray">Payer</Text>
            <Text size="3">{formatAddress(expense.payer)}</Text>
          </Box>

          <Separator />

          <Box>
            <Text size="2" color="gray">Total Amount</Text>
            <Text size="3" weight="bold">{formatAmount(expense.amount)} USDC</Text>
          </Box>

          <Box>
            <Text size="2" color="gray">Amount Settled</Text>
            <Text size="3">{formatAmount(expense.amount_settled)} USDC</Text>
          </Box>

          <Box>
            <Text size="2" color="gray">Settlement Progress</Text>
            <Flex align="center" gap="2">
              <Badge color={expense.fully_settled ? "green" : "orange"}>
                {expense.fully_settled ? "Fully Settled" : `${progressPercentage}% settled`}
              </Badge>
            </Flex>
          </Box>

          <Separator />

          {/* Members Section */}
          <Box>
            <Text size="2" color="gray" mb="2">Split Details</Text>
            {isLoading ? (
              <Text size="2">Loading member details...</Text>
            ) : expenseDetails?.members && Array.isArray(expenseDetails.members) ? (
              <Flex direction="column" gap="2">
                {expenseDetails.members.map((member: any, index: number) => {
                  try {
                    console.log(`Member ${index}:`, member);
                    
                    // Handle different possible data structures
                    const memberAddr = member.addr || member.fields?.addr || member.address;
                    const memberAmountOwed = member.amount_owed || member.fields?.amount_owed || "0";
                    const memberHasSettled = member.has_settled || member.fields?.has_settled || false;
                    
                    const isCurrentUser = memberAddr === currentAccount?.address;
                    const isPayer = memberAddr === expense.payer;
                    
                    return (
                      <Box
                        key={index}
                        style={{
                          padding: "8px",
                          borderRadius: "4px",
                          backgroundColor: isCurrentUser ? "var(--accent-3)" : "var(--gray-2)",
                          border: isCurrentUser ? "1px solid var(--accent-6)" : "1px solid var(--gray-4)",
                        }}
                      >
                        <Flex justify="between" align="center">
                          <Flex direction="column" gap="1">
                            <Flex align="center" gap="2">
                              <Text size="2" weight={isCurrentUser ? "bold" : "medium"}>
                                {memberAddr ? formatAddress(memberAddr) : "Unknown Address"}
                              </Text>
                              {isPayer && <Badge color="blue" size="1">Payer</Badge>}
                              {isCurrentUser && <Badge color="purple" size="1">You</Badge>}
                            </Flex>
                            <Text size="1" color="gray">
                              Amount: {formatAmount(memberAmountOwed)} USDC
                            </Text>
                          </Flex>
                          <Badge color={memberHasSettled ? "green" : "orange"} size="1">
                            {memberHasSettled ? "Settled" : "Pending"}
                          </Badge>
                        </Flex>
                      </Box>
                    );
                  } catch (error) {
                    console.error("Error rendering member:", error);
                    return (
                      <Box key={index} style={{ padding: "8px" }}>
                        <Text size="2" color="red">Error loading member details</Text>
                      </Box>
                    );
                  }
                })}
              </Flex>
            ) : (
              <Text size="2" color="gray">No member details available</Text>
            )}
          </Box>

          <Separator />

          {/* Settlement Section for Non-Payers */}
          {!expense.fully_settled && currentAccount?.address !== expense.payer && (
            <Box>
              {expenseDetails && expenseDetails.members ? (
                (() => {
                  try {
                    const userMember = expenseDetails.members.find((member: any) => {
                      const memberAddr = member.addr || member.fields?.addr || member.address;
                      return memberAddr === currentAccount?.address;
                    });
                    
                    if (!userMember) {
                      return <Text size="2" color="gray">You are not part of this expense split</Text>;
                    }
                    
                    const hasSettled = userMember.has_settled || userMember.fields?.has_settled || false;
                    const amountOwedRaw = userMember.amount_owed || userMember.fields?.amount_owed || "0";
                    const amountOwed = parseInt(amountOwedRaw);
                    const canSettle = !hasSettled && amountOwed > 0;
                    
                    if (canSettle) {
                      return (
                        <>
                          <Text size="2" color="gray" mb="2">
                            You owe {formatAmount(amountOwedRaw)} USDC for this expense
                          </Text>
                          <Button
                            onClick={handleSettle}
                            disabled={isSettling}
                            style={{ width: "100%" }}
                          >
                            {isSettling ? "Settling..." : `Settle ${formatAmount(amountOwedRaw)} USDC`}
                          </Button>
                        </>
                      );
                    } else if (hasSettled) {
                      return <Badge color="green">You have already settled your portion</Badge>;
                    } else {
                      return <Text size="2" color="gray">You have no outstanding amount for this expense</Text>;
                    }
                  } catch (error) {
                    console.error("Error rendering settlement section:", error);
                    return <Text size="2" color="red">Error loading settlement information</Text>;
                  }
                })()
              ) : (
                <Text size="2" color="gray" mb="2">
                  Loading settlement options...
                </Text>
              )}
            </Box>
          )}

          {currentAccount?.address === expense.payer && (
            <Box>
              <Badge color="blue">You are the payer of this expense</Badge>
            </Box>
          )}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}