const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ========== CONFIGURATION ==========

// Input file that contains list of node entries.
const INPUT_FILE = path.join(__dirname, "content", "nodes.json");
// Output file that will contain the enriched data.
const OUTPUT_FILE = "figma-nodes.json";

// Figma API settings – these should be set in your environment.
const FIGMA_PROJECT_ID = process.env.FIGMA_PROJECT_ID;
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

// Regex to validate node IDs.
const ID_REGEX = /^[a-zA-Z0-9:\-]+$/;

// Helper: Normalize node IDs (replace ":" with "-") so that our keys line up.
const normalizeId = (nodeId) => nodeId.replace(/:/g, "-");

// ========== FUNCTIONS ==========

// Read and parse the JSON file containing node entries.
function readInputFile() {
  try {
    const rawData = fs.readFileSync(INPUT_FILE, "utf8");
    const data = JSON.parse(rawData);
    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('JSON file must have a "nodes" array.');
    }
    return data.nodes;
  } catch (error) {
    console.error("Error reading input file:", error.message);
    process.exit(1);
  }
}

// Call Figma API to retrieve SVG image URLs for a batch of node IDs.
async function fetchSVGsFromFigma(nodeIds) {
  try {
    const originalNodeIds = nodeIds.join(",");
    const url = `https://api.figma.com/v1/images/${FIGMA_PROJECT_ID}/?ids=${originalNodeIds}&format=svg`;
    const { data: imageData } = await axios.get(url, {
      headers: { "X-Figma-Token": FIGMA_ACCESS_TOKEN },
    });
    // imageData.images is an object where keys are node ids (may include colons) and values are URLs.
    const svgPromises = Object.entries(imageData.images).map(
      async ([nodeId, imageUrl]) => {
        const response = await axios.get(imageUrl);
        return {
          node: normalizeId(nodeId),
          svg: response.data,
        };
      }
    );
    return Promise.all(svgPromises);
  } catch (error) {
    console.error("Error fetching SVGs from Figma:", error.message);
    return [];
  }
}

async function main() {
  const entries = readInputFile();

  // Filter and gather valid node IDs from the list.
  // Also build a mapping for when outputting.
  const validEntries = [];
  const uniqueNodeIds = new Set();

  entries.forEach((entry) => {
    if (entry.node && ID_REGEX.test(entry.node)) {
      validEntries.push(entry);
      uniqueNodeIds.add(entry.node);
    } else {
      console.warn(`Skipping invalid node id: ${entry.node}`);
    }
  });

  if (uniqueNodeIds.size === 0) {
    console.log("No valid node IDs found.");
    process.exit(0);
  }

  console.log(
    `Found ${uniqueNodeIds.size} unique node id(s). Fetching SVG data from Figma...`
  );
  // Fetch the SVG data once by calling Figma API with all unique node IDs.
  const svgResults = await fetchSVGsFromFigma(Array.from(uniqueNodeIds));
  // Build a lookup table (normalized node id --> SVG content).
  const nodeSvgLookup = {};
  svgResults.forEach(({ node, svg }) => {
    nodeSvgLookup[node] = svg;
  });

  // Construct the final output data.
  // For each entry, attach the svg found from Figma.
  const output = validEntries.map((entry) => {
    const normalized = normalizeId(entry.node);
    return {
      node: entry.node,
      component: entry.component,
      label: entry.label,
      svg: nodeSvgLookup[normalized] || null,
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Output written to ${OUTPUT_FILE}`);
}

main();
