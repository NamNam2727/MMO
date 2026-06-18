// =========================================================
// renderer.js
// 画面の描画処理（レンダリング）を管理するモジュール
// =========================================================

window.GameRenderer = (function() {
    
    // --- 内部ヘルパー関数 ---

    function drawStatusIcons(entity, ctx) {
        if (!entity.effects || entity.effects.length === 0) return;
        const icons = { 'fire':'🔥', 'ice':'🧊', 'lightning':'⚡️', 'wind':'🌪️' };
        const iconSize = 16;
        let y = entity.y - entity.radius - 28; 
        let startX = entity.x - ((entity.effects.length * (iconSize + 2)) / 2) + (iconSize / 2);
        
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        entity.effects.forEach((e, idx) => {
            let x = startX + idx * (iconSize + 2);
            let ratio = e.duration > 0 ? e.duration / e.maxDuration : 0;
            const iconStr = icons[e.type] || '';
            
            ctx.globalAlpha = 0.3;
            ctx.fillText(iconStr, x, y);
            
            if (e.duration > 0) {
                ctx.globalAlpha = 1.0;
                ctx.save(); ctx.beginPath();
                let h = iconSize * ratio;
                ctx.rect(x - iconSize, (y + iconSize/2) - h, iconSize*2, h);
                ctx.clip();
                ctx.fillText(iconStr, x, y);
                ctx.restore();
            }
            ctx.globalAlpha = 1.0;
        });
    }

    function drawStatusEffects(entity, ctx) {
        if (entity.state === 'dead' || !entity.effects) return;
        let isFrozen = entity.effects.some(e => e.type === 'ice' && e.duration > 0);
        let isBurned = entity.effects.some(e => e.type === 'fire' && e.duration > 0);
        let isShocked = entity.effects.some(e => e.type === 'lightning' && e.duration > 0);

        if (isFrozen) { 
            ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; 
            ctx.fillRect(entity.x - entity.radius, entity.y - entity.radius, entity.radius*2, entity.radius*2); 
        }
        if (isBurned) { 
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; 
            ctx.beginPath(); ctx.arc(entity.x, entity.y, entity.radius + 5, 0, Math.PI*2); ctx.fill(); 
        }
        if (isShocked) { 
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; ctx.lineWidth = 2; 
            ctx.beginPath(); ctx.moveTo(entity.x - entity.radius, entity.y - entity.radius); 
            ctx.lineTo(entity.x + entity.radius, entity.y + entity.radius); ctx.stroke(); 
        }
        
        drawStatusIcons(entity, ctx);
    }

    function drawChatBubble(ctx, x, y, text) {
        if (!text) return;
        ctx.save();
        
        ctx.font = 'bold 14px sans-serif'; 
        
        const maxWidth = 220; 
        const padding = 10;
        const lineHeight = 18;
        
        const words = text.split('');
        let currentLine = '';
        const lines = [];
        
        for (let n = 0; n < words.length; n++) {
            const testLine = currentLine + words[n];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(currentLine);
                currentLine = words[n];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        
        let maxLineWidth = 0;
        for (const l of lines) {
            const w = ctx.measureText(l).width;
            if (w > maxLineWidth) maxLineWidth = w;
        }
        
        const boxWidth = maxLineWidth + padding * 2;
        const boxHeight = lines.length * lineHeight + padding * 2;
        
        const boxY = y - boxHeight - 15; 
        const boxX = x - boxWidth / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        
        const radius = 8;
        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxWidth - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
        
        ctx.lineTo(x + 6, boxY + boxHeight);
        ctx.lineTo(x, boxY + boxHeight + 8);
        ctx.lineTo(x - 6, boxY + boxHeight);
        
        ctx.lineTo(boxX + radius, boxY + boxHeight);
        ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textStartY = boxY + padding + (lineHeight / 2);
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, textStartY + (i * lineHeight));
        }
        
        ctx.restore();
    }

    // ★追加: イベントアイコン（ワープや街の目印）を描画する処理
    function drawEventIcons(ctx, isWorldMap) {
        if (!window.currentEventMap || !window.currentEvents) return;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // アイコンをフワフワ上下に動かすアニメーション
        const bounce = Math.sin(performance.now() / 200) * 5;

        const gridRows = window.currentEventMap.length;
        const gridCols = gridRows > 0 ? window.currentEventMap[0].length : 0;
        if (gridCols === 0 || gridRows === 0) {
            ctx.restore();
            return;
        }

        let startX = 0;
        let startY = 0;
        let cellW = 32;
        let cellH = 32;

        // ワールドマップの場合は、計算された実際の画像領域にグリッドを合わせる
        if (isWorldMap && window.worldMapRect) {
            startX = window.worldMapRect.x;
            startY = window.worldMapRect.y;
            cellW = window.worldMapRect.w / gridCols;
            cellH = window.worldMapRect.h / gridRows;
        }

        // フォントサイズの自動調整
        const fontSize = isWorldMap ? Math.min(cellW, cellH) * 0.7 : 24;
        ctx.font = `${fontSize}px sans-serif`;

        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridCols; x++) {
                const eventId = window.currentEventMap[y][x];
                
                if (eventId > 0 && window.currentEvents[eventId]) {
                    const eventDef = window.currentEvents[eventId];
                    let icon = eventDef.icon;

                    // 指定がない場合のデフォルトの目印
                    if (!icon) {
                        if (isWorldMap && eventDef.type === 'area_select') icon = '📍';
                        else if (!isWorldMap && eventDef.type === 'warp') icon = '✨';
                    }

                    // 目印を描画
                    if (icon) {
                        const drawX = startX + x * cellW + cellW / 2;
                        let drawY = startY + y * cellH + cellH / 2;
                        drawY += bounce;
                        
                        // 視認性を上げるために薄い黒い影（座布団）を敷く
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.beginPath();
                        ctx.arc(drawX, drawY + (fontSize * 0.1), fontSize * 0.6, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.fillText(icon, drawX, drawY);
                    }
                }
            }
        }
        ctx.restore();
    }

    // --- 公開する描画メイン処理 ---
    return {
        draw: function() {
            if(!window.ctx) return;
            const ctx = window.ctx;
            const isWorldMap = window.MapManager && window.MapManager.currentMapId === 'worldMap';

            ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
            ctx.save(); 
            
            // ====================================================
            // ★ ワールドマップモードの描画 (全画面アスペクト比維持)
            // ====================================================
            if (isWorldMap) {
                let drawX = 0, drawY = 0, drawW = window.camera.width, drawH = window.camera.height;

                if (window.currentBackgroundImage && window.currentBackgroundImage.complete && window.currentBackgroundImage.naturalWidth > 0) {
                    const img = window.currentBackgroundImage;
                    const canvasW = window.camera.width;
                    const canvasH = window.camera.height;
                    const imgW = img.naturalWidth;
                    const imgH = img.naturalHeight;
                    
                    // 画面に収まる最大サイズ（contain: アスペクト比を維持）
                    const scale = Math.min(canvasW / imgW, canvasH / imgH);
                    drawW = imgW * scale;
                    drawH = imgH * scale;
                    drawX = (canvasW - drawW) / 2;
                    drawY = (canvasH - drawH) / 2;
                    
                    ctx.drawImage(img, drawX, drawY, drawW, drawH);
                } else {
                    ctx.fillStyle = '#112233';
                    ctx.fillRect(0, 0, window.camera.width, window.camera.height);
                }

                // グリッド計算やタップ判定のために描画した矩形領域を保存しておく
                window.worldMapRect = { x: drawX, y: drawY, w: drawW, h: drawH };

                // アイコンを描画
                drawEventIcons(ctx, true);
                ctx.restore();
                return; 
            }

            // ====================================================
            // 以下、通常マップ（街や森）の描画処理
            // ====================================================
            ctx.translate(-window.camera.x, -window.camera.y);

            // 1. 背景の描画
            if (window.currentBackgroundImage && window.currentBackgroundImage.complete) {
                ctx.drawImage(window.currentBackgroundImage, 0, 0, window.world.width, window.world.height);
            } else {
                ctx.strokeStyle = '#333'; ctx.lineWidth = 1; const gridSize = 32;
                const startX = Math.max(0, Math.floor(window.camera.x / gridSize) * gridSize); 
                const startY = Math.max(0, Math.floor(window.camera.y / gridSize) * gridSize);
                const endX = Math.min(window.world.width, startX + window.camera.width + gridSize); 
                const endY = Math.min(window.world.height, startY + window.camera.height + gridSize);
                ctx.beginPath();
                for(let x = startX; x <= endX; x += gridSize) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
                for(let y = startY; y <= endY; y += gridSize) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
                ctx.stroke();
            }

            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, window.world.width, window.world.height);

            // ★追加: 通常マップのイベントアイコン（ワープ等）を描画
            drawEventIcons(ctx, false);

            for (const item of window.droppedItems) {
                ctx.globalAlpha = (item.ownerId !== null && item.ownerId !== window.player.id) ? 0.3 : 1.0;
                ctx.fillStyle = (item.ownerId !== null && item.ownerId !== window.player.id) ? '#888888' : item.color;
                
                if (item.type === 'potion') {
                    ctx.beginPath(); ctx.moveTo(item.x, item.y - item.radius); ctx.lineTo(item.x + item.radius, item.y); ctx.lineTo(item.x, item.y + item.radius); ctx.lineTo(item.x - item.radius, item.y); ctx.closePath(); ctx.fill();
                } else {
                    ctx.beginPath(); ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1.0; 
                
                if (window.player.targetItem && window.player.targetItem.uid === item.uid) {
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
                    ctx.strokeRect(item.x - item.radius - 2, item.y - item.radius - 2, item.radius * 2 + 4, item.radius * 2 + 4);
                }
            }

            for (const enemy of window.enemies) {
                if (enemy.state === 'dead') continue; 
                
                let eIsFrozen = enemy.effects && enemy.effects.some(ef => ef.type === 'ice' && ef.duration > 0);
                
                if (window.player.targetEnemy === enemy) {
                    ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y + enemy.radius, enemy.radius * 1.5, enemy.radius * 0.5, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.stroke();
                    if (window.player.isAutoAttacking && !eIsFrozen) { ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; ctx.fill(); }
                }

                ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                ctx.fillStyle = enemy.color; ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                
                drawStatusEffects(enemy, ctx); 
                
                if (enemy.state === 'chase' || enemy.state === 'attack') {
                    ctx.fillStyle = 'red'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('!', enemy.x - 5, enemy.y - enemy.radius - 20);
                }

                const hpWidth = 40; const hpHeight = 5; const hpRatio = enemy.hp / enemy.maxHp;
                ctx.fillStyle = 'black'; ctx.fillRect(enemy.x - hpWidth / 2, enemy.y - enemy.radius - 15, hpWidth, hpHeight);
                ctx.fillStyle = 'red'; ctx.fillRect(enemy.x - hpWidth / 2, enemy.y - enemy.radius - 15, hpWidth * hpRatio, hpHeight);
            }

            let pIsFrozen = window.player.effects && window.player.effects.some(e => e.type === 'ice' && e.duration > 0);

            if (window.playerPath.length > 0 && !pIsFrozen) {
                ctx.beginPath(); ctx.moveTo(window.player.x, window.player.y);
                for (const wp of window.playerPath) ctx.lineTo(wp.x, wp.y);
                if (window.player.targetItem) { ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)'; } 
                else { ctx.strokeStyle = window.player.isAutoAttacking ? 'rgba(255, 100, 100, 0.4)' : 'rgba(0, 255, 255, 0.4)'; }
                ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                const lastWp = window.playerPath[window.playerPath.length - 1];
                ctx.beginPath(); ctx.arc(lastWp.x, lastWp.y, 5, 0, Math.PI * 2); 
                if (window.player.targetItem) ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
                else ctx.fillStyle = window.player.isAutoAttacking ? 'rgba(255, 100, 100, 0.6)' : 'rgba(0, 255, 255, 0.6)'; 
                ctx.fill();
            } else if (input.isDown && !pIsFrozen) {
                ctx.beginPath(); ctx.arc(window.player.targetX, window.player.targetY, 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.fill();
            }

            if (window.MultiplayerManager) {
                for (const id in window.MultiplayerManager.otherPlayers) {
                    const p = window.MultiplayerManager.otherPlayers[id];
                    
                    if (p.x === undefined || p.y === undefined || (p.x === 0 && p.y === 0)) continue;

                    const radius = window.player.radius || 15;

                    ctx.beginPath(); 
                    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                    
                    if (p.image && p.image.complete && p.image.naturalWidth > 0) {
                        ctx.save();
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.clip(); 
                        ctx.drawImage(p.image, p.x - radius, p.y - radius, radius * 2, radius * 2);
                        
                        if (p.isAttacking) {
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                            ctx.fill();
                        }
                        ctx.restore();
                        
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                    } else {
                        ctx.fillStyle = p.isAttacking ? '#ffffff' : '#00aaaa';
                        ctx.fill(); 
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                    }

                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 13px sans-serif'; 
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.lineJoin = 'round'; 
                    ctx.miterLimit = 2;
                    ctx.lineWidth = 3;      
                    ctx.strokeStyle = 'black';
                    ctx.strokeText(p.name, p.x, p.y - radius - 5);
                    ctx.fillText(p.name, p.x, p.y - radius - 5);
                    
                    if (p.chatTimer > 0) {
                        drawChatBubble(ctx, p.x, p.y - radius, p.chatMessage);
                    }
                }
            }

            ctx.beginPath(); 
            ctx.arc(window.player.x, window.player.y, window.player.radius, 0, Math.PI * 2);
            
            const isAttackingFlash = (window.player.attackCooldown > window.player.attackRate - 0.1 && window.player.targetEnemy && window.player.isAutoAttacking && !pIsFrozen);
            
            if (window.playerAvatarImage && window.playerAvatarImage.complete && window.playerAvatarImage.naturalWidth > 0) {
                ctx.save();
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.clip(); 
                ctx.drawImage(window.playerAvatarImage, window.player.x - window.player.radius, window.player.y - window.player.radius, window.player.radius * 2, window.player.radius * 2);
                
                if (isAttackingFlash) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.fill();
                }
                ctx.restore();
                
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            } else {
                ctx.fillStyle = isAttackingFlash ? '#ffffff' : window.player.color;
                ctx.fill(); 
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            }

            drawStatusEffects(window.player, ctx); 

            const phpWidth = 40; const phpHeight = 6; const phpRatio = window.player.hp / window.player.maxHp;
            ctx.fillStyle = 'black'; ctx.fillRect(window.player.x - phpWidth / 2, window.player.y - window.player.radius - 15, phpWidth, phpHeight);
            ctx.fillStyle = '#00ff00'; ctx.fillRect(window.player.x - phpWidth / 2, window.player.y - window.player.radius - 15, phpWidth * phpRatio, phpHeight);

            if (window.player.chatTimer > 0) {
                drawChatBubble(ctx, window.player.x, window.player.y - window.player.radius, window.player.chatMessage);
            }

            ctx.restore();
        }
    };
})();
