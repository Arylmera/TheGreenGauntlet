/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_MOCK_PHASE?: 'live' | 'pre' | 'ended';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
