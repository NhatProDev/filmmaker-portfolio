import { about } from "@/content/about";
import { contact } from "@/content/contact";
import { home } from "@/content/home";
import { projectDetails } from "@/content/projects";
import { works } from "@/content/works";
import type { ContentGateway } from "./site-content.types";

// Serves the content committed with the code (src/content/*) unchanged. Works
// order is array order, which stands for displayPosition.
export const staticGateway: ContentGateway = {
  async getHome() {
    return home;
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
    return {
      slug,
      title,
      year,
      cover,
      displayPosition: index,
      detail: projectDetails[slug] ?? null,
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
};
