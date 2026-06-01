const express = require('express');
const router  = express.Router();
const { generateCharacter } = require('../services/gpt');
const { generateImage }     = require('../services/dalle');

// ── 인메모리 캐시 ──
const characterCache = new Map(); // 캐릭터 캐시 (생년월일 기반)
const imageCache     = new Map(); // 이미지 캐시 (캐릭터 기반)
const MAX_CACHE_SIZE = 200;

function makeCacheKey({ birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, calType, isLeap }) {
  return `${birthYear}|${birthMonth}|${birthDay}|${birthHour ?? ''}|${birthMinute ?? ''}|${gender ?? ''}|${calType}|${isLeap}`;
}

function setCache(map, key, value) {
  if (map.size >= MAX_CACHE_SIZE) {
    map.delete(map.keys().next().value); // 가장 오래된 항목 제거
  }
  map.set(key, value);
}

// ── 서버사이드 날짜 검증 ──
function validateDate(year, month, day) {
  const y = parseInt(year), m = parseInt(month), d = parseInt(day);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return '날짜를 올바르게 입력해주세요.';
  if (y < 1900 || y > 2025)             return '출생 연도는 1900~2025년 사이여야 합니다.';
  if (m < 1 || m > 12)                  return '월은 1~12 사이여야 합니다.';
  if (d < 1 || d > 31)                  return '일은 1~31 사이여야 합니다.';

  // 실제 존재하는 날짜인지 확인
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) {
    return `${m}월 ${d}일은 존재하지 않는 날짜입니다.`;
  }
  return null;
}

// ── Route 1: 캐릭터 생성 (빠름, ~3~5초) ──
router.post('/generate', async (req, res) => {
  const { birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, calType, isLeap } = req.body;

  // 기본 입력 확인
  if (!birthYear || !birthMonth || !birthDay) {
    return res.status(400).json({ error: '생년월일을 입력해주세요.' });
  }

  // 날짜 유효성 검증
  const dateError = validateDate(birthYear, birthMonth, birthDay);
  if (dateError) return res.status(400).json({ error: dateError });

  // 캐시 확인
  const cacheKey = makeCacheKey(req.body);
  if (characterCache.has(cacheKey)) {
    console.log(`[캐시 히트] ${cacheKey}`);
    return res.json(characterCache.get(cacheKey));
  }

  try {
    const { character, saju } = await generateCharacter({
      birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, calType, isLeap,
    });
    const result = { character, greatFortune: saju.greatFortune };

    setCache(characterCache, cacheKey, result);
    console.log(`[캐시 저장] ${cacheKey} (총 ${characterCache.size}개)`);

    res.json(result);
  } catch (err) {
    console.error('캐릭터 생성 오류:', err.message);
    res.status(500).json({ error: '캐릭터 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// ── Route 2: 이미지 생성 (느림, ~20~30초) ──
router.post('/generate-image', async (req, res) => {
  const { character } = req.body;
  if (!character) {
    return res.status(400).json({ error: '캐릭터 정보가 필요합니다.' });
  }

  // 이미지 캐시 확인 (이름+직업+최고스탯으로 키 구성)
  const topStat  = Object.entries(character.stats || {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const imgKey   = `${character.name}|${character.class}|${topStat}`;
  if (imageCache.has(imgKey)) {
    console.log(`[이미지 캐시 히트] ${imgKey}`);
    return res.json({ imageUrl: imageCache.get(imgKey) });
  }

  try {
    const imageUrl = await generateImage(character);
    if (imageUrl) setCache(imageCache, imgKey, imageUrl);
    res.json({ imageUrl: imageUrl || null });
  } catch (err) {
    console.error('이미지 생성 오류:', err.message);
    res.status(500).json({ imageUrl: null });
  }
});

module.exports = router;
