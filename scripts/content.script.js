// content.script.js
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

    // Write the full component data
    fs.writeFileSync(
      path.join(outputDir, `${componentName}.content.json`),
      JSON.stringify(contentData, null, 2)
    );

    // Return metadata for index
    return {
      title: contentData.title,
      slug: contentData.slug,
      summary: contentData.summary,
      path: `${componentName}/${componentName}.content.json`,
    };
  } catch (error) {
    console.error(`Error processing ${componentName}:`, error);
    return null;
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

  const componentsData = await Promise.all(files.map(processComponentContent));

  // Create index.json with all available resources
  const index = {
    api: {
      version: "1.0.0",
      baseUrl: "https://api.seb.io",
      lastUpdated: new Date().toISOString(),
      resources: {
        components: {
          list: "components.json",
          items: componentsData
            .filter((component) => component !== null)
            .map((component) => ({
              ...component,
              endpoints: {
                content: component.path,
                images: `${component.slug}/${component.slug}.images.json`,
              },
            })),
        },
        icons: {
          list: "icons/icons.json",
        },
        images: {
          components: componentsData
            .filter((component) => component !== null)
            .map((component) => ({
              component: component.slug,
              path: `${component.slug}/${component.slug}.images.json`,
            })),
        },
      },
    },
  };

  // Write index.json
  fs.writeFileSync(
    path.join(GENERATED_DIR, "index.json"),
    JSON.stringify(index, null, 2)
  );

  // Write components.json
  const componentsIndex = {
    components: componentsData.filter((component) => component !== null),
    total: componentsData.filter((component) => component !== null).length,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(GENERATED_DIR, "components.json"),
    JSON.stringify(componentsIndex, null, 2)
  );

  console.log("Processing completed!");
}

main().catch(console.error);
