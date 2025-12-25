// CES 2026 地図機能 - map.js
// Leaflet.js Simple CRSを使用した地図表示

// ========================================
// グローバル変数
// ========================================

let map = null;
let markers = [];
let currentMapPage = 11; // デフォルトはページ11（Venetian Expo Level 1）

const DEFAULT_ZOOM_LEVEL = 7;  // ← この行を追加

// 地図画像のサイズ（1200 DPI）
const MAP_IMAGES = {
    11: {
        url: 'page_11.png',
        width: 13201,
        height: 10200,
        name: 'Venetian Expo Level 1'
    }
    // 他のページは後で追加
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
        maxZoom: 5,
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
            
            // ポップアップを設定
            const popupContent = `
                <div style="min-width: 200px;">
                    <strong style="font-size: 14px;">${company.name}</strong><br>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                        <span style="color: #666;">ブース:</span> ${company.booth}<br>
                        <span style="color: #666;">会場:</span> ${company.venue}
                    </div>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            
            // マーカークリック時にリストビューで該当企業にスクロール
            marker.on('click', function() {
                highlightCompanyInList(index);
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
    map.setView([lat, lng], DEFAULT_ZOOM_LEVEL); // ズームレベル0
    
    // 該当するマーカーを探してポップアップを開く
    setTimeout(() => {
        markers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (Math.abs(markerLatLng.lat - lat) < 0.1 && Math.abs(markerLatLng.lng - lng) < 0.1) {
                marker.openPopup();
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
        
        const filteredCompanies = getFilteredCompanies();
        displayMapMarkers(filteredCompanies);
        
        // ← ここに追加
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

console.log('✓ map.js読み込み完了');
