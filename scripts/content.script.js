// content.script.js
const fs = require("fs");
const path = require("path");

const COMPONENTS_DIR = "components";
const NAVIGATION_DIR = "navigation";
const TEMPLATES_DIR = "templates";
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

  // Create index.json with all available resources
  const index = {
    api: {
      version: "1.0.0",
      baseUrl: "https://api.seb.io",
      lastUpdated: new Date().toISOString(),
      resources: {
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

  console.log("Processing completed!");
}

main().catch(console.error);
