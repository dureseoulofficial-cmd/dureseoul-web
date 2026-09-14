export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-bg text-fg px-6 py-24 md:px-24 selection:bg-fg selection:text-bg">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-4 mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted text-lg">Last updated: September 14, 2026</p>
        </header>

        <div className="space-y-12 text-lg leading-relaxed text-muted">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">1. Introduction</h2>
            <p>
              주식회사 두레서울(이하 &quot;회사&quot;)은 사용자의 개인정보를 매우 중요하게 생각하며, &quot;개인정보 보호법&quot; 등 관련 법령을 준수하고 있습니다.
              본 개인정보처리방침은 회사가 제공하는 DURE(두레) 앱 및 웹서비스 이용 시 수집되는 정보와 그 사용 목적에 대해 설명합니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">2. Information Collection and Use</h2>
            <p>회사는 서비스 제공을 위해 아래와 같은 최소한의 개인정보를 수집합니다.</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>필수 수집 항목:</strong> 이메일 주소, 비밀번호, 닉네임 (회원가입 및 식별 목적)</li>
              <li><strong>선택 수집 항목:</strong> 위치 정보 (오프라인 매칭 서비스 제공 목적), 프로필 사진</li>
              <li><strong>자동 수집 항목:</strong> 기기 정보, IP 주소, 앱 사용 기록 (버그 추적 및 서비스 개선 목적)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">3. Use of Data</h2>
            <p>수집된 개인정보는 다음의 목적을 위해서만 활용됩니다.</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>회원 간의 원활한 매칭 및 커뮤니케이션 지원</li>
              <li>서비스 악용 방지 및 비정상적 접근 차단</li>
              <li>새로운 기능 업데이트 안내 및 고객 지원</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">4. Data Deletion (데이터 삭제 및 파기)</h2>
            <p>
              회원 탈퇴를 요청하거나 개인정보 수집 목적이 달성된 경우, 해당 정보는 지체 없이 파기됩니다.
              앱 내 설정 메뉴에서 직접 탈퇴가 가능하며, 웹사이트의 <a href="/support" className="text-fg underline font-medium">Support 페이지</a>에 안내된 절차에 따라 이메일로도 즉시 데이터 영구 삭제를 요청할 수 있습니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">5. Third-Party Services</h2>
            <p>
              원활한 서비스 제공을 위해 일부 데이터를 서드파티 서비스(예: Google Firebase, Vercel Analytics)를 통해 처리할 수 있으며, 
              이는 오직 서비스 운영 및 익명화된 통계 분석 목적으로만 사용됩니다. 외부 마케팅 목적으로 제3자에게 개인정보를 판매하지 않습니다.
            </p>
          </section>

          <section className="space-y-4 pb-24">
            <h2 className="text-2xl font-bold text-fg">6. Contact Us</h2>
            <p>
              개인정보 보호와 관련된 모든 문의사항은 개인정보보호 책임자에게 연락해 주시기 바랍니다.<br/>
              이메일: <a href="mailto:dureseoulofficial@gmail.com" className="text-fg underline font-medium">dureseoulofficial@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
