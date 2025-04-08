import React, { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabaseClient'; // 경로 별칭 대신 상대 경로 사용
import { supabase } from '../lib/supabaseClient'; 
import { LuLoader, LuTriangle } from 'react-icons/lu'; // 아이콘 이름 수정

// Badge 타입 정의 (Supabase 스키마 기반)
interface Badge {
  id: string;
  name: string;
  description: string | null;
  image_path: string; // Storage 경로
}

// 화면에 표시할 데이터 타입 (Badge + count)
interface DisplayBadge extends Badge {
  count: number; // 해당 사용자의 배지 획득 횟수
  imageUrl: string | null; // 이미지 공개 URL
}

const BadgeSettingsPage: React.FC = () => {
  const [badges, setBadges] = useState<DisplayBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadgeData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. 현재 사용자 정보 가져오기
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          console.log("사용자가 로그인하지 않았습니다.");
          // 실제 앱에서는 로그인 페이지로 리디렉션 등의 처리가 필요할 수 있음
          setLoading(false);
          return;
        }

        // 2. 모든 배지 목록 가져오기 (badges 테이블)
        const { data: allBadges, error: badgesError } = await supabase
          .from('badges')
          .select('id, name, description, image_path'); // 필요한 모든 컬럼 선택

        if (badgesError) throw badgesError;
        if (!allBadges) throw new Error("배지 정보를 가져올 수 없습니다.");

        // 3. 현재 사용자의 배지 획득 기록 가져오기 (earned_badges 테이블)
        const { data: earnedBadgesData, error: earnedBadgesError } = await supabase
          .from('earned_badges')
          .select('badge_id') // 획득 횟수 계산에 필요한 badge_id만 선택
          .eq('user_id', user.id);

        if (earnedBadgesError) throw earnedBadgesError;

        // 4. 배지별 획득 횟수 계산
        const badgeCounts: { [key: string]: number } = {};
        if (earnedBadgesData) {
          earnedBadgesData.forEach((record: { badge_id: string }) => {
            badgeCounts[record.badge_id] = (badgeCounts[record.badge_id] || 0) + 1;
          });
        }

        // 5. 배지 이미지 URL 생성 및 데이터 결합
        const displayDataPromises = (allBadges as Badge[]).map(async (badge) => {
          let imageUrl: string | null = null;
          if (badge.image_path) {
            // Supabase Storage에서 공개 URL 가져오기 (버킷 이름 확인 필요)
            // 예시: 'badges' 버킷 사용
            const { data: urlData } = supabase.storage.from('badges').getPublicUrl(badge.image_path);
            imageUrl = urlData?.publicUrl || null;
          }
          return {
            ...badge,
            count: badgeCounts[badge.id] || 0,
            imageUrl: imageUrl,
          };
        });

        const displayData = await Promise.all(displayDataPromises);
        setBadges(displayData);

      } catch (err: unknown) {
        console.error("데이터 로딩 중 에러 발생:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else if (typeof err === 'string') {
          setError(err);
        } else {
          setError("데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBadgeData();
  }, []); // 컴포넌트 마운트 시 1회 실행

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 페이지 제목 */}
      <h1 className="text-3xl font-bold text-indigo-700 mb-8 text-center">도전과제</h1>

      {/* 로딩 상태 표시 */}
      {loading && (
        <div className="flex justify-center items-center py-10">
          <LuLoader className="animate-spin text-indigo-500" size={40} />
          <p className="ml-3 text-lg text-gray-600">데이터를 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 표시 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 max-w-2xl mx-auto" role="alert">
          <LuTriangle className="inline mr-2" />
          <span className="block sm:inline">오류가 발생했습니다: {error}</span>
        </div>
      )}

      {/* 데이터 로딩 완료 및 에러 없는 경우 */}
      {!loading && !error && (
        <div>
          <h2 className="text-2xl font-semibold text-indigo-600 mb-6 text-center">달성 가능한 배지 목록</h2>
          {badges.length > 0 ? (
            <ul className="space-y-4 max-w-2xl mx-auto">
              {badges.map((badge) => (
                <li key={badge.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {/* 배지 이미지 표시 */}
                    {badge.imageUrl ? (
                      <img src={badge.imageUrl} alt={badge.name} className="w-14 h-14 object-contain bg-gray-100 rounded p-1" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">No Img</div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{badge.name}</h3>
                      <p className="text-sm text-gray-500">{badge.description || '설명 없음'}</p>
                    </div>
                  </div>
                  {/* 달성 횟수 표시 */}
                  <div className="text-right">
                    <span className={`text-lg font-bold ${badge.count > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                      {badge.count > 0 ? `${badge.count}회 달성` : '미달성'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">표시할 배지가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BadgeSettingsPage; 