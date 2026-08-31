export const API_BASE =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000";

const AUTH_KEY = "bsg.auth";

export type AuthState = {
  access_token: string;
  user_id: number;
  username: string;
  user_type: "officer" | "admin";
  system_id: number;
  session_id?: number;
  full_name?: string;
  verified?: boolean;
};

export function getAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    return null;
  }
}

export function setAuth(a: AuthState) {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(a));
  window.dispatchEvent(new Event("bsg-auth-change"));
}

export function patchAuth(p: Partial<AuthState>) {
  const cur = getAuth();
  if (!cur) return;
  setAuth({ ...cur, ...p });
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new Event("bsg-auth-change"));
  }
}

function authHeaders(): Record<string, string> {
  const a = getAuth();
  return a?.access_token ? { Authorization: `Bearer ${a.access_token}` } : {};
}

async function handle(res: Response) {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : null) ?? `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

export async function apiGet<T>(path: string, auth = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json", ...(auth ? authHeaders() : {}) },
  });
  return (await handle(res)) as T;
}

export async function apiPostJson<T>(path: string, body: unknown, auth = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
    body: JSON.stringify(body),
  });
  return (await handle(res)) as T;
}

export async function apiPostForm<T>(path: string, form: FormData, auth = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { accept: "application/json", ...(auth ? authHeaders() : {}) },
    body: form,
  });
  return (await handle(res)) as T;
}

/** Fetches a binary image endpoint and returns an object URL (or null). */
export async function fetchImageUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { accept: "application/json", ...authHeaders() },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as Record<string, unknown>;
      const val =
        (j["image"] as string) ??
        (j["photo"] as string) ??
        (j["data"] as string) ??
        (j["image_base64"] as string) ??
        null;
      if (!val) return null;
      return val.startsWith("data:") || val.startsWith("http")
        ? val
        : `data:image/jpeg;base64,${val}`;
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/* ---------- Domain types ---------- */

export type SystemSession = {
  id: number;
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  no_of_cases: number;
  officer_id: number;
};

export type SystemItem = {
  id: number;
  system_name: string;
  status: string;
  primary_owner_id: number;
  sessions: SystemSession[];
};

export type UserItem = {
  user_id: number;
  username: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  aadhar_no: string | null;
  phone: string | null;
  email: string | null;
  user_type: string;
  status: string;
  has_face_image: boolean;
};

export type ExtractedDoc = {
  full_name: string | null;
  doc_number: string | null;
  doc_type: string | null;
  gender: string | null;
  nationality: string | null;
  dob: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  mrz_no: string | null;
  address: string | null;
};

export type HistoryRow = {
  verification_id: number;
  date_time_recorded: string;
  document: ExtractedDoc & { id: number };
  risks: Array<{
    id: number;
    ocr_confidence: number | null;
    mrz_validation: boolean | null;
    tampering_probability: number | null;
    face_match_score: number | null;
    database_verification: boolean | null;
    approved: boolean | null;
    status: string;
    description: string | null;
    verifier_admin_id: number | null;
  }>;
  officer: { id: number; username: string; full_name: string; user_type: string; status: string };
  session: SystemSession;
  system: { id: number; system_name: string; status: string };
};
