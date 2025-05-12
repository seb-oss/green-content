const fs = require("fs");
const path = require("path");

const COMPONENTS_DIR = "components";
const GENERATED_DIR = "generated";

async function processComponentContent(filename) {
  const componentName = path.basename(filename, ".json");
  console.log(`Processing: ${componentName}`);

  try {
    const inputPath = path.join(COMPONENTS_DIR, filename);
    const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    const outputDir = path.join(GENERATED_DIR, componentName);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, `${componentName}.content.json`),
      JSON.stringify(contentData, null, 2)
    );
  } catch (error) {
    console.error(`Error processing ${componentName}:`, error);
  }
}

async function main() {
  if (!fs.existsSync(COMPONENTS_DIR)) {
    console.error("Components directory not found!");
    process.exit(1);
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const files = fs
    .readdirSync(COMPONENTS_DIR)
    .filter((file) => file.endsWith(".json"));

  await Promise.all(files.map(processComponentContent));
  console.log("Processing completed!");
}

main().catch(console.error);
