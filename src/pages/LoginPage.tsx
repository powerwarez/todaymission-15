import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Provider } from "@supabase/supabase-js";
import { FaComment } from "react-icons/fa"; // 카카오 아이콘 예시 (원하는 아이콘으로 변경 가능)
import { LuStar } from "react-icons/lu";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (provider: Provider) => {
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          // 필요시 리다이렉트 URL 지정
          // redirectTo: window.location.origin,
          queryParams: {
            // 매번 계정 선택 화면 표시 (다른 계정으로 로그인 가능)
            prompt: 'login',
          },
        },
      });
      if (signInError) throw signInError;
      // 성공하면 Supabase가 리다이렉트 처리
    } catch (err: unknown) {
      console.error("Login Error:", err);
      let errorMessage = "로그인 중 오류가 발생했습니다.";
      if (typeof err === "object" && err !== null) {
        // Attempt to extract Supabase specific error properties
        const supabaseError = err as {
          error_description?: string;
          message?: string;
        };
        errorMessage =
          supabaseError.error_description ||
          supabaseError.message ||
          errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setLoading(false);
    }
    // 로딩 상태는 리다이렉트 후 페이지 전환 시 해제됨
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-4 inline-flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            backgroundColor: "var(--ui-accent)",
            color: "var(--ui-on-accent)",
            border: "var(--ui-bw) solid var(--ui-ink)",
            borderRadius: "var(--ui-radius-lg)",
            boxShadow: "var(--ui-shadow)",
          }}
          aria-hidden="true"
        >
          <LuStar size={32} />
        </div>
        <h1 className="ui-page-title mb-2">오늘 미션!</h1>
        <p className="ui-text-sub font-medium mb-8">
          매일 미션을 완료하고 배지를 모아보세요.
        </p>

        {error && (
          <p role="alert" className="ui-error-text mb-4">
            {error}
          </p>
        )}

        {/* 카카오 브랜드 색상은 유지 */}
        <Button
          size="lg"
          block
          onClick={() => handleLogin("kakao")}
          loading={loading}
          style={{ backgroundColor: "#FEE500", color: "#3C1E1E" }}
        >
          {!loading && <FaComment />}
          {loading ? "로그인 중..." : "카카오 로그인"}
        </Button>

        {/* 다른 로그인 옵션 추가 가능 */}
      </Card>
    </div>
  );
};

export default LoginPage;
