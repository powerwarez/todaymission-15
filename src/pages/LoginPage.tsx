import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Provider } from "@supabase/supabase-js";
import { FaComment } from "react-icons/fa"; // 카카오 아이콘 예시 (원하는 아이콘으로 변경 가능)

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
    <div
      className="flex items-center justify-center h-screen"
      style={{ backgroundColor: "var(--color-bg-main)" }}
    >
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-xs text-center">
        <h1
          className="text-3xl font-bold mb-8"
          style={{ color: "var(--color-text-primary)" }}
        >
          오늘 미션!
        </h1>

        {error && (
          <p
            style={{ color: "var(--color-text-error)" }}
            className="text-sm mb-4"
          >
            {error}
          </p>
        )}

        <button
          onClick={() => handleLogin("kakao")}
          disabled={loading}
          className="w-full bg-[#FEE500] text-[#3C1E1E] font-semibold py-3 px-4 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaComment className="mr-2" />
          {loading ? "로그인 중..." : "카카오 로그인"}
        </button>

        {/* 다른 로그인 옵션 추가 가능 */}
      </div>
    </div>
  );
};

export default LoginPage;
