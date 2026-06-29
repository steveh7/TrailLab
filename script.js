let chart = null;

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("gpxFile");
  input.addEventListener("change", handleFile);
});

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      analyzeGPX(e.target.result);
    } catch (error) {
      alert("Erreur d'analyse du GPX : " + error.message);
    }
  };

  reader.readAsText(file);
}

function analyzeGPX(gpxText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");

  const trkpts = Array.from(xml.getElementsByTagName("trkpt"));

  if (trkpts.length < 2) {
    alert("Aucun point GPX trouvé.");
    return;
  }

  const points = trkpts.map(pt => {
    const lat = parseFloat(pt.getAttribute("lat"));
    const lon = parseFloat(pt.getAttribute("lon"));
    const eleNode = pt.getElementsByTagName("ele")[0];
    const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
    return { lat, lon, ele };
  });

  let distance = 0;
  let dplus = 0;
  let dminus = 0;

  const elevations = [];
  const distances = [];

  let altMin = points[0].ele;
  let altMax = points[0].ele;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    elevations.push(p.ele);

    if (i === 0) {
      distances.push(0);
      continue;
    }

    const prev = points[i - 1];

    const segment = haversine(prev.lat, prev.lon, p.lat, p.lon);
    distance += segment;

    const diff = p.ele - prev.ele;

    if (diff > 3) dplus += diff;
    if (diff < -3) dminus += Math.abs(diff);

    altMin = Math.min(altMin, p.ele);
    altMax = Math.max(altMax, p.ele);

    distances.push(distance / 1000);
  }

  const km = distance / 1000;
  const dpkm = km > 0 ? dplus / km : 0;

  document.getElementById("distance").textContent = km.toFixed(2) + " km";
  document.getElementById("dplus").textContent = Math.round(dplus) + " m";
  document.getElementById("dminus").textContent = Math.round(dminus) + " m";
  document.getElementById("altMin").textContent = Math.round(altMin) + " m";
  document.getElementById("altMax").textContent = Math.round(altMax) + " m";
  document.getElementById("dpkm").textContent = Math.round(dpkm) + " m/km";

  drawChart(distances, elevations);
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function drawChart(distances, elevations) {
  const ctx = document.getElementById("profileChart");

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: distances.map(d => d.toFixed(1)),
      datasets: [{
        label: "Altitude (m)",
        data: elevations,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Distance (km)",
            color: "#94a3b8"
          },
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: 8
          },
          grid: {
            color: "#334155"
          }
        },
        y: {
          title: {
            display: true,
            text: "Altitude (m)",
            color: "#94a3b8"
          },
          ticks: {
            color: "#94a3b8"
          },
          grid: {
            color: "#334155"
          }
        }
      }
    }
  });
}
