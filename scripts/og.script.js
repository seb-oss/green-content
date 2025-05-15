// scripts/og.script.js
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");

// Register custom font if needed
// registerFont('path/to/font.ttf', { family: 'CustomFont' });

const DATA_DIR = "data";

async function generateOGImage(content, outputPath, type = "component") {
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1200, 630);

  // Add gradient border
  const gradient = ctx.createLinearGradient(0, 0, 1200, 0);
  gradient.addColorStop(0, "#0091ff");
  gradient.addColorStop(1, "#00c2ff");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 1200, 630);

  // Title
  ctx.font = "bold 60px Arial";
  ctx.fillStyle = "#000000";
  ctx.fillText(content.title, 80, 160);

  // Summary if exists
  if (content.summary) {
    ctx.font = "32px Arial";
    ctx.fillStyle = "#666666";
    const words = content.summary.split(" ");
    let line = "";
    let y = 240;

    for (let word of words) {
      const testLine = line + word + " ";
      const metrics = ctx.measureText(testLine);

      if (metrics.width > 1000) {
        ctx.fillText(line, 80, y);
        line = word + " ";
        y += 48;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 80, y);
  }

  // Footer
  ctx.font = "24px Arial";
  ctx.fillStyle = "#666666";
  ctx.fillText("SEB Design System", 80, 560);

  // Type badge
  ctx.fillStyle = "#eef6ff";
  const typeWidth = ctx.measureText(type).width + 40;
  ctx.fillRect(1200 - typeWidth - 40, 40, typeWidth, 40);

  ctx.font = "bold 20px Arial";
  ctx.fillStyle = "#0091ff";
  ctx.fillText(type, 1200 - typeWidth - 20, 65);

  // Save the image
  const buffer = canvas.toBuffer("image/png");
  await fs.promises.writeFile(outputPath, buffer);
}

async function processComponentContent(componentDir) {
  const componentName = path.basename(componentDir);
  const contentPath = path.join(
    DATA_DIR,
    "components",
    componentDir,
    `${componentName}.content.json`
  );

  if (fs.existsSync(contentPath)) {
    console.log(`Processing component: ${componentName}`);
    const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
    const outputPath = path.join(
      DATA_DIR,
      "components",
      componentDir,
      `${componentName}.og.png`
    );
    await generateOGImage(content, outputPath, "Component");
  }
}

async function processPageContent(pageDir) {
  const pageName = path.basename(pageDir);
  const contentPath = path.join(DATA_DIR, "pages", pageDir, `${pageName}.json`);

  if (fs.existsSync(contentPath)) {
    console.log(`Processing page: ${pageName}`);
    const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
    const outputPath = path.join(
      DATA_DIR,
      "pages",
      pageDir,
      `${pageName}.og.png`
    );
    await generateOGImage(content, outputPath, "Page");
  }
}

async function processSnippetContent(snippetDir) {
  const snippetName = path.basename(snippetDir);
  const contentPath = path.join(
    DATA_DIR,
    "snippets",
    snippetDir,
    `${snippetName}.json`
  );

  if (fs.existsSync(contentPath)) {
    console.log(`Processing snippet: ${snippetName}`);
    const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
    const outputPath = path.join(
      DATA_DIR,
      "snippets",
      snippetDir,
      `${snippetName}.og.png`
    );
    await generateOGImage(content, outputPath, "Snippet");
  }
}

async function main() {
  // Process components
  const componentsDir = path.join(DATA_DIR, "components");
  if (fs.existsSync(componentsDir)) {
    const componentDirs = fs.readdirSync(componentsDir);
    for (const componentDir of componentDirs) {
      const dirPath = path.join(componentsDir, componentDir);
      if (fs.statSync(dirPath).isDirectory()) {
        await processComponentContent(componentDir);
      }
    }
  }

  // Process pages
  const pagesDir = path.join(DATA_DIR, "pages");
  if (fs.existsSync(pagesDir)) {
    const pageDirs = fs.readdirSync(pagesDir);
    for (const pageDir of pageDirs) {
      const dirPath = path.join(pagesDir, pageDir);
      if (fs.statSync(dirPath).isDirectory()) {
        await processPageContent(pageDir);
      }
    }
  }

  // Process snippets
  const snippetsDir = path.join(DATA_DIR, "snippets");
  if (fs.existsSync(snippetsDir)) {
    const snippetDirs = fs.readdirSync(snippetsDir);
    for (const snippetDir of snippetDirs) {
      const dirPath = path.join(snippetsDir, snippetDir);
      if (fs.statSync(dirPath).isDirectory()) {
        await processSnippetContent(snippetDir);
      }
    }
  }

  console.log("OG Image generation completed!");
}

main().catch((error) => {
  console.error("Error generating OG images:", error);
  process.exit(1);
});
