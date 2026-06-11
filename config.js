// =========================================================
// config.js
// ゲーム全体で共有する静的な設定、アセット定義、Canvas初期設定
// =========================================================

// アセット管理（将来的にBase64画像等を格納）
window.ASSETS = { player: null, enemy: null, item: null };

// ★修正: マップサイズを64の倍数（32マス×32マス）に変更し、チップを敷き詰めやすくする
window.world = { width: 2048, height: 2048 };

// カメラ初期設定
window.camera = { x: 0, y: 0, width: 0, height: 0, deadZoneX: 0, deadZoneY: 0 };

// ★修正: 障害物（壁）の座標とサイズを「64の倍数」に合わせ、グリッドにピッタリ収まるように調整
// ※中央座標(1024, 1024)を基準に配置
window.obstacles = [
    { x: 1152, y: 960, width: 192, height: 128, color: '#228B22' }, // 右上の壁 (3x2マス)
    { x: 832,  y: 1152, width: 128, height: 256, color: '#228B22' }, // 左下の壁 (2x4マス)
    { x: 960,  y: 832, width: 256, height: 64,  color: '#228B22' }  // 上の壁 (4x1マス)
];

// アイテム関連のグローバル変数
window.FREE_LOOT_TIME = 300; 
window.droppedItems = []; // フィールド上のドロップアイテムを管理する配列

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
