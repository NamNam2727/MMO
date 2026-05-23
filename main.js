// =========================================================
// main.js
// html版完全維持版
// =========================================================

(() => {

"use strict";

/* =========================================================
   CANVAS
========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize(){

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);

resize();

/* =========================================================
   GAME
========================================================= */

const Game = {

    lastTime: 0,

    entities: [],

    worldWidth: 2400,
    worldHeight: 2400,

    gridSize: 32,

    enemy: null,
    player: null,

    camera: {
        x: 0,
        y: 0
    }
};

window.Game = Game;

/* =========================================================
   WALLS
========================================================= */

const walls = [

    {x:400, y:300, w:220, h:120},
    {x:900, y:500, w:120, h:260},
    {x:1300, y:900, w:300, h:100},
    {x:700, y:1200, w:160, h:300}
];

window.walls = walls;

/* =========================================================
   GRID INIT
========================================================= */

MovementSystem.Grid.init(Game, walls);

/* =========================================================
   INPUT
========================================================= */

const Input = {

    pointerDown:false,

    dragStartX:0,
    dragStartY:0,

    dragging:false
};

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);

function screenToWorld(x, y){

    return {
        x: x + Game.camera.x,
        y: y + Game.camera.y
    };
}

function getPointerPosition(e){

    const rect = canvas.getBoundingClientRect();

    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function onPointerDown(e){

    const pos = getPointerPosition(e);
    const world = screenToWorld(pos.x, pos.y);

    Input.pointerDown = true;

    Input.dragStartX = pos.x;
    Input.dragStartY = pos.y;

    if(Game.enemy && !Game.enemy.dead){

        const dx = world.x - Game.enemy.x;
        const dy = world.y - Game.enemy.y;

        const dist = Math.hypot(dx, dy);

        if(dist <= Game.enemy.radius){

            Battle.setTarget(Game.enemy);
            return;
        }
    }

    Battle.clearTarget();

    Game.player.moveTo(world.x, world.y);
}

function onPointerMove(e){

    if(!Input.pointerDown) return;

    const pos = getPointerPosition(e);

    const dx = pos.x - Input.dragStartX;
    const dy = pos.y - Input.dragStartY;

    const dist = Math.hypot(dx, dy);

    if(dist > 12){

        Input.dragging = true;

        Battle.clearTarget();

        Game.player.setDragMove(dx, dy);
    }
}

function onPointerUp(){

    Input.pointerDown = false;

    Input.dragging = false;

    Game.player.dragMoving = false;
}

/* =========================================================
   PLAYER
========================================================= */

const Player = {

    x:200,
    y:200,

    radius:18,

    moveSpeed:180,

    moving:false,

    dragMoving:false,

    dragDirX:0,
    dragDirY:0,

    path:[],
    pathIndex:0,

    attackRange:70,

    attackCooldown:0.8,
    attackTimer:0,

    autoAttacking:false,

    update(dt){

        this.updateMovement(dt);
        this.updateAttack(dt);
    },

    updateMovement(dt){

        if(this.dragMoving){

            const moveX =
                this.dragDirX * this.moveSpeed * dt;

            const moveY =
                this.dragDirY * this.moveSpeed * dt;

            MovementSystem.moveWithCollision(
                this,
                moveX,
                moveY,
                walls
            );

            return;
        }

        if(!this.moving) return;

        const target = this.path[this.pathIndex];

        if(!target){

            this.moving = false;
            return;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;

        const dist = Math.hypot(dx, dy);

        if(dist < 6){

            this.pathIndex++;

            if(this.pathIndex >= this.path.length){

                this.moving = false;
            }

            return;
        }

        const nx = dx / dist;
        const ny = dy / dist;

        const moveX =
            nx * this.moveSpeed * dt;

        const moveY =
            ny * this.moveSpeed * dt;

        MovementSystem.moveWithCollision(
            this,
            moveX,
            moveY,
            walls
        );
    },

    updateAttack(dt){

        if(!this.autoAttacking) return;

        const enemy = Battle.target;

        if(!enemy || enemy.dead){

            this.autoAttacking = false;
            return;
        }

        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;

        const dist = Math.hypot(dx, dy);

        if(dist > this.attackRange){

            this.moveTo(enemy.x, enemy.y);
            return;
        }

        this.moving = false;

        this.attackTimer -= dt;

        if(this.attackTimer <= 0){

            this.attackTimer = this.attackCooldown;

            Battle.damageEnemy(enemy, 10);
        }
    },

    moveTo(x, y){

        this.dragMoving = false;

        const safePos =
            MovementSystem.getSafePosition(
                this.x,
                this.y,
                this.radius,
                walls
            );

        this.path =
            MovementSystem.findPath(
                safePos.x,
                safePos.y,
                x,
                y,
                Game
            );

        this.pathIndex = 0;

        this.moving = this.path.length > 0;
    },

    setDragMove(dx, dy){

        const dist = Math.hypot(dx, dy);

        if(dist <= 0) return;

        this.dragDirX = dx / dist;
        this.dragDirY = dy / dist;

        this.dragMoving = true;

        this.moving = false;
    },

    render(ctx){

        const screenX = this.x - Game.camera.x;
        const screenY = this.y - Game.camera.y;

        ctx.beginPath();
        ctx.fillStyle = "#4da6ff";

        ctx.arc(
            screenX,
            screenY,
            this.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        for(const point of this.path){

            ctx.beginPath();

            ctx.fillStyle = "#ffffff";

            ctx.arc(
                point.x - Game.camera.x,
                point.y - Game.camera.y,
                3,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }
};

/* =========================================================
   ENEMY
========================================================= */

function createEnemy(x, y){

    return {

        x,
        y,

        radius:20,

        maxHp:100,
        hp:100,

        dead:false,

        update(){},

        render(ctx){

            if(this.dead) return;

            const screenX = this.x - Game.camera.x;
            const screenY = this.y - Game.camera.y;

            ctx.beginPath();

            ctx.fillStyle = "#ff6666";

            ctx.arc(
                screenX,
                screenY,
                this.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();

            const width = 50;
            const hpRate = this.hp / this.maxHp;

            ctx.fillStyle = "#000";

            ctx.fillRect(
                screenX - 25,
                screenY - 38,
                width,
                6
            );

            ctx.fillStyle = "#00ff00";

            ctx.fillRect(
                screenX - 25,
                screenY - 38,
                width * hpRate,
                6
            );

            if(Battle.target === this){

                ctx.beginPath();

                ctx.strokeStyle = "#ffff00";
                ctx.lineWidth = 3;

                ctx.arc(
                    screenX,
                    screenY,
                    this.radius + 8,
                    0,
                    Math.PI * 2
                );

                ctx.stroke();
            }
        }
    };
}

/* =========================================================
   BATTLE
========================================================= */

const Battle = {

    target:null,

    setTarget(enemy){

        if(enemy.dead) return;

        this.target = enemy;

        Game.player.autoAttacking = true;
    },

    clearTarget(){

        this.target = null;

        Game.player.autoAttacking = false;
    },

    damageEnemy(enemy, damage){

        if(enemy.dead) return;

        enemy.hp -= damage;

        if(enemy.hp <= 0){

            enemy.hp = 0;

            enemy.dead = true;

            this.clearTarget();

            setTimeout(() => {

                enemy.dead = false;
                enemy.hp = enemy.maxHp;

                enemy.x =
                    300 + Math.random() * 1500;

                enemy.y =
                    300 + Math.random() * 1500;

            }, 3000);
        }
    }
};

/* =========================================================
   CAMERA
========================================================= */

function updateCamera(){

    Game.camera.x =
        Game.player.x - canvas.width / 2;

    Game.camera.y =
        Game.player.y - canvas.height / 2;

    Game.camera.x = Math.max(
        0,
        Math.min(
            Game.camera.x,
            Game.worldWidth - canvas.width
        )
    );

    Game.camera.y = Math.max(
        0,
        Math.min(
            Game.camera.y,
            Game.worldHeight - canvas.height
        )
    );
}

/* =========================================================
   INITIALIZE
========================================================= */

Game.player = Player;

Game.enemy = createEnemy(900, 700);

Game.entities.push(Game.player);
Game.entities.push(Game.enemy);

/* =========================================================
   BACKGROUND
========================================================= */

function drawBackground(){

    const grid = 48;

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;

    const startX =
        -(Game.camera.x % grid);

    const startY =
        -(Game.camera.y % grid);

    for(let x=startX; x<canvas.width; x+=grid){

        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,canvas.height);
        ctx.stroke();
    }

    for(let y=startY; y<canvas.height; y+=grid){

        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(canvas.width,y);
        ctx.stroke();
    }
}

function drawWalls(){

    ctx.fillStyle = "#555";

    for(const wall of walls){

        ctx.fillRect(
            wall.x - Game.camera.x,
            wall.y - Game.camera.y,
            wall.w,
            wall.h
        );
    }
}

/* =========================================================
   GAME LOOP
========================================================= */

function update(dt){

    for(const entity of Game.entities){

        entity.update(dt);
    }

    updateCamera();
}

function render(){

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawBackground();

    drawWalls();

    for(const entity of Game.entities){

        entity.render(ctx);
    }
}

function gameLoop(timestamp){

    const dt =
        (timestamp - Game.lastTime) / 1000;

    Game.lastTime = timestamp;

    update(dt);

    render();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

})();