// =========================================================
// config.js
// ゲーム全体で共有する静的な設定、アセット定義、Canvas初期設定
// =========================================================

// アセット管理（将来的にBase64画像等を格納）
window.ASSETS = { player: null, enemy: null, item: null };

// マップサイズ
window.world = { width: 2000, height: 2000 };

// カメラ初期設定
window.camera = { x: 0, y: 0, width: 0, height: 0, deadZoneX: 0, deadZoneY: 0 };

// 障害物（壁）の定義
window.obstacles = [
    { x: window.world.width / 2 + 100, y: window.world.height / 2 - 50, width: 200, height: 100, color: '#228B22' },
    { x: window.world.width / 2 - 200, y: window.world.height / 2 + 100, width: 100, height: 300, color: '#228B22' },
    { x: window.world.width / 2 - 100, y: window.world.height / 2 - 200, width: 300, height: 50, color: '#228B22' }
];

// アイテム関連のグローバル変数
window.FREE_LOOT_TIME = 300; 
window.droppedItems = []; // ★追加: フィールド上のドロップアイテムを管理する配列

// =========================================================
// Canvasとリサイズ処理
// (Loader等でDOM構築後に呼ばれる前提)
// =========================================================
window.canvas = document.getElementById('gameCanvas');
window.ctx = window.canvas ? window.canvas.getContext('2d') : null;

window.resizeCanvas = function() {
    if (!window.canvas) return;
    window.canvas.width = window.innerWidth;
    window.canvas.height = window.innerHeight;
    
    window.camera.width = window.canvas.width;
    window.camera.height = window.canvas.height;
    // 遊び（デッドゾーン）は画面サイズの10%
    window.camera.deadZoneX = window.canvas.width * 0.1;
    window.camera.deadZoneY = window.canvas.height * 0.1;
};

window.addEventListener('resize', window.resizeCanvas);
if (window.canvas) {
    window.resizeCanvas();
}