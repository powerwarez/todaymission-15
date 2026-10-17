import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { LuLock, LuKey } from "react-icons/lu";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Spinner from "./ui/Spinner";

interface PinAuthModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const PinAuthModal: React.FC<PinAuthModalProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<{
    pin_code: string;
    child_name: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_info")
          .select("pin_code, child_name")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("PIN 정보를 가져오는 중 오류가 발생했습니다:", error);
          setError("PIN 정보를 가져오는 중 오류가 발생했습니다.");
        } else if (data) {
          setUserInfo(data);
        }
      } catch (err) {
        console.error("PIN 정보 조회 중 오류가 발생했습니다:", err);
        setError("PIN 정보 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [user]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 숫자만 입력 가능하도록 제한
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 4) {
      setError("PIN은 4자리 숫자여야 합니다.");
      return;
    }

    if (userInfo && pin === userInfo.pin_code) {
      onSuccess();
    } else {
      setError("올바르지 않은 PIN입니다.");
      setPin("");
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      maxWidthClass="max-w-md"
      ariaLabel="PIN 확인"
    >
      <h2 className="ui-section-title mb-4 pr-10">
        <LuLock />
        PIN 확인
      </h2>

      {loading ? (
        <Spinner />
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="ui-text-sub font-medium mb-4">
            {userInfo?.child_name || "아이"} 설정 페이지에 접근하기 위해 PIN을
            입력해주세요.
          </p>

          <div className="mb-4">
            <label htmlFor="pin" className="ui-label">
              PIN 코드 (4자리)
            </label>
            <input
              type="password"
              id="pin"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={handlePinChange}
              className="w-full text-center text-2xl tracking-widest"
              style={{ minHeight: 56 }}
              placeholder="****"
              maxLength={4}
              autoFocus
            />
          </div>

          {error && (
            <p role="alert" className="ui-error-text mb-4">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button onClick={onCancel}>취소</Button>
            <Button type="submit" variant="primary">
              <LuKey size={18} />
              확인
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default PinAuthModal;
