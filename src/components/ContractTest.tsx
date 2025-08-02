import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../networkConfig";
import { useState } from "react";
import toast from "react-hot-toast";

export function ContractTest() {
  const currentAccount = useCurrentAccount();
  const gathrfiContract = useNetworkVariable("gathrfi");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isCreating, setIsCreating] = useState(false);

  const createTestExpense = async () => {
    if (!currentAccount || !gathrfiContract) return;

    setIsCreating(true);
    try {
      const tx = new Transaction();

      // Create a simple test expense
      const testAmount = 100 * 1000000; // 100 USDC in micro units
      const testDescription = "Test Expense";
      const splitMembers = [currentAccount.address];
      const splitAmounts = [testAmount];

      tx.moveCall({
        target: `${gathrfiContract}::gathrfi::add_expense`,
        arguments: [
          tx.pure.u64(testAmount),
          tx.pure.vector("u8", Array.from(new TextEncoder().encode(testDescription))),
          tx.pure.vector("address", splitMembers),
          tx.pure.vector("u64", splitAmounts),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("Test expense created:", result);
            toast.success("Test expense created successfully!");
          },
          onError: (error) => {
            console.error("Failed to create test expense:", error);
            toast.error("Failed to create test expense: " + error.message);
          },
        }
      );
    } catch (error) {
      console.error("Error creating test expense:", error);
      toast.error("Error creating test expense");
    } finally {
      setIsCreating(false);
    }
  };

  const checkContractInfo = async () => {
    if (!gathrfiContract) return;
    
    console.log("Contract address:", gathrfiContract);
    toast.success(`Contract address: ${gathrfiContract}`);
  };

  return (
    <Card style={{ padding: "20px" }}>
      <Flex direction="column" gap="3">
        <Text size="4" weight="bold">Contract Integration Test</Text>
        
        <Box>
          <Text size="2">Contract: {gathrfiContract || "Not configured"}</Text>
        </Box>
        
        <Flex gap="2">
          <Button onClick={checkContractInfo} variant="soft">
            Check Contract Info
          </Button>
          
          <Button 
            onClick={createTestExpense}
            disabled={!currentAccount || isCreating}
          >
            {isCreating ? "Creating..." : "Create Test Expense"}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}