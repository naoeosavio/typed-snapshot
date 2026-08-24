import { generateAsConstFromArray } from "../dist/index.js";

const tokens = ["BNB", "BTC", "USDT", "ETH", "LTC", "TRX", "XRP", "NEO"];
const result = generateAsConstFromArray(tokens, "Token");
console.log(result);
