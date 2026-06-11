import { forwardRef } from 'react'
import styles from './DownloadCard.module.css'
import { getStats } from '../utils/characterUtils'

const ELEMENT_THEME = {
  '화': { accent: '#c0392b', accentRgb: '192,57,43',  soft: '#2a0a08' },
  '수': { accent: '#1a6fa8', accentRgb: '26,111,168',  soft: '#071a2a' },
  '목': { accent: '#1e8449', accentRgb: '30,132,73',   soft: '#071a0e' },
  '금': { accent: '#a0a8b0', accentRgb: '160,168,176', soft: '#141618' },
  '토': { accent: '#c9a84c', accentRgb: '201,168,76',  soft: '#1e1608' },
}

function resolveTheme(element) {
  for (const [key, theme] of Object.entries(ELEMENT_THEME)) {
    if (element?.includes(key)) return theme
  }
  return ELEMENT_THEME['토']
}

const DownloadCard = forwardRef(function DownloadCard({ sajuResult }, ref) {
  const { characterSummary, imageData, name, gender, birthYear, birthMonth, birthDay } = sajuResult

  let detail = null
  try {
    if (characterSummary?.characterDetail) detail = JSON.parse(characterSummary.characterDetail)
  } catch { /* legacy */ }

  const element = characterSummary?.element ?? ''
  const theme = resolveTheme(element)
  const genderKr = gender === 'MALE' ? '남' : '여'
  const stats = detail?.stats?.length > 0 ? detail.stats : getStats(element)

  return (
    <div
      ref={ref}
      className={styles.card}
      style={{
        '--accent': theme.accent,
        '--accent-rgb': theme.accentRgb,
        '--soft': theme.soft,
      }}
    >
      {/* ──────────── 왼쪽 텍스트 컬럼 ──────────── */}
      <div className={styles.leftCol}>

        {/* 헤더 */}
        <div className={styles.topHeader}>
          <div className={styles.topEyebrow}>Destiny Code · 사주 RPG</div>
          <div className={styles.topTitle}>내가 신이라면?</div>
          <div className={styles.topSub}>기억하고, 선택하고, 때로는 잊어라</div>
        </div>

        <div className={styles.dividerOrnament}>
          <span className={styles.dividerOrnamentText}>✦ ─ ✦ ─ ✦</span>
        </div>

        {/* 캐릭터 기본 정보 */}
        <div className={styles.charBlock}>
          <div className={styles.charElement}>{element}</div>
          <div className={styles.charName}>{name}</div>
          <div className={styles.charClassName}>{characterSummary?.className}</div>
          <div className={styles.charTitle}>{characterSummary?.title}</div>
        </div>

        <div className={styles.thinDivider} />

        {/* 성격 */}
        {detail?.personality?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>성격</div>
            <div className={styles.personalityTags}>
              {detail.personality.map((p, i) => (
                <span key={i} className={styles.personalityTag}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* 신분 */}
        {detail?.divineStatus && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>신분</div>
            <p className={styles.sectionText}>{detail.divineStatus}</p>
          </div>
        )}

        {/* 능력 */}
        {detail?.abilities?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>능력</div>
            {detail.abilities.map((a, i) => (
              <div key={i} className={styles.abilityItem}>
                <div className={styles.abilityDot} />
                <div className={styles.abilityContent}>
                  <span className={styles.abilityName}>{a.name}</span>
                  <span className={styles.abilityDesc}>{a.desc}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 능력치 */}
        {stats?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>능력치</div>
            <div className={styles.statsGrid}>
              {stats.map(({ label, color, value }) => (
                <div key={label} className={styles.statRow}>
                  <span className={styles.statLabel}>{label}</span>
                  <div className={styles.statBarBg}>
                    <div
                      className={styles.statBarFill}
                      style={{ width: `${value}%`, backgroundColor: color || theme.accent }}
                    />
                  </div>
                  <span className={styles.statVal}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 상징물 */}
        {detail?.symbols && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>상징물</div>
            <p className={styles.sectionText}>{detail.symbols}</p>
          </div>
        )}

        {/* 배경 이야기 */}
        {detail?.backstory && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>배경 이야기</div>
            <p className={styles.sectionText}>{detail.backstory}</p>
          </div>
        )}

        {/* legacy fallback */}
        {!detail && characterSummary?.description && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>운명 서사</div>
            <p className={styles.sectionText}>{characterSummary.description}</p>
          </div>
        )}

        <div className={styles.thinDivider} />

        {/* 명언 */}
        {detail?.quotes?.length > 0 && (
          <div className={styles.quotesArea}>
            {detail.quotes.slice(0, 2).map((q, i) => (
              <div key={i} className={styles.quoteBox}>
                <span className={styles.quoteText}>"{q}"</span>
              </div>
            ))}
          </div>
        )}

        {/* 푸터 */}
        <div className={styles.footer}>
          <div className={styles.footerDivider} />
          <div className={styles.footerMain}>신의 경계에 선 자</div>
          <div className={styles.footerSub}>
            {birthYear}.{String(birthMonth).padStart(2,'0')}.{String(birthDay).padStart(2,'0')} · {genderKr} · destinycode
          </div>
        </div>
      </div>

      {/* ──────────── 오른쪽 이미지 컬럼 ──────────── */}
      <div className={styles.rightCol}>
        {imageData ? (
          <img src={imageData} alt="신 캐릭터 일러스트" className={styles.charImg} />
        ) : (
          <div className={styles.noImg}><span>이미지 생성 중...</span></div>
        )}
        <div className={styles.elementBadge} style={{ background: theme.accent }}>
          {element}
        </div>
      </div>
    </div>
  )
})

export default DownloadCard
