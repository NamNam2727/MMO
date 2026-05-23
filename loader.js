(async () => {

"use strict";

const loading =
    document.createElement("div");

loading.textContent = "Loading...";

loading.style.position = "fixed";
loading.style.left = "10px";
loading.style.top = "10px";
loading.style.color = "#fff";
loading.style.zIndex = "9999";

document.body.appendChild(loading);

const scripts = [

    "https://namnam2727.github.io/MMO/movement.js",

    "https://namnam2727.github.io/MMO/main.js"
];

for(const src of scripts){

    await loadScript(src);
}

loading.remove();

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