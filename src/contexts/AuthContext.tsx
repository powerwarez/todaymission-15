import React, { createContext, useState, useEffect, useContext, ReactNode, useRef, useCallback } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  timeZone: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const timeZone = "Asia/Seoul";
  
  // 신규 사용자 user_info 생성 중복 방지 플래그
  const isCreatingUserInfo = useRef(false);

  // 신규 사용자의 user_info 레코드 생성 함수
  const ensureUserInfoExists = useCallback(async (userId: string) => {
    if (isCreatingUserInfo.current) return;
    
    try {
      isCreatingUserInfo.current = true;
      
      // user_info 테이블에 해당 사용자 데이터가 있는지 확인
      const { data: existingUserInfo, error: checkError } = await supabase
        .from('user_info')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) {
        console.error('[AuthContext] user_info 확인 중 오류:', checkError);
        return;
      }
      
      // 이미 존재하면 생성하지 않음
      if (existingUserInfo) {
        console.log('[AuthContext] user_info가 이미 존재합니다.');
        return;
      }
      
      // 신규 사용자이므로 user_info 레코드 생성
      console.log('[AuthContext] 신규 사용자 감지, user_info 생성 시작...');
      const { error: insertError } = await supabase
        .from('user_info')
        .insert({
          user_id: userId,
          child_name: '고운이',
          pin_code: '0000',
          weekly_reward_goal: '이번주에 미션을 모두 달성해서 하고 싶은 것',
          theme_preference: 'summerSky',
        });
      
      if (insertError) {
        console.error('[AuthContext] user_info 생성 중 오류:', insertError);
        return;
      }
      
      console.log('[AuthContext] user_info 생성 완료!');
    } catch (err) {
      console.error('[AuthContext] ensureUserInfoExists 오류:', err);
    } finally {
      isCreatingUserInfo.current = false;
    }
  }, []);

  useEffect(() => {
    // 타임아웃 설정 (10초)
    const SESSION_TIMEOUT = 10000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const getSession = async () => {
      // 타임아웃 설정 - 10초 후에도 로딩 중이면 강제로 로딩 해제
      timeoutId = setTimeout(() => {
        console.warn('[AuthContext] Session loading timeout. Clearing session and forcing loading to false.');
        setSession(null);
        setUser(null);
        setLoading(false);
        // 손상된 세션 데이터 정리
        try {
          localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
        } catch (e) {
          console.error('[AuthContext] Failed to clear local storage:', e);
        }
      }, SESSION_TIMEOUT);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // 타임아웃 클리어
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (error) {
          console.error('Error getting session:', error);
          // 세션 에러 시 로그아웃 처리
          if (error.message?.includes('session') || error.message?.includes('token')) {
            console.warn('[AuthContext] Session error detected, signing out...');
            await supabase.auth.signOut();
          }
        }
        setSession(session);
        setUser(session?.user ?? null);
        
        // 세션이 있으면 user_info 확인/생성
        if (session?.user) {
          await ensureUserInfoExists(session.user.id);
        }
      } catch (err) {
        console.error('Failed to get session:', err);
        // 타임아웃 클리어
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } finally {
        setLoading(false);
      }
    };

    getSession();
    
    // 클린업 함수에서 타임아웃 클리어
    const cleanupTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          setSession(session);
          setUser(session?.user ?? null);
          
          // SIGNED_IN 이벤트 시 user_info 확인/생성 (신규 가입 포함)
          if (event === 'SIGNED_IN' && session?.user) {
            await ensureUserInfoExists(session.user.id);
          }
          
          setLoading(false);
        }
      );

      return () => {
        cleanupTimeout();
        if (authListener?.subscription) {
          authListener.subscription.unsubscribe();
        }
      };
    } catch (err) {
      console.error('Error setting up auth listener:', err);
      setLoading(false);
      return () => {
        cleanupTimeout();
      };
    }
  }, [ensureUserInfoExists]);

  const logout = async () => {
    try {
      // Supabase 세션 종료
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Error logging out:', error);
      }
      
      // 로컬 스토리지에서 Supabase 관련 데이터 모두 삭제
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('[AuthContext] Cleared Supabase session data from localStorage');
      } catch (e) {
        console.error('[AuthContext] Failed to clear localStorage:', e);
      }
      
      // 상태 초기화
      setSession(null);
      setUser(null);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  const value = {
    session,
    user,
    loading,
    logout,
    timeZone,
  };

  return (
    <AuthContext.Provider value={value}>
      {children} {/* 항상 children 렌더링 */}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 