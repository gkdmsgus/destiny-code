const OpenAI = require('openai');
const { calculateSaju, calculateStatsByElement } = require('./saju');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 오행 상생/상극 관계 ──
const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // A가 B를 生
const KE    = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }; // A가 B를 克

const ELEMENT_KR = { 목: '목(木)', 화: '화(火)', 토: '토(土)', 금: '금(金)', 수: '수(水)' };

function getDominantElement(elementCount) {
  return Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0][0];
}

function calcScore(saju1, saju2) {
  const el1 = getDominantElement(saju1.elementCount);
  const el2 = getDominantElement(saju2.elementCount);

  // 기본 점수: 오행 관계
  let score;
  if (el1 === el2)                            score = 75; // 비화(比和)
  else if (SHENG[el1] === el2 || SHENG[el2] === el1) score = 88; // 상생
  else if (KE[el1]    === el2 || KE[el2]    === el1) score = 42; // 상극
  else                                        score = 62; // 중립

  // 음양 조화 보정: 일주 천간이 다른 음양이면 +8
  const isYang1 = saju1.dayPillar.stemIdx % 2 === 0;
  const isYang2 = saju2.dayPillar.stemIdx % 2 === 0;
  if (isYang1 !== isYang2) score += 8;

  // 오행 보완 보정: 상대방이 내게 없는 오행 채워주면 +2씩 (최대 +10)
  const elements = ['목', '화', '토', '금', '수'];
  let bonus = 0;
  elements.forEach(el => {
    if (saju1.elementCount[el] === 0 && saju2.elementCount[el] > 0) bonus += 2;
    if (saju2.elementCount[el] === 0 && saju1.elementCount[el] > 0) bonus += 2;
  });
  score += Math.min(bonus, 10);

  return Math.min(99, Math.max(30, Math.round(score)));
}

function getScoreLabel(score) {
  if (score >= 90) return { grade: 'S', label: '운명의 파트너', stars: '⭐⭐⭐⭐⭐' };
  if (score >= 80) return { grade: 'A', label: '강력한 시너지', stars: '⭐⭐⭐⭐' };
  if (score >= 70) return { grade: 'B', label: '좋은 파트너',   stars: '⭐⭐⭐' };
  if (score >= 55) return { grade: 'C', label: '균형 잡힌 관계', stars: '⭐⭐' };
  return              { grade: 'D', label: '도전적인 관계',   stars: '⭐' };
}

async function generateCompatibility(params1, params2) {
  const saju1 = calculateSaju({ ...params1, calType: params1.calType || 'solar' });
  const saju2 = calculateSaju({ ...params2, calType: params2.calType || 'solar' });

  const el1   = getDominantElement(saju1.elementCount);
  const el2   = getDominantElement(saju2.elementCount);
  const score = calcScore(saju1, saju2);
  const label = getScoreLabel(score);

  const prompt = `두 사주를 분석해 RPG 스타일 궁합을 JSON으로 생성해주세요.

[영웅 1]
일주: ${saju1.dayPillar.stem}${saju1.dayPillar.branch} / 우세 오행: ${el1}
오행 분포: 목${saju1.elementCount.목} 화${saju1.elementCount.화} 토${saju1.elementCount.토} 금${saju1.elementCount.금} 수${saju1.elementCount.수}

[영웅 2]
일주: ${saju2.dayPillar.stem}${saju2.dayPillar.branch} / 우세 오행: ${el2}
오행 분포: 목${saju2.elementCount.목} 화${saju2.elementCount.화} 토${saju2.elementCount.토} 금${saju2.elementCount.금} 수${saju2.elementCount.수}

궁합 등급: ${label.grade}등급 (${score}점) — ${label.label}

JSON만 출력:
{
  "title": "궁합 제목 (RPG 스타일, 20자 이내, 예: '불꽃과 바람의 이중창')",
  "description": "궁합 설명 2~3문장 (오행 관계를 RPG 세계관으로 풀어내기)",
  "synergy": "합동 스킬명: 스킬 효과 설명 (예: '천지합일: 두 기운이 합쳐져 최강의 일격을 날린다')",
  "advice": "관계 조언 한 문장 (RPG 퀘스트 힌트 형식, 긍정적으로)"
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    messages: [
      { role: 'system', content: '사주 전문가이자 RPG 게임 디자이너입니다. JSON만 출력하세요.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });

  const gptResult = JSON.parse(response.choices[0].message.content);

  return {
    score,
    ...label,
    person1: {
      dayPillar: `${saju1.dayPillar.stem}${saju1.dayPillar.branch}`,
      element: el1,
      elementKr: ELEMENT_KR[el1],
    },
    person2: {
      dayPillar: `${saju2.dayPillar.stem}${saju2.dayPillar.branch}`,
      element: el2,
      elementKr: ELEMENT_KR[el2],
    },
    ...gptResult,
  };
}

module.exports = { generateCompatibility };
