// @ts-check
import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

const utilityMap = {
  p: "padding",
  pt: "padding-top",
  pr: "padding-right",
  pb: "padding-bottom",
  pl: "padding-left",
  px: ["padding-left", "padding-right"],
  py: ["padding-top", "padding-bottom"],
  m: "margin",
  mt: "margin-top",
  mr: "margin-right",
  mb: "margin-bottom",
  ml: "margin-left",
  mx: ["margin-left", "margin-right"],
  my: ["margin-top", "margin-bottom"],
  //text: "font-size",
  gap: "gap",
  "gap-x": "column-gap",
  "gap-y": "row-gap",
};

const TWScreenSizes = [24, 160];
const TWSpacing = 0.25;

// function clampSpacing(start: string | number, end: string | number) {
//   return `clamp(calc(var(--spacing) * ${start}), 1vw + calc(var(--spacing) * ${start} / 2), calc(var(--spacing) * ${end}))`;
// }

function clampSpacing(start: string | number, end: string | number) {
  const [ minScreen, maxScreen ] = TWScreenSizes;
  const minRem = Number(start) * TWSpacing;
  const maxRem = Number(end) * TWSpacing;
  const slope = (maxRem - minRem) / (maxScreen - minScreen) * 100;
  const intercept = minRem - (slope / 100) * minScreen;

  const slopeFixed = slope.toFixed(2);
  const interceptFixed = intercept.toFixed(2);
  const minFixed = minRem.toFixed(2);
  const maxFixed = maxRem.toFixed(2);

  return `clamp(${minFixed}rem, ${interceptFixed}rem + ${slopeFixed}vw, ${maxFixed}rem)`;
}

function generateClass(
  variant: string,
  prefix: keyof typeof utilityMap,
  start: string | number,
  end: string | number,
) {
  const cssProps = utilityMap[prefix];
  if (!cssProps) return `/* Unsupported utility: ${prefix} */`;

  const className =
    `.\\~${prefix}-${start.toString().replace("/", "\\/")}/${end}`.replace(
      "/",
      "\\/",
    );
  const selector = variant ? `.${variant}\\:${className.slice(1)}` : className;

  const value = clampSpacing(start, end);

  const styleBlock = Array.isArray(cssProps)
    ? cssProps.map((p) => `  ${p}: ${value};`).join("\n")
    : `  ${cssProps}: ${value};`;

  return `${selector} {\n${styleBlock}\n}`;
}

function scanClassesFromFiles(root: string) {
  const pattern = /(?:\b([\w-]+):)?~([a-z-]+)-(\d+)\/(\d+)/g;
  const found = new Set();

  const files = globSync(`${root}/**/*.{astro,svg}`);
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [, variant = "", prefix, start, end] = match;
        found.add(`${variant}|${prefix}|${start}|${end}`);
      }
    } catch {}
  }
  return (Array.from(found) as string[]).map((entry: string) =>
    entry.split("|"),
  );
}

function main() {
  const matches = scanClassesFromFiles(".") as [
    string,
    keyof typeof utilityMap,
    string | number,
    string | number,
  ][];
  let output = "@layer utilities {\n";
  for (const [variant, prefix, start, end] of matches) {
    output += generateClass(variant, prefix, start, end) + "\n";
  }
  output += "}\n";
  writeFileSync("src/styles/generated-fluid.css", output);
  console.log(
    `✅ generated-fluid.css written with ${matches.length} utilities.`,
  );
}

main();
