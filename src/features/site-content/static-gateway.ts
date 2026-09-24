import { about } from "@/content/about";
import { contact } from "@/content/contact";
import { home } from "@/content/home";
import { projectDetails } from "@/content/projects";
import { works } from "@/content/works";
import type { ContentGateway, HomeContent, HomeTemplate, ProjectDetail } from "./site-content.types";
import { staticProjectContent } from "./static-project-blocks";

// Serves the content committed with the code (src/content/*) unchanged. Works
// order is array order, which stands for displayPosition.
// The committed Home as sections, in the prototype's order (ADR-0018).
export function homeFromTemplate(template: HomeTemplate): HomeContent {
  return {
    sections: [
      { kind: "hero", ...template.hero },
      { kind: "identity", ...template.identity },
      { kind: "wall", ...template.wall },
      { kind: "about", ...template.about },
      { kind: "frames", ...template.coda },
    ],
    footer: template.footer,
  };
}

export const staticGateway: ContentGateway = {
  async getHome() {
    return homeFromTemplate(home);
  },

  async getWorksIndex() {
    return works;
  },

  async getProjectPage(slug) {
    const { projects } = works;
    const index = projects.findIndex((project) => project.slug === slug);
    if (index < 0) return null;
    const { title, year, cover } = projects[index];
    const next = projects[(index + 1) % projects.length];
    const detail = projectDetails[slug] ?? null;
    return {
      slug,
      title,
      year,
      cover,
      displayPosition: index,
      ...staticProjectContent(year, cover, detail),
      next: { slug: next.slug, title: next.title },
    };
  },

  async listPublicProjectSlugs() {
    return works.projects.map((project) => project.slug);
  },

  async getAbout() {
    return about;
  },

  async getContact() {
    return contact;
  },

  async listProjectRoutes() {
    return { public: works.projects.map((project) => project.slug), private: [] };
  },

  async findProjectRoute(slug) {
    return works.projects.some((project) => project.slug === slug) ? "public" : null;
  },

  // The committed content has no private projects and no drafts.
  async findPrivateProject() {
    return null;
  },

  async getPrivateProjectPage() {
    return null;
  },

  async previewProjectPage(slug) {
    return { value: await staticGateway.getProjectPage(slug), issue: null };
  },

  async previewHome() {
    return { value: homeFromTemplate(home), issue: null };
  },

  // The committed content has no albums (ADR-0019).
  async getAlbumsIndex() {
    return { collections: [] };
  },

  async getAlbumPage() {
    return null;
  },

  async listPublicAlbumSlugs() {
    return [];
  },

  async findAlbumRoute() {
    return false;
  },

  async previewAlbumPage() {
    return { value: null, issue: null };
  },

  async previewAbout() {
    return { value: about, issue: null };
  },

  async previewContact() {
    return { value: contact, issue: null };
  },
};

// The committed Home in its authored shape, for the import.
export function staticHomeTemplate(): HomeTemplate {
  return home;
}

// The committed Project Detail content in its authored shape, for the import
// (scripts/lib/static-import.ts), which stores it as blocks.
export function staticProjectDetail(slug: string): ProjectDetail | null {
  return projectDetails[slug] ?? null;
}
