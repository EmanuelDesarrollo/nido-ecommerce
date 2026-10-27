import { IDEMPOTENCY_HEADER, USER_HEADER, type ApiError as ApiErrorBody } from "@nido/shared";
import { readStoredUserId, storeUser } from "./session-storage";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const FRIENDLY: Record<number, string> = {
  401: "Tu sesión no es válida. Vuelve a entrar.",
  403: "No tienes permiso para hacer esto.",
  404: "No encontramos esta sorpresa.",
  409: "Esta sorpresa cambió de estado. Recarga para ver lo último.",
};

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  idempotencyKey?: string;
}

export async function api<T>(path: string, { method = "GET", body, idempotencyKey }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const userId = readStoredUserId();
  if (userId) headers[USER_HEADER] = userId;
  if (idempotencyKey) headers[IDEMPOTENCY_HEADER] = idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
  }
  if (res.ok) return (await res.json()) as T;
  // The stored user no longer exists (e.g. the database was reset): sign out so the app asks again.
  if (res.status === 401 && userId) storeUser(null);

  const error = (await res.json().catch(() => null)) as ApiErrorBody | null;
  const detail = Array.isArray(error?.message) ? error.message.join(", ") : error?.message;
  throw new ApiError(res.status, FRIENDLY[res.status] ?? detail ?? "Algo salió mal. Intenta de nuevo.");
}
