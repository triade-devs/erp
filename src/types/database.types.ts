export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_user_id: string | null;
          company_id: string | null;
          created_at: string;
          id: string;
          ip: unknown;
          metadata: Json;
          permission: string | null;
          resource_id: string | null;
          resource_type: string | null;
          status: string;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_user_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          id?: string;
          ip?: unknown;
          metadata?: Json;
          permission?: string | null;
          resource_id?: string | null;
          resource_type?: string | null;
          status?: string;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_user_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          id?: string;
          ip?: unknown;
          metadata?: Json;
          permission?: string | null;
          resource_id?: string | null;
          resource_type?: string | null;
          status?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          created_at: string;
          created_by: string | null;
          document: string | null;
          id: string;
          is_active: boolean;
          name: string;
          plan: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          document?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          plan?: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          document?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          plan?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_modules: {
        Row: {
          company_id: string;
          enabled_at: string;
          enabled_by: string | null;
          module_code: string;
        };
        Insert: {
          company_id: string;
          enabled_at?: string;
          enabled_by?: string | null;
          module_code: string;
        };
        Update: {
          company_id?: string;
          enabled_at?: string;
          enabled_by?: string | null;
          module_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_modules_module_code_fkey";
            columns: ["module_code"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["code"];
          },
        ];
      };
      membership_roles: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          membership_id: string;
          role_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          membership_id: string;
          role_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          membership_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membership_roles_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          invited_at: string | null;
          invited_by: string | null;
          is_owner: boolean;
          joined_at: string | null;
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          is_owner?: boolean;
          joined_at?: string | null;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          is_owner?: boolean;
          joined_at?: string | null;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          icon: string | null;
          is_active: boolean;
          is_system: boolean;
          name: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          is_system?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          is_system?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          action: string;
          code: string;
          created_at: string;
          description: string | null;
          module_code: string;
          resource: string;
        };
        Insert: {
          action: string;
          code: string;
          created_at?: string;
          description?: string | null;
          module_code: string;
          resource: string;
        };
        Update: {
          action?: string;
          code?: string;
          created_at?: string;
          description?: string | null;
          module_code?: string;
          resource?: string;
        };
        Relationships: [
          {
            foreignKeyName: "permissions_module_code_fkey";
            columns: ["module_code"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["code"];
          },
        ];
      };
      platform_admins: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          company_id: string | null;
          cost_price: number;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          min_stock: number;
          name: string;
          sale_price: number;
          sku: string;
          stock: number;
          unit: string;
          updated_at: string;
        };
        Insert: {
          company_id?: string | null;
          cost_price?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          min_stock?: number;
          name: string;
          sale_price?: number;
          sku: string;
          stock?: number;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string | null;
          cost_price?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          min_stock?: number;
          name?: string;
          sale_price?: number;
          sku?: string;
          stock?: number;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          granted_at: string;
          permission_code: string;
          role_id: string;
        };
        Insert: {
          granted_at?: string;
          permission_code: string;
          role_id: string;
        };
        Update: {
          granted_at?: string;
          permission_code?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey";
            columns: ["permission_code"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          code: string;
          company_id: string;
          created_at: string;
          description: string | null;
          id: string;
          is_system: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          company_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          company_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          performed_by: string;
          product_id: string;
          quantity: number;
          reason: string | null;
          unit_cost: number | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          performed_by: string;
          product_id: string;
          quantity: number;
          reason?: string | null;
          unit_cost?: number | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          movement_type?: Database["public"]["Enums"]["movement_type"];
          performed_by?: string;
          product_id?: string;
          quantity?: number;
          reason?: string | null;
          unit_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bootstrap_company_rbac: {
        Args: { p_company: string };
        Returns: undefined;
      };
      current_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      has_permission: {
        Args: { p_company: string; p_permission: string };
        Returns: boolean;
      };
      is_platform_admin: { Args: never; Returns: boolean };
      user_company_ids: { Args: never; Returns: string[] };
    };
    Enums: {
      membership_status: "invited" | "active" | "suspended";
      movement_type: "in" | "out" | "adjustment";
      user_role: "admin" | "manager" | "operator";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      membership_status: ["invited", "active", "suspended"],
      movement_type: ["in", "out", "adjustment"],
      user_role: ["admin", "manager", "operator"],
    },
  },
} as const;
