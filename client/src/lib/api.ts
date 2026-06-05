export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? `요청 실패 (${res.status})`);
  }
  return data as T;
}

const base = '/api';

export function apiGet<T>(path: string): Promise<T> {
  return fetch(base + path, { credentials: 'include' }).then((r) => handle<T>(r));
}

export function apiSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  return fetch(base + path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? '' : JSON.stringify(body),
  }).then((r) => handle<T>(r));
}

export const apiPost = <T>(path: string, body?: unknown) => apiSend<T>('POST', path, body);
export const apiPatch = <T>(path: string, body?: unknown) => apiSend<T>('PATCH', path, body);
export const apiDelete = <T>(path: string) => apiSend<T>('DELETE', path);

export function apiForm<T>(method: string, path: string, form: FormData): Promise<T> {
  return fetch(base + path, { method, credentials: 'include', body: form }).then((r) => handle<T>(r));
}
