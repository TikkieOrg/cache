const fs = require("fs");
const path = require("path");

const bundles = ["restore", "save", "restore-only", "save-only"].map(name =>
    path.join(__dirname, "..", "dist", name, "index.js")
);
const backslash = "\\";
const vulnerable = `part.replace(/"/g, '${backslash.repeat(2)}"')`;
const hardened = `part.replace(/${backslash.repeat(2)}/g, "${backslash.repeat(4)}").replace(/"/g, '${backslash.repeat(2)}"')`;

for (const bundle of bundles) {
    const source = fs.readFileSync(bundle, "utf8");
    const vulnerableMatches = source.split(vulnerable).length - 1;
    const hardenedMatches = source.split(hardened).length - 1;
    if (vulnerableMatches === 0 && hardenedMatches === 1) {
        continue;
    }
    if (vulnerableMatches !== 1 || hardenedMatches !== 0) {
        throw new Error(
            `Expected one Smithy quoteHeader implementation in ${bundle}, found ${vulnerableMatches} vulnerable and ${hardenedMatches} hardened matches`
        );
    }
    fs.writeFileSync(bundle, source.replace(vulnerable, hardened));
}
