import ScheduleBuilderPage from '../components/ScheduleBuilderPage';

/**
 * 원장님용 앱의 진입점입니다.
 * 현재는 내부용과 동일한 화면을 사용하며, 이후 원장님용 UI 변경은 여기서 시작합니다.
 */
export default function CustomerApp() {
  return <ScheduleBuilderPage appMode="customer" />;
}
