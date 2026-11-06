// /classes 에 보이는 클래스 3개.
// placeholder: true 인 동안 카드에 「예시」 표시가 붙는다. 실제 내용을 넣으면 false 로 바꾼다.
// photo: public/classes/ 아래 실제 호스트 사진 경로 (예: "/classes/host-1.jpg"). 없으면 빈 틀.
// AI 가상인물 사진은 쓰지 않는다.

export type LocalizedText = { ko: string; en: string };

export type DureClass = {
  id: string; // 영문 소문자·숫자·하이픈 (DB class_id 와 같음, 바꾸면 기록이 갈린다)
  placeholder: boolean;
  photo: string | null;
  host: LocalizedText; // 호스트 이름
  origin: LocalizedText; // 출신 (예: 캐나다 토론토)
  title: LocalizedText;
  date: LocalizedText; // 예: 11월 22일 (토) 오후 2시
  place: LocalizedText; // 동네까지 (예: 마포구 연남동)
  price: number | null; // 원, 미정이면 null
  capacity: number | null; // 정원, 미정이면 null
};

export const classes: DureClass[] = [
  {
    id: "class-1",
    placeholder: true,
    photo: null,
    host: { ko: "[호스트 이름 1]", en: "[Host name 1]" },
    origin: { ko: "[출신 국가·도시]", en: "[Home country, city]" },
    title: { ko: "[클래스 제목 1]", en: "[Class title 1]" },
    date: { ko: "[날짜·시간]", en: "[Date, time]" },
    place: { ko: "[구 · 동]", en: "[District, neighborhood]" },
    price: null,
    capacity: null,
  },
  {
    id: "class-2",
    placeholder: true,
    photo: null,
    host: { ko: "[호스트 이름 2]", en: "[Host name 2]" },
    origin: { ko: "[출신 국가·도시]", en: "[Home country, city]" },
    title: { ko: "[클래스 제목 2]", en: "[Class title 2]" },
    date: { ko: "[날짜·시간]", en: "[Date, time]" },
    place: { ko: "[구 · 동]", en: "[District, neighborhood]" },
    price: null,
    capacity: null,
  },
  {
    id: "class-3",
    placeholder: true,
    photo: null,
    host: { ko: "[호스트 이름 3]", en: "[Host name 3]" },
    origin: { ko: "[출신 국가·도시]", en: "[Home country, city]" },
    title: { ko: "[클래스 제목 3]", en: "[Class title 3]" },
    date: { ko: "[날짜·시간]", en: "[Date, time]" },
    place: { ko: "[구 · 동]", en: "[District, neighborhood]" },
    price: null,
    capacity: null,
  },
];
