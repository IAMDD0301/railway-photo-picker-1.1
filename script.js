// 預設備用站點資料
const fallbackStations = [
  {
    "station_code": "2160",
    "station_id": "ST_043",
    "station_name": "新埔",
    "line_name": "海岸線",
    "city": "苗栗縣",
    "district": "通霄鎮",
    "station_grade": "乙簡站",
    "photo_spots": [
      { "name": "新埔百年木造車站站體", "distance_text": "站內即可拍攝", "description": "日治時期留存至今之黑瓦木造車站，極具懷舊古韻。" },
      { "name": "新埔海堤 (離海最近海堤)", "distance_text": "步行約 3 分鐘", "description": "出站直走即可到達海堤，可拍攝風車與海浪美景。" }
    ],
    "food_recommendations": [
      { "name": "站前海堤景觀咖啡/在地古早味小吃", "distance_text": "步行約 3 分鐘", "description": "簡易海邊小店，適合品嚐古早味點心。" }
    ]
  },
  {
    "station_code": "1090",
    "station_id": "ST_021",
    "station_name": "內壢",
    "line_name": "縱貫線北段",
    "city": "桃園市",
    "district": "中壢區",
    "station_grade": "二等站",
    "photo_spots": [
      { "name": "元智大學綠色隧道 / 內壢公園", "distance_text": "步行約 10 分鐘", "description": "綠意盎然的校園步道與公園景緻。" }
    ],
    "food_recommendations": [
      { "name": "內壢手工粉圓 / 忠孝路美食商圈", "distance_text": "步行約 5~7 分鐘", "description": "在地熱門古早味Q彈手工粉圓。" }
    ]
  }
];

let allStations = [];
let visitedCodes = JSON.parse(localStorage.getItem('railway_visited')) || [];

// DOM 元素
const elLine = document.getElementById('flip-line');
const elCode = document.getElementById('flip-code');
const elName = document.getElementById('flip-name');
const elBtnDraw = document.getElementById('btn-draw');

const modalResult = document.getElementById('result-modal');
const modalHistory = document.getElementById('history-modal');

// 初始化：讀取 stations.json
fetch('./stations.json')
  .then(res => {
    if (!res.ok) throw new Error("HTTP 錯誤 " + res.status);
    return res.json();
  })
  .then(data => {
    allStations = data;
    updateStats();
  })
  .catch(err => {
    console.warn("無法載入 stations.json，啟用備用車站資料:", err);
    allStations = fallbackStations;
    updateStats();
  });

// 更新介面數量統計
function updateStats() {
  const total = allStations.length;
  const visited = visitedCodes.length;
  document.getElementById('total-count').textContent = total;
  document.getElementById('visited-count').textContent = visited;
  document.getElementById('remaining-count').textContent = Math.max(0, total - visited);
}

// 機械翻牌抽選邏輯
elBtnDraw.addEventListener('click', () => {
  const available = allStations.filter(s => !visitedCodes.includes(s.station_code));
  
  if (available.length === 0) {
    alert("🎉 恭喜！您已完成全台所有鐵路車站的巡禮！可以重置紀錄重新開始！");
    return;
  }

  elBtnDraw.disabled = true;
  
  // 啟動翻牌動畫
  elLine.classList.add('flipping');
  elCode.classList.add('flipping');
  elName.classList.add('flipping');

  let speed = 80;
  let timer = setInterval(() => {
    const randomStation = available[Math.floor(Math.random() * available.length)];
    elLine.querySelector('.flip-inner').textContent = randomStation.line_name.substring(0, 3);
    elCode.querySelector('.flip-inner').textContent = randomStation.station_code;
    elName.querySelector('.flip-inner').textContent = randomStation.station_name;
  }, speed);

  // 定格並彈出寫真 Modal (1.5 秒後)
  setTimeout(() => {
    clearInterval(timer);
    
    // 選出最終車站
    const finalStation = available[Math.floor(Math.random() * available.length)];
    
    // 停止動畫
    elLine.classList.remove('flipping');
    elCode.classList.remove('flipping');
    elName.classList.remove('flipping');

    elLine.querySelector('.flip-inner').textContent = finalStation.line_name.substring(0, 3);
    elCode.querySelector('.flip-inner').textContent = finalStation.station_code;
    elName.querySelector('.flip-inner').textContent = finalStation.station_name;

    // 寫入造訪紀錄
    if (!visitedCodes.includes(finalStation.station_code)) {
      visitedCodes.push(finalStation.station_code);
      localStorage.setItem('railway_visited', JSON.stringify(visitedCodes));
    }
    updateStats();

    // 彈出資訊卡片
    setTimeout(() => {
      showResultModal(finalStation);
      elBtnDraw.disabled = false;
    }, 300);

  }, 1500);
});

// 填入 Modal 內容
function showResultModal(station) {
  document.getElementById('modal-station-title').textContent = station.station_name + " 火車站";
  document.getElementById('modal-location').textContent = `📍 ${station.city}${station.district}`;
  document.getElementById('modal-tag').textContent = `${station.line_name} | ${station.station_grade}`;

  const spotList = document.getElementById('modal-photo-spots');
  spotList.innerHTML = station.photo_spots.map(spot => 
    `<li><strong>${spot.name}</strong> (${spot.distance_text})<br><small style="color:#6B7280">${spot.description}</small></li>`
  ).join('');

  const foodList = document.getElementById('modal-food-spots');
  foodList.innerHTML = station.food_recommendations.map(food => 
    `<li><strong>${food.name}</strong> (${food.distance_text})<br><small style="color:#6B7280">${food.description}</small></li>`
  ).join('');

  modalResult.classList.remove('hidden');
}

// 點擊任意處關閉結果 Modal
modalResult.onclick = () => modalResult.classList.add('hidden');

// 歷史紀錄相關事件
modalHistory.onclick = () => modalHistory.classList.add('hidden');
document.getElementById('btn-close-history').onclick = () => modalHistory.classList.add('hidden');

// 開啟歷史紀錄
document.getElementById('btn-history').onclick = () => {
  const listEl = document.getElementById('history-list');
  const visitedStations = allStations.filter(s => visitedCodes.includes(s.station_code));
  
  if (visitedStations.length === 0) {
    listEl.innerHTML = '<li>尚未有造訪紀錄，快按下快門開始旅程吧！</li>';
  } else {
    listEl.innerHTML = visitedStations.map(s => 
      `<li><strong>${s.station_name}</strong> (${s.line_name}) - 代碼: ${s.station_code}</li>`
    ).join('');
  }
  modalHistory.classList.remove('hidden');
};

// 重置紀錄
document.getElementById('btn-reset').onclick = () => {
  if (confirm("確定要重置所有造訪紀錄，重新開始全台巡禮嗎？")) {
    visitedCodes = [];
    localStorage.removeItem('railway_visited');
    updateStats();
    modalHistory.classList.add('hidden');
    alert("紀錄已重置！");
  }
};