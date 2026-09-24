// Who owns a composition (ADR-0007): a project, or a keyed page. The composer
// is the same for both; the owner decides the API path and which blocks may
// be offered — Home is built only from its closed sections (ADR-0018).

export type ComposerOwner = { kind: "project" | "page"; path: string };

export const projectOwner = (projectId: string): ComposerOwner => ({ kind: "project", path: `/projects/${projectId}` });

export const HOME_OWNER: ComposerOwner = { kind: "page", path: "/pages/HOME" };
