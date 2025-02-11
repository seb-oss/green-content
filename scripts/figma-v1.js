const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execSync } = require("child_process");

// ========== CONFIGURATION ==========

// Remote repository info
const REMOTE_REPO_URL = "https://github.com/seb-oss/green.git";
const REPO_CLONE_DIR = path.join(__dirname, "temp-green");
const TARGET_SUBFOLDER = path.join("apps", "docs", "content", "component");

// Figma API and output settings.
// These values should be set in your environment, for local testing you can also replace them directly.
const FIGMA_PROJECT_ID = process.env.FIGMA_PROJECT_ID;
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

// Output file name
const OUTPUT_FILE = "figma-nodes.json";

// Regex to validate node IDs.
const ID_REGEX = /^[a-zA-Z0-9:\-]+$/;

// ========== FUNCTIONS ==========

// Clone the repository if not already present.
function cloneRepo() {
  if (!fs.existsSync(REPO_CLONE_DIR)) {
    console.log(`Cloning repository from ${REMOTE_REPO_URL} ...`);
    try {
      // Clone the repo into REPO_CLONE_DIR.
      execSync(`git clone ${REMOTE_REPO_URL} ${REPO_CLONE_DIR}`, {
        stdio: "inherit",
      });
      console.log("Repository cloned successfully.");
    } catch (error) {
      console.error("Error cloning repository:", error.message);
      process.exit(1);
    }
  } else {
    console.log("Repository already cloned.");
  }
}

// Recursively scan a directory and return a list of files.
function scanFiles(dir) {
  let filesList = [];
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      filesList = filesList.concat(scanFiles(fullPath));
    } else if (stat.isFile()) {
      filesList.push(fullPath);
    }
  });
  return filesList;
}

// Extract node IDs from file content using regex.
function extractNodeIds(fileContent) {
  const regex = /node="(?<node>.+?)"/g;
  const nodes = [];
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    const node = match.groups?.node;
    if (node && ID_REGEX.test(node)) {
      nodes.push(node);
    }
  }
  return nodes;
}

// Fetch SVGs from Figma given an array of node IDs.
async function fetchSVGs(nodes) {
  try {
    const ids = nodes.join(",");
    const url = `https://api.figma.com/v1/images/${FIGMA_PROJECT_ID}/?ids=${ids}&format=svg`;
    const { data: imageData } = await axios.get(url, {
      headers: { "X-Figma-Token": FIGMA_ACCESS_TOKEN },
    });

    // For every node in the returned images, fetch the SVG content.
    const svgPromises = Object.entries(imageData.images).map(
      async ([nodeId, imageUrl]) => {
        const response = await axios.get(imageUrl);
        return {
          // Replace ":" with "-" if necessary for node naming.
          node: nodeId.replace(/:/g, "-"),
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

// Main function to scan files, group node IDs by folder, fetch SVGs and create JSON output.
async function main() {
  // Clone the remote repository (if needed)
  cloneRepo();

  const scanPath = path.join(REPO_CLONE_DIR, TARGET_SUBFOLDER);
  if (!fs.existsSync(scanPath)) {
    console.error("Target folder not found:", scanPath);
    process.exit(1);
  }

  // Data structures to hold the node ids and folder grouping.
  // uniqueNodes: Set to avoid duplicate Figma API calls.
  // folderMapping: Object where each key is a folder (relative to the target folder) and value is a set of node ids.
  const uniqueNodes = new Set();
  const folderMapping = {};

  const allFiles = scanFiles(scanPath);
  allFiles.forEach((file) => {
    // Get folder relative to the scanPath.
    let relativePath = path.relative(scanPath, file);
    let folder = path.dirname(relativePath);
    if (folder === "") folder = ".";

    const content = fs.readFileSync(file, "utf8");
    const nodes = extractNodeIds(content);
    if (nodes.length) {
      if (!folderMapping[folder]) {
        folderMapping[folder] = new Set();
      }
      nodes.forEach((node) => {
        uniqueNodes.add(node);
        folderMapping[folder].add(node);
      });
    }
  });

  if (uniqueNodes.size === 0) {
    console.log("No valid node IDs found in the repository folder.");
    return;
  }

  console.log(
    `Found ${uniqueNodes.size} unique node id(s). Fetching SVG data from Figma ...`
  );
  const svgResults = await fetchSVGs(Array.from(uniqueNodes));
  // Build a lookup table for node -> svg data.
  const nodeSvgLookup = {};
  svgResults.forEach(({ node, svg }) => {
    nodeSvgLookup[node] = svg;
  });

  // Build the output grouped by folder.
  const output = {};
  for (const [folder, nodeSet] of Object.entries(folderMapping)) {
    output[folder] = Array.from(nodeSet).map((nodeId) => ({
      node: nodeId.replace(/:/g, "-"),
      svg: nodeSvgLookup[nodeId.replace(/:/g, "-")] || null,
    }));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Output written to ${OUTPUT_FILE}`);
}

main();
