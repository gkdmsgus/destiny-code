const express = require('express');
const router  = express.Router();
const { generateCompatibility } = require('../services/compatibility');

const compatCache = new Map();

router.post('/check', async (req, res) => {
  const { person1, person2 } = req.body;

  if (!person1?.birthYear || !person1?.birthMonth || !person1?.birthDay ||
      !person2?.birthYear || !person2?.birthMonth || !person2?.birthDay) {
    return res.status(400).json({ error: '두 사람의 생년월일을 모두 입력해주세요.' });
  }

  // 캐시 키 (순서 무관 — 두 사람을 정렬해서 키 생성)
  const keys = [
    `${person1.birthYear}/${person1.birthMonth}/${person1.birthDay}`,
    `${person2.birthYear}/${person2.birthMonth}/${person2.birthDay}`,
  ].sort();
  const cacheKey = keys.join('||');

  if (compatCache.has(cacheKey)) {
    console.log(`[궁합 캐시 히트] ${cacheKey}`);
    return res.json(compatCache.get(cacheKey));
  }

  try {
    const result = await generateCompatibility(person1, person2);

    if (compatCache.size >= 100) compatCache.delete(compatCache.keys().next().value);
    compatCache.set(cacheKey, result);
    console.log(`[궁합 캐시 저장] ${cacheKey}`);

    res.json(result);
  } catch (err) {
    console.error('궁합 생성 오류:', err.message);
    res.status(500).json({ error: '궁합 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

module.exports = router;
