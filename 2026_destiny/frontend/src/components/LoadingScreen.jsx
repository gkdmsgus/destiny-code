import { useState, useEffect } from 'react'
import styles from '../pages/Home.module.css'

const LOADING_TEXTS = [
  '🌠 천체의 궤도와 별자리의 배열을 추적하는 중...',
  '☯️ 생년월일의 오행(목, 화, 토, 금, 수) 균형을 연산하는 중...',
  '📜 명리학의 만세력 데이터를 분석하여 운명의 실타래를 짜는 중...',
  '🛡️ 당신의 운명에 조화로운 영웅의 클래스를 각성하는 중...',
  '⚔️ 모험을 위한 운명의 캐릭터 시트를 완성하고 있습니다!',
]

export default function LoadingScreen() {
  const [textIndex, setTextIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(
      () => setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length),
      2500,
    )
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.magicPortal}>
        <div className={styles.magicOrb} />
        <div className={styles.magicRing} />
        <div className={styles.magicRing2} />
      </div>
      <div className={styles.loadingTextContainer}>
        <p className={styles.loadingMessage}>{LOADING_TEXTS[textIndex]}</p>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(textIndex + 1) * 20}%` }}
          />
        </div>
      </div>
    </div>
  )
}
