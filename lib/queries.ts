import { createClient } from "@supabase/supabase-js";
import type { Diagnosis } from "@/lib/types";

export const getDiagnoses = async (): Promise<Diagnosis[]> => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  );
  const { data } = await supabase
    .from("diagnoses")
    .select("id, name")
    .order("name");
  return (data ?? []) as Diagnosis[];
};
