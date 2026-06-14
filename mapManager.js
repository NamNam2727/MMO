// =========================================================
// mapManager.js
// マップデータの動的ローディング、エリア移動、当たり判定の自動生成を管理
// =========================================================

window.MapManager = {
    // ★追加: GitHubの絶対パス（ルートURL）を定義
    baseURL: 'https://namnam2727.github.io/MMO/',
    
    currentMapId: null,
    
    // =====================================================
    // 1. マップの目次 (インデックス)
    // エリア毎のサブフォルダ構成に合わせてパスを指定します
    // =====================================================
    mapList: {
        'town': {
            name: 'はじまりの街',
            scriptUrl: 'maps/town/data.js' // サブフォルダからの読み込み
        },
        'forest': {
            name: '迷いの森',
            scriptUrl: 'maps/forest/data.js'
        }
        // 今後マップが増えたらここに追記していきます
    },

    // 読み込まれたマップデータを格納する場所
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

        // ※ここに「画面を暗転させる」「Now Loadingを出す」などの処理を後日追加します

        // 既にデータが読み込み済みかチェック
        if (this.mapDataStore[mapId]) {
            this.setupMap(mapId, spawnX, spawnY);
        } else {
            // 未読み込みの場合はJSファイルを動的にロード
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
        
        // ★修正: baseURLを付与して「絶対パス」として読み込むように変更
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
        
        const GRID_SIZE = 32; // マップの基本グリッドサイズ
        
        let defaultSpawnX = null;
        let defaultSpawnY = null;

        // [A] ワールドサイズの設定（配列の数 × 32px）
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
                    
                    // 1 を壁とする (32x32px の壁を配置)
                    if (cell === 1) { 
                        window.obstacles.push({
                            x: x * GRID_SIZE,
                            y: y * GRID_SIZE,
                            width: GRID_SIZE,
                            height: GRID_SIZE,
                            // 本番用に壁を透明にして見えなくします（画像のみが見える状態）
                            color: 'transparent'
                        });
                    }
                    // 4 は初期スポーン地点
                    else if (cell === 4) {
                        defaultSpawnX = x * GRID_SIZE + (GRID_SIZE / 2);
                        defaultSpawnY = y * GRID_SIZE + (GRID_SIZE / 2);
                    }
                    // 2 や 3 などのイベントトリガー（別途 main.js で判定）
                }
            }
        }

        // [C] 背景画像の設定 (Imageオブジェクトを生成してメインループへ渡す)
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
            window.pathGridSize = GRID_SIZE; // 経路探索も32px基準で行う
            window.pathCols = Math.ceil(window.world.width / window.pathGridSize); 
            window.pathRows = Math.ceil(window.world.height / window.pathGridSize);
            window.initPathGrid(window.player.radius);
        }

        // [E] プレイヤーの座標セット
        // 指定された座標があればそれを使用、なければマップデータ内の '4' の座標を使用
        let finalSpawnX = spawnX !== undefined ? spawnX : defaultSpawnX;
        let finalSpawnY = spawnY !== undefined ? spawnY : defaultSpawnY;

        if (window.player && finalSpawnX !== null && finalSpawnY !== null) {
            window.player.x = finalSpawnX;
            window.player.y = finalSpawnY;
            // ターゲットや移動経路をリセット
            window.playerPath = [];
            window.player.targetEnemy = null;
            window.player.targetItem = null;
        }

        // [F] NPCや敵のスポーン（将来用）
        // if (data.npcMap) { ... radius: 24 (48px) に設定して広げる }

        if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${this.mapList[mapId].name} に到着しました。</span>`, 'sys');
    }
};
