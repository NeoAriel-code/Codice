export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EntryType =
  | "personaje"
  | "faccion"
  | "lugar"
  | "magia"
  | "evento"
  | "termino";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          plan: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          plan?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          plan?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      worlds: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worlds_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      entries: {
        Row: {
          id: string;
          world_id: string;
          type: EntryType;
          name: string;
          summary: string | null;
          details: string | null;
          tags: string[] | null;
          date_in_world: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          type: EntryType;
          name: string;
          summary?: string | null;
          details?: string | null;
          tags?: string[] | null;
          date_in_world?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          world_id?: string;
          type?: EntryType;
          name?: string;
          summary?: string | null;
          details?: string | null;
          tags?: string[] | null;
          date_in_world?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entries_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };
      entry_relations: {
        Row: {
          id: string;
          world_id: string;
          from_entry_id: string;
          to_entry_id: string;
          relation_type: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          world_id: string;
          from_entry_id: string;
          to_entry_id: string;
          relation_type: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          world_id?: string;
          from_entry_id?: string;
          to_entry_id?: string;
          relation_type?: string;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entry_relations_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entry_relations_from_entry_id_fkey";
            columns: ["from_entry_id"];
            isOneToOne: false;
            referencedRelation: "entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entry_relations_to_entry_id_fkey";
            columns: ["to_entry_id"];
            isOneToOne: false;
            referencedRelation: "entries";
            referencedColumns: ["id"];
          }
        ];
      };
      research_shelf: {
        Row: {
          id: string;
          world_id: string;
          external_id: string;
          title: string;
          authors: string | null;
          year: string | null;
          thumbnail_url: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          external_id: string;
          title: string;
          authors?: string | null;
          year?: string | null;
          thumbnail_url?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          world_id?: string;
          external_id?: string;
          title?: string;
          authors?: string | null;
          year?: string | null;
          thumbnail_url?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_shelf_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };
      oracle_conversations: {
        Row: {
          id: string;
          world_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          world_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oracle_conversations_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };
      oracle_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oracle_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "oracle_conversations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      entry_type: EntryType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
