(async () => {

"use strict";

const scripts = [

    "https://namnam2727.github.io/MMO/movement.js",

    "https://namnam2727.github.io/MMO/main.js"
];

for(const src of scripts){

    await loadScript(src);
}

function loadScript(src){

    return new Promise((resolve, reject) => {

        const script =
            document.createElement("script");

        script.src = src;

        script.onload = resolve;

        script.onerror = reject;

        document.body.appendChild(script);
    });
}

})();