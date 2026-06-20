// =========================================================
// mapManager.js
// マップデータの動的ローディング、エリア移動、当たり判定の自動生成を管理
// =========================================================

window.MapManager = {
    // GitHubの絶対パス（ルートURL）を定義
    baseURL: 'https://namnam2727.github.io/MMO/',
    
    currentMapId: null,
    
    // =====================================================
    // 1. マップの目次 (インデックス)
    // =====================================================
    mapList: {
        'town': {
            name: 'はじまりの街',
            scriptUrl: 'maps/town/data.js',
            bgmUrl: 'maps/town/bgm.js',    
            bgmGlobal: 'TownBGM'           
        },
        'worldMap': {
            name: 'ワールドマップ',
            scriptUrl: 'maps/world/data.js'
        },
        'plains': {
            name: 'グライム平原',
            scriptUrl: 'maps/plains/map1.js'
        },
        // ★追加: グライム平原 その2 を目次に追加
        'plains_map2': {
            name: 'グライム平原 その2',
            scriptUrl: 'maps/plains/map2.js'
        }
    },

    mapDataStore: {},

    // =====================================================
    // 2. マップ移動処理
    // 引数: mapId(マップのキー), targetEventId(着地点となるマスのID)
    // =====================================================
    changeMap: function(mapId, targetEventId) {
        if (!this.mapList[mapId]) {
            if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>システムエラー: 存在しないマップです。</span>", 'sys');
            return;
        }

        // マップ移動開始時にローディングフラグを立てる
        window.isMapLoading = true;

        if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${this.mapList[mapId].name} へ移動中...</span>`, 'sys');

        // 既にデータが読み込み済みかチェック
        if (this.mapDataStore[mapId]) {
            this.preloadImageAndSetup(mapId, targetEventId);
        } else {
            // 未読み込みの場合はJSファイルを動的にロード
            this.loadScript(this.mapList[mapId].scriptUrl, () => {
                this.preloadImageAndSetup(mapId, targetEventId);
            });
        }
    },

    // =====================================================
    // 3. 動的にJSファイルを読み込む処理
    // =====================================================
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
            window.isMapLoading = false; // エラー時もフラグを解除
        };
        
        document.body.appendChild(script);
    },

    // =====================================================
    // 背景画像を裏で読み込み、完全に準備できてから切り替えを行う
    // =====================================================
    preloadImageAndSetup: function(mapId, targetEventId) {
        const data = this.mapDataStore[mapId];
        if (!data) {
            window.isMapLoading = false;
            return;
        }

        if (data.bgImage) {
            const img = new Image();
            img.onload = () => {
                // 画像の読み込みが完了したら、パラメーターを一気に切り替える
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

    // =====================================================
    // 4. 読み込んだデータを使ってゲーム内の環境を再構築する
    // =====================================================
    setupMap: function(mapId, targetEventId, loadedImg) {
        const data = this.mapDataStore[mapId];
        if (!data) {
            window.isMapLoading = false;
            return;
        }

        this.currentMapId = mapId;
        
        // 2層目のイベントマップと定義リストを更新
        window.currentEventMap = data.eventMap || [];
        window.currentEvents = data.events || {};
        
        // 3層目のNPCマップと定義リストを更新
        window.currentNpcMap = data.npcMap || [];
        window.currentNpcEvents = data.npcEvents || {};

        // プリロード完了済みの画像をセット
        window.currentBackgroundImage = loadedImg;

        const GRID_SIZE = 32; 

        // [A] ワールドサイズの設定
        if (data.collisionMap && data.collisionMap.length > 0) {
            const gridCols = data.collisionMap[0].length;
            const gridRows = data.collisionMap.length;
            window.world.width = gridCols * GRID_SIZE;
            window.world.height = gridRows * GRID_SIZE;

            // [B] 当たり判定（壁）の自動生成
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
        // [C] 敵の初期スポーン配置処理
        // =====================================================
        window.enemies = []; // 古いマップの敵をクリア
        
        if (window.currentNpcMap.length > 0 && Object.keys(window.currentNpcEvents).length > 0) {
            for (let y = 0; y < window.currentNpcMap.length; y++) {
                for (let x = 0; x < window.currentNpcMap[y].length; x++) {
                    const eventId = window.currentNpcMap[y][x];
                    
                    if (eventId > 0 && window.currentNpcEvents[eventId]) {
                        const npcDef = window.currentNpcEvents[eventId];
                        
                        if (npcDef.type === 'enemy_spawn' && npcDef.enemyId) {
                            // スポーン座標をマスの中心点に設定
                            const spawnX = x * GRID_SIZE + (GRID_SIZE / 2);
                            const spawnY = y * GRID_SIZE + (GRID_SIZE / 2);
                            
                            if (typeof window.spawnEnemy === 'function') {
                                const enemy = window.spawnEnemy(npcDef.enemyId, npcDef.level || 1, spawnX, spawnY);
                                if (enemy) {
                                    // 個別の再出現時間(respawnTime)の上書き設定
                                    if (npcDef.respawnTime !== undefined) {
                                        enemy.baseRespawnTime = npcDef.respawnTime;
                                    }
                                    window.enemies.push(enemy);
                                }
                            }
                        }
                    }
                }
            }
        }

        // [D] A*経路探索用グリッドの再構築
        if (typeof window.initPathGrid === 'function' && window.player) {
            window.pathGridSize = GRID_SIZE; 
            window.pathCols = Math.ceil(window.world.width / window.pathGridSize); 
            window.pathRows = Math.ceil(window.world.height / window.pathGridSize);
            window.initPathGrid(window.player.radius);
        }

        // [E] プレイヤーの座標セット（イベントIDベースでの着地）
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
            window.player.targetEnemy = null;
            window.player.targetItem = null;
        }

        if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${this.mapList[mapId].name} に到着しました。</span>`, 'sys');

        // =====================================================
        // [F] マップ構築完了時に、マルチプレイ同期を開始する
        // =====================================================
        if (window.MultiplayerManager) {
            window.MultiplayerManager.forceSendPos();
            window.MultiplayerManager.requestPositions();
        }

        // =====================================================
        // [G] BGMの読み込みと切り替え処理
        // =====================================================
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

        // 構築完了後にローディングフラグを下ろす
        window.isMapLoading = false;
    }
};
