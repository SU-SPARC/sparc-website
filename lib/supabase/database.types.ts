export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      events: {
        Row: {
          cover_media_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          kind: string;
          location: string | null;
          published: boolean;
          recording_url: string | null;
          ref: string;
          slug: string;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cover_media_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind: string;
          location?: string | null;
          published?: boolean;
          recording_url?: string | null;
          ref: string;
          slug: string;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          cover_media_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind?: string;
          location?: string | null;
          published?: boolean;
          recording_url?: string | null;
          ref?: string;
          slug?: string;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      links: {
        Row: {
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          label: string;
          published: boolean;
          sort_order: number;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          label: string;
          published?: boolean;
          sort_order?: number;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          label?: string;
          published?: boolean;
          sort_order?: number;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      media: {
        Row: {
          alt: string;
          blur_data_url: string | null;
          bucket: string;
          bytes: number | null;
          created_at: string;
          created_by: string | null;
          height: number;
          id: string;
          mime: string | null;
          original_name: string | null;
          path: string;
          thumb_path: string | null;
          updated_at: string;
          width: number;
        };
        ComputedFields: never;
        Insert: {
          alt?: string;
          blur_data_url?: string | null;
          bucket?: string;
          bytes?: number | null;
          created_at?: string;
          created_by?: string | null;
          height: number;
          id?: string;
          mime?: string | null;
          original_name?: string | null;
          path: string;
          thumb_path?: string | null;
          updated_at?: string;
          width: number;
        };
        Update: {
          alt?: string;
          blur_data_url?: string | null;
          bucket?: string;
          bytes?: number | null;
          created_at?: string;
          created_by?: string | null;
          height?: number;
          id?: string;
          mime?: string | null;
          original_name?: string | null;
          path?: string;
          thumb_path?: string | null;
          updated_at?: string;
          width?: number;
        };
        Relationships: [];
      };
      members: {
        Row: {
          badges: string[];
          bio: string | null;
          class_year: number;
          created_at: string;
          eboard: boolean;
          id: string;
          linkedin: string | null;
          name: string;
          nickname: string | null;
          participated: number[];
          photo_media_id: string | null;
          published: boolean;
          role: string | null;
          role_history: string[];
          role_term: string | null;
          slug: string;
          sort_order: number;
          status: Database["public"]["Enums"]["member_status"];
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          badges?: string[];
          bio?: string | null;
          class_year: number;
          created_at?: string;
          eboard?: boolean;
          id?: string;
          linkedin?: string | null;
          name: string;
          nickname?: string | null;
          participated?: number[];
          photo_media_id?: string | null;
          published?: boolean;
          role?: string | null;
          role_history?: string[];
          role_term?: string | null;
          slug: string;
          sort_order?: number;
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          badges?: string[];
          bio?: string | null;
          class_year?: number;
          created_at?: string;
          eboard?: boolean;
          id?: string;
          linkedin?: string | null;
          name?: string;
          nickname?: string | null;
          participated?: number[];
          photo_media_id?: string | null;
          published?: boolean;
          role?: string | null;
          role_history?: string[];
          role_term?: string | null;
          slug?: string;
          sort_order?: number;
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_photo_media_id_fkey";
            columns: ["photo_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      news: {
        Row: {
          created_at: string;
          id: string;
          media_id: string;
          published: boolean;
          published_on: string;
          slug: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          media_id: string;
          published?: boolean;
          published_on: string;
          slug: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          media_id?: string;
          published?: boolean;
          published_on?: string;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          caption: string | null;
          created_at: string;
          featured: boolean;
          id: string;
          media_id: string;
          published: boolean;
          sort_order: number;
          taken_on: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          created_at?: string;
          featured?: boolean;
          id?: string;
          media_id: string;
          published?: boolean;
          sort_order?: number;
          taken_on?: string | null;
          updated_at?: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          featured?: boolean;
          id?: string;
          media_id?: string;
          published?: boolean;
          sort_order?: number;
          taken_on?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: true;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          member_id: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          member_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          member_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      project_gallery: {
        Row: {
          created_at: string;
          media_id: string;
          project_id: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          media_id: string;
          project_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          media_id?: string;
          project_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_gallery_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_gallery_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          cover_media_id: string | null;
          created_at: string;
          highlights: string[];
          id: string;
          kind: Database["public"]["Enums"]["project_kind"];
          live_url: string | null;
          methodology: Database["public"]["Enums"]["methodology"];
          published: boolean;
          ref: string;
          repo_url: string | null;
          requested_by: string | null;
          slug: string;
          sort_order: number;
          status: Database["public"]["Enums"]["project_status"];
          summary: string | null;
          supervisor_kind:
            Database["public"]["Enums"]["supervisor_kind"] | null;
          supervisor_member_id: string | null;
          supervisor_name: string | null;
          term: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          cover_media_id?: string | null;
          created_at?: string;
          highlights?: string[];
          id?: string;
          kind?: Database["public"]["Enums"]["project_kind"];
          live_url?: string | null;
          methodology?: Database["public"]["Enums"]["methodology"];
          published?: boolean;
          ref: string;
          repo_url?: string | null;
          requested_by?: string | null;
          slug: string;
          sort_order?: number;
          status?: Database["public"]["Enums"]["project_status"];
          summary?: string | null;
          supervisor_kind?:
            Database["public"]["Enums"]["supervisor_kind"] | null;
          supervisor_member_id?: string | null;
          supervisor_name?: string | null;
          term: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          cover_media_id?: string | null;
          created_at?: string;
          highlights?: string[];
          id?: string;
          kind?: Database["public"]["Enums"]["project_kind"];
          live_url?: string | null;
          methodology?: Database["public"]["Enums"]["methodology"];
          published?: boolean;
          ref?: string;
          repo_url?: string | null;
          requested_by?: string | null;
          slug?: string;
          sort_order?: number;
          status?: Database["public"]["Enums"]["project_status"];
          summary?: string | null;
          supervisor_kind?:
            Database["public"]["Enums"]["supervisor_kind"] | null;
          supervisor_member_id?: string | null;
          supervisor_name?: string | null;
          term?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_supervisor_member_id_fkey";
            columns: ["supervisor_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      recordings: {
        Row: {
          created_at: string;
          description: string | null;
          event_id: string | null;
          id: string;
          kind: string;
          published: boolean;
          recorded_on: string;
          sort_order: number;
          title: string;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          event_id?: string | null;
          id?: string;
          kind?: string;
          published?: boolean;
          recorded_on: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          event_id?: string | null;
          id?: string;
          kind?: string;
          published?: boolean;
          recorded_on?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recordings_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      people: {
        Row: {
          display_name: string | null;
          id: string | null;
          member_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          display_name?: string | null;
          id?: string | null;
          member_id?: string | null;
        };
        Update: {
          display_name?: string | null;
          id?: string | null;
          member_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      admin_link_member: {
        Args: { member: string; target: string };
        Returns: undefined;
      };
      admin_set_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"];
          target: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      member_status: "current" | "alumni";
      methodology: "kanban" | "scrumban" | "scrum" | "safe";
      project_kind: "team" | "personal";
      project_status: "proposed" | "in_progress" | "completed" | "archived";
      supervisor_kind: "faculty" | "student";
      user_role: "member" | "editor" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      member_status: ["current", "alumni"],
      methodology: ["kanban", "scrumban", "scrum", "safe"],
      project_kind: ["team", "personal"],
      project_status: ["proposed", "in_progress", "completed", "archived"],
      supervisor_kind: ["faculty", "student"],
      user_role: ["member", "editor", "admin"],
    },
  },
} as const;
