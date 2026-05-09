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
};

export type Event = {
  id: string;
  group_id: string;
  title: string;
  date: string;
  end_time?: string;
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
  notification_timing?: '10m' | '1h' | '1d' | '1w'; // 無料は10m固定
};

export type View = 'month' | 'week' | 'day';
