export type TypeFormat = "plain" | "enum" | "type";

export type WriteTypedVariableOptions = {
  /** TypeScript type to assign to the exported constant (e.g. "MyType" or "string") */
  type: string;
  /** Data that will be serialised to the file */
  data: unknown;
  /** Name of the constant / enum / type to export */
  variableName: string;
  /** Output file path (relative or absolute) */
  outputPath: string;
  /** If provided, add an import type line from this path */
  importPath?: string;
  /** Name of the type imported from importPath */
  importTypeName?: string;
  /** Adds an ISO timestamp comment at the top (default true) */
  includeTimestamp?: boolean;
  /** How to emit arrays: plain const, enum, or union type */
  typeFormat?: TypeFormat;
};
