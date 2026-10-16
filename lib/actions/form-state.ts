/* Shared shapes for server actions used with useActionState. No "use server"
 * here (a "use server" module may only export async functions), so client
 * components can import these types and helpers too. */

export type FieldErrors = Partial<Record<string, string[]>>;

export type FormState = {
  /** The last submit succeeded. */
  ok?: boolean;
  /** ISO time of the last successful save. */
  savedAt?: string;
  /** A message not tied to one field. */
  error?: string;
  fieldErrors?: FieldErrors;
  /** Free-form result data (e.g. a created id, a one-time password token). */
  data?: Record<string, string | undefined>;
};

export const initialFormState: FormState = {};
