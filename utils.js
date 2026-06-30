// =====================================================
// TrailLab v1.4
// utils.js
// Fonctions utilitaires communes
// =====================================================

// -----------------------------------------------------
// Distance GPS (Haversine)
// -----------------------------------------------------

function haversine(lat1, lon1, lat2, lon2){

    const R = 6371000;

    const toRad = deg => deg * Math.PI / 180;

    const dLat = toRad(lat2-lat1);

    const dLon = toRad(lon2-lon1);

    const a =
        Math.sin(dLat/2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

    return R*c;

}

// -----------------------------------------------------
// Format durée
// -----------------------------------------------------

function formatDuration(seconds){

    const h = Math.floor(seconds/3600);

    const m = Math.floor((seconds%3600)/60);

    const s = Math.floor(seconds%60);

    if(h>0){

        return h+"h "+String(m).padStart(2,"0")+"min";

    }

    return m+"min "+String(s).padStart(2,"0")+"s";

}

// -----------------------------------------------------
// Format allure
// -----------------------------------------------------

function formatPace(minutesPerKm){

    const min = Math.floor(minutesPerKm);

    const sec = Math.round((minutesPerKm-min)*60);

    return min+"'"+String(sec).padStart(2,"0");

}

// -----------------------------------------------------
// Arrondi intelligent
// -----------------------------------------------------

function round(value,digits=0){

    const factor = Math.pow(10,digits);

    return Math.round(value*factor)/factor;

}

// -----------------------------------------------------
// Pourcentage
// -----------------------------------------------------

function percent(part,total){

    if(total===0) return 0;

    return (part/total)*100;

}

// -----------------------------------------------------
// Dénivelé par kilomètre
// -----------------------------------------------------

function dPlusPerKm(dplus,distance){

    if(distance===0) return 0;

    return dplus/distance;

}
