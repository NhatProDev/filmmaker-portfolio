import type { Database } from "@db/client";
import { parseBlock } from "./block.schema";
import { createCompositionRepository } from "./composition.repository";
import { TEMPLATES, type ProjectTemplate } from "./templates";

// Writes a template's blocks into a new, empty project, inside the caller's
// transaction. Every seed passes the same validation as an administrator's
// block.
export async function seedProjectTemplate(tx: Database, projectId: string, template: ProjectTemplate): Promise<void> {
  const repo = createCompositionRepository(tx);
  for (const [position, seed] of TEMPLATES[template].blocks.entries()) {
    const data = parseBlock({ type: seed.type, content: seed.content ?? {}, config: seed.config ?? {} }, { owner: "project", parentType: null });
    const root = await repo.insertBlock({
      projectId,
      type: data.type,
      position,
      content: data.content,
      config: data.config,
      isHidden: seed.isHidden ?? false,
    });
    for (const [childPosition, child] of (seed.children ?? []).entries()) {
      const childData = parseBlock(
        { type: child.type, content: child.content ?? {}, config: child.config ?? {} },
        { owner: "project", parentType: data.type },
      );
      await repo.insertBlock({
        parentBlockId: root.id,
        type: childData.type,
        position: childPosition,
        content: childData.content,
        config: childData.config,
        isHidden: child.isHidden ?? false,
      });
    }
  }
}
