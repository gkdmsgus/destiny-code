import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSajuData } from '../hooks/useSajuData'
import { useImagePolling } from '../hooks/useImagePolling'
import NavBar from '../components/NavBar'
import SajuInputForm from '../components/SajuInputForm'
import LoadingScreen from '../components/LoadingScreen'
import CharacterResultCard from '../components/CharacterResultCard'
import DeleteModal from '../components/DeleteModal'
import styles from './Home.module.css'

export default function Home() {
  const { user, logout, deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { step, setStep, sajuResult, setSajuResult, formError, setFormError, refetch } = useSajuData()

  // 이미지 완료 시 sajuResult 업데이트
  const handleImageReady = useCallback(
    (imageData) => setSajuResult((prev) => ({ ...prev, ...imageData })),
    [setSajuResult],
  )
  const { imagePolling, imageGenFailed, startPolling } = useImagePolling(handleImageReady)

  // 초기 로드 시 이미지 미완료 + imageData 없을 때만 폴링 시작
  useEffect(() => {
    if (step === 'result' && sajuResult && !sajuResult.imageReady && !sajuResult.imageData) {
      startPolling()
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleDeleteAccount = async () => {
    await deleteAccount()
    navigate('/login')
  }

  const handleSubmitSuccess = (data) => {
    setSajuResult(data)
    setStep('result')
    if (!data.imageReady) startPolling()
  }

  const handleSubmitError = (message) => {
    setFormError(message)
    setStep('input')
  }

  return (
    <div className={styles.container}>
      <NavBar
        user={user}
        onLogout={handleLogout}
        onLogoClick={() => setStep('input')}
      />

      <main className={styles.main}>
        {step === 'checking' && (
          <div className={styles.checkingContainer}>
            <div className={styles.spinner} />
            <p>운명의 기록을 조회하고 있습니다...</p>
          </div>
        )}

        {step === 'input' && (
          <SajuInputForm
            apiError={formError}
            onLoadingStart={() => { setFormError(''); setStep('loading') }}
            onSubmitSuccess={handleSubmitSuccess}
            onError={handleSubmitError}
          />
        )}

        {step === 'loading' && <LoadingScreen />}

        {step === 'result' && sajuResult && (
          <CharacterResultCard
            sajuResult={sajuResult}
            imagePolling={imagePolling}
            imageGenFailed={imageGenFailed}
            onReset={() => setStep('input')}
          />
        )}

        {step !== 'loading' && (
          <div className={styles.danger}>
            <button onClick={() => setShowDeleteConfirm(true)} className={styles.btnDanger}>
              회원 탈퇴
            </button>
          </div>
        )}
      </main>

      {showDeleteConfirm && (
        <DeleteModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
