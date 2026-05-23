// =========================================================
// main.js
// プレイヤー中央固定カメラ版
// =========================================================

window.startGame = function(){

"use strict";

/* =========================================================
   DEBUG
========================================================= */

const debug =
    document.getElementById("debug");

if(debug){

    debug.innerHTML =
        "Game Started";
}

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

    x: 1200,
    y: 1200,

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

        // プレイヤー中心基準
        const worldX =
            player.x +
            (e.clientX - canvas.width / 2);

        const worldY =
            player.y +
            (e.clientY - canvas.height / 2);

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

/* =========================================================
   CAMERA UPDATE
========================================================= */

function updateCamera(){

    camera.x =
        player.x - canvas.width / 2;

    camera.y =
        player.y - canvas.height / 2;
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

    // 背景
    ctx.fillStyle = "#2f5d3a";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.save();

    // ワールドを逆方向へ移動
    ctx.translate(
        -camera.x,
        -camera.y
    );

    renderGrid();
    renderWorld();
    renderPlayer();

    ctx.restore();
}

/* =========================================================
   GRID
========================================================= */

function renderGrid(){

    ctx.strokeStyle =
        "rgba(255,255,255,0.05)";

    ctx.lineWidth = 1;

    const size =
        Game.gridSize;

    for(
        let x = 0;
        x <= Game.worldWidth;
        x += size
    ){

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            Game.worldHeight
        );

        ctx.stroke();
    }

    for(
        let y = 0;
        y <= Game.worldHeight;
        y += size
    ){

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            Game.worldWidth,
            y
        );

        ctx.stroke();
    }
}

/* =========================================================
   WORLD
========================================================= */

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

/* =========================================================
   PLAYER
========================================================= */

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

    // 中心点
    ctx.beginPath();

    ctx.fillStyle = "#ffffff";

    ctx.arc(
        player.x,
        player.y,
        3,
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