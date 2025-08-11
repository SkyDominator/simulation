import React from 'react';
import { Button } from '../components/Button';
import { supabase } from '../supabaseClient';

const LoginPage: React.FC = () => {
    const handleSocialLogin = async (provider: 'google' | 'kakao') => {
        try {
            await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin
                }
            });
        } catch (error) {
            console.error(`${provider} login error:`, error);
            alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <h1 className="text-2xl font-bold mb-6 text-center">로그인</h1>
                <div className="space-y-4">
                    <Button 
                        onClick={() => handleSocialLogin('google')} 
                        className="w-full bg-red-500 hover:bg-red-600"
                    >
                        Google로 로그인
                    </Button>
                    <Button 
                        onClick={() => handleSocialLogin('kakao')} 
                        className="w-full bg-yellow-500 hover:bg-yellow-600"
                    >
                        Kakao로 로그인
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
