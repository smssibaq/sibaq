/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL: string;
  readonly VITE_LANDING_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_DISPLAY_TIMEZONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

