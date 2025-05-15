// scripts/og.script.js
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");

const DATA_DIR = "data";
const generatedFiles = [];

async function generateOGImage(content, outputPath, type = "component") {
  try {
    console.log(`Generating OG image for ${content.title}...`);

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

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });

    // Save the image
    const buffer = canvas.toBuffer("image/png");
    await fs.promises.writeFile(outputPath, buffer);

    console.log(`✅ Generated OG image: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error generating OG image for ${content.title}:`, error);
    return false;
  }
}

async function processContent(type, contentPath, outputPath) {
  try {
    if (!fs.existsSync(contentPath)) {
      console.log(`⚠️  Content not found: ${contentPath}`);
      return false;
    }

    const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
    const success = await generateOGImage(content, outputPath, type);

    if (success) {
      generatedFiles.push({
        type,
        name: content.title,
        path: outputPath.replace(DATA_DIR + "/", ""),
      });
    }

    return success;
  } catch (error) {
    console.error(`❌ Error processing ${contentPath}:`, error.message);
    return false;
  }
}

async function processComponentContent(componentDir) {
  const componentName = path.basename(componentDir);
  console.log(`\n📦 Processing component: ${componentName}`);

  const contentPath = path.join(
    DATA_DIR,
    "components",
    componentDir,
    `${componentName}.content.json`
  );

  const outputPath = path.join(
    DATA_DIR,
    "components",
    componentDir,
    `${componentName}.og.png`
  );

  return processContent("Component", contentPath, outputPath);
}

async function processPageContent(pageDir) {
  const pageName = path.basename(pageDir);
  console.log(`\n📄 Processing page: ${pageName}`);

  const contentPath = path.join(DATA_DIR, "pages", pageDir, `${pageName}.json`);

  const outputPath = path.join(
    DATA_DIR,
    "pages",
    pageDir,
    `${pageName}.og.png`
  );

  return processContent("Page", contentPath, outputPath);
}

async function processSnippetContent(snippetDir) {
  const snippetName = path.basename(snippetDir);
  console.log(`\n✂️  Processing snippet: ${snippetName}`);

  const contentPath = path.join(
    DATA_DIR,
    "snippets",
    snippetDir,
    `${snippetName}.json`
  );

  const outputPath = path.join(
    DATA_DIR,
    "snippets",
    snippetDir,
    `${snippetName}.og.png`
  );

  return processContent("Snippet", contentPath, outputPath);
}

async function updateIndexFiles() {
  console.log("\n📝 Updating index files...");

  // Update components.json
  const componentsIndexPath = path.join(
    DATA_DIR,
    "components",
    "components.json"
  );
  if (fs.existsSync(componentsIndexPath)) {
    const componentsIndex = JSON.parse(
      fs.readFileSync(componentsIndexPath, "utf8")
    );
    componentsIndex.components = componentsIndex.components.map(
      (component) => ({
        ...component,
        ogImage: `components/${component.slug}/${component.slug}.og.png`,
      })
    );
    fs.writeFileSync(
      componentsIndexPath,
      JSON.stringify(componentsIndex, null, 2)
    );
    console.log("✅ Updated components.json");
  }

  // Update pages.json
  const pagesIndexPath = path.join(DATA_DIR, "pages", "pages.json");
  if (fs.existsSync(pagesIndexPath)) {
    const pagesIndex = JSON.parse(fs.readFileSync(pagesIndexPath, "utf8"));
    pagesIndex.pages = pagesIndex.pages.map((page) => ({
      ...page,
      ogImage: `pages/${page.slug}/${page.slug}.og.png`,
    }));
    fs.writeFileSync(pagesIndexPath, JSON.stringify(pagesIndex, null, 2));
    console.log("✅ Updated pages.json");
  }

  // Update snippets.json
  const snippetsIndexPath = path.join(DATA_DIR, "snippets", "snippets.json");
  if (fs.existsSync(snippetsIndexPath)) {
    const snippetsIndex = JSON.parse(
      fs.readFileSync(snippetsIndexPath, "utf8")
    );
    snippetsIndex.snippets = snippetsIndex.snippets.map((snippet) => ({
      ...snippet,
      ogImage: `snippets/${snippet.slug}/${snippet.slug}.og.png`,
    }));
    fs.writeFileSync(snippetsIndexPath, JSON.stringify(snippetsIndex, null, 2));
    console.log("✅ Updated snippets.json");
  }

  // Update main index.json
  const mainIndexPath = path.join(DATA_DIR, "index.json");
  if (fs.existsSync(mainIndexPath)) {
    const mainIndex = JSON.parse(fs.readFileSync(mainIndexPath, "utf8"));

    if (mainIndex.api.resources.components?.items) {
      mainIndex.api.resources.components.items =
        mainIndex.api.resources.components.items.map((item) => ({
          ...item,
          ogImage: `components/${item.slug}/${item.slug}.og.png`,
        }));
    }

    if (mainIndex.api.resources.pages?.items) {
      mainIndex.api.resources.pages.items =
        mainIndex.api.resources.pages.items.map((item) => ({
          ...item,
          ogImage: `pages/${item.slug}/${item.slug}.og.png`,
        }));
    }

    if (mainIndex.api.resources.snippets?.items) {
      mainIndex.api.resources.snippets.items =
        mainIndex.api.resources.snippets.items.map((item) => ({
          ...item,
          ogImage: `snippets/${item.slug}/${item.slug}.og.png`,
        }));
    }

    fs.writeFileSync(mainIndexPath, JSON.stringify(mainIndex, null, 2));
    console.log("✅ Updated index.json");
  }
}

async function main() {
  console.log("🎨 Starting OG Image Generation...\n");

  let totalProcessed = 0;
  let totalSuccess = 0;

  // Process components
  const componentsDir = path.join(DATA_DIR, "components");
  if (fs.existsSync(componentsDir)) {
    const componentDirs = fs.readdirSync(componentsDir);
    for (const componentDir of componentDirs) {
      const dirPath = path.join(componentsDir, componentDir);
      if (fs.statSync(dirPath).isDirectory()) {
        totalProcessed++;
        if (await processComponentContent(componentDir)) {
          totalSuccess++;
        }
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
        totalProcessed++;
        if (await processPageContent(pageDir)) {
          totalSuccess++;
        }
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
        totalProcessed++;
        if (await processSnippetContent(snippetDir)) {
          totalSuccess++;
        }
      }
    }
  }

  // Update index files with OG image paths
  await updateIndexFiles();

  // Print summary
  console.log("\n📊 Generation Summary:");
  console.log("===================");
  console.log(`Total Processed: ${totalProcessed}`);
  console.log(`Successfully Generated: ${totalSuccess}`);
  console.log(`Failed: ${totalProcessed - totalSuccess}`);

  if (generatedFiles.length > 0) {
    console.log("\n✅ Generated Files:");
    console.log("===================");
    console.table(generatedFiles);
  }

  // Write summary to file for workflow
  fs.writeFileSync(
    "og-generation-summary.json",
    JSON.stringify(
      {
        total: totalProcessed,
        success: totalSuccess,
        files: generatedFiles,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("\n❌ Error generating OG images:", error);
  process.exit(1);
});
