import { useState } from 'react'
import api from '../api/axios'
import styles from '../pages/Home.module.css'

const YEARS   = Array.from({ length: 131 }, (_, i) => 2030 - i)
const MONTHS  = Array.from({ length: 12 },  (_, i) => i + 1)
const DAYS    = Array.from({ length: 31 },  (_, i) => i + 1)
const HOURS   = Array.from({ length: 24 },  (_, i) => i)
const MINUTES = Array.from({ length: 60 },  (_, i) => i)
const CITIES  = [
  '서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종',
  '전북', '전남', '광주', '경북', '경남', '대구', '울산', '부산', '제주', '해외',
]

const INITIAL_FORM = {
  name: '', gender: 'MALE', calendarType: 'SOLAR',
  birthYear: '1995', birthMonth: '5', birthDay: '5',
  birthHour: '12', birthMinute: '00',
  noTime: false, birthPlace: '서울',
}

/**
 * @param {Function} onLoadingStart  - API 호출 직전 호출 (step → 'loading')
 * @param {Function} onSubmitSuccess - 성공 시 data 전달
 * @param {Function} onError        - 실패 시 에러 메시지 전달 (step → 'input')
 * @param {string}   apiError       - 외부에서 주입되는 에러 메시지
 */
export default function SajuInputForm({ onLoadingStart, onSubmitSuccess, onError, apiError }) {
  const [form, setForm] = useState(INITIAL_FORM)

  const handleChange = ({ target: { name, value, type, checked } }) =>
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    const birthTime = form.noTime
      ? null
      : `${String(form.birthHour).padStart(2, '0')}:${String(form.birthMinute).padStart(2, '0')}`

    const payload = {
      name:        form.name,
      gender:      form.gender,
      calendarType: form.calendarType,
      birthYear:   parseInt(form.birthYear),
      birthMonth:  parseInt(form.birthMonth),
      birthDay:    parseInt(form.birthDay),
      birthTime,
      birthPlace:  form.birthPlace,
    }

    onLoadingStart()         // step → 'loading', 폼 언마운트됨
    const startTime = Date.now()

    try {
      const { data } = await api.post('/saju', payload)
      const remaining = Math.max(0, 5000 - (Date.now() - startTime))
      setTimeout(() => onSubmitSuccess(data), remaining)
    } catch (err) {
      onError?.(err.message || '사주 분석 요청 중 오류가 발생했습니다.')
    }
  }

  const GENDER_TABS = [
    { value: 'MALE',   label: '남성 ♂️' },
    { value: 'FEMALE', label: '여성 ♀️' },
  ]
  const CALENDAR_TABS = [
    { value: 'SOLAR',       label: '양력 (Solar)' },
    { value: 'LUNAR_PLAIN', label: '음력 평달' },
    { value: 'LUNAR_LEAP',  label: '음력 윤달' },
  ]

  return (
    <div className={styles.inputCard}>
      <h2 className={styles.heading}>✨ 나의 운명 캐릭터 생성</h2>
      <p className={styles.desc}>
        당신의 사주 정보를 만세력 기준으로 입력하세요. <br />
        음양오행의 조화를 분석하여 고유의 RPG 캐릭터를 강림시킵니다.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* 이름 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>이름 (Name)</label>
          <input
            type="text" name="name" value={form.name} onChange={handleChange}
            placeholder="모험가의 이름을 알려주세요"
            className={styles.input} required
          />
        </div>

        {/* 성별 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>성별 (Gender)</label>
          <div className={styles.tabContainer}>
            {GENDER_TABS.map(({ value, label }) => (
              <label key={value}
                className={`${styles.tabItem} ${form.gender === value ? styles.tabActive : ''}`}>
                <input type="radio" name="gender" value={value}
                  checked={form.gender === value} onChange={handleChange}
                  className={styles.radioHidden} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* 달력 기준 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>달력 기준 (Calendar Type)</label>
          <div className={styles.tabContainer}>
            {CALENDAR_TABS.map(({ value, label }) => (
              <label key={value}
                className={`${styles.tabItem} ${form.calendarType === value ? styles.tabActive : ''}`}>
                <input type="radio" name="calendarType" value={value}
                  checked={form.calendarType === value} onChange={handleChange}
                  className={styles.radioHidden} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* 생년월일 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>생년월일 (Birth Date)</label>
          <div className={styles.inputGrid}>
            <select name="birthYear"  value={form.birthYear}  onChange={handleChange} className={styles.select}>
              {YEARS.map((y)  => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select name="birthMonth" value={form.birthMonth} onChange={handleChange} className={styles.select}>
              {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
            <select name="birthDay"   value={form.birthDay}   onChange={handleChange} className={styles.select}>
              {DAYS.map((d)   => <option key={d} value={d}>{d}일</option>)}
            </select>
          </div>
        </div>

        {/* 태어난 시간 */}
        <div className={styles.formGroup}>
          <div className={styles.labelWithAction}>
            <label className={styles.label}>태어난 시간 (Birth Time)</label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="noTime"
                checked={form.noTime} onChange={handleChange} className={styles.checkbox} />
              시간 모름 ❓
            </label>
          </div>
          {!form.noTime && (
            <div className={styles.inputGrid2}>
              <select name="birthHour"   value={form.birthHour}   onChange={handleChange} className={styles.select}>
                {HOURS.map((h)   => <option key={h} value={h}>{String(h).padStart(2, '0')}시</option>)}
              </select>
              <select name="birthMinute" value={form.birthMinute} onChange={handleChange} className={styles.select}>
                {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>)}
              </select>
            </div>
          )}
        </div>

        {/* 태어난 장소 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>태어난 장소 (Birth Place)</label>
          <select name="birthPlace" value={form.birthPlace} onChange={handleChange} className={styles.selectFull}>
            {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        {apiError && <p className={styles.errorText}>⚠️ {apiError}</p>}

        <button type="submit" className={styles.btnSubmit}>
          🔮 운명의 캐릭터 강림시키기
        </button>
      </form>
    </div>
  )
}
