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
            // ★後日ワールドマップ用のBGM等もここに追加します
        },
        'forest': {
            name: '迷いの森',
            scriptUrl: 'maps/forest/data.js'
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

        if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${this.mapList[mapId].name} へ移動中...</span>`, 'sys');

        // 既にデータが読み込み済みかチェック
        if (this.mapDataStore[mapId]) {
            this.setupMap(mapId, targetEventId);
        } else {
            // 未読み込みの場合はJSファイルを動的にロード
            this.loadScript(this.mapList[mapId].scriptUrl, () => {
                this.setupMap(mapId, targetEventId);
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
        };
        
        document.body.appendChild(script);
    },

    // =====================================================
    // 4. 読み込んだデータを使ってゲーム内の環境を再構築する
    // =====================================================
    setupMap: function(mapId, targetEventId) {
        const data = this.mapDataStore[mapId];
        if (!data) return;

        this.currentMapId = mapId;
        
        // ★追加: 2層目のイベントマップと定義リストをグローバルに保持（後で main.js の移動判定で使います）
        window.currentEventMap = data.eventMap || [];
        window.currentEvents = data.events || {};
        
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
                    // 1層目は純粋に「1(壁)」かどうかだけを見る
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

        // [C] 背景画像の設定
        if (data.bgImage) {
            const img = new Image();
            img.src = data.bgImage;
            img.onload = () => {
                window.currentBackgroundImage = img;
            };
            img.onerror = () => {
                console.error("背景画像の読み込みに失敗しました:", data.bgImage);
            };
        } else {
            window.currentBackgroundImage = null;
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
        
        // 引数でIDが指定されていなければ、events リストから isDefaultSpawn: true なものを探す
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

        // 2層目の eventMap から、着地すべき spawnId のマスを探し出す
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

        // 見つかった座標へプレイヤーをワープさせる
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
    }
};
