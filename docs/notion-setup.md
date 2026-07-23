# Notion 연동 설정

이 앱은 브라우저에 노션 시크릿을 저장하지 않습니다. 배포 환경변수에 아래 두 값만 추가하세요.

```env
NOTION_TOKEN=ntn_...
NOTION_DATABASE_ID=복제한_DB_URL의_32자리_ID
```

1. [Notion integrations](https://www.notion.so/profile/integrations)에서 **Internal integration**을 만들고, 콘텐츠 삽입(Insert content) 권한을 켭니다.
2. 복제해 둔 테스트 DB를 열고, 우측 상단 `...` → `Connections`에서 방금 만든 integration을 연결합니다.
3. 복제한 DB를 전체 페이지로 열어 URL의 마지막 32자리 ID를 `NOTION_DATABASE_ID`에 넣습니다. 하이픈 유무는 상관없습니다. 이 값으로 API 데이터 소스를 자동으로 찾습니다.
4. 로컬 테스트는 프로젝트 루트의 `.env.local`에 두 값을 넣고 `npm run dev`를 실행하면 됩니다. `.env.local`은 커밋하지 마세요. 나중에 Vercel에 배포할 때만 Vercel 프로젝트의 **Settings → Environment Variables**에 같은 값을 등록하고 다시 배포하세요.

DB에 아래와 같은 열이 있으면 해당 값도 자동으로 채워집니다: `병원명`, `담당자`, `연락처`, `일정 요약`, `요청 내용`, `수정 항목`, `다음달 이벤트`, `출력 사이즈`, `캘린더 필수 포함`, `특이사항`, `접수일`. 열 이름이 달라도 요청 내용 전체는 새 페이지 본문에 항상 저장됩니다.

이미 API 데이터 소스 ID를 알고 있다면 `NOTION_DATABASE_ID` 대신 `NOTION_DATA_SOURCE_ID`를 사용할 수도 있습니다.
