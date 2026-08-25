/**
 * typed-snapshot — generate typed TypeScript snapshots to disk.
 *
 * Every public function returns a {@link Result} from `lite-fp` instead of
 * throwing: `Done` carries the generated code (or `void` after writing),
 * `Fail` carries a typed {@link SnapshotError} describing what went wrong.
 */

export {
  type Done,
  done,
  type Fail,
  fail,
  Result,
} from "lite-fp";

export {
  describeSnapshotError,
  type GenerationError,
  type SnapshotError,
} from "./errors";
export {
  emitTypedConst,
  generateAsConstFromArray,
  generateAsConstMaybeFromArray,
  generateEnumFromArray,
  generateInterfaceFromArray,
  generateTypeFromArray,
  generateTypeMaybeFromArray,
  isMaybeFormat,
  isValidIdentifier,
  MAYBE_IMPORT,
} from "./generators";
export type { TypeFormat, WriteTypedVariableOptions } from "./types";
export { generateContent, writeTypedVariableToFile } from "./writer";
