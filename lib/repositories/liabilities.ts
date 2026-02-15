import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LiabilitySummary,
  LiabilityPaymentDisplay,
  CreateLiabilityInput,
  CreateLiabilityPaymentInput,
} from "@/types/database";

export class LiabilityRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAllSummaries(userId: string): Promise<LiabilitySummary[]> {
    const { data, error } = await this.supabase.rpc(
      "get_all_liability_summaries",
      { p_user_id: userId }
    );

    if (error) throw error;
    return data;
  }

  async getPayments(
    userId: string,
    liabilityId: string
  ): Promise<LiabilityPaymentDisplay[]> {
    const { data, error } = await this.supabase
      .from("liability_payments")
      .select(
        `
        id,
        transaction_id,
        principal_amount,
        interest_amount,
        payment_date,
        notes,
        transaction:transactions!inner(
          amount,
          description,
          account:accounts!inner(name)
        )
      `
      )
      .eq("user_id", userId)
      .eq("liability_id", liabilityId)
      .order("payment_date", { ascending: false });

    if (error) throw error;
    return data as unknown as LiabilityPaymentDisplay[];
  }

  async createWithDeposit(
    input: CreateLiabilityInput
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc(
      "create_liability_with_deposit",
      {
        p_name: input.name,
        p_type: input.type,
        p_original_amount: input.original_amount,
        p_interest_rate: input.interest_rate,
        p_emi_amount: input.emi_amount,
        p_frequency: input.frequency,
        p_start_date: input.start_date,
        p_next_due_date: input.next_due_date,
        p_expected_end_date: input.expected_end_date,
        p_linked_account_id: input.linked_account_id,
        p_deposited_to_account: input.deposited_to_account,
        p_deposit_category_id: input.deposit_category_id ?? null,
        p_notes: input.notes ?? null,
      }
    );

    if (error) throw error;
    return data as string;
  }

  async createPayment(input: CreateLiabilityPaymentInput): Promise<string> {
    const { data, error } = await this.supabase.rpc(
      "create_liability_payment",
      {
        p_liability_id: input.liability_id,
        p_account_id: input.account_id,
        p_category_id: input.category_id,
        p_principal_amount: input.principal_amount,
        p_interest_amount: input.interest_amount,
        p_payment_date: input.payment_date,
        p_description: input.description ?? "",
        p_notes: input.notes ?? null,
      }
    );

    if (error) throw error;
    return data as string;
  }

  async deletePayment(paymentId: string): Promise<void> {
    const { error } = await this.supabase.rpc("delete_liability_payment", {
      p_payment_id: paymentId,
    });

    if (error) throw error;
  }
}
