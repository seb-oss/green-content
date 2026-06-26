const fs = require("fs");
const { execFileSync } = require("child_process");

const BLOG_BASE_URL = "https://seb.io/blog/";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getDiffRange() {
  const base = process.env.GIT_BASE_SHA;
  const head = process.env.GIT_HEAD_SHA || "HEAD";

  // On workflow push events, `before` can be all zeros for edge cases.
  if (base && !/^0+$/.test(base)) {
    return { base, head };
  }

  return { base: "HEAD^", head: "HEAD" };
}

function getNewBlogFiles() {
  const { base, head } = getDiffRange();
  const output = execFileSync(
    "git",
    [
      "diff",
      base,
      head,
      "--name-only",
      "--diff-filter=A",
      "--",
      "content/blog/*.json",
    ],
    { encoding: "utf8" },
  );

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractPreamble(rawContent) {
  if (typeof rawContent !== "string") {
    return "";
  }

  const firstLine = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));

  if (!firstLine) {
    return "";
  }

  return firstLine
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[\[\]]/g, "")
    .slice(0, 300);
}

async function getAccessToken() {
  const clientId = getRequiredEnv("CLIENT_ID");
  const clientSecret = getRequiredEnv("CLIENT_SECRET");
  const tokenUrl = getRequiredEnv("ENTRA_TOKEN_URL");
  const scope = getRequiredEnv("ENTRA_TOKEN_SCOPE");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to obtain access token (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();
  const token = data.access_token;

  if (!token) {
    throw new Error("Failed to obtain access token: missing access_token");
  }

  console.log(`::add-mask::${token}`);
  return token;
}

function buildPayload(title, preamble, slug) {
  const link = `${BLOG_BASE_URL}${slug}`;
  const tag = "blog";

  return {
    $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    msteams: { width: "full" },
    body: [
      {
        type: "Container",
        style: "emphasis",
        bleed: true,
        items: [
          {
            type: "ColumnSet",
            columns: [
              {
                type: "Column",
                width: 50,
                items: [
                  {
                    type: "TextBlock",
                    text: `A new blog post: ${title}`,
                    weight: "Bolder",
                    size: "ExtraLarge",
                    wrap: true,
                  },
                ],
              },
            ],
          },
          {
            type: "TextBlock",
            text: preamble,
            weight: "Bolder",
            size: "Medium",
            color: "Accent",
            wrap: true,
            spacing: "Small",
          },
        ],
      },
      {
        type: "TextBlock",
        text: "",
        wrap: true,
        spacing: "Medium",
      },
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "Read blog post",
        url: link,
      },
    ],
    fallbackText: `New ${tag} published: A new blog post: ${title} - ${preamble}`,
    speak: `New ${tag} published: A new blog post: ${title} - ${preamble}`,
  };
}

async function notifyTeams(token, filePath) {
  const webhookUrl = getRequiredEnv("TEAMS_WEBHOOK_URL");
  const raw = fs.readFileSync(filePath, "utf8");
  const blogPost = JSON.parse(raw);

  const title = blogPost.title;
  const slug = blogPost.slug;
  const preamble = extractPreamble(blogPost.content);

  if (!title || !slug) {
    throw new Error(`Missing title or slug in ${filePath}`);
  }

  const payload = buildPayload(title, preamble, slug);
  const link = `${BLOG_BASE_URL}${slug}`;

  console.log(`Posting notification for: ${title}`);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Webhook call failed with HTTP status ${response.status} for ${title}: ${body}`,
    );
  }

  console.log(`Successfully notified Teams for: ${title} (${link})`);
}

async function main() {
  const newFiles = getNewBlogFiles();

  if (newFiles.length === 0) {
    console.log("No new blog posts detected.");
    return;
  }

  console.log("New blog posts detected:");
  newFiles.forEach((file) => console.log(file));

  const token = await getAccessToken();

  for (const file of newFiles) {
    await notifyTeams(token, file);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
