import type { SupabaseClient } from "@supabase/supabase-js";
import { LiabilityRepository } from "@/lib/repositories/liabilities";
import { CategoryRepository } from "@/lib/repositories/categories";
import { AccountRepository } from "@/lib/repositories/accounts";
import {
  createLiabilitySchema,
  createLiabilityPaymentSchema,
} from "@/lib/validations/liabilities";
import { ValidationError, NotFoundError } from "@/lib/errors";
import type {
  LiabilitySummary,
  LiabilityPaymentDisplay,
} from "@/types/database";

export class LiabilityService {
  private repo: LiabilityRepository;
  private categoryRepo: CategoryRepository;
  private accountRepo: AccountRepository;

  constructor(supabase: SupabaseClient) {
    this.repo = new LiabilityRepository(supabase);
    this.categoryRepo = new CategoryRepository(supabase);
    this.accountRepo = new AccountRepository(supabase);
  }

  async getAllSummaries(userId: string): Promise<LiabilitySummary[]> {
    return this.repo.findAllSummaries(userId);
  }

  async getPayments(
    userId: string,
    liabilityId: string
  ): Promise<LiabilityPaymentDisplay[]> {
    return this.repo.getPayments(userId, liabilityId);
  }

  async createLiability(userId: string, input: unknown): Promise<string> {
    const result = createLiabilitySchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const data = result.data;

    // Verify linked account ownership
    const account = await this.accountRepo.findById(
      userId,
      data.linked_account_id
    );
    if (!account) {
      throw new NotFoundError("Linked account");
    }

    // If depositing, find the "Loan Deposit" system category
    let depositCategoryId: string | null = null;
    if (data.deposited_to_account) {
      const incomeCategories = await this.categoryRepo.findByUserAndType(
        userId,
        "income"
      );
      const loanDepositCat = incomeCategories.find(
        (c) => c.name === "Loan Deposit" && c.is_system
      );
      if (!loanDepositCat) {
        throw new ValidationError(
          'System category "Loan Deposit" not found. Cannot create deposit transaction.'
        );
      }
      depositCategoryId = loanDepositCat.id;
    }

    return this.repo.createWithDeposit({
      name: data.name,
      type: data.type,
      original_amount: data.original_amount,
      interest_rate: data.interest_rate,
      emi_amount: data.emi_amount,
      frequency: data.frequency,
      start_date: data.start_date,
      next_due_date: data.next_due_date ?? null,
      expected_end_date: data.expected_end_date ?? null,
      linked_account_id: data.linked_account_id,
      deposited_to_account: data.deposited_to_account,
      deposit_category_id: depositCategoryId,
      notes: data.notes ?? null,
    });
  }

  async makePayment(
    userId: string,
    liabilityId: string,
    input: unknown
  ): Promise<string> {
    const result = createLiabilityPaymentSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const data = result.data;

    // Verify account ownership
    const account = await this.accountRepo.findById(userId, data.account_id);
    if (!account) {
      throw new NotFoundError("Account");
    }

    // Find the "Loan Payment" system category
    const expenseCategories = await this.categoryRepo.findByUserAndType(
      userId,
      "expense"
    );
    const loanPaymentCat = expenseCategories.find(
      (c) => c.name === "Loan Payment" && c.is_system
    );
    if (!loanPaymentCat) {
      throw new ValidationError(
        'System category "Loan Payment" not found. Cannot create payment transaction.'
      );
    }

    return this.repo.createPayment({
      liability_id: liabilityId,
      account_id: data.account_id,
      category_id: loanPaymentCat.id,
      principal_amount: data.principal_amount,
      interest_amount: data.interest_amount,
      payment_date: data.payment_date,
      description: data.description,
      notes: data.notes ?? null,
    });
  }
}
