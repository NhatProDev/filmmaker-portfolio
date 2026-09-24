import { site as committedSite } from "@/content/site";
import type { ContentGateway } from "@/features/site-content/site-content.types";
import {
  aboutContentSchema,
  contactContentSchema,
  siteContentSchema,
  type AboutPageContent,
  type ContactPageContent,
  type ContentPageKey,
  type SitePageContent,
} from "./page-content.schema";

// The committed content files (src/content/*) as structured page content
// (ADR-0017): what the import writes, and what the Studio offers as the
// starting point of a page that has none yet. Images are not content; the
// import places them in slots, the Studio lets the admin choose them.

export type CommittedImage = { src: string; alt: string };

export type CommittedPages = {
  SITE: { content: SitePageContent; images: Record<string, CommittedImage> };
  ABOUT: { content: AboutPageContent; images: Record<string, CommittedImage> };
  CONTACT: { content: ContactPageContent; images: Record<string, CommittedImage> };
};

export async function committedPages(gateway: ContentGateway): Promise<CommittedPages> {
  const about = await gateway.getAbout();
  const contact = await gateway.getContact();
  return {
    SITE: { content: siteContentSchema.parse(committedSite), images: {} },
    ABOUT: {
      content: aboutContentSchema.parse({
        marker: about.marker,
        lead: about.lead,
        portrait: { caption: about.portrait.caption },
        biography: about.biography,
        evidence: { caption: about.evidence.caption, answer: about.evidence.answer },
        process: { line: about.process.line, caption: about.process.caption },
        placeholder: about.placeholder,
        experience: about.experience,
        availability: about.contact.availability,
      }),
      images: { portrait: about.portrait.image, evidence: about.evidence.image, process: about.process.image },
    },
    CONTACT: {
      content: contactContentSchema.parse({
        heading: contact.heading,
        statement: contact.statement,
        email: { label: contact.email.label, reply: contact.email.reply },
        rows: contact.rows,
        note: contact.note,
        identity: contact.identity ? { caption: contact.identity.caption } : null,
      }),
      images: contact.identity ? { identity: contact.identity.image } : {},
    },
  };
}

export const CONTENT_PAGE_ORDER: ContentPageKey[] = ["SITE", "ABOUT", "CONTACT"];
