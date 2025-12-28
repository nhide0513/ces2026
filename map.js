// CES 2026 地図機能 - map.js v1.6
// Leaflet.js Simple CRSを使用した地図表示
// v1.6: 企業情報パネル機能を追加

// ========================================
// グローバル変数
// ========================================

let map = null;
let markers = [];
let currentMapPage = 11; // デフォルトはページ11（Venetian Expo Level 1）

const DEFAULT_ZOOM_LEVEL = 5;

// 地図画像のサイズ（1200 DPI）
const MAP_IMAGES = {
    2: {
        url: 'page_2.png',
        width: 13201,
        height: 10200,
        name: 'LVCC West Hall'
    },
    6: {
        url: 'page_6.png',
        width: 13201,
        height: 10200,
        name: 'LVCC North Hall'
    },
    8: {
        url: 'page_8.png',
        width: 13201,
        height: 10200,
        name: 'LVCC Central Hall'
    },
    10: {
        url: 'page_10.png',
        width: 13201,
        height: 10200,
        name: 'LVCC South Halls 1-2'
    },
    11: {
        url: 'page_11.png',
        width: 13201,
        height: 10200,
        name: 'Venetian Expo Level 1'
    },
    12: {
        url: 'page_12.png',
        width: 13201,
        height: 10200,
        name: 'Venetian Expo Level 2'
    },
    13: {
        url: 'page_13.png',
        width: 13201,
        height: 10200,
        name: 'Venetian Expo Level 3'
    },
    14: {
        url: 'page_14.png',
        width: 13201,
        height: 10200,
        name: 'Venetian Expo Level 4'
    }
};

// PDF座標系の定義（Letter Size: 792x612pt）
const PDF_WIDTH = 792;
const PDF_HEIGHT = 612;

// ========================================
// 座標変換関数
// ========================================

/**
 * PDF座標からLeafletパーセント座標に変換
 * PDF座標系: 左上原点 (0,0)、X軸右向き、Y軸下向き
 * Leaflet座標系: 左上原点 (0,0)、X軸右向き、Y軸下向き
 * 
 * @param {number} pdfX - PDF X座標 (0-792pt)
 * @param {number} pdfY - PDF Y座標 (0-612pt)
 * @returns {Array} [lat, lng] - Leafletパーセント座標 (0-100)
 */
function pdfToLeaflet(pdfX, pdfY) {
    const percentY = (parseFloat(pdfY) / 612) * 100;
    const percentX = (parseFloat(pdfX) / 792) * 100;
    const lat = 100 - percentY;  // Y軸反転
    const lng = percentX;
    return [lat, lng];
}

// ========================================
// 地図初期化
// ========================================

/**
 * Leaflet地図を初期化
 */
function initMap() {
    console.log('📍 地図を初期化中...');
    
    // 既存の地図があれば削除
    if (map) {
        map.remove();
    }
    
    // カスタムCRS（Simple）を使用
    map = L.map('mapContainer', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 10,
        zoomSnap: 0.5,
        zoomControl: true,
        attributionControl: false
    });
    
    // 地図画像の境界を設定（0,0から100,100のパーセント座標系）
    const bounds = [[0, 0], [100, 100]];
    
    // 現在のページの地図画像を表示
    const mapInfo = MAP_IMAGES[currentMapPage];
    if (mapInfo) {
        L.imageOverlay(mapInfo.url, bounds).addTo(map);
        console.log(`✓ 地図画像読み込み: ${mapInfo.name}`);
    } else {
        console.error(`❌ ページ${currentMapPage}の地図画像が見つかりません`);
        return;
    }
    
    console.log('✓ 地図初期化完了');
}

/**
 * 地図ページを切り替え
 * @param {number} pageNum - 切り替え先のページ番号
 */
function switchMapPage(pageNum) {
    console.log(`🔄 地図切替: P${currentMapPage} → P${pageNum}`);
    
    if (!MAP_IMAGES[pageNum]) {
        console.error(`❌ ページ${pageNum}の地図画像が見つかりません`);
        return;
    }
    
    currentMapPage = pageNum;
    
    // 既存のマーカーをクリア
    clearMarkers();
    
    // 画像レイヤーのみ差し替え
    const mapInfo = MAP_IMAGES[pageNum];
    const bounds = [[0, 0], [100, 100]];
    
    // 既存の画像レイヤーを削除
    map.eachLayer(function(layer) {
        if (layer instanceof L.ImageOverlay) {
            map.removeLayer(layer);
        }
    });
    
    // 新しい画像を追加
    L.imageOverlay(mapInfo.url, bounds).addTo(map);
    
    // マーカーを再表示
    if (typeof getFilteredCompanies === 'function') {
        const filteredCompanies = getFilteredCompanies();
        displayMapMarkers(filteredCompanies);
    }
    
    console.log(`✓ 地図切替完了: ${mapInfo.name}`);
}

// ========================================
// マーカー表示
// ========================================

/**
 * 地図上に企業マーカーを表示
 * @param {Array} companies - 表示する企業データの配列
 */
function displayMapMarkers(companies) {
    console.log(`📍 マーカー表示開始: ${companies.length}社`);
    
    // 既存のマーカーをクリア
    clearMarkers();
    
    let displayCount = 0;
    let skipCount = 0;
    
    companies.forEach((company, index) => {
        // 座標データの確認
        const pdfPage = parseFloat(company.pdfPage);
        const pdfX = parseFloat(company.pdfX);
        const pdfY = parseFloat(company.pdfY);
        
        // 現在のページと一致し、座標データがある企業のみ表示
        if (pdfPage === currentMapPage && !isNaN(pdfX) && !isNaN(pdfY)) {
            // 座標変換
            const [lat, lng] = pdfToLeaflet(pdfX, pdfY);
            
            // マーカーを作成
            const marker = L.circleMarker([lat, lng], {
                radius: 5,
                fillColor: '#3b82f6',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            marker.on('click', function(e) {
                // イベント伝播を止める
                L.DomEvent.stopPropagation(e);
    
                const [lat, lng] = pdfToLeaflet(pdfX, pdfY);
                const companiesAtLocation = findCompaniesAtLocation(lat, lng);
                showMapPanel(companiesAtLocation);
    
                // クリックされたマーカーを赤色に
                markers.forEach(m => {
                    m.setStyle({fillColor: '#3b82f6', color: '#ffffff'});
                });
                marker.setStyle({fillColor: '#ff0000', color: '#ffffff'});
            });
            
            // マーカーを地図に追加
            marker.addTo(map);
            markers.push(marker);
            displayCount++;
        } else {
            skipCount++;
        }
    });
    
    console.log(`✓ マーカー表示完了: ${displayCount}個表示、${skipCount}個スキップ`);
    
    // 統計情報を更新
    updateMapStats(displayCount, skipCount);
}

/**
 * すべてのマーカーをクリア
 */
function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

// ========================================
// UI連携
// ========================================

/**
 * 特定の企業を地図上でハイライト表示
 * @param {number} companyIndex - 企業のインデックス
 */
function highlightCompanyOnMap(companyIndex) {
    const company = companies[companyIndex];
    
    if (!company) {
        console.warn('企業が見つかりません:', companyIndex);
        return;
    }
    
    const companyPage = parseFloat(company.pdfPage);

    
    if (!isNaN(companyPage) && companyPage !== currentMapPage) {
        switchMapPage(companyPage);
        const savedIndex = index;  // ← indexを保存
        setTimeout(() => {
            highlightCompanyOnMap(savedIndex);
        }, 300);
        return;
    }   
    
    const pdfPage = parseFloat(company.pdfPage);
    const pdfX = parseFloat(company.pdfX);
    const pdfY = parseFloat(company.pdfY);
    
    // 座標データがない場合
    if (isNaN(pdfPage) || isNaN(pdfX) || isNaN(pdfY)) {
        alert(`${company.name}\nこの企業は座標データがありません。`);
        return;
    }
    
    // ページが異なる場合はページ切り替え（将来実装）
    if (pdfPage !== currentMapPage) {
        alert(`${company.name}\nこの企業はページ${pdfPage}にあります。\n（ページ切り替え機能は今後実装予定）`);
        return;
    }
    
    // 地図タブに切り替え
    switchTab('map');
    
    // 座標変換
    const [lat, lng] = pdfToLeaflet(pdfX, pdfY);
    
    // 該当位置にズームして、既存マーカーを一時的にハイライト
    map.setView([lat, lng], DEFAULT_ZOOM_LEVEL);
    
    // 該当するマーカーを探してパネルを表示（v1.6変更）
    setTimeout(() => {
        const companiesAtLocation = findCompaniesAtLocation(lat, lng);
        showMapPanel(companiesAtLocation);
        
        markers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (Math.abs(markerLatLng.lat - lat) < 0.1 && Math.abs(markerLatLng.lng - lng) < 0.1) {
                marker.setStyle({fillColor: '#ff0000', color: '#ffffff'});
            } else {
                marker.setStyle({fillColor: '#3b82f6', color: '#ffffff'});
            }
        });
    }, 300);
}

/**
 * リストビューで該当企業にスクロール
 * @param {number} companyIndex - 企業のインデックス
 */
function highlightCompanyInList(companyIndex) {
    // リストタブに切り替え
    switchTab('list');
    
    // 該当する企業カードまでスクロール
    setTimeout(() => {
        const companyCards = document.querySelectorAll('.company-card');
        if (companyCards[companyIndex]) {
            companyCards[companyIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 一時的にハイライト効果
            companyCards[companyIndex].style.backgroundColor = '#3b82f6';
            companyCards[companyIndex].style.transition = 'background-color 0.3s';
            
            setTimeout(() => {
                companyCards[companyIndex].style.backgroundColor = '';
            }, 1000);
        }
    }, 300);
}

/**
 * 地図の統計情報を更新
 * @param {number} displayCount - 表示中のマーカー数
 * @param {number} skipCount - スキップしたマーカー数
 */
function updateMapStats(displayCount, skipCount) {
    const statsElement = document.getElementById('mapStats');
    if (statsElement) {
        statsElement.textContent = `📍 ${displayCount}社表示中（ページ${currentMapPage}）`;
    }
}

// ========================================
// フィルター連携
// ========================================

/**
 * フィルター適用時に地図を更新
 * app.jsのrenderCompanyList()から呼び出される
 */
function updateMapWithFilter() {
    if (!map) return;
    
    // 現在フィルタリングされている企業データを取得
    const filteredCompanies = getFilteredCompanies();
    
    // マーカーを更新
    displayMapMarkers(filteredCompanies);
}

// ========================================
// 初期化イベント
// ========================================

/**
 * 地図タブが表示されたときに実行
 */
function onMapTabShow() {
    console.log('🗺️ 地図タブが表示されました');
    
    if (!map) {
        initMap();
        initMapSwitcher(); // 地図切替UI初期化
        
        const filteredCompanies = getFilteredCompanies();
        displayMapMarkers(filteredCompanies);
        
        setTimeout(() => {
            map.setZoom(DEFAULT_ZOOM_LEVEL);
        }, 100);
    }
}

// ========================================
// ユーティリティ
// ========================================

/**
 * 地図を初期表示位置にリセット
 */
function resetMapView() {
    if (map) {
        const bounds = [[0, 0], [100, 100]];
        map.fitBounds(bounds);
        console.log('✓ 地図をリセットしました');
    }
}

// ========================================
// 地図情報パネル機能（v1.6で追加）
// ========================================

let currentPanelData = null;

/**
 * パネルを表示
 * @param {Array} companiesAtLocation - 同一座標の企業配列
 */
function showMapPanel(companiesAtLocation) {
    console.log('🔍 showMapPanel呼び出し:', companiesAtLocation);  // ← この行を追加

    // パネルデータを初期化
    currentPanelData = {
        companies: companiesAtLocation,
        currentIndex: 0,
        showFullDescription: false
    };
    
    // パネルを作成または更新
    renderPanel();
    
    // パネルを表示

    const panel = document.getElementById('mapInfoPanel');
    if (panel) {
        // 確実にvisibleを設定（同期処理より先に）
        panel.classList.add('visible');
        // 強制的に反映
        panel.offsetHeight; // リフロー強制
    }
}

/**
 * パネルを閉じる
 */
function closeMapPanel() {
    console.log('🔴 closeMapPanel実行');
    console.trace('呼び出し元:');  // ← この行を追加
    const panel = document.getElementById('mapInfoPanel');
    console.log('パネル要素:', panel);
    if (panel) {
        console.log('visible削除前:', panel.classList.contains('visible'));
        panel.classList.remove('visible');
        console.log('visible削除後:', panel.classList.contains('visible'));
    }
    
    // すべてのマーカーを青色に戻す
    markers.forEach(marker => {
        marker.setStyle({fillColor: '#3b82f6', color: '#ffffff'});
    });
    
    currentPanelData = null;
    console.log('🔴 closeMapPanel完了');
}

/**
 * パネル内容をレンダリング
 */
function renderPanel() {
    if (!currentPanelData) return;
    
    const { companies, currentIndex, showFullDescription } = currentPanelData;
    const company = companies[currentIndex].company;
    const companyIndex = companies[currentIndex].index;
    
    // パネル要素を取得または作成
    let panel = document.getElementById('mapInfoPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'mapInfoPanel';
        panel.className = 'map-info-panel';
        document.body.appendChild(panel);
    }
    
    // 会場名を取得
    const venueName = getVenueName(company.pdfPage);
    
    // 説明文の処理
    const description = company.description || '';
    const needsTruncate = description.length > 200;
    const displayDescription = (needsTruncate && !showFullDescription) 
        ? description.substring(0, 200) + '...' 
        : description;
    
    // HTML生成
    let html = `
        <div class="panel-header">
            <h3 class="panel-company-name">${escapeHtmlPanel(company.name)}</h3>
            <button class="panel-close-button" onclick="closeMapPanel()">×</button>
    `;
    
    // 複数企業の場合はナビゲーション表示
    if (companies.length > 1) {
        html += `
            <div class="panel-navigation">
                <button class="panel-nav-button" onclick="navigatePanel(-1)" ${currentIndex === 0 ? 'disabled' : ''}>
                    ← 前へ
                </button>
                <span class="panel-indicator">(${currentIndex + 1}/${companies.length})</span>
                <button class="panel-nav-button" onclick="navigatePanel(1)" ${currentIndex === companies.length - 1 ? 'disabled' : ''}>
                    次へ →
                </button>
            </div>
        `;
    }
    
    html += `</div>`;
    
    // コンテンツ
    html += `
        <div class="panel-content">
            <div class="panel-info">
                <div class="panel-info-item">📍 ${escapeHtmlPanel(venueName)}</div>
                <div class="panel-info-item">ブース: <span class="booth-link" onclick="focusOnBooth(${companies[currentIndex].lat}, ${companies[currentIndex].lng})">${escapeHtmlPanel(company.booth || '不明')}</span></div>
            </div>
    `;
    
if (description) {
    html += `
        <div class="panel-description ${!showFullDescription ? 'collapsed' : 'expanded'}" id="panelDesc${currentIndex}">
            ${escapeHtmlPanel(description)}
        </div>
    `;
    
    if (description.length > 50) {
        html += `
            <button class="expand-desc-button" onclick="togglePanelDescription()">
                ${showFullDescription ? '詳細を閉じる ▲' : '詳細を見る ▼'}
            </button>
        `;
    }
}

    
    html += `</div>`;
    
    // フッター
    html += `
        <div class="panel-footer">
            <button class="panel-list-button" onclick="showInList(${companyIndex})">
                リストで見る
            </button>
        </div>
    `;
    
    panel.innerHTML = html;
}

/**
 * カルーセルナビゲーション
 * @param {number} direction - 1（次へ）or -1（前へ）
 */
function navigatePanel(direction) {
    if (!currentPanelData) return;
    
    const newIndex = currentPanelData.currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < currentPanelData.companies.length) {
        currentPanelData.currentIndex = newIndex;
        currentPanelData.showFullDescription = false; // 説明文をリセット
        renderPanel();
    }
}

/**
 * 説明文の展開/折りたたみ
 */
function togglePanelDescription() {
    if (!currentPanelData) return;
    
    currentPanelData.showFullDescription = !currentPanelData.showFullDescription;
    renderPanel();
}

/**
 * 「リストで見る」ボタンのハンドラー
 * @param {number} companyIndex - 企業のインデックス
 */
function showInList(companyIndex) {
    closeMapPanel();
    highlightCompanyInList(companyIndex);
}

/**
 * HTMLエスケープ（パネル用）
 */
function escapeHtmlPanel(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 同一座標の企業を探す
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Array} - 同一座標の企業配列
 */
function findCompaniesAtLocation(lat, lng) {
    const result = [];
    
    companies.forEach((company, index) => {
        const pdfPage = parseFloat(company.pdfPage);
        const pdfX = parseFloat(company.pdfX);
        const pdfY = parseFloat(company.pdfY);
        
        // 現在のページかつ座標データがある企業のみ
        if (pdfPage === currentMapPage && !isNaN(pdfX) && !isNaN(pdfY)) {
            const [companyLat, companyLng] = pdfToLeaflet(pdfX, pdfY);
            
            // 0.1未満の差は同一座標とみなす
            if (Math.abs(companyLat - lat) < 0.1 && Math.abs(companyLng - lng) < 0.1) {
                result.push({
                    company: company,
                    index: index,
                    lat: companyLat,
                    lng: companyLng
                });
            }
        }
    });
    
    return result;
}

// パネル外クリックで閉じる
document.addEventListener('click', function(e) {
    // タッチデバイスの場合はスキップ
    if (e.pointerType === 'touch') return;
    
    setTimeout(() => {
        const panel = document.getElementById('mapInfoPanel');
        if (panel && panel.classList.contains('visible')) {
            const isPanelButton = e.target.closest('.panel-nav-button, .panel-close-button, .list-view-button, .expand-desc-button');
            
            if (!panel.contains(e.target) && !e.target.closest('.leaflet-marker-icon') && !e.target.closest('.leaflet-interactive') && !isPanelButton) {
                closeMapPanel();
            }
        }
    }, 100);
});


/**
 * ブース番号クリック時の動作（ブース位置にズーム）
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 */
function focusOnBooth(lat, lng) {
    if (map) {
        map.setView([lat, lng], DEFAULT_ZOOM_LEVEL + 1);
    }
}

// ========================================
// 地図切替UIのイベントハンドラ
// ========================================

/**
 * 地図切替UIを初期化
 */
function initMapSwitcher() {
    const switcherBtn = document.getElementById('mapSwitcher');
    const dropdown = document.getElementById('mapDropdown');
    
    if (!switcherBtn || !dropdown) {
        console.warn('⚠️ 地図切替UIが見つかりません');
        return;
    }
    
    // 切替ボタンクリック
    switcherBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
    

    // 地図オプション選択
    const mapOptions = dropdown.querySelectorAll('.map-option');
    mapOptions.forEach(option => {
        option.addEventListener('click', function() {
            const pageNum = parseInt(this.dataset.page);
            const pageName = this.textContent.replace('✓ ', '').trim();
            
            // アクティブ状態を更新
            mapOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            
            // ドロップダウンを閉じる
            dropdown.classList.add('hidden');
            
            // 地図を切り替え
            switchMapPage(pageNum);
        });
    });
    
    console.log('✓ 地図切替UI初期化完了');
}

console.log('✓ map.js v1.7 読み込み完了');


// 説明文の展開/折りたたみ
function togglePanelDescription(index) {
    const desc = document.getElementById('panelDesc' + index);
    const btn = event.target;
    
    if (desc.classList.contains('collapsed')) {
        desc.classList.remove('collapsed');
        desc.classList.add('expanded');
        btn.textContent = '詳細を閉じる ▲';
    } else {
        desc.classList.add('collapsed');
        desc.classList.remove('expanded');
        btn.textContent = '詳細を見る ▼';
    }
}
