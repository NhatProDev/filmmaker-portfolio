import type { ReactNode } from "react";
import { requireAdmin } from "@/features/authentication/current-admin";
import { StudioNav } from "../_components/StudioNav";
import styles from "../studio.module.css";

// Every page in this group needs a signed-in admin; the check runs on the
// server for each request.
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <StudioNav email={admin.email} />
      <main className={styles.main}>{children}</main>
    </>
  );
}
