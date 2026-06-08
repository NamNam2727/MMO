// =========================================================
// shortcut.js
// ショートカットのUI、スワイプ操作、ドラッグ＆ドロップ制御、実行処理
// =========================================================

// ショートカット グローバル状態
window.scCurrentPage = 0;
window.isScSlotDragging = false;
window.justDroppedSc = false;
window.scDragState = null;
window.scLastX = 0;
window.scLastY = 0;
window.scSwipeActive = false;

window.initShortcutUI = function() {
    // ★欠落していた初期化コードを復旧
    if (!window.player) return;
    if (!window.player.shortcuts) window.player.shortcuts = Array(30).fill(null);

    const scViewport = document.getElementById('shortcutViewport');
    const scTrack = document.getElementById('shortcutTrack');
    let scPointerDown = false;
    let scSwipeStartX = 0;
    let scSwipeStartY = 0;

    if (scViewport && scTrack) {
        scViewport.addEventListener('pointerdown', (e) => {
            scPointerDown = true;
            window.scSwipeActive = false;
            scSwipeStartX = e.clientX;
            scSwipeStartY = e.clientY;
            scTrack.style.transition = 'none';
        });

        window.addEventListener('pointermove', (e) => {
            if (!scPointerDown) return;
            if (window.isScSlotDragging) {
                scPointerDown = false;
                return;
            }
            const dx = e.clientX - scSwipeStartX;
            const dy = e.clientY - scSwipeStartY;
            
            if (!window.scSwipeActive) {
                if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
                    window.scSwipeActive = true;
                }
            }
            if (window.scSwipeActive) {
                scTrack.style.transform = `translateX(${dx}px)`;
                e.preventDefault(); 
            }
        }, { passive: false });

        window.addEventListener('pointerup', (e) => {
            if (!scPointerDown) return;
            scPointerDown = false;
            if (window.scSwipeActive) {
                window.scSwipeActive = false;
                const dx = e.clientX - scSwipeStartX;
                const threshold = scViewport.clientWidth * 0.2;
                
                scTrack.style.transition = 'transform 0.2s ease-out';
                if (dx > threshold) {
                    window.scCurrentPage = (window.scCurrentPage - 1 + 10) % 10;
                    scTrack.style.transform = `translateX(${scViewport.clientWidth}px)`;
                } else if (dx < -threshold) {
                    window.scCurrentPage = (window.scCurrentPage + 1) % 10;
                    scTrack.style.transform = `translateX(${-scViewport.clientWidth}px)`;
                } else {
                    scTrack.style.transform = `translateX(0px)`;
                }
                
                setTimeout(() => {
                    scTrack.style.transition = 'none';
                    scTrack.style.transform = 'translateX(0px)';
                    window.renderShortcutPages();
                }, 200);
            }
        });
    }

    // --- ショートカット用 グローバル D&Dイベント ---
    if (!window.__scDndEventsRegistered) {
        window.__scDndEventsRegistered = true;
        
        const updateScGhostPos = (x, y) => {
            window.scLastX = x; 
            window.scLastY = y;
            const sgh = document.getElementById('scDragGhost');
            if(sgh) { 
                sgh.style.left = x + 'px'; 
                sgh.style.top = y + 'px'; 
            }
        };

        window.addEventListener('pointermove', (e) => {
            if (window.isScSlotDragging) { 
                e.preventDefault(); 
                updateScGhostPos(e.clientX, e.clientY); 
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                if (window.isScSlotDragging) { 
                    e.preventDefault(); 
                    updateScGhostPos(e.touches[0].clientX, e.touches[0].clientY); 
                }
            }
        }, { passive: false });

        const handleScDropEnd = (e) => {
            if (!window.isScSlotDragging) return;
            
            window.isScSlotDragging = false;
            window.justDroppedSc = true;
            
            const sgh = document.getElementById('scDragGhost');
            if (sgh) sgh.style.display = 'none';
            document.body.style.touchAction = '';

            setTimeout(() => {
                const targetElem = document.elementFromPoint(window.scLastX, window.scLastY);
                if (targetElem) {
                    const dropSlot = targetElem.closest('.shortcut-slot');
                    if (dropSlot && dropSlot.dataset.scIdx !== undefined) {
                        const targetIdx = parseInt(dropSlot.dataset.scIdx);
                        const sourceIdx = window.scDragState.sourceIdx;
                        if (targetIdx !== sourceIdx) {
                            let temp = window.player.shortcuts[sourceIdx];
                            window.player.shortcuts[sourceIdx] = window.player.shortcuts[targetIdx];
                            window.player.shortcuts[targetIdx] = temp;
                        }
                    } else {
                        const inViewport = targetElem.closest('#shortcutViewport');
                        if (!inViewport) {
                            window.player.shortcuts[window.scDragState.sourceIdx] = null;
                        }
                    }
                } else {
                    window.player.shortcuts[window.scDragState.sourceIdx] = null;
                }
                window.renderShortcutPages();
                setTimeout(() => { window.justDroppedSc = false; }, 200);
            }, 10);
        };

        window.addEventListener('pointerup', handleScDropEnd);
        window.addEventListener('pointercancel', handleScDropEnd);
        window.addEventListener('touchend', handleScDropEnd);
    }

    if (typeof window.renderShortcutPages === 'function') {
        window.renderShortcutPages();
    }
};

window.registerShortcut = function(scIdx, item) {
    if (!window.player.shortcuts) {
        window.player.shortcuts = Array(30).fill(null);
    }
    window.player.shortcuts[scIdx] = {
        id: item.id, 
        uid: item.uid, 
        type: item.type, 
        color: item.color,
        rarity: item.rarity, 
        isStackable: item.maxStack > 1, 
        equipSlot: item.equipSlot
    };
    window.renderShortcutPages();
};

window.renderShortcutPages = function() {
    // ★念のため、ここでも安全策として初期化を確認
    if (!window.player) return;
    if (!window.player.shortcuts) window.player.shortcuts = Array(30).fill(null);
    
    const prevPage = (window.scCurrentPage - 1 + 10) % 10;
    const nextPage = (window.scCurrentPage + 1) % 10;
    
    const pagePrev = document.getElementById('shortcutPagePrev');
    const pageCurr = document.getElementById('shortcutPageCurrent');
    const pageNext = document.getElementById('shortcutPageNext');
    
    if (pagePrev) window.populateShortcutPage(pagePrev, prevPage);
    if (pageCurr) window.populateShortcutPage(pageCurr, window.scCurrentPage);
    if (pageNext) window.populateShortcutPage(pageNext, nextPage);
    
    const circles = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
    let html = '';
    for(let i = 0; i < 10; i++) {
        html += `<span style="color: ${i === window.scCurrentPage ? '#fff' : '#555'}; margin: 0 1px;">${circles[i]}</span>`;
    }
    const pagination = document.getElementById('shortcutPagination');
    if (pagination) pagination.innerHTML = html;
};

window.populateShortcutPage = function(container, pageIndex) {
    container.innerHTML = '';
    if (typeof window.ensureUIDs === 'function') window.ensureUIDs(); 
    
    for(let i = 0; i < 10; i++) {
        const globalIdx = pageIndex * 10 + i;
        const scData = window.player.shortcuts[globalIdx];
        
        const slot = document.createElement('div');
        slot.className = 'shortcut-slot';
        slot.dataset.scIdx = globalIdx;
        slot.style.position = 'relative';

        if (scData) {
            let actualItem = null; 
            let totalCount = 0; 
            let isEquipped = false;

            for (const tab in window.player.inventory) {
                const items = window.player.inventory[tab].items;
                for (const item of items) {
                    if (scData.isStackable) {
                        if (item.id === scData.id) { 
                            actualItem = item; 
                            totalCount += item.count; 
                        }
                    } else {
                        if (item.uid === scData.uid) { 
                            actualItem = item; 
                            isEquipped = item.isEquipped; 
                            totalCount = 1; 
                        }
                    }
                }
            }

            if (!actualItem && !scData.isStackable) {
                window.player.shortcuts[globalIdx] = null;
            } else {
                const rarityColor = window.RARITY && window.RARITY[scData.rarity] ? window.RARITY[scData.rarity].color : '#fff';
                let ctOverlay = '';
                if (scData.type === 'consume') {
                    ctOverlay = `<div class="ct-overlay-sc" data-ct-id="${scData.id}" style="position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.7); height: 0%;"></div>`;
                }
                
                slot.innerHTML = `
                    <div class="item-icon" style="background-color: ${scData.color}; border: 2px solid ${rarityColor}; box-sizing: border-box; position: relative; overflow: hidden; border-radius: 50%; width: 70%; height: 70%; margin: 15% auto;">
                        ${ctOverlay}
                    </div>
                `;
                
                if (actualItem && actualItem.type === 'skill' && actualItem.icon) {
                    const iconDiv = slot.querySelector('.item-icon');
                    if (iconDiv && !iconDiv.querySelector('.emoji-icon')) {
                        iconDiv.innerHTML += `<span class="emoji-icon" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:24px; line-height:1;">${actualItem.icon}</span>`;
                    }
                }

                if (scData.isStackable) {
                    slot.innerHTML += `<div class="item-count" style="position:absolute; bottom:1px; right:2px; color:white; font-size:9px; text-shadow:1px 1px 1px black;">${totalCount}</div>`;
                }
                if (isEquipped) {
                    slot.innerHTML += `<div class="item-equip-mark" style="position:absolute; bottom:1px; right:2px; color:#ff0; font-size:10px; font-weight:bold; text-shadow:1px 1px 1px black;">E</div>`;
                }
            }
        }

        window.setupShortcutSlotEvents(slot, globalIdx, window.player.shortcuts[globalIdx]);
        container.appendChild(slot);
    }
};

window.setupShortcutSlotEvents = function(slot, globalIdx, scData) {
    let lpStartX, lpStartY, lpTimer;
    
    slot.addEventListener('pointerdown', (e) => {
        if (window.isScSlotDragging || window.justDroppedSc) return;
        lpStartX = e.clientX;
        lpStartY = e.clientY;
        if (scData) {
            lpTimer = setTimeout(() => {
                lpTimer = null;
                if (!window.scSwipeActive) { 
                    window.startShortcutDrag(scData, globalIdx, e);
                }
            }, 300);
        }
    });

    slot.addEventListener('pointermove', (e) => {
        if (window.isScSlotDragging) return;
        if (lpTimer) {
            if (Math.abs(e.clientX - lpStartX) > 10 || Math.abs(e.clientY - lpStartY) > 10) {
                clearTimeout(lpTimer);
                lpTimer = null;
            }
        }
    });

    slot.addEventListener('pointerup', (e) => {
        if (window.isScSlotDragging || window.justDroppedSc || window.scSwipeActive) return; 
        
        if (lpTimer) {
            clearTimeout(lpTimer);
            lpTimer = null;
            if (Math.abs(e.clientX - lpStartX) < 10 && Math.abs(e.clientY - lpStartY) < 10) {
                window.handleShortcutTap(scData, globalIdx);
            }
        } else if (!scData) {
            if (Math.abs(e.clientX - lpStartX) < 10 && Math.abs(e.clientY - lpStartY) < 10) {
                window.handleShortcutTap(null, globalIdx);
            }
        }
    });

    slot.addEventListener('pointercancel', () => {
        if (lpTimer) { 
            clearTimeout(lpTimer); 
            lpTimer = null; 
        }
    });

    slot.addEventListener('pointerleave', (e) => {
        if (lpTimer && (Math.abs(e.clientX - lpStartX) > 10 || Math.abs(e.clientY - lpStartY) > 10)) { 
            clearTimeout(lpTimer); 
            lpTimer = null; 
        }
    });
};

window.handleShortcutTap = function(scData, globalIdx) {
    if (!scData) {
        if (typeof window.addLog === 'function') {
            window.addLog("<span class='color-sys'>インベントリにあるアイテムを長押し後、ドラッグ＆ドロップで登録できます。</span>", 'sys');
        }
        return;
    }

    if (typeof window.ensureUIDs === 'function') window.ensureUIDs(); 

    let actualItem = null; 
    let actualTab = null; 
    let actualIdx = -1;

    for (const tab in window.player.inventory) {
        const items = window.player.inventory[tab].items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (scData.isStackable && item.id === scData.id) {
                actualItem = item; 
                actualTab = tab; 
                actualIdx = i; 
                break; 
            } else if (!scData.isStackable && item.uid === scData.uid) {
                actualItem = item; 
                actualTab = tab; 
                actualIdx = i; 
                break;
            }
        }
        if (actualItem) break;
    }

    if (!actualItem) {
        if (scData.isStackable) {
            if (typeof window.addLog === 'function') {
                window.addLog("<span class='color-sys'>アイテムを所持していません。</span>", 'sys');
            }
        }
        return;
    }

    if (actualItem.chipData) {
        if (typeof window.openSkillCreateWindow === 'function') {
            window.openSkillCreateWindow(actualItem);
        }
        return;
    }

    if (actualItem.type === 'skill') {
        if (typeof window.prepareSkill === 'function') {
            window.prepareSkill(actualItem);
        }
        return;
    }

    if (scData.type === 'consume') {
        if (window.itemCooldowns && window.itemCooldowns[actualItem.id] > 0) {
            if (typeof window.addLog === 'function') {
                window.addLog(`<span class='color-sys'>まだ使用できません。</span>`, 'sys');
            }
            return;
        }

        if (actualItem.restore) {
            window.player.hp = Math.min(window.player.maxHp, window.player.hp + actualItem.restore);
        }
        if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
        
        window.itemCooldowns[actualItem.id] = 3.0;

        actualItem.count--;
        if (actualItem.count <= 0) {
            window.player.inventory[actualTab].items.splice(actualIdx, 1);
        }
        if (typeof window.renderInventory === 'function') window.renderInventory();
        
    } else if (scData.type === 'equip') {
        if (actualItem.isEquipped) {
            actualItem.isEquipped = false;
            window.player.equipped[actualItem.equipSlot] = null;
        } else {
            window.player.inventory[actualTab].items.forEach(i => {
                if (i.equipSlot === actualItem.equipSlot) i.isEquipped = false;
            });
            actualItem.isEquipped = true;
            window.player.equipped[actualItem.equipSlot] = actualItem;
        }
        if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats(); 
        if (typeof window.renderInventory === 'function') window.renderInventory();
    }
};

window.startShortcutDrag = function(scData, globalIdx, e) {
    window.isScSlotDragging = true;
    window.scDragState = { active: true, data: scData, sourceIdx: globalIdx };
    document.body.style.touchAction = 'none';

    let scDragGhost = document.getElementById('scDragGhost');
    if (!scDragGhost) {
        scDragGhost = document.createElement('div');
        scDragGhost.id = 'scDragGhost';
        scDragGhost.style.cssText = 'position: fixed; pointer-events: none; display: none; z-index: 1000; width: 44px; height: 44px; justify-content: center; align-items: center; opacity: 0.8; transform: translate(-50%, -50%);';
        document.body.appendChild(scDragGhost);
    }
    
    const rarityColor = window.RARITY && window.RARITY[scData.rarity] ? window.RARITY[scData.rarity].color : '#fff';
    scDragGhost.innerHTML = `<div style="width: 70%; height: 70%; border-radius: 50%; background-color: ${scData.color}; border: 2px solid ${rarityColor}; box-sizing: border-box;"></div>`;
    
    window.scLastX = e.clientX; 
    window.scLastY = e.clientY;
    
    scDragGhost.style.left = window.scLastX + 'px'; 
    scDragGhost.style.top = window.scLastY + 'px';
    scDragGhost.style.display = 'flex';
};
