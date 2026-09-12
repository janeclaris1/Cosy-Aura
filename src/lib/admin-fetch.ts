/** Safely parse admin API responses (handles HTML error pages from 500s). */
export async function readAdminJson<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response
): Promise<
  | { ok: true; data: T }
  | { ok: false; error: string; status: number }
> {
  const text = await res.text();

  if (!text) {
    if (!res.ok) {
      return {
        ok: false,
        error: `Server error (${res.status}). Try again.`,
        status: res.status,
      };
    }
    return { ok: true, data: {} as T };
  }

  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    return {
      ok: false,
      error: res.ok
        ? "Invalid response from server."
        : `Server error (${res.status}). The database may be unreachable — try again.`,
      status: res.status,
    };
  }

  if (!res.ok) {
    const message =
      typeof data.error === "string" && data.error
        ? data.error
        : `Request failed (${res.status}).`;
    return { ok: false, error: message, status: res.status };
  }

  return { ok: true, data };
}
