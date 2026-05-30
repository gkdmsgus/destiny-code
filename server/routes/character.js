const express = require('express');
const router  = express.Router();
const { generateCharacter } = require('../services/gpt');
const { generateImage }     = require('../services/dalle');

// ── Route 1: 캐릭터 스토리+스탯 생성 (빠름, ~3~5초) ──
router.post('/generate', async (req, res) => {
  const { birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, calType, isLeap } = req.body;
  if (!birthYear || !birthMonth || !birthDay) {
    return res.status(400).json({ error: '생년월일을 입력해주세요.' });
  }
  try {
    const { character, saju } = await generateCharacter({
      birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, calType, isLeap,
    });
    res.json({ character, greatFortune: saju.greatFortune });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '캐릭터 생성 중 오류가 발생했습니다.' });
  }
});

// ── Route 2: 이미지 생성 (느림, ~20~30초) ──
router.post('/generate-image', async (req, res) => {
  const { character } = req.body;
  if (!character) {
    return res.status(400).json({ error: '캐릭터 정보가 필요합니다.' });
  }
  try {
    const imageUrl = await generateImage(character);
    res.json({ imageUrl: imageUrl || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ imageUrl: null });
  }
});

module.exports = router;
