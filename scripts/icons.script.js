const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
require("dotenv").config({ path: ".env.local" });

/* Logging */

function createProgressLog(total) {
  return (current, type) => {
    const percentage = Math.round((current / total) * 100);
    console.log(`🔄 Progress (${type}): ${current}/${total} (${percentage}%)`);
  };
}

function logIconDetails(icon, index, total) {
  console.log(`\n📦 Processing Icon ${index}/${total}`);
  console.table({
    "Basic Info": {
      Name: icon.displayName,
      ID: icon.id,
      Category: icon.meta.categories[0],
      "File Name": icon.fileName,
    },
    Dimensions: {
      Width: icon.meta.width,
      Height: icon.meta.height,
      ViewBox: icon.meta.viewBox,
    },
  });

  if (icon.meta.tags.length > 0) {
    console.log("🏷️  Tags:", icon.meta.tags.join(", "));
  }
}

function logCategoryProcessing(category, iconCount) {
  console.log(`\n📁 Category: ${category} (${iconCount} icons)`);
}

function logSummary(regularCount, solidCount, totalIcons, fileSize) {
  console.log("\n📊 Generation Summary");
  console.table({
    "Regular Icons": regularCount,
    "Solid Icons": solidCount,
    "Total Icons": totalIcons,
    "File Size": `${(fileSize / 1024).toFixed(2)} KB`,
  });
}

// ========== CONFIGURATION ==========
const GENERATED_DIR = path.join("generated");
const SCHEMAS_DIR = path.join("schemas");
const ICONS_DIR = path.join(GENERATED_DIR, "icons");

const FIGMA_ICONS_PROJECT_ID = process.env.FIGMA_ICONS_PROJECT_ID;
const FIGMA_ACCESS_KEY = process.env.FIGMA_ACCESS_KEY;

// Initialize JSON Schema validator with formats
const ajv = new Ajv();
addFormats(ajv);

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

// Fetch SVGs from Figma
// Fetch SVGs from Figma
async function fetchSVGs(nodeIds) {
  try {
    const idsParam = nodeIds.join(",");
    const url = `https://api.figma.com/v1/images/${FIGMA_ICONS_PROJECT_ID}/?ids=${idsParam}&format=svg`;
    const { data: imageData } = await axios.get(url, {
      headers: { "X-Figma-Token": FIGMA_ACCESS_KEY },
    });

    const svgPromises = Object.entries(imageData.images).map(
      async ([nodeId, imageUrl]) => {
        try {
          const { data: svgContent } = await axios.get(imageUrl);

          // Extract width, height, and viewBox from the SVG tag
          const widthMatch = svgContent.match(/width="(\d+)"/);
          const heightMatch = svgContent.match(/height="(\d+)"/);
          const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);

          // Extract the path content from SVG
          const pathMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
          let pathContent = pathMatch ? pathMatch[1].trim() : null;

          // Replace color values with currentColor
          if (pathContent) {
            pathContent = pathContent
              .replace(/fill=\"#[0-9A-Fa-f]{3,6}\"/g, 'fill="currentColor"')
              .replace(/fill=\"rgb\([^\)]+\)\"/g, 'fill="currentColor"')
              .replace(/stroke=\"#[0-9A-Fa-f]{3,6}\"/g, 'stroke="currentColor"')
              .replace(/stroke=\"rgb\([^\)]+\)\"/g, 'stroke="currentColor"');
          }

          return {
            node: nodeId,
            svg: pathContent,
            width: widthMatch ? parseInt(widthMatch[1]) : 24,
            height: heightMatch ? parseInt(heightMatch[1]) : 24,
            viewBox: viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24",
          };
        } catch (err) {
          console.error(`Error fetching SVG for node ${nodeId}:`, err.message);
          return {
            node: nodeId,
            svg: null,
            width: 24,
            height: 24,
            viewBox: "0 0 24 24",
          };
        }
      }
    );
    return await Promise.all(svgPromises);
  } catch (error) {
    console.error("Error fetching SVGs from Figma:", error.message);
    return [];
  }
}

// Load and validate schema
function loadSchema() {
  try {
    const schemaPath = path.join(SCHEMAS_DIR, "icon.schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    return ajv.compile(schema);
  } catch (error) {
    console.error("Error loading schema:", error);
    process.exit(1);
  }
}

async function main() {
  try {
    console.log("🚀 Starting icon generation process...");

    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
      console.log("✨ Created icons directory");
    }

    const validate = loadSchema();
    console.log("✅ Schema loaded successfully");

    const url = `https://api.figma.com/v1/files/${FIGMA_ICONS_PROJECT_ID}`;
    console.log("📡 Fetching Figma file...");
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

      console.log(`\n🎯 Found ${totalRegularIcons} regular icons to process`);
      let processedRegular = 0;
      const updateProgress = createProgressLog(totalRegularIcons);

      // Process Regular icons
      console.log("\n🔄 Processing Regular icons...");
      for (const category of regularFrame.children) {
        const categoryName = category.name;
        const subFrames = category.children?.filter(
          (child) =>
            child.type === "FRAME" &&
            child.name.toLowerCase() === category.name.toLowerCase()
        );

        if (subFrames && subFrames.length > 0) {
          logCategoryProcessing(
            categoryName,
            subFrames.reduce(
              (acc, frame) => acc + (frame.children?.length || 0),
              0
            )
          );

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
                updateProgress(processedRegular, "Regular");
              });
            }
          }
        }
      }

      // Process Solid icons with similar logging
      console.log("\n🔄 Processing Solid icons...");
      let processedSolid = 0;

      // [Rest of the solid icons processing remains the same, just add progress logging]

      // Combine Regular and Solid icons with detailed logging
      console.log("\n🔄 Generating final icon objects...");
      let iconCount = 0;
      const totalIcons = regularIcons.size;

      for (const [name, regularData] of regularIcons) {
        const iconKey = toKebabCase(name);
        const solidData = solidIcons.get(name);

        iconsObject[iconKey] = {
          // [Original icon object creation remains the same]
        };

        iconCount++;
        if (
          iconCount % 10 === 0 ||
          iconCount === 1 ||
          iconCount === totalIcons
        ) {
          logIconDetails(iconsObject[iconKey], iconCount, totalIcons);
        }
      }

      // Validate and save
      console.log("\n✨ Validating generated icons...");
      if (!validate(iconsObject)) {
        console.error("❌ Validation failed:", validate.errors);
        return;
      }
      console.log("✅ Validation successful");

      const outputPath = path.join(ICONS_DIR, "icons.json");
      fs.writeFileSync(outputPath, JSON.stringify(iconsObject, null, 2));

      // Final summary
      const fileSize = fs.statSync(outputPath).size;
      logSummary(
        processedRegular,
        processedSolid,
        Object.keys(iconsObject).length,
        fileSize
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}
main();
