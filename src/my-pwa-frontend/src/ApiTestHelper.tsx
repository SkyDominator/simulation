// src/ApiTestHelper.tsx
import { supabase } from './supabaseClient';

function ApiTestHelper() {
  // 테스트용 사용자 정보
  const testEmail = 'test@example.com'; // Supabase에 생성한 테스트 사용자 이메일
  const testPassword = 'AFa8HuE@Q#VVmDR'; // Supabase에 생성한 테스트 사용자 비밀번호

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (error) console.error('Login Error:', error.message);
    else console.log('Login Success:', data);
  };

  const printToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error.message);
      return;
    }
    if (data.session) {
      console.log('--- COPY YOUR TOKEN BELOW ---');
      console.log(data.session.access_token);
      console.log('-----------------------------');
    } else {
      console.log('No active session. Please log in first.');
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h1>API Test Helper</h1>
      <button onClick={handleLogin}>1. Login as Test User</button>
      <button onClick={printToken}>2. Print JWT Token to Console</button>
    </div>
  );
}

export default ApiTestHelper;