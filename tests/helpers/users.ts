let currentAccount: "A" | "B" = "A";

export async function signInAs(account: "A" | "B"): Promise<void> {
  currentAccount = account;
}

export function getCurrentAccount(): "A" | "B" {
  return currentAccount;
}
