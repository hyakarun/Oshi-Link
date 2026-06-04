export type Group = {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  event_count?: number;
  follower_count?: number;
  is_following?: boolean;
  custom_bg_image?: string;
  custom_theme_color?: string;
  is_official?: boolean;
};

export type Event = {
  id: string;
  group_id: string;
  title: string;
  date: string;
  end_time?: string;
  is_all_day?: boolean;
  location?: string;
  category?: string;
  sub_category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  image_url?: string;
  source_url?: string;
  verified?: boolean;
  disputed?: boolean;
  is_tentative?: boolean;
  confirms_count?: number;
  disputes_count?: number;
  creator_name?: string;
  creator_is_official?: boolean;
  added_by_group_official?: boolean;
  group_is_official?: boolean;
  created_at?: string;
  added_by?: string;
  creator_edit_used?: boolean;
  user_vote?: 'confirmed' | 'disputed' | null;
};

export type User = { 
  id: string; 
  name: string; 
  email: string;
  avatar_url?: string;
  premium_status?: 'free' | 'onetime' | 'pro';
  notifications_enabled?: boolean;
  email_enabled?: boolean;
  push_enabled?: boolean;
  is_official?: boolean;
  official_groups?: string[];
  official_application?: {
    status: 'pending' | 'rejected' | 'approved';
    calendar_name: string;
    admin_note?: string | null;
  } | null;
  notification_timing?: '10m' | '1h' | '1d' | '1w'; // 無料は10m固定
};

export type View = 'month' | 'week' | 'day';
