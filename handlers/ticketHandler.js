import { findUserByTelegramId } from '../services/userService.js';
import { createTicket, getUserTickets, getTicketWithMessages, replyToTicket } from '../services/ticketService.js';
import { setState, getState, clearState } from '../utils/state.js';
import { t } from '../utils/i18n.js';

function extractContext(msgOrQuery) {
  const telegramId = msgOrQuery.from?.id ?? msgOrQuery.message?.from?.id;
  const chatId     = msgOrQuery.chat?.id ?? msgOrQuery.message?.chat?.id;
  return { telegramId, chatId };
}

// ── قائمة التذاكر ──
export async function handleTicketsMenu(bot, msgOrQuery) {
  const { telegramId, chatId } = extractContext(msgOrQuery);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const tickets = await getUserTickets(user.id);
  const buttons = [];

  for (const ticket of tickets.slice(0, 5)) {
    buttons.push([{
      text: `${ticket.status === 'open' ? '🟢' : ticket.status === 'in_progress' ? '🟡' : '🔴'} ${ticket.ticket_no} — ${ticket.subject.slice(0, 30)}`,
      callback_data: `ticket:view:${ticket.id}`,
    }]);
  }
  buttons.push([{ text: t(lang, 'ticket_new_btn'), callback_data: 'ticket:create' }]);

  await bot.sendMessage(chatId, t(lang, 'tickets_title'), {
    reply_markup: { inline_keyboard: buttons },
  });
}

export async function handleCreateTicketStart(bot, query) {
  const telegramId = query.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  setState(telegramId, 'ticket_subject', {});
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(query.message.chat.id, t(lang, 'ticket_subject'));
}

export async function handleTicketMessage(bot, msg) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state || !state.step.startsWith('ticket_')) return;

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const text = msg.text?.trim() || '';

  if (state.step === 'ticket_subject') {
    setState(telegramId, 'ticket_body', { ...state.data, subject: text });
    await bot.sendMessage(msg.chat.id, t(lang, 'ticket_body'));
    return;
  }

  if (state.step === 'ticket_body') {
    clearState(telegramId);
    const result = await createTicket({ userId: user.id, subject: state.data.subject, body: text });
    await bot.sendMessage(msg.chat.id, t(lang, 'ticket_created', { no: result.ticket_no }));
    return;
  }

  if (state.step === 'ticket_reply') {
    clearState(telegramId);
    const result = await replyToTicket({ ticketId: state.data.ticket_id, senderId: user.id, body: text, isAdmin: false });
    await bot.sendMessage(msg.chat.id, result.success ? t(lang, 'ticket_reply') : t(lang, 'error_generic'));
    return;
  }
}

export async function handleViewTicket(bot, query, ticketId) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const ticket = await getTicketWithMessages(parseInt(ticketId), user.id);
  if (!ticket) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'ticket_not_found') });
    return;
  }

  await bot.answerCallbackQuery(query.id);

  const lines = [
    `🎫 ${ticket.ticket_no}`,
    `📌 ${ticket.subject}`,
    `${t(lang, 'ticket_priority_label')} ${ticket.priority}`,
    `${t(lang, 'ticket_status_label')} ${ticket.status}`,
    ``,
    t(lang, 'ticket_convo'),
    ...ticket.messages.map(m => `${m.is_admin ? t(lang, 'ticket_admin_sender') : t(lang, 'ticket_user_sender')}: ${m.body}`),
  ];

  await bot.sendMessage(chatId, lines.join('\n'), {
    reply_markup: {
      inline_keyboard: [
        [{ text: t(lang, 'ticket_reply_btn'), callback_data: `ticket:reply:${ticketId}` }],
      ],
    },
  });
}

export async function handleReplyTicket(bot, query, ticketId) {
  const telegramId = query.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  setState(telegramId, 'ticket_reply', { ticket_id: parseInt(ticketId) });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(query.message.chat.id, t(lang, 'ticket_body'));
}
