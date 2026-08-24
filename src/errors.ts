import type { TypeFormat } from "./types";

/**
 * Errors that can occur while generating TypeScript code from data.
 *
 * Tagged union — inspect `$` to branch on the failure cause.
 */
export type GenerationError =
  | { $: "not-array"; received: string }
  | { $: "empty-data" }
  | { $: "no-valid-items"; format: TypeFormat }
  | { $: "invalid-name"; name: string };

/**
 * Errors that can occur while writing a snapshot file.
 *
 * Includes every {@link GenerationError} plus IO and validation failures.
 */
export type SnapshotError =
  | GenerationError
  | { $: "invalid-output-path"; path: string }
  | { $: "io"; cause: unknown };

/**
 * Human-readable description for any {@link SnapshotError}.
 */
export function describeSnapshotError(error: SnapshotError): string {
  switch (error.$) {
    case "not-array":
      return `expected an array, received ${error.received}`;
    case "empty-data":
      return "data array is empty";
    case "no-valid-items":
      return `no valid string/number items for '${error.format}' emission`;
    case "invalid-name":
      return `'${error.name}' is not a valid TypeScript identifier`;
    case "invalid-output-path":
      return `'${error.path}' is not a valid output path`;
    case "io":
      return `failed to write file: ${String(error.cause)}`;
  }
}
