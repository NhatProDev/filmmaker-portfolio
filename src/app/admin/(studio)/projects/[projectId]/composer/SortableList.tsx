"use client";

import { useId, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
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

export type HandleProps = {
  "aria-label": string;
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

export function SortableList<T extends { id: string }>({
  items,
  label,
  lockedFirst = false,
  disabled = false,
  onCommit,
  renderItem,
}: {
  items: T[];
  // What the list holds, for announcements ("blocks", "stills").
  label: (item: T) => string;
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
    setDragging(item.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
  };

  const onDragOver = (index: number, event: DragEvent<HTMLDivElement>) => {
    if (!dragging) return;
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > box.top + box.height / 2;
    setDropAt(Math.max(min, index + (after ? 1 : 0)));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
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
  };

  return (
    <div className={styles.sortable} onDragEnd={finishDrag} onPointerUp={() => !dragging && setArmed(null)}>
      <p id={helpId} className={styles.visuallyHidden}>
        Press Space or Enter to pick up, the arrow keys to move, Space or Enter to drop, Escape to cancel.
      </p>
      {current.map((item, index) => {
        const locked = lockedFirst && index === 0;
        const handle: HandleProps | null = locked
          ? null
          : {
              "aria-label": `Reorder ${label(item)}`,
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
            onDragStart={(event) => onDragStart(item, event)}
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
      <p className={styles.visuallyHidden} aria-live="assertive">
        {message}
      </p>
    </div>
  );
}
