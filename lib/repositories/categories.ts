import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  CategoryType,
  CreateCategoryInput,
} from "@/types/database";

export class CategoryRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAllByUser(userId: string): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("is_system", { ascending: false })
      .order("name");

    if (error) throw error;
    return data;
  }

  async findByUserAndType(
    userId: string,
    type: CategoryType
  ): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .order("is_system", { ascending: false })
      .order("name");

    if (error) throw error;
    return data;
  }

  async findById(userId: string, categoryId: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("*")
      .eq("id", categoryId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(userId: string, input: CreateCategoryInput): Promise<Category> {
    const { data, error } = await this.supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        color: input.color ?? null,
        is_system: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
