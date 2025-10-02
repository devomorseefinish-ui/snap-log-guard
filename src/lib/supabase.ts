export { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in_time: string;
  photo_url: string;
  location: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  profiles?: Profile;
}
