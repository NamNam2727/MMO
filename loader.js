(async () => {

"use strict";

const scripts = [

    "https://namnam2727.github.io/MMO/movement.js"

];

function loadScript(src){

    return new Promise((resolve, reject) => {

        const script =
            document.createElement("script");

        script.src = src;

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

for(const src of scripts){

    await loadScript(src);
}

console.log(
    "[Loader] All scripts loaded"
);

// 少し待つ
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

})();