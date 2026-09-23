import type { Database } from "@db/client";
import { createMediaService } from "@/features/media/media.service";
import { createCompositionService } from "@/features/project-builder/composition.service";
import { createPageService } from "@/features/project-builder/page.service";
import { createProjectService } from "@/features/projects/project.service";

// Services as the HTTP layer uses them, wired once.
export const services = (db: Database) => ({
  projects: createProjectService(db),
  pages: createPageService(db),
  composition: createCompositionService(db),
  media: createMediaService(db),
});
