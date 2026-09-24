"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// The item being dragged, shared by every list of one composer so that a block
// can leave one container and land in another (Phase 3B).
export type Dragged = { id: string; container: string; item: unknown };

type DragState = { dragged: Dragged | null; setDragged: (next: Dragged | null) => void };

const DragContext = createContext<DragState>({ dragged: null, setDragged: () => {} });

export function DragProvider({ children }: { children: ReactNode }) {
  const [dragged, setDragged] = useState<Dragged | null>(null);
  const value = useMemo(() => ({ dragged, setDragged }), [dragged]);
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

export const useSharedDrag = () => useContext(DragContext);
