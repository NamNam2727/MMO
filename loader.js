// =========================================================
// loader.js
// 外部JSファイルを順番に読み込み、ゲームを初期化・起動する
// =========================================================

(function() {
    const baseURL = 'https://namnam2727.github.io/MMO/';
    
    // 依存関係を考慮したファイルの読み込み順序
    const scriptsToLoad = [
        'config.js',
        'skill_db.js',     // スキルマスターデータ
        'itemDB.js',
        'utils.js',
        'entities.js',
        'inventory.js',    // インベントリ基本機能
        'shortcut.js',     // ★新規追加: ショートカット機能
        'ui.js',           // 軽量化されたUI制御
        'skill_create.js', // スキル作成機能
        'skill.js',        // ★追加: スキル実行ロジック
        'main.js'
    ];

    let loadedCount = 0;

    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        // キャッシュ回避
        script.src = baseURL + src + '?v=' + new Date().getTime(); 
        
        script.onload = () => {
            console.log(`Loaded: ${src}`);
            callback();
        };
        
        script.onerror = () => {
            console.error(`Failed to load: ${src}`);
            alert(`スクリプトの読み込みに失敗しました: ${src}`);
        };

        document.head.appendChild(script);
    }

    function loadNext() {
        if (loadedCount < scriptsToLoad.length) {
            loadScript(scriptsToLoad[loadedCount], () => {
                loadedCount++;
                loadNext();
            });
        } else {
            console.log('All scripts loaded. Initializing game...');
            startGame();
        }
    }

    function startGame() {
        if (typeof window.initPathGrid !== 'function' || typeof window.gameLoop !== 'function') {
            console.error('Game initialization functions are missing.');
            return;
        }

        // UIボタンのイベントリスナー登録等を実行
        if (typeof window.initUI === 'function') {
            window.initUI();
        }

        // スキル作成UIとイベントの初期化を実行
        if (typeof window.initSkillCreateUI === 'function') {
            window.initSkillCreateUI();
        }

        // A*用のグリッドを初期化
        if (window.player && window.player.radius) {
            window.initPathGrid(window.player.radius);
        } else {
            window.initPathGrid(15);
        }

        // メインループの開始
        requestAnimationFrame(window.gameLoop);
    }

    // 読み込み開始
    loadNext();
})();
