"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Eyebrow from "@/components/ui/Eyebrow";
import { BUDGET_OPTIONS } from "@/content/pricing";

const ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? "";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Progressive enhancement, not a JS-only form.
 *
 * With JS disabled this is a plain browser POST to Formspree and it works —
 * that is the whole reason for Formspree here. With JS enabled we intercept,
 * post the same payload with `Accept: application/json`, and swap the form
 * for a mono confirmation. No API route, no server.
 */
export default function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!ENDPOINT) return; // no endpoint configured: fall through to the native POST
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (response.ok) {
        setStatus("sent");
        return;
      }

      const payload: unknown = await response.json().catch(() => null);
      const fieldErrors =
        payload && typeof payload === "object" && "errors" in payload
          ? (payload as { errors?: { field?: string; message?: string }[] }).errors
          : undefined;

      if (fieldErrors && fieldErrors.length > 0) {
        setErrorMessage(
          fieldErrors
            .map((item) => [item.field, item.message].filter(Boolean).join(": "))
            .join(" · "),
        );
      } else {
        setErrorMessage(
          `The form service rejected this with status ${response.status}. Send the same message to hello@swipeandscale.studio and it will reach me.`,
        );
      }
      setStatus("error");
    } catch {
      setErrorMessage(
        "The request never left your browser. Check your connection and press Send again, or email hello@swipeandscale.studio.",
      );
      setStatus("error");
    }
  }

  return (
    <section
      id="contact"
      className="bg-void px-[var(--gutter)] py-[var(--stack-lg)]"
      aria-labelledby="contact-heading"
    >
      <Eyebrow className="text-bone/70">CONTACT</Eyebrow>
      <h2 id="contact-heading" className="display mt-[clamp(1rem,2vh,1.75rem)] text-h2 text-bone">
        Tell me what you're building.
      </h2>
      <p className="prose mt-[clamp(1rem,2vh,1.5rem)] text-body text-bone/80">
        A few sentences is enough. If it's a fit, I'll reply within two business days
        with a price and a start date. If it isn't, I'll tell you that instead.
      </p>

      <div className="mt-[var(--stack-md)] max-w-[46rem]">
        {status === "sent" ? (
          <p
            role="status"
            className="mono rule py-[clamp(1.5rem,3vh,2.5rem)] text-bone"
          >
            SENT · I'LL REPLY WITHIN TWO BUSINESS DAYS.
          </p>
        ) : (
          <form
            action={ENDPOINT}
            method="POST"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-[clamp(1.5rem,3vh,2.25rem)] sm:grid-cols-2"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="contact-name" className="mono text-bone/70">
                NAME
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="field"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact-email" className="mono text-bone/70">
                EMAIL
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="field"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact-company" className="mono text-bone/70">
                COMPANY
              </label>
              <input
                id="contact-company"
                name="company"
                type="text"
                autoComplete="organization"
                className="field"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contact-budget" className="mono text-bone/70">
                BUDGET
              </label>
              <select id="contact-budget" name="budget" defaultValue="" className="field">
                <option value="" disabled>
                  Select one
                </option>
                {BUDGET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label htmlFor="contact-message" className="mono text-bone/70">
                MESSAGE
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                required
                className="field"
              />
            </div>

            <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center">
              <Button type="submit" variant="solid" disabled={status === "sending"}>
                {status === "sending" ? "Sending" : "Send"}
              </Button>
              <div role="status" aria-live="polite">
                {status === "error" ? (
                  <p className="prose text-body text-bone">{errorMessage}</p>
                ) : (
                  <p className="mono text-bone/70">REPLY WITHIN TWO BUSINESS DAYS</p>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
