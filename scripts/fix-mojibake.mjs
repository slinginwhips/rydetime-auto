// One-off: repair cp1252 mojibake introduced by a PowerShell rewrite of page.tsx.
import fs from "fs";

const p = "./src/app/page.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace(/^﻿/, "");
s = s.replace(/â€”/g, "—"); // "â€”" -> em dash
s = s.replace(/â†’/g, "→"); // "â†’" -> right arrow
fs.writeFileSync(p, s);

const leftovers = [...new Set((s.match(/[^\x00-\x7F]/g) || []))].filter(
  (c) => !"—→’".includes(c)
);
console.log("fixed; unexpected non-ascii remaining:", JSON.stringify(leftovers));
