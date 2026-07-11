import React, { createContext, useContext, useEffect, useState } from 'react';

// All UI strings for the web client — separate from bot i18n
const translations: Record<string, Record<string, string>> = {
  ar: {
    dir: 'rtl',
    // nav
    home: 'الرئيسية', tasks: 'المهام المتاحة', myTasks: 'مهامي',
    submissions: 'إثباتاتي', wallet: 'المحفظة', tickets: 'الدعم',
    notifications: 'الإشعارات', logout: '🚪 تسجيل خروج',
    admin: 'الأدمن', dashboard: 'لوحة التحكم',
    // stats
    balance: 'الرصيد (USDT)', barterPoints: 'نقاط التبادل',
    activeTasks: 'المهام النشطة', acceptedProofs: 'إثباتات مقبولة',
    pendingProofs: 'إثباتات معلقة', totalDeposited: 'مجموع الإيداعات',
    totalWithdrawn: 'مجموع السحوبات', rating: 'تقييمك',
    // common
    loading: 'جاري التحميل...', noData: 'لا توجد بيانات.',
    changeLanguage: '🌐 اللغة', markAllRead: 'تعليم الكل مقروء',
    noNotifications: 'لا توجد إشعارات',
    save: 'حفظ', cancel: 'إلغاء', back: 'رجوع',
    confirm: 'تأكيد', search: 'بحث', create: 'إنشاء',
    // tasks page
    availableTasks: '📝 المهام المتاحة',
    tasksAvailable: 'مهمة متاحة',
    submitProof: '▶️ تقديم إثبات',
    enterProof: 'أرسل نص الإثبات:',
    remaining: 'متبقي',
    taskLink: '🔗 رابط المهمة',
    prevPage: '◀ السابق', nextPage: 'التالي ▶', page: 'صفحة',
    proofSent: '✅ تم إرسال الإثبات بنجاح.',
    // my tasks
    myTasksTitle: '🗂 مهامي',
    newTask: '➕ مهمة جديدة',
    createTask: 'إنشاء مهمة جديدة',
    taskType: 'نوع المهمة', paid: '💵 مدفوعة', exchange: '🔄 تبادل',
    botName: 'اسم البوت @example_bot', referralLink: 'رابط الإحالة',
    requiredCount: 'عدد الأشخاص', rewardPerUser: 'المكافأة لكل شخص (USDT)',
    proofType: 'نوع الإثبات', proofText: '✍️ نص', proofImages: '📸 صور', proofBoth: '📤 كلاهما',
    verificationInstructions: 'تعليمات التحقق (اختياري)',
    taskCreated: 'تم إنشاء المهمة',
    charged: 'خُصم',
    insufficientBalance: 'الرصيد غير كافٍ. المطلوب:',
    noTasksYet: 'لا توجد مهام بعد.',
    pause: '⏸ إيقاف', resume: '▶️ استئناف',
    statusActive: '🟢 نشطة', statusPaused: '🟡 موقوفة',
    statusCompleted: '✅ مكتملة', statusExpired: '🔴 منتهية', statusCancelled: '⚫ ملغاة',
    // submissions
    submissionsTitle: '📤 إثباتاتي',
    noSubmissionsYet: 'لم تقدّم إثباتات بعد.',
    proof: 'إثبات', task: 'مهمة',
    rejectionReason: 'سبب الرفض:',
    deadlineUntil: 'مهلة حتى:',
    statusPending: '⏳ معلق', statusAccepted: '✅ مقبول', statusRejected: '❌ مرفوض',
    // wallet
    walletTitle: '💰 المحفظة',
    tabBalance: '💰 الرصيد', tabDeposit: '📥 إيداع',
    tabWithdraw: '📤 سحب', tabHistory: '📋 السجل',
    depositRequest: 'طلب إيداع', withdrawRequest: 'طلب سحب',
    amount: 'المبلغ (USDT)', method: 'طريقة الدفع',
    txid: '🔹 TXID', binancePay: '🔸 Binance Pay ID',
    txidInput: 'TXID المعاملة', binanceInput: 'Binance Pay ID',
    walletAddress: 'عنوان المحفظة',
    sendDepositReq: '📥 إرسال طلب إيداع',
    sendWithdrawReq: '📤 إرسال طلب سحب',
    depositsHistory: '📥 الإيداعات', withdrawalsHistory: '📤 السحوبات',
    noDeposits: 'لا توجد إيداعات.', noWithdrawals: 'لا توجد سحوبات.',
    exchangePoints: 'نقاط تبادل',
    belowMin: 'الحد الأدنى:',
    insufficientBalance2: '❌ رصيد غير كافٍ.',
    dailyLimitExceeded: '❌ تجاوزت الحد اليومي.',
    weeklyLimitExceeded: '❌ تجاوزت الحد الأسبوعي.',
    // tickets
    ticketsTitle: '🎫 تذاكر الدعم',
    newTicket: '➕ تذكرة جديدة',
    subject: 'الموضوع', message: 'رسالتك...',
    priority: 'الأولوية',
    priorityLow: 'منخفضة', priorityMedium: 'متوسطة',
    priorityHigh: 'عالية', priorityUrgent: 'عاجلة',
    ticketCreated: 'تم إنشاء التذكرة',
    ticketError: '❌ خطأ في إنشاء التذكرة.',
    noTickets: 'لا توجد تذاكر.',
    adminLabel: '👮 أدمن', youLabel: '👤 أنت',
    replyPlaceholder: 'ردّك...', send: '↩️ إرسال',
    // notifications
    notificationsTitle: '🔔 الإشعارات',
    listTab: 'القائمة', prefsTab: '⚙️ التفضيلات',
    markAllReadBtn: '✓ تعليم الكل كمقروء',
    noNotificationsList: 'لا توجد إشعارات.',
    prefsDesc: 'اختر الإشعارات التي تريد استلامها.',
    // dashboard
    welcomeUser: '👋 أهلاً،',
  },
  en: {
    dir: 'ltr',
    home: 'Home', tasks: 'Available Tasks', myTasks: 'My Tasks',
    submissions: 'My Submissions', wallet: 'Wallet', tickets: 'Support',
    notifications: 'Notifications', logout: '🚪 Logout',
    admin: 'Admin', dashboard: 'Dashboard',
    balance: 'Balance (USDT)', barterPoints: 'Barter Points',
    activeTasks: 'Active Tasks', acceptedProofs: 'Accepted Proofs',
    pendingProofs: 'Pending Proofs', totalDeposited: 'Total Deposited',
    totalWithdrawn: 'Total Withdrawn', rating: 'Your Rating',
    loading: 'Loading...', noData: 'No data.',
    changeLanguage: '🌐 Language', markAllRead: 'Mark all read',
    noNotifications: 'No notifications',
    save: 'Save', cancel: 'Cancel', back: 'Back',
    confirm: 'Confirm', search: 'Search', create: 'Create',
    availableTasks: '📝 Available Tasks',
    tasksAvailable: 'tasks available',
    submitProof: '▶️ Submit Proof',
    enterProof: 'Enter your proof text:',
    remaining: 'remaining',
    taskLink: '🔗 Task Link',
    prevPage: '◀ Prev', nextPage: 'Next ▶', page: 'Page',
    proofSent: '✅ Proof submitted successfully.',
    myTasksTitle: '🗂 My Tasks',
    newTask: '➕ New Task',
    createTask: 'Create New Task',
    taskType: 'Task Type', paid: '💵 Paid', exchange: '🔄 Exchange',
    botName: 'Bot name @example_bot', referralLink: 'Referral link',
    requiredCount: 'Number of people', rewardPerUser: 'Reward per person (USDT)',
    proofType: 'Proof type', proofText: '✍️ Text', proofImages: '📸 Images', proofBoth: '📤 Both',
    verificationInstructions: 'Verification instructions (optional)',
    taskCreated: 'Task created',
    charged: 'Charged:',
    insufficientBalance: 'Insufficient balance. Required:',
    noTasksYet: 'No tasks yet.',
    pause: '⏸ Pause', resume: '▶️ Resume',
    statusActive: '🟢 Active', statusPaused: '🟡 Paused',
    statusCompleted: '✅ Completed', statusExpired: '🔴 Expired', statusCancelled: '⚫ Cancelled',
    submissionsTitle: '📤 My Submissions',
    noSubmissionsYet: 'No submissions yet.',
    proof: 'Proof', task: 'Task',
    rejectionReason: 'Rejection reason:',
    deadlineUntil: 'Deadline until:',
    statusPending: '⏳ Pending', statusAccepted: '✅ Accepted', statusRejected: '❌ Rejected',
    walletTitle: '💰 Wallet',
    tabBalance: '💰 Balance', tabDeposit: '📥 Deposit',
    tabWithdraw: '📤 Withdraw', tabHistory: '📋 History',
    depositRequest: 'Deposit Request', withdrawRequest: 'Withdraw Request',
    amount: 'Amount (USDT)', method: 'Payment method',
    txid: '🔹 TXID', binancePay: '🔸 Binance Pay ID',
    txidInput: 'Transaction TXID', binanceInput: 'Binance Pay ID',
    walletAddress: 'Wallet address',
    sendDepositReq: '📥 Submit Deposit Request',
    sendWithdrawReq: '📤 Submit Withdraw Request',
    depositsHistory: '📥 Deposits', withdrawalsHistory: '📤 Withdrawals',
    noDeposits: 'No deposits.', noWithdrawals: 'No withdrawals.',
    exchangePoints: 'barter points',
    belowMin: 'Minimum:',
    insufficientBalance2: '❌ Insufficient balance.',
    dailyLimitExceeded: '❌ Daily limit exceeded.',
    weeklyLimitExceeded: '❌ Weekly limit exceeded.',
    ticketsTitle: '🎫 Support Tickets',
    newTicket: '➕ New Ticket',
    subject: 'Subject', message: 'Your message...',
    priority: 'Priority',
    priorityLow: 'Low', priorityMedium: 'Medium',
    priorityHigh: 'High', priorityUrgent: 'Urgent',
    ticketCreated: 'Ticket created',
    ticketError: '❌ Error creating ticket.',
    noTickets: 'No tickets.',
    adminLabel: '👮 Admin', youLabel: '👤 You',
    replyPlaceholder: 'Your reply...', send: '↩️ Send',
    notificationsTitle: '🔔 Notifications',
    listTab: 'List', prefsTab: '⚙️ Preferences',
    markAllReadBtn: '✓ Mark all as read',
    noNotificationsList: 'No notifications.',
    prefsDesc: 'Choose which notifications you want to receive.',
    welcomeUser: '👋 Welcome,',
  },
  ru: {
    dir: 'ltr',
    home: 'Главная', tasks: 'Доступные задачи', myTasks: 'Мои задачи',
    submissions: 'Мои доказательства', wallet: 'Кошелёк', tickets: 'Поддержка',
    notifications: 'Уведомления', logout: '🚪 Выйти',
    admin: 'Админ', dashboard: 'Панель управления',
    balance: 'Баланс (USDT)', barterPoints: 'Баллы бартера',
    activeTasks: 'Активные задачи', acceptedProofs: 'Принятые доказательства',
    pendingProofs: 'На рассмотрении', totalDeposited: 'Всего пополнено',
    totalWithdrawn: 'Всего выведено', rating: 'Ваш рейтинг',
    loading: 'Загрузка...', noData: 'Нет данных.',
    changeLanguage: '🌐 Язык', markAllRead: 'Отметить все прочитанными',
    noNotifications: 'Нет уведомлений',
    save: 'Сохранить', cancel: 'Отмена', back: 'Назад',
    confirm: 'Подтвердить', search: 'Поиск', create: 'Создать',
    availableTasks: '📝 Доступные задачи',
    tasksAvailable: 'задач доступно',
    submitProof: '▶️ Отправить доказательство',
    enterProof: 'Введите текст доказательства:',
    remaining: 'осталось',
    taskLink: '🔗 Ссылка на задачу',
    prevPage: '◀ Назад', nextPage: 'Вперёд ▶', page: 'Страница',
    proofSent: '✅ Доказательство отправлено.',
    myTasksTitle: '🗂 Мои задачи',
    newTask: '➕ Новая задача',
    createTask: 'Создать новую задачу',
    taskType: 'Тип задачи', paid: '💵 Платная', exchange: '🔄 Обмен',
    botName: 'Имя бота @example_bot', referralLink: 'Реферальная ссылка',
    requiredCount: 'Количество людей', rewardPerUser: 'Награда за человека (USDT)',
    proofType: 'Тип доказательства', proofText: '✍️ Текст', proofImages: '📸 Изображения', proofBoth: '📤 Оба',
    verificationInstructions: 'Инструкции по проверке (необязательно)',
    taskCreated: 'Задача создана',
    charged: 'Списано:',
    insufficientBalance: 'Недостаточно средств. Требуется:',
    noTasksYet: 'Задач пока нет.',
    pause: '⏸ Пауза', resume: '▶️ Возобновить',
    statusActive: '🟢 Активна', statusPaused: '🟡 На паузе',
    statusCompleted: '✅ Завершена', statusExpired: '🔴 Истекла', statusCancelled: '⚫ Отменена',
    submissionsTitle: '📤 Мои доказательства',
    noSubmissionsYet: 'Доказательств пока нет.',
    proof: 'Доказательство', task: 'Задача',
    rejectionReason: 'Причина отклонения:',
    deadlineUntil: 'Срок до:',
    statusPending: '⏳ Ожидание', statusAccepted: '✅ Принято', statusRejected: '❌ Отклонено',
    walletTitle: '💰 Кошелёк',
    tabBalance: '💰 Баланс', tabDeposit: '📥 Пополнить',
    tabWithdraw: '📤 Вывести', tabHistory: '📋 История',
    depositRequest: 'Запрос на пополнение', withdrawRequest: 'Запрос на вывод',
    amount: 'Сумма (USDT)', method: 'Способ оплаты',
    txid: '🔹 TXID', binancePay: '🔸 Binance Pay ID',
    txidInput: 'TXID транзакции', binanceInput: 'Binance Pay ID',
    walletAddress: 'Адрес кошелька',
    sendDepositReq: '📥 Отправить запрос на пополнение',
    sendWithdrawReq: '📤 Отправить запрос на вывод',
    depositsHistory: '📥 Пополнения', withdrawalsHistory: '📤 Выводы',
    noDeposits: 'Нет пополнений.', noWithdrawals: 'Нет выводов.',
    exchangePoints: 'баллов обмена',
    belowMin: 'Минимум:',
    insufficientBalance2: '❌ Недостаточно средств.',
    dailyLimitExceeded: '❌ Дневной лимит превышен.',
    weeklyLimitExceeded: '❌ Недельный лимит превышен.',
    ticketsTitle: '🎫 Обращения в поддержку',
    newTicket: '➕ Новое обращение',
    subject: 'Тема', message: 'Ваше сообщение...',
    priority: 'Приоритет',
    priorityLow: 'Низкий', priorityMedium: 'Средний',
    priorityHigh: 'Высокий', priorityUrgent: 'Срочный',
    ticketCreated: 'Обращение создано',
    ticketError: '❌ Ошибка при создании обращения.',
    noTickets: 'Нет обращений.',
    adminLabel: '👮 Админ', youLabel: '👤 Вы',
    replyPlaceholder: 'Ваш ответ...', send: '↩️ Отправить',
    notificationsTitle: '🔔 Уведомления',
    listTab: 'Список', prefsTab: '⚙️ Настройки',
    markAllReadBtn: '✓ Отметить все как прочитанные',
    noNotificationsList: 'Нет уведомлений.',
    prefsDesc: 'Выберите уведомления, которые хотите получать.',
    welcomeUser: '👋 Добро пожаловать,',
  },
};

// Fallback to Arabic for fa, extend en for tr
translations.fa = { ...translations.ar, dir: 'rtl' };
translations.tr = { ...translations.en, dir: 'ltr' };

interface I18nContextType {
  lang: string;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
  setLang: (lang: string) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ar', t: (k) => k, dir: 'rtl', setLang: () => {},
});

export function I18nProvider({ children, initialLang = 'ar' }: { children: React.ReactNode; initialLang?: string }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = (newLang: string) => {
    setLangState(newLang);
    const dir = (translations[newLang]?.dir ?? 'rtl') as 'rtl' | 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    setLang(lang);
  }, [lang]);

  const t = (key: string): string => {
    return translations[lang]?.[key] ?? translations['ar']?.[key] ?? key;
  };

  const dir = (translations[lang]?.dir ?? 'rtl') as 'rtl' | 'ltr';

  return (
    <I18nContext.Provider value={{ lang, t, dir, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
