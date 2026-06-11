import styles from '../pages/Home.module.css'

export default function NavBar({ user, onLogout, onLogoClick }) {
  return (
    <nav className={styles.nav}>
      <span className={styles.logo} onClick={onLogoClick} style={{ cursor: 'pointer' }}>
        ⚔️ DestinyCode
      </span>
      <div className={styles.navRight}>
        <span className={styles.nickname}>{user?.nickname} 님</span>
        <button onClick={onLogout} className={styles.btnOutline}>
          로그아웃
        </button>
      </div>
    </nav>
  )
}
