"use client";

import type { BlockDto } from "@/features/project-builder/composition.mapper";
import { api } from "../../../_components/api";
import {
  ChooseMediaButton,
  ErrorLine,
  NewParagraphs,
  ParagraphsEditor,
  PlacementEditor,
  reorderIds,
  Slot,
} from "../../../_components/composition";
import { useAction } from "../../../_components/useAction";
import styles from "../../../studio.module.css";

// The Project Detail page (template 1B, ADR-0013) as editable slots, in the
// template's fixed order. Adding a slot creates exactly the blocks and closed
// presets the locked page renders; nothing here can compose a layout the page
// cannot show.

type SlotKey = "hero" | "meta" | "stills" | "loop" | "credits" | "coda";
const ORDER: SlotKey[] = ["hero", "meta", "stills", "loop", "credits", "coda"];

const preset = (block: BlockDto) => (block.config as { preset?: string }).preset;

function slotOf(block: BlockDto): SlotKey | null {
  if (block.type === "HERO") return "hero";
  if (block.type === "GRID" && preset(block) === "projectMeta") return "meta";
  if (block.type === "GRID" && preset(block) === "projectStills") return "stills";
  if (block.type === "GRID" && preset(block) === "projectLoop") return "loop";
  if (block.type === "GRID" && preset(block) === "projectCredits") return "credits";
  if (block.type === "IMAGE" && preset(block) === "projectCoda") return "coda";
  return null;
}

const col = (colStart: number, colSpan: number) => ({ placement: { desktop: { colStart, colSpan } } });

export function ProjectComposition({ projectId, blocks }: { projectId: string; blocks: BlockDto[] }) {
  const { run, pending, error } = useAction();
  const find = (key: SlotKey) => blocks.find((block) => slotOf(block) === key) ?? null;
  const unplaced = blocks.filter((block) => !slotOf(block));
  // Where a new slot goes: after every existing block of an earlier slot.
  const positionFor = (key: SlotKey) =>
    blocks.filter((block) => {
      const slot = slotOf(block);
      return slot !== null && ORDER.indexOf(slot) < ORDER.indexOf(key);
    }).length;

  const create = (body: object) => api<BlockDto>("POST", `/projects/${projectId}/blocks`, body);
  const child = (parentBlockId: string, body: object) =>
    api<BlockDto>("POST", `/projects/${projectId}/blocks`, { ...body, parentBlockId });

  const hero = find("hero");
  const meta = find("meta");
  const stills = find("stills");
  const loop = find("loop");
  const credits = find("credits");
  const coda = find("coda");

  const addButton = (label: string, work: () => Promise<unknown>) => (
    <button type="button" className={`${styles.button} ${styles.small}`} disabled={pending} onClick={() => run(work)}>
      {label}
    </button>
  );

  return (
    <div>
      {!meta && (
        <p className={styles.notice}>
          {blocks.length
            ? "The page needs its Facts block before it can be published."
            : "No composition yet: the public page shows the title and cover only. Add Facts and statement to compose the page."}
        </p>
      )}

      <Slot
        number={1}
        title="Film"
        description="The opening film, played on request under the title. Without a film the page opens on the cover image."
        block={hero}
        absentAction={
          <ChooseMediaButton
            label="Add film"
            title="Choose the film"
            types={["VIDEO"]}
            onSelect={async (media) => {
              const block = await create({
                type: "HERO",
                position: positionFor("hero"),
                config: {
                  playback: { mode: "CLICK_TO_PLAY" },
                  fit: "COVER",
                  overlay: { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true },
                },
              });
              await api("POST", `/blocks/${block.id}/media`, { mediaId: media.id });
            }}
          />
        }
      >
        {hero?.media[0] ? (
          <PlacementEditor key={hero.media[0].id + hero.updatedAt} blockId={hero.id} item={hero.media[0]} replaceTypes={["VIDEO"]} />
        ) : (
          hero && (
            <div className={styles.row} style={{ marginTop: 8 }}>
              <ChooseMediaButton
                label="Choose film"
                title="Choose the film"
                types={["VIDEO"]}
                primary
                onSelect={(media) => api("POST", `/blocks/${hero.id}/media`, { mediaId: media.id })}
              />
            </div>
          )
        )}
      </Slot>

      <Slot
        number={2}
        title="Facts and statement"
        description="Year, runtime, client and role come from Details. The statement is a lead line and a paragraph."
        block={meta}
        removable={false}
        absentAction={addButton("Add facts", async () => {
          const grid = await create({ type: "GRID", position: positionFor("meta"), config: { preset: "projectMeta" } });
          await child(grid.id, { type: "TEXT", content: { kind: "projectFacts" }, config: col(1, 3) });
        })}
      >
        {meta && meta.children[1] ? (
          <>
            <ParagraphsEditor key={meta.children[1].updatedAt} block={meta.children[1]} labels={["Lead", "Body"]} multiline={[false, true]} />
            <div className={styles.row} style={{ marginTop: 8 }}>
              <button
                type="button"
                className={`${styles.button} ${styles.small} ${styles.danger}`}
                disabled={pending}
                onClick={() => run(() => api("DELETE", `/blocks/${meta.children[1].id}`))}
              >
                Remove statement
              </button>
            </div>
          </>
        ) : (
          meta && (
            <NewParagraphs
              labels={["Lead", "Body"]}
              multiline={[false, true]}
              submitLabel="Add statement"
              onCreate={([lead, body]) =>
                child(meta.id, {
                  type: "TEXT",
                  position: 1,
                  content: { kind: "richText", paragraphs: [[lead], [body]] },
                  config: { role: "statement", ...col(5, 6) },
                })
              }
            />
          )
        )}
      </Slot>

      <Slot
        number={3}
        title="Stills"
        description="A row of stills at their native proportions, in this order."
        block={stills}
        absentAction={addButton("Add stills", () =>
          create({ type: "GRID", position: positionFor("stills"), config: { preset: "projectStills" } }),
        )}
      >
        {stills && (
          <>
            {stills.children.map((still, index) =>
              still.media[0] ? (
                <PlacementEditor
                  key={still.media[0].id + still.updatedAt}
                  blockId={still.id}
                  item={still.media[0]}
                  replaceTypes={["IMAGE"]}
                  onRemove={() => api("DELETE", `/blocks/${still.id}`)}
                  extra={
                    <>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.small} ${styles.icon}`}
                        aria-label="Move still earlier"
                        disabled={pending || index === 0}
                        onClick={() =>
                          run(() =>
                            api("PUT", `/projects/${projectId}/blocks/order`, {
                              parentBlockId: stills.id,
                              blockIds: reorderIds(stills.children.map((c) => c.id), index, -1),
                            }),
                          )
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.small} ${styles.icon}`}
                        aria-label="Move still later"
                        disabled={pending || index === stills.children.length - 1}
                        onClick={() =>
                          run(() =>
                            api("PUT", `/projects/${projectId}/blocks/order`, {
                              parentBlockId: stills.id,
                              blockIds: reorderIds(stills.children.map((c) => c.id), index, 1),
                            }),
                          )
                        }
                      >
                        ↓
                      </button>
                    </>
                  }
                />
              ) : (
                <div key={still.id} className={styles.mediaRow}>
                  <span className={styles.hint}>An empty still.</span>
                  <ChooseMediaButton
                    label="Choose image"
                    title="Choose a still"
                    types={["IMAGE"]}
                    onSelect={(media) => api("POST", `/blocks/${still.id}/media`, { mediaId: media.id })}
                  />
                  <button type="button" className={`${styles.button} ${styles.small} ${styles.danger}`} onClick={() => run(() => api("DELETE", `/blocks/${still.id}`))}>
                    Remove
                  </button>
                </div>
              ),
            )}
            <div className={styles.row} style={{ marginTop: 8 }}>
              <ChooseMediaButton
                label="Add still"
                title="Choose a still"
                types={["IMAGE"]}
                onSelect={async (media) => {
                  const i = stills.children.length;
                  const block = await child(stills.id, { type: "IMAGE", config: col(1 + 3 * (i % 4), 3) });
                  await api("POST", `/blocks/${block.id}/media`, { mediaId: media.id });
                }}
              />
            </div>
          </>
        )}
      </Slot>

      <Slot
        number={4}
        title="Loop"
        description="A short silent loop that plays while visible, with a caption beside it."
        block={loop}
        absentAction={
          <ChooseMediaButton
            label="Add loop"
            title="Choose the loop"
            types={["VIDEO"]}
            onSelect={async (media) => {
              const grid = await create({ type: "GRID", position: positionFor("loop"), config: { preset: "projectLoop" } });
              const video = await child(grid.id, {
                type: "VIDEO",
                config: { playback: { mode: "AUTOPLAY_VISIBLE" }, fit: "COVER", ...col(1, 8) },
              });
              await api("POST", `/blocks/${video.id}/media`, { mediaId: media.id });
            }}
          />
        }
      >
        {loop?.children[0]?.media[0] && (
          <PlacementEditor
            key={loop.children[0].media[0].id + loop.children[0].updatedAt}
            blockId={loop.children[0].id}
            item={loop.children[0].media[0]}
            replaceTypes={["VIDEO"]}
          />
        )}
        {loop?.children[1] && <ParagraphsEditor key={loop.children[1].updatedAt} block={loop.children[1]} labels={["Caption"]} />}
        {loop && loop.children[0] && !loop.children[1] && (
          <NewParagraphs
            labels={["Caption (required)"]}
            submitLabel="Add caption"
            onCreate={([caption]) =>
              child(loop.id, {
                type: "TEXT",
                position: 1,
                content: { kind: "richText", paragraphs: [[caption]] },
                config: { role: "caption", ...col(10, 3) },
              })
            }
          />
        )}
      </Slot>

      <Slot
        number={5}
        title="Credits"
        description="The credit list from Details."
        block={credits}
        absentAction={addButton("Add credits", async () => {
          const grid = await create({ type: "GRID", position: positionFor("credits"), config: { preset: "projectCredits" } });
          await child(grid.id, { type: "TEXT", content: { kind: "projectCredits" }, config: col(1, 3) });
        })}
      />

      <Slot
        number={6}
        title="Coda"
        description="A closing full-bleed image."
        block={coda}
        absentAction={
          <ChooseMediaButton
            label="Add coda"
            title="Choose the closing image"
            types={["IMAGE"]}
            onSelect={async (media) => {
              const block = await create({ type: "IMAGE", position: positionFor("coda"), config: { fit: "COVER", preset: "projectCoda" } });
              await api("POST", `/blocks/${block.id}/media`, { mediaId: media.id });
            }}
          />
        }
      >
        {coda?.media[0] && (
          <PlacementEditor key={coda.media[0].id + coda.updatedAt} blockId={coda.id} item={coda.media[0]} replaceTypes={["IMAGE"]} />
        )}
      </Slot>

      {unplaced.length > 0 && (
        <div className={styles.notice}>
          {unplaced.length} block(s) do not fit this page&apos;s template and would stop it from publishing.
          <div className={styles.row} style={{ marginTop: 8 }}>
            {unplaced.map((block) => (
              <button
                key={block.id}
                type="button"
                className={`${styles.button} ${styles.small} ${styles.danger}`}
                disabled={pending}
                onClick={() => run(() => api("DELETE", `/blocks/${block.id}`))}
              >
                Remove {block.type.toLowerCase()} block
              </button>
            ))}
          </div>
        </div>
      )}
      <ErrorLine error={error} />
    </div>
  );
}
