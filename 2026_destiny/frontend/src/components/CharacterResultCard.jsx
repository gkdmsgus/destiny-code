import { useRef, useState, useCallback, useEffect } from 'react'
import html2canvas from 'html2canvas'
import styles from '../pages/Home.module.css'
import DownloadCard from './DownloadCard'
import {
  getCharacterImage,
  getSkillImage,
  getSkillName,
  getCalendarLabel,
  getStats,
} from '../utils/characterUtils'
import api from '../api/axios'


export default function CharacterResultCard({ sajuResult, imagePolling, imageGenFailed, onReset }) {
  const downloadCardRef = useRef(null)
  const cachedBlobRef = useRef(null)
  const [cardReady, setCardReady] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [fortune, setFortune] = useState(null)
  const [fortuneLoading, setFortuneLoading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const { characterSummary } = sajuResult
  const element = characterSummary.element ?? ''

  let detail = null
  try {
    if (characterSummary?.characterDetail) detail = JSON.parse(characterSummary.characterDetail)
  } catch { /* ignore */ }
  const stats = detail?.stats?.length > 0 ? detail.stats : getStats(element)

  // ── 캔버스 캡처 공통 함수 ──────────────────────────────────────────────────
  const captureCard = useCallback(async () => {
    const el = downloadCardRef.current
    if (!el) throw new Error('카드 요소 없음')

    // 이미지 완전 로드 대기
    const imgs = el.querySelectorAll('img')
    await Promise.all(Array.from(imgs).map(
      (img) => new Promise((resolve) => {
        if (img.complete && img.naturalWidth > 0) resolve()
        else { img.onload = resolve; img.onerror = resolve }
      })
    ))
    // 렌더링 안정화 대기
    await new Promise((r) => setTimeout(r, 150))

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const scale = isMobile ? 1.5 : 2

    return html2canvas(el, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#12100e',
      scrollX: 0,
      scrollY: 0,
      width: 750,
      height: 980,
      logging: false,
    })
  }, [])

  // ── 카드 이미지 blob 생성 ─────────────────────────────────────────────────
  const getCardBlob = useCallback(async () => {
    if (cachedBlobRef.current) return cachedBlobRef.current
    const canvas = await captureCard()
    return new Promise((resolve) => canvas.toBlob((blob) => {
      cachedBlobRef.current = blob
      resolve(blob)
    }, 'image/png'))
  }, [captureCard])

  // 결과 로드 후 카드 이미지 미리 생성 (공유 즉시 응답을 위해)
  useEffect(() => {
    if (imagePolling) return
    cachedBlobRef.current = null
    setCardReady(false)
    const timer = setTimeout(async () => {
      try {
        const canvas = await captureCard()
        await new Promise((resolve) => canvas.toBlob((blob) => {
          cachedBlobRef.current = blob
          resolve()
        }, 'image/png'))
        setCardReady(true)
      } catch { /* 무시 */ }
    }, 1500)
    return () => clearTimeout(timer)
  }, [sajuResult.imageData, sajuResult.imageReady, imagePolling]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 이미지 저장 ────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await getCardBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `${sajuResult.name}_신카드.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
      showToast('💾 이미지가 저장됐어요!')
    } catch (e) {
      console.error('다운로드 오류:', e)
      showToast('저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  // ── 클립보드 복사 (HTTP에서 clipboard API 실패 시 execCommand fallback) ──
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch { /* HTTPS 아닐 때 실패 → execCommand로 대체 */ }
    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }

  // ── 공유하기 ───────────────────────────────────────────────────────────────
  // 모바일: navigator.share → 네이티브 앱 선택 시트 (카카오·인스타·문자 등)
  // 데스크탑: 링크 복사 + 이미지 자동 저장
  const handleShare = async () => {
    setSharing(true)
    try {
      const blob = await getCardBlob()

      if (navigator.share) {
        const file = new File([blob], `${sajuResult.name}_신카드.png`, { type: 'image/png' })
        const withFiles = { title: `${sajuResult.name}의 신(神) 캐릭터`, text: `${characterSummary.className} · ${characterSummary.title}`, files: [file] }
        if (navigator.canShare?.(withFiles)) {
          await navigator.share(withFiles)
        } else {
          await navigator.share({ title: withFiles.title, text: withFiles.text, url: window.location.href })
        }
        return
      }

      // HTTP 환경 또는 데스크탑: 이미지 저장 + 링크 복사
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `${sajuResult.name}_신카드.png`
      link.href = blobUrl
      link.click()
      URL.revokeObjectURL(blobUrl)
      try { await copyToClipboard(window.location.href) } catch { /* 무시 */ }
      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      showToast(isMobileDevice
        ? '💾 이미지 저장됐어요! 갤러리에서 카카오톡·인스타로 공유하세요'
        : '💾 이미지 저장 + 🔗 링크 복사 완료!'
      )

    } catch (e) {
      if (e.name !== 'AbortError') showToast('공유 중 오류가 발생했습니다.', 'error')
    } finally {
      setSharing(false)
    }
  }

  // ── 오늘의 운세 ────────────────────────────────────────────────────────────
  const handleFortune = async () => {
    setFortuneLoading(true)
    try {
      const res = await api.get('/saju/me/fortune')
      setFortune(res.data)
    } catch (e) {
      console.error('운세 오류:', e)
      showToast('신탁을 불러오지 못했습니다. 다시 시도해주세요.', 'error')
    } finally {
      setFortuneLoading(false)
    }
  }

  const luckStars = fortune ? '★'.repeat(fortune.luck) + '☆'.repeat(5 - fortune.luck) : ''

  return (
    <div className={styles.resultContainer}>
      {/* 헤더 */}
      <div className={styles.resultHeader}>
        <span className={styles.badge}>{element} 속성</span>
        <h2 className={styles.characterTitle}>{characterSummary.title}</h2>
        <h1 className={styles.characterName}>
          {characterSummary.className} &ldquo;{sajuResult.name}&rdquo;
        </h1>
      </div>

      <div className={styles.cardBody}>
        {/* AI 캐릭터 이미지 */}
        <div className={styles.characterVisualCard}>
          <div className={styles.pixelFrame}>
            {sajuResult.imageData ? (
              <img src={sajuResult.imageData} alt="AI 캐릭터" className={styles.characterImage} />
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={getCharacterImage(sajuResult)}
                  alt="AI 캐릭터"
                  className={styles.characterImage}
                  style={{ opacity: imagePolling ? 0.45 : 1 }}
                />
                {imagePolling && !imageGenFailed && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    background: 'rgba(0,0,0,0.35)',
                  }}>
                    <div style={{
                      width: 28, height: 28,
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    🎨 AI 이미지 생성 중...
                  </div>
                )}
                {imageGenFailed && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.5)', fontSize: 12,
                    background: 'rgba(0,0,0,0.4)',
                  }}>
                    🖼️ 이미지 생성 실패 (사주 재입력 시 재시도)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 오늘의 운세 */}
        <div className={styles.fortuneContainer}>
          <h3 className={styles.sectionTitle}>🔮 오늘의 신탁 (Daily Oracle)</h3>
          {!fortune && !fortuneLoading && (
            <button className={styles.fortuneBtn} onClick={handleFortune}>
              ✨ 오늘의 운세 받기
            </button>
          )}
          {fortuneLoading && (
            <div className={styles.fortuneLoading}>
              <div className={styles.fortuneSpinner} />
              신탁을 읽는 중...
            </div>
          )}
          {fortune && (
            <div className={styles.fortuneCard}>
              <div className={styles.fortuneKeyword}>
                <span className={styles.fortuneKeywordBadge}>{fortune.keyword}</span>
                <span className={styles.fortuneLuck}>{luckStars}</span>
              </div>
              <p className={styles.fortuneText}>{fortune.fortune}</p>
              <div className={styles.fortuneDate}>{fortune.date}</div>
              <button className={styles.fortuneRefresh} onClick={handleFortune}>↺ 다시 보기</button>
            </div>
          )}
        </div>

        {/* 명리 대운 데이터 시트 */}
        <div className={styles.sajuSheet}>
          <h3 className={styles.sectionTitle}>📜 명리(命理) 대운 데이터</h3>
          <div className={styles.sheetGrid}>
            {[
              { label: '성명',         value: `${sajuResult.name} (${sajuResult.gender === 'MALE' ? '남' : '여'})` },
              { label: '달력',         value: getCalendarLabel(sajuResult.calendarType) },
              { label: '생년월일',     value: `${sajuResult.birthYear}년 ${sajuResult.birthMonth}월 ${sajuResult.birthDay}일` },
              { label: '태어난 시',    value: sajuResult.birthTime ?? '시간 장막(모름)' },
              { label: '기운 서린 곳', value: sajuResult.birthPlace },
            ].map(({ label, value }) => (
              <div key={label} className={styles.sheetItem}>
                <span className={styles.sheetLabel}>{label}</span>
                <span className={styles.sheetValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 운명 스토리 */}
        <div className={styles.characterStory}>
          <h3 className={styles.sectionTitle}>🛡️ 모험가 운명서 (Destiny Story)</h3>
          <p className={styles.storyText}>{characterSummary.description}</p>
        </div>

        {/* 능력치 */}
        <div className={styles.statsContainer}>
          <h3 className={styles.sectionTitle}>⚡ 영혼의 기본 능력치 (Destiny Stats)</h3>
          <div className={styles.statList}>
            {stats.map(({ label, color, value }) => (
              <div key={label} className={styles.statItem}>
                <div className={styles.statInfo}>
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className={styles.statBarContainer}>
                  <div
                    className={styles.statBarFill}
                    style={{ width: `${value}%`, ...(color && { backgroundColor: color }) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 비술 스킬 */}
        <div className={styles.skillContainer}>
          <h3 className={styles.sectionTitle}>🔮 신내림 전용 비술 (Shamanic Skills)</h3>
          <div className={styles.skillList}>
            <div className={styles.skillSlot}>
              <div className={styles.skillIconFrame}>
                <img src={getSkillImage(element)} alt="주력 비술" className={styles.skillIcon} />
              </div>
              <span className={styles.skillName}>{getSkillName(element)}</span>
              <span className={styles.skillType}>액티브 비술</span>
            </div>
            {['잠겨진 기운', '미확인 비술'].map((name) => (
              <div key={name} className={`${styles.skillSlot} ${styles.locked}`}>
                <div className={styles.skillIconFrame}>
                  <div className={styles.lockOverlay}>🔒</div>
                </div>
                <span className={styles.skillName}>{name}</span>
                <span className={styles.skillType}>봉인됨</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className={styles.actionButtons}>
        <button onClick={handleDownload} disabled={downloading || imagePolling} className={styles.btnPrimary}>
          {downloading ? '⏳ 저장 중...' : '💾 이미지 저장'}
        </button>
        <button onClick={handleShare} disabled={sharing || imagePolling} className={styles.btnShare}>
          {sharing ? '⏳ 공유 중...' : !cardReady && !imagePolling ? '⏳ 준비 중...' : '🔗 공유하기'}
        </button>
        <button onClick={onReset} className={styles.btnOutline}>
          🔄 다시 입력
        </button>
      </div>

      {/* 토스트 알림 */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          {toast.msg}
        </div>
      )}

      {/* 다운로드용 숨겨진 카드 */}
      <div style={{
        position: 'fixed', left: '-9999px', top: '0px',
        width: '750px', zIndex: -999, pointerEvents: 'none',
      }}>
        <DownloadCard ref={downloadCardRef} sajuResult={sajuResult} />
      </div>
    </div>
  )
}
