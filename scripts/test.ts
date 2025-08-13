#!/usr/bin/env -S deno run --allow-run --allow-read

/**
 * Test runner script for Nozzle ORM
 *
 * Usage:
 *   deno run --allow-run --allow-read scripts/test.ts [options]
 *
 * Options:
 *   --mock     Run only mock tests (no MongoDB required)
 *   --real     Run integration tests (requires MongoDB)
 *   --all      Run all tests (default)
 *   --bdd      Use BDD-style output for mock tests
 *   --filter   Filter tests by name pattern
 *   --watch    Watch for file changes and re-run tests
 *   --help     Show this help message
 */

interface TestOptions {
  mock?: boolean;
  real?: boolean;
  all?: boolean;
  bdd?: boolean;
  filter?: string;
  watch?: boolean;
  help?: boolean;
}

function parseArgs(): TestOptions {
  const args = Deno.args;
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--mock":
        options.mock = true;
        break;
      case "--real":
        options.real = true;
        break;
      case "--all":
        options.all = true;
        break;
      case "--bdd":
        options.bdd = true;
        break;
      case "--filter":
        options.filter = args[++i];
        break;
      case "--watch":
        options.watch = true;
        break;
      case "--help":
        options.help = true;
        break;
    }
  }

  // Default to all tests if no specific option is provided
  if (!options.mock && !options.real && !options.help) {
    options.all = true;
  }

  return options;
}

function showHelp() {
  console.log(`
🧪 Nozzle ORM Test Runner

Usage:
  deno run --allow-run --allow-read scripts/test.ts [options]

Options:
  --mock     Run only mock tests (no MongoDB required)
  --real     Run integration tests (requires MongoDB)
  --all      Run all tests (default)
  --bdd      Use BDD-style output for mock tests
  --filter   Filter tests by name pattern
  --watch    Watch for file changes and re-run tests
  --help     Show this help message

Examples:
  scripts/test.ts                    # Run all tests
  scripts/test.ts --mock             # Run only mock tests
  scripts/test.ts --real             # Run only integration tests
  scripts/test.ts --mock --bdd       # Run mock tests with BDD output
  scripts/test.ts --filter "Insert"  # Run tests matching "Insert"
  scripts/test.ts --watch --mock     # Watch and run mock tests

Prerequisites for integration tests:
  - MongoDB running on localhost:27017
  - Or update connection string in tests/main_test.ts
  `);
}

async function runCommand(cmd: string[]) {
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "inherit",
    stderr: "inherit",
  });

  const { success, code } = await process.output();
  return { success, code };
}

async function runTests(options: TestOptions) {
  const baseCmd = ["deno", "test"];
  const permissions = [
    "--allow-net",
    "--allow-read",
    "--allow-write",
    "--allow-env",
    "--allow-sys",
  ];

  if (options.help) {
    showHelp();
    return;
  }

  console.log("🚀 Starting Nozzle Tests...\n");

  if (options.mock) {
    console.log("📋 Running mock tests (no MongoDB required)...");
    const cmd = [...baseCmd, "tests/mock_test.ts"];
    if (options.bdd) {
      cmd.push("--reporter", "pretty");
    }
    if (options.filter) {
      cmd.push("--filter", options.filter);
    }
    if (options.watch) {
      cmd.push("--watch");
    }

    const result = await runCommand(cmd);
    if (!result.success) {
      console.error("❌ Mock tests failed");
      Deno.exit(result.code);
    } else {
      console.log("✅ Mock tests passed!");
    }
  }

  if (options.real) {
    console.log("🗄️  Running integration tests (MongoDB required)...");
    console.log("⚠️  Make sure MongoDB is running on localhost:27017\n");

    const cmd = [...baseCmd, ...permissions, "tests/main_test.ts"];
    if (options.filter) {
      cmd.push("--filter", options.filter);
    }
    if (options.watch) {
      cmd.push("--watch");
    }

    const result = await runCommand(cmd);
    if (!result.success) {
      console.error("❌ Integration tests failed");
      if (result.code === 1) {
        console.log("\n💡 Troubleshooting tips:");
        console.log(
          "   • Ensure MongoDB is running: brew services start mongodb-community",
        );
        console.log(
          "   • Or start with Docker: docker run -p 27017:27017 -d mongo",
        );
        console.log("   • Check connection at: mongodb://localhost:27017");
      }
      Deno.exit(result.code);
    } else {
      console.log("✅ Integration tests passed!");
    }
  }

  if (options.all) {
    console.log("🎯 Running all tests...\n");

    // Run mock tests first
    console.log("1️⃣ Running mock tests...");
    const mockCmd = [...baseCmd, "tests/mock_test.ts"];
    if (options.bdd) {
      mockCmd.push("--reporter", "pretty");
    }
    if (options.filter) {
      mockCmd.push("--filter", options.filter);
    }

    const mockResult = await runCommand(mockCmd);
    if (mockResult.success) {
      console.log("✅ Mock tests passed!\n");
    } else {
      console.error("❌ Mock tests failed\n");
    }

    // Run integration tests
    console.log("2️⃣ Running integration tests...");
    console.log("⚠️  Make sure MongoDB is running on localhost:27017\n");

    const integrationCmd = [...baseCmd, ...permissions, "tests/main_test.ts"];
    if (options.filter) {
      integrationCmd.push("--filter", options.filter);
    }
    if (options.watch) {
      integrationCmd.push("--watch");
    }

    const integrationResult = await runCommand(integrationCmd);

    if (mockResult.success && integrationResult.success) {
      console.log("\n🎉 All tests passed!");
    } else {
      console.error("\n💥 Some tests failed!");
      if (!integrationResult.success) {
        console.log("\n💡 Integration test troubleshooting:");
        console.log(
          "   • Ensure MongoDB is running: brew services start mongodb-community",
        );
        console.log(
          "   • Or start with Docker: docker run -p 27017:27017 -d mongo",
        );
        console.log("   • Check connection at: mongodb://localhost:27017");
      }
      Deno.exit(Math.max(mockResult.code, integrationResult.code));
    }
  }
}

if (import.meta.main) {
  const options = parseArgs();
  await runTests(options);
}
