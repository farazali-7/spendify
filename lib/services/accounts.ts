import type { SupabaseClient } from "@supabase/supabase-js";
import { AccountRepository } from "@/lib/repositories/accounts";
import { createAccountSchema } from "@/lib/validations/accounts";
import { ValidationError } from "@/lib/errors";
import type { Account, AccountWithBalance } from "@/types/database";

export class AccountService {
  private repo: AccountRepository;

  constructor(supabase: SupabaseClient) {
    this.repo = new AccountRepository(supabase);
  }

  async getUserAccounts(userId: string): Promise<Account[]> {
    return this.repo.findAllByUser(userId);
  }

  async getAccountBalances(userId: string): Promise<AccountWithBalance[]> {
    return this.repo.getBalances(userId);
  }

  async createAccount(
    userId: string,
    input: unknown
  ): Promise<Account> {
    const result = createAccountSchema.safeParse(input);
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new ValidationError(firstError.message);
    }

    return this.repo.create(userId, result.data);
  }

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    return this.repo.delete(userId, accountId);
  }
}
