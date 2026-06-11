/** 픽셀 캐릭터 이미지 경로 반환 (AI 이미지 있으면 우선 사용) */
export const getCharacterImage = (sajuResult) => {
  if (sajuResult?.imageData) return sajuResult.imageData
  const element = sajuResult?.characterSummary?.element ?? ''
  if (element.includes('Fire')  || element.includes('화')) return '/pixel_fire_mage.png'
  return '/pixel_gold_knight.png'
}

/** 스킬 아이콘 이미지 경로 반환 */
export const getSkillImage = (element = '') => {
  if (element.includes('Fire')  || element.includes('화')) return '/pixel_skill_fire.png'
  return '/pixel_skill_blue.png' // 水·木·金·土 모두 파란 스킬
}

/** 원소별 주력 스킬명 */
const SKILL_NAMES = {
  Fire:  '지옥 화무(火舞)',
  화:    '지옥 화무(火舞)',
  Metal: '명부 철검술(鐵劍術)',
  금:    '명부 철검술(鐵劍術)',
  Water: '청룡강림(靑龍降臨)',
  수:    '청룡강림(靑龍降臨)',
  Wood:  '청운피리술(靑雲笛術)',
  목:    '청운피리술(靑雲笛術)',
}

export const getSkillName = (element = '') => {
  for (const [key, name] of Object.entries(SKILL_NAMES)) {
    if (element.includes(key)) return name
  }
  return '대지결계(大地結界)' // 土
}

/** 달력 타입 한글 변환 */
export const getCalendarLabel = (calendarType) => {
  if (calendarType === 'SOLAR')       return '양력'
  if (calendarType === 'LUNAR_PLAIN') return '음력 평달'
  return '음력 윤달'
}

/** 오행 기반 스탯 배열 반환 */
// 원소 판별 헬퍼
const is = (el, ...keys) => keys.some((k) => el.includes(k))

const STAT_CONFIGS = [
  {
    label: '체력 (Earth)',
    color: '#a3e635',
    // 土 최강, 金 강, 木 보통, 水/火 약
    getValue: (el) =>
      is(el, 'Earth', '토') ? 95 :
      is(el, 'Metal', '금') ? 80 :
      is(el, 'Wood',  '목') ? 70 : 60,
  },
  {
    label: '공격력 (Fire)',
    color: '#ff4d4d',
    // 火 최강, 木 강, 土 보통, 金/水 약
    getValue: (el) =>
      is(el, 'Fire',  '화') ? 95 :
      is(el, 'Wood',  '목') ? 78 :
      is(el, 'Earth', '토') ? 70 : 62,
  },
  {
    label: '마력 (Water)',
    color: '#00d2fc',
    // 水 최강, 火 강 (반발력), 金 보통, 木/土 약
    getValue: (el) =>
      is(el, 'Water', '수') ? 98 :
      is(el, 'Fire',  '화') ? 82 :
      is(el, 'Metal', '금') ? 72 : 65,
  },
]

export const getStats = (element = '') =>
  STAT_CONFIGS.map(({ label, color, getValue }) => ({
    label,
    color,
    value: getValue(element),
  }))
