/** Keep in sync with @polaris/shared-types `apiPath` (OpenAPI contract repo). */
export const API_PREFIX = "/api/v1" as const;

export function apiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_PREFIX}${normalized}`;
}
