/**
 * Este arquivo é gerado automaticamente pela Supabase CLI.
 * Execute `npm run db:types` após aplicar as migrations para regenerar.
 *
 * Comando: supabase gen types typescript --linked --schema public > src/types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "manager" | "operator";
export type MovementType = "in" | "out" | "adjustment";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          unit: string;
          cost_price: number;
          sale_price: number;
          stock: number;
          min_stock: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          description?: string | null;
          unit?: string;
          cost_price?: number;
          sale_price?: number;
          stock?: number;
          min_stock?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          name?: string;
          description?: string | null;
          unit?: string;
          cost_price?: number;
          sale_price?: number;
          stock?: number;
          min_stock?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          movement_type: MovementType;
          quantity: number;
          unit_cost: number | null;
          reason: string | null;
          performed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          movement_type: MovementType;
          quantity: number;
          unit_cost?: number | null;
          reason?: string | null;
          performed_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          movement_type?: MovementType;
          quantity?: number;
          unit_cost?: number | null;
          reason?: string | null;
          performed_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey";
            columns: ["performed_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      movement_type: MovementType;
    };
    CompositeTypes: Record<string, never>;
  };
}
