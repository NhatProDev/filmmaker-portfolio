"use client";

import Image from "next/image";
import { useState } from "react";
import { api } from "../../../../_components/api";
import { ChooseMediaButton, ErrorLine, NewParagraphs, ParagraphsEditor, PlacementEditor } from "../../../../_components/composition";
import { useAction } from "../../../../_components/useAction";
import studio from "../../../../studio.module.css";
import { AddBlock } from "./AddBlock";
import { labelOf, needsOf, presetOf, summaryOf, thumbsOf, type Block } from "./blockInfo";
import { moveBlock, moveRefusal, moveTargets } from "./moves";
import { GalleryEditor, HeroEditor, ImageEditor, PlacementControl, SpacerEditor, TextEditor, VideoEditor } from "./editors";
import { HomeSectionEditor } from "./HomeEditors";
import type { ComposerOwner } from "./owner";
import { SortableList, type HandleProps, type ItemState } from "./SortableList";
import styles from "./composer.module.css";

// One block of the composition: what it is, what it shows, what it still
// needs, and its actions. Opened, it edits the block in place; a GRID holds
// its own ordered children, one level deep (ADR-0006).

export type CardContext = {
  owner: ComposerOwner;
  expanded: ReadonlySet<string>;
  toggle: (id: string, open?: boolean) => void;
  hasOpening: boolean;
  // The top-level blocks, for moves between containers.
  roots: readonly Block[];
};

export function BlockCard({
  block,
  handle,
  state,
  context,
  parent,
}: {
  block: Block;
  handle: HandleProps | null;
  state: ItemState;
  context: CardContext;
  // The GRID this block sits in; null at the top level.
  parent: Block | null;
}) {
  const { run, pending, error } = useAction();
  const [inserting, setInserting] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const open = context.expanded.has(block.id);
  const needs = needsOf(block);
  const thumbs = thumbsOf(block);
  const label = labelOf(block, context.owner.kind);
  const locked = handle === null;
  const inPreset = Boolean(parent && presetOf(parent));
  const home = context.owner.kind === "page";
  const targets = locked || home ? [] : moveTargets(block, parent, context.roots);
  // Home shows its hero and its identity once (ADR-0018).
  const single = home && (block.type === "HERO" || presetOf(block) === "homeIdentity");

  const remove = () => {
    const children = block.children.length ? ` and the ${block.children.length} block(s) inside it` : "";
    if (confirm(`Delete “${label}”${children}? This cannot be undone. Its media stay in the Media Library.`)) {
      void run(() => api("DELETE", `/blocks/${block.id}`));
    }
  };

  return (
    <article
      className={styles.card}
      data-hidden={block.isHidden ? "" : undefined}
      data-grabbed={state.grabbed ? "" : undefined}
      data-dragging={state.dragging ? "" : undefined}
      aria-label={`${state.index + 1}. ${label}`}
    >
      <div className={styles.cardHead}>
        {handle ? (
          <button type="button" className={styles.handle} {...handle}>
            <span aria-hidden="true">⋮⋮</span>
          </button>
        ) : (
          <span className={styles.pinned} title="The opening is always first">
            1st
          </span>
        )}
        <span className={styles.index}>{String(state.index + 1).padStart(2, "0")}</span>
        <span className={styles.thumbs} aria-hidden="true">
          {thumbs.length ? (
            thumbs.map((src) => <Image key={src} src={src} alt="" width={48} height={32} unoptimized />)
          ) : (
            <span className={styles.noThumb}>{block.type}</span>
          )}
        </span>
        <button type="button" className={styles.titleButton} aria-expanded={open} onClick={() => context.toggle(block.id)}>
          <strong>{label}</strong>
          <span>{summaryOf(block) || " "}</span>
        </button>
        <span className={styles.badges}>
          {block.isHidden && <span className={`${studio.badge} ${studio.badgeWarn}`}>Hidden</span>}
          {!block.isHidden && needs && <span className={`${studio.badge} ${studio.badgeInfo}`}>{needs}</span>}
        </span>
        <span className={styles.actions}>
          <button type="button" className={`${studio.button} ${studio.small} ${studio.icon}`} aria-label={`Move ${label} up`} disabled={!state.moveUp || pending} onClick={state.moveUp}>
            ↑
          </button>
          <button type="button" className={`${studio.button} ${studio.small} ${studio.icon}`} aria-label={`Move ${label} down`} disabled={!state.moveDown || pending} onClick={state.moveDown}>
            ↓
          </button>
          {targets.length > 0 && (
            // Choosing does not move: arrowing through a closed select fires
            // a change on Windows, so the move waits for the button (3D-8).
            <>
              <select
                className={`${studio.select} ${styles.moveTo}`}
                aria-label={`Move ${label} to another container`}
                value={moveTo}
                onChange={(event) => setMoveTo(event.target.value)}
              >
                <option value="">Move to…</option>
                {targets.map((target, i) => (
                  <option key={target.parentBlockId ?? "root"} value={i}>
                    {target.label}
                  </option>
                ))}
              </select>
              {moveTo !== "" && (
                <button
                  type="button"
                  className={`${studio.button} ${studio.small}`}
                  disabled={pending}
                  onClick={() => {
                    const target = targets[Number(moveTo)];
                    setMoveTo("");
                    if (target) void run(() => moveBlock(block.id, target.parentBlockId, target.position));
                  }}
                >
                  Move
                </button>
              )}
            </>
          )}
          {!locked && !inPreset && !single && (
            <button type="button" className={`${studio.button} ${studio.small}`} disabled={pending} onClick={() => run(() => api("POST", `/blocks/${block.id}/duplicate`))}>
              Duplicate
            </button>
          )}
          <button
            type="button"
            className={`${studio.button} ${studio.small}`}
            disabled={pending}
            onClick={() => run(() => api("PATCH", `/blocks/${block.id}`, { isHidden: !block.isHidden }))}
          >
            {block.isHidden ? "Show" : "Hide"}
          </button>
          <button type="button" className={`${studio.button} ${studio.small} ${studio.danger}`} disabled={pending} onClick={remove}>
            Delete
          </button>
        </span>
      </div>
      <ErrorLine error={error} />
      {open && (
        <div className={styles.cardBody}>
          <BlockEditor block={block} parent={parent} context={context} />
          {parent && !presetOf(parent) && (
            <details className={styles.placementDetails} open>
              <summary>Place in the columns</summary>
              <PlacementControl block={block} />
            </details>
          )}
        </div>
      )}
      {!parent && (
        <div className={styles.insertBelow}>
          {inserting ? (
            <AddBlock
              owner={context.owner}
              parentBlockId={null}
              position={state.index + 1}
              hasOpening={context.hasOpening}
              label="Insert below"
              initiallyOpen
              onCancel={() => setInserting(false)}
              onCreated={(created) => {
                setInserting(false);
                context.toggle(created.id, true);
              }}
            />
          ) : (
            <button type="button" className={styles.insertButton} onClick={() => setInserting(true)}>
              + Insert below
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function BlockEditor({ block, parent, context }: { block: Block; parent: Block | null; context: CardContext }) {
  const root = parent === null;
  if (context.owner.kind === "page") return <HomeSectionEditor block={block} />;
  switch (block.type) {
    case "HERO":
      return <HeroEditor block={block} standalone={root} />;
    case "TEXT":
      return <TextEditor block={block} roles={!parent || !presetOf(parent)} />;
    case "IMAGE":
      return <ImageEditor block={block} root={root} />;
    case "VIDEO":
      return <VideoEditor block={block} standalone={root} />;
    case "SPACER":
      return <SpacerEditor block={block} />;
    case "GALLERY":
      return <GalleryEditor block={block} />;
    case "GRID":
      return <GridEditor block={block} context={context} />;
  }
}

// ---- GRID: presets and free columns ----

function GridEditor({ block, context }: { block: Block; context: CardContext }) {
  const preset = presetOf(block);
  if (preset === "projectMeta") return <MetaEditor block={block} ownerPath={context.owner.path} />;
  if (preset === "projectStills") return <StillsEditor block={block} context={context} />;
  if (preset === "projectLoop") return <LoopEditor block={block} />;
  if (preset === "projectCredits") return <p className={studio.hint}>The credit list from Credits below. Nothing to edit here.</p>;
  return <ColumnsEditor block={block} context={context} />;
}

function MetaEditor({ block, ownerPath }: { block: Block; ownerPath: string }) {
  const { run, pending, error } = useAction();
  const statement = block.children[1];
  return (
    <div className={styles.stack}>
      <p className={studio.hint}>Year, runtime, client and role come from Details. The statement sits beside them: a lead line and a paragraph.</p>
      {statement ? (
        <>
          <ParagraphsEditor key={statement.updatedAt} block={statement} labels={["Lead", "Body"]} multiline={[false, true]} />
          <div className={studio.row}>
            <button
              type="button"
              className={`${studio.button} ${studio.small} ${studio.danger}`}
              disabled={pending}
              onClick={() => confirm("Remove the statement? The facts stay.") && run(() => api("DELETE", `/blocks/${statement.id}`))}
            >
              Remove statement
            </button>
          </div>
        </>
      ) : (
        <NewParagraphs
          labels={["Lead", "Body"]}
          multiline={[false, true]}
          submitLabel="Add statement"
          onCreate={([lead, body]) =>
            api("POST", `${ownerPath}/blocks`, {
              type: "TEXT",
              parentBlockId: block.id,
              position: 1,
              content: { kind: "richText", paragraphs: [[lead], [body]] },
              config: { role: "statement", placement: { desktop: { colStart: 5, colSpan: 6 } } },
            })
          }
        />
      )}
      <ErrorLine error={error} />
    </div>
  );
}

function StillsEditor({ block, context }: { block: Block; context: CardContext }) {
  const { run, pending, error } = useAction();
  return (
    <div className={styles.stack}>
      <p className={studio.hint}>Four across on desktop, two on tablets, one on phones — each still at its own proportions, in this order.</p>
      <SortableList
        items={block.children}
        label={(child) => child.media[0]?.media.storageKey?.split("/").pop() ?? "still"}
        disabled={pending}
        onCommit={(ids) => run(() => api("PUT", `${context.owner.path}/blocks/order`, { parentBlockId: block.id, blockIds: ids }))}
        renderItem={(still, handle, state) => (
          <div className={styles.stillRow}>
            {handle && (
              <button type="button" className={styles.handle} {...handle}>
                <span aria-hidden="true">⋮⋮</span>
              </button>
            )}
            <span className={styles.index}>{state.index + 1}</span>
            {still.media[0] ? (
              <PlacementEditor
                key={still.media[0].id + still.updatedAt}
                blockId={still.id}
                item={still.media[0]}
                replaceTypes={["IMAGE"]}
                onRemove={() => api("DELETE", `/blocks/${still.id}`)}
              />
            ) : (
              <div className={studio.row}>
                <span className={studio.hint}>An empty still.</span>
                <ChooseMediaButton label="Choose image" title="Choose a still" types={["IMAGE"]} onSelect={(media) => api("POST", `/blocks/${still.id}/media`, { mediaId: media.id })} />
                <button type="button" className={`${studio.button} ${studio.small} ${studio.danger}`} onClick={() => run(() => api("DELETE", `/blocks/${still.id}`))}>
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      />
      <div className={studio.row}>
        <ChooseMediaButton
          label="Add still"
          title="Choose a still"
          types={["IMAGE"]}
          onSelect={async (media) => {
            const child = await api<Block>("POST", `${context.owner.path}/blocks`, { type: "IMAGE", parentBlockId: block.id, config: { fit: "CONTAIN" } });
            await api("POST", `/blocks/${child.id}/media`, { mediaId: media.id });
          }}
        />
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

function LoopEditor({ block }: { block: Block }) {
  const [video, caption] = block.children;
  return (
    <div className={styles.stack}>
      <p className={studio.hint}>Plays silently while visible, with its caption beside it; the caption moves below on narrow screens.</p>
      {video?.media[0] ? (
        <PlacementEditor key={video.media[0].id + video.updatedAt} blockId={video.id} item={video.media[0]} replaceTypes={["VIDEO"]} />
      ) : (
        video && (
          <div className={studio.row}>
            <ChooseMediaButton label="Choose the loop" title="Choose the loop" types={["VIDEO"]} primary onSelect={(media) => api("POST", `/blocks/${video.id}/media`, { mediaId: media.id })} />
          </div>
        )
      )}
      {caption && <ParagraphsEditor key={caption.updatedAt} block={caption} labels={["Caption"]} />}
    </div>
  );
}

function ColumnsEditor({ block, context }: { block: Block; context: CardContext }) {
  const { run, pending, error } = useAction();
  return (
    <div className={styles.stack}>
      <p className={studio.hint}>
        Twelve columns on desktop. Give each block a start and a width; tablets follow desktop and phones stack them in this order unless you set otherwise.
      </p>
      <div className={styles.nested}>
        <SortableList
          items={block.children}
          label={labelOf}
          container={block.id}
          foreign={{
            refusal: (item, from) => moveRefusal(item as Block, context.roots.find((root) => root.id === from) ?? null, block),
            onDrop: (id, index) => void run(() => moveBlock(id, block.id, index)),
          }}
          disabled={pending}
          onCommit={(ids) => run(() => api("PUT", `${context.owner.path}/blocks/order`, { parentBlockId: block.id, blockIds: ids }))}
          renderItem={(child, handle, state) => <BlockCard block={child} handle={handle} state={state} context={context} parent={block} />}
        />
        {!block.children.length && (
          <p className={studio.hint}>
            Nothing in these columns yet. Add a block below, drag one in by its handle, or use Move to… on a block of the page.
          </p>
        )}
        <AddBlock
          owner={context.owner}
          parentBlockId={block.id}
          hasOpening={context.hasOpening}
          label="Add to the columns"
          onCreated={(created) => context.toggle(created.id, true)}
        />
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

