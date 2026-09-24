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
import { PreviewPanel } from "./PreviewPanel";
import { SortableList } from "./SortableList";
import styles from "./composer.module.css";

// The Project Detail composer (Phase 3A). The author arranges typed blocks and
// chooses among closed, code-defined presentations; the site's renderer does
// the rest, including every tablet and phone layout. Every change edits the
// working copy; visitors see it only after Publish (ADR-0012).

export function ProjectComposer({ projectId, blocks, previewHref }: { projectId: string; blocks: BlockDto[]; previewHref: string }) {
  const { run, pending, error } = useAction();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const hasOpening = blocks.length > 0 && isOpening(blocks[0]);

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
  const context: CardContext = { projectId, expanded, toggle, hasOpening, roots: blocks };
  const containerOf = (id: string) => blocks.find((block) => block.id === id) ?? null;
  // Any change to the working copy reloads the preview.
  const version = JSON.stringify(blocks.map(function stamp(b): unknown {
    return [b.id, b.updatedAt, b.position, b.isHidden, b.media.map((m) => [m.id, m.position, m.altText, m.posterMediaId]), b.children.map(stamp)];
  }));

  return (
    <DragProvider>
    <div className={styles.composer}>
      <div className={styles.outline}>
        {!blocks.length && (
          <p className={studio.notice}>
            No composition yet: the page shows the title over the cover, and the facts. Add blocks below, or start from a template when creating a project.
          </p>
        )}
        {blocks.length > 0 && !hasOpening && (
          <p className={studio.notice}>This page opens on the project&apos;s cover. Add an Opening to show a film or another image under the title.</p>
        )}
        <SortableList
          items={blocks}
          label={labelOf}
          container={ROOT}
          foreign={{
            refusal: (item, from) => moveRefusal(item as Block, containerOf(from), null),
            onDrop: (id, index) => void run(() => moveBlock(id, null, index)),
          }}
          lockedFirst={hasOpening}
          disabled={pending}
          onCommit={(ids) => run(() => api("PUT", `/projects/${projectId}/blocks/order`, { parentBlockId: null, blockIds: ids }))}
          renderItem={(block, handle, state) => <BlockCard block={block} handle={handle} state={state} context={context} parent={null} />}
        />
        <ErrorLine error={error} />
        <AddBlock projectId={projectId} parentBlockId={null} hasOpening={hasOpening} onCreated={(block) => toggle(block.id, true)} />
      </div>
      <PreviewPanel href={previewHref} version={version} />
    </div>
    </DragProvider>
  );
}
