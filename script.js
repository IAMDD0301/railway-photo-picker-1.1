let allStations = [];
let visitedCodes = JSON.parse(localStorage.getItem('railway_visited')) || [];
let soundEnabled = true;

const elLine = document.getElementById('flip-line');
const elCode = document.getElementById('flip-code');
const elName = document.getElementById('flip-name');
const elBtnDraw = document.getElementById('btn-draw');
const selectFilter = document.getElementById('filter-region');
const btnSound = document.getElementById('btn-sound-toggle');

const modalResult = document.getElementById('result-modal');
const modalHistory = document.getElementById('history-modal');

// Web Audio API 原生音效合成
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playFlipSound() {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playShutterSound() {
  if (!soundEnabled) return;
  const bufferSize = audioCtx.sampleRate * 0.08;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
}

// 音效開關
btnSound.onclick = () => {
  soundEnabled = !soundEnabled;
  btnSound.textContent = soundEnabled ? '🔊 音效: 開' : '🔇 音效: 關';
};

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

// 根據篩選區域過濾車站
function getFilteredStations() {
  const filterVal = selectFilter.value;
  return allStations.filter(s => {
    if (filterVal === 'NORTH') return ['西部幹線', '平溪線', '內灣線', '深澳線', '六家線'].includes(s.line_name) && parseInt(s.station_code) <= 1250;
    if (filterVal === 'CENTRAL') return ['山線', '海線', '成追線', '集集線'].includes(s.line_name);
    if (filterVal === 'SOUTH') return ['西部幹線', '沙崙線'].includes(s.line_name) && parseInt(s.station_code) >= 3360;
    if (filterVal === 'EAST') return ['東部幹線', '屏東-南迴線'].includes(s.line_name);
    if (filterVal === 'SECRET') return ['平溪線', '內灣線', '集集線', '深澳線', '海線'].includes(s.line_name);
    if (filterVal === 'MAJOR') return ['特等站', '一等站', '二等站'].includes(s.station_grade);
    return true;
  });
}

// 快門抽選邏輯
elBtnDraw.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
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
    playFlipSound();
    const randomStation = available[Math.floor(Math.random() * available.length)];
    elLine.querySelector('.flip-inner').textContent = randomStation.line_name.substring(0, 4);
    elCode.querySelector('.flip-inner').textContent = randomStation.station_code;
    elName.querySelector('.flip-inner').textContent = randomStation.station_name;
  }, 90);

  setTimeout(() => {
    clearInterval(timer);
    playShutterSound();
    
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

// 顯示結果卡片
function showResultModal(station) {
  document.getElementById('modal-station-title').textContent = station.station_name + " 火車站";
  document.getElementById('modal-location').textContent = `📍 路線：${station.line_name} (代碼: ${station.station_code})`;
  document.getElementById('modal-tag').textContent = `${station.line_name}`;

  const renderItems = (items) => items.map(item => {
    const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.station_name + '火車站 ' + item.name)}`;
    return `
      <li class="item-row">
        <div class="item-info">
          <strong>${item.name}</strong> (${item.distance_text})
          <small>${item.description}</small>
        </div>
        <a href="${googleMapUrl}" target="_blank" rel="noopener noreferrer" class="btn-map-link">📍 地圖</a>
      </li>
    `;
  }).join('');

  document.getElementById('modal-photo-spots').innerHTML = renderItems(station.photo_spots);
  document.getElementById('modal-food-spots').innerHTML = renderItems(station.food_recommendations);

  modalResult.classList.remove('hidden');
}

// 下載卡片為圖檔
document.getElementById('btn-save-card').onclick = (e) => {
  e.stopPropagation();
  const cardEl = document.getElementById('capture-card');
  html2canvas(cardEl, { backgroundColor: '#FAFAFA', scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `旅拍駅-${document.getElementById('modal-station-title').textContent}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
};

// 點擊背景關閉 Modal
modalResult.onclick = (e) => {
  if (e.target === modalResult) modalResult.classList.add('hidden');
};

modalHistory.onclick = (e) => {
  if (e.target === historyModal) modalHistory.classList.add('hidden');
};

document.getElementById('btn-close-history').onclick = () => modalHistory.classList.add('hidden');

// 歷史紀錄與勳章計算
document.getElementById('btn-history').onclick = () => {
  renderAchievements();
  renderHistoryList();
  modalHistory.classList.remove('hidden');
};

function renderAchievements() {
  const count = visitedCodes.length;
  const badges = [
    { title: "🌱 首航啟程", desc: "造訪第 1 個車站", unlocked: count >= 1, icon: "🎫" },
    { title: "🌊 海線小霸王", desc: "造訪 3 個海線車站", unlocked: visitedCodes.filter(c => ['2110','2120','2130','2140','2150','2160','2170','2180','2190','2200','2210','2220','2230','2240','2250','2260'].includes(c)).length >= 3, icon: "🌊" },
    { title: "🌿 秘境探險家", desc: "造訪 3 個支線車站", unlocked: visitedCodes.filter(c => parseInt(c) >= 7330 && parseInt(c) <= 7336).length >= 3, icon: "🌿" },
    { title: "📜 巡禮達人", desc: "累積造訪 10 個車站", unlocked: count >= 10, icon: "🏅" },
    { title: "🚂 鐵道狂熱", desc: "累積造訪 25 個車站", unlocked: count >= 25, icon: "🚂" },
    { title: "🏆 環島半程", desc: "累積造訪 50 個車站", unlocked: count >= 50, icon: "🏆" }
  ];

  document.getElementById('badges-container').innerHTML = badges.map(b => `
    <div class="badge-card ${b.unlocked ? 'unlocked' : ''}">
      <span class="badge-icon">${b.icon}</span>
      <span class="badge-title">${b.title}</span>
      <span class="badge-desc">${b.desc}</span>
    </div>
  `).join('');
}

function renderHistoryList() {
  const listEl = document.getElementById('history-list');
  const visitedStations = allStations.filter(s => visitedCodes.includes(s.station_code));
  
  if (visitedStations.length === 0) {
    listEl.innerHTML = '<li>尚未有造訪紀錄，快按下快門開始旅程吧！</li>';
  } else {
    listEl.innerHTML = visitedStations.map(s => 
      `<li><strong>${s.station_name}</strong> (${s.line_name}) - 代碼: ${s.station_code}</li>`
    ).join('');
  }
}

// 重置紀錄
document.getElementById('btn-reset').onclick = () => {
  if (confirm("確定要重置所有造訪紀錄與成就勳章嗎？")) {
    visitedCodes = [];
    localStorage.removeItem('railway_visited');
    updateStats();
    modalHistory.classList.add('hidden');
    alert("紀錄已重置！");
  }
};