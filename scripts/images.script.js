const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Ajv = require("ajv");

// ========== CONFIGURATION ==========
const CONTENT_DIR = path.join("images");
const GENERATED_DIR = path.join("generated");
const SCHEMAS_DIR = path.join("schemas");

// Figma API settings
const FIGMA_PROJECT_ID = process.env.FIGMA_PROJECT_ID;
const FIGMA_ACCESS_KEY = process.env.FIGMA_ACCESS_KEY;

// Initialize JSON Schema validator
const ajv = new Ajv();

// ========== HELPER FUNCTIONS ==========

// Load and validate schema
function loadSchema() {
  try {
    const schemaPath = path.join(SCHEMAS_DIR, "image.schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    return ajv.compile(schema);
  } catch (error) {
    console.error("Error loading schema:", error);
    process.exit(1);
  }
}

// Fetch SVGs from Figma
async function fetchSVGs(nodeIds) {
  try {
    const idsParam = nodeIds.join(",");
    const url = `https://api.figma.com/v1/images/${FIGMA_PROJECT_ID}/?ids=${idsParam}&format=svg`;
    const { data: imageData } = await axios.get(url, {
      headers: { "X-Figma-Token": FIGMA_ACCESS_KEY },
    });

    const svgPromises = Object.entries(imageData.images).map(
      async ([nodeId, imageUrl]) => {
        try {
          const { data: svgContent } = await axios.get(imageUrl);
          return { node: nodeId, svg: svgContent };
        } catch (err) {
          console.error(`Error fetching SVG for node ${nodeId}:`, err.message);
          return { node: nodeId, svg: null };
        }
      }
    );
    return await Promise.all(svgPromises);
  } catch (error) {
    console.error("Error fetching SVGs from Figma:", error.message);
    return [];
  }
}

// Process component images
async function processComponentImages(componentName, validate) {
  console.log(`Processing component: ${componentName}`);

  const inputPath = path.join(
    CONTENT_DIR,
    componentName,
    `${componentName}.images.json`
  );
  if (!fs.existsSync(inputPath)) {
    console.error(`No images file found for component ${componentName}`);
    return;
  }

  try {
    const inputData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    // Validate input data
    if (!validate(inputData)) {
      console.error(
        `Invalid input data for ${componentName}:`,
        validate.errors
      );
      return;
    }

    // Extract nodes and fetch SVGs
    const nodes = inputData.nodes || [];
    const nodeIds = nodes.map((n) => n.node);

    if (nodeIds.length === 0) {
      console.log(`No nodes found for component ${componentName}`);
      return;
    }

    console.log(`Fetching ${nodeIds.length} SVGs for ${componentName}...`);
    const svgs = await fetchSVGs(nodeIds);

    // Create output data
    const outputNodes = nodes.map((node) => {
      const svgData = svgs.find((s) => s.node === node.node);
      return {
        node: node.node,
        id: node.id,
        svg: svgData ? svgData.svg : null,
      };
    });

    // Ensure output directory exists
    const outputDir = path.join(GENERATED_DIR, componentName);
    fs.mkdirSync(outputDir, { recursive: true });

    // Write output file
    const outputPath = path.join(outputDir, `${componentName}.images.json`);
    fs.writeFileSync(
      outputPath,
      JSON.stringify({ nodes: outputNodes }, null, 2)
    );
    console.log(`Generated ${outputPath}`);
  } catch (error) {
    console.error(`Error processing ${componentName}:`, error);
  }
}

// ========== MAIN ==========
async function main() {
  // Load and compile schema
  const validate = loadSchema();

  // Get all component directories
  const components = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  // Process each component
  for (const component of components) {
    await processComponentImages(component, validate);
  }
}

main().catch(console.error);
