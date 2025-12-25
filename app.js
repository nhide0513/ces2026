// CES 2026 訪問管理システム - メインアプリケーション

// グローバル変数
let companies = [];
let visitedStatus = {};
let likedStatus = {};
let statusFilter = 'all';
let venueFilters = new Set(['all']);
let priorityFilters = new Set(['candidate']);
let likeFilters = new Set(['all']);
let searchQuery = '';
let currentTab = 'list';

// 定数
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx7d2Sy5JM2Jo8IcmF1x0g0hW9tXLjAXw3BjwNQL_izIF4frQQ9OQpPUGXAuRFMfYfzlA/exec';
const STORAGE_KEYS = {
    visited: 'ces2026_visited_status',
    liked: 'ces2026_liked_status',
    settings: 'ces2026_personal_settings'
};

// ========================================
// データ読み込み
// ========================================

async function loadCompaniesData() {
    try {
        const response = await fetch('companies.json');
        if (!response.ok) {
            throw new Error('JSONファイルの読み込みに失敗しました');
        }
        const data = await response.json();
        companies = data;
        console.log('$2713 会社データ読み込み完了:', companies.length + '件');
        return true;
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        document.getElementById('companyList').innerHTML = 
            '<p style="text-align: center; padding: 2rem; color: red;">データの読み込みに失敗しました。companies.jsonファイルを確認してください。</p>';
        return false;
    }
}

// ========================================
// ストレージ管理
// ========================================

function loadFromStorage() {
    try {
        const visitedData = localStorage.getItem(STORAGE_KEYS.visited);
        const likedData = localStorage.getItem(STORAGE_KEYS.liked);
        
        if (visitedData) visitedStatus = JSON.parse(visitedData);
        if (likedData) likedStatus = JSON.parse(likedData);
        
        console.log('$2713 LocalStorageから読み込み完了');
    } catch (error) {
        console.error('LocalStorage読み込みエラー:', error);
        visitedStatus = {};
        likedStatus = {};
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.visited, JSON.stringify(visitedStatus));
        localStorage.setItem(STORAGE_KEYS.liked, JSON.stringify(likedStatus));
    } catch (error) {
        console.error('LocalStorage保存エラー:', error);
    }
}

function saveToAppsScript(companyName) {
    const visited = visitedStatus[companyName] || false;
    const nagasakaLike = likedStatus[companyName]?.nagasaka || 0;
    const yamanakaLike = likedStatus[companyName]?.yamanaka || 0;
    
    const data = {
        company_name: companyName,
        visited: visited,
        nagasaka_like: nagasakaLike,
        yamanaka_like: yamanakaLike
    };
    
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(() => {
        console.log('$2713 Apps Scriptに保存: ' + companyName);
    }).catch((error) => {
        console.warn('Apps Script保存エラー（無視）:', error);
    });
}

async function loadFromAppsScript() {
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const result = await response.json();
        
        if (result.success && result.data) {
            result.data.forEach(row => {
                const name = row.company_name;
                visitedStatus[name] = row.visited;
                likedStatus[name] = {
                    nagasaka: row.nagasaka_like || 0,
                    yamanaka: row.yamanaka_like || 0
                };
            });
            
            saveToStorage();
            renderCompanyList();
            updateStats();
            
            console.log('$2713 スプレッドシートから同期完了');
        }
    } catch (error) {
        console.warn('同期エラー（LocalStorageで継続）:', error);
    }
}

function saveSettings() {
    try {
        const settings = {
            statusFilter: statusFilter,
            venueFilters: Array.from(venueFilters),
            priorityFilters: Array.from(priorityFilters),
            likeFilters: Array.from(likeFilters),
            searchQuery: searchQuery,
            filterDetailsVisible: !document.getElementById('filterDetails').classList.contains('hidden'),
            scrollPosition: window.scrollY
        };
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch (error) {
        console.error('設定保存エラー:', error);
    }
}

function loadSettings() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.settings);
        if (data) {
            const settings = JSON.parse(data);
            statusFilter = settings.statusFilter || 'all';
            venueFilters = new Set(settings.venueFilters || ['all']);
            priorityFilters = new Set(settings.priorityFilters || ['candidate']);
            likeFilters = new Set(settings.likeFilters || ['all']);
            searchQuery = settings.searchQuery || '';
            return settings;
        }
    } catch (error) {
        console.error('設定読み込みエラー:', error);
    }
    return null;
}

// ========================================
// フィルタリング
// ========================================

function isCandidate(company) {
    return company.yamanakaWant > 0 || company.nagasakaWant > 0 || company.bestOfInnovation;
}

function getFilteredCompanies() {
    return companies.filter(company => {
        if (searchQuery && !company.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        
        if (statusFilter === 'visited' && !visitedStatus[company.name]) return false;
        if (statusFilter === 'unvisited' && visitedStatus[company.name]) return false;
        
        if (!venueFilters.has('all') && venueFilters.size > 0) {
            if (!venueFilters.has(company.venue)) return false;
        }
        
        if (!priorityFilters.has('all') && !priorityFilters.has('candidate') && priorityFilters.size > 0) {
            let match = false;
            if (priorityFilters.has('yamanaka-star2') && company.yamanakaWant === 2) match = true;
            if (priorityFilters.has('yamanaka-star1') && company.yamanakaWant === 1) match = true;
            if (priorityFilters.has('nagasaka-star2') && company.nagasakaWant === 2) match = true;
            if (priorityFilters.has('nagasaka-star1') && company.nagasakaWant === 1) match = true;
            if (priorityFilters.has('best') && company.bestOfInnovation) match = true;
            if (!match) return false;
        }
        
        if (!priorityFilters.has('all') && priorityFilters.has('candidate') && priorityFilters.size === 1) {
            if (!isCandidate(company)) return false;
        }
        
        if (!likeFilters.has('all') && likeFilters.size > 0) {
            let match = false;
            if (likeFilters.has('yamanaka-like1') && likedStatus[company.name]?.yamanaka === 1) match = true;
            if (likeFilters.has('yamanaka-like2') && likedStatus[company.name]?.yamanaka === 2) match = true;
            if (likeFilters.has('nagasaka-like1') && likedStatus[company.name]?.nagasaka === 1) match = true;
            if (likeFilters.has('nagasaka-like2') && likedStatus[company.name]?.nagasaka === 2) match = true;
            if (!match) return false;
        }
        
        return true;
    });
}

// ========================================
// UI レンダリング
// ========================================

function renderCompanyList() {
    const filtered = getFilteredCompanies();
    const container = document.getElementById('companyList');
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">該当する企業がありません</p>';
        return;
    }
    
    let html = '';
    filtered.forEach(company => {
        const visited = visitedStatus[company.name] || false;
        const nagasakaLike = likedStatus[company.name]?.nagasaka || 0;
        const yamanakaLike = likedStatus[company.name]?.yamanaka || 0;
        
        let badges = '';
        if (company.yamanakaWant === 2) badges += '<span class="badge">★★山中</span>';
        else if (company.yamanakaWant === 1) badges += '<span class="badge">★山中</span>';
        if (company.nagasakaWant === 2) badges += '<span class="badge">★★長坂</span>';
        else if (company.nagasakaWant === 1) badges += '<span class="badge">★長坂</span>';
        if (company.bestOfInnovation) badges += '<span class="badge innovation-badge">$D83C$DFC6Best</span>';
        
        const desc = company.description || '';
        const needsExpand = desc.length > 200;
        const truncatedDesc = needsExpand ? desc.substring(0, 200) + '...' : desc;
        
        const nagasakaText = nagasakaLike === 2 ? '$2764$FE0F長坂' : nagasakaLike === 1 ? '$D83D$DC4D長坂' : '長坂';
        const yamanakaText = yamanakaLike === 2 ? '$2764$FE0F山中' : yamanakaLike === 1 ? '$D83D$DC4D山中' : '山中';
        const nagasakaClass = nagasakaLike === 2 ? 'loved' : nagasakaLike === 1 ? 'liked' : '';
        const yamanakaClass = yamanakaLike === 2 ? 'loved' : yamanakaLike === 1 ? 'liked' : '';
        
        const escapedName = company.name.replace(/'/g, "\\'");
        const index = companies.indexOf(company);
        
        html += '<div class="company-card ' + (visited ? 'visited' : '') + '">';
        html += '<div class="company-header"><div class="company-name">' + company.name + '</div></div>';
        if (badges) html += '<div class="badges">' + badges + '</div>';
        html += '<div class="company-info">$D83D$DCCD ' + (company.venue || '未定');
        if (company.booth) html += ' | ブース ' + company.booth;
        html += '</div>';
        
        if (desc) {
            html += '<div class="company-description">';
            html += '<span class="desc-text" data-idx="' + index + '">' + truncatedDesc + '</span>';
            html += '<span class="desc-full hidden" data-idx="' + index + '">' + desc + '</span>';
            html += '</div>';
            if (needsExpand) {
                html += '<button class="expand-button" data-idx="' + index + '" onclick="toggleDescription(' + index + ')">...もっと見る</button>';
            }
        }
        
        html += '<div class="company-actions">';
        html += '<label class="checkbox-label">';
        html += '<input type="checkbox" ' + (visited ? 'checked' : '') + ' onchange="toggleVisited(' + index + ')">';
        html += '<span>訪問済</span></label>';
        html += '<button class="like-button ' + nagasakaClass + '" onclick="toggleLike(' + index + ', \'nagasaka\')">' + nagasakaText + '</button>';
        html += '<button class="like-button ' + yamanakaClass + '" onclick="toggleLike(' + index + ', \'yamanaka\')">' + yamanakaText + '</button>';
        html += '<button class="map-button" onclick="showMap(' + index + ')">map</button>';
        html += '</div></div>';
    });
    
    container.innerHTML = html;


    // 地図も更新（地図が初期化済みの場合のみ）
    if (typeof updateMapWithFilter === 'function') {
        updateMapWithFilter();
    }
}

function updateStats() {
    const visitedCount = Object.values(visitedStatus).filter(v => v).length;
    const candidateCount = companies.filter(c => isCandidate(c)).length;
    const rate = candidateCount > 0 ? Math.round((visitedCount / candidateCount) * 100) : 0;
    
    document.getElementById('visitedCount').textContent = visitedCount;
    document.getElementById('visitedPercent').textContent = rate;
}

// ========================================
// イベントハンドラー
// ========================================

function toggleVisited(index) {
    const company = companies[index];
    visitedStatus[company.name] = !visitedStatus[company.name];
    saveToStorage();
    saveToAppsScript(company.name);
    updateStats();
    renderCompanyList();
}

function toggleLike(index, person) {
    const company = companies[index];
    if (!likedStatus[company.name]) {
        likedStatus[company.name] = {nagasaka: 0, yamanaka: 0};
    }
    const current = likedStatus[company.name][person];
    likedStatus[company.name][person] = current === 2 ? 0 : current + 1;
    saveToStorage();
    saveToAppsScript(company.name);
    renderCompanyList();
}

function toggleDescription(index) {
    const textEl = document.querySelector('.desc-text[data-idx="' + index + '"]');
    const fullEl = document.querySelector('.desc-full[data-idx="' + index + '"]');
    const btnEl = document.querySelector('.expand-button[data-idx="' + index + '"]');
    
    if (textEl.classList.contains('hidden')) {
        textEl.classList.remove('hidden');
        fullEl.classList.add('hidden');
        btnEl.textContent = '...もっと見る';
    } else {
        textEl.classList.add('hidden');
        fullEl.classList.remove('hidden');
        btnEl.textContent = '...閉じる';
    }
}

function showMap(index) {
    highlightCompanyOnMap(index);  // ← map.jsの関数を呼ぶ
}

function toggleFilters() {
    const details = document.getElementById('filterDetails');
    const toggle = document.getElementById('filterToggle');
    details.classList.toggle('hidden');
    toggle.textContent = details.classList.contains('hidden') ? '$D83D$DD3D 検索・フィルター表示' : '$D83D$DD3C 検索・フィルター非表示';
    saveSettings();
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'list') {
        document.getElementById('listView').classList.remove('hidden');
        document.getElementById('mapView').classList.add('hidden');
    } else {
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('mapView').classList.remove('hidden');
        
        // 地図タブが表示されたときに初期化
        onMapTabShow();  // ← map.jsの関数を呼ぶ
    }
}

// ========================================
// フィルターイベント設定
// ========================================

function setupFilterEvents() {
    // 訪問状態フィルター
    document.querySelectorAll('#statusFilters .chip').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#statusFilters .chip').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            statusFilter = this.dataset.filter;
            renderCompanyList();
            saveSettings();
            window.scrollTo(0, 0);
        });
    });
    
    // 会場フィルター
    document.querySelectorAll('#venueFilters .chip').forEach(btn => {
        btn.addEventListener('click', function() {
            const venue = this.dataset.venue;
            
            if (venue === 'all') {
                venueFilters.clear();
                venueFilters.add('all');
            } else {
                venueFilters.delete('all');
                if (venueFilters.has(venue)) {
                    venueFilters.delete(venue);
                } else {
                    venueFilters.add(venue);
                }
                if (venueFilters.size === 0) {
                    venueFilters.add('all');
                }
            }
            
            document.querySelectorAll('#venueFilters .chip').forEach(b => {
                if (b.dataset.venue === 'all') {
                    b.classList.toggle('active', venueFilters.has('all'));
                } else {
                    b.classList.toggle('active', venueFilters.has(b.dataset.venue));
                }
            });
            
            renderCompanyList();
            saveSettings();
            window.scrollTo(0, 0);
        });
    });
    
    // 優先度フィルター
    document.querySelectorAll('#priorityFilters .chip').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            
            if (filter === 'all' || filter === 'candidate') {
                priorityFilters.clear();
                priorityFilters.add(filter);
            } else {
                priorityFilters.delete('all');
                priorityFilters.delete('candidate');
                if (priorityFilters.has(filter)) {
                    priorityFilters.delete(filter);
                } else {
                    priorityFilters.add(filter);
                }
                if (priorityFilters.size === 0) {
                    priorityFilters.add('all');
                }
            }
            
            document.querySelectorAll('#priorityFilters .chip').forEach(b => {
                b.classList.toggle('active', priorityFilters.has(b.dataset.filter));
            });
            
            renderCompanyList();
            saveSettings();
            window.scrollTo(0, 0);
        });
    });
    
    // いいねフィルター
    document.querySelectorAll('#likeFilters .chip').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            
            if (filter === 'all') {
                likeFilters.clear();
                likeFilters.add('all');
            } else {
                likeFilters.delete('all');
                if (likeFilters.has(filter)) {
                    likeFilters.delete(filter);
                } else {
                    likeFilters.add(filter);
                }
                if (likeFilters.size === 0) {
                    likeFilters.add('all');
                }
            }
            
            document.querySelectorAll('#likeFilters .chip').forEach(b => {
                b.classList.toggle('active', likeFilters.has(b.dataset.filter));
            });
            
            renderCompanyList();
            saveSettings();
            window.scrollTo(0, 0);
        });
    });
}

// ========================================
// 初期化
// ========================================

async function init() {
    // データ読み込み
    const loaded = await loadCompaniesData();
    if (!loaded) return;
    
    // ストレージ読み込み
    loadFromStorage();
    const settings = loadSettings();
    
    // スプレッドシート同期
    await loadFromAppsScript();
    
    // フィルター状態復元
    if (settings && venueFilters.size > 0) {
        document.querySelectorAll('#venueFilters .chip').forEach(btn => {
            if (btn.dataset.venue === 'all') {
                btn.classList.toggle('active', venueFilters.has('all'));
            } else {
                btn.classList.toggle('active', venueFilters.has(btn.dataset.venue));
            }
        });
    }
    
    // 検索ボックス
    const searchBox = document.getElementById('searchBox');
    if (settings) searchBox.value = searchQuery;
    searchBox.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCompanyList();
        saveSettings();
    });
    
    // フィルター表示状態復元
    if (settings && !settings.filterDetailsVisible) {
        document.getElementById('filterDetails').classList.add('hidden');
        document.getElementById('filterToggle').textContent = '$D83D$DD3D 検索・フィルター表示';
    }
    
    // フィルターイベント設定
    setupFilterEvents();
    
    // 初回レンダリング
    renderCompanyList();
    updateStats();
    
    // 定期同期（1分ごと）
    setInterval(loadFromAppsScript, 60000);
    
    console.log('$2713 初期化完了');
}

// DOMContentLoaded時に初期化
window.addEventListener('DOMContentLoaded', init);
