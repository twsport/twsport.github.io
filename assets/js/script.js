// assets/js/script.js

// 將此替換為你的 Cloud Run 服務的實際 URL
// 例如: "https://your-service-name-xxxxxxxx-uc.a.run.app"
const CLOUD_RUN_API_BASE_URL = "https://gcp-sports-614604095631.us-central1.run.app";

document.addEventListener('DOMContentLoaded', () => {
    // 檢查當前頁面是 index.html 還是 detail 頁面
    const path = window.location.pathname;

    if (path === '/' || path.includes('index.html')) {
        // 如果是首頁，加載賽事列表
        loadSoccerGames();
        loadBasketballGames();
        // 預設顯示足球表格
        showTable('soccer');
    } else if (path.includes('game_detail.html')) {
        // 如果是足球賽事詳情頁
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('id');
        if (gameId) {
            loadSoccerGameDetails(gameId);
        } else {
            document.getElementById('game-info').innerHTML = '<p class="text-danger">錯誤：未找到賽事ID。</p>';
        }
    } else if (path.includes('gameb_detail.html')) {
        // 如果是籃球賽事詳情頁
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('id');
        if (gameId) {
            loadBasketballGameDetails(gameId);
        } else {
            document.getElementById('game-info').innerHTML = '<p class="text-danger">錯誤：未找到賽事ID。</p>';
        }
    }
});

// --- 賽事列表頁功能 (index.html) ---

// 籃球足球切換顯示邏輯
function showTable(sport) {
    const soccerTable = document.getElementById("soccer_table");
    const basketballTable = document.getElementById("basketball_table");
    const soccerButton = document.querySelector('button[onclick="showTable(\'soccer\')"]');
    const basketballButton = document.querySelector('button[onclick="showTable(\'basketball\')"]');

    if (sport === 'soccer') {
        soccerTable.style.display = "block";
        basketballTable.style.display = "none";
        soccerButton.classList.add('btn-primary');
        soccerButton.classList.remove('btn-secondary');
        basketballButton.classList.add('btn-secondary');
        basketballButton.classList.remove('btn-primary');
    } else {
        soccerTable.style.display = "none";
        basketballTable.style.display = "block";
        basketballButton.classList.add('btn-primary');
        basketballButton.classList.remove('btn-secondary');
        soccerButton.classList.add('btn-secondary');
        soccerButton.classList.remove('btn-primary');
    }
}


async function loadSoccerGames() {
    try {
        const response = await fetch(`${CLOUD_RUN_API_BASE_URL}/api/soccer_games`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        renderGames(data.future_games, 'future-soccer-games', 'soccer');
        renderGames(data.past_games, 'past-soccer-games', 'soccer');

    } catch (error) {
        console.error("Error fetching soccer games:", error);
        document.getElementById('future-soccer-games').innerHTML = '<tr><td colspan="6" class="text-danger">加載足球賽事失敗。</td></tr>';
        document.getElementById('past-soccer-games').innerHTML = '<tr><td colspan="6" class="text-danger">加載足球賽事失敗。</td></tr>';
    }
}

async function loadBasketballGames() {
    try {
        const response = await fetch(`${CLOUD_RUN_API_BASE_URL}/api/basketball_games`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        renderGames(data.future_games, 'future-basketball-games', 'basketball');
        renderGames(data.past_games, 'past-basketball-games', 'basketball');

    } catch (error) {
        console.error("Error fetching basketball games:", error);
        document.getElementById('future-basketball-games').innerHTML = '<tr><td colspan="6" class="text-danger">加載籃球賽事失敗。</td></tr>';
        document.getElementById('past-basketball-games').innerHTML = '<tr><td colspan="6" class="text-danger">加載籃球賽事失敗。</td></tr>';
    }
}

function renderGames(games, tableBodyId, gameType) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;

    tableBody.innerHTML = ''; // 清空現有內容

    if (games.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">暫無${gameType === 'soccer' ? '足球' : '籃球'}賽事</td></tr>`;
        return;
    }

    games.forEach(game => {
        const row = document.createElement('tr');
        const detailPage = gameType === 'soccer' ? 'game_detail.html' : 'gameb_detail.html';

        // 創建並添加聯賽 TD
        const leagueTd = document.createElement('td');
        leagueTd.textContent = game.league_name || 'N/A';
        row.appendChild(leagueTd);

        // 創建並添加主場 TD
        const homeTeamTd = document.createElement('td');
        homeTeamTd.textContent = game.home_team || 'N/A';
        row.appendChild(homeTeamTd);

        // 創建並添加客場 TD
        const awayTeamTd = document.createElement('td');
        awayTeamTd.textContent = game.away_team || 'N/A';
        row.appendChild(awayTeamTd);

        // 創建並添加單場or場中 TD
        const gameTypeTd = document.createElement('td');
        gameTypeTd.textContent = game.game_type || 'N/A';
        row.appendChild(gameTypeTd);

        // *** 關鍵修改：為開賽時間單獨創建 TD 並使用 innerHTML ***
        const startTimeTd = document.createElement('td');
        startTimeTd.innerHTML = formatDateTime(game.start_time); // 使用 innerHTML 確保 <br> 被解析
        row.appendChild(startTimeTd);
        // *******************************************************

        // 創建並添加查看盤口 TD
        const viewOddsTd = document.createElement('td');
        const viewOddsLink = document.createElement('a');
        viewOddsLink.href = `<span class="math-inline">\{detailPage\}?id\=</span>{game.FIXTURE_ID}`;
        viewOddsLink.className = 'btn btn-primary btn-lg';
        viewOddsLink.style = 'font-size: 24px; padding: 15px 40px;';
        viewOddsLink.textContent = '查看盤口';
        viewOddsTd.appendChild(viewOddsLink);
        row.appendChild(viewOddsTd);

        tableBody.appendChild(row);
    });
}

// --- 賽事詳情頁功能 (game_detail.html / gameb_detail.html) ---

async function loadSoccerGameDetails(gameId) {
    try {
        const response = await fetch(`${CLOUD_RUN_API_BASE_URL}/api/game_detail/${gameId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.error) {
            document.getElementById('game-info').innerHTML = `<p class="text-danger">${data.error}</p>`;
            return;
        }

        // 填充基本賽事資訊
        document.getElementById('home-team').textContent = data.game_info.home_team || 'N/A';
        document.getElementById('away-team').textContent = data.game_info.away_team || 'N/A';
        document.getElementById('game-time').textContent = formatDateTime(data.game_info.start_time);

        // 填充亞洲盤口
        renderOddsTable(data.asia_odds, 'asia-odds-table', [
            'formatted_time', 'asia_plate', 'host_price', 'guest_price'
        ]);

        // 填充歐洲盤口
        renderOddsTable(data.euro_odds, 'euro-odds-table', [
            'formatted_time', 'host_price', 'draw_price', 'guest_price'
        ]);

        // 填充大小盤口
        renderOddsTable(data.count_odds, 'count-odds-table', [
            'formatted_time', 'count', 'upper_price', 'lower_price'
        ]);

    } catch (error) {
        console.error(`Error fetching soccer game details for ID ${gameId}:`, error);
        document.getElementById('game-info').innerHTML = `<p class="text-danger">加載足球賽事詳情失敗: ${error.message}</p>`;
    }
}

async function loadBasketballGameDetails(gameId) {
    try {
        const response = await fetch(`${CLOUD_RUN_API_BASE_URL}/api/gameb_detail/${gameId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.error) {
            document.getElementById('game-info').innerHTML = `<p class="text-danger">${data.error}</p>`;
            return;
        }

        // 填充基本賽事資訊
        document.getElementById('home-team').textContent = data.game_info.home_team || 'N/A';
        document.getElementById('away-team').textContent = data.game_info.away_team || 'N/A';
        document.getElementById('game-time').textContent = formatDateTime(data.game_info.start_time);

        // 填充讓分盤口
        renderOddsTable(data.give_odds, 'give-odds-table', [
            'formatted_time', 'give_plate', 'host_price', 'guest_price'
        ]);

        // 填充標準盤口
        renderOddsTable(data.std_odds, 'std-odds-table', [
            'formatted_time', 'host_price', 'draw_price', 'guest_price' // 注意：籃球標準盤可能沒有 'draw_price'，請根據你的數據調整
        ]);

        // 填充大小球盤口
        renderOddsTable(data.ball_odds, 'ball-odds-table', [
            'formatted_time', 'ball_plate', 'upper_price', 'lower_price'
        ]);

    } catch (error) {
        console.error(`Error fetching basketball game details for ID ${gameId}:`, error);
        document.getElementById('game-info').innerHTML = `<p class="text-danger">加載籃球賽事詳情失敗: ${error.message}</p>`;
    }
}

function renderOddsTable(oddsData, tableBodyId, keys) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;

    tableBody.innerHTML = ''; // 清空現有內容

    if (oddsData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${keys.length}">暫無數據</td></tr>`;
        return;
    }

    oddsData.forEach(item => {
        const row = document.createElement('tr');
        keys.forEach(key => {
            const td = document.createElement('td');
            // 特殊處理時間格式
            if (key === 'formatted_time') {
                td.textContent = formatDateTime(item[key]);
            } else {
                td.textContent = item[key] !== undefined && item[key] !== null ? item[key] : 'N/A';
            }
            row.appendChild(td);
        });
        tableBody.appendChild(row);
    });
}

// 輔助函數：格式化日期時間
function formatDateTime(isoString) {
    if (!isoString) return 'N/A';

    // 判斷當前頁面是否為 game_detail.html 或 gameb_detail.html
    const isDetailPage = window.location.pathname.includes('game_detail.html') ||
                         window.location.pathname.includes('gameb_detail.html');

    try {
        const date = new Date(isoString);
        let datePart;
        let timePart;

        // 處理無法直接解析為 Date 物件的字串 (例如 "YYYY-MM-DDTHH:MM:SS" 格式)
        if (isNaN(date.getTime())) {
            const match = isoString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
            if (match) {
                datePart = match[1]; // 日期部分
                timePart = match[2]; // 時間部分
            } else {
                return isoString; // 如果格式不符，直接返回原始字串
            }
        } else {
            // 使用 Date 物件來格式化日期和時間
            datePart = date.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            timePart = date.toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false // 使用24小時制
            });
        }

        // 根據頁面類型返回不同的格式
        if (isDetailPage) {
            return `${datePart} ${timePart}`; // 詳情頁不換行，使用空格
        } else {
            return `<span class="math-inline">\{datePart\}<br\></span>{timePart}`; // 首頁保持換行
        }

    } catch (e) {
        console.error("Error formatting date:", isoString, e);
        return isoString;
    }
}
