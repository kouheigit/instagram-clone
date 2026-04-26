export interface User {
  user_id: string;
  username: string;
  display_name?: string;
  bio: string;
  website?: string;
  gender?: string;
  show_account_suggestions?: boolean;
  profile_img: string;
  is_private: boolean;
  is_verified: boolean;
  follower_count: number;
  following_count: number;
  created_at: string;
}

export interface PostMedia {
  media_id: string;
  media_url: string;
  thumbnail_url: string | null;
  hls_url: string | null;
  media_order: number;
  width: number | null;
  height: number | null;
  duration: number | null;
}

export interface Post {
  post_id: string;
  user_id: string;
  caption: string;
  media_type: "photo" | "video" | "carousel";
  location: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  media_files: PostMedia[];
  is_liked: boolean;
  is_saved: boolean;
  created_at: string;
  // フロントで結合するユーザー情報
  author?: User;
}

export interface UploadedMedia {
  media_id: string;
  media_type: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  hls_url: string | null;
  duration: number | null;
  status: "pending" | "processing" | "ready" | "failed";
}

export interface Comment {
  comment_id: string;
  user_id: string;
  content: string;
  like_count: number;
  parent_id: string | null;
  replies: Comment[];
  created_at: string;
  author?: User;
}

export interface Story {
  story_id: string;
  user_id: string;
  media_url: string;
  media_type: "photo" | "video";
  view_count: number;
  expires_at: string;
  is_viewed: boolean;
  created_at: string;
  author?: User;
}

export interface Conversation {
  conversation_id: string;
  members: ConversationMember[];
  last_message?: Message;
  updated_at: string;
  partner?: User;
}

export interface ConversationMember {
  user_id: string;
  last_read_at: string | null;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "post_share";
  is_deleted: boolean;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow" | "follow_request" | "mention" | "story_view";
  ref_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: User;
}

export interface UserIndex {
  user_id: string;
  username: string;
  name: string;
  bio: string;
  profile_img: string;
  is_verified: boolean;
  follower_count: number;
}

export interface HashtagIndex {
  name: string;
  post_count: number;
}

export interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  access: string;
  refresh: string;
}
