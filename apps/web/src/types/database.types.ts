export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'user';
export type ItemStatus = 'draft' | 'active' | 'archived';
export type SquadRole = 'owner' | 'admin' | 'player';
export type MembershipStatus = 'active' | 'pending';
export type MatchMode = 'single' | 'friendly';
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AttendanceStatus = 'playing' | 'maybe' | 'not_playing';
export type FootballPosition = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          preferred_position: string | null;
          secondary_position: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_position?: string | null;
          secondary_position?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_position?: string | null;
          secondary_position?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      squads: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          join_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          join_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          join_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      squad_members: {
        Row: {
          squad_id: string;
          user_id: string;
          role: SquadRole;
          status: MembershipStatus;
          joined_at: string;
        };
        Insert: {
          squad_id: string;
          user_id: string;
          role?: SquadRole;
          status?: MembershipStatus;
          joined_at?: string;
        };
        Update: {
          squad_id?: string;
          user_id?: string;
          role?: SquadRole;
          status?: MembershipStatus;
          joined_at?: string;
        };
        Relationships: [];
      };
      squad_invitations: {
        Row: {
          id: string;
          squad_id: string;
          token_hash: string;
          created_by: string;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          squad_id: string;
          token_hash: string;
          created_by: string;
          expires_at?: string;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          squad_id?: string;
          token_hash?: string;
          created_by?: string;
          expires_at?: string;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          squad_id: string;
          title: string;
          mode: MatchMode;
          turf_name: string;
          starts_at: string;
          players_per_team: number;
          rsvp_deadline: string | null;
          status: MatchStatus;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          squad_id: string;
          title: string;
          mode?: MatchMode;
          turf_name: string;
          starts_at: string;
          players_per_team?: number;
          rsvp_deadline?: string | null;
          status?: MatchStatus;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          squad_id?: string;
          title?: string;
          mode?: MatchMode;
          turf_name?: string;
          starts_at?: string;
          players_per_team?: number;
          rsvp_deadline?: string | null;
          status?: MatchStatus;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      match_attendance: {
        Row: {
          match_id: string;
          user_id: string;
          status: AttendanceStatus;
          updated_at: string;
        };
        Insert: {
          match_id: string;
          user_id: string;
          status?: AttendanceStatus;
          updated_at?: string;
        };
        Update: {
          match_id?: string;
          user_id?: string;
          status?: AttendanceStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      match_waitlist: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          match_id: string;
          name: string;
          side: string;
          color: string;
          formation: string;
          revision: number;
        };
        Insert: {
          id?: string;
          match_id: string;
          name: string;
          side?: string;
          color?: string;
          formation?: string;
          revision?: number;
        };
        Update: {
          id?: string;
          match_id?: string;
          name?: string;
          side?: string;
          color?: string;
          formation?: string;
          revision?: number;
        };
        Relationships: [];
      };
      team_players: {
        Row: {
          id: string;
          team_id: string;
          match_id: string;
          user_id: string;
          position_label: string;
          is_substitute: boolean;
          pitch_x: number | null;
          pitch_y: number | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          match_id: string;
          user_id: string;
          position_label: string;
          is_substitute?: boolean;
          pitch_x?: number | null;
          pitch_y?: number | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          match_id?: string;
          user_id?: string;
          position_label?: string;
          is_substitute?: boolean;
          pitch_x?: number | null;
          pitch_y?: number | null;
        };
        Relationships: [];
      };
      squad_audit: {
        Row: {
          id: string;
          squad_id: string;
          actor_id: string;
          action: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          squad_id: string;
          actor_id: string;
          action: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          squad_id?: string;
          actor_id?: string;
          action?: string;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // Legacy backward-compatible starter table
      sample_items: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          title: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_squad: {
        Args: { p_name: string; p_description: string | null };
        Returns: string;
      };
      join_squad: {
        Args: { p_code: string };
        Returns: string;
      };
      create_squad_invite: {
        Args: { p_squad: string };
        Returns: string;
      };
      join_squad_by_invite: {
        Args: { p_token: string };
        Returns: string;
      };
      approve_member: {
        Args: { p_squad: string; p_user: string };
        Returns: void;
      };
      set_member_role: {
        Args: { p_squad: string; p_user: string; p_role: string };
        Returns: void;
      };
      remove_squad_member: {
        Args: { p_squad: string; p_user: string };
        Returns: void;
      };
      transfer_squad_owner: {
        Args: { p_squad: string; p_new_owner: string };
        Returns: void;
      };
      create_match: {
        Args: {
          p_squad: string;
          p_title: string;
          p_mode: string;
          p_turf_name: string;
          p_starts_at: string;
          p_players_per_team: number;
          p_rsvp_deadline?: string | null;
        };
        Returns: string;
      };
      update_match: {
        Args: {
          p_match: string;
          p_title: string;
          p_turf_name: string;
          p_starts_at: string;
          p_status: string;
          p_rsvp_deadline?: string | null;
        };
        Returns: void;
      };
      set_attendance: {
        Args: { p_match: string; p_status: string; p_admin_override?: boolean };
        Returns: void;
      };
      join_waitlist: {
        Args: { p_match: string };
        Returns: number;
      };
      leave_waitlist: {
        Args: { p_match: string };
        Returns: void;
      };
      get_match_waitlist: {
        Args: { p_match: string };
        Returns: Array<{
          id: string;
          match_id: string;
          user_id: string;
          created_at: string;
          queue_position: number;
          display_name: string | null;
          avatar_url: string | null;
          preferred_position: string | null;
        }>;
      };
      assign_team_player: {
        Args: { p_team: string; p_user: string; p_position: string };
        Returns: void;
      };
      remove_team_player: {
        Args: { p_match: string; p_user: string };
        Returns: void;
      };
      save_team_formation: {
        Args: {
          p_team: string;
          p_formation: string;
          p_expected_revision: number;
          p_positions: Json;
        };
        Returns: number;
      };
      is_admin: {
        Args: { check_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
