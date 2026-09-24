"use client";

import type { BlockDto } from "@/features/project-builder/composition.mapper";
import type { PublicationDto } from "@/features/projects/project.mapper";
import { api } from "../../_components/api";
import {
  ContentFieldEditor,
  ErrorLine,
  LinkEditor,
  NewParagraphs,
  ParagraphsEditor,
  PlacementEditor,
  PlacementList,
  Slot,
  ChooseMediaButton,
} from "../../_components/composition";
import { PublishingPanel } from "../../_components/PublishingPanel";
import { useAction } from "../../_components/useAction";
import styles from "../../studio.module.css";

// The Home page (ADR-0007) as the five slots its locked template renders, in
// order: hero, identity, wall, About teaser, coda. Every slot is required, so
// slots are edited, never hidden or removed; presets are closed (ADR-0013).

type SlotKey = "hero" | "identity" | "wall" | "about" | "coda";
const ORDER: SlotKey[] = ["hero", "identity", "wall", "about", "coda"];

const cfg = (block: BlockDto) => block.config as { preset?: string; mode?: string };

function slotOf(block: BlockDto): SlotKey | null {
  if (block.type === "HERO") return "hero";
  if (block.type === "GRID" && cfg(block).preset === "homeIdentity") return "identity";
  if (block.type === "GALLERY" && cfg(block).preset === "homeWall") return "wall";
  if (block.type === "GRID" && cfg(block).preset === "homeAbout") return "about";
  if (block.type === "GALLERY" && cfg(block).mode === "JUSTIFIED_ROWS") return "coda";
  return null;
}

const col = (colStart: number, colSpan: number) => ({ placement: { desktop: { colStart, colSpan } } });
const text = (role: string, value: string, placement: object) => ({
  type: "TEXT",
  content: { kind: "richText", paragraphs: [[value]] },
  config: { role, ...placement },
});

export function HomeEditor({ blocks, publication }: { blocks: BlockDto[]; publication: PublicationDto }) {
  const { run, pending, error } = useAction();
  const find = (key: SlotKey) => blocks.find((block) => slotOf(block) === key) ?? null;
  const positionFor = (key: SlotKey) =>
    blocks.filter((block) => {
      const slot = slotOf(block);
      return slot !== null && ORDER.indexOf(slot) < ORDER.indexOf(key);
    }).length;
  const create = (body: object) => api<BlockDto>("POST", "/pages/HOME/blocks", body);
  const child = (parentBlockId: string, body: object) =>
    api<BlockDto>("POST", "/pages/HOME/blocks", { ...body, parentBlockId });
  const unplaced = blocks.filter((block) => !slotOf(block));

  const hero = find("hero");
  const identity = find("identity");
  const wall = find("wall");
  const about = find("about");
  const coda = find("coda");

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Home page</h1>
          <p className={styles.hint}>The site&apos;s front page, in the order visitors see it. The footer is fixed site chrome.</p>
        </div>
      </div>

      <PublishingPanel publication={publication} basePath="/pages/HOME" previewHref="/api/v1/pages/HOME/preview" canUnpublish={false} live="/" />

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Page composition</h2>
        </div>
        <div className={styles.panelBody}>
          <Slot
            number={1}
            title="Hero"
            description="A silent ambient film across the top, over its poster, with a short caption."
            block={hero}
            fixed
            absentAction={
              <ChooseMediaButton
                label="Add hero"
                title="Choose the hero film"
                types={["VIDEO"]}
                onSelect={async (media) => {
                  const block = await create({
                    type: "HERO",
                    position: positionFor("hero"),
                    config: { playback: { mode: "AUTOPLAY_AMBIENT" }, fit: "COVER" },
                  });
                  await api("POST", `/blocks/${block.id}/media`, { mediaId: media.id });
                }}
              />
            }
          >
            {hero?.media[0] ? (
              <PlacementEditor key={hero.media[0].id + hero.updatedAt} blockId={hero.id} item={hero.media[0]} replaceTypes={["VIDEO"]} />
            ) : (
              hero && (
                <div className={styles.row} style={{ marginTop: 8 }}>
                  <ChooseMediaButton
                    label="Choose film"
                    title="Choose the hero film"
                    types={["VIDEO"]}
                    primary
                    onSelect={(media) => api("POST", `/blocks/${hero.id}/media`, { mediaId: media.id })}
                  />
                </div>
              )
            )}
            {hero && <ContentFieldEditor key={hero.updatedAt} block={hero} field="caption" label="Caption" max={300} />}
          </Slot>

          <Slot
            number={2}
            title="Identity"
            description="The display name, a lead sentence and an aside."
            block={identity}
            fixed
            absentAction={null}
          >
            {identity &&
              identity.children.map((childBlock, i) => (
                <ParagraphsEditor
                  key={childBlock.updatedAt}
                  block={childBlock}
                  labels={[["Display", "Lead", "Aside"][i] ?? "Text"]}
                  multiline={[i > 0]}
                />
              ))}
          </Slot>
          {!identity && (
            <NewParagraphs
              labels={["Display", "Lead", "Aside"]}
              multiline={[false, true, true]}
              submitLabel="Create identity"
              onCreate={async ([display, lead, aside]) => {
                const grid = await create({ type: "GRID", position: positionFor("identity"), config: { preset: "homeIdentity" } });
                await child(grid.id, text("display", display, col(1, 12)));
                await child(grid.id, text("lead", lead, col(1, 5)));
                await child(grid.id, text("aside", aside, col(9, 4)));
              }}
            />
          )}

          <Slot
            number={3}
            title="Wall"
            description="A grid of stills and silent loops that play while visible: three across, two on tablets and phones. Designed for nine tiles."
            block={wall}
            fixed
            absentAction={
              <button
                type="button"
                className={`${styles.button} ${styles.small}`}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    create({
                      type: "GALLERY",
                      position: positionFor("wall"),
                      config: {
                        mode: "VIDEO_GRID",
                        columns: { desktop: 3, tablet: 2, mobile: 2 },
                        playback: { mode: "AUTOPLAY_VISIBLE" },
                        fit: "COVER",
                        preset: "homeWall",
                      },
                    }),
                  )
                }
              >
                Add wall
              </button>
            }
          >
            {wall && (
              <>
                <ContentFieldEditor key={`label-${wall.updatedAt}`} block={wall} field="label" label="Label" max={200} />
                <PlacementList block={wall} types={["IMAGE", "VIDEO"]} addLabel="Add a tile" />
              </>
            )}
          </Slot>

          <Slot
            number={4}
            title="About teaser"
            description="A paragraph, a link on to About, and a portrait."
            block={about}
            fixed
            absentAction={null}
          >
            {about && (
              <>
                {about.children[0] && (
                  <ParagraphsEditor key={about.children[0].updatedAt} block={about.children[0]} labels={["Paragraph"]} multiline={[true]} />
                )}
                {about.children[1] && <LinkEditor key={about.children[1].updatedAt} block={about.children[1]} />}
                {about.children[2]?.media[0] ? (
                  <PlacementEditor
                    key={about.children[2].media[0].id + about.children[2].updatedAt}
                    blockId={about.children[2].id}
                    item={about.children[2].media[0]}
                    replaceTypes={["IMAGE"]}
                  />
                ) : (
                  <div className={styles.row} style={{ marginTop: 8 }}>
                    <ChooseMediaButton
                      label="Choose portrait"
                      title="Choose the portrait"
                      types={["IMAGE"]}
                      onSelect={async (media) => {
                        const portrait = about.children[2] ?? (await child(about.id, { type: "IMAGE", position: 2, config: col(10, 3) }));
                        await api("POST", `/blocks/${portrait.id}/media`, { mediaId: media.id });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </Slot>
          {!about && (
            <NewParagraphs
              labels={["Paragraph", "Link text", "Link to"]}
              multiline={[true, false, false]}
              submitLabel="Create About teaser"
              onCreate={async ([body, linkText, href]) => {
                const grid = await create({ type: "GRID", position: positionFor("about"), config: { preset: "homeAbout" } });
                await child(grid.id, text("body", body, col(1, 6)));
                await child(grid.id, {
                  type: "TEXT",
                  content: { kind: "richText", paragraphs: [[{ link: { href, text: linkText } }]] },
                  config: { role: "more", ...col(1, 6) },
                });
              }}
            />
          )}

          <Slot
            number={5}
            title="Coda"
            description="Stills in justified rows at the foot of the page."
            block={coda}
            fixed
            absentAction={
              <button
                type="button"
                className={`${styles.button} ${styles.small}`}
                disabled={pending}
                onClick={() => run(() => create({ type: "GALLERY", position: positionFor("coda"), config: { mode: "JUSTIFIED_ROWS" } }))}
              >
                Add coda
              </button>
            }
          >
            {coda && (
              <>
                <ContentFieldEditor key={`label-${coda.updatedAt}`} block={coda} field="label" label="Label" max={200} />
                <PlacementList block={coda} types={["IMAGE"]} addLabel="Add a still" />
              </>
            )}
          </Slot>

          {unplaced.length > 0 && (
            <div className={styles.notice}>
              {unplaced.length} block(s) do not fit the Home template and would stop it from publishing.
              <div className={styles.row} style={{ marginTop: 8 }}>
                {unplaced.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    className={`${styles.button} ${styles.small} ${styles.danger}`}
                    disabled={pending}
                    onClick={() => run(() => api("DELETE", `/blocks/${block.id}`))}
                  >
                    Remove {block.type.toLowerCase()} block
                  </button>
                ))}
              </div>
            </div>
          )}
          <ErrorLine error={error} />
        </div>
      </section>
    </>
  );
}
