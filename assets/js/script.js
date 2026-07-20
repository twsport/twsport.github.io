const FIRESTORE_API_BASE = "https://firestore.googleapis.com/v1/projects/sport-lottery-501901/databases/sport-plate/documents";

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path === '/' || path.includes('index.html')) {
        loadSoccerGames();
        loadBasketballGames();
        showTable('soccer');
    } else if (path.includes('game_detail.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('id');
        if (gameId) loadSoccerGameDetails(gameId);
        else document.getElementById('game-info').innerHTML = '<p class="text-danger">錯誤：未找到賽事ID。</p>';
    } else if (path.includes('gameb_detail.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('id');
        if (gameId) loadBasketballGameDetails(gameId);
        else document.getElementById('game-info').innerHTML = '<p class="text-danger">錯誤：未找到賽事ID。</p>';
    }
});

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

// 解析 Firestore REST API 的回傳格式
function parseFirestoreValue(value) {
    if (!value) return null;
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
    if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.timestampValue !== undefined) return value.timestampValue;
    if (value.nullValue !== undefined) return null;
    return value;
}

function parseFirestoreDoc(doc) {
    if (!doc || !doc.fields) return {};
    const res = {};
    for (const [k, v] of Object.entries(doc.fields)) {
        res[k] = parseFirestoreValue(v);
    }
    if (doc.name) {
        res.id = doc.name.split('/').pop();
        if (!res.FIXTURE_ID) res.FIXTURE_ID = res.id;
    }
    return res;
}

async function fetchGamesBySport(sportType) {
    const query = {
        structuredQuery: {
            from: [{ collectionId: "sports_games" }],
            where: {
                fieldFilter: {
                    field: { fieldPath: "sport" },
                    op: "EQUAL",
                    value: { stringValue: sportType }
                }
            }
        }
    };

    const response = await fetch(`${FIRESTORE_API_BASE}:runQuery`, {
        method: 'POST',
        body: JSON.stringify(query)
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    const games = data.filter(d => d.document).map(d => parseFirestoreDoc(d.document));
    
    const now = new Date();
    // 設定一個時間門檻：例如隱藏 24 小時以前的比賽 (1天 = 24 * 60 * 60 * 1000 毫秒)
    const hideThreshold = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const future_games = [];
    const past_games = [];
    
    games.forEach(game => {
        if (!game.start_time) return;
        const startTime = new Date(game.start_time);

        // 【過濾掉太舊的歷史賽事】如果開賽時間比 threshold 還早，直接丟棄不顯示
        if (startTime < hideThreshold) {
            return;
        }

        if (startTime > now) {
            future_games.push(game);
        } else {
            past_games.push(game);
        }
    });

    future_games.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    past_games.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    
    return { future_games, past_games };
}

async function fetchSubcollection(gameId, subcollection) {
    const url = `${FIRESTORE_API_BASE}/sports_games/${gameId}/${subcollection}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.documents) return [];
    
    const records = data.documents.map(parseFirestoreDoc);
    records.sort((a, b) => {
        return a.formatted_time.localeCompare(b.formatted_time);
    });
    return records;
}

async function loadSoccerGames() {
    try {
        const data = await fetchGamesBySport('soccer');
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
        const data = await fetchGamesBySport('basketball');
        renderGames(data.future_games, 'future-basketball-games', 'basketball', true);
        renderGames(data.past_games, 'past-basketball-games', 'basketball', true);
    } catch (error) {
        console.error("Error fetching basketball games:", error);
        document.getElementById('future-basketball-games').innerHTML = '<tr><td colspan="6" class="text-danger">加載籃球賽事失敗。</td></tr>';
        document.getElementById('past-basketball-games').innerHTML = '<tr><td colspan="6" class="text-danger">加載籃球賽事失敗。</td></tr>';
    }
}

function renderGames(games, tableBodyId, gameType, addBreakTag = false) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;
    tableBody.innerHTML = ''; 

    if (games.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">暫無${gameType === 'soccer' ? '足球' : '籃球'}賽事</td></tr>`;
        return;
    }

    games.forEach(game => {
        const row = document.createElement('tr');
        const detailPage = gameType === 'soccer' ? 'game_detail.html' : 'gameb_detail.html';
        
        let formattedDateTime = game.start_time;
        if(formattedDateTime) {
             formattedDateTime = formatDateTime(game.start_time, addBreakTag);
        }

        row.innerHTML = `
            <td>${game.league_name || 'N/A'}</td>
            <td>${game.home_team || 'N/A'}</td>
            <td>${game.away_team || 'N/A'}</td>
            <td>${game.game_type || 'N/A'}</td>
            <td>${formattedDateTime || 'N/A'}</td>
            <td>
                <a href="${detailPage}?id=${game.FIXTURE_ID}" class="btn btn-primary view-odds-btn">查看盤口</a>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function fetchGameInfo(gameId) {
    const response = await fetch(`${FIRESTORE_API_BASE}/sports_games/${gameId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return parseFirestoreDoc(data);
}

async function loadSoccerGameDetails(gameId) {
    try {
        const gameInfo = await fetchGameInfo(gameId);
        const asiaOdds = await fetchSubcollection(gameId, 'asia_odds');
        const euroOdds = await fetchSubcollection(gameId, 'euro_odds');
        const countOdds = await fetchSubcollection(gameId, 'count_odds');

        document.getElementById('home-team').textContent = gameInfo.home_team || 'N/A';
        document.getElementById('away-team').textContent = gameInfo.away_team || 'N/A';
        document.getElementById('game-time').textContent = formatDateTime(gameInfo.start_time, false);

        renderOddsTable(asiaOdds, 'asia-odds-table', ['formatted_time', 'asia_plate', 'host_price', 'guest_price'], false);
        renderOddsTable(euroOdds, 'euro-odds-table', ['formatted_time', 'host_price', 'draw_price', 'guest_price'], false);
        renderOddsTable(countOdds, 'count-odds-table', ['formatted_time', 'count', 'upper_price', 'lower_price'], false);

    } catch (error) {
        console.error(`Error fetching soccer game details for ID ${gameId}:`, error);
        document.getElementById('game-info').innerHTML = `<p class="text-danger">加載足球賽事詳情失敗: ${error.message}</p>`;
    }
}

async function loadBasketballGameDetails(gameId) {
    try {
        const gameInfo = await fetchGameInfo(gameId);
        const giveOdds = await fetchSubcollection(gameId, 'asia_odds');
        const stdOdds = await fetchSubcollection(gameId, 'euro_odds');
        const ballOdds = await fetchSubcollection(gameId, 'count_odds');

        document.getElementById('home-team').textContent = gameInfo.home_team || 'N/A';
        document.getElementById('away-team').textContent = gameInfo.away_team || 'N/A';
        document.getElementById('game-time').textContent = formatDateTime(gameInfo.start_time, false);

        renderOddsTable(giveOdds, 'give-odds-table', ['formatted_time', 'plate', 'host_price', 'guest_price'], false); 
        renderOddsTable(stdOdds, 'std-odds-table', ['formatted_time', 'host_price', 'guest_price'], false); 
        renderOddsTable(ballOdds, 'ball-odds-table', ['formatted_time', 'ball_plate', 'upper_price', 'lower_price'], false); 

    } catch (error) {
        console.error(`Error fetching basketball game details for ID ${gameId}:`, error);
        document.getElementById('game-info').innerHTML = `<p class="text-danger">加載籃球賽事詳情失敗: ${error.message}</p>`;
    }
}

function renderOddsTable(oddsData, tableBodyId, keys, addBreakTag = false) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;
    tableBody.innerHTML = ''; 

    if (oddsData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${keys.length}">暫無數據</td></tr>`;
        return;
    }

    oddsData.forEach(item => {
        const row = document.createElement('tr');
        keys.forEach(key => {
            const td = document.createElement('td');
            if (key === 'formatted_time' && item[key]) {
                let displayTime = item[key].replace(/_/g, ' ').replace(/-/g, ':').replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                if(addBreakTag) {
                    let parts = displayTime.split(' ');
                    td.innerHTML = parts.length > 1 ? `${parts[0]}<br>${parts[1]}` : displayTime;
                } else {
                    td.textContent = displayTime;
                }
            } else {
                td.textContent = item[key] !== undefined && item[key] !== null ? item[key] : 'N/A';
            }
            row.appendChild(td);
        });
        tableBody.appendChild(row);
    });
}

function formatDateTime(isoString, addBreakTag = false) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            const match = isoString.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
            if (match) {
                return addBreakTag ? `${match[1]}<br>${match[2]}` : `${match[1]} ${match[2]}`;
            }
            return isoString;
        }

        const datePart = date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const timePart = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

        return addBreakTag ? `${datePart}<br>${timePart}` : `${datePart} ${timePart}`;

    } catch (e) {
        return isoString;
    }
}
