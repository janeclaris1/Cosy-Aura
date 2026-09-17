/** Server boot hooks — runs once per Node.js runtime. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/sharp-heif-block");
  }
}
