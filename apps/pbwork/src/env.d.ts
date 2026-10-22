/// <reference types="vite/client" />

declare module "*.json" {
  const value: unknown;
  export default value;
}

declare module "virtual:pb-runtime-source" { const digest: string; export default digest; }
