import type { Database } from "@db/client";
import { createMediaService } from "@/features/media/media.service";
import { createProjectAccessService } from "@/features/project-access/project-access.service";
import { createCompositionService } from "@/features/project-builder/composition.service";
import { createPagePublicationService } from "@/features/project-builder/page-publication.service";
import { createPageService } from "@/features/project-builder/page.service";
import { createProjectService } from "@/features/projects/project.service";
import { createProjectPublicationService } from "@/features/projects/publication.service";
import { createPublicProjectService } from "@/features/projects/public-project.service";
import { revalidatePublicSite } from "@/lib/cache/revalidate";
import { serverEnv } from "@/lib/env/server-env";

// Services as the HTTP layer and the Studio's pages use them, wired once:
// snapshot publishing (ADR-0012) and the revalidation of the static public
// pages after every change a visitor can see.

let onPublicChange: () => void = revalidatePublicSite;

// Route handlers run outside Next.js in tests, where there is no page cache.
export function setPublicChangeHandlerForTesting(handler: (() => void) | null) {
  onPublicChange = handler ?? revalidatePublicSite;
}

export const services = (db: Database) => {
  // The change is already committed, so a failed revalidation must not report
  // it as failed. It is logged; the next successful revalidation (any later
  // publish or reorder) brings the static pages up to date.
  const notify = () => {
    try {
      onPublicChange();
    } catch (error) {
      console.error("[revalidate] public pages were not revalidated", error);
    }
  };
  const projectPublication = createProjectPublicationService(db, { onPublicChange: notify });
  const pagePublication = createPagePublicationService(db, { onPublicChange: notify });
  return {
    projects: createProjectService(db, { publication: projectPublication, onPublicChange: notify }),
    projectPublication,
    pages: createPageService(db, (tx, page) => pagePublication.summary(tx, page)),
    pagePublication,
    composition: createCompositionService(db),
    media: createMediaService(db),
    access: createProjectAccessService(db, serverEnv().PROJECT_ACCESS_SECRET),
    publicProjects: createPublicProjectService(db),
  };
};
