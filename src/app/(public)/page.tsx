import { draftMode } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { AutoplayVideo } from "@/components/media/AutoplayVideo";
import { JustifiedRows } from "@/components/media/JustifiedRows";
import { PreviewBanner, PreviewIssue } from "@/components/preview/PreviewBanner";
import { getCurrentAdmin } from "@/features/authentication/current-admin";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import type { HomeContent } from "@/features/site-content/site-content.types";
import styles from "./home.module.css";

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
  return <HomeView content={await gateway.getHome()} />;
}

// Implements docs/design/prototypes/home/Home Baseline v2 Responsive.dc.html.
// Source order is visual order at every width: nothing is reordered, hidden or
// moved between breakpoints. The footer is site chrome rather than a block, so
// it sits outside <main>; only Home's prototype carries one so far.
function HomeView({ content }: { content: HomeContent }) {
  const { hero, identity, wall, about, coda, footer } = content;
  const [mailbox, domain] = footer.email.split("@");

  return (
    <div className={styles.home}>
      <main>
        <figure className={styles.hero}>
          <Image
            className={styles.media}
            src={hero.poster.src}
            alt={hero.poster.alt}
            fill
            unoptimized
            preload
          />
          <AutoplayVideo className={styles.media} src={hero.video} mode="AUTOPLAY_AMBIENT" />
          <figcaption className={styles.heroCaption}>{hero.caption}</figcaption>
        </figure>

        <section className={styles.identity}>
          <div className={styles.displayBox}>
            <h1 className={styles.display}>{identity.display}</h1>
          </div>
          <p className={styles.lead}>{identity.lead}</p>
          <p className={styles.aside}>{identity.aside}</p>
        </section>

        <section className={styles.gallery}>
          <h2 className={styles.label}>{wall.label}</h2>
          <div className={styles.wall}>
            {wall.items.map(({ poster, video }) => (
              <div key={poster.src} className={styles.cell}>
                <Image className={styles.media} src={poster.src} alt={poster.alt} fill unoptimized />
                {video && <AutoplayVideo className={styles.media} src={video} mode="AUTOPLAY_VISIBLE" />}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.about}>
          <div className={styles.aboutText}>
            <p className={styles.aboutBody}>{about.text}</p>
            <p className={styles.aboutMore}>
              <Link href={about.more.href}>{about.more.label}</Link>
            </p>
          </div>
          <div className={styles.portrait}>
            <Image
              src={about.portrait.src}
              width={about.portrait.width}
              height={about.portrait.height}
              alt={about.portrait.alt}
              unoptimized
            />
          </div>
        </section>

        <section className={styles.gallery}>
          <h2 className={styles.label}>{coda.label}</h2>
          <JustifiedRows id="home-coda" items={coda.items} />
        </section>
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
