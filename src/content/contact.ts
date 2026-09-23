// Contact is static in V1 (CLAUDE.md §19): its copy is committed with the code.
// There is no form, API or table behind it.
//
// Every string below is reproduced verbatim from the approved prototype,
// docs/design/prototypes/contact/Contact 4B v2 Responsive.dc.html. It is
// prototype copy, not publication fact (page-specifications.md §5.6,
// contact-4b-v2-responsive.md §14): the address, both handles and their links,
// the location, travel and availability wording, the reply-time promise, and
// the identity still with its caption are all placeholders.
//
// The identity still is borrowed from Art Works. It is a local-only copy of
// media/w/mtm-shopfront.jpg under public/media/contact/, which is gitignored
// like /media/ itself. A fresh clone must restore it by hand.

import type { ContactIdentity, ContactRow } from "@/features/site-content/site-content.types";
import { mediaUrl } from "@/lib/storage/media-url";

export const contact = {
  heading: "Contact",
  statement:
    "Open to commissions and collaborations through early 2027 — documentary, commercial, and the occasional thing nobody can categorise.",
  email: {
    label: "Email",
    address: "hello@khanhnhat.film",
    reply: "Usually answered within two days.",
  },
  rows: [
    { label: "Instagram", value: "@khanhnhat.film", href: "#" },
    { label: "Vimeo", value: "vimeo.com/khanhnhat", href: "#" },
    { label: "Based", value: "Hanoi, Vietnam · GMT+7" },
    { label: "Travel", value: "Regional, with notice" },
  ] satisfies ContactRow[],
  note: "A line about the room and the light in it is more useful to me than a brief. I read everything.",
  // Optional: the page is valid without it (contact-4b-v2-responsive.md §7).
  identity: {
    image: {
      src: mediaUrl("contact/mtm-shopfront.jpg"),
      width: 1000,
      height: 497,
      alt: "",
    },
    caption: "Provisional identity media — caption to come",
  } as ContactIdentity | null,
  footer: {
    name: "Nguyen Khanh Nhat",
    role: "— cinematography and photography",
    copyright: "© 2026",
  },
};
