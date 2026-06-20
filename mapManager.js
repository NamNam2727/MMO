// =========================================================
// mapManager.js
// マップデータの動的ローディング、エリア移動、当たり判定の自動生成を管理
// =========================================================

window.MapManager = {
    baseURL: 'https://namnam2727.github.io/MMO/',
    
    currentMapId: null,
    
    mapList: {
        'town': {
            name: 'はじまりの街',
            scriptUrl: 'maps/town/data.js',
            bgmUrl: 'maps/town/bgm.js',    
            bgmGlobal: 'TownBGM'           
        },
        'worldMap': {
            name: 'ワールドマップ',
            scriptUrl: 'maps/world/data.js',
            bgmUrl: 'maps/world/bgm.js',    
            bgmGlobal: 'WorldMapBGM'
        },
        'plains': {
            name: 'グライム平原',
            scriptUrl: 'maps/plains/map1.js'
        },
        'plains_map2': {
            name: 'グライム平原 その2',
            scriptUrl: 'maps/plains/map2.js'
        }
    },

    mapDataStore: {},

    changeMap: function(mapId, targetEventId) {
        if (!this.mapList[mapId]) {
            if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>システムエラー: 存在しないマップです。</span>", 'sys');
            return;
        }

        window.isMapLoading = true;

        if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${this.mapList[mapId].name} へ移動中...</span>`, 'sys');

        if (this.mapDataStore[mapId]) {
            this.preloadImageAndSetup(mapId, targetEventId);
        } else {
            this.loadScript(this.mapList[mapId].scriptUrl, () => {
                this.preloadImageAndSetup(mapId, targetEventId);
            });
        }
    },

    loadScript: function(url, callback) {
        const script = document.createElement('script');
        const absoluteUrl = this.baseURL + url;
        script.src = absoluteUrl + '?v=' + new Date().getTime(); 
        
        script.onload = () => {
            if (callback) callback();
        };
        
        script.onerror = () => {
            console.error('Failed to load script: ' + absoluteUrl);
            if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>マップデータの読み込みに失敗しました。</span>", 'sys');
            window.isMapLoading = false; 
        };
        
        document.body.appendChild(script);
    },

    preloadImageAndSetup: function(mapId, targetEventId) {
        const data = this.mapDataStore[mapId];
        if (!data) {
            window.isMapLoading = false;
            return;
        }

        if (data.bgImage) {
            const img = new Image();
            img.onload = () => {
                this.setupMap(mapId, targetEventId, img);
            };
            img.onerror = () => {
                console.error("背景画像の読み込みに失敗しました:", data.bgImage);
                this.setupMap(mapId, targetEventId, null);
            };
            img.src = data.bgImage;
        } else {
            this.setupMap(mapId, targetEventId, null);
        }
    },

    setupMap: function(mapId, targetEventId, loadedImg) {
        const data = this.mapDataStore[mapId];
        if (!data) {
            window.isMapLoading = false;
            return;
        }

        this.currentMapId = mapId;
        
        window.currentEventMap = data.eventMap || [];
        window.currentEvents = data.events || {};
        window.currentNpcMap = data.npcMap || [];
        window.currentNpcEvents = data.npcEvents || {};
        window.currentBackgroundImage = loadedImg;

        const GRID_SIZE = 32; 

        if (data.collisionMap && data.collisionMap.length > 0) {
            const gridCols = data.collisionMap[0].length;
            const gridRows = data.collisionMap.length;
            window.world.width = gridCols * GRID_SIZE;
            window.world.height = gridRows * GRID_SIZE;

            window.obstacles = [];
            for (let y = 0; y < gridRows; y++) {
                for (let x = 0; x < gridCols; x++) {
                    if (data.collisionMap[y][x] === 1) { 
                        window.obstacles.push({
                            x: x * GRID_SIZE,
                            y: y * GRID_SIZE,
                            width: GRID_SIZE,
                            height: GRID_SIZE,
                            color: 'transparent'
                        });
                    }
                }
            }
        }

        // =====================================================
        // [C] ★修正: 敵とNPCの初期スポーン配置処理
        // =====================================================
        window.enemies = []; 
        window.npcs = []; // NPC用の配列を初期化
        
        if (window.currentNpcMap.length > 0 && Object.keys(window.currentNpcEvents).length > 0) {
            for (let y = 0; y < window.currentNpcMap.length; y++) {
                for (let x = 0; x < window.currentNpcMap[y].length; x++) {
                    const eventId = window.currentNpcMap[y][x];
                    
                    if (eventId > 0 && window.currentNpcEvents[eventId]) {
                        const npcDef = window.currentNpcEvents[eventId];
                        const spawnX = x * GRID_SIZE + (GRID_SIZE / 2);
                        const spawnY = y * GRID_SIZE + (GRID_SIZE / 2);

                        if (npcDef.type === 'enemy_spawn' && npcDef.enemyId) {
                            if (typeof window.spawnEnemy === 'function') {
                                const enemy = window.spawnEnemy(npcDef.enemyId, npcDef.level || 1, spawnX, spawnY);
                                if (enemy) {
                                    if (npcDef.respawnTime !== undefined) {
                                        enemy.baseRespawnTime = npcDef.respawnTime;
                                    }
                                    window.enemies.push(enemy);
                                }
                            }
                        } 
                        // ★追加: 友好的なNPCのスポーン
                        else if (npcDef.type === 'npc_spawn' && npcDef.npcId) {
                            if (typeof window.spawnNPC === 'function') {
                                const npc = window.spawnNPC(npcDef.npcId, spawnX, spawnY);
                                if (npc) {
                                    window.npcs.push(npc);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (typeof window.initPathGrid === 'function' && window.player) {
            window.pathGridSize = GRID_SIZE; 
            window.pathCols = Math.ceil(window.world.width / window.pathGridSize); 
            window.pathRows = Math.ceil(window.world.height / window.pathGridSize);
            window.initPathGrid(window.player.radius);
        }

        let spawnId = targetEventId;
        if (spawnId === undefined || spawnId === null) {
            for (const key in window.currentEvents) {
                if (window.currentEvents[key].isDefaultSpawn) {
                    spawnId = Number(key);
                    break;
                }
            }
        }

        let finalSpawnX = null;
        let finalSpawnY = null;

        if (spawnId !== null && window.currentEventMap.length > 0) {
            for (let y = 0; y < window.currentEventMap.length; y++) {
                for (let x = 0; x < window.currentEventMap[y].length; x++) {
                    if (window.currentEventMap[y][x] === spawnId) {
                        finalSpawnX = x * GRID_SIZE + (GRID_SIZE / 2);
                        finalSpawnY = y * GRID_SIZE + (GRID_SIZE / 2);
                        break;
                    }
                }
                if (finalSpawnX !== null) break;
            }
        }

        if (window.player && finalSpawnX !== null && finalSpawnY !== null) {
            window.player.x = finalSpawnX;
            window.player.y = finalSpawnY;
            window.playerPath = [];
            // ★修正: NPCのターゲットも解除
            window.player.targetEnemy = null;
            window.player.targetItem = null;
            window.player.targetNpc = null;
        }

        if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${this.mapList[mapId].name} に到着しました。</span>`, 'sys');

        if (window.MultiplayerManager) {
            window.MultiplayerManager.forceSendPos();
            window.MultiplayerManager.requestPositions();
        }

        if (window.AudioManager) {
            const mapInfo = this.mapList[mapId];
            if (mapInfo.bgmUrl && mapInfo.bgmGlobal) {
                if (!window[mapInfo.bgmGlobal]) {
                    this.loadScript(mapInfo.bgmUrl, () => {
                        if (window.hasUserInteracted) {
                            window.AudioManager.playBGM(window[mapInfo.bgmGlobal]);
                        }
                    });
                } else {
                    if (window.hasUserInteracted) {
                        window.AudioManager.playBGM(window[mapInfo.bgmGlobal]);
                    }
                }
            } else {
                window.AudioManager.stopBGM();
            }
        }

        window.isMapLoading = false;
    }
};
