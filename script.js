let allStations = [];
let visitedCodes = JSON.parse(localStorage.getItem('railway_visited')) || [];
let currentDrawnStation = null;

const elLine = document.getElementById('flip-line');
const elCode = document.getElementById('flip-code');
const elName = document.getElementById('flip-name');
const elBtnDraw = document.getElementById('btn-draw');
const selectStart = document.getElementById('select-start-station');
const divEstimates = document.getElementById('route-estimates');

const modalResult = document.getElementById('result-modal');
const modalHistory = document.getElementById('history-modal');

// 讀取包含全台車站的 JSON 資料
fetch('./stations.json')
  .then(res => res.json())
  .then(data => {
    allStations = data;
    initStartStationSelect();
    updateStats();
  })
  .catch(err => console.error("車站載入錯誤:", err));

// 初始化「起始站」選單（預設選取苗栗）
function initStartStationSelect() {
  selectStart.innerHTML = allStations.map(s => 
    `<option value="${s.station_code}" ${s.station_name === '苗栗' ? 'selected' : ''}>${s.station_name} (${s.line_name})</option>`
  ).join('');

  selectStart.addEventListener('change', () => {
    if (currentDrawnStation) {
      calculateRouteEstimates(currentDrawnStation);
    }
  });
}

function updateStats() {
  const total = allStations.length;
  const visited = visitedCodes.length;
  document.getElementById('total-count').textContent = total;
  document.getElementById('visited-count').textContent = visited;
  document.getElementById('remaining-count').textContent = Math.max(0, total - visited);
}

// 核心抽選邏輯
elBtnDraw.addEventListener('click', () => {
  const available = allStations.filter(s => !visitedCodes.includes(s.station_code));
  
  if (available.length === 0) {
    alert("🎉 恭喜！您已完成全台所有鐵路車站的巡禮！可以重置紀錄重新開始！");
    return;
  }

  elBtnDraw.disabled = true;
  elLine.classList.add('flipping');
  elCode.classList.add('flipping');
  elName.classList.add('flipping');

  let timer = setInterval(() => {
    const randomStation = available[Math.floor(Math.random() * available.length)];
    elLine.querySelector('.flip-inner').textContent = randomStation.line_name.substring(0, 3);
    elCode.querySelector('.flip-inner').textContent = randomStation.station_code;
    elName.querySelector('.flip-inner').textContent = randomStation.station_name;
  }, 80);

  setTimeout(() => {
    clearInterval(timer);
    const finalStation = available[Math.floor(Math.random() * available.length)];
    currentDrawnStation = finalStation;
    
    elLine.classList.remove('flipping');
    elCode.classList.remove('flipping');
    elName.classList.remove('flipping');

    elLine.querySelector('.flip-inner').textContent = finalStation.line_name.substring(0, 3);
    elCode.querySelector('.flip-inner').textContent = finalStation.station_code;
    elName.querySelector('.flip-inner').textContent = finalStation.station_name;

    if (!visitedCodes.includes(finalStation.station_code)) {
      visitedCodes.push(finalStation.station_code);
      localStorage.setItem('railway_visited', JSON.stringify(visitedCodes));
    }
    updateStats();

    // 算得出發路線預估
    calculateRouteEstimates(finalStation);

    setTimeout(() => {
      showResultModal(finalStation);
      elBtnDraw.disabled = false;
    }, 300);

  }, 1500);
});

// 核心：算得鐵路搭乘路線與停靠站數
function calculateRouteEstimates(targetStation) {
  const startCode = selectStart.value;
  const startStation = allStations.find(s => s.station_code === startCode);

  if (!startStation || !targetStation) return;

  const startIndex = allStations.findIndex(s => s.station_code === startCode);
  const targetIndex = allStations.findIndex(s => s.station_code === targetStation.station_code);
  const stationDistance = Math.abs(startIndex - targetIndex);

  // 判斷是否為對號大站 (特等/一等/二等)
  const isTargetExpressStop = ['特等站', '一等站', '二等站'].includes(targetStation.station_grade);
  const isStartExpressStop = ['特等站', '一等站', '二等站'].includes(startStation.station_grade);

  // 尋找離目標最近的大站 (轉乘用)
  let nearestExpressStation = '中壢';
  if (targetIndex > 0) {
    for (let i = targetIndex; i >= 0 && i < allStations.length; i += (startIndex < targetIndex ? -1 : 1)) {
      if (['特等站', '一等站', '二等站'].includes(allStations[i].station_grade)) {
        nearestExpressStation = allStations[i].station_name;
        break;
      }
    }
  }

  const expressStops = Math.max(1, Math.round(stationDistance / 5));
  const chuKuangStops = Math.max(1, Math.round(stationDistance / 3));

  let htmlContent = `
    <div class="estimate-box">
      <div class="train-type-card" style="border-color: #3B82F6;">
        <h4>🚆 區間車（站站停）</h4>
        <p>從 <strong>${startStation.station_name}</strong> 到 <strong>${targetStation.station_name}</strong> 需經過約 <strong>${stationDistance}</strong> 個車站。</p>
      </div>

      <div class="train-type-card" style="border-color: #EF4444;">
        <h4>🚄 自強號（快速特快）</h4>
        ${isTargetExpressStop ? 
          `<p>直達！從 <strong>${startStation.station_name}</strong> 到 <strong>${targetStation.station_name}</strong> 約停靠 <strong>${expressStops}</strong> 個主要大站。</p>` : 
          `<p>轉乘建議：搭自強號從 <strong>${startStation.station_name}</strong> ➔ <strong>${nearestExpressStation}</strong> (停靠約 ${expressStops} 站)，再轉搭區間車至 <strong>${targetStation.station_name}</strong> (1 站)。</p>`}
      </div>

      <div class="train-type-card" style="border-color: #F59E0B;">
        <h4>列車 莒光號（對號列車）</h4>
        <p>從 <strong>${startStation.station_name}</strong> 出發約停靠 <strong>${chuKuangStops}</strong> 站。</p>
      </div>
    </div>
  `;

  divEstimates.innerHTML = htmlContent;
}

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

modalResult.onclick = () => modalResult.classList.add('hidden');
modalHistory.onclick = () => modalHistory.classList.add('hidden');
document.getElementById('btn-close-history').onclick = () => modalHistory.classList.add('hidden');

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

document.getElementById('btn-reset').onclick = () => {
  if (confirm("確定要重置所有造訪紀錄，重新開始全台巡禮嗎？")) {
    visitedCodes = [];
    localStorage.removeItem('railway_visited');
    updateStats();
    modalHistory.classList.add('hidden');
    alert("紀錄已重置！");
  }
};