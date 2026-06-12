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
      company_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          company_id: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          revoked_at: string | null;
          revoked_by: string | null;
          role_ids: string[];
          short_code: string;
          status: string;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          company_id: string;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role_ids?: string[];
          short_code: string;
          status?: string;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          company_id?: string;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role_ids?: string[];
          short_code?: string;
          status?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
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
      field_catalog: {
        Row: {
          column_name: string;
          created_at: string;
          description: string | null;
          label: string;
          module_code: string | null;
          table_name: string;
        };
        Insert: {
          column_name: string;
          created_at?: string;
          description?: string | null;
          label: string;
          module_code?: string | null;
          table_name: string;
        };
        Update: {
          column_name?: string;
          created_at?: string;
          description?: string | null;
          label?: string;
          module_code?: string | null;
          table_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_catalog_module_code_fkey";
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
      medical_anamneses: {
        Row: {
          answers_json: Json;
          company_id: string;
          consultation_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          patient_id: string;
          summary: string | null;
          template_id: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          answers_json?: Json;
          company_id: string;
          consultation_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          patient_id: string;
          summary?: string | null;
          template_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          answers_json?: Json;
          company_id?: string;
          consultation_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          patient_id?: string;
          summary?: string | null;
          template_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medical_anamneses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_anamneses_consultation_id_fkey";
            columns: ["consultation_id"];
            isOneToOne: false;
            referencedRelation: "medical_consultations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_anamneses_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_anamneses_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "medical_anamnesis_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_anamnesis_templates: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          name: string;
          schema_json: Json;
          specialty: string | null;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          schema_json?: Json;
          specialty?: string | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          schema_json?: Json;
          specialty?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medical_anamnesis_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_attachment_metadata: {
        Row: {
          company_id: string;
          consultation_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          file_name: string;
          file_size_bytes: number | null;
          file_type: string | null;
          id: string;
          patient_id: string;
          storage_path: string | null;
        };
        Insert: {
          company_id: string;
          consultation_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          file_name: string;
          file_size_bytes?: number | null;
          file_type?: string | null;
          id?: string;
          patient_id: string;
          storage_path?: string | null;
        };
        Update: {
          company_id?: string;
          consultation_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          file_name?: string;
          file_size_bytes?: number | null;
          file_type?: string | null;
          id?: string;
          patient_id?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medical_attachment_metadata_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_attachment_metadata_consultation_id_fkey";
            columns: ["consultation_id"];
            isOneToOne: false;
            referencedRelation: "medical_consultations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_attachment_metadata_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_consent_templates: {
        Row: {
          body: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          body: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          body?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "medical_consent_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_consultations: {
        Row: {
          chief_complaint: string | null;
          clinical_evolution: string | null;
          company_id: string;
          conduct: string | null;
          consultation_at: string;
          created_at: string;
          created_by: string | null;
          diagnosis_text: string | null;
          id: string;
          notes: string | null;
          patient_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          chief_complaint?: string | null;
          clinical_evolution?: string | null;
          company_id: string;
          conduct?: string | null;
          consultation_at?: string;
          created_at?: string;
          created_by?: string | null;
          diagnosis_text?: string | null;
          id?: string;
          notes?: string | null;
          patient_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          chief_complaint?: string | null;
          clinical_evolution?: string | null;
          company_id?: string;
          conduct?: string | null;
          consultation_at?: string;
          created_at?: string;
          created_by?: string | null;
          diagnosis_text?: string | null;
          id?: string;
          notes?: string | null;
          patient_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medical_consultations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_consultations_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_patient_assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          company_id: string;
          ended_at: string | null;
          id: string;
          is_primary: boolean;
          membership_id: string;
          notes: string | null;
          patient_id: string;
          relationship: Database["public"]["Enums"]["medical_assignment_relationship"];
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          company_id: string;
          ended_at?: string | null;
          id?: string;
          is_primary?: boolean;
          membership_id: string;
          notes?: string | null;
          patient_id: string;
          relationship?: Database["public"]["Enums"]["medical_assignment_relationship"];
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          company_id?: string;
          ended_at?: string | null;
          id?: string;
          is_primary?: boolean;
          membership_id?: string;
          notes?: string | null;
          patient_id?: string;
          relationship?: Database["public"]["Enums"]["medical_assignment_relationship"];
        };
        Relationships: [
          {
            foreignKeyName: "medical_patient_assignments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_patient_assignments_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_patient_assignments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_patient_consents: {
        Row: {
          accepted_at: string;
          accepted_body: string;
          accepted_by: string | null;
          company_id: string;
          id: string;
          notes: string | null;
          patient_id: string;
          template_id: string | null;
          template_title: string;
          template_version: number;
        };
        Insert: {
          accepted_at?: string;
          accepted_body: string;
          accepted_by?: string | null;
          company_id: string;
          id?: string;
          notes?: string | null;
          patient_id: string;
          template_id?: string | null;
          template_title: string;
          template_version: number;
        };
        Update: {
          accepted_at?: string;
          accepted_body?: string;
          accepted_by?: string | null;
          company_id?: string;
          id?: string;
          notes?: string | null;
          patient_id?: string;
          template_id?: string | null;
          template_title?: string;
          template_version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "medical_patient_consents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_patient_consents_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_patient_consents_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "medical_consent_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_patients: {
        Row: {
          address: string | null;
          archived_at: string | null;
          birth_date: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          document: string | null;
          email: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          full_name: string;
          id: string;
          is_archived: boolean;
          notes: string | null;
          phone: string | null;
          sex: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          archived_at?: string | null;
          birth_date?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          document?: string | null;
          email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          full_name: string;
          id?: string;
          is_archived?: boolean;
          notes?: string | null;
          phone?: string | null;
          sex?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          archived_at?: string | null;
          birth_date?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          document?: string | null;
          email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          full_name?: string;
          id?: string;
          is_archived?: boolean;
          notes?: string | null;
          phone?: string | null;
          sex?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medical_patients_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_prescription_items: {
        Row: {
          company_id: string;
          dosage: string | null;
          duration: string | null;
          frequency: string | null;
          id: string;
          instructions: string | null;
          medication: string;
          position: number;
          prescription_id: string;
          quantity: string | null;
          route: string | null;
        };
        Insert: {
          company_id: string;
          dosage?: string | null;
          duration?: string | null;
          frequency?: string | null;
          id?: string;
          instructions?: string | null;
          medication: string;
          position?: number;
          prescription_id: string;
          quantity?: string | null;
          route?: string | null;
        };
        Update: {
          company_id?: string;
          dosage?: string | null;
          duration?: string | null;
          frequency?: string | null;
          id?: string;
          instructions?: string | null;
          medication?: string;
          position?: number;
          prescription_id?: string;
          quantity?: string | null;
          route?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medical_prescription_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_prescription_items_prescription_id_fkey";
            columns: ["prescription_id"];
            isOneToOne: false;
            referencedRelation: "medical_prescriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_prescriptions: {
        Row: {
          company_id: string;
          consultation_id: string | null;
          created_at: string;
          created_by: string | null;
          general_instructions: string | null;
          id: string;
          issued_at: string;
          patient_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          company_id: string;
          consultation_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          general_instructions?: string | null;
          id?: string;
          issued_at?: string;
          patient_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          company_id?: string;
          consultation_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          general_instructions?: string | null;
          id?: string;
          issued_at?: string;
          patient_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medical_prescriptions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_prescriptions_consultation_id_fkey";
            columns: ["consultation_id"];
            isOneToOne: false;
            referencedRelation: "medical_consultations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_prescriptions_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "medical_patients";
            referencedColumns: ["id"];
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
          joined_at: string | null;
          legacy_is_owner: boolean;
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
          joined_at?: string | null;
          legacy_is_owner?: boolean;
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
          joined_at?: string | null;
          legacy_is_owner?: boolean;
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
      migration_backfill_log: {
        Row: {
          company_id: string;
          created_at: string;
          email: string;
          id: string;
          invitation_id: string;
          membership_id: string;
          short_code: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          email: string;
          id?: string;
          invitation_id: string;
          membership_id: string;
          short_code: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          invitation_id?: string;
          membership_id?: string;
          short_code?: string;
        };
        Relationships: [];
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
      password_reset_requests: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          consumed_at: string | null;
          email: string;
          expires_at: string | null;
          id: string;
          metadata: Json;
          requested_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
          short_code: string | null;
          source: string;
          status: string;
          token_hash: string | null;
          user_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          consumed_at?: string | null;
          email: string;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          requested_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          short_code?: string | null;
          source: string;
          status?: string;
          token_hash?: string | null;
          user_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          consumed_at?: string | null;
          email?: string;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          requested_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          short_code?: string | null;
          source?: string;
          status?: string;
          token_hash?: string | null;
          user_id?: string;
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
      platform_role_assignments: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          role_code: string;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          role_code: string;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          role_code?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "platform_role_assignments_role_code_fkey";
            columns: ["role_code"];
            isOneToOne: false;
            referencedRelation: "platform_roles";
            referencedColumns: ["code"];
          },
        ];
      };
      platform_roles: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          name: string;
          permissions: string[];
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          name: string;
          permissions?: string[];
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          name?: string;
          permissions?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      product_classifications: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          level: string;
          name: string;
          parent_id: string | null;
          sort_order: number;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          level: string;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          level?: string;
          name?: string;
          parent_id?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_classifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_classifications_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "product_classifications";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          barcode: string | null;
          classification_id: string | null;
          company_id: string;
          cost_price: number;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          is_active: boolean;
          location: string | null;
          min_stock: number;
          name: string;
          ncm: string;
          sale_price: number;
          sku: string;
          stock: number;
          supplier_id: string;
          unit: string;
          updated_at: string;
          warehouse_id: string | null;
        };
        Insert: {
          barcode?: string | null;
          classification_id?: string | null;
          company_id: string;
          cost_price?: number;
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          min_stock?: number;
          name: string;
          ncm: string;
          sale_price?: number;
          sku: string;
          stock?: number;
          supplier_id: string;
          unit?: string;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Update: {
          barcode?: string | null;
          classification_id?: string | null;
          company_id?: string;
          cost_price?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          min_stock?: number;
          name?: string;
          ncm?: string;
          sale_price?: number;
          sku?: string;
          stock?: number;
          supplier_id?: string;
          unit?: string;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_classification_id_fkey";
            columns: ["classification_id"];
            isOneToOne: false;
            referencedRelation: "product_classifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
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
      role_field_rules: {
        Row: {
          column_name: string;
          granted_at: string;
          mode: string;
          role_id: string;
          table_name: string;
        };
        Insert: {
          column_name: string;
          granted_at?: string;
          mode: string;
          role_id: string;
          table_name: string;
        };
        Update: {
          column_name?: string;
          granted_at?: string;
          mode?: string;
          role_id?: string;
          table_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_field_rules_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_field_rules_table_name_column_name_fkey";
            columns: ["table_name", "column_name"];
            isOneToOne: false;
            referencedRelation: "field_catalog";
            referencedColumns: ["table_name", "column_name"];
          },
        ];
      };
      role_permissions: {
        Row: {
          granted_at: string;
          is_active: boolean;
          permission_code: string;
          role_id: string;
        };
        Insert: {
          granted_at?: string;
          is_active?: boolean;
          permission_code: string;
          role_id: string;
        };
        Update: {
          granted_at?: string;
          is_active?: boolean;
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
      role_scopes: {
        Row: {
          dimension_code: string;
          granted_at: string;
          role_id: string;
          scope_value: string;
        };
        Insert: {
          dimension_code: string;
          granted_at?: string;
          role_id: string;
          scope_value: string;
        };
        Update: {
          dimension_code?: string;
          granted_at?: string;
          role_id?: string;
          scope_value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_scopes_dimension_code_fkey";
            columns: ["dimension_code"];
            isOneToOne: false;
            referencedRelation: "scope_dimensions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "role_scopes_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      role_templates: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          is_system: boolean;
          name: string;
          parent_template_code: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          is_system?: boolean;
          name: string;
          parent_template_code?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          is_system?: boolean;
          name?: string;
          parent_template_code?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_templates_parent_template_code_fkey";
            columns: ["parent_template_code"];
            isOneToOne: false;
            referencedRelation: "role_templates";
            referencedColumns: ["code"];
          },
        ];
      };
      roles: {
        Row: {
          code: string;
          company_id: string;
          created_at: string;
          description: string | null;
          hierarchy_level: number;
          id: string;
          is_system: boolean;
          name: string;
          parent_role_id: string | null;
          template_code: string | null;
          template_synced_at: string | null;
          updated_at: string;
        };
        Insert: {
          code: string;
          company_id: string;
          created_at?: string;
          description?: string | null;
          hierarchy_level?: number;
          id?: string;
          is_system?: boolean;
          name: string;
          parent_role_id?: string | null;
          template_code?: string | null;
          template_synced_at?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string;
          company_id?: string;
          created_at?: string;
          description?: string | null;
          hierarchy_level?: number;
          id?: string;
          is_system?: boolean;
          name?: string;
          parent_role_id?: string | null;
          template_code?: string | null;
          template_synced_at?: string | null;
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
          {
            foreignKeyName: "roles_parent_role_id_fkey";
            columns: ["parent_role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roles_template_code_fkey";
            columns: ["template_code"];
            isOneToOne: false;
            referencedRelation: "role_templates";
            referencedColumns: ["code"];
          },
        ];
      };
      scope_dimensions: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          name: string;
          resolver_fn: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          name: string;
          resolver_fn?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          name?: string;
          resolver_fn?: string | null;
        };
        Relationships: [];
      };
      short_code_attempts: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          identifier: string;
          ip: unknown;
          locked_until: string | null;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          identifier: string;
          ip?: unknown;
          locked_until?: string | null;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          identifier?: string;
          ip?: unknown;
          locked_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      space_rentals: {
        Row: {
          booking_kind: Database["public"]["Enums"]["rental_kind"];
          company_id: string;
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          notes: string | null;
          period: unknown;
          price: number;
          renter_user_id: string;
          request_batch_id: string | null;
          space_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["rental_status"];
          updated_at: string;
        };
        Insert: {
          booking_kind: Database["public"]["Enums"]["rental_kind"];
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          notes?: string | null;
          period?: unknown;
          price?: number;
          renter_user_id: string;
          request_batch_id?: string | null;
          space_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["rental_status"];
          updated_at?: string;
        };
        Update: {
          booking_kind?: Database["public"]["Enums"]["rental_kind"];
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          notes?: string | null;
          period?: unknown;
          price?: number;
          renter_user_id?: string;
          request_batch_id?: string | null;
          space_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["rental_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_rentals_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_rentals_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          booking_mode: Database["public"]["Enums"]["space_booking_mode"];
          capacity: number | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          default_price: number;
          description: string | null;
          id: string;
          is_active: boolean;
          location: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          booking_mode?: Database["public"]["Enums"]["space_booking_mode"];
          capacity?: number | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          default_price?: number;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          booking_mode?: Database["public"]["Enums"]["space_booking_mode"];
          capacity?: number | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          default_price?: number;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spaces_company_id_fkey";
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
      suppliers: {
        Row: {
          cep: string | null;
          city: string | null;
          company_id: string;
          country: string | null;
          created_at: string;
          created_by: string | null;
          document: string | null;
          email: string | null;
          id: string;
          is_active: boolean;
          name: string;
          phone: string | null;
          state: string | null;
          updated_at: string;
        };
        Insert: {
          cep?: string | null;
          city?: string | null;
          company_id: string;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          phone?: string | null;
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          cep?: string | null;
          city?: string | null;
          company_id?: string;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          phone?: string | null;
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      template_permissions: {
        Row: {
          added_at: string;
          permission_code: string;
          template_code: string;
        };
        Insert: {
          added_at?: string;
          permission_code: string;
          template_code: string;
        };
        Update: {
          added_at?: string;
          permission_code?: string;
          template_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "template_permissions_permission_code_fkey";
            columns: ["permission_code"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "template_permissions_template_code_fkey";
            columns: ["template_code"];
            isOneToOne: false;
            referencedRelation: "role_templates";
            referencedColumns: ["code"];
          },
        ];
      };
      warehouses: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          location: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: {
        Args: { p_short_code: string; p_token_hash: string; p_user_id: string };
        Returns: Json;
      };
      actor_can_manage_reset: {
        Args: { p_permission: string; p_user_id: string };
        Returns: boolean;
      };
      apply_template_to_company: {
        Args: { p_company: string; p_force?: boolean; p_template_code: string };
        Returns: {
          perms_added: number;
          perms_removed: number;
          role_id: string;
        }[];
      };
      bootstrap_company_rbac: {
        Args: { p_company: string };
        Returns: undefined;
      };
      can_manage_role: {
        Args: { p_company: string; p_target_role: string };
        Returns: boolean;
      };
      consume_password_reset: {
        Args: { p_short_code: string; p_token_hash: string };
        Returns: string;
      };
      get_user_id_by_email: { Args: { p_email: string }; Returns: string };
      grant_module_to_all_companies: {
        Args: { p_module_code: string; p_role_to_perms: Json };
        Returns: undefined;
      };
      has_medical_patient_access: {
        Args: { p_company: string; p_patient: string };
        Returns: boolean;
      };
      has_permission: {
        Args: { p_company: string; p_permission: string };
        Returns: boolean;
      };
      is_membership_owner: {
        Args: { p_membership_id: string };
        Returns: boolean;
      };
      is_platform_admin: { Args: never; Returns: boolean };
      record_short_code_attempt: {
        Args: { p_identifier: string; p_ip: string };
        Returns: boolean;
      };
      request_password_reset: { Args: { p_email: string }; Returns: undefined };
      search_users_for_company: {
        Args: { p_company_id: string; p_query: string };
        Returns: {
          email: string;
          full_name: string;
          user_id: string;
        }[];
      };
      set_member_roles: {
        Args: {
          p_company_id: string;
          p_membership_id: string;
          p_role_ids: string[];
        };
        Returns: undefined;
      };
      set_role_scopes: {
        Args: {
          p_company_id: string;
          p_dimension_code: string;
          p_role_id: string;
          p_scope_values: string[];
        };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      user_company_ids: { Args: never; Returns: string[] };
      user_field_mode: {
        Args: { p_column: string; p_company: string; p_table: string };
        Returns: string;
      };
      user_has_scope: {
        Args: { p_company: string; p_dimension: string; p_value: string };
        Returns: boolean;
      };
      user_scope_values: {
        Args: { p_company: string; p_dimension: string };
        Returns: string[];
      };
      visible_columns: {
        Args: { p_company: string; p_table: string };
        Returns: string[];
      };
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
      rental_kind: "daily" | "hourly";
      rental_status: "pending" | "confirmed" | "cancelled" | "rejected";
      space_booking_mode: "daily" | "hourly" | "both";
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
      medical_assignment_relationship: [
        "primary_physician",
        "physician",
        "nursing",
        "assistant",
        "therapist",
        "other",
      ],
      membership_status: ["invited", "active", "suspended"],
      movement_type: ["in", "out", "adjustment"],
      rental_kind: ["daily", "hourly"],
      rental_status: ["pending", "confirmed", "cancelled", "rejected"],
      space_booking_mode: ["daily", "hourly", "both"],
    },
  },
} as const;
