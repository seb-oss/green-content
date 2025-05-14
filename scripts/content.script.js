// content.script.js
const fs = require("fs");
const path = require("path");

const COMPONENTS_DIR = "content/components";
const NAVIGATION_DIR = "content/navigation";
const TEMPLATES_DIR = "content/templates";
const PAGES_DIR = "content/pages";
const SNIPPETS_DIR = "content/snippets";
const HOME_FILE = "content/home.json";
const GENERATED_DIR = "generated";

async function processComponentContent(filename) {
  const componentName = path.basename(filename, ".json");
  console.log(`Processing: ${componentName}`);

  try {
    const inputPath = path.join(COMPONENTS_DIR, filename);
    const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    const outputDir = path.join(GENERATED_DIR, componentName);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, `${componentName}.content.json`),
      JSON.stringify(contentData, null, 2)
    );

    return {
      title: contentData.title,
      slug: contentData.slug,
      summary: contentData.summary,
      path: `${componentName}/${componentName}.content.json`,
    };
  } catch (error) {
    console.error(`Error processing ${componentName}:`, error);
    return null;
  }
}

async function processNavigationContent(filename) {
  const navName = path.basename(filename, ".json");
  console.log(`Processing navigation: ${navName}`);

  try {
    const inputPath = path.join(NAVIGATION_DIR, filename);
    const contentData = JSON.parse(fs.readFileSync(inputPath, "utf8"));

    const outputDir = path.join(GENERATED_DIR, "navigation");
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

    const outputDir = path.join(GENERATED_DIR, "templates");
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, filename),
      JSON.stringify(contentData, null, 2)
    );

    return {
      title: contentData.title,
      slug: contentData.slug,
      path: `templates/${filename}`,
      related_components: contentData.related_components || [],
    };
  } catch (error) {
    console.error(`Error processing template ${templateName}:`, error);
    return null;
  }
}

// Add this function to process home content
async function processHomeContent() {
  console.log("Processing home content");

  try {
    if (fs.existsSync(HOME_FILE)) {
      const contentData = JSON.parse(fs.readFileSync(HOME_FILE, "utf8"));

      // Write home content to generated directory
      fs.writeFileSync(
        path.join(GENERATED_DIR, "home.json"),
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

    // Create individual directory for each page
    const outputDir = path.join(GENERATED_DIR, pageName);
    fs.mkdirSync(outputDir, { recursive: true });

    // Write page content to its own directory
    fs.writeFileSync(
      path.join(outputDir, `${pageName}.json`),
      JSON.stringify(contentData, null, 2)
    );

    return {
      title: contentData.title,
      slug: contentData.slug,
      summary: contentData.summary,
      path: `${pageName}/${pageName}.json`,
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

    // Create individual directory for each snippet
    const outputDir = path.join(GENERATED_DIR, snippetName);
    fs.mkdirSync(outputDir, { recursive: true });

    // Write snippet content to its own directory
    fs.writeFileSync(
      path.join(outputDir, `${snippetName}.json`),
      JSON.stringify(contentData, null, 2)
    );

    return {
      title: contentData.title,
      slug: contentData.slug,
      path: `${snippetName}/${snippetName}.json`,
      language: contentData.language,
      code: contentData.code,
    };
  } catch (error) {
    console.error(`Error processing ${snippetName}:`, error);
    return null;
  }
}

async function main() {
  // Create generated directory
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  // Process components
  const componentFiles = fs.existsSync(COMPONENTS_DIR)
    ? fs.readdirSync(COMPONENTS_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const componentsData = await Promise.all(
    componentFiles.map(processComponentContent)
  );

  // Process navigation
  const navigationFiles = fs.existsSync(NAVIGATION_DIR)
    ? fs.readdirSync(NAVIGATION_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const navigationData = await Promise.all(
    navigationFiles.map(processNavigationContent)
  );

  // Process templates
  const templateFiles = fs.existsSync(TEMPLATES_DIR)
    ? fs.readdirSync(TEMPLATES_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const templatesData = await Promise.all(
    templateFiles.map(processTemplateContent)
  );

  // Process home content
  const homeData = await processHomeContent();

  // Process pages similar to components
  const pageFiles = fs.existsSync(PAGES_DIR)
    ? fs.readdirSync(PAGES_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const pagesData = await Promise.all(pageFiles.map(processPageContent));

  // Process snippets similar to components
  const snippetFiles = fs.existsSync(SNIPPETS_DIR)
    ? fs.readdirSync(SNIPPETS_DIR).filter((file) => file.endsWith(".json"))
    : [];
  const snippetsData = await Promise.all(
    snippetFiles.map(processSnippetContent)
  );

  // Create index.json with all available resources
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
          list: "components.json",
          items: componentsData
            .filter((component) => component !== null)
            .map((component) => ({
              ...component,
              endpoints: {
                content: component.path,
                images: `${component.slug}/${component.slug}.images.json`,
              },
            })),
        },
        navigation: {
          list: "navigation.json",
          items: navigationData
            .filter((nav) => nav !== null)
            .map((nav) => ({
              ...nav,
              endpoint: nav.path,
            })),
        },
        templates: {
          list: "templates.json",
          items: templatesData
            .filter((template) => template !== null)
            .map((template) => ({
              ...template,
              endpoint: template.path,
            })),
        },
        pages: {
          list: "pages.json",
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
          list: "snippets.json",
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
        images: {
          components: componentsData
            .filter((component) => component !== null)
            .map((component) => ({
              component: component.slug,
              path: `${component.slug}/${component.slug}.images.json`,
            })),
        },
      },
    },
  };

  // Write index.json
  fs.writeFileSync(
    path.join(GENERATED_DIR, "index.json"),
    JSON.stringify(index, null, 2)
  );

  // Write components.json
  const componentsIndex = {
    components: componentsData.filter((component) => component !== null),
    total: componentsData.filter((component) => component !== null).length,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(GENERATED_DIR, "components.json"),
    JSON.stringify(componentsIndex, null, 2)
  );

  // Write navigation.json
  const navigationIndex = {
    navigation: navigationData.filter((nav) => nav !== null),
    total: navigationData.filter((nav) => nav !== null).length,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(GENERATED_DIR, "navigation.json"),
    JSON.stringify(navigationIndex, null, 2)
  );

  // Write templates.json
  const templatesIndex = {
    templates: templatesData.filter((template) => template !== null),
    total: templatesData.filter((template) => template !== null).length,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(GENERATED_DIR, "templates.json"),
    JSON.stringify(templatesIndex, null, 2)
  );

  // Write pages.json index
  const pagesIndex = {
    pages: pagesData.filter((page) => page !== null),
    total: pagesData.filter((page) => page !== null).length,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(GENERATED_DIR, "pages.json"),
    JSON.stringify(pagesIndex, null, 2)
  );

  // Write snippets.json index
  const snippetsIndex = {
    snippets: snippetsData.filter((snippet) => snippet !== null),
    total: snippetsData.filter((snippet) => snippet !== null).length,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(GENERATED_DIR, "snippets.json"),
    JSON.stringify(snippetsIndex, null, 2)
  );

  console.log("Processing completed!");
}

main().catch(console.error);
