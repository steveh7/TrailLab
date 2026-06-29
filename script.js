// =====================================================
// TrailLab v1.1
// Partie 1 - Initialisation
// =====================================================

let chart = null;
let gpxPoints = [];

document.addEventListener("DOMContentLoaded", () => {

    const fileInput = document.getElementById("gpxFile");
    const threshold = document.getElementById("threshold");

    fileInput.addEventListener("change", loadGPX);

    threshold.addEventListener("change", () => {

        if(gpxPoints.length>0){

            analyseParcours(gpxPoints);

        }

    });

});


// =====================================================
// Chargement du fichier GPX
// =====================================================

function loadGPX(event){

    const file = event.target.files[0];

    if(!file) return;

    const reader = new FileReader();

    reader.onload = function(e){

        parseGPX(e.target.result);

    }

    reader.readAsText(file);

}


// =====================================================
// Lecture XML GPX
// =====================================================

function parseGPX(xmlText){

    const parser = new DOMParser();

    const xml = parser.parseFromString(xmlText,"application/xml");

    const trkpts = xml.getElementsByTagName("trkpt");

    if(trkpts.length===0){

        alert("Aucun point GPX trouvé.");

        return;

    }

    gpxPoints=[];

    for(let i=0;i<trkpts.length;i++){

        const pt = trkpts[i];

        const lat = parseFloat(pt.getAttribute("lat"));
        const lon = parseFloat(pt.getAttribute("lon"));

        const eleNode = pt.getElementsByTagName("ele")[0];
        const timeNode = pt.getElementsByTagName("time")[0];

        const ele = eleNode ? parseFloat(eleNode.textContent) : 0;

        const time = timeNode ? new Date(timeNode.textContent) : null;

        gpxPoints.push({

            lat,
            lon,
            ele,
            time

        });

    }

    analyseParcours(gpxPoints);

}


// =====================================================
// Fonction principale d'analyse
// =====================================================

function analyseParcours(points){

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
        // Parcours de tous les points GPX
    for(let i=0;i<points.length;i++){

        const p = points[i];

        altSomme += p.ele;

        altMin = Math.min(altMin,p.ele);
        altMax = Math.max(altMax,p.ele);

        elevations.push(p.ele);

        if(i===0){

            distances.push(0);
            continue;

        }

        const prev = points[i-1];

        const segment = haversine(prev.lat,prev.lon,p.lat,p.lon);

        distance += segment;

        const diff = p.ele - prev.ele;

        if(diff > seuil){

            dplus += diff;

        }

        if(diff < -seuil){

            dminus += Math.abs(diff);

        }

        distances.push(distance/1000);

    }


    // Temps total si les données horaires existent
    const firstTime = points[0].time;
    const lastTime = points[points.length-1].time;

    if(firstTime && lastTime && !isNaN(firstTime) && !isNaN(lastTime)){

        tempsTotal = (lastTime - firstTime) / 1000;

    }


    // Calculs principaux
    const km = distance / 1000;

    const altMoy = altSomme / points.length;

    const dpkm = km > 0 ? dplus / km : 0;

    const vitesseMoy = tempsTotal > 0 ? km / (tempsTotal / 3600) : 0;

    const allureMoy = vitesseMoy > 0 ? 60 / vitesseMoy : 0;


    // Mise à jour de l'affichage
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


    // Résumé automatique
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


    // Graphique
    drawChart(distances,elevations);

}
// =====================================================
// Résumé automatique TrailLab
// =====================================================

function generateSummary(data){

    let typeParcours = "";
    let niveau = "";
    let conseil = "";

    if(data.dpkm < 20){

        typeParcours = "parcours plutôt roulant";
        niveau = "facile";

    } else if(data.dpkm < 40){

        typeParcours = "parcours vallonné";
        niveau = "modéré";

    } else if(data.dpkm < 70){

        typeParcours = "trail exigeant";
        niveau = "soutenu";

    } else {

        typeParcours = "parcours très montagneux";
        niveau = "difficile";

    }

    if(data.km < 10){

        conseil = "Format court, idéal pour une sortie rapide ou une séance spécifique.";

    } else if(data.km < 25){

        conseil = "Format intéressant pour travailler l’endurance et le rythme trail.";

    } else if(data.km < 45){

        conseil = "Parcours long qui demande une bonne gestion de l’effort et de l’alimentation.";

    } else {

        conseil = "Parcours très long : gestion de l’allure, hydratation et alimentation deviennent prioritaires.";

    }

    const denivRatio = data.km > 0 ? data.dplus / data.km : 0;

    let phraseDeniv = "";

    if(denivRatio < 20){

        phraseDeniv = "Le dénivelé est faible par rapport à la distance.";

    } else if(denivRatio < 50){

        phraseDeniv = "Le dénivelé est présent mais reste relativement progressif.";

    } else if(denivRatio < 80){

        phraseDeniv = "Le dénivelé est important et influencera fortement le rythme.";

    } else {

        phraseDeniv = "Le dénivelé est très élevé : le parcours demandera une vraie stratégie de montée.";

    }

    let phraseTemps = "";

    if(data.tempsTotal > 0){

        phraseTemps =
            " Le fichier contient des données horaires : temps total " +
            formatDuration(data.tempsTotal) +
            ", vitesse moyenne " +
            data.vitesseMoy.toFixed(1) +
            " km/h.";

    } else {

        phraseTemps =
            " Le fichier ne contient pas de données horaires exploitables.";

    }

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
        "Le niveau global est estimé : " +
        niveau +
        ". " +
        phraseDeniv +
        " " +
        conseil +
        phraseTemps +
        " Seuil D+/D- utilisé : " +
        data.seuil +
        " m.";

    document.getElementById("summaryText").textContent = texte;

}
// =====================================================
// Graphique altimétrique
// =====================================================

function drawChart(distances,elevations){

    const ctx = document.getElementById("profileChart");

    if(chart){

        chart.destroy();

    }

    chart = new Chart(ctx,{

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

                        title: function(context){

                            return "Km " + context[0].label;

                        },

                        label: function(context){

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


// =====================================================
// Distance entre deux coordonnées GPS
// Formule de Haversine
// =====================================================

function haversine(lat1,lon1,lat2,lon2){

    const R = 6371000;

    const toRad = deg => deg * Math.PI / 180;

    const dLat = toRad(lat2-lat1);

    const dLon = toRad(lon2-lon1);

    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) *
        Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

    return R * c;

}


// =====================================================
// Formatage durée
// =====================================================

function formatDuration(seconds){

    const h = Math.floor(seconds / 3600);

    const m = Math.floor((seconds % 3600) / 60);

    const s = Math.floor(seconds % 60);

    if(h > 0){

        return h + "h " + String(m).padStart(2,"0") + "min";

    }

    return m + "min " + String(s).padStart(2,"0") + "s";

}


// =====================================================
// Formatage allure min/km
// =====================================================

function formatPace(minutesPerKm){

    const min = Math.floor(minutesPerKm);

    const sec = Math.round((minutesPerKm - min) * 60);

    return min + "'" + String(sec).padStart(2,"0");

}
