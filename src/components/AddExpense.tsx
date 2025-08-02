import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Box, Button, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../networkConfig";
import { useState } from "react";
import toast from "react-hot-toast";

interface SplitMember {
  address: string;
  amount: string;
}

export function AddExpense() {
  const currentAccount = useCurrentAccount();
  const gathrfiContract = useNetworkVariable("gathrfi");
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [members, setMembers] = useState<SplitMember[]>([
    { address: currentAccount?.address || "", amount: "" }
  ]);
  const [isCreating, setIsCreating] = useState(false);

  const addMember = () => {
    setMembers([...members, { address: "", amount: "" }]);
  };

  const updateMember = (index: number, field: keyof SplitMember, value: string) => {
    const updatedMembers = [...members];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setMembers(updatedMembers);
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleEqualSplit = () => {
    if (!totalAmount || members.length === 0) return;
    
    const totalAmountNum = parseFloat(totalAmount);
    const splitAmount = (totalAmountNum / members.length).toFixed(2);
    
    setMembers(members.map(member => ({ ...member, amount: splitAmount })));
  };

  const calculateTotal = () => {
    return members.reduce((sum, member) => {
      return sum + (parseFloat(member.amount) || 0);
    }, 0);
  };

  const isValidForm = () => {
    const totalAmountNum = parseFloat(totalAmount);
    const calculatedTotal = calculateTotal();
    
    return (
      description.trim() !== "" &&
      totalAmountNum > 0 &&
      Math.abs(totalAmountNum - calculatedTotal) < 0.01 &&
      members.every(member => 
        member.address.trim() !== "" && 
        parseFloat(member.amount) > 0
      )
    );
  };

  const handleSubmit = async () => {
    if (!currentAccount || !gathrfiContract || !isValidForm()) return;

    setIsCreating(true);
    try {
      const tx = new Transaction();

      // Convert amounts to micro units (multiply by 1,000,000)
      const totalAmountMicro = Math.round(parseFloat(totalAmount) * 1000000);
      const splitAmounts = members.map(member => Math.round(parseFloat(member.amount) * 1000000));
      const splitAddresses = members.map(member => member.address);

      tx.moveCall({
        target: `${gathrfiContract}::gathrfi::add_expense`,
        arguments: [
          tx.pure.u64(totalAmountMicro),
          tx.pure.vector("u8", Array.from(new TextEncoder().encode(description))),
          tx.pure.vector("address", splitAddresses),
          tx.pure.vector("u64", splitAmounts),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            toast.success("Expense created successfully!");
            // Reset form
            setDescription("");
            setTotalAmount("");
            setMembers([{ address: currentAccount.address, amount: "" }]);
          },
          onError: (error) => {
            console.error("Failed to create expense:", error);
            toast.error("Failed to create expense. Please try again.");
          },
        }
      );
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Failed to create expense. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const totalAmountNum = parseFloat(totalAmount) || 0;
  const calculatedTotal = calculateTotal();
  const isBalanced = Math.abs(totalAmountNum - calculatedTotal) < 0.01;

  return (
    <Box>
      <Heading size="4" mb="4">
        Add New Expense
      </Heading>
      
      <Card style={{ padding: "20px" }}>
        <Flex direction="column" gap="4">
          <Box>
            <Text size="2" weight="bold" mb="1">Description</Text>
            <TextField.Root
              placeholder="Dinner at restaurant"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>

          <Box>
            <Text size="2" weight="bold" mb="1">Total Amount (USDC)</Text>
            <TextField.Root
              type="number"
              step="0.01"
              placeholder="100.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </Box>

          <Box>
            <Flex justify="between" align="center" mb="2">
              <Text size="2" weight="bold">Split Between</Text>
              <Button variant="soft" size="1" onClick={handleEqualSplit}>
                Equal Split
              </Button>
            </Flex>
            
            <Flex direction="column" gap="2">
              {members.map((member, index) => (
                <Card key={index} style={{ padding: "12px" }}>
                  <Flex gap="2" align="center">
                    <Box style={{ flex: 2 }}>
                      <Text size="1" color="gray">Address</Text>
                      <TextField.Root
                        placeholder="0x..."
                        value={member.address}
                        onChange={(e) => updateMember(index, "address", e.target.value)}
                      />
                    </Box>
                    
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray">Amount</Text>
                      <TextField.Root
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={member.amount}
                        onChange={(e) => updateMember(index, "amount", e.target.value)}
                      />
                    </Box>
                    
                    {members.length > 1 && (
                      <Button
                        variant="soft"
                        color="red"
                        size="1"
                        onClick={() => removeMember(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
            
            <Button variant="soft" size="2" onClick={addMember} mt="2">
              Add Member
            </Button>
          </Box>

          <Box>
            <Flex justify="between" align="center">
              <Text size="2">Total: {totalAmountNum.toFixed(2)} USDC</Text>
              <Text size="2">Split: {calculatedTotal.toFixed(2)} USDC</Text>
            </Flex>
            
            {!isBalanced && totalAmountNum > 0 && (
              <Text size="1" color="red" mt="1">
                Split amounts must equal total amount
              </Text>
            )}
          </Box>

          <Button
            onClick={handleSubmit}
            disabled={!isValidForm() || isCreating}
            size="3"
          >
            {isCreating ? "Creating..." : "Create Expense"}
          </Button>
        </Flex>
      </Card>
    </Box>
  );
}