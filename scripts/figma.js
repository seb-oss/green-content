const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Get current date/time in format YYYY-MM-DD_HH-MM-SS (you can customize as needed).
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const dateString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
  now.getDate()
)}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

// ========== CONFIGURATION ==========
const INPUT_DIR = path.join(__dirname, "nodes"); // the folder with input files
// Output directory now includes the date/version string.
const OUTPUT_DIR = path.join(__dirname, "static", dateString);
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Figma API settings – these should be set in your environment.
const FIGMA_PROJECT_ID = process.env.FIGMA_PROJECT_ID;
const FIGMA_ACCESS_KEY = process.env.FIGMA_ACCESS_KEY;

// A regex to validate a node id (adjust if needed)
const ID_REGEX = /^[a-zA-Z0-9:\-]+$/;

// Helper: normalize node id by replacing ':' with '-'
const normalizeId = (nodeId) => nodeId.replace(/:/g, "-");

// ========== HELPER FUNCTIONS ==========

// Fetch SVG URLs for an array of node IDs in batch from Figma.
async function fetchSVGs(nodeIds) {
  try {
    const idsParam = nodeIds.join(",");
    const url = `https://api.figma.com/v1/images/${FIGMA_PROJECT_ID}/?ids=${idsParam}&format=svg`;
    const { data: imageData } = await axios.get(url, {
      headers: { "X-Figma-Token": FIGMA_ACCESS_KEY },
    });

    // imageData.images is an object where key is the original node id (with possible colons) and value is a URL.
    // Fetch each SVG content in parallel.
    const svgPromises = Object.entries(imageData.images).map(
      async ([nodeId, imageUrl]) => {
        try {
          const { data: svgContent } = await axios.get(imageUrl);
          return { node: normalizeId(nodeId), svg: svgContent };
        } catch (err) {
          console.error(`Error fetching SVG for node ${nodeId}:`, err.message);
          return { node: normalizeId(nodeId), svg: null };
        }
      }
    );
    return await Promise.all(svgPromises);
  } catch (error) {
    console.error("Error fetching SVGs from Figma:", error.message);
    return [];
  }
}

// Process one input JSON file: read nodes, fetch SVGs, and write output.
async function processFile(inputFilePath, outputFilePath) {
  console.log(`Processing ${inputFilePath}`);
  try {
    const fileData = fs.readFileSync(inputFilePath, "utf8");
    const jsonData = JSON.parse(fileData);
    if (!jsonData.nodes || !Array.isArray(jsonData.nodes)) {
      console.error(
        `File ${inputFilePath} does not contain a valid nodes array.`
      );
      return;
    }

    // Filter valid nodes and collect unique node ids.
    const validNodes = jsonData.nodes.filter(
      (n) => n.node && ID_REGEX.test(n.node)
    );
    const uniqueNodeIds = Array.from(new Set(validNodes.map((n) => n.node)));

    if (uniqueNodeIds.length === 0) {
      console.log(`No valid node IDs found in ${inputFilePath}`);
      return;
    }

    console.log(
      `Found ${uniqueNodeIds.length} unique node id(s) in ${inputFilePath}. Fetching SVG data...`
    );
    const fetchedSVGs = await fetchSVGs(uniqueNodeIds);
    // Build lookup table: normalized node id => svg content.
    const svgLookup = {};
    fetchedSVGs.forEach(({ node, svg }) => {
      svgLookup[node] = svg;
    });

    // Update each node in the JSON by adding the fetched SVG.
    const outputNodes = validNodes.map((n) => {
      return {
        ...n,
        svg: svgLookup[normalizeId(n.node)] || null,
      };
    });

    const outputData = { nodes: outputNodes };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log(`Generated ${outputFilePath}`);
  } catch (err) {
    console.error(`Error processing file ${inputFilePath}:`, err.message);
  }
}

// Recursively scan a directory for .json files (only in the top level here, adjust if needed).
function scanInputDirectory(dir) {
  const files = fs.readdirSync(dir);
  return files.filter((file) => file.endsWith(".json"));
}

// ========== MAIN ==========
async function main() {
  // Ensure output directory exists.
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const inputFiles = scanInputDirectory(INPUT_DIR);
  if (inputFiles.length === 0) {
    console.log("No JSON files found in the nodes folder.");
    return;
  }

  for (const fileName of inputFiles) {
    const inputFilePath = path.join(INPUT_DIR, fileName);
    const outputFilePath = path.join(OUTPUT_DIR, fileName);
    await processFile(inputFilePath, outputFilePath);
  }
}

main();
