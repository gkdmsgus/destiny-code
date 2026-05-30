const form           = document.getElementById('birthForm');
const formSection    = document.getElementById('formSection');
const loadingSection = document.getElementById('loadingSection');
const resultSection  = document.getElementById('resultSection');
const errorSection   = document.getElementById('errorSection');
const leapRow        = document.getElementById('leapRow');

const STAT_LABELS = { strength: '힘', intelligence: '지력', agility: '민첩', vitality: '체력', charisma: '카리스마' };

const ELEMENT_THEME   = { strength: 'water', intelligence: 'wood', agility: 'metal', vitality: 'earth', charisma: 'fire' };
const THEME_BAR_COLOR = { wood: '#2f6b54', fire: '#b81e5a', earth: '#9a6f12', metal: '#5b3fa6', water: '#a4d4c5', default: '#0a0a0a' };
const THEME_ACCENT    = { wood: '#2f6b54', fire: '#b81e5a', earth: '#9a6f12', metal: '#5b3fa6', water: '#a4d4c5', default: '#0a0a0a' };
const ELEMENT_KR      = { 목: '목(木)', 화: '화(火)', 토: '토(土)', 금: '금(金)', 수: '수(水)' };

// ── 양력/음력 토글 ──
let calType = 'solar';
document.querySelectorAll('.cal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cal-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    calType = btn.dataset.cal;
    leapRow.classList.toggle('hidden', calType !== 'lunar');
  });
});

// ── 시 입력 시 분 필드 표시 ──
const birthHourInput = document.getElementById('birthHour');
const minuteGroup    = document.getElementById('minuteGroup');
birthHourInput.addEventListener('input', () => {
  const hasHour = birthHourInput.value !== '';
  minuteGroup.classList.toggle('hidden', !hasHour);
  if (!hasHour) document.getElementById('birthMinute').value = '';
});

// ── 로딩 스텝 애니메이션 ──
const LOADING_STEPS = [
  '생년월일 해석 중...',
  '사주 팔자 계산 중...',
  '오행 분석 중...',
  '운명의 캐릭터 소환 중...',
];
let loadingTimer = null;

function startLoadingSteps() {
  let i = 0;
  const el = document.getElementById('loadingText');
  function setStep(idx) {
    el.classList.remove('animate');
    void el.offsetWidth;
    el.textContent = LOADING_STEPS[idx];
    el.classList.add('animate');
  }
  setStep(0);
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_STEPS.length;
    setStep(i);
  }, 1800);
}

function stopLoadingSteps() {
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
}

// ── 폼 제출 (2단계 로딩) ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const birthYear   = document.getElementById('birthYear').value;
  const birthMonth  = document.getElementById('birthMonth').value;
  const birthDay    = document.getElementById('birthDay').value;
  const birthHour   = document.getElementById('birthHour').value;
  const birthMinute = document.getElementById('birthMinute').value;
  const gender      = document.getElementById('gender').value;
  const isLeap      = document.getElementById('isLeap').checked;

  showSection('loading');
  startLoadingSteps();

  try {
    // ── Step 1: 캐릭터 생성 (빠름, ~3~5초) ──
    const res = await fetch('/api/character/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, calType, isLeap }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.');

    stopLoadingSteps();
    renderCharacter({ character: data.character, imageUrl: null }); // 이미지 없이 먼저 렌더
    renderGreatFortune(data.greatFortune);
    showSection('result'); // 바로 결과 표시!

    // ── Step 2: 이미지 생성 (느림, 백그라운드로) ──
    showImageSkeleton();
    try {
      const imgRes = await fetch('/api/character/generate-image', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ character: data.character }),
      });
      const imgData = await imgRes.json();
      if (imgData.imageUrl) {
        updateCharacterImage(imgData.imageUrl, data.character.name);
      } else {
        hideImageArea();
      }
    } catch (imgErr) {
      console.error('이미지 생성 실패:', imgErr);
      hideImageArea();
    }

  } catch (err) {
    stopLoadingSteps();
    document.getElementById('errorMessage').textContent = err.message;
    showSection('error');
  }
});

// ── 이미지 영역 상태 제어 ──
function showImageSkeleton() {
  const area     = document.getElementById('cardImageArea');
  const skeleton = document.getElementById('imgSkeleton');
  const img      = document.getElementById('characterImage');
  area.style.display     = '';
  skeleton.style.display = 'flex';
  img.style.display      = 'none';
}

function hideImageArea() {
  document.getElementById('cardImageArea').style.display = 'none';
}

function updateCharacterImage(imageUrl, name) {
  const img      = document.getElementById('characterImage');
  const skeleton = document.getElementById('imgSkeleton');
  img.onload = () => {
    skeleton.style.display = 'none';
    img.style.display      = 'block';
    img.classList.add('loaded');
  };
  img.alt = name || '캐릭터 이미지';
  img.src = imageUrl;
}

document.getElementById('retryBtn').addEventListener('click', () => showSection('form'));
document.getElementById('errorRetryBtn').addEventListener('click', () => showSection('form'));

// ── 섹션 전환 ──
function showSection(name) {
  [formSection, loadingSection, resultSection, errorSection].forEach(s => s.classList.add('hidden'));
  if (name === 'form')    formSection.classList.remove('hidden');
  if (name === 'loading') loadingSection.classList.remove('hidden');
  if (name === 'result')  resultSection.classList.remove('hidden');
  if (name === 'error')   errorSection.classList.remove('hidden');
}

// ── 테마 적용 ──
function applyCardTheme(stats) {
  const top   = Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0];
  const theme = ELEMENT_THEME[top];
  const card  = document.querySelector('.character-card');
  ['wood', 'fire', 'earth', 'metal', 'water'].forEach(t => card.classList.remove('theme-' + t));
  card.classList.add('theme-' + theme);
  return theme;
}

// ── 레이더 차트 (Canvas 2D) ──
function drawRadarChart(canvas, stats, accentColor, isDark) {
  const dpr  = window.devicePixelRatio || 1;
  const size = canvas.clientWidth || 180;
  canvas.width        = size * dpr;
  canvas.height       = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';

  const ctx  = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const keys   = ['strength', 'intelligence', 'agility', 'vitality', 'charisma'];
  const labels = ['힘', '지력', '민첩', '체력', '카리스마'];
  const values = keys.map(k => (stats[k] || 0) / 100);
  const n  = 5;
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.30;

  const gridColor  = isDark ? 'rgba(240,237,232,0.18)' : 'rgba(10,10,10,0.10)';
  const labelColor = isDark ? 'rgba(240,237,232,0.75)' : '#6a6a6a';
  const fill       = accentColor || '#0a0a0a';

  ctx.clearRect(0, 0, size, size);

  for (let level = 1; level <= 4; level++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI / n) - Math.PI / 2;
      const x = cx + r * (level / 4) * Math.cos(a);
      const y = cy + r * (level / 4) * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    const x = cx + r * values[i] * Math.cos(a);
    const y = cy + r * values[i] * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle   = fill + '40';
  ctx.fill();
  ctx.strokeStyle = fill;
  ctx.lineWidth   = 2;
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    const x = cx + r * values[i] * Math.cos(a);
    const y = cy + r * values[i] * Math.sin(a);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  ctx.font         = '500 11px "Noto Sans KR", sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    const x = cx + (r + 20) * Math.cos(a);
    const y = cy + (r + 20) * Math.sin(a);
    ctx.fillStyle = labelColor;
    ctx.fillText(labels[i], x, y);
  }
}

// ── 캐릭터 렌더링 ──
function renderCharacter({ character, imageUrl }) {
  const theme = applyCardTheme(character.stats);

  document.getElementById('characterName').textContent        = character.name;
  document.getElementById('characterClass').textContent       = character.class;
  document.getElementById('characterDestiny').textContent     = `"${character.destiny}"`;
  document.getElementById('characterPersonality').textContent = character.personality;

  // 이미지 초기 상태 세팅 (2단계 로딩이 덮어씀)
  const area     = document.getElementById('cardImageArea');
  const skeleton = document.getElementById('imgSkeleton');
  const img      = document.getElementById('characterImage');

  if (imageUrl) {
    img.src                = imageUrl;
    img.alt                = character.name;
    img.style.display      = 'block';
    skeleton.style.display = 'none';
    area.style.display     = '';
  } else {
    img.style.display      = 'none';
    skeleton.style.display = 'flex';
    area.style.display     = '';
  }

  // 스탯 바
  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = '';
  const barColor = THEME_BAR_COLOR[theme] || THEME_BAR_COLOR.default;
  Object.entries(character.stats).forEach(([key, value]) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-label">${STAT_LABELS[key] || key}</span>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" style="width:0%;background:${barColor};" data-value="${value}"></div>
      </div>
      <span class="stat-value">${value}</span>`;
    statsGrid.appendChild(row);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll('.stat-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.value + '%';
    });
    const canvas = document.getElementById('radarChart');
    drawRadarChart(canvas, character.stats, THEME_ACCENT[theme] || THEME_ACCENT.default, theme === 'water');
  });

  // 스킬
  const skillsList = document.getElementById('skillsList');
  skillsList.innerHTML = '';
  character.skills.forEach(skill => {
    const item = document.createElement('div');
    item.className = 'skill-item';
    item.innerHTML = `<div class="skill-name">✦ ${skill.name}</div><div class="skill-desc">${skill.description}</div>`;
    skillsList.appendChild(item);
  });
}

// ── 대운 렌더링 ──
function renderGreatFortune(greatFortune) {
  const card     = document.getElementById('fortuneCard');
  const list     = document.getElementById('fortuneList');
  const subtitle = document.getElementById('fortuneSubtitle');

  if (!greatFortune) { card.classList.add('hidden'); return; }

  card.classList.remove('hidden');
  subtitle.textContent = `${greatFortune.startAge}세부터 시작 · ${greatFortune.isForward ? '순행(順行)' : '역행(逆行)'}`;

  list.innerHTML = '';
  greatFortune.fortunes.forEach(f => {
    const el = document.createElement('div');
    el.className = 'fortune-item';
    el.innerHTML = `
      <div class="fortune-age">${f.startAge}세~</div>
      <div class="fortune-pillars">${f.stem}${f.branch}</div>
      <div class="fortune-element">${ELEMENT_KR[f.element] || f.element}</div>`;
    list.appendChild(el);
  });
}

// ── 카드 저장 (html-to-image) ──
document.getElementById('shareBtn').addEventListener('click', async () => {
  const btn = document.getElementById('shareBtn');
  btn.disabled    = true;
  btn.textContent = '저장 중...';
  try {
    const node    = document.querySelector('.character-card');
    const dataUrl = await htmlToImage.toPng(node, { cacheBust: true, pixelRatio: 2 });
    const a       = document.createElement('a');
    a.download    = 'destiny-code.png';
    a.href        = dataUrl;
    a.click();
  } catch (err) {
    console.error('이미지 저장 오류:', err);
    alert('이미지 저장에 실패했습니다.');
  }
  btn.disabled    = false;
  btn.textContent = '📷 카드 저장';
});
