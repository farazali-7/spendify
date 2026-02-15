import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Account,
  AccountWithBalance,
  CreateAccountInput,
} from "@/types/database";

export class AccountRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAllByUser(userId: string): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");

    if (error) throw error;
    return data;
  }

  async findById(userId: string, accountId: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from("accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(userId: string, input: CreateAccountInput): Promise<Account> {
    const { data, error } = await this.supabase
      .from("accounts")
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        opening_balance: input.opening_balance ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getBalances(userId: string): Promise<AccountWithBalance[]> {
    const { data, error } = await this.supabase.rpc(
      "get_all_account_balances",
      { p_user_id: userId }
    );

    if (error) throw error;
    return data;
  }

  async delete(userId: string, accountId: string): Promise<void> {
    const { error } = await this.supabase
      .from("accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", userId);

    if (error) throw error;
  }
}
