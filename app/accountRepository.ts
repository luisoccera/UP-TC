import { ExecutionMethod } from "appwrite";
import {
  cloudConfiguration,
  requireFunctions,
  account,
} from "./appwriteClient";
import { clearLocalProgress } from "./progressRepository";

export async function deleteCurrentAccount(userId: string): Promise<void> {
  const service = requireFunctions();
  const execution = await service.createExecution({
    functionId: cloudConfiguration.deleteAccountFunctionId,
    async: false,
    method: ExecutionMethod.DELETE,
  });
  if (
    execution.status !== "completed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    throw new Error(
      execution.responseBody || "No se pudo eliminar la cuenta en Appwrite.",
    );
  }

  await Promise.allSettled([
    clearLocalProgress(userId),
    account?.deleteSession({ sessionId: "current" }),
  ]);
}
