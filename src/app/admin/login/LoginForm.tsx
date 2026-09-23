"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiRequestError, describeError } from "../_components/api";
import styles from "../studio.module.css";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("POST", "/auth/login", { email: form.get("email"), password: form.get("password") });
      router.replace("/admin/projects");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError && caught.code === "INVALID_CREDENTIALS"
          ? "The email or password is incorrect."
          : describeError(caught),
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 20, display: "grid", gap: 12 }}>
      <label className={styles.field}>
        <span>Email</span>
        <input className={styles.input} name="email" type="email" autoComplete="username" required maxLength={320} />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input className={styles.input} name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
