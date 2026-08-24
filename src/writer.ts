import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { done, fail, Maybe, Result } from "lite-fp";

import type { GenerationError, SnapshotError } from "./errors";
import {
  emitTypedConst,
  generateAsConstFromArray,
  generateEnumFromArray,
  generateInterfaceFromArray,
  generateTypeFromArray,
  isValidIdentifier,
  validateName,
} from "./generators";
import type { WriteTypedVariableOptions } from "./types";

/**
 * Generate the complete TypeScript file content (pure, no IO).
 *
 * @param options - Validated generation options
 * @returns Result with the full file content, or a GenerationError
 */
export function generateContent(
  options: WriteTypedVariableOptions,
): Result<string, GenerationError> {
  const parts: string[] = ["// Auto-generated file – DO NOT EDIT"];

  if (options.includeTimestamp) {
    parts.push(`// Last updated: ${new Date().toISOString()}`);
  }

  pushImportLine(parts, options);

  const body =
    options.typeFormat === "plain"
      ? Result.map(validateName(options.variableName), (name) =>
          emitTypedConst(
            name,
            options.type,
            JSON.stringify(options.data, null, 2),
          ),
        )
      : generateArrayBody(options);

  return Result.map(body, (code) => `${[...parts, code].join("\n")}\n`);
}

/**
 * Generate and write a TypeScript file with typed exports.
 *
 * Creates a TypeScript file containing typed constants, enums, union types,
 * `as const` objects, or interfaces based on the provided data. All failures —
 * invalid names, wrong shapes, empty arrays and filesystem errors — are
 * reported through the returned {@link Result} instead of throwing.
 *
 * @param options - Configuration options for file generation
 * @param options.type - TypeScript type annotation for the exported constant
 * @param options.data - Data to serialize to the file
 * @param options.variableName - Name of the constant/enum/type/interface to export
 * @param options.outputPath - File path where the TypeScript file will be written
 * @param options.importPath - Optional path for type imports
 * @param options.importTypeName - Optional type name to import
 * @param options.includeTimestamp - Whether to include a timestamp comment (default: true)
 * @param options.typeFormat - Format for array data (default: 'plain')
 * @returns Promise resolving to Done(void) on success or Fail(SnapshotError)
 *
 * @example
 * ```typescript
 * const result = await writeTypedVariableToFile({
 *   type: '{ base: string; total: number }',
 *   data: { base: 'USDT', total: 123.4567 },
 *   variableName: 'PORTFOLIO_SALDO',
 *   outputPath: './data/portfolio_saldo.ts',
 * });
 *
 * Result.match(result, {
 *   done: () => console.log('snapshot written'),
 *   fail: (error) => console.error(error.$),
 * });
 * ```
 */
export function writeTypedVariableToFile(
  options: WriteTypedVariableOptions,
): Promise<Result<void, SnapshotError>> {
  const normalized: WriteTypedVariableOptions = {
    includeTimestamp: true,
    typeFormat: "plain",
    ...options,
  };

  const content = Result.flatMap(validateOptions(normalized), generateContent);

  return Result.match(content, {
    fail: (error) => Promise.resolve(fail(error)),
    done: (code) => persist(normalized.outputPath, code),
  });
}

/**
 * Emit an optional `import type` line when both path and type name exist.
 *
 * Uses {@link Maybe} because an absent import is normal, not an error: only
 * when BOTH `importPath` and `importTypeName` are present does a line appear.
 *
 * @param parts - Accumulating output lines
 * @param options - Generation options
 */
function pushImportLine(
  parts: string[],
  options: WriteTypedVariableOptions,
): void {
  const header = Maybe.map(
    Maybe.zip(
      Maybe.fromNullable(options.importPath),
      Maybe.fromNullable(options.importTypeName),
    ),
    ([importPath, importTypeName]) =>
      `import type { ${importTypeName} } from '${importPath}';`,
  );

  const line = Maybe.getOrElse(header, "");
  if (line !== "") parts.push(line);
}

/**
 * Build the body code for every non-plain {@link TypeFormat}.
 *
 * @param options - Generation options (data must be an array)
 * @returns Result with the body code, or a GenerationError
 */
function generateArrayBody(
  options: WriteTypedVariableOptions,
): Result<string, GenerationError> {
  switch (options.typeFormat) {
    case "enum":
      return generateEnumFromArray(options.data, options.variableName);
    case "type":
      return generateTypeFromArray(options.data, options.variableName);
    case "asconst":
      return generateAsConstFromArray(options.data, options.variableName);
    case "interface":
      return generateInterfaceFromArray(options.data, options.variableName);
    default:
      return generateEnumFromArray(options.data, options.variableName);
  }
}

/**
 * Validate caller-supplied options before generating anything.
 *
 * @param options - Raw options with defaults applied
 * @returns Done(options) or Fail describing the first problem found
 */
function validateOptions(
  options: WriteTypedVariableOptions,
): Result<WriteTypedVariableOptions, SnapshotError> {
  if (!isValidIdentifier(options.variableName)) {
    return fail({ $: "invalid-name", name: String(options.variableName) });
  }
  if (
    typeof options.outputPath !== "string" ||
    options.outputPath.trim() === ""
  ) {
    return fail({
      $: "invalid-output-path",
      path: String(options.outputPath),
    });
  }
  return done(options);
}

/**
 * Ensure the destination directory exists and write the file.
 *
 * Any thrown error (mkdir/write/permission/ENOSPC…) is captured into a Fail
 * with its original value under `cause` instead of propagating.
 *
 * @param outputPath - Destination file path
 * @param content - Full TypeScript file content
 * @returns Promise resolving to Done(void) or Fail(io)
 */
async function persist(
  outputPath: string,
  content: string,
): Promise<Result<void, SnapshotError>> {
  try {
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    await writeFile(outputPath, content, "utf8");
    return done(undefined);
  } catch (cause) {
    return fail({ $: "io", cause });
  }
}
