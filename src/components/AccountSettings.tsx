import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { LuUser, LuKey, LuSave } from "react-icons/lu";
import { toast } from "react-hot-toast";

const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const [childName, setChildName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_info")
          .select("child_name, pin_code")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error(
            "사용자 정보를 가져오는 중 오류가 발생했습니다:",
            error
          );
          setError("사용자 정보를 가져오는 중 오류가 발생했습니다.");
        } else if (data) {
          setChildName(data.child_name);
          setPinCode(data.pin_code);
        }
      } catch (err) {
        console.error("사용자 정보 조회 중 오류가 발생했습니다:", err);
        setError("사용자 정보 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [user]);

  const handleChildNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChildName(e.target.value);
    setError(null);
  };

  const handlePinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPinCode(value);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    if (!childName.trim()) {
      setError("오늘의 미션 제목을 입력해주세요.");
      return;
    }

    if (pinCode.length !== 4) {
      setError("PIN은 4자리 숫자여야 합니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("user_info")
        .update({
          child_name: childName.trim(),
          pin_code: pinCode,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      // 성공 시 토스트 메시지 - 2초 후 자동으로 사라짐
      toast.success("계정 설정이 저장되었습니다.", {
        duration: 2000,
        icon: "✅",
        position: "bottom-right",
      });
    } catch (err) {
      console.error("계정 설정 저장 중 오류가 발생했습니다:", err);
      setError("계정 설정 저장 중 오류가 발생했습니다.");

      toast.error("계정 설정 저장에 실패했습니다.", {
        duration: 2000,
        position: "bottom-right",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">계정 설정</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && !error ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="childName"
              className="block text-sm font-medium text-gray-700 mb-2 flex items-center"
            >
              <LuUser className="mr-2" /> 오늘의 미션 제목 설정
            </label>
            <p className="mt-1 text-sm text-gray-500">
              오늘의 미션 페이지에 표시될 제목입니다.
            </p>
            <input
              type="text"
              id="childName"
              value={childName}
              onChange={handleChildNameChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="오늘의 미션 제목을 입력해주세요."
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="pinCode"
              className="block text-sm font-medium text-gray-700 mb-2 flex items-center"
            >
              <LuKey className="mr-2" /> PIN 코드 (4자리)
            </label>
            <p className="mt-1 text-sm text-gray-500">
              오늘의 미션 설정 페이지에 접근할 때 필요한 PIN 코드입니다.
            </p>
            <input
              type="text"
              id="pinCode"
              value={pinCode}
              onChange={handlePinCodeChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="4자리 숫자를 입력하세요"
              maxLength={4}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              ) : (
                <LuSave className="mr-2" />
              )}
              설정 저장
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AccountSettings;
