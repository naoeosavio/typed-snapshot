import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  Result,
  describeSnapshotError,
  writeTypedVariableToFile,
} from "../dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("Testando escrita com Result...");

const result = await writeTypedVariableToFile({
  type: "string[]",
  data: ["test1", "test2", "test3"],
  variableName: "TestArray",
  outputPath: join(__dirname, "test-writefilesync.ts"),
  typeFormat: "asconst",
  includeTimestamp: false,
});

Result.match(result, {
  done: async () => {
    console.log("Sucesso! Arquivo gerado: test-writefilesync.ts");
    const fs = await import("fs");
    const content = fs.readFileSync(
      join(__dirname, "test-writefilesync.ts"),
      "utf8",
    );
    console.log("\nConteúdo do arquivo:");
    console.log(content);
  },
  fail: (error) =>
    console.error(`Erro [${error.kind}]: ${describeSnapshotError(error)}`),
});
