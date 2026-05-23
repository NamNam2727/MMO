// =========================================================
// main.js
// =========================================================

window.startGame = function(){

"use strict";

/* =========================================================
   CANVAS
========================================================= */

const canvas =
    document.getElementById("game");

const ctx =
    canvas.getContext("2d");

/* =========================================================
   RESIZE
========================================================= */

function resize(){

    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;
}

window.addEventListener(
    "resize",
    resize
);

resize();

/* =========================================================
   WORLD
========================================================= */

window.Game = {

    worldWidth: 2400,
    worldHeight: 2400,

    gridSize: 32
};

/* =========================================================
   WALLS
========================================================= */

window.walls = [

    {x:400, y:300, w:220, h:120},
    {x:900, y:500, w:120, h:260},
    {x:1300, y:900, w:300, h:100},
    {x:700, y:1200, w:160, h:300}
];

/* =========================================================
   PLAYER
========================================================= */

const player = {

    x: 200,
    y: 200,

    radius: 18,

    moveSpeed: 220,

    moving: false,
    dragMoving: false,

    dragDirX: 0,
    dragDirY: 0,

    path: [],
    pathIndex: 0
};

/* =========================================================
   CAMERA
========================================================= */

const camera = {

    x: 0,
    y: 0
};

/* =========================================================
   GRID INIT
========================================================= */

MovementSystem.Grid.init();

/* =========================================================
   INPUT
========================================================= */

let pointerDown = false;

let dragStartX = 0;
let dragStartY = 0;

let dragging = false;

canvas.addEventListener(
    "pointerdown",
    e => {

        pointerDown = true;

        dragStartX = e.clientX;
        dragStartY = e.clientY;

        dragging = false;
    }
);

canvas.addEventListener(
    "pointermove",
    e => {

        if(!pointerDown){
            return;
        }

        const dx =
            e.clientX - dragStartX;

        const dy =
            e.clientY - dragStartY;

        const dist =
            Math.hypot(dx, dy);

        if(dist > 10){

            dragging = true;

            MovementSystem.setDragMove(
                player,
                dx,
                dy
            );
        }
    }
);

canvas.addEventListener(
    "pointerup",
    e => {

        pointerDown = false;

        if(dragging){

            player.dragMoving = false;

            return;
        }

        const worldX =
            e.clientX + camera.x;

        const worldY =
            e.clientY + camera.y;

        MovementSystem.moveTo(
            player,
            worldX,
            worldY
        );
    }
);

/* =========================================================
   UPDATE
========================================================= */

let lastTime = 0;

function update(dt){

    MovementSystem.updateMovement(
        player,
        dt
    );

    updateCamera();
}

function updateCamera(){

    camera.x =
        player.x - canvas.width / 2;

    camera.y =
        player.y - canvas.height / 2;

    camera.x =
        Math.max(
            0,
            Math.min(
                camera.x,
                Game.worldWidth - canvas.width
            )
        );

    camera.y =
        Math.max(
            0,
            Math.min(
                camera.y,
                Game.worldHeight - canvas.height
            )
        );
}

/* =========================================================
   RENDER
========================================================= */

function render(){

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "#2f5d3a";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.save();

    ctx.translate(
        -camera.x,
        -camera.y
    );

    renderWorld();
    renderPlayer();

    ctx.restore();
}

function renderWorld(){

    ctx.fillStyle = "#666";

    for(const wall of walls){

        ctx.fillRect(
            wall.x,
            wall.y,
            wall.w,
            wall.h
        );
    }
}

function renderPlayer(){

    ctx.beginPath();

    ctx.fillStyle = "#4da6ff";

    ctx.arc(
        player.x,
        player.y,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

/* =========================================================
   LOOP
========================================================= */

function gameLoop(timestamp){

    const dt =
        Math.min(
            (timestamp - lastTime) / 1000,
            0.033
        );

    lastTime = timestamp;

    update(dt);

    render();

    requestAnimationFrame(
        gameLoop
    );
}

requestAnimationFrame(
    gameLoop
);

};