// Imported first by tests that unlock private projects: the server
// environment is read once, and content modules read it while loading.
process.env.PROJECT_ACCESS_SECRET = "test-secret-".padEnd(48, "x");
