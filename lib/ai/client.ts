/* The Anthropic client for the Locator AI features. This is the only file in
 * the repo that reads ANTHROPIC_API_KEY (scripts/verify.sh enforces it). */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";

export const LOCATOR_MODEL = process.env.LOCATOR_AI_MODEL?.trim() || "claude-opus-5-5";

/** True when the server has an Anthropic key; the UI shows a "not configured" line otherwise. */
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | null = null;

/** Shared client: 60 s per request, one retry. Throws when no key is configured. */
export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  client ??= new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
  return client;
}

/* The "not configured" lines name the env var, so they live here too (verify.sh
 * flags any other file that mentions it). */
export const AI_NOT_CONFIGURED_IMPORT = "AI import isn't configured on this server (ANTHROPIC_API_KEY).";
export const AI_NOT_CONFIGURED_CHECK = "AI checks aren't configured on this server (ANTHROPIC_API_KEY).";
