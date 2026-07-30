import { clearLocalProgress } from "./progressRepository";
import { requireSupabase } from "./supabaseClient";

export async function deleteCurrentAccount(userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("delete-account", {
    method: "DELETE",
  });
  if (error) throw error;

  await Promise.allSettled([
    clearLocalProgress(userId),
    client.auth.signOut({ scope: "local" }),
  ]);
}
