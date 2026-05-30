const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 직업별 시각적 묘사 — 사람마다 다른 캐릭터 나오게
const CLASS_VISUAL = {
  '워리어': 'Korean Joseon warrior in dark lacquered armor and black gat hat, holding a curved sword, battle-scarred face, standing in rain',
  '마법사': 'Korean Joseon sorcerer in deep blue doopamagi robe with glowing golden symbols, long black hair, mystical energy swirling around hands',
  '궁수':   'Korean Joseon archer in dark leather armor, traditional gak-gung bow drawn taut, keen eyes focused, forest shadows behind',
  '힐러':   'Korean mudang shaman healer in vibrant ceremonial hanbok, holding ritual fan and bell, sacred light emanating, gentle fierce expression',
  '도적':   'Korean Joseon assassin in dark night-raid gear, traditional hahoetal mask pushed up on forehead, twin short blades, crouched in shadows',
  '소환사': 'Korean Joseon summoner in flowing dark robes, summoning a mythical creature (haetae or three-legged crow), ancient talisman glowing',
};

// 오행별 색감/분위기 — 사주에 따라 달라지게
const ELEMENT_MOOD = {
  '목': 'deep forest green and gold tones, mist and ancient trees in background',
  '화': 'crimson and ember tones, flames and embers floating, intense dramatic light',
  '토': 'warm ochre and amber tones, ancient stone walls, grounded heavy atmosphere',
  '금': 'silver and deep violet tones, moonlight, sharp metallic gleam',
  '수': 'deep teal and midnight blue tones, rain and dark water reflections, misty',
};

function getTopElement(character) {
  // 스탯에서 dominant 오행 추출
  const map = { strength: '수', intelligence: '목', agility: '금', vitality: '토', charisma: '화' };
  const top = Object.entries(character.stats || {}).sort((a, b) => b[1] - a[1])[0];
  return top ? (map[top[0]] || '수') : '수';
}

async function generateImage(character) {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const classKey  = Object.keys(CLASS_VISUAL).find(k => character.class?.includes(k)) || '워리어';
    const classDesc = CLASS_VISUAL[classKey];
    const element   = getTopElement(character);
    const mood      = ELEMENT_MOOD[element] || ELEMENT_MOOD['수'];

    // 성격 키워드 2~3단어만 추출
    const personalityKeyword = character.personality
      ? character.personality.slice(0, 40).replace(/[.,]/g, '').trim()
      : '';

    const prompt = [
      classDesc + '.',
      `Color palette: ${mood}.`,
      personalityKeyword ? `Character feels: ${personalityKeyword}.` : '',
      `Style: dark oil painting, heavy impasto brushwork, dramatic chiaroscuro lighting,`,
      `cinematic composition, Korean historical fantasy game concept art,`,
      `professional quality, rich detailed textures, upper body portrait.`,
      `CRITICAL: No text, no letters, no words, no numbers, no inscriptions,`,
      `no runes, no symbols, no writing of any kind anywhere in the image.`,
      `All clothing, armor, and backgrounds must be completely free of any text or writing.`,
    ].filter(Boolean).join(' ');

    const response = await openai.images.generate({
      model:         'gpt-image-1',
      prompt,
      n:             1,
      size:          '1024x1024',
      output_format: 'jpeg',
    });

    const b64 = response.data[0].b64_json;
    return `data:image/jpeg;base64,${b64}`;
  } catch (err) {
    console.error('이미지 생성 오류:', err.message);
    return null;
  }
}

module.exports = { generateImage };
