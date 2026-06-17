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
            bgmUrl: 'maps/town/bgm.js',    // ★追加: BGMの楽譜データファイル
            bgmGlobal: 'TownBGM'           // ★追加: bgm.js内で定義されるオブジェクト名
        },
        'forest': {
            name: '迷いの森',
            scriptUrl: 'maps/forest/data.js'
            // 森のBGMができたらここに追記します
        }
    },

    mapDataStore: {},

    // =====================================================
    // 2. マップ移動処理 (ワープゾーン等から呼ばれる)
    // =====================================================
    changeMap: function(mapId, spawnX, spawnY) {
        if (!this.mapList[mapId]) {
            if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>システムエラー: 存在しないマップです。</span>", 'sys');
            return;
        }

        if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${this.mapList[mapId].name} へ移動中...</span>`, 'sys');

        if (this.mapDataStore[mapId]) {
            this.setupMap(mapId, spawnX, spawnY);
        } else {
            this.loadScript(this.mapList[mapId].scriptUrl, () => {
                this.setupMap(mapId, spawnX, spawnY);
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
    setupMap: function(mapId, spawnX, spawnY) {
        const data = this.mapDataStore[mapId];
        if (!data) return;

        this.currentMapId = mapId;
        
        const GRID_SIZE = 32; 
        
        let defaultSpawnX = null;
        let defaultSpawnY = null;

        // [A] ワールドサイズの設定
        if (data.collisionMap && data.collisionMap.length > 0) {
            const gridCols = data.collisionMap[0].length;
            const gridRows = data.collisionMap.length;
            window.world.width = gridCols * GRID_SIZE;
            window.world.height = gridRows * GRID_SIZE;

            // [B] 当たり判定（壁）とイベントトリガーの自動生成
            window.obstacles = [];
            for (let y = 0; y < gridRows; y++) {
                for (let x = 0; x < gridCols; x++) {
                    const cell = data.collisionMap[y][x];
                    
                    if (cell === 1) { 
                        window.obstacles.push({
                            x: x * GRID_SIZE,
                            y: y * GRID_SIZE,
                            width: GRID_SIZE,
                            height: GRID_SIZE,
                            color: 'transparent'
                        });
                    }
                    else if (cell === 4) {
                        defaultSpawnX = x * GRID_SIZE + (GRID_SIZE / 2);
                        defaultSpawnY = y * GRID_SIZE + (GRID_SIZE / 2);
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

        // [E] プレイヤーの座標セット
        let finalSpawnX = spawnX !== undefined ? spawnX : defaultSpawnX;
        let finalSpawnY = spawnY !== undefined ? spawnY : defaultSpawnY;

        if (window.player && finalSpawnX !== null && finalSpawnY !== null) {
            window.player.x = finalSpawnX;
            window.player.y = finalSpawnY;
            window.playerPath = [];
            window.player.targetEnemy = null;
            window.player.targetItem = null;
        }

        // [F] NPCや敵のスポーン（将来用）

        if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${this.mapList[mapId].name} に到着しました。</span>`, 'sys');

        // =====================================================
        // [G] マップ構築完了時に、マルチプレイ同期を開始する
        // =====================================================
        if (window.MultiplayerManager) {
            window.MultiplayerManager.forceSendPos();
            window.MultiplayerManager.requestPositions();
        }

        // =====================================================
        // [H] ★追加: BGMの読み込みと切り替え処理
        // =====================================================
        if (window.AudioManager) {
            const mapInfo = this.mapList[mapId];
            if (mapInfo.bgmUrl && mapInfo.bgmGlobal) {
                // スクリプトが未読み込みの場合はロードする
                if (!window[mapInfo.bgmGlobal]) {
                    this.loadScript(mapInfo.bgmUrl, () => {
                        // ロード完了後、ユーザーが既に画面をタップしていれば再生開始
                        if (window.hasUserInteracted) {
                            window.AudioManager.playBGM(window[mapInfo.bgmGlobal]);
                        }
                    });
                } else {
                    // 既に読み込み済みの場合はそのまま再生
                    if (window.hasUserInteracted) {
                        window.AudioManager.playBGM(window[mapInfo.bgmGlobal]);
                    }
                }
            } else {
                // BGMが設定されていないマップへ移動した場合は止める
                window.AudioManager.stopBGM();
            }
        }
    }
};
