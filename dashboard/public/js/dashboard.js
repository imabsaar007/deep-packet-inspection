(function () {
  "use strict";

  var form = document.getElementById("run-form");
  var runBtn = document.getElementById("run-btn");
  var statusEl = document.getElementById("status");
  var dashboard = document.getElementById("dashboard");

  var appsChart = null;
  var threadsChart = null;

  // Palette used for the application-breakdown doughnut. Ordered so the
  // biggest, most common categories (HTTPS/Unknown) land on the calmer
  // colors and specific apps get the more saturated ones.
  var PALETTE = [
    "#4FD1C5", "#7C8695", "#E8B84F", "#5B8DEF", "#E2543D",
    "#8A7CE8", "#4FBF7A", "#D65DB1", "#4FA8D1", "#C9A24F",
    "#6FCF97", "#E67E9E", "#5FB3B3", "#B0839C", "#8FBF4F",
    "#E29B4F", "#6E8FD1", "#B57CE8",
  ];

  function setStatus(state, label) {
    statusEl.dataset.state = state;
    statusEl.querySelector(".status-label").textContent = label;
  }

  function fmt(n) {
    return Number(n).toLocaleString();
  }

  function renderStats(parsed) {
    document.getElementById("stat-total").textContent = fmt(parsed.stats.totalPackets);
    document.getElementById("stat-bytes").textContent = fmt(parsed.stats.totalBytes);
    document.getElementById("stat-forwarded").textContent = fmt(parsed.stats.forwarded);
    document.getElementById("stat-dropped").textContent = fmt(parsed.stats.dropped);
    document.getElementById("stat-fps").textContent = fmt(parsed.meta.totalFps || 0);
  }

  function renderDomainTable(parsed) {
    var body = document.getElementById("domain-table-body");
    body.innerHTML = "";
    parsed.domains.forEach(function (d) {
      var tr = document.createElement("tr");

      var tdDomain = document.createElement("td");
      tdDomain.className = "mono";
      tdDomain.textContent = d.domain;

      var tdApp = document.createElement("td");
      var pill = document.createElement("span");
      pill.className = "app-pill";
      pill.textContent = d.app;
      tdApp.appendChild(pill);

      tr.appendChild(tdDomain);
      tr.appendChild(tdApp);
      body.appendChild(tr);
    });
  }

  function renderAppsChart(parsed) {
    var ctx = document.getElementById("chart-apps").getContext("2d");
    var labels = parsed.appBreakdown.map(function (a) { return a.app; });
    var counts = parsed.appBreakdown.map(function (a) { return a.count; });
    var colors = labels.map(function (_, i) { return PALETTE[i % PALETTE.length]; });

    if (appsChart) appsChart.destroy();
    appsChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderColor: "#181D25",
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#E4E7EB",
              font: { family: "IBM Plex Mono", size: 11 },
              boxWidth: 12,
            },
          },
          tooltip: {
            callbacks: {
              label: function (item) {
                var total = counts.reduce(function (a, b) { return a + b; }, 0);
                var pct = total ? Math.round((item.raw / total) * 1000) / 10 : 0;
                return item.label + ": " + item.raw + " packets (" + pct + "%)";
              },
            },
          },
        },
      },
    });
  }

  function renderThreadsChart(parsed) {
    var ctx = document.getElementById("chart-threads").getContext("2d");
    var labels = parsed.threads.map(function (t) { return t.id; });
    var counts = parsed.threads.map(function (t) { return t.count; });
    var colors = parsed.threads.map(function (t) {
      return t.role === "dispatched" ? "#E8B84F" : "#4FD1C5";
    });

    if (threadsChart) threadsChart.destroy();
    threadsChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderRadius: 3,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: "#838FA0", font: { family: "IBM Plex Mono", size: 11 } },
            grid: { display: false },
          },
          y: {
            ticks: { color: "#838FA0", font: { family: "IBM Plex Mono", size: 11 } },
            grid: { color: "#262D38" },
            beginAtZero: true,
          },
        },
      },
    });
  }

  function renderAll(parsed) {
    dashboard.classList.remove("is-empty");
    var emptyState = dashboard.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    renderStats(parsed);
    renderDomainTable(parsed);
    renderAppsChart(parsed);
    renderThreadsChart(parsed);
    document.getElementById("raw-output").textContent = parsed.raw;
  }

  function showError(message) {
    var existing = document.querySelector(".banner-error");
    if (existing) existing.remove();

    var banner = document.createElement("div");
    banner.className = "banner banner-error";
    banner.innerHTML = "<strong>Engine failed to run.</strong><pre></pre>";
    banner.querySelector("pre").textContent = message;
    document.body.insertBefore(banner, document.querySelector("main"));
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    runBtn.disabled = true;
    runBtn.textContent = "Running…";
    setStatus("running", "Running");

    fetch("/api/run-engine", { method: "POST" })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (result) {
        if (!result.ok || !result.body.ok) {
          throw new Error((result.body && result.body.error) || "Unknown engine error");
        }
        renderAll(result.body.parsed);
        setStatus("done", "Done");
      })
      .catch(function (err) {
        setStatus("error", "Failed");
        showError(err.message);
      })
      .finally(function () {
        runBtn.disabled = false;
        runBtn.textContent = "Run analysis";
      });
  });

  // If the page was rendered server-side with results already (no-JS
  // form fallback landed here with data), draw the charts immediately.
  if (window.__INITIAL_DATA__) {
    renderAll(window.__INITIAL_DATA__);
    setStatus("done", "Done");
  }
})();