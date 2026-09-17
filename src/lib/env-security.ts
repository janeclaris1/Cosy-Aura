/** True when running a production Node build (Vercel, Hostinger, etc.). */
export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}
