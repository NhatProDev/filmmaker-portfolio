"use client";

import { useId, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { useSharedDrag } from "./DragContext";
import styles from "./composer.module.css";

// An ordered list the author rearranges, committed as one complete order in
// one request (ADR-0002). Three ways to move an item, all equivalent:
//
// - drag it by its handle (pointer);
// - focus the handle and press Space or Enter to pick it up, the arrow keys to
//   move it, Space or Enter to drop it, Escape to put it back;
// - the Move up / Move down buttons (touch, and anyone who prefers them).
//
// `lockedFirst` pins the first item (the page's opening): it cannot move, and
// nothing can be placed above it.
//
// With `foreign`, the list also accepts an item dragged from another list of
// the same composer (a block into or out of Columns). The list asks
// `foreign.refusal` first and shows the reason instead of a drop line when the
// move is not allowed. Lists nest, so each handles its own drag events and
// stops them there.

export type HandleProps = {
  "aria-label": string;
  title: string;
  "aria-describedby": string;
  "aria-pressed": boolean;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onPointerDown: () => void;
  disabled: boolean;
};

export type ItemState = {
  index: number;
  count: number;
  grabbed: boolean;
  dragging: boolean;
  moveUp?: () => void;
  moveDown?: () => void;
};

export type ForeignDrop = {
  // Why the dragged item cannot land here; null when it can.
  refusal: (item: unknown, fromContainer: string) => string | null;
  onDrop: (id: string, index: number) => void;
};

export function SortableList<T extends { id: string }>({
  items,
  label,
  container,
  foreign,
  lockedFirst = false,
  disabled = false,
  onCommit,
  renderItem,
}: {
  items: T[];
  // What the list holds, for announcements ("blocks", "stills").
  label: (item: T) => string;
  // This list's container id, for moves between lists.
  container?: string;
  foreign?: ForeignDrop;
  lockedFirst?: boolean;
  disabled?: boolean;
  // Resolves false when the order was not saved; the list then shows the
  // server's order again.
  onCommit: (ids: string[]) => Promise<boolean>;
  renderItem: (item: T, handle: HandleProps | null, state: ItemState) => ReactNode;
}) {
  const ids = items.map((item) => item.id);
  const key = ids.join(",");
  // A local order while an item is being moved, or until the server's new
  // order arrives: it applies only as long as the server's order is still the
  // one it started from, so the server's order always wins afterwards.
  const [local, setLocal] = useState<{ base: string; order: string[] } | null>(null);
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [refused, setRefused] = useState<string | null>(null);
  const shared = useSharedDrag();
  // An item from another list is over this one.
  const incoming = shared.dragged && container && shared.dragged.container !== container ? shared.dragged : null;
  const helpId = useId();
  const order = local && local.base === key ? local.order : ids;
  const setOrder = (next: string[]) => setLocal({ base: key, order: next });

  const byId = new Map(items.map((item) => [item.id, item]));
  const current = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  const min = lockedFirst ? 1 : 0;

  const move = (list: string[], from: number, to: number) => {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const commit = (next: string[]) => {
    if (next.join(",") === key) return;
    void onCommit(next).then((saved) => {
      if (!saved) setLocal(null);
    });
  };

  const moveBy = (id: string, delta: number) => {
    const from = order.indexOf(id);
    const to = Math.max(min, Math.min(order.length - 1, from + delta));
    if (to === from) return;
    const next = move(order, from, to);
    setOrder(next);
    commit(next);
    setMessage(`${label(byId.get(id)!)} moved to position ${to + 1} of ${order.length}.`);
  };

  function onKeyDown(item: T, event: KeyboardEvent<HTMLButtonElement>) {
    const index = order.indexOf(item.id);
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (grabbed === item.id) {
        setGrabbed(null);
        commit(order);
        setMessage(`${label(item)} dropped at position ${index + 1} of ${order.length}.`);
      } else {
        setGrabbed(item.id);
        setMessage(`${label(item)} picked up, position ${index + 1} of ${order.length}. Arrow keys move it, Space drops it, Escape cancels.`);
      }
    } else if (grabbed === item.id && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const to = Math.max(min, Math.min(order.length - 1, index + (event.key === "ArrowUp" ? -1 : 1)));
      if (to !== index) {
        setOrder(move(order, index, to));
        setMessage(`${label(item)}, position ${to + 1} of ${order.length}.`);
      }
    } else if (grabbed === item.id && event.key === "Escape") {
      event.preventDefault();
      setLocal(null);
      setGrabbed(null);
      setMessage(`Move cancelled. ${label(item)} is back at position ${ids.indexOf(item.id) + 1}.`);
    }
  }

  // Pointer drag: only from the handle, so text in an open editor stays
  // selectable.
  const onDragStart = (item: T, event: DragEvent<HTMLDivElement>) => {
    if (armed !== item.id) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    setDragging(item.id);
    // Other lists show their drop zones from the next task: a layout change
    // inside dragstart makes Chrome abandon the drag.
    if (container) setTimeout(() => shared.setDragged({ id: item.id, container, item }), 0);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
  };

  // Whether this list takes the current drag; records a refusal to show.
  const takes = (event: DragEvent<HTMLDivElement>) => {
    if (dragging) return true;
    if (!incoming) return false;
    event.stopPropagation();
    const reason = foreign ? foreign.refusal(incoming.item, incoming.container) : "Blocks cannot be moved here.";
    if (reason !== refused) {
      setRefused(reason);
      if (reason) setMessage(reason);
    }
    if (reason) {
      event.dataTransfer.dropEffect = "none";
      setDropAt(null);
      return false;
    }
    return true;
  };

  const onDragOver = (index: number, event: DragEvent<HTMLDivElement>) => {
    if (!takes(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const box = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > box.top + box.height / 2;
    setDropAt(Math.max(min, index + (after ? 1 : 0)));
  };

  const onDragOverEnd = (event: DragEvent<HTMLDivElement>) => {
    if (!takes(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDropAt(current.length);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    if (incoming) {
      setDropAt(null);
      setRefused(null);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (incoming && foreign && dropAt !== null && !refused) {
      const position = dropAt;
      const { id, item } = incoming;
      finishDrag();
      setMessage(`${label(item as T)} moved here, position ${position + 1}.`);
      foreign.onDrop(id, position);
      return;
    }
    if (!dragging || dropAt === null) return finishDrag();
    const from = order.indexOf(dragging);
    const to = dropAt > from ? dropAt - 1 : dropAt;
    const next = move(order, from, to);
    setOrder(next);
    commit(next);
    setMessage(`${label(byId.get(dragging)!)} moved to position ${to + 1} of ${order.length}.`);
    finishDrag();
  };

  const finishDrag = () => {
    setDragging(null);
    setDropAt(null);
    setArmed(null);
    setRefused(null);
    shared.setDragged(null);
  };

  return (
    <div
      className={styles.sortable}
      data-drop-refused={incoming && refused ? "" : undefined}
      onDragEnd={finishDrag}
      onDragLeave={onDragLeave}
      onPointerUp={() => !dragging && setArmed(null)}
    >
      <p id={helpId} className={styles.visuallyHidden}>
        Press Space or Enter to pick up, the arrow keys to move, Space or Enter to drop, Escape to cancel.
      </p>
      {current.map((item, index) => {
        const locked = lockedFirst && index === 0;
        const handle: HandleProps | null = locked
          ? null
          : {
              "aria-label": `Reorder ${label(item)}`,
              title: container ? "Drag to reorder, or into or out of Columns. Space picks it up for the arrow keys." : "Drag to reorder. Space picks it up for the arrow keys.",
              "aria-describedby": helpId,
              "aria-pressed": grabbed === item.id,
              onKeyDown: (event) => onKeyDown(item, event),
              onPointerDown: () => setArmed(item.id),
              disabled,
            };
        return (
          <div
            key={item.id}
            className={styles.sortItem}
            draggable={!locked && !disabled && armed === item.id}
            onDragStart={(event) => {
              // A drag that starts in a nested list belongs to that list.
              if (event.target !== event.currentTarget && !(armed === item.id)) return;
              onDragStart(item, event);
            }}
            onDragOver={(event) => onDragOver(index, event)}
            onDrop={onDrop}
            data-drop-before={dropAt === index ? "" : undefined}
            data-drop-after={dropAt === current.length && index === current.length - 1 ? "" : undefined}
          >
            {renderItem(item, handle, {
              index,
              count: current.length,
              grabbed: grabbed === item.id,
              dragging: dragging === item.id,
              moveUp: locked || index <= min ? undefined : () => moveBy(item.id, -1),
              moveDown: locked || index === current.length - 1 ? undefined : () => moveBy(item.id, 1),
            })}
          </div>
        );
      })}
      {incoming && (
        <div
          className={styles.dropEnd}
          data-active={!refused && dropAt === current.length ? "" : undefined}
          onDragOver={onDragOverEnd}
          onDrop={onDrop}
        >
          {refused ?? (current.length ? "Drop here to place it last" : "Drop here")}
        </div>
      )}
      <p className={styles.visuallyHidden} aria-live="assertive">
        {message}
      </p>
    </div>
  );
}
