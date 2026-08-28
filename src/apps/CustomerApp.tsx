import ScheduleBuilderPage from '../components/ScheduleBuilderPage';
import styles from './CustomerApp.module.css';

/**
 * 원장님용 앱의 진입점입니다.
 * 현재는 내부용과 동일한 화면을 사용하며, 이후 원장님용 UI 변경은 여기서 시작합니다.
 */
export default function CustomerApp() {
  return (
    <>
      <ScheduleBuilderPage appMode="customer" />
      <footer className={styles.footer}>
        <span>MNM Calendar</span>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/terms">서비스 이용약관</a>
      </footer>
    </>
  );
}
