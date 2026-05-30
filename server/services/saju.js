const { Solar, Lunar } = require('lunar-javascript');

const STEMS    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const STEM_KR  = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCH_KR= ['자','축','인','묘','진','사','오','미','신','유','술','해'];

const STEM_ELEMENT   = ['목','목','화','화','토','토','금','금','수','수'];
const BRANCH_ELEMENT = ['수','토','목','목','토','화','화','토','금','금','토','수'];

// 기준일: 1900-01-01 = 甲戌 (60갑자 index 10) — AI_Saju_Gemini_v9 A안 고정
const BASE_DATE = new Date(Date.UTC(1900, 0, 1));

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

// 음력 → 양력 변환
function lunarToSolar(year, month, day, isLeap = false) {
  const lunar = Lunar.fromYmd(year, month, day);
  // lunar-javascript에서 윤달 처리
  // isLeap이 true면 해당 월이 윤달인지 확인
  const solar = lunar.getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
}

// 진태양시 계산 (서울 기본값 적용)
function calcTrueSolarTime(year, month, day, hour, minute, longitude = 126.97) {
  const utcOffset = 9;
  const stdLon = utcOffset * 15; // 135°
  const lonCorrection = (longitude - stdLon) * 4; // 분 단위

  // 균시차 근사식
  const start = new Date(Date.UTC(year, 0, 1));
  const target = new Date(Date.UTC(year, month - 1, day));
  const dayOfYear = daysBetween(start, target) + 1;
  const B = 2 * Math.PI * (dayOfYear - 81) / 365;
  const eqt = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  const totalCorrection = lonCorrection + eqt; // 분
  const totalMinutes = hour * 60 + minute + totalCorrection;

  return {
    hour: Math.floor(((totalMinutes % 1440) + 1440) % 1440 / 60),
    minute: Math.round(((totalMinutes % 60) + 60) % 60),
    correctionMin: Math.round(totalCorrection * 10) / 10,
  };
}

// 년주 계산 — 입춘(약 2/4) 기준
function getYearPillar(solarYear, solarMonth, solarDay) {
  const y = (solarMonth < 2 || (solarMonth === 2 && solarDay < 4)) ? solarYear - 1 : solarYear;
  const stemIdx   = ((y - 4) % 10 + 10) % 10;
  const branchIdx = ((y - 4) % 12 + 12) % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx };
}

// 월주 계산 — 절기 근사 (월 기준)
function getMonthPillar(yearStemIdx, solarMonth) {
  // 寅(2)월~丑(1)월 순환
  const monthToBranch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]; // 1월=丑, 2월=寅, ..., 12월=子
  const branchIdx = monthToBranch[solarMonth - 1];

  // 년간별 인월 시작 천간: 甲己→丙(2), 乙庚→戊(4), 丙辛→庚(6), 丁壬→壬(8), 戊癸→甲(0)
  const stemBases = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  const stemIdx = (stemBases[yearStemIdx] + ((branchIdx - 2 + 12) % 12)) % 10;

  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx };
}

// 일주 계산 — 1900-01-01=甲戌(index 10), (10+diff)%60
function getDayPillar(solarYear, solarMonth, solarDay) {
  const target = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay));
  const diff   = daysBetween(BASE_DATE, target);
  const idx    = ((10 + diff) % 60 + 60) % 60;
  const stemIdx   = idx % 10;
  const branchIdx = idx % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx };
}

// 시주 계산 — 진태양시 기준, 30분 오프셋 경계 (23:30~01:30=子시)
function getHourPillar(dayStemIdx, trueSolarHour, trueSolarMinute) {
  const totalMin = trueSolarHour * 60 + trueSolarMinute;

  let branchIdx;
  if (totalMin >= 23 * 60 + 30 || totalMin < 1 * 60 + 30)  branchIdx = 0;  // 子
  else if (totalMin < 3 * 60 + 30)  branchIdx = 1;   // 丑
  else if (totalMin < 5 * 60 + 30)  branchIdx = 2;   // 寅
  else if (totalMin < 7 * 60 + 30)  branchIdx = 3;   // 卯
  else if (totalMin < 9 * 60 + 30)  branchIdx = 4;   // 辰
  else if (totalMin < 11 * 60 + 30) branchIdx = 5;   // 巳
  else if (totalMin < 13 * 60 + 30) branchIdx = 6;   // 午
  else if (totalMin < 15 * 60 + 30) branchIdx = 7;   // 未
  else if (totalMin < 17 * 60 + 30) branchIdx = 8;   // 申
  else if (totalMin < 19 * 60 + 30) branchIdx = 9;   // 酉
  else if (totalMin < 21 * 60 + 30) branchIdx = 10;  // 戌
  else                               branchIdx = 11;  // 亥

  // 일간별 자시 시작 천간: 甲己→甲(0), 乙庚→丙(2), 丙辛→戊(4), 丁壬→庚(6), 戊癸→壬(8)
  const stemBases = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  const stemIdx = (stemBases[dayStemIdx] + branchIdx) % 10;

  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx };
}

// ── 대운(大運) 계산 ──
// 순행/역행: 남성+양간 or 여성+음간 → 순행
// 대운수 = (절기까지 날수) ÷ 3 반올림 (절기 근사: 매월 6일)
function getGreatFortune(solarYear, solarMonth, solarDay, gender, yearStemIdx, monthPillar) {
  if (!gender) return null;

  const isYangStem = yearStemIdx % 2 === 0; // 甲丙戊庚壬 = 양간
  const isForward  = (gender === '남성') ? isYangStem : !isYangStem;

  const birthDate = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay));
  let daysToJokgi;

  if (isForward) {
    // 다음 절기 = 다음 달 6일 근사
    const nm = solarMonth === 12 ? 1  : solarMonth + 1;
    const ny = solarMonth === 12 ? solarYear + 1 : solarYear;
    const next = new Date(Date.UTC(ny, nm - 1, 6));
    daysToJokgi = Math.abs(daysBetween(birthDate, next));
  } else {
    // 이전 절기 = 이번 달 6일 (생일이 6일 이전이면 전달 6일)
    let pm = solarMonth, py = solarYear;
    if (solarDay <= 6) {
      pm = solarMonth === 1 ? 12 : solarMonth - 1;
      py = solarMonth === 1 ? solarYear - 1 : solarYear;
    }
    const prev = new Date(Date.UTC(py, pm - 1, 6));
    daysToJokgi = Math.abs(daysBetween(prev, birthDate));
  }

  const startAge = Math.max(1, Math.round(daysToJokgi / 3));

  let stemIdx   = monthPillar.stemIdx;
  let branchIdx = monthPillar.branchIdx;
  const fortunes = [];

  for (let i = 0; i < 8; i++) {
    if (isForward) {
      stemIdx   = (stemIdx   + 1) % 10;
      branchIdx = (branchIdx + 1) % 12;
    } else {
      stemIdx   = (stemIdx   - 1 + 10) % 10;
      branchIdx = (branchIdx - 1 + 12) % 12;
    }
    fortunes.push({
      stem:     STEMS[stemIdx],
      branch:   BRANCHES[branchIdx],
      stemKr:   STEM_KR[stemIdx],
      branchKr: BRANCH_KR[branchIdx],
      startAge: startAge + i * 10,
      element:  STEM_ELEMENT[stemIdx],
    });
  }

  return { startAge, isForward, fortunes };
}

function calculateSaju({ birthYear, birthMonth, birthDay, birthHour, birthMinute, calType, isLeap, gender }) {
  let solarYear, solarMonth, solarDay;

  if (calType === 'lunar') {
    const solar = lunarToSolar(
      parseInt(birthYear), parseInt(birthMonth), parseInt(birthDay), isLeap === true
    );
    solarYear  = solar.year;
    solarMonth = solar.month;
    solarDay   = solar.day;
  } else {
    solarYear  = parseInt(birthYear);
    solarMonth = parseInt(birthMonth);
    solarDay   = parseInt(birthDay);
  }

  const yearPillar  = getYearPillar(solarYear, solarMonth, solarDay);
  const monthPillar = getMonthPillar(yearPillar.stemIdx, solarMonth);
  const dayPillar   = getDayPillar(solarYear, solarMonth, solarDay);

  let hourPillar   = null;
  let trueSolarInfo = null;

  const hasTime = birthHour !== '' && birthHour !== null && birthHour !== undefined;
  if (hasTime) {
    const h = parseInt(birthHour);
    const m = parseInt(birthMinute) || 0;
    trueSolarInfo = calcTrueSolarTime(solarYear, solarMonth, solarDay, h, m);
    hourPillar = getHourPillar(dayPillar.stemIdx, trueSolarInfo.hour, trueSolarInfo.minute);
  }

  // 오행 분포
  const elementCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])].forEach(p => {
    elementCount[STEM_ELEMENT[p.stemIdx]]++;
    elementCount[BRANCH_ELEMENT[p.branchIdx]]++;
  });

  const pillars = [
    `${yearPillar.stem}${yearPillar.branch}년`,
    `${monthPillar.stem}${monthPillar.branch}월`,
    `${dayPillar.stem}${dayPillar.branch}일`,
    hourPillar ? `${hourPillar.stem}${hourPillar.branch}시` : null,
  ].filter(Boolean).join(' ');

  const greatFortune = getGreatFortune(
    solarYear, solarMonth, solarDay, gender,
    yearPillar.stemIdx, monthPillar
  );

  return {
    solarDate: { year: solarYear, month: solarMonth, day: solarDay },
    yearPillar, monthPillar, dayPillar, hourPillar,
    elementCount,
    summary: pillars,
    trueSolarInfo,
    greatFortune,
  };
}

// ── 오행 비율 → RPG 스탯 수식 계산 ──
// 오행 하나당 글자 비율(%) × 1.8 → 기본 수치 (최소 10, 최대 85)
// 직업 주력 스탯에 보너스 추가하여 직업 정체성 확보
const ELEMENT_TO_STAT = { 목: 'intelligence', 화: 'charisma', 토: 'vitality', 금: 'agility', 수: 'strength' };

const CLASS_STAT_BONUS = {
  '워리어': [{ stat: 'vitality', bonus: 20 }, { stat: 'strength', bonus: 15 }],
  '마법사': [{ stat: 'intelligence', bonus: 22 }],
  '궁수':   [{ stat: 'agility', bonus: 22 }],
  '힐러':   [{ stat: 'charisma', bonus: 20 }, { stat: 'vitality', bonus: 10 }],
  '도적':   [{ stat: 'agility', bonus: 20 }, { stat: 'strength', bonus: 10 }],
  '소환사': [{ stat: 'intelligence', bonus: 15 }, { stat: 'charisma', bonus: 15 }],
};

function calculateStatsByElement(elementCount, classChoice) {
  const total = Object.values(elementCount).reduce((a, b) => a + b, 0);

  // 1) 오행 비율 → 기본 수치
  const stats = { strength: 10, intelligence: 10, agility: 10, vitality: 10, charisma: 10 };
  Object.entries(elementCount).forEach(([el, cnt]) => {
    const pct     = total > 0 ? (cnt / total) * 100 : 0;
    const statKey = ELEMENT_TO_STAT[el];
    if (statKey) stats[statKey] = Math.round(Math.min(85, Math.max(10, pct * 1.8)));
  });

  // 2) 직업 주력 스탯 보너스
  const classKey = Object.keys(CLASS_STAT_BONUS).find(k => classChoice?.includes(k));
  if (classKey) {
    CLASS_STAT_BONUS[classKey].forEach(({ stat, bonus }) => {
      stats[stat] = Math.min(100, stats[stat] + bonus);
    });
  }

  return stats;
}

module.exports = { calculateSaju, calculateStatsByElement, STEM_ELEMENT, BRANCH_ELEMENT };
