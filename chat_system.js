// =========================================================
// chat_system.js
// フローティングログ、システムログ、チャットの送信と表示を管理
// =========================================================

window.getEntityName = function(entity) {
    if (!entity) return "";
    return entity.id === 'p1' ? "<span class='color-player'>プレイヤー</span>" : "<span class='color-enemy'>モンスター</span>";
};

// ログの追加処理 (画面中央のフローティングログと、画面下部のフルログの両方に反映)
window.addLog = function(htmlText, type = 'sys') {
    const fullLogContent = document.getElementById('fullLogContent');
    if (!fullLogContent) return; 

    // フルログ(全体)へ追加
    const fullLine = document.createElement('div');
    fullLine.className = `full-log-line log-type-${type}`;
    fullLine.innerHTML = htmlText;
    fullLogContent.appendChild(fullLine);
    fullLogContent.scrollTop = fullLogContent.scrollHeight; 

    // チャットログ(専用)へ追加
    if (type === 'chat') {
        const chatLogContent = document.getElementById('chatLogContent');
        if (chatLogContent) {
            const chatLine = document.createElement('div');
            chatLine.className = `full-log-line log-type-${type}`;
            chatLine.innerHTML = htmlText;
            chatLogContent.appendChild(chatLine);
            chatLogContent.scrollTop = chatLogContent.scrollHeight;
        }
    }

    // 画面中央のフローティングログへ追加
    const floatingLog = document.getElementById('floatingLog');
    if (!floatingLog) return;
    
    const floatLine = document.createElement('div');
    floatLine.className = `log-line log-type-${type}`;
    floatLine.innerHTML = htmlText;
    floatingLog.appendChild(floatLine);

    // 5秒後にフェードアウトして消す
    const removeFloatLine = () => {
        if(!floatLine.classList.contains('fade-out')) {
            floatLine.classList.add('fade-out');
            setTimeout(() => { if (floatLine.parentNode) floatLine.remove(); }, 500); 
        }
    };
    floatLine.timerId = setTimeout(removeFloatLine, 5000);

    // 古いログを押し出す（最大5行）
    const activeLines = Array.from(floatingLog.children).filter(child => !child.classList.contains('fade-out'));
    if (activeLines.length > 5) {
        const oldest = activeLines[0];
        clearTimeout(oldest.timerId); 
        if(!oldest.classList.contains('fade-out')) {
            oldest.classList.add('fade-out');
            setTimeout(() => { if (oldest.parentNode) oldest.remove(); }, 500);
        }
    }
};

// ==========================================
// イベント登録 (ui.js の initUI() から呼ばれる)
// ==========================================
window.initChatSystem = function() {
    const chatSendBtn = document.getElementById('chatSendBtn');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (text) {
                let myName = 'プレイヤー';
                const nameElem = document.getElementById('uiPlayerName');
                if (nameElem && nameElem.innerText && nameElem.innerText !== 'Player Name') {
                    myName = nameElem.innerText;
                }

                // ローカルにログ表示
                window.addLog(`<span class='color-player'>${myName}:</span> ${text}`, 'chat');
                
                // キャラクターの頭上に吹き出しを表示させるためのデータセット
                if (window.player) {
                    window.player.chatMessage = text;
                    window.player.chatTimer = 5.0; 
                }
                
                // マルチプレイ時、他プレイヤーにチャットを送信
                if (window.MultiplayerManager && typeof window.MultiplayerManager.sendData === 'function') {
                    window.MultiplayerManager.sendData({
                        dataType: 'chat',
                        senderName: myName,
                        text: text
                    });
                }

                input.value = ''; // 入力欄をクリア
            }
        });
    }
};
