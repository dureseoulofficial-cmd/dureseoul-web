export default function Support() {
  return (
    <main className="min-h-screen bg-bg text-fg px-6 py-24 md:px-24 selection:bg-fg selection:text-bg">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Support & Contact</h1>
          <p className="text-muted text-lg">We are here to help. Get in touch with the Dureseoul team.</p>
        </header>

        <section className="space-y-6 border-t border-border pt-8">
          <h2 className="text-2xl font-bold">1. General Inquiries & Customer Support</h2>
          <p className="text-muted leading-relaxed">
            두레서울 서비스 이용 중 발생한 버그, 결제 관련 문제, 혹은 기타 서비스 이용과 관련된 모든 문의는 아래 이메일로 접수해 주시면 평일 기준 24시간 이내에 답변해 드립니다.
          </p>
          <div className="p-6 bg-surface border border-border inline-block backdrop-blur-sm mt-4">
            <p className="font-mono text-muted mb-2 text-sm uppercase">Support Email</p>
            <a href="mailto:dureseoulofficial@gmail.com" className="text-xl font-bold underline hover:text-muted transition-colors">
              dureseoulofficial@gmail.com
            </a>
          </div>
        </section>

        <section className="space-y-6 border-t border-border pt-8">
          <h2 className="text-2xl font-bold">2. Account & Data Deletion (계정 및 데이터 삭제 요청)</h2>
          <div className="p-6 bg-surface border border-border backdrop-blur-sm space-y-4">
            <p className="font-bold text-red-400">🚨 앱스토어 및 구글 플레이 정책에 따른 데이터 삭제 안내</p>
            <p className="text-muted leading-relaxed">
              사용자는 언제든지 자신의 계정과 관련된 모든 개인 데이터의 완전한 삭제를 요청할 권리가 있습니다. 
              앱 내의 [설정 &gt; 계정 탈퇴] 메뉴를 이용하시거나, 앱에 접근할 수 없는 경우 아래 절차를 통해 삭제를 요청하실 수 있습니다.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted ml-2">
              <li>위 고객지원 이메일로 <strong>[데이터 삭제 요청]</strong>이라는 제목의 메일을 발송합니다.</li>
              <li>가입 시 사용한 이메일 주소나 회원 ID를 반드시 포함해 주세요.</li>
              <li>접수 후 영업일 기준 3일 이내에 모든 개인정보 및 서비스 이용 기록이 영구적으로 파기됩니다.</li>
            </ol>
          </div>
        </section>
        
        <section className="space-y-6 border-t border-border pt-8 pb-24">
          <h2 className="text-2xl font-bold">3. FAQ (자주 묻는 질문)</h2>
          <div className="space-y-4 text-muted leading-relaxed">
            <p><strong>Q. 앱은 언제 정식 출시되나요?</strong></p>
            <p>A. 현재 클로즈드 베타 테스트를 준비 중이며, 메인 홈페이지의 Waitlist에 등록해 주시면 가장 먼저 초대장을 보내드립니다.</p>
            <br/>
            <p><strong>Q. 오프라인 매칭은 서울 지역에서만 가능한가요?</strong></p>
            <p>A. 네, 초기 서비스는 완벽한 밀도와 매칭 퀄리티를 보장하기 위해 서울 지역 내로 한정하여 운영됩니다.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
