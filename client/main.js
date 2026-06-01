// ══════════════════════════════════════════════
//  DestinyCode — main.js
// ══════════════════════════════════════════════

// ── DOM refs ──
const form               = document.getElementById('birthForm');
const formSection        = document.getElementById('formSection');
const compatFormSection  = document.getElementById('compatFormSection');
const loadingSection     = document.getElementById('loadingSection');
const resultSection      = document.getElementById('resultSection');
const compatResultSection = document.getElementById('compatResultSection');
const errorSection       = document.getElementById('errorSection');
const leapRow            = document.getElementById('leapRow');

// ── 상수 ──
const STAT_LABELS  = { strength: '힘', intelligence: '지력', agility: '민첩', vitality: '체력', charisma: '카리스마' };
const ELEMENT_THEME   = { strength: 'water', intelligence: 'wood', agility: 'metal', vitality: 'earth', charisma: 'fire' };
const THEME_BAR_COLOR = { wood: '#2f6b54', fire: '#b81e5a', earth: '#9a6f12', metal: '#5b3fa6', water: '#a4d4c5', default: '#0a0a0a' };
const THEME_ACCENT    = { wood: '#2f6b54', fire: '#b81e5a', earth: '#9a6f12', metal: '#5b3fa6', water: '#a4d4c5', default: '#0a0a0a' };
const ELEMENT_KR      = { 목: '목(木)', 화: '화(火)', 토: '토(土)', 금: '금(金)', 수: '수(水)' };

// ── 현재 모드 / 마지막 결과 저장 ──
let currentMode       = 'character';
let lastCharacterData = null;
let lastCompatData    = null;

// ══════════════════════════════════════════════
//  모드 토글
// ══════════════════════════════════════════════
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode === currentMode) return;
    currentMode = mode;

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    // 모든 섹션 숨기고 해당 폼만 보이기
    [formSection, compatFormSection, loadingSection, resultSection, compatResultSection, errorSection]
      .forEach(s => s.classList.add('hidden'));

    if (mode === 'character') formSection.classList.remove('hidden');
    else                      compatFormSection.classList.remove('hidden');
  });
});

// ══════════════════════════════════════════════
//  양력/음력 토글
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
//  로딩 스텝 애니메이션
// ══════════════════════════════════════════════
const LOADING_STEPS = [
  '생년월일 해석 중...',
  '사주 팔자 계산 중...',
  '오행 분석 중...',
  '운명의 캐릭터 소환 중...',
];
const COMPAT_LOADING_STEPS = [
  '두 사람의 사주 분석 중...',
  '오행 궁합 계산 중...',
  '운명의 연결고리 탐색 중...',
  '궁합 결과 생성 중...',
];
let loadingTimer = null;

function startLoadingSteps(steps) {
  let i = 0;
  const el = document.getElementById('loadingText');
  function setStep(idx) {
    el.classList.remove('animate');
    void el.offsetWidth;
    el.textContent = steps[idx];
    el.classList.add('animate');
  }
  setStep(0);
  loadingTimer = setInterval(() => {
    i = (i + 1) % steps.length;
    setStep(i);
  }, 1800);
}

function stopLoadingSteps() {
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
}

// ══════════════════════════════════════════════
//  입력값 검증
// ══════════════════════════════════════════════
function validateDate(year, month, day, idPrefix = '') {
  const y = parseInt(year), m = parseInt(month), d = parseInt(day);
  if (!year || !month || !day) return { field: null, msg: '생년월일을 모두 입력해주세요.' };
  if (isNaN(y) || y < 1900 || y > 2025) return { field: idPrefix + 'Year',  msg: '연도는 1900~2025년 사이로 입력해주세요.' };
  if (isNaN(m) || m < 1 || m > 12)      return { field: idPrefix + 'Month', msg: '월은 1~12 사이여야 합니다.' };
  if (isNaN(d) || d < 1 || d > 31)      return { field: idPrefix + 'Day',   msg: '일은 1~31 사이여야 합니다.' };
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d)
    return { field: idPrefix + 'Day', msg: `${m}월에는 ${d}일이 없습니다.` };
  return null;
}

function validateInputs(year, month, day, hour) {
  const err = validateDate(year, month, day, 'birth');
  if (err) return err;
  if (hour !== '') {
    const h = parseInt(hour);
    if (isNaN(h) || h < 0 || h > 23) return { field: 'birthHour', msg: '시는 0~23 사이여야 합니다.' };
  }
  return null;
}

function showFieldError(fieldId, msg) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  input.classList.add('invalid');
  let errEl = input.parentNode.querySelector('.field-error');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'field-error';
    input.parentNode.appendChild(errEl);
  }
  errEl.textContent = msg;
  errEl.classList.add('visible');
}

function clearFieldErrors() {
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

// ══════════════════════════════════════════════
//  섹션 전환
// ══════════════════════════════════════════════
function showSection(name) {
  const all = [formSection, compatFormSection, loadingSection, resultSection, compatResultSection, errorSection];
  all.forEach(s => s.classList.add('hidden'));
  if (name === 'form')          formSection.classList.remove('hidden');
  if (name === 'compat-form')   compatFormSection.classList.remove('hidden');
  if (name === 'loading')       loadingSection.classList.remove('hidden');
  if (name === 'result')        resultSection.classList.remove('hidden');
  if (name === 'compat-result') compatResultSection.classList.remove('hidden');
  if (name === 'error')         errorSection.classList.remove('hidden');
}

// ══════════════════════════════════════════════
//  캐릭터 폼 제출 (2단계 로딩)
// ══════════════════════════════════════════════
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const birthYear   = document.getElementById('birthYear').value;
  const birthMonth  = document.getElementById('birthMonth').value;
  const birthDay    = document.getElementById('birthDay').value;
  const birthHour   = document.getElementById('birthHour').value;
  const birthMinute = document.getElementById('birthMinute').value;
  const gender      = document.getElementById('gender').value;
  const isLeap      = document.getElementById('isLeap').checked;

  const validErr = validateInputs(birthYear, birthMonth, birthDay, birthHour);
  if (validErr) {
    if (validErr.field) showFieldError(validErr.field, validErr.msg);
    else showError(validErr.msg, '입력한 날짜를 다시 확인해주세요.');
    return;
  }

  showSection('loading');
  startLoadingSteps(LOADING_STEPS);

  try {
    // Step 1: 캐릭터 생성 (빠름)
    const res = await fetch('/api/character/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, calType, isLeap }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.');

    lastCharacterData = data;
    stopLoadingSteps();
    renderCharacter({ character: data.character, imageUrl: null });
    renderGreatFortune(data.greatFortune);
    showSection('result');

    // Step 2: 이미지 생성 (느림, 백그라운드)
    showImageSkeleton();
    try {
      const imgRes = await fetch('/api/character/generate-image', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ character: data.character }),
      });
      const imgData = await imgRes.json();
      if (imgData.imageUrl) {
        lastCharacterData.imageUrl = imgData.imageUrl;
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
    showError(err.message, 'API 오류이거나 네트워크 문제일 수 있습니다. 잠시 후 다시 시도해주세요.');
  }
});

// ══════════════════════════════════════════════
//  궁합 폼 제출
// ══════════════════════════════════════════════
document.getElementById('compatBtn').addEventListener('click', async () => {
  clearFieldErrors();

  const c1Year  = document.getElementById('c1Year').value;
  const c1Month = document.getElementById('c1Month').value;
  const c1Day   = document.getElementById('c1Day').value;
  const c2Year  = document.getElementById('c2Year').value;
  const c2Month = document.getElementById('c2Month').value;
  const c2Day   = document.getElementById('c2Day').value;

  const err1 = validateDate(c1Year, c1Month, c1Day, 'c1');
  if (err1) {
    if (err1.field) showFieldError(err1.field, err1.msg);
    else showError('나의 생년월일을 모두 입력해주세요.', '');
    return;
  }
  const err2 = validateDate(c2Year, c2Month, c2Day, 'c2');
  if (err2) {
    if (err2.field) showFieldError(err2.field, err2.msg);
    else showError('상대방의 생년월일을 모두 입력해주세요.', '');
    return;
  }

  showSection('loading');
  startLoadingSteps(COMPAT_LOADING_STEPS);

  try {
    const res = await fetch('/api/compatibility/check', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        person1: { birthYear: c1Year, birthMonth: c1Month, birthDay: c1Day },
        person2: { birthYear: c2Year, birthMonth: c2Month, birthDay: c2Day },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.');

    lastCompatData = data;
    stopLoadingSteps();
    renderCompatResult(data);
    showSection('compat-result');

  } catch (err) {
    stopLoadingSteps();
    showError(err.message, '잠시 후 다시 시도해주세요.');
  }
});

// ══════════════════════════════════════════════
//  에러 표시
// ══════════════════════════════════════════════
function showError(msg, hint = '') {
  document.getElementById('errorMessage').textContent = msg;
  document.getElementById('errorHint').textContent    = hint;
  showSection('error');
}

// ── 재시도 버튼 ──
document.getElementById('retryBtn').addEventListener('click',       () => showSection('form'));
document.getElementById('errorRetryBtn').addEventListener('click',  () => {
  if (currentMode === 'compat') showSection('compat-form');
  else                          showSection('form');
});
document.getElementById('compatRetryBtn').addEventListener('click', () => showSection('compat-form'));

// ══════════════════════════════════════════════
//  이미지 영역 제어
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
//  테마 적용
// ══════════════════════════════════════════════
function applyCardTheme(stats) {
  const top   = Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0];
  const theme = ELEMENT_THEME[top];
  const card  = document.querySelector('.character-card');
  ['wood', 'fire', 'earth', 'metal', 'water'].forEach(t => card.classList.remove('theme-' + t));
  card.classList.add('theme-' + theme);
  return theme;
}

// ══════════════════════════════════════════════
//  레이더 차트
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
//  캐릭터 렌더링
// ══════════════════════════════════════════════
function renderCharacter({ character, imageUrl }) {
  const theme = applyCardTheme(character.stats);

  document.getElementById('characterName').textContent        = character.name;
  document.getElementById('characterClass').textContent       = character.class;
  document.getElementById('characterDestiny').textContent     = `"${character.destiny}"`;
  document.getElementById('characterPersonality').textContent = character.personality;

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

// ══════════════════════════════════════════════
//  궁합 결과 렌더링
// ══════════════════════════════════════════════
function renderCompatResult(data) {
  // 등급 라벨
  document.getElementById('compatGradeLabel').textContent = `${data.grade}등급 · ${data.label}`;
  document.getElementById('compatTitle').textContent      = data.title;
  document.getElementById('compatScore').textContent      = data.score;
  document.getElementById('compatStars').textContent      = data.stars;
  document.getElementById('compatDesc').textContent       = data.description;
  document.getElementById('compatSynergy').textContent    = data.synergy;
  document.getElementById('compatAdvice').textContent     = data.advice;

  // 두 사람 일주
  document.getElementById('compat1Pillar').textContent = data.person1.dayPillar;
  document.getElementById('compat1El').textContent     = data.person1.elementKr;
  document.getElementById('compat2Pillar').textContent = data.person2.dayPillar;
  document.getElementById('compat2El').textContent     = data.person2.elementKr;

  // 점수 링 conic-gradient
  const ring    = document.getElementById('scoreRing');
  const pct     = data.score;         // 0~100 → degree 0~360
  const deg     = Math.round(pct * 3.6);
  const color   = scoreColor(pct);
  ring.style.background = `conic-gradient(${color} ${deg}deg, rgba(10,10,10,0.10) ${deg}deg)`;
}

function scoreColor(score) {
  if (score >= 90) return '#ff6b9d';
  if (score >= 80) return '#ffb084';
  if (score >= 70) return '#a4d4c5';
  if (score >= 55) return '#b8a4ed';
  return '#9a9a9a';
}

// ══════════════════════════════════════════════
//  공유 기능
// ══════════════════════════════════════════════

// ── 캐릭터 카드 저장 ──
document.getElementById('shareBtn').addEventListener('click', async () => {
  await saveCardAsPng(document.querySelector('.character-card'), 'destiny-code-character.png', 'shareBtn', '📷 카드 저장');
});

// ── 웹 공유 (navigator.share / 링크 복사) ──
document.getElementById('shareWebBtn').addEventListener('click', async () => {
  await shareOrCopy({
    title: 'DestinyCode — 나의 사주 RPG 캐릭터',
    text:  lastCharacterData ? `내 RPG 캐릭터: ${lastCharacterData.character.name} (${lastCharacterData.character.class}) — DestinyCode` : 'DestinyCode에서 나만의 RPG 캐릭터를 만들어보세요!',
    url:   window.location.href,
  }, 'shareWebBtn');
});

// ── 인스타 스토리 저장 (9:16) ──
document.getElementById('shareInstaBtn').addEventListener('click', async () => {
  if (!lastCharacterData) return;
  await saveInstagramStory(lastCharacterData.character, lastCharacterData.imageUrl);
});

// ── 궁합 카드 저장 ──
document.getElementById('saveCompatBtn').addEventListener('click', async () => {
  await saveCardAsPng(document.getElementById('compatCard'), 'destiny-code-compat.png', 'saveCompatBtn', '📷 카드 저장');
});

// ── 궁합 공유 ──
document.getElementById('shareCompatBtn').addEventListener('click', async () => {
  await shareOrCopy({
    title: 'DestinyCode — 사주 궁합',
    text:  lastCompatData ? `우리 궁합: ${lastCompatData.score}점 ${lastCompatData.label} "${lastCompatData.title}" — DestinyCode` : '사주 궁합을 확인해보세요!',
    url:   window.location.href,
  }, 'shareCompatBtn');
});

// ── 공통: PNG 저장 ──
async function saveCardAsPng(node, filename, btnId, btnLabel) {
  const btn = document.getElementById(btnId);
  btn.disabled    = true;
  btn.textContent = '저장 중...';
  try {
    const dataUrl = await htmlToImage.toPng(node, { cacheBust: true, pixelRatio: 2 });
    const a       = document.createElement('a');
    a.download    = filename;
    a.href        = dataUrl;
    a.click();
  } catch (err) {
    console.error('이미지 저장 오류:', err);
    alert('이미지 저장에 실패했습니다.');
  }
  btn.disabled    = false;
  btn.textContent = btnLabel;
}

// ── 공통: 공유 or 링크 복사 ──
async function shareOrCopy({ title, text, url }, btnId) {
  const btn = document.getElementById(btnId);

  // 모바일: Web Share API (Kakao, Instagram 등 네이티브 공유시트)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      if (err.name !== 'AbortError') console.error('공유 오류:', err);
    }
    return;
  }

  // 데스크탑: 링크 복사
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    const original = btn.textContent;
    btn.textContent = '✓ 링크 복사됨!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  } catch (err) {
    console.error('복사 오류:', err);
    alert(`링크를 복사해주세요:\n${url}`);
  }
}

// ── 인스타그램 스토리 카드 (9:16, 540×960) ──
async function saveInstagramStory(character, imageUrl) {
  const btn = document.getElementById('shareInstaBtn');
  btn.disabled    = true;
  btn.textContent = '생성 중...';

  try {
    const card = document.getElementById('storyCard');
    card.innerHTML = '';

    // 카드 내용 구성
    card.style.cssText = `
      width:540px; height:960px;
      background: #1a0a2e;
      display:flex; flex-direction:column;
      align-items:center; justify-content:flex-start;
      padding:60px 40px 40px;
      font-family:'Noto Sans KR',sans-serif;
      color:#f0ede8; box-sizing:border-box;
    `;

    // 캐릭터 이미지
    if (imageUrl) {
      const imgEl = document.createElement('img');
      imgEl.src = imageUrl;
      imgEl.style.cssText = 'width:320px;height:320px;object-fit:cover;border-radius:20px;margin-bottom:32px;border:3px solid rgba(255,176,132,0.5);';
      card.appendChild(imgEl);
      // 이미지 로드 대기
      await new Promise((resolve) => {
        if (imgEl.complete) resolve();
        else { imgEl.onload = resolve; imgEl.onerror = resolve; }
      });
    } else {
      const placeholder = document.createElement('div');
      placeholder.style.cssText = 'width:320px;height:320px;border-radius:20px;margin-bottom:32px;background:rgba(255,176,132,0.15);display:flex;align-items:center;justify-content:center;font-size:80px;';
      placeholder.textContent = '⚔️';
      card.appendChild(placeholder);
    }

    // 배지
    const badge = document.createElement('div');
    badge.textContent = 'Destiny Code · 사주 RPG';
    badge.style.cssText = 'font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#ffb084;background:rgba(255,176,132,0.15);padding:5px 16px;border-radius:999px;margin-bottom:20px;font-weight:700;';
    card.appendChild(badge);

    // 캐릭터명
    const nameEl = document.createElement('div');
    nameEl.textContent = character.name;
    nameEl.style.cssText = 'font-family:"Noto Serif KR",serif;font-size:30px;font-weight:900;text-align:center;line-height:1.15;margin-bottom:10px;letter-spacing:-1px;';
    card.appendChild(nameEl);

    // 클래스
    const classEl = document.createElement('div');
    classEl.textContent = character.class;
    classEl.style.cssText = 'background:rgba(255,176,132,0.2);color:#ffb084;border-radius:999px;padding:5px 18px;font-size:13px;font-weight:700;margin-bottom:20px;';
    card.appendChild(classEl);

    // 운명 문구
    const destEl = document.createElement('div');
    destEl.textContent = `"${character.destiny}"`;
    destEl.style.cssText = 'font-style:italic;font-size:13px;color:rgba(240,237,232,0.65);text-align:center;line-height:1.8;max-width:380px;padding:0 20px;margin-bottom:32px;border-left:2px solid rgba(255,176,132,0.4);padding-left:14px;';
    card.appendChild(destEl);

    // URL 힌트
    const urlEl = document.createElement('div');
    urlEl.textContent = '내 운명 캐릭터 만들러 가기 →';
    urlEl.style.cssText = 'font-size:12px;color:rgba(240,237,232,0.4);letter-spacing:0.5px;margin-top:auto;';
    card.appendChild(urlEl);

    // 캡처
    const dataUrl = await htmlToImage.toPng(document.getElementById('storyCardWrap'), {
      cacheBust: true,
      pixelRatio: 2,
      width:  540,
      height: 960,
    });

    const a      = document.createElement('a');
    a.download   = 'destiny-code-story.png';
    a.href       = dataUrl;
    a.click();

  } catch (err) {
    console.error('스토리 저장 오류:', err);
    alert('스토리 이미지 생성에 실패했습니다.');
  }

  btn.disabled    = false;
  btn.textContent = '📱 스토리 저장';
}
