// CES 2026 - ページ番号と会場名のマッピング
// PDFページ番号から正しい会場名を取得するための定数

// 短縮名（フィルタUIで使用）
const PAGE_TO_VENUE = {
    2: "LVCC West",
    6: "LVCC North",
    8: "LVCC Central",
    10: "LVCC South",
    11: "Venetian Expo L1",
    12: "Venetian Expo L2",
    13: "Venetian Expo L3",
    14: "Venetian Expo L4"
};

// 完全な会場名（詳細表示で使用）
const VENUE_FULL_NAMES = {
    2: "LVCC, West Hall and Diamond Lot",
    6: "LVCC, North Hall, Grand Lobby and Level 1 Meeting Rooms",
    8: "LVCC, Central Hall",
    10: "LVCC, South Halls 1-2, Ground Level",
    11: "Venetian Campus, Venetian Expo, Level 1, Hall G and Meeting Rooms",
    12: "Venetian Campus, Venetian Expo, Level 2, Halls A-D, Venetian Ballroom and Meeting Rooms",
    13: "Venetian Campus, Venetian Expo, Level 3 Meeting Rooms",
    14: "Venetian Campus, Venetian Expo, Level 4"
};

// ヘルパー関数: ページ番号から会場名を取得
function getVenueName(pdfPage) {
    const pageNum = Math.floor(parseFloat(pdfPage));
    return PAGE_TO_VENUE[pageNum] || '不明';
}

// ヘルパー関数: ページ番号から完全な会場名を取得
function getVenueFullName(pdfPage) {
    const pageNum = Math.floor(parseFloat(pdfPage));
    return VENUE_FULL_NAMES[pageNum] || '不明';
}
