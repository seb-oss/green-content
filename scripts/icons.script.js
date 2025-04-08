const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const chalk = require("chalk"); // Add this dependency
require("dotenv").config({ path: ".env.local" });

// ========== CONFIGURATION ==========
const GENERATED_DIR = path.join("generated");
const SCHEMAS_DIR = path.join("schemas");
const ICONS_DIR = path.join(GENERATED_DIR, "icons");

const FIGMA_ICONS_PROJECT_ID = process.env.FIGMA_ICONS_PROJECT_ID;
const FIGMA_ACCESS_KEY = process.env.FIGMA_ACCESS_KEY;

// Initialize JSON Schema validator with formats
const ajv = new Ajv();
addFormats(ajv);

// Helper function for progress logging
function createProgressLog(total) {
  return (current) => {
    const percentage = Math.round((current / total) * 100);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(
      `Progress: ${current}/${total} (${percentage}%) icons completed`
    );
  };
}

// Helper function for icon details logging
function logIconDetails(icon) {
  console.log("\n" + chalk.cyan("Icon Details:"));
  console.table({
    Name: icon.displayName,
    Category: icon.meta.categories[0],
    Dimensions: `${icon.meta.width}x${icon.meta.height}`,
    ViewBox: icon.meta.viewBox,
    Tags: icon.meta.tags.join(", "),
  });
}

// Helper function to convert name to kebab case for key
const toKebabCase = (str) => {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

// Helper function to create a framework config
const createFrameworkConfig = (name) => ({
  path: `@sebgroup/green-core/icon/${name}`,
  import: `import '@sebgroup/green-core/icon/${name}.js'`,
  component: `<gds-icon-${name}></gds-icon-${name}>`,
});

async function main() {
  try {
    console.log(chalk.blue("🚀 Starting icon generation process..."));

    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
      console.log(chalk.green("✓ Created icons directory"));
    }

    const validate = loadSchema();
    console.log(chalk.green("✓ Loaded schema"));

    const url = `https://api.figma.com/v1/files/${FIGMA_ICONS_PROJECT_ID}`;
    console.log(chalk.yellow("⚡ Fetching Figma file..."));
    const { data } = await axios.get(url, {
      headers: { "X-Figma-Token": FIGMA_ACCESS_KEY },
    });

    const regularFrame = data.document.children[0].children.find(
      (frame) => frame.name === "Regular" && frame.type === "FRAME"
    );

    const solidFrame = data.document.children[0].children.find(
      (frame) => frame.name === "Solid" && frame.type === "FRAME"
    );

    if (regularFrame && solidFrame) {
      const iconsObject = {};
      const regularIcons = new Map();
      const solidIcons = new Map();

      // Count total icons
      const totalRegularIcons = regularFrame.children.reduce(
        (acc, category) =>
          acc +
          (category.children?.reduce(
            (sum, child) => sum + (child.children?.length || 0),
            0
          ) || 0),
        0
      );

      console.log(
        chalk.blue(`\nFound ${totalRegularIcons} regular icons to process`)
      );

      // Process Regular icons
      console.log(chalk.yellow("\n📦 Processing Regular icons..."));
      let processedRegular = 0;
      const updateRegularProgress = createProgressLog(totalRegularIcons);

      for (const category of regularFrame.children) {
        const categoryName = category.name;
        console.log(chalk.cyan(`\nProcessing category: ${categoryName}`));

        const subFrames = category.children?.filter(
          (child) =>
            child.type === "FRAME" &&
            child.name.toLowerCase() === category.name.toLowerCase()
        );

        if (subFrames && subFrames.length > 0) {
          for (const frame of subFrames) {
            if (frame.children) {
              const nodeIds = frame.children.map((icon) => icon.id);
              const svgs = await fetchSVGs(nodeIds);

              frame.children.forEach((icon) => {
                const svg = svgs.find((s) => s.node === icon.id);
                regularIcons.set(icon.name, {
                  svg: svg?.svg || "",
                  id: icon.id,
                  category: categoryName,
                  width: svg?.width || 24,
                  height: svg?.height || 24,
                  viewBox: svg?.viewBox || "0 0 24 24",
                  tags: icon.children
                    ? icon.children.map((child) => child.name)
                    : [],
                });
                processedRegular++;
                updateRegularProgress(processedRegular);
              });
            }
          }
        }
      }

      // Process Solid icons with similar logging
      console.log(chalk.yellow("\n\n📦 Processing Solid icons..."));
      let processedSolid = 0;

      for (const category of solidFrame.children) {
        console.log(chalk.cyan(`\nProcessing category: ${category.name}`));

        const subFrames = category.children?.filter(
          (child) =>
            child.type === "FRAME" &&
            child.name.toLowerCase() === category.name.toLowerCase()
        );

        if (subFrames && subFrames.length > 0) {
          for (const frame of subFrames) {
            if (frame.children) {
              const nodeIds = frame.children.map((icon) => icon.id);
              const svgs = await fetchSVGs(nodeIds);

              frame.children.forEach((icon) => {
                const svg = svgs.find((s) => s.node === icon.id);
                solidIcons.set(icon.name, {
                  svg: svg?.svg || "",
                  id: icon.id,
                  width: svg?.width || 24,
                  height: svg?.height || 24,
                  viewBox: svg?.viewBox || "0 0 24 24",
                });
                processedSolid++;
              });
            }
          }
        }
      }

      // Combine Regular and Solid icons
      console.log(chalk.yellow("\n🔄 Generating final icon objects..."));
      let iconCount = 0;

      for (const [name, regularData] of regularIcons) {
        const iconKey = toKebabCase(name);
        const solidData = solidIcons.get(name);

        iconsObject[iconKey] = {
          id: iconKey,
          displayName: name,
          fileName: `${iconKey}.svg`,
          urlPath: iconKey,
          variants: {
            regular: regularData.svg,
            solid: solidData?.svg || "",
          },
          static: {
            regular: `https://raw.githubusercontent.com/seb-oss/green/refs/heads/main/libs/core/src/components/icon/assets/regular/${iconKey}.svg`,
            solid: `https://raw.githubusercontent.com/seb-oss/green/refs/heads/main/libs/core/src/components/icon/assets/solid/${iconKey}.svg`,
          },
          meta: {
            description: "",
            categories: [regularData.category],
            tags: regularData.tags,
            width: regularData.width || 24,
            height: regularData.height || 24,
            viewBox: regularData.viewBox || "0 0 24 24",
          },
          framework: {
            web: createFrameworkConfig(iconKey),
            react: {
              ...createFrameworkConfig(iconKey),
              import: `import { Icon${name.replace(
                /\s+/g,
                ""
              )} } from '@sebgroup/green-react/icon/${iconKey}'`,
              component: `<Icon${name.replace(/\s+/g, "")}></Icon${name.replace(
                /\s+/g,
                ""
              )}>`,
            },
            angular: createFrameworkConfig(iconKey),
          },
        };

        iconCount++;
        if (iconCount % 10 === 0) {
          // Log details every 10 icons to avoid cluttering
          logIconDetails(iconsObject[iconKey]);
        }
      }

      // Validate and save
      console.log(chalk.yellow("\n✨ Validating generated icons..."));
      if (!validate(iconsObject)) {
        console.error(chalk.red("\n❌ Validation failed:"), validate.errors);
        return;
      }
      console.log(chalk.green("✓ Validation successful"));

      const outputPath = path.join(ICONS_DIR, "icons.json");
      fs.writeFileSync(outputPath, JSON.stringify(iconsObject, null, 2));

      // Final summary
      console.log(
        chalk.green(`\n✅ Successfully generated icons file at: ${outputPath}`)
      );
      console.log("\nGeneration Summary:");
      console.table({
        "Regular Icons": processedRegular,
        "Solid Icons": processedSolid,
        "Total Icons": Object.keys(iconsObject).length,
        "File Size": `${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`,
      });
    }
  } catch (error) {
    console.error(chalk.red("\n❌ Error:"), error.message);
    if (error.response) {
      console.error(chalk.red("Response status:"), error.response.status);
      console.error(chalk.red("Response data:"), error.response.data);
    }
  }
}

main();
