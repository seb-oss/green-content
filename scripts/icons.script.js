const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
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

          // Extract SVG attributes
          const svgMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
          // const svgMatch = svgContent.match(/<svg([^>]*)>([\\s\\S]*)<\\/svg>/i);
          const svgAttributes = svgMatch ? svgMatch[1] : "";
          const pathContent = svgMatch ? svgMatch[2].trim() : null;

          // Extract width, height and viewBox
          const widthMatch = svgAttributes.match(/width="(\d+)"/);
          const heightMatch = svgAttributes.match(/height="(\d+)"/);
          const viewBoxMatch = svgAttributes.match(/viewBox="([^"]+)"/);

          let pathContentModified = pathContent;
          if (pathContentModified) {
            pathContentModified = pathContentModified
              .replace(/fill=\"#[0-9A-Fa-f]{3,6}\"/g, 'fill="currentColor"')
              .replace(/fill=\"rgb\([^\)]+\)\"/g, 'fill="currentColor"')
              .replace(/stroke=\"#[0-9A-Fa-f]{3,6}\"/g, 'stroke="currentColor"')
              .replace(/stroke=\"rgb\([^\)]+\)\"/g, 'stroke="currentColor"');
          }

          return {
            node: nodeId,
            svg: pathContentModified,
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
                  category: categoryName,
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
      }

      // Validate and save
      if (!validate(iconsObject)) {
        console.error("Generated data does not match schema:", validate.errors);
        return;
      }

      const outputPath = path.join(ICONS_DIR, "icons.json");
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
