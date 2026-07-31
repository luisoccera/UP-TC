import { Client, Users } from "node-appwrite";

const fallbackEndpoint = "https://sfo.cloud.appwrite.io/v1";
const fallbackProjectId = "6a6bd26500326fd9d3ac";

export default async ({ req, res, error }) => {
  if (req.method !== "DELETE") {
    return res.json({ error: "Método no permitido." }, 405);
  }

  const userId = req.headers["x-appwrite-user-id"];
  const dynamicApiKey = req.headers["x-appwrite-key"];
  if (!userId || !dynamicApiKey) {
    return res.json({ error: "Sesión requerida." }, 401);
  }

  const client = new Client()
    .setEndpoint(
      process.env.APPWRITE_FUNCTION_API_ENDPOINT ?? fallbackEndpoint,
    )
    .setProject(
      process.env.APPWRITE_FUNCTION_PROJECT_ID ?? fallbackProjectId,
    )
    .setKey(dynamicApiKey);

  try {
    await new Users(client).delete({ userId });
    return res.json({ deleted: true });
  } catch (cause) {
    error(
      cause instanceof Error
        ? `No se pudo eliminar la cuenta: ${cause.message}`
        : "No se pudo eliminar la cuenta.",
    );
    return res.json({ error: "No se pudo eliminar la cuenta." }, 500);
  }
};
