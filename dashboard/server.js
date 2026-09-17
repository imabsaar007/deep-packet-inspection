
"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const { parseEngineOutput } = require("./lib/parser");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------
// Paths
// ---------------------------------------------

const DASHBOARD_DIR = __dirname;
const PROJECT_ROOT = path.resolve(DASHBOARD_DIR, "..");

const ENGINE_PATH = path.join(
    PROJECT_ROOT,
    "dpi_engine.exe"
);

const INPUT_PATH = path.join(
    PROJECT_ROOT,
    "test_dpi.pcap"
);

const OUTPUT_PATH = path.join(
    PROJECT_ROOT,
    "dashboard_output.pcap"
);

const PUBLIC_DIR = path.join(
    DASHBOARD_DIR,
    "public"
);

const VIEWS_DIR = path.join(
    DASHBOARD_DIR,
    "views"
);

const CHARTJS_DIR = path.join(
    DASHBOARD_DIR,
    "node_modules",
    "chart.js",
    "dist"
);

// ---------------------------------------------
// Express configuration
// ---------------------------------------------

app.set("view engine", "ejs");
app.set("views", VIEWS_DIR);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Frontend CSS and JavaScript
app.use(
    express.static(PUBLIC_DIR)
);

// Serve locally installed Chart.js
app.use(
    "/vendor/chart.js",
    express.static(CHARTJS_DIR)
);

// ---------------------------------------------
// Analysis state
// ---------------------------------------------

let isRunning = false;

// ---------------------------------------------
// Run the existing C++ DPI engine
// ---------------------------------------------

function runEngine({ lbs = 2, fps = 2 } = {}) {
    return new Promise((resolve, reject) => {

        // Prevent overlapping engine executions
        if (isRunning) {
            reject(
                new Error(
                    "An analysis is already running. Please wait."
                )
            );
            return;
        }

        // Validate paths
        if (!fs.existsSync(ENGINE_PATH)) {
            reject(
                new Error(
                    `DPI engine not found: ${ENGINE_PATH}`
                )
            );
            return;
        }

        if (!fs.existsSync(INPUT_PATH)) {
            reject(
                new Error(
                    `Input PCAP not found: ${INPUT_PATH}`
                )
            );
            return;
        }

        isRunning = true;

        const args = [
            INPUT_PATH,
            OUTPUT_PATH,
            "--lbs", String(lbs),
            "--fps", String(fps)
        ];

        let stdout = "";
        let stderr = "";
        let settled = false;

        console.log("\nStarting DPI analysis...");
        console.log("Input:", INPUT_PATH);
        console.log("Output:", OUTPUT_PATH);
        console.log("Load balancers:", lbs);
        console.log("Fast-path threads per LB:", fps);

        const engine = spawn(
            ENGINE_PATH,
            args,
            {
                cwd: PROJECT_ROOT,
                windowsHide: true
            }
        );

        function finish(callback, value) {
            if (settled) return;

            settled = true;
            isRunning = false;

            callback(value);
        }

        engine.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        engine.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        engine.on("error", (error) => {
            finish(
                reject,
                new Error(
                    `Failed to start DPI engine: ${error.message}`
                )
            );
        });

        engine.on("close", (code) => {
            if (code !== 0) {
                finish(
                    reject,
                    new Error(
                        [
                            `Engine exited with code ${code}`,
                            stderr,
                            stdout
                        ].filter(Boolean).join("\n")
                    )
                );

                return;
            }

            console.log("DPI analysis completed.");

            // Combine both streams in case the engine
            // writes some output to stderr.
            const output = [
                stdout,
                stderr
            ].filter(Boolean).join("\n");

            finish(resolve, output);
        });
    });
}

// ---------------------------------------------
// Render dashboard
// ---------------------------------------------

app.get("/", (req, res) => {
    res.render("index", {
        parsed: null,
        error: null
    });
});

// ---------------------------------------------
// Form fallback
// ---------------------------------------------

app.post("/run-engine", async (req, res) => {
    try {
        const output = await runEngine();

        const parsed = parseEngineOutput(output);

        res.render("index", {
            parsed,
            error: null
        });

    } catch (error) {
        console.error("Analysis failed:", error.message);

        res.status(500).render("index", {
            parsed: null,
            error: error.message
        });
    }
});

// ---------------------------------------------
// API endpoint for dashboard.js
// ---------------------------------------------

app.post("/api/run-engine", async (req, res) => {
    try {
        const output = await runEngine();

        const parsed = parseEngineOutput(output);

        res.json({
            ok: true,
            parsed
        });

    } catch (error) {
        console.error("API analysis failed:", error.message);

        const statusCode = isRunning ? 409 : 500;

        res.status(statusCode).json({
            ok: false,
            error: error.message
        });
    }
});

// ---------------------------------------------
// 404 handler
// ---------------------------------------------

app.use((req, res) => {
    res.status(404).send("Route not found");
});

// ---------------------------------------------
// Start server
// ---------------------------------------------

app.listen(PORT, () => {
    console.log("-----------------------------------");
    console.log("DPI Analyzer Dashboard");
    console.log("-----------------------------------");
    console.log(`Dashboard: http://localhost:${PORT}`);
    console.log(`Engine: ${ENGINE_PATH}`);
    console.log(`Input PCAP: ${INPUT_PATH}`);
    console.log("-----------------------------------");
});