// =====================================================
// TrailLab v1.2 - Analyse + Carte
// Partie 1 - Initialisation
// =====================================================

let chart = null;
let gpxPoints = [];
let map = null;
let routeLine = null;

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("gpxFile");
  const threshold = document.getElementById("threshold");
  const tabs = document.querySelectorAll(".tab");

  fileInput.addEventListener("change", loadGPX);

  threshold.addEventListener("change", () => {
    if (gpxPoints.length > 0) {
      analyseParcours(gpxPoints);
      drawMap(gpxPoints);
    }
  });

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(target).classList.add("active");

      if (target === "carte" && map) {
        setTimeout(() => {
          map.invalidateSize();
          if (routeLine) {
            map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
          }
        }, 200);
      }
    });
  });
});

function loadGPX(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    parseGPX(e.target.result);
  };

  reader.readAsText(file);
}

function parseGPX(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  const trkpts = xml.getElementsByTagName("trkpt");

  if (trkpts.length === 0) {
    alert("Aucun point GPX trouvé.");
    return;
  }

  gpxPoints = [];

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];

    const lat = parseFloat(pt.getAttribute("lat"));
    const lon = parseFloat(pt.getAttribute("lon"));

    const eleNode = pt.getElementsByTagName("ele")[0];
    const timeNode = pt.getElementsByTagName("time")[0];

    const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
    const time = timeNode ? new Date(timeNode.textContent) : null;

    gpxPoints.push({ lat, lon, ele, time });
  }

  analyseParcours(gpxPoints);
  drawMap(gpxPoints);
}
// =====================================================
// Partie 2 - Analyse du parcours
// =====================================================

function analyseParcours(points) {
  const seuil = Number(document.getElementById("threshold").value);

  let distance = 0;
  let dplus = 0;
  let dminus = 0;
  let altMin = points[0].ele;
  let altMax = points[0].ele;
  let altSomme = 0;
  let distances = [];
  let elevations = [];
  let tempsTotal = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    altSomme += p.ele;
    altMin = Math.min(altMin, p.ele);
    altMax = Math.max(altMax, p.ele);
    elevations.push(p.ele);

    if (i === 0) {
      distances.push(0);
      continue;
    }

    const prev = points[i - 1];
    const segment = haversine(prev.lat, prev.lon, p.lat, p.lon);

    distance += segment;

    const diff = p.ele - prev.ele;

    if (diff > seuil) dplus += diff;
    if (diff < -seuil) dminus += Math.abs(diff);

    distances.push(distance / 1000);
  }

  const firstTime = points[0].time;
  const lastTime = points[points.length - 1].time;

  if (firstTime && lastTime && !isNaN(firstTime) && !isNaN(lastTime)) {
    tempsTotal = (lastTime - firstTime) / 1000;
  }

  const km = distance / 1000;
  const altMoy = altSomme / points.length;
  const dpkm = km > 0 ? dplus / km : 0;
  const vitesseMoy = tempsTotal > 0 ? km / (tempsTotal / 3600) : 0;
  const allureMoy = vitesseMoy > 0 ? 60 / vitesseMoy : 0;

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

  generateSummary({
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
  });

  drawChart(distances, elevations);
}
// =====================================================
// Partie 3 - Résumé + Carte
// =====================================================

function generateSummary(data) {
  let typeParcours = "";
  let niveau = "";
  let conseil = "";

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

  if (data.km < 10) {
    conseil = "Format court, idéal pour une sortie rapide ou une séance spécifique.";
  } else if (data.km < 25) {
    conseil = "Format intéressant pour travailler l’endurance et le rythme trail.";
  } else if (data.km < 45) {
    conseil = "Parcours long qui demande une bonne gestion de l’effort et de l’alimentation.";
  } else {
    conseil = "Parcours très long : gestion de l’allure, hydratation et alimentation deviennent prioritaires.";
  }

  const phraseTemps = data.tempsTotal > 0
    ? " Le fichier contient des données horaires : temps total " +
      formatDuration(data.tempsTotal) +
      ", vitesse moyenne " +
      data.vitesseMoy.toFixed(1) +
      " km/h."
    : " Le fichier ne contient pas de données horaires exploitables.";

  const texte =
    "TrailLab identifie un " +
    typeParcours +
    " de " +
    data.km.toFixed(2) +
    " km avec " +
    Math.round(data.dplus) +
    " m D+ et " +
    Math.round(data.dminus) +
    " m D-. " +
    "Niveau global estimé : " +
    niveau +
    ". " +
    conseil +
    phraseTemps +
    " Seuil D+/D- utilisé : " +
    data.seuil +
    " m.";

  document.getElementById("summaryText").textContent = texte;
}

function drawMap(points) {
  if (!points || points.length < 2) return;

  const latlngs = points.map(p => [p.lat, p.lon]);

  if (!map) {
    map = L.map("map", {
      scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(map);
  }

  if (routeLine) {
    routeLine.remove();
  }

  routeLine = L.polyline(latlngs, {
    weight: 4,
    opacity: 0.9
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), {
    padding: [20, 20]
  });

  const start = latlngs[0];
  const end = latlngs[latlngs.length - 1];

  L.circleMarker(start, {
    radius: 7,
    fillOpacity: 1
  }).addTo(map).bindPopup("Départ");

  L.circleMarker(end, {
    radius: 7,
    fillOpacity: 1
  }).addTo(map).bindPopup("Arrivée");
}
// =====================================================
// Partie 4 - Graphique + Fonctions utilitaires
// =====================================================

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
        tension: 0.25,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              return "Km " + context[0].label;
            },
            label: function(context) {
              return "Altitude : " + Math.round(context.raw) + " m";
            }
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

  if (h > 0) {
    return h + "h " + String(m).padStart(2, "0") + "min";
  }

  return m + "min " + String(s).padStart(2, "0") + "s";
}

function formatPace(minutesPerKm) {
  const min = Math.floor(minutesPerKm);
  const sec = Math.round((minutesPerKm - min) * 60);

  return min + "'" + String(sec).padStart(2, "0");
}
