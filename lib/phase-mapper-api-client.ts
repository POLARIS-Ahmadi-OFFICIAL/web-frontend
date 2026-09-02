import { apiFetch, ApiError } from "@/lib/api-client";
import { apiPath } from "@/lib/api-path";
import { getApiBase } from "@/lib/api-base";

const AGENT_TIMEOUT_MS = 300_000;

export type PhaseMapperLibrary = {
  id: number;
  user_id: string;
  name: string;
  slug: string;
  composition_profile: string;
  created_at: string;
  updated_at: string;
};

export type PhaseMapperRun = {
  id: number;
  library_id: number;
  status: "running" | "succeeded" | "failed";
  job_pid: number | null;
  return_code: number | null;
  error_message: string;
  frozen: boolean;
  created_at: string;
  completed_at: string | null;
};

export type PhaseMapperUploadResult = {
  warnings: string[];
};

export type PhaseMapperHeatmaps = {
  columns: string[];
  wells: Record<string, unknown>[];
};

export type PhaseMapperUploadKind = "composition" | "plate_reader" | "raw_xrd" | "xrd_labels_reviewed";

export async function createPhaseMapperLibrary(
  token: string | null,
  name: string,
): Promise<PhaseMapperLibrary> {
  return apiFetch<PhaseMapperLibrary>("/phase-mapper/libraries", {
    method: "POST",
    body: { name },
    token,
  });
}

export async function listPhaseMapperLibraries(token: string | null): Promise<PhaseMapperLibrary[]> {
  return apiFetch<PhaseMapperLibrary[]>("/phase-mapper/libraries", { token });
}

export async function deletePhaseMapperLibrary(token: string | null, libraryId: number): Promise<void> {
  await apiFetch<{ status: string }>(`/phase-mapper/libraries/${libraryId}`, {
    method: "DELETE",
    token,
  });
}

export async function uploadPhaseMapperFile(
  token: string | null,
  libraryId: number,
  kind: PhaseMapperUploadKind,
  file: File,
): Promise<PhaseMapperUploadResult> {
  const form = new FormData();
  form.append("file", file, file.name);

  const url = `${getApiBase()}${apiPath(`/phase-mapper/libraries/${libraryId}/uploads/${kind}`)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token && token !== "__bypass__" ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  return res.json() as Promise<PhaseMapperUploadResult>;
}

export async function startPhaseMapperRun(token: string | null, libraryId: number): Promise<PhaseMapperRun> {
  return apiFetch<PhaseMapperRun>(`/phase-mapper/libraries/${libraryId}/runs`, {
    method: "POST",
    token,
  });
}

export async function listPhaseMapperRuns(token: string | null, libraryId: number): Promise<PhaseMapperRun[]> {
  return apiFetch<PhaseMapperRun[]>(`/phase-mapper/libraries/${libraryId}/runs`, { token });
}

export async function getPhaseMapperRun(token: string | null, runId: number): Promise<PhaseMapperRun> {
  return apiFetch<PhaseMapperRun>(`/phase-mapper/runs/${runId}`, { token });
}

export async function deletePhaseMapperRun(token: string | null, runId: number): Promise<void> {
  await apiFetch<{ status: string }>(`/phase-mapper/runs/${runId}`, {
    method: "DELETE",
    token,
  });
}

export async function getPhaseMapperReads(token: string | null, runId: number): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/reads`, { token });
}

export async function getPhaseMapperPredictions(
  token: string | null,
  runId: number,
): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/predictions`, { token });
}

export async function getPhaseMapperXrdRecommendations(
  token: string | null,
  runId: number,
): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/xrd-recommendations`, { token });
}

export async function getPhaseMapperRemeasurement(
  token: string | null,
  runId: number,
): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/remeasurement`, { token });
}

export async function getPhaseMapperOpticalSpectra(
  token: string | null,
  runId: number,
  well?: string,
): Promise<Record<string, unknown>[]> {
  const query = well ? `?well=${encodeURIComponent(well)}` : "";
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/optical-spectra${query}`, { token });
}

export async function getPhaseMapperHeatmaps(token: string | null, runId: number): Promise<PhaseMapperHeatmaps> {
  return apiFetch<PhaseMapperHeatmaps>(`/phase-mapper/runs/${runId}/heatmaps`, { token });
}

export async function downloadPhaseMapperRun(token: string | null, runId: number): Promise<Blob> {
  const url = `${getApiBase()}${apiPath(`/phase-mapper/runs/${runId}/download`)}`;
  const res = await fetch(url, {
    headers: token && token !== "__bypass__" ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(`Download failed (${res.status})`, res.status);
  }
  return res.blob();
}
