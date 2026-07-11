import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { authApi } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';

type Phase = 'loading' | 'waiting' | 'confirmed' | 'expired' | 'error';

export default function Login() {
  const { login, token } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [deepLink, setDeepLink] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (token) navigate('/', { replace: true }); }, [token]);

  const startSession = async () => {
    setPhase('loading');
    try {
      const { data } = await authApi.start();
      setDeepLink(data.deep_link);
      setLoginToken(data.login_token);
      setPhase('waiting');
      startPolling(data.login_token);
    } catch {
      setPhase('error');
    }
  };

  const startPolling = (token: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await authApi.status(token);
        if (data.status === 'confirmed') {
          clearInterval(pollRef.current!);
          const confirm = await authApi.confirm(token);
          login(confirm.data.token, confirm.data.user);
          setPhase('confirmed');
          navigate('/', { replace: true });
        } else if (data.status === 'expired') {
          clearInterval(pollRef.current!);
          setPhase('expired');
        }
      } catch { clearInterval(pollRef.current!); setPhase('error'); }
    }, 1500);
  };

  useEffect(() => {
    startSession();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="card max-w-sm w-full text-center space-y-5 dark:border dark:border-gray-700">
        <h1 className="text-2xl font-bold text-blue-700">🤖 تسجيل الدخول</h1>

        {phase === 'loading' && (
          <div className="text-gray-500 animate-pulse">جاري الإعداد...</div>
        )}

        {phase === 'waiting' && (
          <>
            <p className="text-gray-600 text-sm">
              افتح البوت واضغط <strong>Start</strong>، وشارك رقم هاتفك إذا طُلب منك (أول مرة فقط).
            </p>
            {deepLink && (
              <div className="flex justify-center">
                <QRCodeSVG value={deepLink} size={180} />
              </div>
            )}
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block"
            >
              📱 افتح البوت وسجّل دخول
            </a>
            <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
              <span className="animate-spin inline-block">⏳</span>
              <span>في انتظار التأكيد...</span>
            </div>
          </>
        )}

        {phase === 'expired' && (
          <>
            <p className="text-red-500">انتهت صلاحية الرابط (5 دقائق).</p>
            <button className="btn-primary w-full" onClick={startSession}>🔄 إنشاء رابط جديد</button>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="text-red-500">حدث خطأ. تأكد من اتصالك بالإنترنت.</p>
            <button className="btn-primary w-full" onClick={startSession}>🔄 إعادة المحاولة</button>
          </>
        )}
      </div>
    </div>
  );
}
