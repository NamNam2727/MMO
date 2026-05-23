// =========================================================
// movement.js
// =========================================================

window.MovementSystem = (() => {

"use strict";

/* =========================================================
   COLLISION
========================================================= */

function isCollidingWithWall(x, y, radius){

    for(const wall of walls){

        const nearestX = Math.max(
            wall.x,
            Math.min(x, wall.x + wall.w)
        );

        const nearestY = Math.max(
            wall.y,
            Math.min(y, wall.y + wall.h)
        );

        const dx = x - nearestX;
        const dy = y - nearestY;

        const dist = Math.hypot(dx, dy);

        if(dist < radius){

            return true;
        }
    }

    return false;
}

function moveWithCollision(entity, moveX, moveY){

    const nextX = entity.x + moveX;
    const nextY = entity.y + moveY;

    // XY
    if(!isCollidingWithWall(nextX, nextY, entity.radius)){

        entity.x = nextX;
        entity.y = nextY;

        return true;
    }

    // X
    if(!isCollidingWithWall(nextX, entity.y, entity.radius)){

        entity.x = nextX;

        return true;
    }

    // Y
    if(!isCollidingWithWall(entity.x, nextY, entity.radius)){

        entity.y = nextY;

        return true;
    }

    return false;
}

/* =========================================================
   SAFE POSITION
========================================================= */

function getSafePosition(x, y, radius){

    let safeX = x;
    let safeY = y;

    for(const wall of walls){

        const nearestX = Math.max(
            wall.x,
            Math.min(safeX, wall.x + wall.w)
        );

        const nearestY = Math.max(
            wall.y,
            Math.min(safeY, wall.y + wall.h)
        );

        const dx = safeX - nearestX;
        const dy = safeY - nearestY;

        const dist = Math.hypot(dx, dy);

        if(dist < radius){

            const push = radius - dist + 1;

            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            safeX += nx * push;
            safeY += ny * push;
        }
    }

    return {
        x: safeX,
        y: safeY
    };
}

/* =========================================================
   GRID
========================================================= */

const Grid = {

    cols: 0,
    rows: 0,

    map: [],

    init(){

        this.cols =
            Math.ceil(Game.worldWidth / Game.gridSize);

        this.rows =
            Math.ceil(Game.worldHeight / Game.gridSize);

        this.map = [];

        for(let y=0; y<this.rows; y++){

            this.map[y] = [];

            for(let x=0; x<this.cols; x++){

                const worldX = x * Game.gridSize;
                const worldY = y * Game.gridSize;

                let blocked = false;

                for(const wall of walls){

                    if(
                        worldX < wall.x + wall.w &&
                        worldX + Game.gridSize > wall.x &&
                        worldY < wall.y + wall.h &&
                        worldY + Game.gridSize > wall.y
                    ){
                        blocked = true;
                        break;
                    }
                }

                this.map[y][x] = blocked ? 1 : 0;
            }
        }
    },

    isBlocked(x, y){

        if(
            x < 0 ||
            y < 0 ||
            x >= this.cols ||
            y >= this.rows
        ){
            return true;
        }

        return this.map[y][x] === 1;
    }
};

/* =========================================================
   PATH HELPERS
========================================================= */

function findNearestWalkable(gx, gy){

    if(!Grid.isBlocked(gx, gy)){

        return {
            x: gx,
            y: gy
        };
    }

    const maxRadius = 6;

    for(let r = 1; r <= maxRadius; r++){

        for(let y = -r; y <= r; y++){

            for(let x = -r; x <= r; x++){

                const nx = gx + x;
                const ny = gy + y;

                if(!Grid.isBlocked(nx, ny)){

                    return {
                        x: nx,
                        y: ny
                    };
                }
            }
        }
    }

    return null;
}

/* =========================================================
   PATH SMOOTH
========================================================= */

function hasLineOfSight(x1, y1, x2, y2){

    const dx = x2 - x1;
    const dy = y2 - y1;

    const distance = Math.hypot(dx, dy);

    const step = 16;

    const steps = Math.ceil(distance / step);

    for(let i = 0; i <= steps; i++){

        if(i <= 1){
            continue;
        }

        const t = i / steps;

        const x = x1 + dx * t;
        const y = y1 + dy * t;

        if(isCollidingWithWall(x, y, 10)){

            return false;
        }
    }

    return true;
}

function smoothPath(path){

    if(path.length <= 2){

        return path;
    }

    const result = [];

    let current = 0;

    result.push(path[0]);

    while(current < path.length - 1){

        let next = path.length - 1;

        for(let i = path.length - 1; i > current; i--){

            const a = path[current];
            const b = path[i];

            if(
                hasLineOfSight(
                    a.x,
                    a.y,
                    b.x,
                    b.y
                )
            ){
                next = i;
                break;
            }
        }

        result.push(path[next]);

        current = next;
    }

    return result;
}

/* =========================================================
   PATH BUILD
========================================================= */

function buildPath(node){

    const path = [];

    while(node){

        path.push({
            x:
                node.x * Game.gridSize +
                Game.gridSize / 2,

            y:
                node.y * Game.gridSize +
                Game.gridSize / 2
        });

        node = node.parent;
    }

    path.reverse();

    return path;
}

/* =========================================================
   PATHFIND
========================================================= */

const Pathfinding = {

    findPath(startX, startY, goalX, goalY){

        const gridSize = Game.gridSize;

        const rawStartGX = Math.floor(startX / gridSize);
        const rawStartGY = Math.floor(startY / gridSize);

        const rawGoalGX = Math.floor(goalX / gridSize);
        const rawGoalGY = Math.floor(goalY / gridSize);

        const startNode =
            findNearestWalkable(
                rawStartGX,
                rawStartGY
            );

        const goalNode =
            findNearestWalkable(
                rawGoalGX,
                rawGoalGY
            );

        if(!startNode || !goalNode){

            return [];
        }

        const startGX = startNode.x;
        const startGY = startNode.y;

        const goalGX = goalNode.x;
        const goalGY = goalNode.y;

        const open = [];
        const closed = {};

        let closestNode = null;
        let closestDist = Infinity;

        open.push({
            x:startGX,
            y:startGY,
            g:0,
            h:0,
            f:0,
            parent:null
        });

        const dirs = [
            [ 1, 0],
            [-1, 0],
            [ 0, 1],
            [ 0,-1],
            [ 1, 1],
            [ 1,-1],
            [-1, 1],
            [-1,-1]
        ];

        let loop = 0;
        const maxLoop = 3000;

        while(open.length > 0 && loop < maxLoop){

            loop++;

            open.sort((a,b) => a.f - b.f);

            const current = open.shift();

            const key = current.x + "," + current.y;

            closed[key] = true;

            const goalDist =
                Math.hypot(
                    goalGX - current.x,
                    goalGY - current.y
                );

            if(goalDist < closestDist){

                closestDist = goalDist;
                closestNode = current;
            }

            if(
                current.x === goalGX &&
                current.y === goalGY
            ){
                return smoothPath(buildPath(current));
            }

            for(const dir of dirs){

                const nx = current.x + dir[0];
                const ny = current.y + dir[1];

                const nkey = nx + "," + ny;

                if(closed[nkey]) continue;

                if(Grid.isBlocked(nx, ny)) continue;

                if(dir[0] !== 0 && dir[1] !== 0){

                    if(
                        Grid.isBlocked(current.x + dir[0], current.y) ||
                        Grid.isBlocked(current.x, current.y + dir[1])
                    ){
                        continue;
                    }
                }

                const g =
                    current.g +
                    ((dir[0] !== 0 && dir[1] !== 0) ? 1.4 : 1);

                const h =
                    Math.abs(goalGX - nx) +
                    Math.abs(goalGY - ny);

                const f = g + h;

                let exists = false;

                for(const node of open){

                    if(node.x === nx && node.y === ny){

                        exists = true;

                        if(g < node.g){

                            node.g = g;
                            node.f = f;
                            node.parent = current;
                        }

                        break;
                    }
                }

                if(!exists){

                    open.push({
                        x:nx,
                        y:ny,
                        g,
                        h,
                        f,
                        parent:current
                    });
                }
            }
        }

        if(closestNode){

            return smoothPath(buildPath(closestNode));
        }

        return [];
    }
};

/* =========================================================
   PLAYER MOVE
========================================================= */

function moveTo(player, x, y){

    player.dragMoving = false;

    const safePos =
        getSafePosition(
            player.x,
            player.y,
            player.radius
        );

    player.path =
        Pathfinding.findPath(
            safePos.x,
            safePos.y,
            x,
            y
        );

    player.pathIndex = 0;

    player.moving = player.path.length > 0;
}

function setDragMove(player, dx, dy){

    const dist = Math.hypot(dx, dy);

    if(dist <= 0) return;

    player.dragDirX = dx / dist;
    player.dragDirY = dy / dist;

    player.dragMoving = true;

    player.moving = false;
}

function updateMovement(player, dt){

    if(player.dragMoving){

        const moveX =
            player.dragDirX *
            player.moveSpeed *
            dt;

        const moveY =
            player.dragDirY *
            player.moveSpeed *
            dt;

        moveWithCollision(
            player,
            moveX,
            moveY
        );

        return;
    }

    if(!player.moving) return;

    const target =
        player.path[player.pathIndex];

    if(!target){

        player.moving = false;
        return;
    }

    const dx = target.x - player.x;
    const dy = target.y - player.y;

    const dist = Math.hypot(dx, dy);

    if(dist < 6){

        player.pathIndex++;

        if(player.pathIndex >= player.path.length){

            player.moving = false;
        }

        return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    const moveX =
        nx *
        player.moveSpeed *
        dt;

    const moveY =
        ny *
        player.moveSpeed *
        dt;

    moveWithCollision(
        player,
        moveX,
        moveY
    );
}

/* =========================================================
   EXPORT
========================================================= */

return {

    Grid,

    Pathfinding,

    moveTo,
    setDragMove,
    updateMovement,

    isCollidingWithWall,
    moveWithCollision,

    getSafePosition
};

})();