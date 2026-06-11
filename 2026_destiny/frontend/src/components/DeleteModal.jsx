import styles from '../pages/Home.module.css'

export default function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>정말 탈퇴하시겠습니까?</h3>
        <p>탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
        <div className={styles.modalButtons}>
          <button onClick={onCancel}  className={styles.btnOutline}>취소</button>
          <button onClick={onConfirm} className={styles.btnDanger}>탈퇴하기</button>
        </div>
      </div>
    </div>
  )
}
