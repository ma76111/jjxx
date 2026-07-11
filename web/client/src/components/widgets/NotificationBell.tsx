import { useEffect, useState } from 'react';
import { notificationsApi } from '../../api/notifications.api';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = () => notificationsApi.getUnreadCount()
      .then(r => setCount(r.data.unread_count))
      .catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      aria-label={`${count} إشعار غير مقروء`}
    >
      🔔
      {count > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
