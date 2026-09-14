export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-bg text-fg px-6 py-24 md:px-24 selection:bg-fg selection:text-bg">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-4 mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted text-lg">Last updated: September 14, 2026</p>
        </header>

        <div className="space-y-12 text-lg leading-relaxed text-muted">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">1. Agreement to Terms</h2>
            <p>
              본 약관(EULA)은 주식회사 두레서울(이하 &quot;회사&quot;)이 제공하는 모바일 애플리케이션 및 웹사이트(이하 &quot;서비스&quot;)를 이용함에 있어
              회사와 사용자 간의 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.
              서비스를 다운로드, 설치 또는 사용함으로써 귀하는 본 약관에 동의하는 것으로 간주됩니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">2. User-Generated Content (사용자 생성 콘텐츠 정책)</h2>
            <p>
              애플 및 구글의 스토어 가이드라인에 따라, 회사는 서비스 내에서 불쾌감을 주거나 공격적인 콘텐츠(Objectionable Content) 및 
              부적절한 사용자에 대해 무관용 원칙(Zero-Tolerance)을 적용합니다.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>타인을 비방하거나 모욕하는 행위, 욕설, 폭력적/성적 콘텐츠의 게시를 엄격히 금지합니다.</li>
              <li>사용자는 앱 내의 [신고하기] 기능을 통해 부적절한 콘텐츠 및 사용자를 즉시 신고할 수 있습니다.</li>
              <li>신고된 콘텐츠는 24시간 이내에 검토되며, 약관 위반이 확인된 계정은 즉시 영구 정지 및 접근 차단 조치됩니다.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">3. Account Responsibilities</h2>
            <p>
              사용자는 본인의 계정 및 비밀번호를 안전하게 관리할 책임이 있으며, 계정 공유로 인해 발생하는 모든 문제의 책임은 사용자 본인에게 있습니다.
              타인의 명의를 도용하거나 허위 정보를 기재하여 가입한 경우, 사전 통보 없이 계정이 삭제될 수 있습니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">4. Termination</h2>
            <p>
              회사는 사용자가 본 약관을 위반한 경우, 사전 통지 없이 즉시 서비스 이용을 일시 정지하거나 영구적으로 계약을 해지할 수 있습니다.
              이로 인한 데이터 삭제 및 서비스 이용 불가에 대해 회사는 법적 책임을 지지 않습니다.
            </p>
          </section>

          <section className="space-y-4 pb-24">
            <h2 className="text-2xl font-bold text-fg">5. Limitation of Liability</h2>
            <p>
              회사는 오프라인 매칭 서비스 등에서 발생하는 사용자 간의 개인적인 분쟁이나, 천재지변 등 불가항력적인 사유로 인한 
              서비스 중단에 대해 법적인 책임을 지지 않습니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
