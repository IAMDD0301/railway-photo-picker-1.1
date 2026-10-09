let allStations = [];
let visitedCodes = JSON.parse(localStorage.getItem('railway_visited')) || [];

const elLine = document.getElementById('flip-line');
const elCode = document.getElementById('flip-code');
const elName = document.getElementById('flip-name');
const elBtnDraw = document.getElementById('btn-draw');
const selectFilter = document.getElementById('filter-region');

const modalResult = document.getElementById('result-modal');
const modalHistory = document.getElementById('history-modal');

// 載入 stations.json
fetch('./stations.json')
  .then(res => res.json())
  .then(data => {
    allStations = data;
    updateStats();
  })
  .catch(err => console.error("車站載入錯誤:", err));

function updateStats() {
  const total = allStations.length;
  const visited = visitedCodes.length;
  document.getElementById('total-count').textContent = total;
  document.getElementById('visited-count').textContent = visited;
  document.getElementById('remaining-count').textContent = Math.max(0, total - visited);
}

// 根據篩選條件過濾車站
function getFilteredStations() {
  const filterVal = selectFilter.value;
  return allStations.filter(s => {
    const codeNum = parseInt(s.station_code, 10);
    if (filterVal === 'NORTH') return ['西部幹線', '平溪線', '內灣線', '深澳線', '六家線'].includes(s.line_name) && codeNum <= 1250;
    if (filterVal === 'CENTRAL') return ['山線', '海線', '成追線', '集集線'].includes(s.line_name);
    if (filterVal === 'SOUTH') return ['西部幹線', '沙崙線'].includes(s.line_name) && codeNum >= 3360;
    if (filterVal === 'EAST') return ['東部幹線', '屏東-南迴線'].includes(s.line_name);
    if (filterVal === 'SECRET') return ['平溪線', '內灣線', '集集線', '深澳線', '海線'].includes(s.line_name);
    if (filterVal === 'MAJOR') return ['特等站', '一等站', '二等站'].includes(s.station_grade);
    return true;
  });
}

// 快門抽選邏輯
elBtnDraw.addEventListener('click', () => {
  const pool = getFilteredStations();
  const available = pool.filter(s => !visitedCodes.includes(s.station_code));
  
  if (available.length === 0) {
    alert("🎉 您在此條件下的車站已全部巡禮完成！請切換篩選範圍或重置紀錄。");
    return;
  }

  elBtnDraw.disabled = true;
  elLine.classList.add('flipping');
  elCode.classList.add('flipping');
  elName.classList.add('flipping');

  let timer = setInterval(() => {
    const randomStation = available[Math.floor(Math.random() * available.length)];
    elLine.querySelector('.flip-inner').textContent = randomStation.line_name.substring(0, 4);
    elCode.querySelector('.flip-inner').textContent = randomStation.station_code;
    elName.querySelector('.flip-inner').textContent = randomStation.station_name;
  }, 80);

  setTimeout(() => {
    clearInterval(timer);
    const finalStation = available[Math.floor(Math.random() * available.length)];
    
    elLine.classList.remove('flipping');
    elCode.classList.remove('flipping');
    elName.classList.remove('flipping');

    elLine.querySelector('.flip-inner').textContent = finalStation.line_name.substring(0, 4);
    elCode.querySelector('.flip-inner').textContent = finalStation.station_code;
    elName.querySelector('.flip-inner').textContent = finalStation.station_name;

    if (!visitedCodes.includes(finalStation.station_code)) {
      visitedCodes.push(finalStation.station_code);
      localStorage.setItem('railway_visited', JSON.stringify(visitedCodes));
    }
    updateStats();

    setTimeout(() => {
      showResultModal(finalStation);
      elBtnDraw.disabled = false;
    }, 300);

  }, 1500);
});

function showResultModal(station) {
  document.getElementById('modal-station-title').textContent = station.station_name + " 火車站";
  document.getElementById('modal-location').textContent = `📍 路線：${station.line_name} (代碼: ${station.station_code})`;
  document.getElementById('modal-tag').textContent = `${station.line_name}`;

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

// 歷史紀錄
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