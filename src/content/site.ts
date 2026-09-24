// The site settings as the committed content states them (ADR-0017 §4): the
// values more than one page shows, read from the page files that already
// carry them, so there is one source until SITE is first published.

import type { SiteSettings } from "@/features/site-content/site-content.types";
import { contact } from "./contact";
import { home } from "./home";

export const site: SiteSettings = {
  name: contact.footer.name,
  role: contact.footer.role,
  email: contact.email.address,
  footerNote: home.footer.note,
  copyright: contact.footer.copyright,
};
