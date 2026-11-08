import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 요청 때 만든다 (빌드할 때 환경변수가 없어도 빌드가 멈추지 않게)
function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "유효한 이메일 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    // Insert the email into the Supabase 'waitlist' table
    const { error } = await db()
      .from("waitlist")
      .insert([{ email }]);

    if (error) {
      // 23505 is the Postgres error code for unique violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: "이미 등록된 이메일입니다." },
          { status: 400 }
        );
      }
      console.error("Supabase Error:", error);
      return NextResponse.json(
        { error: "데이터베이스 저장 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "성공적으로 등록되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Waitlist API Error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
