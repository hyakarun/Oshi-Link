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
  description?: string;
  image_url?: string;
  source_url?: string;
  verified?: boolean;
  disputed?: boolean;
};

export type User = { 
  id: string; 
  name: string; 
  email: string;
  avatar_url?: string;
};

export type View = 'month' | 'week' | 'day';
