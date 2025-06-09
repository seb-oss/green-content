// content.script.js
const fs = require("fs");
const path = require("path");

// Input directories
const CONTENT_DIR = "content";
const COMPONENTS_DIR = path.join(CONTENT_DIR, "components");
const NAVIGATION_DIR = path.join(CONTENT_DIR, "navigation");
const TEMPLATES_DIR = path.join(CONTENT_DIR, "templates");
const PAGES_DIR = path.join(CONTENT_DIR, "pages");
const SNIPPETS_DIR = path.join(CONTENT_DIR, "snippets");
const HOME_FILE = path.join(CONTENT_DIR, "home.json");

// Output directory
const DATA_DIR = "data";

// Create all required directories
function createDirectories() {
  const directories = [
    CONTENT_DIR,
    COMPONENTS_DIR,
    NAVIGATION_DIR,
    TEMPLATES_DIR,
    PAGES_DIR,
    SNIPPETS_DIR,
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// content.script.js
// async function processComponentContent(filename) {
//   const componentName = path.basename(filename, ".json");
//   console.log(`Processing: ${componentName}`);

//   try {
//     const inputPath = path.join(COMPONENTS_DIR, filename);
//     const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

//     // Add validation for required fields
//     if (!contentData.title || !contentData.slug) {
//       throw new Error(
//         `Component ${componentName} missing required fields: title and slug are required`
//       );
//     }

//     // Create directories if they don't exist
//     const outputDir = path.join(DATA_DIR, "components", componentName);
//     fs.mkdirSync(outputDir, { recursive: true });

//     fs.writeFileSync(
//       path.join(outputDir, `${componentName}.content.json`),
//       JSON.stringify(contentData, null, 2)
//     );

//     return {
//       title: contentData.title, // Required
//       slug: contentData.slug, // Required
//       summary: contentData.summary, // Optional
//       path: `components/${componentName}/${componentName}.content.json`,
//     };
//   } catch (error) {
//     console.error(`Error processing ${componentName}:`, error);
//     return null;
//   }
// }

async function processComponentContent(filename) {
  const componentName = path.basename(filename, ".json");
  console.log(`Processing component: ${componentName}`);

  try {
    // Read the source file
    const inputPath = path.join(COMPONENTS_DIR, filename);
    const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    // Create output directory and write file
    const outputDir = path.join(DATA_DIR, "components", componentName);
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${componentName}.content.json`);
    fs.writeFileSync(outputPath, JSON.stringify(contentData, null, 2));

    // Return minimal info for index
    return {
      title: contentData.title || componentName,
      slug: contentData.slug || componentName,
      summary: contentData.summary,
      path: `components/${componentName}/${componentName}.content.json`,
    };
  } catch (error) {
    console.error(`Failed to process ${componentName}:`, error);
    return null;
  }
}

async function processNavigationContent(filename) {
  const navName = path.basename(filename, ".json");
  console.log(`Processing navigation: ${navName}`);

  try {
    const inputPath = path.join(NAVIGATION_DIR, filename);
    const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    const outputDir = path.join(DATA_DIR, "navigation");
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, filename),
      JSON.stringify(contentData, null, 2)
    );

    return {
      title: contentData.title,
      slug: contentData.slug,
      path: `navigation/${filename}`,
      links: contentData.links?.length || 0,
    };
  } catch (error) {
    console.error(`Error processing navigation ${navName}:`, error);
    return null;
  }
}

async function processTemplateContent(filename) {
  const templateName = path.basename(filename, ".json");
  console.log(`Processing template: ${templateName}`);

  try {
    const inputPath = path.join(TEMPLATES_DIR, filename);
    const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    const outputDir = path.join(DATA_DIR, "templates", templateName);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, `${templateName}.json`),
      JSON.stringify(contentData, null, 2)
    );

    return {
      title: contentData.title,
      slug: contentData.slug,
      path: `templates/${templateName}/${templateName}.json`,
      related_components: contentData.related_components || [],
    };
  } catch (error) {
    console.error(`Error processing template ${templateName}:`, error);
    return null;
  }
}

async function processHomeContent() {
  console.log("Processing home content");

  try {
    if (fs.existsSync(HOME_FILE)) {
      const contentData = JSON.parse(fs.readFileSync(HOME_FILE, "utf8"));

      fs.writeFileSync(
        path.join(DATA_DIR, "home.json"),
        JSON.stringify(contentData, null, 2)
      );

      return {
        title: contentData.title,
        summary: contentData.summary,
        path: "home.json",
      };
    }
    return null;
  } catch (error) {
    console.error("Error processing home content:", error);
    return null;
  }
}

async function processPageContent(filename) {
  const pageName = path.basename(filename, ".json");
  console.log(`Processing: ${pageName}`);

  try {
    const inputPath = path.join(PAGES_DIR, filename);
    const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    const outputDir = path.join(DATA_DIR, "pages", pageName);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, `${pageName}.json`),
      JSON.stringify(contentData, null, 2)
    );

    return {
      title: contentData.title,
      slug: contentData.slug,
      summary: contentData.summary,
      path: `pages/${pageName}/${pageName}.json`,
    };
  } catch (error) {
    console.error(`Error processing ${pageName}:`, error);
    return null;
  }
}

async function processSnippetContent(filename) {
  const snippetName = path.basename(filename, ".json");
  console.log(`Processing: ${snippetName}`);

  try {
    const inputPath = path.join(SNIPPETS_DIR, filename);
    const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    const outputDir = path.join(DATA_DIR, "snippets", snippetName);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, `${snippetName}.json`),
      JSON.stringify(contentData, null, 2)
    );

    return {
      title: contentData.title,
      slug: contentData.slug,
      path: `snippets/${snippetName}/${snippetName}.json`,
      language: contentData.language,
      code: contentData.code,
    };
  } catch (error) {
    console.error(`Error processing ${snippetName}:`, error);
    return null;
  }
}

async function main() {
  // Create all required directories first
  createDirectories();
  // Create data directory
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // List and process component files
  console.log("Reading components directory:", COMPONENTS_DIR);
  // Process all content types
  const componentFiles = fs.existsSync(COMPONENTS_DIR)
    ? fs.readdirSync(COMPONENTS_DIR).filter((file) => file.endsWith(".json"))
    : [];

  console.log("Found component files:", componentFiles);

  const componentsData = await Promise.all(
    componentFiles.map(processComponentContent)
  );

  console.log(
    "Processed components:",
    componentsData.filter((c) => c !== null).map((c) => c.slug)
  );

  const navigationFiles = fs.existsSync(NAVIGATION_DIR)
    ? fs.readdirSync(NAVIGATION_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const navigationData = await Promise.all(
    navigationFiles.map(processNavigationContent)
  );

  const templateFiles = fs.existsSync(TEMPLATES_DIR)
    ? fs.readdirSync(TEMPLATES_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const templatesData = await Promise.all(
    templateFiles.map(processTemplateContent)
  );

  const pageFiles = fs.existsSync(PAGES_DIR)
    ? fs.readdirSync(PAGES_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const pagesData = await Promise.all(pageFiles.map(processPageContent));

  const snippetFiles = fs.existsSync(SNIPPETS_DIR)
    ? fs.readdirSync(SNIPPETS_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const snippetsData = await Promise.all(
    snippetFiles.map(processSnippetContent)
  );

  const homeData = await processHomeContent();

  // Create and write index files
  const index = {
    api: {
      version: "1.0.0",
      baseUrl: "https://api.seb.io",
      lastUpdated: new Date().toISOString(),
      resources: {
        home: {
          endpoint: homeData?.path,
          content: homeData,
        },
        components: {
          list: "components/components.json",
          items: componentsData
            .filter((component) => component !== null)
            .map((component) => ({
              ...component,
              endpoints: {
                content: component.path,
                images: `components/${component.slug}/${component.slug}.images.json`,
              },
            })),
        },
        navigation: {
          list: "navigation/navigation.json",
          items: navigationData
            .filter((nav) => nav !== null)
            .map((nav) => ({
              ...nav,
              endpoint: nav.path,
            })),
        },
        templates: {
          list: "templates/templates.json",
          items: templatesData
            .filter((template) => template !== null)
            .map((template) => ({
              ...template,
              endpoint: template.path,
            })),
        },
        pages: {
          list: "pages/pages.json",
          items: pagesData
            .filter((page) => page !== null)
            .map((page) => ({
              ...page,
              endpoints: {
                content: page.path,
              },
            })),
        },
        snippets: {
          list: "snippets/snippets.json",
          items: snippetsData
            .filter((snippet) => snippet !== null)
            .map((snippet) => ({
              ...snippet,
              endpoints: {
                content: snippet.path,
              },
            })),
        },
        icons: {
          list: "icons/icons.json",
        },
      },
    },
  };

  // Write all index files
  fs.writeFileSync(
    path.join(DATA_DIR, "index.json"),
    JSON.stringify(index, null, 2)
  );

  const writeIndexFile = (dir, data, type) => {
    const indexData = {
      [type]: data.filter((item) => item !== null),
      total: data.filter((item) => item !== null).length,
      lastUpdated: new Date().toISOString(),
    };

    // Create the directory if it doesn't exist
    const outputDir = path.join(DATA_DIR, dir);
    fs.mkdirSync(outputDir, { recursive: true });

    // Write type-specific index file in its directory
    fs.writeFileSync(
      path.join(outputDir, `${type}.json`),
      JSON.stringify(indexData, null, 2)
    );
  };

  writeIndexFile("components", componentsData, "components");
  writeIndexFile("pages", pagesData, "pages");
  writeIndexFile("snippets", snippetsData, "snippets");
  writeIndexFile("templates", templatesData, "templates");
  writeIndexFile("navigation", navigationData, "navigation");

  console.log("Processing completed!");
}

main().catch(console.error);
