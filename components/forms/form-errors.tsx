"use client";

/* Field errors from a server action, available to every <Field name="…">
 * below the provider without prop drilling. The action returns
 * `fieldErrors: Record<string, string[]>` (z.flattenError shape). */

import * as React from "react";

export type FieldErrors = Partial<Record<string, string[] | undefined>>;

const FieldErrorsContext = React.createContext<FieldErrors>({});

export function FieldErrorsProvider({
  errors,
  children,
}: {
  errors: FieldErrors | undefined;
  children: React.ReactNode;
}) {
  return (
    <FieldErrorsContext.Provider value={errors ?? {}}>{children}</FieldErrorsContext.Provider>
  );
}

/** First error message for `name`, or undefined. */
export function useFieldError(name: string | undefined): string | undefined {
  const errors = React.useContext(FieldErrorsContext);
  return name ? errors[name]?.[0] : undefined;
}
