interface ImportMetaEnv {
  readonly VITE_APPWRITE_PROJECT_ID?: string;
  readonly VITE_APPWRITE_PROJECT_NAME?: string;
  readonly VITE_APPWRITE_ENDPOINT?: string;
  readonly VITE_APPWRITE_PUBLIC_URL?: string;
  readonly VITE_APPWRITE_DELETE_ACCOUNT_FUNCTION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
