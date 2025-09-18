const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
require("dotenv").config({ path: ".env.local" });

// ========== CONFIGURATION ==========
const DATA_DIR = "data";
const SCHEMAS_DIR = path.join("schemas");
const ICONS_DIR = path.join(DATA_DIR, "components", "icon");

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

const toPascalCase = (str) => {
  return str
    .split(/[-_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
};

// const reactComponentName = `Icon${toPascalCase(name)}`;

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
    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    const validate = loadSchema();

    const url = `https://api.figma.com/v1/files/${FIGMA_ICONS_PROJECT_ID}`;
    const { data } = await axios.get(url, {
      headers: { "X-Figma-Token": FIGMA_ACCESS_KEY },
    });

    // Find both Regular and Solid frames
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

      // Process Regular icons
      console.log("Processing Regular icons...");
      for (const category of regularFrame.children) {
        const categoryName = category.name;
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
                  nodeId: icon.id,
                  category: categoryName,
                  width: svg?.width || 24,
                  height: svg?.height || 24,
                  viewBox: svg?.viewBox || "0 0 24 24",
                  tags: icon.children
                    ? icon.children.map((child) => child.name)
                    : [],
                });
              });
            }
          }
        }
      }

      // Process Solid icons
      console.log("Processing Solid icons...");
      // Similar process for solid icons...
      for (const category of solidFrame.children) {
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
                  nodeId: icon.id,
                  width: svg?.width || 24,
                  height: svg?.height || 24,
                  viewBox: svg?.viewBox || "0 0 24 24",
                });
              });
            }
          }
        }
      }

      // Combine Regular and Solid icons
      for (const [name, regularData] of regularIcons) {
        const iconKey = toKebabCase(name);
        const solidData = solidIcons.get(name);
        const reactComponentName = `Icon${toPascalCase(name)}`;
        const toDisplayName = (str) => {
          return (
            str
              // Split by hyphens or underscores
              .split(/[-_]/)
              // Capitalize first letter of each word
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              // Join with spaces
              .join(" ")
          );
        };

        iconsObject[iconKey] = {
          id: iconKey,
          nodeId: regularData.nodeId,
          displayName: toDisplayName(iconKey),
          fileName: `${iconKey}.svg`,
          reactName: reactComponentName,
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
              import: `import { ${reactComponentName} } from '@sebgroup/green-react/icon/${iconKey}'`,
              component: `<${reactComponentName}></${reactComponentName}>`,
            },
            angular: createFrameworkConfig(iconKey),
          },
        };
      }

      // Validate and save
      if (!validate(iconsObject)) {
        console.error("Generated data does not match schema:", validate.errors);
        return;
      }

      // const outputPath = path.join(ICONS_DIR, "icons.json");
      const outputPath = path.join(ICONS_DIR, "icon.list.json");
      fs.writeFileSync(outputPath, JSON.stringify(iconsObject, null, 2));
      console.log(`Generated icons file at: ${outputPath}`);
      console.log(`Total icons processed: ${Object.keys(iconsObject).length}`);
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

main();
