import React from 'react';
// import { useUserBadges } from '../hooks/useUserBadges'; // TODO: Implement this hook
// import { useWeeklyMissionStats } from '../hooks/useWeeklyMissionStats'; // TODO: Implement this hook
// import { Badge } from '../types'; // Unused for now
import { EarnedBadge } from '../types';
import { LuBadgeCheck, LuCalendarClock } from 'react-icons/lu';

// Placeholder data until hooks are implemented
const placeholderBadges: EarnedBadge[] = [
  // Add some placeholder badge objects if needed for layout testing
  // { id: '1', user_id: 'user1', badge_id: 'b1', earned_at: new Date().toISOString(), badge: { id: 'b1', name: '첫 미션 달성', image_path: '/badges/first_mission.png', created_at: new Date().toISOString() } },
  // { id: '2', user_id: 'user1', badge_id: 'b2', earned_at: new Date().toISOString(), badge: { id: 'b2', name: '일주일 연속', image_path: '/badges/week_streak.png', created_at: new Date().toISOString() } },
];

const HallOfFamePage: React.FC = () => {
  // TODO: Replace placeholders with actual data hooks
  const { badges: earnedBadges, loading: badgesLoading, error: badgesError } = {
    badges: placeholderBadges,
    loading: false,
    error: null,
  }// useUserBadges();

  // TODO: Implement weekly stats logic
  const { weeklyStats, loading: statsLoading, error: statsError } = {
    weeklyStats: null, // Replace with actual data structure
    loading: false,
    error: null,
  } // useWeeklyMissionStats();

  // Use weeklyStats to avoid unused variable error (replace with actual usage later)
  console.log('Weekly Stats (placeholder):', weeklyStats);

  const isLoading = badgesLoading || statsLoading;
  const error = badgesError || statsError;

  // Function to get image URL from Supabase Storage (implement based on your bucket structure)
  const getBadgeImageUrl = (imagePath: string): string => {
    // Replace with your actual Supabase storage URL logic
    // Example: return supabase.storage.from('badges').getPublicUrl(imagePath).data.publicUrl;
    return imagePath || '/placeholder_badge.png'; // Return placeholder if path is empty
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-pink-700 mb-8">명예의 전당</h1>

      {isLoading && <p>명예의 전당 정보를 불러오는 중...</p>}
      {error && <p className="text-red-500">오류: {error}</p>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Badge Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-pink-600 mb-6 flex items-center">
              <LuBadgeCheck className="mr-2" /> 획득한 배지
            </h2>
            {earnedBadges.length === 0 ? (
              <p className="text-center text-gray-500">아직 획득한 배지가 없어요. 미션을 완료하고 도전과제를 달성해 보세요!</p>
            ) : (
              <div className="relative w-full aspect-square max-w-md mx-auto">
                 {/* Basic Honeycomb Layout - Enhance with more precise positioning if needed */}
                <div
                    className="grid gap-1"
                    style={{
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        // Basic attempt at honeycomb - may need adjustments or a library
                    }}
                 >
                  {earnedBadges.map((earnedBadge, _index) => ( // eslint-disable-line @typescript-eslint/no-unused-vars
                     <div
                       key={earnedBadge.id}
                       className="relative aspect-square flex items-center justify-center group"
                       style={{
                         // Hexagon shape using clip-path (browser support varies)
                         clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                         backgroundColor: '#fce7f3', // light pink bg for hexagon
                         // Add positioning logic here for spiral effect if desired
                       }}
                     >
                       <img
                         src={getBadgeImageUrl(earnedBadge.badge.image_path)}
                         alt={earnedBadge.badge.name}
                         className="w-3/4 h-3/4 object-contain transition-transform duration-300 group-hover:scale-110"
                       />
                       {/* Tooltip for badge name - basic example */}
                       <span className="absolute bottom-0 mb-[-25px] left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                         {earnedBadge.badge.name}
                       </span>
                     </div>
                  ))}
                 </div>
              </div>
            )}
          </div>

          {/* Weekly Stats Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-pink-600 mb-6 flex items-center">
                <LuCalendarClock className="mr-2" /> 주간 달성 현황
            </h2>
            <p className="text-gray-500">이 기능은 아직 준비 중입니다.</p>
            {/* TODO: Display weekly completion stats here */}
            {/* Example: A calendar view or a list showing completed missions per day */}
          </div>
        </div>
      )}
    </div>
  );
};

export default HallOfFamePage; 