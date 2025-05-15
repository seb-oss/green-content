// scripts/generate-og.script.js
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");

// Register custom font if needed
// registerFont('path/to/font.ttf', { family: 'CustomFont' });

const GENERATED_DIR = "generated";

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

async function processContent(type, contentData, basePath) {
  const outputPath = path.join(
    GENERATED_DIR,
    basePath,
    `${contentData.slug}.og.png`
  );

  await generateOGImage(contentData, outputPath, type);

  return {
    ...contentData,
    ogImage: `${basePath}/${contentData.slug}.og.png`,
  };
}

async function main() {
  // Process components
  const componentsDir = path.join(GENERATED_DIR);
  const componentFiles = fs
    .readdirSync(componentsDir)
    .filter((file) => file.endsWith(".content.json"));

  for (const file of componentFiles) {
    const content = JSON.parse(
      fs.readFileSync(path.join(componentsDir, file), "utf8")
    );
    await processContent("Component", content, content.slug);
  }

  // Process pages
  const pagesDir = path.join(GENERATED_DIR, "pages");
  if (fs.existsSync(pagesDir)) {
    const pageDirectories = fs.readdirSync(pagesDir);

    for (const pageDir of pageDirectories) {
      const pagePath = path.join(pagesDir, pageDir, `${pageDir}.json`);
      if (fs.existsSync(pagePath)) {
        const content = JSON.parse(fs.readFileSync(pagePath, "utf8"));
        await processContent("Page", content, `pages/${pageDir}`);
      }
    }
  }

  // Process snippets
  const snippetsDir = path.join(GENERATED_DIR, "snippets");
  if (fs.existsSync(snippetsDir)) {
    const snippetDirectories = fs.readdirSync(snippetsDir);

    for (const snippetDir of snippetDirectories) {
      const snippetPath = path.join(
        snippetsDir,
        snippetDir,
        `${snippetDir}.json`
      );
      if (fs.existsSync(snippetPath)) {
        const content = JSON.parse(fs.readFileSync(snippetPath, "utf8"));
        await processContent("Snippet", content, `snippets/${snippetDir}`);
      }
    }
  }

  console.log("OG Image generation completed!");
}

main().catch(console.error);
