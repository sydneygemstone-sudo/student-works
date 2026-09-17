import fs from "fs";

const world = fs.readFileSync("./data/world.json", "utf-8");
const quests = fs.readFileSync("./data/quests.json", "utf-8");
const locEn = fs.readFileSync("./data/locale.en.json", "utf-8");
const locZh = fs.readFileSync("./data/locale.zh.json", "utf-8");

function stripImportsExports(code) {
  return code
    .replace(/^import\s+.*?;?\s*$/gm, "")
    .replace(/^export\s+(class|const|function|let|var)\s+/gm, "$1 ")
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, "");
}

const audioCode = stripImportsExports(fs.readFileSync("./src/audio.js", "utf-8"));
const saveCode = stripImportsExports(fs.readFileSync("./src/save.js", "utf-8"));
const inputCode = stripImportsExports(fs.readFileSync("./src/input.js", "utf-8"));
const stateCode = stripImportsExports(fs.readFileSync("./src/state.js", "utf-8"));
const worldCode = stripImportsExports(fs.readFileSync("./src/world.js", "utf-8"));
const puppyCode = stripImportsExports(fs.readFileSync("./src/puppy.js", "utf-8"));
const questsCode = stripImportsExports(fs.readFileSync("./src/quests.js", "utf-8"));
const renderCode = stripImportsExports(fs.readFileSync("./src/render.js", "utf-8"));
let mainCode = stripImportsExports(fs.readFileSync("./src/main.js", "utf-8"));

// Replace fetch in mainCode to gracefully fallback to embedded data
const fetchReplacement = `
    const EMBEDDED_WORLD = ${world};
    const EMBEDDED_QUESTS = ${quests};
    const EMBEDDED_LOCALE_EN = ${locEn};
    const EMBEDDED_LOCALE_ZH = ${locZh};

    let worldConfig, questsConfig, localeEn, localeZh;
    try {
      if (typeof location !== 'undefined' && location.protocol !== 'file:') {
        [worldConfig, questsConfig, localeEn, localeZh] = await Promise.all([
          fetch("./data/world.json").then(r => r.json()),
          fetch("./data/quests.json").then(r => r.json()),
          fetch("./data/locale.en.json").then(r => r.json()),
          fetch("./data/locale.zh.json").then(r => r.json())
        ]);
      } else {
        throw new Error('file protocol');
      }
    } catch (e) {
      worldConfig = EMBEDDED_WORLD;
      questsConfig = EMBEDDED_QUESTS;
      localeEn = EMBEDDED_LOCALE_EN;
      localeZh = EMBEDDED_LOCALE_ZH;
    }
`;

mainCode = mainCode.replace(/\/\/ 1\. Fetch data[\s\S]*?fetch\("\.\/data\/locale\.zh\.json"\)\.then\(r => r\.json\(\)\)\s*\]\);/, fetchReplacement);

const bundleContent = `/**
 * Adventure World - Standalone Bundle
 * Universal support for both HTTP server and file:// offline browser launch.
 */
(function() {
${audioCode}
${saveCode}
${inputCode}
${stateCode}
${worldCode}
${puppyCode}
${questsCode}
${renderCode}
${mainCode}
})();
`;

fs.writeFileSync("./bundle.js", bundleContent, "utf-8");
console.log("bundle.js generated successfully! Size:", bundleContent.length, "bytes");
