export type Json =
  | boolean
  | null
  | number
  | string
  | { [key: string]: Json | undefined }
  | Json[];

export type AgencyMemberRole = "admin" | "owner" | "team_member" | "viewer";
export type AgencyMemberStatus = "active" | "disabled" | "invited";
export type ClientStatus = "active" | "archived" | "paused";
export type CampaignStatus =
  | "approved"
  | "completed"
  | "content_generated"
  | "draft"
  | "in_review"
  | "planning";
export type ContentItemStatus =
  | "approved"
  | "changes_requested"
  | "draft"
  | "needs_review"
  | "published_manually"
  | "ready_to_publish";
export type ContentVariantApprovalStatus =
  | "approved"
  | "changes_requested"
  | "draft"
  | "needs_review";
export type AIGenerationStatus = "failed" | "success";

export type Database = {
  public: {
    Functions: {
      is_agency_admin: {
        Args: { target_agency_id: string };
        Returns: boolean;
      };
      is_agency_member: {
        Args: { target_agency_id: string };
        Returns: boolean;
      };
    };
    Tables: {
      activity_logs: {
        Insert: {
          action: string;
          agency_id: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json;
          user_id?: string | null;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "activity_logs_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
        ];
        Row: {
          action: string;
          agency_id: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json;
          user_id: string | null;
        };
        Update: {
          action?: string;
          agency_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          user_id?: string | null;
        };
      };
      agencies: {
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          updated_at: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
      };
      agency_members: {
        Insert: {
          agency_id: string;
          created_at?: string;
          id?: string;
          role: AgencyMemberRole;
          status: AgencyMemberStatus;
          updated_at?: string;
          user_id: string;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "agency_members_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
        ];
        Row: {
          agency_id: string;
          created_at: string;
          id: string;
          role: AgencyMemberRole;
          status: AgencyMemberStatus;
          updated_at: string;
          user_id: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          id?: string;
          role?: AgencyMemberRole;
          status?: AgencyMemberStatus;
          updated_at?: string;
          user_id?: string;
        };
      };
      ai_generations: {
        Insert: {
          agency_id: string;
          ai_output?: Json;
          campaign_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          generation_type: string;
          id?: string;
          model_used?: string | null;
          prompt_input?: Json;
          status?: AIGenerationStatus;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "ai_generations_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
        ];
        Row: {
          agency_id: string;
          ai_output: Json;
          campaign_id: string | null;
          client_id: string | null;
          created_at: string;
          error_message: string | null;
          generation_type: string;
          id: string;
          model_used: string | null;
          prompt_input: Json;
          status: AIGenerationStatus;
        };
        Update: {
          agency_id?: string;
          ai_output?: Json;
          campaign_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          generation_type?: string;
          id?: string;
          model_used?: string | null;
          prompt_input?: Json;
          status?: AIGenerationStatus;
        };
      };
      assets: {
        Insert: {
          agency_id: string;
          campaign_id?: string | null;
          client_id: string;
          created_at?: string;
          file_url: string;
          id?: string;
          name: string;
          notes?: string | null;
          storage_path?: string | null;
          tags?: Json;
          type: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "assets_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
        ];
        Row: {
          agency_id: string;
          campaign_id: string | null;
          client_id: string;
          created_at: string;
          file_url: string;
          id: string;
          name: string;
          notes: string | null;
          storage_path: string | null;
          tags: Json;
          type: string;
          updated_at: string;
        };
        Update: {
          agency_id?: string;
          campaign_id?: string | null;
          client_id?: string;
          created_at?: string;
          file_url?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          storage_path?: string | null;
          tags?: Json;
          type?: string;
          updated_at?: string;
        };
      };
      brand_profiles: {
        Insert: {
          agency_id: string;
          brand_summary?: string | null;
          client_id: string;
          common_objections?: Json;
          competitors?: Json;
          content_pillars?: Json;
          created_at?: string;
          facebook_notes?: string | null;
          faqs?: Json;
          gbp_notes?: string | null;
          id?: string;
          instagram_notes?: string | null;
          offer_examples?: Json;
          preferred_ctas?: Json;
          services?: Json;
          target_audience?: string | null;
          tone_of_voice?: string | null;
          updated_at?: string;
          words_to_avoid?: Json;
          words_to_use?: Json;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "brand_profiles_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
          {
            columns: ["client_id"];
            foreignKeyName: "brand_profiles_client_id_fkey";
            isOneToOne: true;
            referencedColumns: ["id"];
            referencedRelation: "clients";
          },
        ];
        Row: {
          agency_id: string;
          brand_summary: string | null;
          client_id: string;
          common_objections: Json;
          competitors: Json;
          content_pillars: Json;
          created_at: string;
          facebook_notes: string | null;
          faqs: Json;
          gbp_notes: string | null;
          id: string;
          instagram_notes: string | null;
          offer_examples: Json;
          preferred_ctas: Json;
          services: Json;
          target_audience: string | null;
          tone_of_voice: string | null;
          updated_at: string;
          words_to_avoid: Json;
          words_to_use: Json;
        };
        Update: {
          agency_id?: string;
          brand_summary?: string | null;
          client_id?: string;
          common_objections?: Json;
          competitors?: Json;
          content_pillars?: Json;
          created_at?: string;
          facebook_notes?: string | null;
          faqs?: Json;
          gbp_notes?: string | null;
          id?: string;
          instagram_notes?: string | null;
          offer_examples?: Json;
          preferred_ctas?: Json;
          services?: Json;
          target_audience?: string | null;
          tone_of_voice?: string | null;
          updated_at?: string;
          words_to_avoid?: Json;
          words_to_use?: Json;
        };
      };
      campaigns: {
        Insert: {
          agency_id: string;
          campaign_theme?: string | null;
          client_id: string;
          content_types?: Json;
          created_at?: string;
          cta?: string | null;
          end_date?: string | null;
          id?: string;
          internal_notes?: string | null;
          key_message?: string | null;
          number_of_posts?: number;
          objective?: string | null;
          offer?: string | null;
          platforms?: Json;
          start_date?: string | null;
          status?: CampaignStatus;
          target_audience?: string | null;
          title: string;
          tone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "campaigns_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
          {
            columns: ["client_id"];
            foreignKeyName: "campaigns_client_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "clients";
          },
        ];
        Row: {
          agency_id: string;
          campaign_theme: string | null;
          client_id: string;
          content_types: Json;
          created_at: string;
          cta: string | null;
          end_date: string | null;
          id: string;
          internal_notes: string | null;
          key_message: string | null;
          number_of_posts: number;
          objective: string | null;
          offer: string | null;
          platforms: Json;
          start_date: string | null;
          status: CampaignStatus;
          target_audience: string | null;
          title: string;
          tone: string | null;
          updated_at: string;
        };
        Update: {
          agency_id?: string;
          campaign_theme?: string | null;
          client_id?: string;
          content_types?: Json;
          created_at?: string;
          cta?: string | null;
          end_date?: string | null;
          id?: string;
          internal_notes?: string | null;
          key_message?: string | null;
          number_of_posts?: number;
          objective?: string | null;
          offer?: string | null;
          platforms?: Json;
          start_date?: string | null;
          status?: CampaignStatus;
          target_audience?: string | null;
          title?: string;
          tone?: string | null;
          updated_at?: string;
        };
      };
      clients: {
        Insert: {
          agency_id: string;
          contact_email?: string | null;
          contact_name?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          industry?: string | null;
          location?: string | null;
          name: string;
          status?: ClientStatus;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "clients_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
        ];
        Row: {
          agency_id: string;
          contact_email: string | null;
          contact_name: string | null;
          created_at: string;
          description: string | null;
          id: string;
          industry: string | null;
          location: string | null;
          name: string;
          status: ClientStatus;
          updated_at: string;
          website: string | null;
        };
        Update: {
          agency_id?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          industry?: string | null;
          location?: string | null;
          name?: string;
          status?: ClientStatus;
          updated_at?: string;
          website?: string | null;
        };
      };
      content_comments: {
        Insert: {
          agency_id: string;
          comment: string;
          content_item_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "content_comments_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
          {
            columns: ["content_item_id"];
            foreignKeyName: "content_comments_content_item_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "content_items";
          },
        ];
        Row: {
          agency_id: string;
          comment: string;
          content_item_id: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string | null;
        };
        Update: {
          agency_id?: string;
          comment?: string;
          content_item_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
      };
      content_items: {
        Insert: {
          agency_id: string;
          campaign_id?: string | null;
          client_id: string;
          content_type: string;
          created_at?: string;
          cta?: string | null;
          hashtags?: Json;
          hook?: string | null;
          id?: string;
          metadata?: Json;
          objective?: string | null;
          platform: string;
          status?: ContentItemStatus;
          suggested_date?: string | null;
          title: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "content_items_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
          {
            columns: ["campaign_id"];
            foreignKeyName: "content_items_campaign_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "campaigns";
          },
          {
            columns: ["client_id"];
            foreignKeyName: "content_items_client_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "clients";
          },
        ];
        Row: {
          agency_id: string;
          campaign_id: string | null;
          client_id: string;
          content_type: string;
          created_at: string;
          cta: string | null;
          hashtags: Json;
          hook: string | null;
          id: string;
          metadata: Json;
          objective: string | null;
          platform: string;
          status: ContentItemStatus;
          suggested_date: string | null;
          title: string;
          updated_at: string;
        };
        Update: {
          agency_id?: string;
          campaign_id?: string | null;
          client_id?: string;
          content_type?: string;
          created_at?: string;
          cta?: string | null;
          hashtags?: Json;
          hook?: string | null;
          id?: string;
          metadata?: Json;
          objective?: string | null;
          platform?: string;
          status?: ContentItemStatus;
          suggested_date?: string | null;
          title?: string;
          updated_at?: string;
        };
      };
      content_variants: {
        Insert: {
          agency_id: string;
          ai_generated_copy?: string | null;
          approval_status?: ContentVariantApprovalStatus;
          content_item_id: string;
          created_at?: string;
          created_by?: string | null;
          creative_direction?: string | null;
          edited_copy?: string | null;
          id?: string;
          model_used?: string | null;
          updated_at?: string;
          version_number: number;
        };
        Relationships: [
          {
            columns: ["agency_id"];
            foreignKeyName: "content_variants_agency_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "agencies";
          },
          {
            columns: ["content_item_id"];
            foreignKeyName: "content_variants_content_item_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "content_items";
          },
        ];
        Row: {
          agency_id: string;
          ai_generated_copy: string | null;
          approval_status: ContentVariantApprovalStatus;
          content_item_id: string;
          created_at: string;
          created_by: string | null;
          creative_direction: string | null;
          edited_copy: string | null;
          id: string;
          model_used: string | null;
          updated_at: string;
          version_number: number;
        };
        Update: {
          agency_id?: string;
          ai_generated_copy?: string | null;
          approval_status?: ContentVariantApprovalStatus;
          content_item_id?: string;
          created_at?: string;
          created_by?: string | null;
          creative_direction?: string | null;
          edited_copy?: string | null;
          id?: string;
          model_used?: string | null;
          updated_at?: string;
          version_number?: number;
        };
      };
    };
    Views: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type TableName = keyof PublicSchema["Tables"];
export type TableRow<T extends TableName> = PublicSchema["Tables"][T]["Row"];
export type TableInsert<T extends TableName> = PublicSchema["Tables"][T]["Insert"];
export type TableUpdate<T extends TableName> = PublicSchema["Tables"][T]["Update"];

export type Agency = TableRow<"agencies">;
export type AgencyMember = TableRow<"agency_members">;
export type Client = TableRow<"clients">;
export type BrandProfile = TableRow<"brand_profiles">;
export type Campaign = TableRow<"campaigns">;
export type ContentItem = TableRow<"content_items">;
export type ContentVariant = TableRow<"content_variants">;
export type ContentComment = TableRow<"content_comments">;
export type Asset = TableRow<"assets">;
export type AIGeneration = TableRow<"ai_generations">;
export type ActivityLog = TableRow<"activity_logs">;

export type ClientWithBrandProfile = {
  brand_profile: BrandProfile | null;
  client: Client;
};
