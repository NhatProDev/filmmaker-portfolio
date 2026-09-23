"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "./api";
import styles from "../studio.module.css";

const LINKS = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/home", label: "Home page" },
  { href: "/admin/media", label: "Media" },
];

export function StudioNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await api("POST", "/auth/logout").catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className={styles.bar}>
      <span className={styles.brand}>Studio</span>
      <nav className={styles.nav} aria-label="Studio">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className={styles.barMeta}>
        <a href="/" target="_blank" rel="noreferrer" style={{ color: "#d6d3d1" }}>
          View site ↗
        </a>
        <span>{email}</span>
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={signOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
