import styles from './LegalPage.module.css';

type LegalPageProps = {
  type: 'privacy' | 'terms';
};

const effectiveDate = '2026년 8월 28일';

function PrivacyPolicy() {
  return (
    <>
      <h1>개인정보처리방침</h1>
      <p className={styles.lead}>
        MNM Calendar는 병원 진료일정 이미지를 제작하고 지정된 Google Drive에 저장하기 위해 필요한 최소한의 정보만 처리합니다.
      </p>

      <h2>1. 처리하는 정보</h2>
      <p>병원명, 진료일정, 진료시간, 사용자가 입력한 문구 및 업로드한 로고·이미지를 처리할 수 있습니다.</p>

      <h2>2. Google 사용자 데이터 이용</h2>
      <p>
        Google Drive 권한은 완성된 진료일정 이미지를 지정 폴더에 업로드하고, 연도·월·병원명 폴더를 조회하거나 생성하는 용도로만 사용합니다.
        Google 사용자 데이터를 광고, 판매 또는 사용자에게 안내하지 않은 다른 목적으로 이용하지 않습니다.
      </p>

      <h2>3. 저장 및 보관</h2>
      <p>
        완성 이미지는 서비스 운영자가 지정한 Google Drive에 저장됩니다. 일정 제출 및 이용 기록은 서비스 운영을 위해 Notion 데이터베이스에
        저장될 수 있습니다. 브라우저에 임시 저장된 작성 정보는 사용자가 브라우저 데이터를 삭제하여 제거할 수 있습니다.
      </p>

      <h2>4. 제3자 제공</h2>
      <p>법령상 의무가 있는 경우를 제외하고 처리한 정보를 제3자에게 판매하거나 제공하지 않습니다.</p>

      <h2>5. 삭제 및 문의</h2>
      <p>
        저장 정보의 확인 또는 삭제 요청은 아래 이메일로 문의해 주세요. 확인 후 합리적인 기간 안에 처리합니다.
      </p>
      <p><a href="mailto:medinmedi24@gmail.com">medinmedi24@gmail.com</a></p>

      <h2>6. 방침 변경</h2>
      <p>본 방침이 변경되는 경우 이 페이지를 통해 변경 내용을 안내합니다.</p>
    </>
  );
}

function TermsOfService() {
  return (
    <>
      <h1>서비스 이용약관</h1>
      <p className={styles.lead}>본 약관은 MNM Calendar 진료일정 이미지 제작 서비스 이용에 적용됩니다.</p>

      <h2>1. 서비스 내용</h2>
      <p>MNM Calendar는 사용자가 입력한 진료일정을 바탕으로 일정 이미지를 생성하고 다운로드 또는 지정된 저장소에 제출하는 기능을 제공합니다.</p>

      <h2>2. 사용자의 책임</h2>
      <p>사용자는 입력하거나 업로드하는 문구, 로고 및 이미지에 대한 적법한 사용 권한을 보유해야 하며 정확한 정보를 입력해야 합니다.</p>

      <h2>3. 금지 행위</h2>
      <p>서비스 방해, 무단 접근, 타인의 권리 침해, 불법 콘텐츠의 제작 또는 저장을 목적으로 서비스를 이용할 수 없습니다.</p>

      <h2>4. 서비스 변경 및 중단</h2>
      <p>점검, 외부 서비스 장애 또는 운영상 필요한 경우 서비스의 일부가 변경되거나 일시 중단될 수 있습니다.</p>

      <h2>5. 책임의 범위</h2>
      <p>사용자는 생성된 이미지의 일정과 문구를 제출 전에 확인해야 합니다. 외부 서비스 장애나 사용자가 확인하지 않은 입력 오류로 발생한 손해에 대해서는 관련 법령이 허용하는 범위에서 책임이 제한됩니다.</p>

      <h2>6. 문의</h2>
      <p>서비스 관련 문의는 <a href="mailto:medinmedi24@gmail.com">medinmedi24@gmail.com</a>으로 보내주세요.</p>
    </>
  );
}

export default function LegalPage({ type }: LegalPageProps) {
  const title = type === 'privacy' ? '개인정보처리방침' : '서비스 이용약관';
  document.title = `${title} | MNM Calendar`;

  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <a className={styles.back} href="/">← MNM Calendar로 돌아가기</a>
        {type === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
        <p className={styles.date}>시행일: {effectiveDate}</p>
      </article>
    </main>
  );
}
