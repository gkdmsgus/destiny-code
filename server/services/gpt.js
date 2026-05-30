const OpenAI = require('openai');
const { calculateSaju, calculateStatsByElement, STEM_ELEMENT, BRANCH_ELEMENT } = require('./saju');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateCharacter(params) {
  const saju = calculateSaju(params);
  const { birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, calType } = params;
  const calLabel = calType === 'lunar' ? '음력' : '양력';

  const total = Object.values(saju.elementCount).reduce((a, b) => a + b, 0);
  const elementLines = Object.entries(saju.elementCount)
    .map(([el, cnt]) => `  ${el}(${cnt}개, ${Math.round(cnt / total * 100)}%)`)
    .join('\n');

  const trueSolarLine = saju.trueSolarInfo
    ? `진태양시: ${saju.trueSolarInfo.hour}시 ${saju.trueSolarInfo.minute}분 (보정: ${saju.trueSolarInfo.correctionMin}분)`
    : '시주 미입력';

  const prompt = `당신은 사주(四柱) 전문가이자 RPG 게임 디자이너입니다.
아래 사주 원국을 바탕으로 RPG 캐릭터의 스토리 요소를 생성해주세요.
(스탯 수치는 별도 계산되므로 JSON에 포함하지 마세요.)

[입력 정보]
생년월일: ${birthYear}년 ${birthMonth}월 ${birthDay}일 (${calLabel})${birthHour ? ' ' + birthHour + '시' + (birthMinute ? birthMinute + '분' : '') : ''}
양력 환산: ${saju.solarDate.year}년 ${saju.solarDate.month}월 ${saju.solarDate.day}일
성별: ${gender || '미입력'}
${trueSolarLine}

[사주 8자]
${saju.summary}
  - 년주(年柱): ${saju.yearPillar.stem}${saju.yearPillar.branch} (${STEM_ELEMENT[saju.yearPillar.stemIdx]}/${BRANCH_ELEMENT[saju.yearPillar.branchIdx]})
  - 월주(月柱): ${saju.monthPillar.stem}${saju.monthPillar.branch} (${STEM_ELEMENT[saju.monthPillar.stemIdx]}/${BRANCH_ELEMENT[saju.monthPillar.branchIdx]})
  - 일주(日柱): ${saju.dayPillar.stem}${saju.dayPillar.branch} (${STEM_ELEMENT[saju.dayPillar.stemIdx]}/${BRANCH_ELEMENT[saju.dayPillar.branchIdx]}) ← 본인
  ${saju.hourPillar ? `- 시주(時柱): ${saju.hourPillar.stem}${saju.hourPillar.branch} (${STEM_ELEMENT[saju.hourPillar.stemIdx]}/${BRANCH_ELEMENT[saju.hourPillar.branchIdx]})` : '- 시주(時柱): 미입력'}

[오행 분포]
${elementLines}

[직업 선택 가이드 - 오행 우세에 따라]
  목(木) 우세 → 마법사
  화(火) 우세 → 힐러
  토(土) 우세 → 워리어
  금(金) 우세 → 궁수 또는 도적
  수(水) 우세 → 소환사
  동점/복합이면 일주 천간 특성으로 판단

아래 JSON만 출력하세요. JSON 외 텍스트 금지:
{
  "name": "캐릭터명 (일주 ${saju.dayPillar.stem}${saju.dayPillar.branch}를 핵심으로, 직업 특색 반영. 예: '${saju.dayPillar.stem}${saju.dayPillar.branch}의 마법사')",
  "class": "직업 (워리어/마법사/궁수/힐러/도적/소환사 중 하나)",
  "skills": [
    { "name": "스킬명 (천간·지지 특성 반영)", "description": "스킬 설명 1~2문장" },
    { "name": "스킬명", "description": "스킬 설명 1~2문장" },
    { "name": "스킬명", "description": "스킬 설명 1~2문장" }
  ],
  "personality": "성격 설명 2~3문장 (일주 ${saju.dayPillar.stem}${saju.dayPillar.branch} 특성 기반)",
  "destiny": "운명 한 줄 요약"
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: '당신은 사주(四柱) 전문가이자 RPG 게임 디자이너입니다. 반드시 JSON만 출력하세요.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });

  const text = response.choices[0].message.content.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('캐릭터 데이터 파싱 실패');

  const character = JSON.parse(jsonMatch[0]);

  // 스탯은 오행 비율 수식으로 직접 계산 (GPT 대신 백엔드가 담당)
  character.stats = calculateStatsByElement(saju.elementCount, character.class);

  return { character, saju };
}

module.exports = { generateCharacter };
