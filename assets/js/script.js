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
        
        // 在 index.html 中，日期時間需要換行，所以傳入 true
        renderGames(data.future_games, 'future-soccer-games', 'soccer', true);
        renderGames(data.past_games, 'past-soccer-games', 'soccer', true);

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
        
        // 在 index.html 中，日期時間需要換行，所以傳入 true
        renderGames(data.future_games, 'future-basketball-games', 'basketball', true);
        renderGames(data.past_games, 'past-basketball-games', 'basketball', true);

    } catch (error) {
        console.error("Error fetching basketball games:", error);
        document.getElementById('future-basketball-games').innerHTML = '<tr><td colspan="6" class="text-danger">加載籃球賽事失敗。</td></tr>';
        document.getElementById('past-basketball-games').innerHTML = '<tr><td colspan="6" class="text-danger">加載籃球賽事失敗。</td></tr>';
    }
}

// 調整 renderGames 函數，新增一個參數來控制是否換行
function renderGames(games, tableBodyId, gameType, addBreakTag = false) {
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
        
        // 使用 formatDateTime 函數並傳入 addBreakTag 參數
        const formattedDateTime = formatDateTime(game.start_time, addBreakTag);

        row.innerHTML = `
            <td>${game.league_name || 'N/A'}</td>
            <td>${game.home_team || 'N/A'}</td>
            <td>${game.away_team || 'N/A'}</td>
            <td>${game.game_type || 'N/A'}</td>
            <td>${formattedDateTime}</td>
            <td>
                <a href="${detailPage}?id=${game.FIXTURE_ID}" class="btn btn-primary view-odds-btn">查看盤口</a>
            </td>
        `;
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
        // 在詳情頁的基本資訊處不需要換行，所以傳入 false
        document.getElementById('game-time').textContent = formatDateTime(data.game_info.start_time, false);

        // 填充亞洲盤口
        renderOddsTable(data.asia_odds, 'asia-odds-table', [
            'formatted_time', 'asia_plate', 'host_price', 'guest_price'
        ], false); // 在表格內也不需要換行，所以傳入 false

        // 填充歐洲盤口
        renderOddsTable(data.euro_odds, 'euro-odds-table', [
            'formatted_time', 'host_price', 'draw_price', 'guest_price'
        ], false); // 在表格內也不需要換行，所以傳入 false

        // 填充大小盤口
        renderOddsTable(data.count_odds, 'count-odds-table', [
            'formatted_time', 'count', 'upper_price', 'lower_price'
        ], false); // 在表格內也不需要換行，所以傳入 false

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
        // 在詳情頁的基本資訊處不需要換行，所以傳入 false
        document.getElementById('game-time').textContent = formatDateTime(data.game_info.start_time, false);

        // 填充讓分盤口
        renderOddsTable(data.give_odds, 'give-odds-table', [
            'formatted_time', 'give_plate', 'host_price', 'guest_price'
        ], false); // 在表格內也不需要換行，所以傳入 false

        // 填充標準盤口
        renderOddsTable(data.std_odds, 'std-odds-table', [
            'formatted_time', 'host_price', 'draw_price', 'guest_price'
        ], false); // 在表格內也不需要換行，所以傳入 false

        // 填充大小球盤口
        renderOddsTable(data.ball_odds, 'ball-odds-table', [
            'formatted_time', 'ball_plate', 'upper_price', 'lower_price'
        ], false); // 在表格內也不需要換行，所以傳入 false

    } catch (error) {
        console.error(`Error fetching basketball game details for ID ${gameId}:`, error);
        document.getElementById('game-info').innerHTML = `<p class="text-danger">加載籃球賽事詳情失敗: ${error.message}</p>`;
    }
}

// 調整 renderOddsTable 函數，新增一個參數來控制是否換行
function renderOddsTable(oddsData, tableBodyId, keys, addBreakTag = false) {
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
                // 使用 formatDateTime 函數並傳入 addBreakTag 參數
                td.textContent = formatDateTime(item[key], addBreakTag);
            } else {
                td.textContent = item[key] !== undefined && item[key] !== null ? item[key] : 'N/A';
            }
            row.appendChild(td);
        });
        tableBody.appendChild(row);
    });
}

// 輔助函數：格式化日期時間
// 新增一個參數 addBreakTag，預設為 false
function formatDateTime(isoString, addBreakTag = false) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            const match = isoString.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
            if (match) {
                const parts = match[1].split('T');
                // 根據 addBreakTag 決定是否插入 <br> 標籤
                return addBreakTag ? `${parts[0]}<br>${parts[1]}` : `${parts[0]} ${parts[1]}`;
            }
            return isoString;
        }

        // 格式化日期部分
        const datePart = date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        // 格式化時間部分
        const timePart = date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // 使用24小時制
        });

        // 根據 addBreakTag 決定是否返回帶 <br> 的字串
        return addBreakTag ? `${datePart}<br>${timePart}` : `${datePart} ${timePart}`;

    } catch (e) {
        console.error("Error formatting date:", isoString, e);
        return isoString;
    }
}
