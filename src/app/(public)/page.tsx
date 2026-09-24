import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { AutoplayVideo } from "@/components/media/AutoplayVideo";
import { JustifiedRows } from "@/components/media/JustifiedRows";
import { PreviewBanner, PreviewIssue } from "@/components/preview/PreviewBanner";
import { getCurrentAdmin } from "@/features/authentication/current-admin";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import type { HomeContent, HomeSection } from "@/features/site-content/site-content.types";
import { homeStructuredData, openGraph } from "@/lib/site-metadata";
import styles from "./home.module.css";

// The description is the published identity lead, the page's own words; the
// share image is the hero's poster (3D-10).
export async function generateMetadata(): Promise<Metadata> {
  const { sections } = await getContentGateway().getHome();
  const identity = sections.find((section) => section.kind === "identity");
  const hero = sections.find((section) => section.kind === "hero");
  return {
    ...(identity ? { description: identity.lead } : {}),
    alternates: { canonical: "/" },
    openGraph: openGraph("/", { image: hero?.poster }),
  };
}

// Home is static. Only in preview mode, for a signed-in admin, does it read
// cookies and render the working copy instead (ADR-0012).
export default async function HomePage() {
  const gateway = getContentGateway();
  if ((await draftMode()).isEnabled && (await getCurrentAdmin()).admin) {
    const { value, issue } = await gateway.previewHome();
    return (
      <>
        {value ? <HomeView content={value} /> : <PreviewIssue issue={issue!} />}
        <PreviewBanner path="/" />
      </>
    );
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeStructuredData() }} />
      <HomeView content={await gateway.getHome()} />
    </>
  );
}

// Implements docs/design/prototypes/home/Home Baseline v2 Responsive.dc.html.
// Source order is visual order at every width: nothing is reordered, hidden or
// moved between breakpoints. Home is an ordered composition of its closed
// sections (ADR-0018), each drawn exactly as the prototype draws it. The
// footer is site chrome rather than a block, so it sits outside <main>; only
// Home's prototype carries one so far.
function HomeView({ content }: { content: HomeContent }) {
  const { sections, footer } = content;
  const [mailbox, domain] = footer.email.split("@");
  // Each frames section needs its own rows token; the first keeps the one the
  // page has always used.
  const framesToken = new Map<number, string>();
  sections.forEach((section, i) => {
    if (section.kind === "frames") framesToken.set(i, framesToken.size ? `home-coda-${framesToken.size + 1}` : "home-coda");
  });

  return (
    <div className={styles.home}>
      <main>
        {sections.map((section, i) => {
          switch (section.kind) {
            case "hero":
              return <Hero key={i} hero={section} />;
            case "identity":
              return (
                <section key={i} className={styles.identity}>
                  <div className={styles.displayBox}>
                    <h1 className={styles.display}>{section.display}</h1>
                  </div>
                  <p className={styles.lead}>{section.lead}</p>
                  <p className={styles.aside}>{section.aside}</p>
                </section>
              );
            case "wall":
              return (
                <section key={i} className={styles.gallery}>
                  <h2 className={styles.label}>{section.label}</h2>
                  <div className={styles.wall}>
                    {section.items.map(({ poster, video }) => (
                      <div key={poster.src} className={styles.cell}>
                        <Image className={styles.media} src={poster.src} alt={poster.alt} fill unoptimized />
                        {video && <AutoplayVideo className={styles.media} src={video} mode="AUTOPLAY_VISIBLE" />}
                      </div>
                    ))}
                  </div>
                </section>
              );
            case "about":
              return (
                <section key={i} className={styles.about}>
                  <div className={styles.aboutText}>
                    <p className={styles.aboutBody}>{section.text}</p>
                    <p className={styles.aboutMore}>
                      <Link href={section.more.href}>{section.more.label}</Link>
                    </p>
                  </div>
                  <div className={styles.portrait}>
                    <Image
                      src={section.portrait.src}
                      width={section.portrait.width}
                      height={section.portrait.height}
                      alt={section.portrait.alt}
                      unoptimized
                    />
                  </div>
                </section>
              );
            case "frames":
              return (
                <section key={i} className={styles.gallery}>
                  <h2 className={styles.label}>{section.label}</h2>
                  <JustifiedRows id={framesToken.get(i)!} items={section.items} />
                </section>
              );
          }
        })}
      </main>

      <footer className={styles.footer}>
        <div className={styles.contact}>
          {/* A column too narrow for the address breaks it after the @, never
              inside a word. */}
          <a className={styles.email} href={`mailto:${footer.email}`}>
            {mailbox}@<wbr />
            {domain}
          </a>
          <p className={styles.note}>{footer.note}</p>
        </div>
        <nav className={styles.footerNav} aria-label="Footer">
          {footer.links.map(({ href, label }) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}

function Hero({ hero }: { hero: Extract<HomeSection, { kind: "hero" }> }) {
  return (
    <figure className={styles.hero}>
      <Image className={styles.media} src={hero.poster.src} alt={hero.poster.alt} fill unoptimized preload />
      <AutoplayVideo className={styles.media} src={hero.video} mode="AUTOPLAY_AMBIENT" />
      <figcaption className={styles.heroCaption}>{hero.caption}</figcaption>
    </figure>
  );
}
