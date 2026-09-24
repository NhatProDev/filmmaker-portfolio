"use client";

import { api } from "../../../../_components/api";
import {
  ChooseMediaButton,
  ContentFieldEditor,
  LinkEditor,
  ParagraphsEditor,
  PlacementEditor,
  PlacementList,
} from "../../../../_components/composition";
import studio from "../../../../studio.module.css";
import { configOf, presetOf, type Block } from "./blockInfo";
import styles from "./composer.module.css";

// Editors for Home's closed sections (ADR-0018). Each keeps its section's
// structure: the texts, link and portrait of a section are edited in place,
// never added to or moved out of it.

const col = (colStart: number, colSpan: number) => ({ placement: { desktop: { colStart, colSpan } } });

export function HomeSectionEditor({ block }: { block: Block }) {
  const preset = presetOf(block);
  if (block.type === "HERO") return <HeroEditor block={block} />;
  if (preset === "homeIdentity") return <IdentityEditor block={block} />;
  if (preset === "homeAbout") return <AboutTeaserEditor block={block} />;
  if (preset === "homeWall") {
    return (
      <div className={styles.stack}>
        <p className={studio.hint}>Stills and silent loops that play while visible: three across, two on tablets and phones. Designed for nine tiles.</p>
        <ContentFieldEditor key={`label-${block.updatedAt}`} block={block} field="label" label="Label" max={200} />
        <PlacementList block={block} types={["IMAGE", "VIDEO"]} addLabel="Add a tile" />
      </div>
    );
  }
  if (block.type === "GALLERY" && configOf(block).mode === "JUSTIFIED_ROWS") {
    return (
      <div className={styles.stack}>
        <p className={studio.hint}>Stills in justified rows, at their own proportions.</p>
        <ContentFieldEditor key={`label-${block.updatedAt}`} block={block} field="label" label="Label" max={200} />
        <PlacementList block={block} types={["IMAGE"]} addLabel="Add a still" />
      </div>
    );
  }
  return <p className={studio.notice}>This block has no place on Home, so Home cannot be published while it is visible. Delete it or hide it.</p>;
}

function HeroEditor({ block }: { block: Block }) {
  return (
    <div className={styles.stack}>
      <p className={studio.hint}>A silent ambient film across the top, over its poster, with a short caption. It always opens the page.</p>
      {block.media[0] ? (
        <PlacementEditor key={block.media[0].id + block.updatedAt} blockId={block.id} item={block.media[0]} replaceTypes={["VIDEO"]} />
      ) : (
        <div className={studio.row}>
          <ChooseMediaButton label="Choose film" title="Choose the hero film" types={["VIDEO"]} primary onSelect={(media) => api("POST", `/blocks/${block.id}/media`, { mediaId: media.id })} />
        </div>
      )}
      <ContentFieldEditor key={block.updatedAt} block={block} field="caption" label="Caption" max={300} />
    </div>
  );
}

function IdentityEditor({ block }: { block: Block }) {
  return (
    <div className={styles.stack}>
      <p className={studio.hint}>The page&apos;s name in display type, a lead sentence and an aside. Home shows it once.</p>
      {block.children.map((child, i) => (
        <ParagraphsEditor key={child.updatedAt} block={child} labels={[["Display", "Lead", "Aside"][i] ?? "Text"]} multiline={[i > 0]} />
      ))}
    </div>
  );
}

function AboutTeaserEditor({ block }: { block: Block }) {
  const [body, more, portrait] = block.children;
  return (
    <div className={styles.stack}>
      <p className={studio.hint}>A paragraph, a link on to About, and a portrait.</p>
      {body && <ParagraphsEditor key={body.updatedAt} block={body} labels={["Paragraph"]} multiline={[true]} />}
      {more && <LinkEditor key={more.updatedAt} block={more} />}
      {portrait?.media[0] ? (
        <PlacementEditor key={portrait.media[0].id + portrait.updatedAt} blockId={portrait.id} item={portrait.media[0]} replaceTypes={["IMAGE"]} />
      ) : (
        <div className={studio.row}>
          <ChooseMediaButton
            label="Choose portrait"
            title="Choose the portrait"
            types={["IMAGE"]}
            onSelect={async (media) => {
              const target = portrait ?? (await api<Block>("POST", "/pages/HOME/blocks", { type: "IMAGE", parentBlockId: block.id, position: 2, config: col(10, 3) }));
              await api("POST", `/blocks/${target.id}/media`, { mediaId: media.id });
            }}
          />
        </div>
      )}
    </div>
  );
}
