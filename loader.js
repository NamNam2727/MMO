// =========================================================
// loader.js
// =========================================================

(async () => {

"use strict";

/* =========================================================
   SCRIPT LIST
========================================================= */

const scripts = [

    "https://namnam2727.github.io/MMO/movement.js"

];

/* =========================================================
   LOAD SCRIPT
========================================================= */

function loadScript(src){

    return new Promise((resolve, reject) => {

        const script =
            document.createElement("script");

        script.src = src;

        script.onload = () => {

            console.log(
                "[Loader] Loaded:",
                src
            );

            resolve();
        };

        script.onerror = () => {

            console.error(
                "[Loader] Failed:",
                src
            );

            reject(src);
        };

        document.body.appendChild(script);
    });
}

/* =========================================================
   LOAD ALL
========================================================= */

async function loadAll(){

    for(const src of scripts){

        await loadScript(src);
    }

    console.log(
        "[Loader] All scripts loaded"
    );

    if(typeof startGame === "function"){

        startGame();
    }
    else{

        console.warn(
            "[Loader] startGame not found"
        );
    }
}

loadAll();

})();