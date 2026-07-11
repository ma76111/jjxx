export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  language: string;
  balance: number;
  exchange_points: number;
  is_banned: number;
  ban_status: string;
  is_admin: boolean;
  phone_verified: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  owner_id: number;
  owner_username?: string;
  bot_name: string | null;
  referral_link: string | null;
  required_count: number;
  completed_count: number;
  task_type: 'paid' | 'exchange';
  reward_per_user: number;
  verification_instructions: string | null;
  proof_type: 'text' | 'images' | 'both';
  status: 'active' | 'paused' | 'completed' | 'expired' | 'cancelled';
  country_code: string | null;
  created_at: string;
}

export interface Submission {
  id: number;
  task_id: number;
  user_id: number;
  username?: string;
  telegram_id?: number;
  proof_text: string | null;
  proof_images: string | null;
  status: 'pending' | 'accept' | 'reject';
  reject_type: 'retry' | 'final' | null;
  reject_message: string | null;
  can_retry: number;
  improvement_deadline: string | null;
  bot_name?: string;
  task_type?: string;
  reward_per_user?: number;
  created_at: string;
  reviewed_at: string | null;
}

export interface Deposit {
  id: number;
  user_id: number;
  amount: number;
  method: string;
  binance_id: string | null;
  txid: string | null;
  network: string | null;
  status: 'pending' | 'accept' | 'reject' | 'pending_verification';
  created_at: string;
}

export interface Withdrawal {
  id: number;
  user_id: number;
  amount: number;
  method: string;
  wallet_address: string | null;
  network: string | null;
  status: 'pending' | 'completed' | 'rejected';
  eligible_at: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_no: string;
  user_id: number;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  is_admin: number;
  body: string;
  created_at: string;
}

export interface TicketWithMessages extends Ticket {
  messages: TicketMessage[];
}

export interface Stats {
  balance: number;
  exchange_points: number;
  active_tasks: number;
  completed_submissions: number;
  pending_submissions: number;
  total_deposited: number;
  total_withdrawn: number;
  rating_avg: number | null;
}

export interface AdminStats {
  total_users: number;
  active_tasks: number;
  pending_deposits: number;
  pending_withdrawals: number;
  pending_submissions: number;
  open_tickets: number;
  pending_appeals: number;
  total_balance_held: number;
  total_deposited: number;
  total_withdrawn: number;
}

export interface Violation {
  id: number;
  user_id: number;
  type: string;
  points: number;
  track: 'trust' | 'security';
  reason: string | null;
  expires_at: string | null;
  status: 'active' | 'expired' | 'pending' | 'dismissed';
  created_at: string;
}

export interface Proposal {
  id: number;
  proposer_id: number;
  proposer_username?: string;
  action_type: string;
  target_type: string;
  target_id: number | null;
  payload: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  approved_by: number | null;
  approval_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}
