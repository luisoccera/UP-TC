import { Account, Client, Functions } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT?.trim() ?? "";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID?.trim() ?? "";
const projectName =
  import.meta.env.VITE_APPWRITE_PROJECT_NAME?.trim() ?? "UP-TC";
const publicUrl = import.meta.env.VITE_APPWRITE_PUBLIC_URL?.trim() ?? "";
const deleteAccountFunctionId =
  import.meta.env.VITE_APPWRITE_DELETE_ACCOUNT_FUNCTION_ID?.trim() ??
  "delete-account";

export const cloudConfiguration = {
  ready: Boolean(endpoint && projectId),
  endpoint,
  projectId,
  projectName,
  publicUrl,
  deleteAccountFunctionId,
  missing: [
    !endpoint ? "VITE_APPWRITE_ENDPOINT" : "",
    !projectId ? "VITE_APPWRITE_PROJECT_ID" : "",
  ].filter(Boolean),
};

export const appwriteClient = cloudConfiguration.ready
  ? new Client().setEndpoint(endpoint).setProject(projectId)
  : null;

export const account = appwriteClient ? new Account(appwriteClient) : null;
export const functions = appwriteClient
  ? new Functions(appwriteClient)
  : null;

export function requireAccount() {
  if (!account) {
    throw new Error(
      "El servicio de cuentas todavía no está conectado. Configura las variables públicas de Appwrite.",
    );
  }
  return account;
}

export function requireFunctions() {
  if (!functions) {
    throw new Error(
      "El servicio de eliminación de cuentas todavía no está conectado.",
    );
  }
  return functions;
}

export function appwriteRedirectUrl(
  action: "verify-email" | "recover-password",
) {
  const browserOrigin =
    typeof window !== "undefined" &&
    (window.location.protocol === "https:" ||
      window.location.protocol === "http:")
      ? window.location.origin
      : "";
  const baseUrl = publicUrl || browserOrigin;

  if (!baseUrl) {
    throw new Error(
      "Configura VITE_APPWRITE_PUBLIC_URL con la dirección pública de UP Training Center para enviar este correo.",
    );
  }

  const url = new URL(baseUrl);
  url.searchParams.set("authAction", action);
  return url.toString();
}
