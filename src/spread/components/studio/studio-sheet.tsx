import { useEffect, useId, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, X } from "lucide-react";
import { useSpread } from "@/lib/spread/store";
import { STUDIO_FLAG, originalStudioAppearance, type StudioAppearanceV1, type StudioMode } from "@/lib/spread/studio/contract";
import { STUDIO_PERSISTENCE_MESSAGES } from "@/lib/spread/studio/persistence";
import {
  browserStudioStorage,
  commitDraft,
  dropPendingAsset,
  importDraftPhoto,
  loadSession,
  studioAssetStore,
} from "./studio-bridge";
import { STUDIO_UI_COPY, studioEntryRendered } from "./studio-copy";
import {
  draftIsDirty,
  draftIsOriginal,
  openStudioSession,
  reduceStudioSession,
  type StudioDraftAction,
  type StudioSession,
} from "./draft";
import { StudioLivePreview } from "./studio-preview";
import "./studio-ui.css";

export function StudioCustomizeEntry() {
  if (studioEntryRendered(STUDIO_FLAG) === "nothing") return null;
  return <StudioCustomizeLive />;
}

function StudioCustomizeLive() {
  const profileId = useSpread((s) => s.activeId);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<"idle" | "import" | "save">("idle");
  const [pane, setPane] = useState<"spread" | "week">("spread");
  const [session, setSession] = useState<StudioSession>(() =>
    openStudioSession({ render: originalStudioAppearance(), imageMessage: null, planner: "" }),
  );
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openRef = useRef(open);
  const activityRef = useRef(activity);
  openRef.current = open;
  activityRef.current = activity;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const transparency = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const apply = () => {
      setReduceMotion(motion.matches);
      setReduceTransparency(transparency.matches);
    };
    apply();
    motion.addEventListener("change", apply);
    transparency.addEventListener("change", apply);
    return () => {
      motion.removeEventListener("change", apply);
      transparency.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setReady(false);
    const planner = readPlanner();
    void (async () => {
      if (!profileId) {
        if (cancel) return;
        setSession(
          openStudioSession({
            render: originalStudioAppearance(),
            imageMessage: STUDIO_PERSISTENCE_MESSAGES.missingProfile,
            planner,
          }),
        );
        setReady(true);
        return;
      }
      const loaded = await loadSession({
        storage: browserStudioStorage(),
        assets: await studioAssetStore(),
        profileId,
        enabled: true,
        planner,
      });
      if (cancel) return;
      setSession(loaded);
      setReady(true);
    })();
    return () => {
      cancel = true;
    };
  }, [open, profileId]);

  const assetId = session.draft.wallpaperAssetId ?? null;
  useEffect(() => {
    if (!open || !assetId || !profileId) {
      setWallpaperUrl(null);
      return;
    }
    let cancel = false;
    let created: string | null = null;
    setWallpaperUrl(null);
    void studioAssetStore().then(async (assets) => {
      if (!assets || cancel) return;
      const row = await assets.get(profileId, assetId);
      if (cancel || !row) {
        if (!cancel) setWallpaperUrl(null);
        return;
      }
      const type = row.format === "webp" ? "image/webp" : "image/jpeg";
      created = URL.createObjectURL(new Blob([Uint8Array.from(row.bytes)], { type }));
      if (cancel) {
        URL.revokeObjectURL(created);
        return;
      }
      setWallpaperUrl(created);
    });
    return () => {
      cancel = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [open, assetId, profileId]);

  function applyAction(action: StudioDraftAction) {
    setSession((current) => {
      const next = reduceStudioSession(current, action);
      if (next.effect.type === "drop-pending") {
        const dropping = next.effect.assetId;
        void studioAssetStore().then((assets) => dropPendingAsset(assets, profileId, dropping));
      }
      return next.state;
    });
  }

  function closeDiscard() {
    if (activityRef.current === "save") return;
    abortRef.current?.abort();
    applyAction({ type: "cancel" });
    setBusy(false);
    setActivity("idle");
    setOpen(false);
  }

  async function onApply() {
    if (!ready || busy || !draftIsDirty(session)) return;
    setBusy(true);
    setActivity("save");
    const result = await commitDraft({
      storage: browserStudioStorage(),
      assets: await studioAssetStore(),
      profileId,
      session,
      enabled: true,
      planner: readPlanner(),
    });
    if (!openRef.current) return;
    setSession(result.session);
    setBusy(false);
    setActivity("idle");
    if (result.wrote) setOpen(false);
  }

  async function onPhoto(file: File) {
    if (!profileId || busy) return;
    const assets = await studioAssetStore();
    if (!assets) {
      applyAction({ type: "note", message: STUDIO_UI_COPY.photosUnavailable });
      return;
    }
    const abort = new AbortController();
    abortRef.current = abort;
    setBusy(true);
    setActivity("import");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await importDraftPhoto({
      session,
      profileId,
      bytes,
      mime: file.type || undefined,
      store: assets,
      enabled: true,
      signal: abort.signal,
    });
    if (result.effect.type === "drop-pending") await dropPendingAsset(assets, profileId, result.effect.assetId);
    if (!openRef.current || abort.signal.aborted) {
      const pending = result.session.pendingAssetId;
      if (pending) await dropPendingAsset(assets, profileId, pending);
      return;
    }
    setSession(result.session);
    setBusy(false);
    setActivity("idle");
  }

  const status =
    session.notice ??
    session.imageMessage ??
    (!ready ? STUDIO_UI_COPY.loading : activity === "import" ? STUDIO_UI_COPY.readingPhoto : null);
  const draft = session.draft;

  return (
    <>
      <button
        type="button"
        className="mt-4 flex min-h-11 w-full items-center justify-between rounded-3xl bg-canvas px-4 text-left text-base"
        aria-label={STUDIO_UI_COPY.entryLabel}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {STUDIO_UI_COPY.entry}
        <ChevronRight className="size-4 text-tertiary" strokeWidth={2.7} aria-hidden="true" />
      </button>
      <Dialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDiscard())}>
        <Dialog.Portal>
          <Dialog.Overlay className="scrim no-print fixed inset-0 z-[80] bg-scrim" />
          <Dialog.Content
            className="studio-sheet sheet no-print fixed inset-x-0 z-[80] mx-auto w-full max-w-xl overflow-y-auto bg-elevated px-5 pt-3 pb-safe outline-none"
            aria-busy={busy}
          >
            <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
              <span />
              <div className="mx-auto h-1 w-9 rounded-full bg-fill" aria-hidden="true" />
              <button
                type="button"
                aria-label={STUDIO_UI_COPY.close}
                onClick={closeDiscard}
                className="grid size-11 place-items-center justify-self-end rounded-full text-secondary"
              >
                <X className="size-5" strokeWidth={2.7} />
              </button>
            </div>
            <Dialog.Title className="text-2xl font-bold tracking-tight">{STUDIO_UI_COPY.title}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-secondary">{STUDIO_UI_COPY.description}</Dialog.Description>
            <p role="status" className="mt-3 min-h-11 text-sm text-secondary">
              {status ?? ""}
            </p>
            <StudioLivePreview pane={pane} onPane={setPane} appearance={draft} wallpaperUrl={wallpaperUrl} />
            <fieldset disabled={!ready || busy} className="mt-5 min-w-0 border-0 p-0">
              <WallpaperControls
                draft={draft}
                fileRef={fileRef}
                onPhoto={(file) => void onPhoto(file)}
                onAction={applyAction}
              />
              <ColorControls draft={draft} suggestion={session.suggestion} onAction={applyAction} />
              <ModeControls mode={draft.mode} onAction={applyAction} />
              <details className="mt-4">
                <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold">{STUDIO_UI_COPY.more}</summary>
                <MoreControls draft={draft} onAction={applyAction} reduceMotion={reduceMotion} reduceTransparency={reduceTransparency} />
              </details>
            </fieldset>
            <div className="sticky bottom-0 mt-5 grid grid-cols-3 gap-2 bg-elevated py-3">
              <button type="button" className="min-h-11 rounded-full bg-fill text-sm font-semibold" onClick={closeDiscard}>
                {STUDIO_UI_COPY.cancel}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-full bg-fill text-sm font-semibold disabled:opacity-40"
                aria-label={STUDIO_UI_COPY.resetLabel}
                disabled={!ready || draftIsOriginal(session)}
                onClick={() => applyAction({ type: "reset" })}
              >
                {STUDIO_UI_COPY.reset}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-full bg-accent text-sm font-semibold text-on-accent disabled:opacity-40"
                disabled={!ready || busy || !draftIsDirty(session)}
                onClick={() => void onApply()}
              >
                {busy ? STUDIO_UI_COPY.applying : STUDIO_UI_COPY.apply}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function WallpaperControls({
  draft,
  fileRef,
  onPhoto,
  onAction,
}: {
  draft: StudioAppearanceV1;
  fileRef: RefObject<HTMLInputElement | null>;
  onPhoto: (file: File) => void;
  onAction: (action: StudioDraftAction) => void;
}) {
  return (
    <section aria-label={STUDIO_UI_COPY.wallpaper}>
      <h2 className="text-base font-semibold">{STUDIO_UI_COPY.wallpaper}</h2>
      {draft.wallpaperAssetId ? null : <p className="mt-1 text-sm text-secondary">{STUDIO_UI_COPY.noPhoto}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPhoto(file);
        }}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className="min-h-11 rounded-full bg-fill text-sm font-semibold" onClick={() => fileRef.current?.click()}>
          {STUDIO_UI_COPY.choosePhoto}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full bg-fill text-sm font-semibold disabled:opacity-40"
          disabled={!draft.wallpaperAssetId}
          onClick={() => onAction({ type: "clear-wallpaper" })}
        >
          {STUDIO_UI_COPY.removePhoto}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={STUDIO_UI_COPY.wallpaper}>
        <button
          type="button"
          className={`min-h-11 rounded-full text-sm font-semibold ${draft.wallpaper.fit === "cover" ? "bg-segment text-ink" : "bg-fill text-secondary"}`}
          aria-pressed={draft.wallpaper.fit === "cover"}
          aria-label={STUDIO_UI_COPY.fillLabel}
          onClick={() => onAction({ type: "set-fit", fit: "cover" })}
        >
          {STUDIO_UI_COPY.fill}
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-full text-sm font-semibold ${draft.wallpaper.fit === "contain" ? "bg-segment text-ink" : "bg-fill text-secondary"}`}
          aria-pressed={draft.wallpaper.fit === "contain"}
          aria-label={STUDIO_UI_COPY.fitLabel}
          onClick={() => onAction({ type: "set-fit", fit: "contain" })}
        >
          {STUDIO_UI_COPY.fit}
        </button>
      </div>
      <RangeControl
        label={STUDIO_UI_COPY.positionAcross}
        min={0}
        max={100}
        step={1}
        value={draft.wallpaper.positionX}
        text={`${Math.round(draft.wallpaper.positionX)}%`}
        onChange={(value) => onAction({ type: "set-wallpaper-number", key: "positionX", value })}
      />
      <RangeControl
        label={STUDIO_UI_COPY.positionDown}
        min={0}
        max={100}
        step={1}
        value={draft.wallpaper.positionY}
        text={`${Math.round(draft.wallpaper.positionY)}%`}
        onChange={(value) => onAction({ type: "set-wallpaper-number", key: "positionY", value })}
      />
      <RangeControl
        label={STUDIO_UI_COPY.dim}
        min={0}
        max={1}
        step={0.05}
        value={draft.wallpaper.dim}
        text={`${Math.round(draft.wallpaper.dim * 100)}%`}
        onChange={(value) => onAction({ type: "set-wallpaper-number", key: "dim", value })}
      />
      <RangeControl
        label={STUDIO_UI_COPY.blur}
        min={0}
        max={24}
        step={1}
        value={draft.wallpaper.blur}
        text={`${Math.round(draft.wallpaper.blur)}`}
        onChange={(value) => onAction({ type: "set-wallpaper-number", key: "blur", value })}
      />
    </section>
  );
}

function ColorControls({
  draft,
  suggestion,
  onAction,
}: {
  draft: StudioAppearanceV1;
  suggestion: StudioSession["suggestion"];
  onAction: (action: StudioDraftAction) => void;
}) {
  return (
    <section className="mt-5" aria-label={STUDIO_UI_COPY.colors}>
      <h2 className="text-base font-semibold">{STUDIO_UI_COPY.colors}</h2>
      {suggestion ? (
        <div className="mt-2">
          <p className="text-sm text-secondary">{STUDIO_UI_COPY.suggested}</p>
          <div
            className="mt-2 flex items-center gap-2"
            role="img"
            aria-label={`${STUDIO_UI_COPY.suggested}: ${suggestion.accent}, ${suggestion.surface}, ${suggestion.text}, ${suggestion.secondaryText}`}
          >
            {[suggestion.accent, suggestion.surface, suggestion.text, suggestion.secondaryText].map((color, index) => (
              <span key={`${color}-${index}`} className="size-11 rounded-full border border-line" style={{ backgroundColor: color }} />
            ))}
          </div>
          <button type="button" className="mt-2 min-h-11 rounded-full bg-fill px-4 text-sm font-semibold" onClick={() => onAction({ type: "use-suggestion" })}>
            {STUDIO_UI_COPY.useSuggested}
          </button>
        </div>
      ) : (
        <p className="mt-1 text-sm text-secondary">{STUDIO_UI_COPY.noSuggestion}</p>
      )}
      <ColorControl label={STUDIO_UI_COPY.accent} value={draft.palette.accent} onChange={(value) => onAction({ type: "set-color", key: "accent", value })} />
      <ColorControl label={STUDIO_UI_COPY.surface} value={draft.palette.surface} onChange={(value) => onAction({ type: "set-color", key: "surface", value })} />
      <ColorControl label={STUDIO_UI_COPY.text} value={draft.palette.text} onChange={(value) => onAction({ type: "set-color", key: "text", value })} />
      <ColorControl
        label={STUDIO_UI_COPY.secondaryText}
        value={draft.palette.secondaryText}
        onChange={(value) => onAction({ type: "set-color", key: "secondaryText", value })}
      />
    </section>
  );
}

function ModeControls({ mode, onAction }: { mode: StudioMode; onAction: (action: StudioDraftAction) => void }) {
  const options: { value: StudioMode; label: string }[] = [
    { value: "system", label: STUDIO_UI_COPY.system },
    { value: "light", label: STUDIO_UI_COPY.light },
    { value: "dark", label: STUDIO_UI_COPY.dark },
  ];
  return (
    <section className="mt-5">
      <h2 className="text-base font-semibold">{STUDIO_UI_COPY.appearance}</h2>
      <p className="mt-1 text-sm text-secondary">{STUDIO_UI_COPY.appearanceHint}</p>
      <div className="mt-2 grid grid-cols-3 rounded-full bg-fill p-1" role="radiogroup" aria-label={STUDIO_UI_COPY.appearance}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={mode === option.value}
            className={`min-h-11 rounded-full text-sm font-medium ${mode === option.value ? "bg-segment text-ink" : "text-secondary"}`}
            onClick={() => onAction({ type: "set-mode", mode: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function MoreControls({
  draft,
  onAction,
  reduceMotion,
  reduceTransparency,
}: {
  draft: StudioAppearanceV1;
  onAction: (action: StudioDraftAction) => void;
  reduceMotion: boolean;
  reduceTransparency: boolean;
}) {
  const materials = [
    ["flat", STUDIO_UI_COPY.flat],
    ["glass", STUDIO_UI_COPY.glass],
    ["matte", STUDIO_UI_COPY.matte],
    ["metal", STUDIO_UI_COPY.metal],
  ] as const;
  return (
    <div className="mt-2">
      <p className="text-sm text-secondary">{STUDIO_UI_COPY.systemType}</p>
      <p className="mt-1 text-sm text-secondary">{STUDIO_UI_COPY.originalControls}</p>
      {reduceMotion ? <p className="mt-2 text-sm text-secondary">{STUDIO_UI_COPY.reduceMotion}</p> : null}
      {reduceTransparency ? <p className="mt-2 text-sm text-secondary">{STUDIO_UI_COPY.reduceTransparency}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={STUDIO_UI_COPY.surfaceStyle}>
        {materials.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={draft.material.treatment === value}
            className={`min-h-11 rounded-full text-sm font-semibold ${draft.material.treatment === value ? "bg-segment text-ink" : "bg-fill text-secondary"}`}
            onClick={() => onAction({ type: "set-material", treatment: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <RangeControl
        label={STUDIO_UI_COPY.transparency}
        min={0}
        max={1}
        step={0.05}
        value={draft.material.transparency}
        text={`${Math.round(draft.material.transparency * 100)}%`}
        onChange={(value) => onAction({ type: "set-material-number", key: "transparency", value })}
      />
      <RangeControl
        label={STUDIO_UI_COPY.depth}
        min={0}
        max={1}
        step={0.05}
        value={draft.material.depth}
        text={`${Math.round(draft.material.depth * 100)}%`}
        onChange={(value) => onAction({ type: "set-material-number", key: "depth", value })}
      />
      <RangeControl
        label={STUDIO_UI_COPY.textSize}
        min={0.85}
        max={1.4}
        step={0.05}
        value={draft.typography.scale}
        text={`${Math.round(draft.typography.scale * 100)}%`}
        onChange={(value) => onAction({ type: "set-scale", value })}
      />
      <RangeControl
        label={STUDIO_UI_COPY.numerals}
        min={0}
        max={1}
        step={0.05}
        value={draft.typography.numeralEmphasis}
        text={`${Math.round(draft.typography.numeralEmphasis * 100)}%`}
        onChange={(value) => onAction({ type: "set-numeral", value })}
      />
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={STUDIO_UI_COPY.density}>
        {(
          [
            ["comfortable", STUDIO_UI_COPY.comfortable],
            ["compact", STUDIO_UI_COPY.compact],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={draft.controls.density === value}
            className={`min-h-11 rounded-full text-sm font-semibold ${draft.controls.density === value ? "bg-segment text-ink" : "bg-fill text-secondary"}`}
            onClick={() => onAction({ type: "set-density", density: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <RangeControl
        label={STUDIO_UI_COPY.decoration}
        min={0}
        max={1}
        step={0.05}
        value={draft.effects.decorationIntensity}
        text={`${Math.round(draft.effects.decorationIntensity * 100)}%`}
        onChange={(value) => onAction({ type: "set-effect", key: "decorationIntensity", value })}
      />
      <RangeControl
        label={STUDIO_UI_COPY.motion}
        min={0}
        max={1}
        step={0.05}
        value={draft.effects.animationIntensity}
        text={`${Math.round(draft.effects.animationIntensity * 100)}%`}
        onChange={(value) => onAction({ type: "set-effect", key: "animationIntensity", value })}
      />
    </div>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="mt-2 flex min-h-11 items-center justify-between gap-3 text-base">
      <span>{label}</span>
      <input id={id} type="color" value={value} aria-label={`${label} ${value}`} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RangeControl({
  label,
  min,
  max,
  step,
  value,
  text,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  text: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="mt-2">
      <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-secondary">{text}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={text}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function readPlanner(): string {
  const data = useSpread.getState().data;
  return JSON.stringify({ currentWeek: data.currentWeek, hats: data.hats, weeks: data.weeks });
}
