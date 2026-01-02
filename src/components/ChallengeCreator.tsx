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

interface ChallengeCreatorProps {
  onChallengeCreated?: () => void;
}

type ConditionType =
  | "DAILY_COMPLETIONS"
  | "WEEKLY_COMPLETIONS"
  | "TOTAL_COMPLETIONS";

const ChallengeCreator: React.FC<ChallengeCreatorProps> = ({
  onChallengeCreated,
}) => {
  const { user } = useAuth();

  // 폼 상태
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionType, setConditionType] =
    useState<ConditionType>("TOTAL_COMPLETIONS");
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
    setConditionType("TOTAL_COMPLETIONS");
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
        return "완료한 일일 미션 수를 기준으로 달성 여부를 확인합니다.";
      case "WEEKLY_COMPLETIONS":
        return "완료한 주간 미션 수를 기준으로 달성 여부를 확인합니다.";
      case "TOTAL_COMPLETIONS":
        return "완료한 전체 미션 수를 기준으로 달성 여부를 확인합니다.";
      default:
        return "";
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full p-4 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors"
        style={{
          borderColor: "var(--color-border-light)",
          color: "var(--color-text-muted)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor =
            "var(--color-primary-medium)";
          e.currentTarget.style.color =
            "var(--color-primary-medium)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor =
            "var(--color-border-light)";
          e.currentTarget.style.color =
            "var(--color-text-muted)";
        }}>
        <LuPlus size={20} />
        <span>새 도전과제 추가</span>
      </button>
    );
  }

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 border"
      style={{ borderColor: "var(--color-border-light)" }}>
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-lg font-semibold flex items-center gap-2"
          style={{ color: "var(--color-text-primary)" }}>
          <LuTarget size={20} />새 도전과제 만들기
        </h3>
        <button
          onClick={() => {
            resetForm();
            setShowForm(false);
          }}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          style={{ color: "var(--color-text-muted)" }}>
          <LuX size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 배지 이미지 업로드 */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{
              color: "var(--color-text-secondary)",
            }}>
            배지 이미지 *
          </label>
          <div className="flex items-start gap-4">
            {/* 이미지 미리보기 */}
            <div
              className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden"
              style={{
                borderColor: "var(--color-border-light)",
              }}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="배지 미리보기"
                  className="w-full h-full object-cover"
                />
              ) : (
                <LuImage
                  size={32}
                  style={{
                    color: "var(--color-text-muted)",
                  }}
                />
              )}
            </div>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="badge-image-input"
              />
              <div className="flex gap-2">
                <label
                  htmlFor="badge-image-input"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors text-white"
                  style={{
                    backgroundColor:
                      "var(--color-primary-medium)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-primary-dark)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-primary-medium)";
                  }}>
                  <LuUpload size={16} />
                  이미지 선택
                </label>
                {imageFile && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-4 py-2 rounded-lg border transition-colors"
                    style={{
                      borderColor:
                        "var(--color-border-default)",
                      color: "var(--color-text-muted)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "transparent";
                    }}>
                    제거
                  </button>
                )}
              </div>
              <p
                className="mt-2 text-xs"
                style={{
                  color: "var(--color-text-muted)",
                }}>
                PNG, JPG, GIF 형식 (최대 5MB)
              </p>
              {imageFile && (
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--color-success)" }}>
                  {imageFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 도전과제 이름 */}
        <div>
          <label
            htmlFor="challenge-name"
            className="block text-sm font-medium mb-2"
            style={{
              color: "var(--color-text-secondary)",
            }}>
            도전과제 이름 *
          </label>
          <input
            type="text"
            id="challenge-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 꾸준한 도전자"
            maxLength={50}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
            style={{
              borderColor: "var(--color-border-default)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor =
                "var(--color-border-focus)";
              e.target.style.boxShadow = `0 0 0 2px var(--color-border-focus)`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor =
                "var(--color-border-default)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* 도전과제 설명 */}
        <div>
          <label
            htmlFor="challenge-description"
            className="block text-sm font-medium mb-2"
            style={{
              color: "var(--color-text-secondary)",
            }}>
            설명 *
          </label>
          <textarea
            id="challenge-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 미션을 100개 완료했습니다!"
            maxLength={200}
            rows={2}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 resize-none"
            style={{
              borderColor: "var(--color-border-default)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor =
                "var(--color-border-focus)";
              e.target.style.boxShadow = `0 0 0 2px var(--color-border-focus)`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor =
                "var(--color-border-default)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* 조건 타입 선택 */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{
              color: "var(--color-text-secondary)",
            }}>
            달성 조건 *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                {
                  value: "TOTAL_COMPLETIONS",
                  label: "총 미션 완료",
                },
                {
                  value: "DAILY_COMPLETIONS",
                  label: "일일 미션 완료",
                },
                {
                  value: "WEEKLY_COMPLETIONS",
                  label: "주간 미션 완료",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setConditionType(option.value)
                }
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  conditionType === option.value
                    ? "border-2"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                style={{
                  borderColor:
                    conditionType === option.value
                      ? "var(--color-primary-medium)"
                      : undefined,
                  backgroundColor:
                    conditionType === option.value
                      ? "var(--color-primary-light)"
                      : undefined,
                  color:
                    conditionType === option.value
                      ? "var(--color-primary-dark)"
                      : "var(--color-text-secondary)",
                }}>
                {option.label}
              </button>
            ))}
          </div>
          <p
            className="mt-2 text-xs"
            style={{ color: "var(--color-text-muted)" }}>
            {getConditionDescription(conditionType)}
          </p>
        </div>

        {/* 달성 횟수 */}
        <div>
          <label
            htmlFor="required-count"
            className="block text-sm font-medium mb-2"
            style={{
              color: "var(--color-text-secondary)",
            }}>
            달성 횟수 *
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              id="required-count"
              value={requiredCount}
              onChange={(e) =>
                setRequiredCount(
                  Math.max(1, parseInt(e.target.value) || 1)
                )
              }
              min={1}
              max={10000}
              className="w-32 p-3 border rounded-lg focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border-default)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor =
                  "var(--color-border-focus)";
                e.target.style.boxShadow = `0 0 0 2px var(--color-border-focus)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor =
                  "var(--color-border-default)";
                e.target.style.boxShadow = "none";
              }}
            />
            <span
              style={{
                color: "var(--color-text-secondary)",
              }}>
              회
            </span>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(false);
            }}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-lg border transition-colors"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-text-secondary)",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor =
                  "var(--color-bg-hover)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "transparent";
            }}>
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-lg text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            style={{
              backgroundColor:
                "var(--color-primary-medium)",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor =
                  "var(--color-primary-dark)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--color-primary-medium)";
            }}>
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></span>
                저장 중...
              </>
            ) : (
              <>
                <LuPlus size={16} />
                도전과제 추가
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChallengeCreator;
