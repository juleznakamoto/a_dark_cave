
export interface ButtonClickData {
  user_id: string;
  clicks: Record<string, number>;
  timestamp: string;
  stats?: Record<string, any>;
  resources?: Record<string, any>;
}

export interface GameSaveData {
  user_id: string;
  game_state: any;
  updated_at: string;
  created_at: string;
}

export interface PurchaseData {
  user_id: string;
  item_id: string;
  item_name: string;
  price_paid: number;
  purchased_at: string;
  bundle_id?: string;
}

export interface EmailConfirmationStats {
  allTime: EmailStats;
  last30Days: EmailStats;
  last7Days: EmailStats;
}

export interface EmailStats {
  totalRegistrations: number;
  confirmedUsers: number;
  unconfirmedUsers: number;
  totalConfirmationDelay: number;
  usersWithSignIn: number;
}

export interface DailyActiveUser {
  date: string;
  active_user_count: number;
}

export interface AdminDataResponse {
  clicks: ButtonClickData[];
  saves: GameSaveData[];
  purchases: PurchaseData[];
  dau: DailyActiveUser[];
  totalUserCount: number;
  emailConfirmationStats: EmailConfirmationStats;
}
