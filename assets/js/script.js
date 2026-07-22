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

// --- ECharts 圖表繪製邏輯 (支援雙Y軸與盤口深度階梯圖) ---
function parsePlateNumber(plateStr) {
    if (!plateStr) return null;
    const match = plateStr.match(/[《\\(]?([+-]?\\d+(\\.\\d+)?)(?:\\/([+-]?\\d+(\\.\\d+)?))?[》\\)]?/);
    if (match) {
        const num1 = parseFloat(match[1]);
        const num2 = match[3] ? parseFloat(match[3]) : num1;
        return (num1 + num2) / 2; 
    }
    return null;
}

function prepareChartData(oddsData, timeKey, valueKeys, names, extraInfoKey = null) {
    const times = [];
    const tooltipExtras = [];
    const plateValues = []; 
    let hasPlateData = false;

    oddsData.forEach(item => {
        let t = item[timeKey];
        if (t) {
            t = t.replace(/_/g, ' ').replace(/-/g, ':').replace(/^(\\d{4}):(\\d{2}):(\\d{2})/, '$1-$2-$3');
        }
        times.push(t || '');
        if (extraInfoKey) {
            const pStr = item[extraInfoKey] || '';
            tooltipExtras.push(pStr);
            const pNum = parsePlateNumber(pStr);
            if (pNum !== null) {
                plateValues.push(pNum);
                hasPlateData = true;
            } else {
                plateValues.push(null);
            }
        }
    });

    const series = valueKeys.map((vk, i) => {
        return {
            name: names[i],
            type: 'line',
            yAxisIndex: 0,
            data: oddsData.map(item => parseFloat(item[vk]) || null),
            symbol: 'circle',
            symbolSize: 6,
            smooth: true
        };
    });

    if (hasPlateData) {
        series.push({
            name: '盤口深度',
            type: 'line',
            step: 'end', 
            yAxisIndex: 1, 
            data: plateValues,
            itemStyle: { color: '#ff9800' },
            lineStyle: { width: 2, type: 'dashed' },
            symbol: 'none'
        });
    }

    return { times, series, tooltipExtras, hasPlateData };
}

function initEChart(domId, titleText, data) {
    const dom = document.getElementById(domId);
    if (!dom || data.times.length === 0) return;
    
    const existChart = echarts.getInstanceByDom(dom);
    if (existChart) existChart.dispose();
    
    const myChart = echarts.init(dom);
    
    const yAxisConfig = [
        { type: 'value', scale: true, name: '賠率水位', position: 'left' }
    ];

    if (data.hasPlateData) {
        yAxisConfig.push({
            type: 'value', scale: true, name: '盤口深度', position: 'right',
            splitLine: { show: false }
        });
    }

    const option = {
        title: { text: titleText, left: 'center' },
        tooltip: { 
            trigger: 'axis',
            formatter: function (params) {
                let html = params[0].axisValue + '<br/>';
                if (data.tooltipExtras && data.tooltipExtras.length > 0) {
                    html += `<span style="font-weight:bold;color:#ff5722;">當前盤口: ${data.tooltipExtras[params[0].dataIndex]}</span><br/>`;
                }
                params.forEach(p => {
                    if(p.seriesName !== '盤口深度'){
                        html += `${p.marker} ${p.seriesName}: <b>${p.value}</b><br/>`;
                    }
                });
                return html;
            }
        },
        legend: { top: 'bottom' },
        grid: { left: '10%', right: '10%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: data.times },
        yAxis: yAxisConfig,
        series: data.series
    };
    
    window.addEventListener('resize', () => myChart.resize());
    myChart.setOption(option);
}

// --- 抓取資料與渲染頁面 ---
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
    // 設定一個時間門檻：例如隱藏 24 小時以前的比賽
    const hideThreshold = new Date(now.getTime() - (72 * 60 * 60 * 1000));

    const future_games = [];
    const past_games = [];
    
    games.forEach(game => {
        if (!game.start_time) return;
        const startTime = new Date(game.start_time);

        if (startTime < hideThreshold) return;

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
    records.sort((a, b) => a.formatted_time.localeCompare(b.formatted_time));
    return records;
}

async function loadSoccerGames() {
    try {
        const data = await fetchGamesBySport('soccer');
        renderGames(data.future_games, 'future-soccer-games', 'soccer', true);
        renderGames(data.past_games, 'past-soccer-games', 'soccer', true);
    } catch (error) {
        console.error("Error fetching soccer games:", error);
    }
}

async function loadBasketballGames() {
    try {
        const data = await fetchGamesBySport('basketball');
        renderGames(data.future_games, 'future-basketball-games', 'basketball', true);
        renderGames(data.past_games, 'past-basketball-games', 'basketball', true);
    } catch (error) {
        console.error("Error fetching basketball games:", error);
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

        const asiaChartData = prepareChartData(asiaOdds, 'formatted_time', ['host_price', 'guest_price'], ['主隊', '客隊'], 'asia_plate');
        initEChart('asia-chart', '亞盤 (讓球) 走勢', asiaChartData);

        const euroChartData = prepareChartData(euroOdds, 'formatted_time', ['host_price', 'draw_price', 'guest_price'], ['主勝', '和局', '客勝']);
        initEChart('euro-chart', '歐賠 (標準盤) 走勢', euroChartData);

        const countChartData = prepareChartData(countOdds, 'formatted_time', ['upper_price', 'lower_price'], ['大球', '小球'], 'count');
        initEChart('count-chart', '大小盤 走勢', countChartData);

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

        const giveChartData = prepareChartData(giveOdds, 'formatted_time', ['host_price', 'guest_price'], ['主隊', '客隊'], 'plate');
        initEChart('give-chart', '讓分盤 走勢', giveChartData);

        const stdChartData = prepareChartData(stdOdds, 'formatted_time', ['host_price', 'guest_price'], ['主勝', '客勝']);
        initEChart('std-chart', '標準盤 走勢', stdChartData);

        const ballChartData = prepareChartData(ballOdds, 'formatted_time', ['upper_price', 'lower_price'], ['大分', '小分'], 'ball_plate');
        initEChart('ball-chart', '大小分 走勢', ballChartData);

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
