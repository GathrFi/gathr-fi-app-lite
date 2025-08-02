import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Tabs } from "@radix-ui/themes";
import { WalletStatus } from "./WalletStatus";
import { ExpensesList } from "./components/ExpensesList";
import { AddExpense } from "./components/AddExpense";
import { ContractTest } from "./components/ContractTest";
import { UsdcBalance } from "./components/UsdcBalance";

function App() {
  const currentAccount = useCurrentAccount();

  return (
    <>
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
        align="center"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
        }}
      >
        <Flex align="center" gap="3">
          <img 
            src="https://raw.githubusercontent.com/GathrFi/gathr-fi-app/b50b8aded01ce15da16371b645585a52f3e2770b/assets/images/img-brand.svg"
            alt="GathrFi Logo"
            style={{ width: "32px", height: "32px" }}
          />
          <Heading>GathrFi</Heading>
        </Flex>

        <Flex align="center" gap="4">
          {currentAccount && (
            <UsdcBalance showRefreshButton={true} size="3" />
          )}
          <ConnectButton />
        </Flex>
      </Flex>
      <Container>
        <Container
          mt="5"
          pt="2"
          px="4"
          style={{ background: "var(--gray-a2)", minHeight: 500 }}
        >
          {currentAccount ? (
            <Tabs.Root defaultValue="expenses">
              <Tabs.List>
                <Tabs.Trigger value="expenses">My Expenses</Tabs.Trigger>
                <Tabs.Trigger value="add-expense">Add Expense</Tabs.Trigger>
                <Tabs.Trigger value="test">Contract Test</Tabs.Trigger>
              </Tabs.List>
              
              <Box pt="3">
                <Tabs.Content value="expenses">
                  <ExpensesList />
                </Tabs.Content>
                
                <Tabs.Content value="add-expense">
                  <AddExpense />
                </Tabs.Content>
                
                <Tabs.Content value="test">
                  <ContractTest />
                </Tabs.Content>
              </Box>
            </Tabs.Root>
          ) : (
            <WalletStatus />
          )}
        </Container>
      </Container>
    </>
  );
}

export default App;
