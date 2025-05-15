// scripts/og.script.js
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");

const DATA_DIR = "data";
const generatedFiles = [];

async function generateOGImage(content, outputPath, type = "component") {
  // ... existing generateOGImage function remains the same ...
}

async function processContent(type, contentPath, outputPath) {
  try {
    if (!fs.existsSync(contentPath)) {
      console.log(`⚠️  Content not found: ${contentPath}`);
      return false;
    }

    const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
    await generateOGImage(content, outputPath, type);

    // Record successful generation
    generatedFiles.push({
      type,
      name: content.title,
      path: outputPath.replace(DATA_DIR + "/", ""),
    });

    return true;
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
