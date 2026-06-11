import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Auth.module.css'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', nickname: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(form.email, form.password, form.nickname)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>⚔️ DestinyCode</h1>
        <p className={styles.subtitle}>모험을 시작하세요</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input type="text" name="nickname" placeholder="닉네임"
            value={form.nickname} onChange={handleChange} className={styles.input} required />
          <input type="email" name="email" placeholder="이메일"
            value={form.email} onChange={handleChange} className={styles.input} required />
          <input type="password" name="password" placeholder="비밀번호 (6자 이상)"
            value={form.password} onChange={handleChange} className={styles.input} minLength={6} required />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>
        <p className={styles.link}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  )
}
