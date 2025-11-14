const { onRequest } = require("firebase-functions/v2/https");
const { join } = require("path");
const next = require("next");

// Next.js app configuration - point to parent directory's .next folder
const nextApp = next({
  dev: false,
  conf: {
    distDir: join(__dirname, "..", ".next"),
  },
});

let handler;

exports.nextjs = onRequest(async (req, res) => {
  if (!handler) {
    await nextApp.prepare();
    handler = nextApp.getRequestHandler();
  }
  return handler(req, res);
});

