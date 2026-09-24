import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/features/authentication/current-admin";
import styles from "../studio.module.css";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const { admin, databaseUnavailable } = await getCurrentAdmin();
  if (admin) redirect("/admin");
  return (
    <main className={styles.signIn}>
      <div className={styles.signInCard}>
        <h1>Studio</h1>
        <p className={styles.hint}>Sign in to edit the portfolio.</p>
        {databaseUnavailable ? (
          <p className={styles.notice}>
            The Studio needs a database. Set <code>DATABASE_URL</code>, run <code>npm run db:migrate</code>, then create an
            admin with <code>npm run db:seed-admin</code>.
          </p>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
