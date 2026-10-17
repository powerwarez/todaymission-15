import React, { useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  LuPlus,
  LuUpload,
  LuX,
  LuTarget,
  LuImage,
} from "react-icons/lu";
import toast from "react-hot-toast";
import Button from "./ui/Button";

interface ChallengeCreatorProps {
  onChallengeCreated?: () => void;
}

type ConditionType =
  | "DAILY_COMPLETIONS"
  | "WEEKLY_COMPLETIONS";

const ChallengeCreator: React.FC<ChallengeCreatorProps> = ({
  onChallengeCreated,
}) => {
  const { user } = useAuth();

  // 폼 상태
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionType, setConditionType] =
    useState<ConditionType>("DAILY_COMPLETIONS");
  const [requiredCount, setRequiredCount] =
    useState<number>(10);
  const [imageFile, setImageFile] = useState<File | null>(
    null
  );
  const [imagePreview, setImagePreview] = useState<
    string | null
  >(null);

  // UI 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 선택 핸들러
  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setImageFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setName("");
    setDescription("");
    setConditionType("DAILY_COMPLETIONS");
    setRequiredCount(10);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 도전과제 생성 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    // 유효성 검사
    if (!name.trim()) {
      toast.error("도전과제 이름을 입력해주세요.");
      return;
    }

    if (!description.trim()) {
      toast.error("도전과제 설명을 입력해주세요.");
      return;
    }

    if (requiredCount < 1) {
      toast.error("달성 횟수는 1 이상이어야 합니다.");
      return;
    }

    if (!imageFile) {
      toast.error("배지 이미지를 업로드해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 배지 ID 생성 (고유값)
      const badgeId = `user_challenge_${
        user.id
      }_${Date.now()}`;

      // 2. 이미지 업로드
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${badgeId}.${fileExt}`;
      const filePath = `user_badges/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("badges")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("이미지 업로드 오류:", uploadError);
        throw new Error("이미지 업로드에 실패했습니다.");
      }

      // 3. 이미지 URL 생성
      const { data: urlData } = supabase.storage
        .from("badges")
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // 4. badges 테이블에 배지 추가
      const { error: badgeError } = await supabase
        .from("badges")
        .insert({
          id: badgeId,
          name: name.trim(),
          description: description.trim(),
          image_path: imageUrl,
          badge_type: "mission",
          created_by: user.id,
        });

      if (badgeError) {
        console.error("배지 생성 오류:", badgeError);
        throw new Error("배지 생성에 실패했습니다.");
      }

      // 5. challenges 테이블에 도전과제 추가
      const { error: challengeError } = await supabase
        .from("challenges")
        .insert({
          name: name.trim(),
          description: description.trim(),
          badge_id: badgeId,
          condition_type: conditionType,
          required_count: requiredCount,
          user_id: user.id,
        });

      if (challengeError) {
        console.error(
          "도전과제 생성 오류:",
          challengeError
        );
        throw new Error("도전과제 생성에 실패했습니다.");
      }

      toast.success(
        "도전과제가 성공적으로 추가되었습니다!"
      );
      resetForm();
      setShowForm(false);
      onChallengeCreated?.();
    } catch (error) {
      console.error("도전과제 생성 중 오류:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "도전과제 생성에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 조건 타입별 설명
  const getConditionDescription = (type: ConditionType) => {
    switch (type) {
      case "DAILY_COMPLETIONS":
        return "오늘의 영웅 배지 획득 횟수를 기준으로 달성 여부를 확인합니다.";
      case "WEEKLY_COMPLETIONS":
        return "주간 미션 달성 배지 획득 횟수를 기준으로 달성 여부를 확인합니다.";
      default:
        return "";
    }
  };

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full min-h-[56px] p-4 flex items-center justify-center gap-2 font-extrabold cursor-pointer transition-colors hover:bg-[var(--ui-surface-soft)]"
        style={{
          border: "var(--ui-bw) dashed var(--ui-ink)",
          borderRadius: "var(--ui-radius-lg)",
          color: "var(--ui-text)",
        }}
      >
        <LuPlus size={20} />
        <span>새 도전과제 추가</span>
      </button>
    );
  }

  return (
    <div className="ui-card-soft" style={{ padding: "1.25rem" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg flex items-center gap-2">
          <LuTarget size={20} />새 도전과제 만들기
        </h3>
        <Button
          variant="ghost"
          iconOnly
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(false);
          }}
          aria-label="닫기"
        >
          <LuX size={20} />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 배지 이미지 업로드 */}
        <div>
          <span className="ui-label">배지 이미지 *</span>
          <div className="flex items-start gap-4">
            {/* 이미지 미리보기 */}
            <div
              className="w-24 h-24 flex items-center justify-center overflow-hidden flex-none"
              style={{
                border: "var(--ui-bw-thin) dashed var(--ui-ink)",
                borderRadius: "var(--ui-radius-md)",
                backgroundColor: "var(--ui-surface)",
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="배지 미리보기"
                  className="w-full h-full object-cover"
                />
              ) : (
                <LuImage size={32} className="ui-text-sub" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="badge-image-input"
              />
              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor="badge-image-input"
                  className="ui-btn ui-btn-primary ui-btn-sm"
                >
                  <LuUpload size={16} />
                  이미지 선택
                </label>
                {imageFile && (
                  <Button size="sm" onClick={handleRemoveImage}>
                    제거
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs ui-text-sub font-medium">
                PNG, JPG, GIF 형식 (최대 5MB)
              </p>
              {imageFile && (
                <p
                  className="mt-1 text-xs font-bold break-all"
                  style={{ color: "var(--color-success-dark)" }}
                >
                  {imageFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 도전과제 이름 */}
        <div>
          <label htmlFor="challenge-name" className="ui-label">
            도전과제 이름 *
          </label>
          <input
            type="text"
            id="challenge-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 꾸준한 도전자"
            maxLength={50}
            className="w-full"
          />
        </div>

        {/* 도전과제 설명 */}
        <div>
          <label htmlFor="challenge-description" className="ui-label">
            설명 *
          </label>
          <textarea
            id="challenge-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 미션을 100개 완료했습니다!"
            maxLength={200}
            rows={2}
            className="w-full resize-none"
          />
        </div>

        {/* 조건 타입 선택 */}
        <div>
          <span className="ui-label">달성 조건 *</span>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            role="radiogroup"
            aria-label="달성 조건"
          >
            {(
              [
                {
                  value: "DAILY_COMPLETIONS",
                  label: "오늘의 영웅 획득",
                },
                {
                  value: "WEEKLY_COMPLETIONS",
                  label: "주간 달성 획득",
                },
              ] as const
            ).map((option) => {
              const selected = conditionType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setConditionType(option.value)}
                  className="min-h-[48px] p-3 text-sm font-extrabold cursor-pointer"
                  style={{
                    border: "var(--ui-bw) solid var(--ui-ink)",
                    borderRadius: "var(--ui-radius-md)",
                    backgroundColor: selected
                      ? "var(--ui-accent)"
                      : "var(--ui-surface)",
                    color: selected ? "var(--ui-on-accent)" : "var(--ui-text)",
                    boxShadow: selected ? "var(--ui-shadow-sm)" : "none",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs ui-text-sub font-medium">
            {getConditionDescription(conditionType)}
          </p>
        </div>

        {/* 달성 횟수 */}
        <div>
          <label htmlFor="required-count" className="ui-label">
            달성 횟수 *
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              id="required-count"
              inputMode="numeric"
              value={requiredCount}
              onChange={(e) =>
                setRequiredCount(Math.max(1, parseInt(e.target.value) || 1))
              }
              min={1}
              max={10000}
              className="w-32"
            />
            <span className="font-bold">회</span>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1"
            onClick={() => {
              resetForm();
              setShowForm(false);
            }}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={isSubmitting}
          >
            {isSubmitting ? (
              "저장 중..."
            ) : (
              <>
                <LuPlus size={18} />
                도전과제 추가
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChallengeCreator;
