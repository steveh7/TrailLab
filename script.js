let chart = null;
let gpxPoints = [];
let map = null;
let routeLine = null;
let startMarker = null;
let endMarker = null;
let cursorMarker = null;
let analysisCache = null;

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("gpxFile");
  const threshold = document.getElementById("threshold");
  const recenterButton = document.getElementById("recenterMap");

  fileInput.addEventListener("change", loadGPX);

  threshold.addEventListener("change", () => {
    if (gpxPoints.length > 0) {
      analyseParcours(gpxPoints);
      drawMap(gpxPoints);
    }
  });

  if (recenterButton) {
    recenterButton.addEventListener("click", () => {
      fitRouteToMap();
    });
  }

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(target).classList.add("active");

      if (target === "explorer") {
        setTimeout(() => {
          fitRouteToMap();
        }, 350);
      }
    });
  });
});

function loadGPX(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => parseGPX(e.target.result);
  reader.readAsText(file);
}

function parseGPX(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  const trkpts = Array.from(xml.getElementsByTagName("trkpt"));

  if (trkpts.length < 2) {
    alert("Aucun point GPX trouvé.");
    return;
  }

  gpxPoints = trkpts.map(pt => {
    const eleNode = pt.getElementsByTagName("ele")[0];
    const timeNode = pt.getElementsByTagName("time")[0];

    return {
      lat: parseFloat(pt.getAttribute("lat")),
      lon: parseFloat(pt.getAttribute("lon")),
      ele: eleNode ? parseFloat(eleNode.textContent) : 0,
      time: timeNode ? new Date(timeNode.textContent) : null,
      distance: 0
    };
  });

  analyseParcours(gpxPoints);
  drawMap(gpxPoints);
}

function analyseParcours(points) {
  const seuil = Number(document.getElementById("threshold").value);

  let distance = 0;
  let dplus = 0;
  let dminus = 0;
  let altMin = points[0].ele;
  let altMax = points[0].ele;
  let altSomme = 0;

  const chartData = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    if (i > 0) {
      const prev = points[i - 1];
      const segment = haversine(prev.lat, prev.lon, p.lat, p.lon);
      distance += segment;

      const diff = p.ele - prev.ele;
      if (diff > seuil) dplus += diff;
      if (diff < -seuil) dminus += Math.abs(diff);
    }

    p.distance = distance / 1000;

    altSomme += p.ele;
    altMin = Math.min(altMin, p.ele);
    altMax = Math.max(altMax, p.ele);

    chartData.push({
      x: p.distance,
      y: p.ele
    });
  }

  const firstTime = points[0].time;
  const lastTime = points[points.length - 1].time;
  let tempsTotal = 0;

  if (firstTime && lastTime && !isNaN(firstTime) && !isNaN(lastTime)) {
    tempsTotal = (lastTime - firstTime) / 1000;
  }

  const km = distance / 1000;
  const altMoy = altSomme / points.length;
  const dpkm = km > 0 ? dplus / km : 0;
  const vitesseMoy = tempsTotal > 0 ? km / (tempsTotal / 3600) : 0;
  const allureMoy = vitesseMoy > 0 ? 60 / vitesseMoy : 0;

  analysisCache = {
    km,
    dplus,
    dminus,
    dpkm,
    altMin,
    altMax,
    altMoy,
    tempsTotal,
    vitesseMoy,
    allureMoy,
    pointsCount: points.length,
    seuil
  };

  document.getElementById("distance").textContent = km.toFixed(2) + " km";
  document.getElementById("dplus").textContent = Math.round(dplus) + " m";
  document.getElementById("dminus").textContent = Math.round(dminus) + " m";
  document.getElementById("altMin").textContent = Math.round(altMin) + " m";
  document.getElementById("altMax").textContent = Math.round(altMax) + " m";
  document.getElementById("altAvg").textContent = Math.round(altMoy) + " m";
  document.getElementById("dpkm").textContent = Math.round(dpkm) + " m/km";
  document.getElementById("pointsCount").textContent = points.length;
  document.getElementById("totalTime").textContent = tempsTotal > 0 ? formatDuration(tempsTotal) : "-";
  document.getElementById("avgSpeed").textContent = vitesseMoy > 0 ? vitesseMoy.toFixed(1) + " km/h" : "-";
  document.getElementById("avgPace").textContent = allureMoy > 0 ? formatPace(allureMoy) + " /km" : "-";

  generateSummary(analysisCache);
  drawChart(chartData);
  updateInspector(0);
}

function generateSummary(data) {
  let typeParcours = "";
  let niveau = "";

  if (data.dpkm < 20) {
    typeParcours = "parcours plutôt roulant";
    niveau = "facile";
  } else if (data.dpkm < 40) {
    typeParcours = "parcours vallonné";
    niveau = "modéré";
  } else if (data.dpkm < 70) {
    typeParcours = "trail exigeant";
    niveau = "soutenu";
  } else {
    typeParcours = "parcours très montagneux";
    niveau = "difficile";
  }

  const phraseTemps = data.tempsTotal > 0
    ? " Temps total : " + formatDuration(data.tempsTotal) + ", vitesse moyenne : " + data.vitesseMoy.toFixed(1) + " km/h."
    : " Le fichier ne contient pas de données horaires exploitables.";

  document.getElementById("summaryText").textContent =
    "TrailLab identifie un " +
    typeParcours +
    " de " +
    data.km.toFixed(2) +
    " km avec " +
    Math.round(data.dplus) +
    " m D+ et " +
    Math.round(data.dminus) +
    " m D-. Niveau global estimé : " +
    niveau +
    "." +
    phraseTemps +
    " Seuil D+/D- utilisé : " +
    data.seuil +
    " m.";
}

function drawMap(points) {
  if (!points || points.length < 2) return;

  const latlngs = points.map(p => [p.lat, p.lon]);

  if (!map) {
    map = L.map("map", { scrollWheelZoom: true });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(map);
  }

  if (routeLine) routeLine.remove();
  if (startMarker) startMarker.remove();
  if (endMarker) endMarker.remove();
  if (cursorMarker) cursorMarker.remove();

  routeLine = L.polyline(latlngs, {
    weight: 4,
    opacity: 0.95
  }).addTo(map);

  startMarker = L.circleMarker(latlngs[0], {
    radius: 8,
    fillOpacity: 1
  }).addTo(map).bindPopup("Départ");

  endMarker = L.circleMarker(latlngs[latlngs.length - 1], {
    radius: 8,
    fillOpacity: 1
  }).addTo(map).bindPopup("Arrivée");

  cursorMarker = L.circleMarker(latlngs[0], {
    radius: 9,
    fillOpacity: 1,
    weight: 3
  }).addTo(map).bindPopup("Position");

  setTimeout(() => {
  fitRouteToMap();
  updateInspector(0);
}, 300);

  routeLine.on("click", e => {
    const index = findNearestPointIndex(e.latlng.lat, e.latlng.lng);
    updateInspector(index);
  });
}

function fitRouteToMap() {
  if (!map) return;

  map.invalidateSize();

  if (routeLine) {
    map.fitBounds(routeLine.getBounds(), {
      padding: [40, 40],
      maxZoom: 15
    });
  }
}

function drawChart(chartData) {
  const ctx = document.getElementById("profileChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [{
        label: "Altitude (m)",
        data: chartData,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      interaction: {
        mode: "nearest",
        intersect: false
      },
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" }
        },
        tooltip: {
          callbacks: {
            title: context => "Km " + Number(context[0].parsed.x).toFixed(2),
            label: context => "Altitude : " + Math.round(context.parsed.y) + " m"
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: "Distance (km)",
            color: "#94a3b8"
          },
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: 8
          },
          grid: { color: "#334155" }
        },
        y: {
          title: {
            display: true,
            text: "Altitude (m)",
            color: "#94a3b8"
          },
          ticks: { color: "#94a3b8" },
          grid: { color: "#334155" }
        }
      },
      onClick: event => {
        const index = getChartIndexFromEvent(event);
        updateInspector(index);
      }
    }
  });

    const canvas = ctx;

  function moveFromProfile(event) {
    if (!gpxPoints.length || !chart) return;

    event.preventDefault();

    const index = getChartIndexFromEvent(event);
    updateInspector(index);
  }

  canvas.addEventListener("pointermove", moveFromProfile);
  canvas.addEventListener("pointerdown", moveFromProfile);
  canvas.addEventListener("touchmove", moveFromProfile, { passive: false });
  canvas.addEventListener("touchstart", moveFromProfile, { passive: false });
}

function getChartIndexFromEvent(event) {
  if (!chart || !gpxPoints.length) return 0;

  let clientX;

  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
  } else {
    clientX = event.clientX;
  }

  const rect = chart.canvas.getBoundingClientRect();
  const xPixel = clientX - rect.left;
  const km = chart.scales.x.getValueForPixel(xPixel);

  let bestIndex = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < gpxPoints.length; i++) {
    const diff = Math.abs(gpxPoints[i].distance - km);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function updateInspector(index) {
  if (!gpxPoints.length) return;

  index = Math.max(0, Math.min(index, gpxPoints.length - 1));

  const p = gpxPoints[index];
  const totalKm = analysisCache ? analysisCache.km : gpxPoints[gpxPoints.length - 1].distance;
  const remaining = Math.max(0, totalKm - p.distance);
  const slope = calculateSlope(index);

  document.getElementById("inspectKm").textContent = p.distance.toFixed(2);
  document.getElementById("inspectAlt").textContent = Math.round(p.ele) + " m";
  document.getElementById("inspectSlope").textContent = slope > 0 ? "+" + slope.toFixed(1) + " %" : slope.toFixed(1) + " %";
  document.getElementById("inspectRemain").textContent = remaining.toFixed(2) + " km";

  if (cursorMarker) {
    cursorMarker.setLatLng([p.lat, p.lon]);
    cursorMarker.setPopupContent(
      "Km " + p.distance.toFixed(2) +
      "<br>Altitude : " + Math.round(p.ele) + " m" +
      "<br>Pente : " + (slope > 0 ? "+" : "") + slope.toFixed(1) + " %"
    );
  }
}

function calculateSlope(index) {
  if (gpxPoints.length < 3) return 0;

  const before = Math.max(0, index - 5);
  const after = Math.min(gpxPoints.length - 1, index + 5);

  const p1 = gpxPoints[before];
  const p2 = gpxPoints[after];

  const distMeters = (p2.distance - p1.distance) * 1000;
  if (distMeters === 0) return 0;

  return ((p2.ele - p1.ele) / distMeters) * 100;
}

function findNearestPointIndex(lat, lon) {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < gpxPoints.length; i++) {
    const p = gpxPoints[i];
    const d = haversine(lat, lon, p.lat, p.lon);

    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) return h + "h " + String(m).padStart(2, "0") + "min";
  return m + "min " + String(s).padStart(2, "0") + "s";
}

function formatPace(minutesPerKm) {
  const min = Math.floor(minutesPerKm);
  const sec = Math.round((minutesPerKm - min) * 60);

  return min + "'" + String(sec).padStart(2, "0");
}
