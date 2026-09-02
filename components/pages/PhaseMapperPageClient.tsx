"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert, Button, FormField, StreamlitPage, TextInput } from "@/components/ui";
import { UploadPanel } from "@/components/phase-mapper/UploadPanel";
import {
  createPhaseMapperLibrary,
  listPhaseMapperLibraries,
  type PhaseMapperLibrary,
} from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

export function PhaseMapperPageClient() {
  const token = useAccessToken();
  const [libraries, setLibraries] = useState<PhaseMapperLibrary[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const loadLibraries = useCallback(async () => {
    if (!token) return;
    try {
      const libs = await listPhaseMapperLibraries(token);
      setLibraries(libs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load libraries");
    }
  }, [token]);

  useEffect(() => {
    void loadLibraries();
  }, [loadLibraries]);

  async function onCreateLibrary() {
    if (!newLibraryName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const lib = await createPhaseMapperLibrary(token, newLibraryName.trim());
      setNewLibraryName("");
      await loadLibraries();
      setSelectedLibraryId(lib.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create library");
    } finally {
      setCreating(false);
    }
  }

  const selectedLibrary = libraries.find((l) => l.id === selectedLibraryId) ?? null;

  return (
    <StreamlitPage
      title="Phase Mapper"
      icon="🧪"
      description="Predicts XRD-derived phase labels from optical measurements and recommends next film-XRD wells."
      layout="wide"
    >
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="w-full shrink-0 space-y-4 md:w-72">
          <FormField label="New library name">
            <TextInput
              value={newLibraryName}
              onChange={(e) => setNewLibraryName(e.target.value)}
              placeholder="e.g. DMA-Rb"
            />
          </FormField>
          <Button onClick={() => void onCreateLibrary()} disabled={creating || !newLibraryName.trim()} fullWidth>
            {creating ? "Creating…" : "Create library"}
          </Button>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--st-muted)]">Libraries</p>
            {libraries.length === 0 ? (
              <p className="text-sm text-[var(--st-muted)]">No libraries yet.</p>
            ) : (
              <ul className="space-y-1">
                {libraries.map((lib) => (
                  <li key={lib.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLibraryId(lib.id)}
                      className={`w-full rounded-[var(--st-radius-sm)] px-3 py-2 text-left text-sm transition ${
                        lib.id === selectedLibraryId
                          ? "bg-[var(--st-nav-active-bg)] text-[var(--st-nav-active-text)]"
                          : "text-[var(--st-text)] hover:bg-[var(--st-hover)]"
                      }`}
                    >
                      {lib.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          {selectedLibrary ? (
            <>
              <h3 className="text-sm font-semibold text-[var(--st-text)]">{selectedLibrary.name}</h3>
              {uploadNotice ? <Alert variant="success">{uploadNotice}</Alert> : null}
              <UploadPanel
                libraryId={selectedLibrary.id}
                onUploaded={() => setUploadNotice("Upload received. Run the pipeline when ready.")}
              />
            </>
          ) : (
            <p className="text-sm text-[var(--st-muted)]">Select or create a library to get started.</p>
          )}
        </div>
      </div>
    </StreamlitPage>
  );
}
