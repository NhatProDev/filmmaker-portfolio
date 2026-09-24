"use client";

import { useState, type ReactNode } from "react";
import type { MediaDto } from "@/features/media/media.mapper";
import type {
  AboutPageContent,
  ContactPageContent,
  ContentPageKey,
  SitePageContent,
} from "@/features/page-content/page-content.schema";
import { markupToParagraphs, paragraphsToMarkup } from "@/features/project-builder/inline-markup";
import type { PublicationDto } from "@/features/projects/project.mapper";
import { api, ApiRequestError } from "../../_components/api";
import { ChooseMediaButton, ErrorLine } from "../../_components/composition";
import { PublishingPanel } from "../../_components/PublishingPanel";
import { Thumb, thumbnailUrl } from "../../_components/Thumb";
import { useAction } from "../../_components/useAction";
import styles from "../../studio.module.css";

// The Studio's editor for a structured page (ADR-0017): About, Contact or the
// site settings. The form holds the whole content; Save validates it whole on
// the server and names any field it refuses. Images are placed in the page's
// closed slots. Nothing reaches visitors before Publish (ADR-0012).

export type SlotDto = { slot: string; altText: string | null; media: MediaDto | null };
export type StructuredPageDto = {
  key: ContentPageKey;
  title: string;
  content: unknown;
  slots: SlotDto[];
  publication: PublicationDto;
};

type AnyContent = AboutPageContent | ContactPageContent | SitePageContent;

const SLOT_LABELS: Record<string, { label: string; hint: string }> = {
  portrait: { label: "Portrait", hint: "Beside the statement, at its own proportions." },
  evidence: { label: "Evidence still", hint: "With the answer, under the biography." },
  process: { label: "Process still", hint: "Wide, beside the process line." },
  identity: { label: "Identity still", hint: "Optional: under the contact rows." },
};

const PUBLIC_PATH: Record<ContentPageKey, string> = { ABOUT: "/about", CONTACT: "/contact", SITE: "every page" };

// ---- Small fields ----

function Text({ label, value, onChange, multiline, max, hint }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; max: number; hint?: string }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea className={styles.textarea} value={value} maxLength={max} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={styles.input} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <small className={styles.hint}>{hint}</small>}
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className={styles.fieldGroup}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

// An ordered list of items with add, remove and move; at least `min` remain.
function ListEditor<T>({
  items,
  onChange,
  render,
  create,
  min = 1,
  max,
  noun,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (item: T) => void, index: number) => ReactNode;
  create: () => T;
  min?: number;
  max: number;
  noun: string;
}) {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  return (
    <div className={styles.listEditor}>
      {items.map((item, i) => (
        <div key={i} className={styles.listItem}>
          <div className={styles.listItemBody}>{render(item, (value) => onChange(items.map((x, j) => (j === i ? value : x))), i)}</div>
          <div className={styles.row}>
            <button type="button" className={`${styles.button} ${styles.small} ${styles.icon}`} aria-label={`Move ${noun} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
              ↑
            </button>
            <button type="button" className={`${styles.button} ${styles.small} ${styles.icon}`} aria-label={`Move ${noun} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
              ↓
            </button>
            <button type="button" className={`${styles.button} ${styles.small}`} aria-label={`Remove ${noun} ${i + 1}`} disabled={items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className={`${styles.button} ${styles.small}`} disabled={items.length >= max} onClick={() => onChange([...items, create()])}>
        + Add {noun}
      </button>
    </div>
  );
}

// Plain words with *emphasis*: the experience rows show nothing else.
type Emphasis = (string | { em: string })[];
const emphasisToMarkup = (runs: Emphasis) => paragraphsToMarkup([runs]);
function markupToEmphasis(markup: string): { ok: true; runs: Emphasis } | { ok: false; error: string } {
  const parsed = markupToParagraphs(markup);
  if (!parsed.ok) return parsed;
  if (parsed.paragraphs.length !== 1) return { ok: false, error: "One line only." };
  const runs = parsed.paragraphs[0];
  if (runs.some((run) => typeof run === "object" && "link" in run)) return { ok: false, error: "Links are not shown here." };
  return { ok: true, runs: runs as Emphasis };
}

function EmphasisField({ label, runs, onChange }: { label: string; runs: Emphasis; onChange: (runs: Emphasis) => void }) {
  const [text, setText] = useState(() => emphasisToMarkup(runs));
  const parsed = markupToEmphasis(text);
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        className={styles.input}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const next = markupToEmphasis(e.target.value);
          if (next.ok) onChange(next.runs);
        }}
      />
      <small className={parsed.ok ? styles.hint : styles.fieldError}>{parsed.ok ? "Wrap a title in *asterisks* to set it in italics." : parsed.error}</small>
    </label>
  );
}

// ---- Page forms ----

function SiteForm({ value, set }: { value: SitePageContent; set: (v: SitePageContent) => void }) {
  const field = <K extends keyof SitePageContent>(k: K) => (v: string) => set({ ...value, [k]: v });
  return (
    <>
      <Group title="Contact">
        <Text label="Email" value={value.email} onChange={field("email")} max={320} hint="Shown on Home's footer, About and Contact." />
        <Text label="Home footer line" value={value.footerNote} onChange={field("footerNote")} max={300} multiline />
      </Group>
      <Group title="Identity (Contact footer)">
        <Text label="Name" value={value.name} onChange={field("name")} max={120} />
        <Text label="Role line" value={value.role} onChange={field("role")} max={200} />
        <Text label="Copyright line" value={value.copyright} onChange={field("copyright")} max={100} />
      </Group>
    </>
  );
}

function AboutForm({ value, set }: { value: AboutPageContent; set: (v: AboutPageContent) => void }) {
  return (
    <>
      <Group title="Opening">
        <Text label="Marker" value={value.marker} onChange={(marker) => set({ ...value, marker })} max={100} />
        <Text label="Statement" value={value.lead} onChange={(lead) => set({ ...value, lead })} max={1000} multiline />
        <Text label="Portrait caption" value={value.portrait.caption} onChange={(caption) => set({ ...value, portrait: { caption } })} max={200} />
      </Group>
      <Group title="Biography">
        <ListEditor
          items={value.biography}
          noun="paragraph"
          max={6}
          create={() => ""}
          onChange={(biography) => set({ ...value, biography })}
          render={(p, update, i) => <Text label={i === 0 ? "First paragraph" : `Paragraph ${i + 1} (muted)`} value={p} onChange={update} max={3000} multiline />}
        />
      </Group>
      <Group title="Evidence">
        <Text label="Caption" value={value.evidence.caption} onChange={(caption) => set({ ...value, evidence: { ...value.evidence, caption } })} max={200} />
        <Text label="Answer" value={value.evidence.answer} onChange={(answer) => set({ ...value, evidence: { ...value.evidence, answer } })} max={2000} multiline />
      </Group>
      <Group title="Process">
        <Text label="Line" value={value.process.line} onChange={(line) => set({ ...value, process: { ...value.process, line } })} max={1000} multiline />
        <Text label="Caption" value={value.process.caption} onChange={(caption) => set({ ...value, process: { ...value.process, caption } })} max={200} />
      </Group>
      <Group title="Image to come (designed placeholder)">
        <Text label="Label" value={value.placeholder.label} onChange={(label) => set({ ...value, placeholder: { ...value.placeholder, label } })} max={200} />
        <Text label="Caption" value={value.placeholder.caption} onChange={(caption) => set({ ...value, placeholder: { ...value.placeholder, caption } })} max={200} />
        <Text label="Line" value={value.placeholder.line} onChange={(line) => set({ ...value, placeholder: { ...value.placeholder, line } })} max={1000} multiline />
      </Group>
      <Group title="Experience">
        <Text label="Heading" value={value.experience.heading} onChange={(heading) => set({ ...value, experience: { ...value.experience, heading } })} max={200} />
        <ListEditor
          items={value.experience.rows}
          noun="row"
          max={30}
          create={() => ({ year: "", text: [""] })}
          onChange={(rows) => set({ ...value, experience: { ...value.experience, rows } })}
          render={(row, update) => (
            <div className={styles.inlineFields}>
              <Text label="Year" value={row.year} onChange={(year) => update({ ...row, year })} max={20} />
              <EmphasisField label="Role and work" runs={row.text} onChange={(text) => update({ ...row, text })} />
            </div>
          )}
        />
      </Group>
      <Group title="Close">
        <Text label="Availability" value={value.availability} onChange={(availability) => set({ ...value, availability })} max={1000} multiline hint="The email below it comes from Site settings." />
      </Group>
    </>
  );
}

function ContactForm({ value, set }: { value: ContactPageContent; set: (v: ContactPageContent) => void }) {
  return (
    <>
      <Group title="Opening">
        <Text label="Heading" value={value.heading} onChange={(heading) => set({ ...value, heading })} max={100} />
        <Text label="Statement" value={value.statement} onChange={(statement) => set({ ...value, statement })} max={1000} multiline />
      </Group>
      <Group title="Email">
        <Text label="Label" value={value.email.label} onChange={(label) => set({ ...value, email: { ...value.email, label } })} max={50} hint="The address itself comes from Site settings." />
        <Text label="Reply line" value={value.email.reply} onChange={(reply) => set({ ...value, email: { ...value.email, reply } })} max={300} />
      </Group>
      <Group title="Rows">
        <ListEditor
          items={value.rows}
          noun="row"
          max={8}
          create={(): ContactPageContent["rows"][number] => ({ label: "", value: "" })}
          onChange={(rows) => set({ ...value, rows })}
          render={(row, update) => (
            <div className={styles.inlineFields}>
              <Text label="Label" value={row.label} onChange={(label) => update({ ...row, label })} max={50} />
              <Text label="Value" value={row.value} onChange={(v) => update({ ...row, value: v })} max={200} />
              <Text
                label="Link (optional)"
                value={row.href ?? ""}
                onChange={(href) => {
                  const next = { ...row };
                  if (href) next.href = href;
                  else delete next.href;
                  update(next);
                }}
                max={2000}
                hint="https://…, mailto:…, a site path, or #"
              />
            </div>
          )}
        />
      </Group>
      <Group title="Close">
        <Text label="Note" value={value.note} onChange={(note) => set({ ...value, note })} max={1000} multiline />
        <label className={styles.row} style={{ gap: 6 }}>
          <input type="checkbox" checked={value.identity !== null} onChange={(e) => set({ ...value, identity: e.target.checked ? { caption: "" } : null })} />
          Show an identity still under the rows
        </label>
        {value.identity && (
          <Text label="Identity caption" value={value.identity.caption} onChange={(caption) => set({ ...value, identity: { caption } })} max={300} />
        )}
      </Group>
    </>
  );
}

// ---- Slots ----

function SlotEditor({ pageKey, slot }: { pageKey: ContentPageKey; slot: SlotDto }) {
  const { run, pending, error } = useAction();
  const [alt, setAlt] = useState(slot.altText ?? "");
  const [mode, setMode] = useState<"inherit" | "decorative" | "custom">(slot.altText === null ? "inherit" : slot.altText === "" ? "decorative" : "custom");
  const info = SLOT_LABELS[slot.slot] ?? { label: slot.slot, hint: "" };
  const put = (mediaId: string, altText: string | null) => api("PUT", `/pages/${pageKey}/media/${slot.slot}`, { mediaId, altText });
  const altValue = mode === "inherit" ? null : mode === "decorative" ? "" : alt;
  return (
    <div className={styles.slot}>
      <Thumb src={thumbnailUrl(slot.media)} large label="No image" />
      <div className={styles.slotBody}>
        <strong>{info.label}</strong>
        <span className={styles.hint}>{info.hint}</span>
        <div className={styles.row}>
          <ChooseMediaButton label={slot.media ? "Change" : "Choose image"} title={`Choose the ${info.label.toLowerCase()}`} types={["IMAGE"]} onSelect={(media) => put(media.id, altValue)} />
          {slot.media && (
            <button type="button" className={`${styles.button} ${styles.small}`} disabled={pending} onClick={() => run(() => api("DELETE", `/pages/${pageKey}/media/${slot.slot}`))}>
              Remove
            </button>
          )}
        </div>
        {slot.media && (
          <div className={styles.row}>
            <select className={styles.select} aria-label={`${info.label} description`} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="inherit">Use the image&apos;s own description</option>
              <option value="decorative">Decorative (no description)</option>
              <option value="custom">Describe it here</option>
            </select>
            {mode === "custom" && <input className={styles.input} aria-label={`${info.label} alt text`} value={alt} maxLength={1000} onChange={(e) => setAlt(e.target.value)} />}
            <button
              type="button"
              className={`${styles.button} ${styles.small}`}
              disabled={pending || altValue === slot.altText || (mode === "custom" && !alt.trim())}
              onClick={() => run(() => put(slot.media!.id, altValue))}
            >
              Save description
            </button>
          </div>
        )}
        <ErrorLine error={error} />
      </div>
    </div>
  );
}

// ---- The editor ----

export function StructuredPageEditor({
  page,
  committed,
  slots,
}: {
  page: StructuredPageDto;
  // The committed content, offered while the page has none of its own.
  committed: AnyContent;
  slots: string[];
}) {
  const stored = page.content && Object.keys(page.content as object).length ? (page.content as AnyContent) : null;
  const [draft, setDraft] = useState<AnyContent>(stored ?? committed);
  const [saved, setSaved] = useState(JSON.stringify(stored));
  const { run, pending, error } = useAction();
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const dirty = JSON.stringify(draft) !== saved;

  const save = () =>
    run(async () => {
      setFieldErrors([]);
      try {
        await api("PATCH", `/pages/${page.key}`, { content: draft });
        setSaved(JSON.stringify(draft));
      } catch (caught) {
        if (caught instanceof ApiRequestError && caught.issues.length) setFieldErrors(caught.issues.map((i) => `${i.path.replace(/^content\.?/, "") || "content"}: ${i.message}`));
        throw caught;
      }
    });

  const byName = new Map(page.slots.map((slot) => [slot.slot, slot]));
  return (
    <div className={styles.editorColumns}>
      <div className={styles.stack}>
        {!stored && (
          <p className={styles.notice}>
            This page has no content of its own yet, so the site shows its committed version. The form starts from that version: save it to adopt it, then publish.
          </p>
        )}
        <form
          className={styles.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {page.key === "SITE" && <SiteForm value={draft as SitePageContent} set={setDraft} />}
          {page.key === "ABOUT" && <AboutForm value={draft as AboutPageContent} set={setDraft} />}
          {page.key === "CONTACT" && <ContactForm value={draft as ContactPageContent} set={setDraft} />}
          <div className={`${styles.row} ${styles.saveBar}`}>
            <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={pending || !dirty}>
              {dirty ? "Save changes" : "Saved"}
            </button>
            {dirty && (
              <button type="button" className={styles.button} disabled={pending} onClick={() => setDraft(stored ?? committed)}>
                Discard
              </button>
            )}
          </div>
          {fieldErrors.length > 0 && (
            <ul className={styles.issues} role="alert">
              {fieldErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <ErrorLine error={fieldErrors.length ? null : error} />
        </form>
      </div>
      <div className={styles.stack}>
        <PublishingPanel
          publication={page.publication}
          basePath={`/pages/${page.key}`}
          previewHref={`/api/v1/pages/${page.key}/preview`}
          canUnpublish={false}
          live={PUBLIC_PATH[page.key]}
        />
        {slots.length > 0 && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Images</h2>
            </div>
            <div className={styles.panelBody}>
              {slots.map((name) => (
                <SlotEditor key={name + (byName.get(name)?.media?.id ?? "")} pageKey={page.key} slot={byName.get(name) ?? { slot: name, altText: null, media: null }} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
