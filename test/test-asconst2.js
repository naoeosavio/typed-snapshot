import {
  Result,
  describeSnapshotError,
  generateAsConstFromArray,
  generateAsConstMaybeFromArray,
  generateEnumFromArray,
  generateInterfaceFromArray,
  generateTypeFromArray,
  generateTypeMaybeFromArray,
} from "../dist/index.js";

const show = (label, result) => {
  console.log(`${label}:`);
  Result.match(result, {
    done: (code) => console.log(code),
    fail: (error) => console.error(`FALHOU [${error.$}] ${describeSnapshotError(error)}`),
  });
  console.log();
};

console.log("Teste 1 - Tokens:");
const tokens = ["BNB", "BTC", "USDT", "ETH", "LTC", "TRX", "XRP", "NEO"];
show("asconst", generateAsConstFromArray(tokens, "Token"));
show("enum", generateEnumFromArray(tokens, "Token"));
show("type", generateTypeFromArray(tokens, "Symbol"));
show("interface", generateInterfaceFromArray(tokens, "TokenData"));

console.log("Teste 2 - Números:");
const numbers = [1, 2, 3, 4, 5];
show("asconst", generateAsConstFromArray(numbers, "Numbers"));
show("enum", generateEnumFromArray(numbers, "Numbers"));
show("type", generateTypeFromArray(numbers, "Numbers"));
show("interface", generateInterfaceFromArray(numbers, "Numbers"));

console.log("Teste 3 - Strings com caracteres especiais:");
const specialStrings = ["item-1", "item_2", "3item", "@item"];
show("asconst", generateAsConstFromArray(specialStrings, "SpecialItems"));
show("enum", generateEnumFromArray(specialStrings, "SpecialItems"));
show("type", generateTypeFromArray(specialStrings, "SpecialItems"));
show("interface", generateInterfaceFromArray(specialStrings, "SpecialItems"));

console.log("Teste 4 - Casos de falha:");
show("array vazio", generateAsConstFromArray([], "Empty"));
show("não-array", generateEnumFromArray("nope", "NotArray"));
show("nome inválido", generateTypeFromArray(["A"], "1nvalid Name"));

console.log("Teste 5 - Maybe (asconst-maybe e type-maybe):");
show("asconst-maybe tokens", generateAsConstMaybeFromArray(tokens, "Token"));
show("type-maybe symbols", generateTypeMaybeFromArray(["BTCUSDT", "ETHUSDT"], "Symbol"));
show("asconst-maybe números", generateAsConstMaybeFromArray(numbers, "Numbers"));
show(
  "asconst-maybe falha c/ objeto",
  generateAsConstMaybeFromArray(["OK", { bad: true }], "Mixed"),
);
show("type-maybe falha c/ null", generateTypeMaybeFromArray(["A", null], "WithNull"));


