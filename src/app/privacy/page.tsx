export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-bg text-fg px-6 py-24 md:px-24 selection:bg-fg selection:text-bg">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-4 mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted text-lg">Last updated: November 4, 2026</p>
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

          <section id="class-waitlist" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-fg">5. Class Waitlist and Host Interest (클래스 자리 맡기 · 호스트 신청)</h2>
            <p>
              회사는 2026년 11월부터 약 2주 동안 dureseoul.com/classes 에서 클래스 수요를 확인합니다. 이 기간에 「자리 맡아두기」와
              「호스트 지원하기」를 이용하면 아래 정보를 받습니다.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>자리 맡아두기:</strong> 이름, 이메일 또는 휴대폰 번호, 인원, (선택) 알게 된 경로</li>
              <li><strong>호스트 신청:</strong> 이메일, 출신 국가, 하고 싶은 클래스 한 줄</li>
              <li><strong>함께 저장되는 정보:</strong> 처음 들어온 링크의 유입 표시(utm, ref), 화면 언어, 신청 시각</li>
              <li><strong>방문 기록:</strong> 이 페이지를 연 기록과 버튼을 누른 기록. 이름·연락처 없이, 브라우저에 저장한 무작위 방문자 번호로만 묶어서 방문자 수를 셉니다. 같은 기간 뒤 함께 삭제합니다.</li>
            </ul>
            <p>
              <strong>목적:</strong> 신청한 클래스의 확정·결제 안내와 호스트 신청 회신에만 씁니다. 광고나 다른 마케팅 연락에는 쓰지 않습니다.
            </p>
            <p>
              <strong>보관 기간:</strong> 검증 기간이 끝난 뒤 3개월 안에 삭제합니다. 실제 예약으로 이어진 경우에는 그 정보를 예약 기록으로 옮겨
              예약 기록의 보관 기준에 따라 관리합니다. 그 전에 삭제를 원하면 아래 연락처로 요청해 주세요.
            </p>
            <p className="text-base">
              From November 2026, for about two weeks, we collect the details you enter on dureseoul.com/classes (name, email or phone,
              party size, optional referral; for host interest: email, home country, class idea), together with the referral tag of the
              link you first arrived from and your page language. We also log page views and button taps under a random visitor number stored in your browser, with no name or contact attached, to count visitors. We use them only to confirm your class, arrange payment, or reply to
              your host application, and delete them within 3 months after the trial period ends. If you go on to book, the details move
              into your booking record. You can ask us to delete them at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-fg">6. Third-Party Services</h2>
            <p>
              원활한 서비스 제공을 위해 일부 데이터를 서드파티 서비스(예: Google Firebase, Vercel Analytics)를 통해 처리할 수 있으며, 
              이는 오직 서비스 운영 및 익명화된 통계 분석 목적으로만 사용됩니다. 외부 마케팅 목적으로 제3자에게 개인정보를 판매하지 않습니다.
            </p>
          </section>

          <section className="space-y-4 pb-24">
            <h2 className="text-2xl font-bold text-fg">7. Contact Us</h2>
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
