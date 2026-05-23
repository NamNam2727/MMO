// =========================================================
// loader.js
// =========================================================

(async () => {

"use strict";

/* =========================================================
   SCRIPT LIST
========================================================= */

const scripts = [

    "https://namnam2727.github.io/MMO/movement.js",

    "https://namnam2727.github.io/MMO/main.js"

];

/* =========================================================
   LOAD SCRIPT
========================================================= */

function loadScript(src){

    return new Promise((resolve, reject) => {

        const script =
            document.createElement("script");

        script.src = src;

        // 読み込み順維持
        script.async = false;

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

        document.head.appendChild(script);
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

    // 少し待ってから開始
    setTimeout(() => {

        if(typeof window.startGame === "function"){

            window.startGame();
        }
        else{

            console.warn(
                "[Loader] startGame not found"
            );
        }

    }, 0);
}

loadAll();

})();