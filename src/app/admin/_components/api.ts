// The Studio's client for /api/v1. Same-origin fetch: the browser sends the
// HttpOnly session cookie and the Origin header the CSRF check expects.

export type ApiIssue = { path: string; message: string };

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> | null,
  ) {
    super(message);
  }

  get issues(): ApiIssue[] {
    const issues = this.details?.issues;
    return Array.isArray(issues) ? (issues as ApiIssue[]) : [];
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = payload?.error ?? { code: "HTTP_ERROR", message: response.statusText, details: null };
    throw new ApiRequestError(response.status, error.code, error.message, error.details);
  }
  return (payload?.data ?? payload) as T;
}

// One readable sentence for an error, issues included.
export function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Your session has ended. Sign in again.";
    const issues = error.issues.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message));
    return [error.message, ...issues].join(" · ");
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
