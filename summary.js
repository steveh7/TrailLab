// =====================================================
// TrailLab v1.4
// summary.js
// Génération du résumé intelligent
// =====================================================

function generateSummary(data){

    let typeParcours="";
    let niveau="";
    let conseil="";

    if(data.dpkm<20){

        typeParcours="parcours roulant";
        niveau="facile";

    }

    else if(data.dpkm<40){

        typeParcours="parcours vallonné";
        niveau="modéré";

    }

    else if(data.dpkm<70){

        typeParcours="trail exigeant";
        niveau="difficile";

    }

    else{

        typeParcours="parcours très montagneux";
        niveau="très difficile";

    }


    if(data.km<10){

        conseil="Idéal pour une sortie rapide.";

    }

    else if(data.km<25){

        conseil="Parcours intéressant pour travailler le rythme.";

    }

    else if(data.km<45){

        conseil="Une bonne gestion de l'effort sera importante.";

    }

    else{

        conseil="Gestion de l'alimentation indispensable.";

    }


    let texte="";

    texte+="TrailLab identifie un ";

    texte+=typeParcours;

    texte+=" de ";

    texte+=round(data.km,2);

    texte+=" km avec ";

    texte+=Math.round(data.dplus);

    texte+=" m D+.";

    texte+=" Niveau estimé : ";

    texte+=niveau;

    texte+=". ";

    texte+=conseil;

    document.getElementById("summaryText").textContent=texte;

}
