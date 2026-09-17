
# DPI Analyzer — Deep Packet Inspection & Network Traffic Dashboard

A C++-based Deep Packet Inspection (DPI) system with a Node.js web dashboard for analyzing network traffic, identifying applications and domains, configuring packet-blocking rules, and inspecting packet-processing statistics.

The project combines a multithreaded packet-processing engine with a browser-based dashboard to make PCAP analysis easier to run and understand.

---

## Overview

DPI Analyzer processes network traffic stored in PCAP files and provides insights into packet protocols, application traffic, detected domains, and packet-processing behavior.

The system includes:

- PCAP file reading and packet parsing
- Application identification using traffic information
- HTTP Host and TLS SNI extraction
- Connection tracking and flow-based processing
- Multithreaded packet processing using load balancers and fast-path workers
- Configurable application, IP, and domain blocking rules
- Processed PCAP output
- Node.js and Express.js integration
- Web dashboard for viewing analysis results
- Chart.js visualizations for application and thread statistics

---

## Features

### Core DPI Engine

- Reads and processes packets from PCAP files.
- Parses network packet information.
- Identifies supported applications using available traffic signatures.
- Extracts domain information from supported HTTP Host and TLS SNI data.
- Tracks network flows using connection information.
- Uses load balancers and fast-path workers for multithreaded processing.
- Supports configurable load-balancer and fast-path thread counts.
- Supports application, IP-address, and domain-based blocking rules.
- Writes processed packets to an output PCAP file.
- Reports packet-processing statistics.

### Web Dashboard

- Browser-based interface for running packet analysis.
- Displays total packets, forwarded packets, dropped packets, and byte statistics.
- Includes application breakdown and thread distribution chart sections.
- Displays detected domain/SNI information.
- Shows raw engine output for inspection and debugging.
- Provides analysis status and execution feedback.

### Backend Integration

- Runs the C++ DPI executable through Node.js child processes.
- Captures engine standard output and standard error.
- Parses engine output into structured JavaScript data.
- Provides an Express API endpoint for triggering analysis.
- Prevents overlapping engine executions.

---

## Technology Stack

| Area | Technologies |
|---|---|
| Core engine | C++ |
| Packet capture | PCAP |
| Backend | Node.js, Express.js |
| Templating | EJS |
| Frontend | HTML, CSS, JavaScript |
| Data visualization | Chart.js |
| Process integration | Node.js Child Process API |

---

## Project Architecture

```text
                 Input PCAP
                     |
                     v
          +----------------------+
          |      DPI Engine      |
          |----------------------|
          | PCAP Reader          |
          | Packet Parser        |
          | Application Detection|
          | SNI / Host Extraction|
          | Connection Tracking  |
          | Blocking Rules       |
          | Load Balancers       |
          | Fast-Path Workers    |
          +----------------------+
                     |
          +----------+----------+
          |                     |
          v                     v
    Engine Statistics       Output PCAP
          |
          v
  +------------------------+
  | Node.js / Express.js   |
  |------------------------|
  | Child Process          |
  | Output Capture         |
  | Output Parser          |
  | Dashboard API          |
  +------------------------+
          |
          v
  +------------------------+
  | EJS Web Dashboard      |
  |------------------------|
  | Packet Statistics     |
  | Application Chart     |
  | Thread Distribution   |
  | Domain/SNI Table      |
  | Raw Engine Output     |
  +------------------------+
```

---

## Project Structure

```text
Packet_analyzer/
│
├── include/
│   ├── pcap_reader.h
│   ├── packet_parser.h
│   ├── sni_extractor.h
│   ├── types.h
│   ├── rule_manager.h
│   ├── connection_tracker.h
│   ├── load_balancer.h
│   ├── fast_path.h
│   ├── thread_safe_queue.h
│   └── dpi_engine.h
│
├── src/
│   ├── pcap_reader.cpp
│   ├── packet_parser.cpp
│   ├── sni_extractor.cpp
│   ├── types.cpp
│   ├── main_working.cpp
│   ├── dpi_mt.cpp
│   └── [other source files]
│
├── dashboard/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   │
│   ├── lib/
│   │   └── parser.js
│   │
│   ├── views/
│   │   └── index.ejs
│   │
│   ├── public/
│   │   ├── styles.css
│   │   └── js/
│   │       └── dashboard.js
│   │
│   └── node_modules/          # Installed by npm install
│
├── dpi_engine.exe             # Compiled DPI engine
├── test_dpi.pcap              # Sample PCAP input
├── output.pcap                # Example engine output
├── dashboard_output.pcap      # Dashboard-generated output
├── generate_test_pcap.py      # Test PCAP generator, if present
├── CMakeLists.txt
└── README.md
```

---

## Getting Started

### Prerequisites

- Windows 10/11
- Node.js and npm
- C++ compiler compatible with the project
- CMake, if building from source
- A PCAP file for analysis

---

## 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Packet_analyzer
```

Replace the placeholder with your repository URL.

---

## 2. Run the DPI Engine

Open Command Prompt in the project root directory.

### Basic execution

```cmd
dpi_engine.exe test_dpi.pcap output.pcap
```

The engine reads `test_dpi.pcap`, processes the captured packets, and writes the resulting output to `output.pcap`.

### Configure load balancers and fast-path threads

```cmd
dpi_engine.exe test_dpi.pcap output.pcap --lbs 2 --fps 2
```

| Option | Description | Default |
|---|---|---:|
| `--lbs` | Number of load balancers | 2 |
| `--fps` | Fast-path threads per load balancer | 2 |

---

## 3. Run with Blocking Rules

Example:

```cmd
dpi_engine.exe test_dpi.pcap output.pcap --block-app YouTube --block-app TikTok --block-ip 192.168.1.50 --block-domain facebook
```

You can also combine blocking options with thread configuration:

```cmd
dpi_engine.exe test_dpi.pcap output.pcap --lbs 2 --fps 2 --block-app YouTube --block-app TikTok --block-ip 192.168.1.50 --block-domain facebook
```

The engine applies rules according to its implemented matching logic. Packets are dropped only when traffic matches the configured rules.

---

## 4. Build the C++ Engine from Source

If the compiled executable is not available, build the engine using the project's CMake configuration.

From the project root:

```cmd
cmake -S . -B build
cmake --build build --config Release
```

The exact executable location depends on the project's CMake target and build configuration. If necessary, update the dashboard's `ENGINE_PATH` in `dashboard/server.js` to point to the compiled executable.

---

## 5. Set Up the Dashboard

Navigate to the dashboard folder:

```cmd
cd dashboard
```

Install dependencies:

```cmd
npm install
```

Ensure Chart.js is installed:

```cmd
npm install chart.js
```

---

## 6. Start the Dashboard

From inside the `dashboard` directory:

```cmd
npm start
```

If no `start` script is configured in `package.json`, run:

```cmd
node server.js
```

Open the dashboard in your browser:

```text
http://localhost:3000
```

---

## Dashboard Workflow

1. Start the Node.js dashboard server.
2. Open the dashboard in a browser.
3. Trigger analysis using the **Run analysis** button.
4. The Express backend launches the DPI engine.
5. The engine processes the configured PCAP input.
6. The backend captures and parses the engine output.
7. The dashboard receives structured analysis data.
8. Packet statistics and available visualizations are updated.

---

## Backend API

### Run Engine Analysis

```http
POST /api/run-engine
```

The endpoint runs the DPI engine and returns the parsed analysis output as JSON.

### Form-Based Execution

```http
POST /run-engine
```

The Express application also includes a form-based route for executing analysis and rendering the dashboard.

---

## Sample Analysis

A sample run using the included test capture produced the following packet statistics:

| Metric | Sample Result |
|---|---:|
| Packets read | 77 |
| TCP packets | 73 |
| UDP packets | 4 |
| Forwarded packets | 77 |
| Dropped packets | 0 |

The sample capture also contained application categories such as HTTPS, DNS, and Unknown traffic.

These values represent a particular test run. Results can vary depending on the PCAP contents and configured blocking rules.

---

## Current Development Status

- C++ DPI engine and PCAP processing.
- Multithreaded processing configuration.
- Application, IP, and domain blocking options.
- Node.js backend integration with the engine executable.
- EJS dashboard layout and packet-statistics display.
- Engine-output parsing.
- Chart.js application and thread visualization integration.
- Validation of chart data and blocking statistics.

---

## Future Improvements

- Complete validation of application and thread charts.
- Improve engine-output parsing and byte-statistics accuracy.
- Configure blocking rules directly through the dashboard.
- Improve error handling and analysis feedback.
- Add authentication and user-specific access.
- Deploy the dashboard for remote access.
- Add automated tests using multiple PCAP files.

---

## Disclaimer

This project is intended for educational and authorized network traffic analysis.

Only analyze packet captures and use blocking functionality on networks and systems you own or have permission to test.