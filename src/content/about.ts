// About Me is content-file managed in V1 (CLAUDE.md §19): its copy is committed
// with the code, not stored in the CMS.
//
// Every string below is reproduced verbatim from the approved prototype,
// docs/design/prototypes/about/About Me 3B v2 Responsive.dc.html. It is the
// prototype's provisional copy, not final publication copy
// (page-specifications.md §4.8). The email address is prototype copy that
// docs/design/prototypes/contact/MEDIA.md records as invented.
//
// Images are local-only copies of media/w/ under public/media/about/, which is
// gitignored like /media/ itself. A fresh clone must restore them by hand.

import type { Inline } from "@/features/site-content/site-content.types";
import { mediaUrl } from "@/lib/storage/media-url";

export const about = {
  marker: "About me",
  lead: "I started shooting weddings to pay for a camera, and stayed for the part where nobody is performing.",
  portrait: {
    image: {
      src: mediaUrl("about/portrait.jpg"),
      width: 970,
      height: 1505,
      alt: "Nguyen Khanh Nhat",
    },
    caption: "Hanoi, 2025",
  },
  biography: [
    "Most of my work is documentary and commercial — tailors, kitchens, courts, workshops. I shoot with one camera and available light where it serves the frame, and I grade my own material, because the grade is where the intent either survives or it does not.",
    "Before this I cut other people's footage for three years, which is the best training there is for knowing what you actually need to shoot — and how little of it that usually is.",
  ],
  evidence: {
    image: {
      src: mediaUrl("about/desk-01.jpg"),
      width: 1000,
      height: 563,
      alt: "",
    },
    caption: "Grading at home, second pass",
    answer:
      "The grade happens here, usually at night, usually twice. The first pass is for the story; the second is for the parts of the room the camera got wrong.",
  },
  process: {
    line: "I photograph a room before I light it. Most of the time the room has already solved it.",
    image: {
      src: mediaUrl("about/mtm-atelier.jpg"),
      width: 1800,
      height: 882,
      alt: "",
    },
    caption: "The tailor's workroom, before the lights went in",
  },
  // A documented publication gap, kept as a designed placeholder: the on-set
  // operating frame does not exist yet.
  placeholder: {
    label: "Image to come — on set",
    caption: "Placeholder, not imagery",
    line: "I work small and close, usually alone, occasionally with a gaffer when the room is bigger than the light.",
  },
  experience: {
    heading: "Selected experience",
    rows: [
      { year: "2026", text: ["DP and colourist — ", { em: "Made to Measure" }, ", Trần & Sons"] },
      { year: "2025", text: ["DP — ", { em: "Court" }, ", Nike Vietnam"] },
      { year: "2024", text: ["Editor and colourist — freelance, Hanoi"] },
      { year: "2019", text: ["First paid shoot"] },
    ] satisfies { year: string; text: Inline[] }[],
  },
  contact: {
    availability: "Open to work through early 2027. Hanoi, and anywhere the flight is justified.",
    email: "hello@khanhnhat.film",
  },
};
