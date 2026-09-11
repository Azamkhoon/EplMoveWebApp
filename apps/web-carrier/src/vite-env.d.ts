/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GENIUS_API_URL?: string;
  readonly VITE_PORTAL_SHIPPER_URL?: string;
  readonly VITE_PORTAL_CARRIER_URL?: string;
  readonly VITE_PORTAL_BROKER_URL?: string;
  readonly VITE_PORTAL_ADMIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
