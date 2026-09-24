"use client";

import { useCallback, useState } from "react";
import type { BlockDto } from "@/features/project-builder/composition.mapper";
import { api } from "../../../../_components/api";
import { ErrorLine } from "../../../../_components/composition";
import { useAction } from "../../../../_components/useAction";
import studio from "../../../../studio.module.css";
import { AddBlock } from "./AddBlock";
import { BlockCard, type CardContext } from "./BlockCard";
import { isOpening, labelOf, type Block } from "./blockInfo";
import { DragProvider } from "./DragContext";
import { moveBlock, moveRefusal, ROOT } from "./moves";
import { projectOwner, type ComposerOwner } from "./owner";
import { PreviewPanel } from "./PreviewPanel";
import { SortableList } from "./SortableList";
import styles from "./composer.module.css";

// The composer (Phase 3A; Home, ADR-0018). The author arranges typed blocks
// and chooses among closed, code-defined presentations; the site's renderer
// does the rest, including every tablet and phone layout. Every change edits
// the working copy; visitors see it only after Publish (ADR-0012). A project
// composes any block; Home composes only its closed sections.

export function ProjectComposer({ projectId, blocks, previewHref }: { projectId: string; blocks: BlockDto[]; previewHref: string }) {
  return <Composer owner={projectOwner(projectId)} blocks={blocks} previewHref={previewHref} />;
}

export function Composer({ owner, blocks, previewHref }: { owner: ComposerOwner; blocks: BlockDto[]; previewHref: string }) {
  const { run, pending, error } = useAction();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const home = owner.kind === "page";
  // The opening of a project, or Home's hero: pinned first.
  const hasOpening = blocks.length > 0 && (home ? blocks[0].type === "HERO" : isOpening(blocks[0]));

  const toggle = useCallback((id: string, open?: boolean) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (open ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // One request moves a block into another container; the server validates it
  // in its new place and the page refreshes with the result.
  const context: CardContext = { owner, expanded, toggle, hasOpening, roots: blocks };
  const containerOf = (id: string) => blocks.find((block) => block.id === id) ?? null;
  // Any change to the working copy reloads the preview.
  const version = JSON.stringify(blocks.map(function stamp(b): unknown {
    return [b.id, b.updatedAt, b.position, b.isHidden, b.media.map((m) => [m.id, m.position, m.altText, m.posterMediaId]), b.children.map(stamp)];
  }));

  return (
    <DragProvider>
    <div className={styles.composer}>
      <div className={styles.outline}>
        {home ? (
          <p className={studio.notice}>
            Home is built from its own sections — hero, identity, wall, about teaser and frames — each drawn exactly as the page is designed. Reorder, repeat, hide or remove them; the hero always opens the page and the identity appears once.
          </p>
        ) : (
          <>
            {!blocks.length && (
              <p className={studio.notice}>
                No composition yet: the page shows the title over the cover, and the facts. Add blocks below, or start from a template when creating a project.
              </p>
            )}
            {blocks.length > 0 && !hasOpening && (
              <p className={studio.notice}>This page opens on the project&apos;s cover. Add an Opening to show a film or another image under the title.</p>
            )}
          </>
        )}
        <SortableList
          items={blocks}
          label={(block) => labelOf(block, owner.kind)}
          container={ROOT}
          foreign={
            home
              ? undefined
              : {
                  refusal: (item, from) => moveRefusal(item as Block, containerOf(from), null),
                  onDrop: (id, index) => void run(() => moveBlock(id, null, index)),
                }
          }
          lockedFirst={hasOpening}
          disabled={pending}
          onCommit={(ids) => run(() => api("PUT", `${owner.path}/blocks/order`, { parentBlockId: null, blockIds: ids }))}
          renderItem={(block, handle, state) => <BlockCard block={block} handle={handle} state={state} context={context} parent={null} />}
        />
        <ErrorLine error={error} />
        <AddBlock owner={owner} parentBlockId={null} hasOpening={hasOpening} onCreated={(block) => toggle(block.id, true)} />
      </div>
      <PreviewPanel href={previewHref} version={version} />
    </div>
    </DragProvider>
  );
}
