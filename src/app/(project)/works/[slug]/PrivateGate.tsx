"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import styles from "./gate.module.css";

// The private project gate (Private Gate 5B, ADR-0003). It knows only the
// address it is on: no project object is passed in, fetched or derived, so
// nothing of the project can reach the render before access is granted. The
// password is checked by the server, which answers with a signed HttpOnly
// cookie; the client never validates, counts or stores anything.

type State = "idle" | "submitting" | "invalid" | "rateLimited" | "unavailable" | "handoff";

const MESSAGES: Partial<Record<State, string>> = {
  invalid: "That password does not open this work. Check it and try again.",
  rateLimited: "Too many attempts. Please wait and try again.",
  unavailable: "This work cannot be opened right now. Please try again later.",
};

const HANDOFF_MS = 260;

export function PrivateGate({ slug }: { slug: string }) {
  const [state, setState] = useState<State>("idle");
  const [shown, setShown] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const message = MESSAGES[state];
  const busy = state === "submitting";
  const locked = busy || state === "handoff";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    const password = input.current?.value ?? "";
    if (!password) {
      input.current?.focus();
      return;
    }
    setState("submitting");
    let status = 0;
    try {
      const response = await fetch(`/api/v1/public/projects/${encodeURIComponent(slug)}/access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "same-origin",
      });
      status = response.status;
    } catch {
      status = 0;
    }
    if (status === 204) {
      setState("handoff");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // The same address now renders the project: the access cookie routes it.
      window.setTimeout(() => window.location.replace(window.location.href), reduced ? 0 : HANDOFF_MS);
      return;
    }
    setState(status === 401 ? "invalid" : status === 429 ? "rateLimited" : "unavailable");
    window.requestAnimationFrame(() => input.current?.focus());
  }

  return (
    <div className={`${styles.gate} ${state === "handoff" ? styles.handoff : ""} ${message ? styles.failed : ""}`}>
      <div className={styles.veil} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          Nguyen Khanh Nhat
        </Link>
        <nav className={styles.nav} aria-label="Site">
          <Link href="/works">Works</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>

      <main className={styles.content}>
        <div className={styles.datum} />
        <div className={styles.spine}>
          <span className={styles.eyebrow}>Private project</span>
          <h1 className={styles.heading}>This work is password protected.</h1>
          <p className={styles.lede}>
            Enter the access password you were given. It applies to this work only, and is not an account.
          </p>

          <form className={styles.form} onSubmit={submit} noValidate>
            <label className={styles.label} htmlFor={inputId}>
              Access password
            </label>
            <div className={styles.field}>
              <input
                ref={input}
                id={inputId}
                className={styles.input}
                name="project-access"
                type={shown ? "text" : "password"}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={200}
                readOnly={locked}
                aria-invalid={state === "invalid"}
                aria-describedby={message ? errorId : undefined}
                onChange={() => {
                  // Typing clears a message; it never implies a check.
                  if (message) setState("idle");
                }}
              />
              <div className={styles.revealRow}>
                <button
                  type="button"
                  className={styles.reveal}
                  aria-pressed={shown}
                  onClick={() => {
                    setShown(!shown);
                    input.current?.focus();
                  }}
                >
                  {shown ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {message && (
              <p id={errorId} className={styles.error} role="alert">
                {message}
              </p>
            )}

            <div className={styles.actions}>
              <button type="submit" className={styles.submit} disabled={locked} aria-busy={busy}>
                {busy ? "Checking…" : "Enter"}
              </button>
              <Link href="/works" className={styles.escape}>
                Back to works
              </Link>
            </div>
          </form>
        </div>
        <div className={styles.tail} />
      </main>

      <footer className={styles.footer}>
        <p className={styles.foot}>Access is granted for this work only.</p>
      </footer>
    </div>
  );
}
