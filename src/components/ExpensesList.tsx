import { useCurrentAccount, useSuiClientQuery, useSuiClient } from "@mysten/dapp-kit";
import { Box, Button, Card, Flex, Heading, Text, Badge } from "@radix-ui/themes";
import { useNetworkVariable } from "../networkConfig";
import { useState, useEffect } from "react";
import { ExpenseDetailDialog } from "./ExpenseDetailDialog";

interface Expense {
  objectId: string;
  payer: string;
  amount: string;
  amount_settled: string;
  description: string;
  fully_settled: boolean;
}

export function ExpensesList() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const gathrfiContract = useNetworkVariable("gathrfi");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch expense events and split events to find all expenses user is involved in
  const { data: expenseEvents } = useSuiClientQuery(
    "queryEvents",
    {
      query: {
        MoveEventType: `${gathrfiContract}::gathrfi::ExpenseAdded`,
      },
      limit: 50,
      order: "descending",
    },
    {
      enabled: !!currentAccount && !!gathrfiContract,
    }
  );

  const { data: splitEvents } = useSuiClientQuery(
    "queryEvents",
    {
      query: {
        MoveEventType: `${gathrfiContract}::gathrfi::ExpenseSplit`,
      },
      limit: 50,
      order: "descending",
    },
    {
      enabled: !!currentAccount && !!gathrfiContract,
    }
  );

  useEffect(() => {
    const fetchExpenseDetails = async () => {
      if (!expenseEvents?.data || !splitEvents?.data || !currentAccount) return;

      setIsLoading(true);
      setError(null);
      
      try {
        // Find all expense IDs where user is involved (as payer or member)
        const userExpenseIds = new Set<string>();

        // Add expenses where user is the payer
        expenseEvents.data.forEach((event: any) => {
          const eventData = event.parsedJson;
          if (eventData?.payer === currentAccount.address) {
            userExpenseIds.add(eventData.expense_id);
          }
        });

        // Add expenses where user is a member
        splitEvents.data.forEach((event: any) => {
          const eventData = event.parsedJson;
          if (eventData?.split_members?.includes(currentAccount.address)) {
            userExpenseIds.add(eventData.expense_id);
          }
        });

        // Fetch details for all relevant expenses
        const expensePromises = Array.from(userExpenseIds).map(async (expenseId) => {
          try {
            const expenseObject = await suiClient.getObject({
              id: expenseId,
              options: { showContent: true },
            });
            
            // Find corresponding event data
            const expenseEvent = expenseEvents.data.find((event: any) => 
              event.parsedJson?.expense_id === expenseId
            );
            
            return {
              event: expenseEvent?.parsedJson,
              object: expenseObject.data,
              expenseId,
            };
          } catch (err) {
            console.warn(`Failed to fetch expense ${expenseId}:`, err);
            return null;
          }
        });

        const expenseResults = await Promise.all(expensePromises);
        const validExpenses = expenseResults.filter(Boolean);
        setExpenses(validExpenses);
      } catch (err) {
        console.error("Error fetching expense details:", err);
        setError("Failed to load expense details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenseDetails();
  }, [expenseEvents, splitEvents, currentAccount, suiClient]);

  const formatAmount = (amount: string) => {
    return (parseInt(amount) / 1000000).toFixed(2);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const convertBytesToString = (bytes: any): string => {
    if (!bytes) return "No description";
    
    try {
      // Handle different possible formats
      if (typeof bytes === "string") return bytes;
      if (Array.isArray(bytes)) {
        // Convert array of numbers to string
        return new TextDecoder().decode(new Uint8Array(bytes));
      }
      if (bytes.data && Array.isArray(bytes.data)) {
        return new TextDecoder().decode(new Uint8Array(bytes.data));
      }
      return "No description";
    } catch (error) {
      console.error("Error converting bytes to string:", error);
      return "Unable to decode description";
    }
  };

  if (isLoading) return <Text>Loading expenses...</Text>;
  if (error) return <Text color="red">Error loading expenses: {error}</Text>;
  if (expenses.length === 0) {
    return (
      <Box>
        <Text size="3" color="gray">
          No expenses found. Add your first expense to get started!
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="4" mb="4">
        Your Expenses ({expenses.length} found)
      </Heading>
      
      <Flex direction="column" gap="3">
        {expenses.map((expense: any) => {
          const objectData = expense.object?.content?.fields;
          const expenseId = expense.expenseId;
          
          if (!objectData) return null;

          const description = convertBytesToString(objectData.description);
          const amount = objectData.amount;
          const amountSettled = objectData.amount_settled;
          const fullySettled = objectData.fully_settled;
          const payer = objectData.payer;
          const members = objectData.members || [];

          const progressPercentage = Math.round(
            (parseInt(amountSettled) / parseInt(amount)) * 100
          );

          // Check user's role and amount owed
          const isUserPayer = payer === currentAccount?.address;
          const userMember = members.find((member: any) => 
            member.addr === currentAccount?.address
          );
          const userAmountOwed = userMember ? userMember.amount_owed : "0";
          const userHasSettled = userMember ? userMember.has_settled : isUserPayer;

          return (
            <Card key={expenseId} style={{ padding: "16px" }}>
              <Flex justify="between" align="center">
                <Box>
                  <Flex align="center" gap="2" mb="2">
                    <Text size="3" weight="bold">
                      {description}
                    </Text>
                    <Badge color={fullySettled ? "green" : "orange"}>
                      {fullySettled ? "Settled" : `${progressPercentage}% settled`}
                    </Badge>
                    {isUserPayer && (
                      <Badge color="blue">You're the payer</Badge>
                    )}
                    {!isUserPayer && userHasSettled && (
                      <Badge color="green">You've settled</Badge>
                    )}
                    {!isUserPayer && !userHasSettled && parseInt(userAmountOwed) > 0 && (
                      <Badge color="red">You owe {formatAmount(userAmountOwed)} USDC</Badge>
                    )}
                  </Flex>
                  
                  <Text size="2" color="gray">
                    Payer: {formatAddress(payer)}
                  </Text>
                  
                  <Text size="2" color="gray">
                    Total Amount: {formatAmount(amount)} USDC
                  </Text>
                  
                  <Text size="2" color="gray">
                    Total Settled: {formatAmount(amountSettled)} USDC
                  </Text>

                  {!isUserPayer && (
                    <Text size="2" color="gray">
                      Your Amount: {formatAmount(userAmountOwed)} USDC
                    </Text>
                  )}
                </Box>
                
                <Button
                  variant="soft"
                  onClick={() =>
                    setSelectedExpense({
                      objectId: expenseId,
                      payer: payer,
                      amount: amount,
                      amount_settled: amountSettled,
                      description: description,
                      fully_settled: fullySettled,
                    })
                  }
                >
                  View Details
                </Button>
              </Flex>
            </Card>
          );
        })}
      </Flex>

      {selectedExpense && (
        <ExpenseDetailDialog
          expense={selectedExpense}
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
        />
      )}
    </Box>
  );
}