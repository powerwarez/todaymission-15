import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { LuUser, LuKey, LuSave } from "react-icons/lu";
import { toast } from "react-hot-toast";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Spinner from "./ui/Spinner";

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
    <Card>
      <h2 className="ui-section-title mb-4">
        <LuUser /> 계정 설정
      </h2>

      {error && (
        <div
          role="alert"
          className="ui-card-soft mb-4 font-semibold"
          style={{
            backgroundColor: "var(--color-error-light)",
            color: "var(--color-error-dark)",
          }}
        >
          {error}
        </div>
      )}

      {loading && !error ? (
        <Spinner />
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="childName" className="ui-label flex items-center gap-2">
              <LuUser /> 오늘의 미션 제목 설정
            </label>
            <p className="mb-2 text-sm ui-text-sub">
              오늘의 미션 페이지에 표시될 제목입니다.
            </p>
            <input
              type="text"
              id="childName"
              value={childName}
              onChange={handleChildNameChange}
              className="w-full"
              placeholder="오늘의 미션 제목을 입력해주세요."
            />
          </div>

          <div className="mb-6">
            <label htmlFor="pinCode" className="ui-label flex items-center gap-2">
              <LuKey /> PIN 코드 (4자리)
            </label>
            <p className="mb-2 text-sm ui-text-sub">
              오늘의 미션 설정 페이지에 접근할 때 필요한 PIN 코드입니다.
            </p>
            <input
              type="text"
              id="pinCode"
              inputMode="numeric"
              value={pinCode}
              onChange={handlePinCodeChange}
              className="w-full"
              placeholder="4자리 숫자를 입력하세요"
              maxLength={4}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={loading}>
              {!loading && <LuSave size={20} />}
              설정 저장
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default AccountSettings;
