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
      kb_article_chunks: {
        Row: {
          article_id: string;
          chunk_index: number;
          company_id: string;
          content: string;
          created_at: string;
          embedding: string;
          id: string;
        };
        Insert: {
          article_id: string;
          chunk_index: number;
          company_id: string;
          content: string;
          created_at?: string;
          embedding: string;
          id?: string;
        };
        Update: {
          article_id?: string;
          chunk_index?: number;
          company_id?: string;
          content?: string;
          created_at?: string;
          embedding?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kb_article_chunks_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "kb_articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kb_article_chunks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_article_revisions: {
        Row: {
          article_id: string;
          content_json: Json;
          content_md: string;
          edited_at: string;
          edited_by: string | null;
          id: string;
        };
        Insert: {
          article_id: string;
          content_json: Json;
          content_md: string;
          edited_at?: string;
          edited_by?: string | null;
          id?: string;
        };
        Update: {
          article_id?: string;
          content_json?: Json;
          content_md?: string;
          edited_at?: string;
          edited_by?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kb_article_revisions_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "kb_articles";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_articles: {
        Row: {
          audience: string;
          category_id: string | null;
          company_id: string;
          content_json: Json;
          content_md: string;
          created_at: string;
          created_by: string | null;
          id: string;
          published_at: string | null;
          related_module: string | null;
          related_table: string | null;
          search_vector: unknown;
          slug: string;
          status: string;
          summary: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          video_id: string | null;
        };
        Insert: {
          audience?: string;
          category_id?: string | null;
          company_id: string;
          content_json: Json;
          content_md: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          published_at?: string | null;
          related_module?: string | null;
          related_table?: string | null;
          search_vector?: unknown;
          slug: string;
          status?: string;
          summary?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          video_id?: string | null;
        };
        Update: {
          audience?: string;
          category_id?: string | null;
          company_id?: string;
          content_json?: Json;
          content_md?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          published_at?: string | null;
          related_module?: string | null;
          related_table?: string | null;
          search_vector?: unknown;
          slug?: string;
          status?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          video_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "kb_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kb_articles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kb_articles_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "kb_videos";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_categories: {
        Row: {
          audience: string;
          company_id: string;
          created_at: string;
          id: string;
          parent_id: string | null;
          position: number;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: string;
          company_id: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          position?: number;
          slug: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: string;
          company_id?: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          position?: number;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kb_categories_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kb_categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "kb_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_videos: {
        Row: {
          company_id: string;
          composition: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          duration_s: number | null;
          id: string;
          input_props: Json | null;
          status: string;
          storage_path: string | null;
          thumbnail_path: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          composition: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_s?: number | null;
          id?: string;
          input_props?: Json | null;
          status?: string;
          storage_path?: string | null;
          thumbnail_path?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          composition?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_s?: number | null;
          id?: string;
          input_props?: Json | null;
          status?: string;
          storage_path?: string | null;
          thumbnail_path?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kb_videos_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_patients: {
        Row: {
          [key: string]: any;
          id: string;
          company_id: string;
          full_name: string;
          document: string | null;
          birth_date: string | null;
          sex: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          notes: string | null;
          is_archived: boolean;
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          [key: string]: any;
          id?: string;
          company_id: string;
          full_name: string;
        };
        Update: {
          [key: string]: any;
          id?: string;
          company_id?: string;
          full_name?: string;
        };
        Relationships: [];
      };
      medical_patient_assignments: {
        Row: {
          [key: string]: any;
          id: string;
          company_id: string;
          patient_id: string;
          membership_id: string;
          relationship: Database["public"]["Enums"]["medical_assignment_relationship"];
          is_primary: boolean;
          assigned_by: string | null;
          assigned_at: string;
          ended_at: string | null;
          notes: string | null;
        };
        Insert: {
          [key: string]: any;
          company_id: string;
          patient_id: string;
          membership_id: string;
        };
        Update: {
          [key: string]: any;
          id?: string;
          ended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medical_patient_assignments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_patient_assignments_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_consultations: {
        Row: {
          [key: string]: any;
          id: string;
          company_id: string;
          patient_id: string;
          consultation_at: string;
          chief_complaint: string | null;
          clinical_evolution: string | null;
          diagnosis_text: string | null;
          conduct: string | null;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { [key: string]: any; company_id: string; patient_id: string };
        Update: { [key: string]: any; id?: string };
        Relationships: [
          {
            foreignKeyName: "medical_consultations_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_anamnesis_templates: {
        Row: { [key: string]: any; id: string; company_id: string; name: string };
        Insert: { [key: string]: any; company_id: string; name: string };
        Update: { [key: string]: any; id?: string };
        Relationships: [];
      };
      medical_anamneses: {
        Row: { [key: string]: any; id: string; company_id: string; patient_id: string };
        Insert: { [key: string]: any; company_id: string; patient_id: string };
        Update: { [key: string]: any; id?: string };
        Relationships: [];
      };
      medical_prescriptions: {
        Row: {
          [key: string]: any;
          id: string;
          company_id: string;
          patient_id: string;
          consultation_id: string | null;
          issued_at: string;
          general_instructions: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { [key: string]: any; company_id: string; patient_id: string };
        Update: { [key: string]: any; id?: string };
        Relationships: [
          {
            foreignKeyName: "medical_prescriptions_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_prescription_items: {
        Row: {
          [key: string]: any;
          id: string;
          prescription_id: string;
          company_id: string;
          medication: string;
          position: number;
        };
        Insert: {
          [key: string]: any;
          prescription_id: string;
          company_id: string;
          medication: string;
        };
        Update: { [key: string]: any; id?: string };
        Relationships: [
          {
            foreignKeyName: "medical_prescription_items_prescription_id_fkey";
            columns: ["prescription_id"];
            isOneToOne: false;
            referencedRelation: "medical_prescriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_consent_templates: {
        Row: {
          [key: string]: any;
          id: string;
          company_id: string;
          title: string;
          version: number;
          body: string;
          is_active: boolean;
        };
        Insert: { [key: string]: any; company_id: string; title: string; body: string };
        Update: { [key: string]: any; id?: string };
        Relationships: [];
      };
      medical_patient_consents: {
        Row: {
          [key: string]: any;
          id: string;
          company_id: string;
          patient_id: string;
          template_id: string | null;
          template_title: string;
          template_version: number;
          accepted_body: string;
          accepted_by: string | null;
          accepted_at: string;
          notes: string | null;
        };
        Insert: {
          [key: string]: any;
          company_id: string;
          patient_id: string;
          template_title: string;
          template_version: number;
          accepted_body: string;
        };
        Update: { [key: string]: any; id?: string };
        Relationships: [];
      };
      medical_attachment_metadata: {
        Row: {
          [key: string]: any;
          id: string;
          company_id: string;
          patient_id: string;
          file_name: string;
        };
        Insert: { [key: string]: any; company_id: string; patient_id: string; file_name: string };
        Update: { [key: string]: any; id?: string };
        Relationships: [];
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
          company_id: string;
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
          company_id: string;
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
          company_id?: string;
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
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
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
          company_id: string;
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
          company_id: string;
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
          company_id?: string;
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
      get_user_id_by_email: { Args: { p_email: string }; Returns: string };
      has_medical_patient_access: {
        Args: { p_company: string; p_patient: string };
        Returns: boolean;
      };
      has_permission: {
        Args: { p_company: string; p_permission: string };
        Returns: boolean;
      };
      is_platform_admin: { Args: never; Returns: boolean };
      set_member_roles: {
        Args: {
          p_company_id: string;
          p_membership_id: string;
          p_role_ids: string[];
        };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      user_company_ids: { Args: never; Returns: string[] };
    };
    Enums: {
      medical_assignment_relationship:
        | "primary_physician"
        | "physician"
        | "nursing"
        | "assistant"
        | "therapist"
        | "other";
      membership_status: "invited" | "active" | "suspended";
      movement_type: "in" | "out" | "adjustment";
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
      medical_assignment_relationship: [
        "primary_physician",
        "physician",
        "nursing",
        "assistant",
        "therapist",
        "other",
      ],
      movement_type: ["in", "out", "adjustment"],
    },
  },
} as const;
