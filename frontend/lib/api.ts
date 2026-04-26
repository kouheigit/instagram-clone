import axios, { AxiosError } from "axios";

const BASE_URL = "http://localhost:8888/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// リクエストにJWTトークンを付与
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 401時にリフレッシュ or ログアウト
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
          const newAccess = res.data.access;
          localStorage.setItem("access_token", newAccess);
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${newAccess}`;
            return api.request(error.config);
          }
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authApi = {
  login: (username: string, password: string) =>
    api.post("/auth/login/", { username, password }),
  register: (data: { username: string; email: string; password: string; bio?: string }) =>
    api.post("/auth/register/", data),
  me: () => api.get("/users/me/"),
};

// --- Posts ---
export const postsApi = {
  list: (cursor?: string) =>
    api.get("/posts/", { params: cursor ? { cursor } : {} }),
  get: (postId: string) => api.get(`/posts/${postId}/`),
  create: (data: { caption: string; media_files: { media_url: string; media_order: number; thumbnail_url?: string; hls_url?: string; duration?: number }[]; media_type: string; location?: string }) =>
    api.post("/posts/", data),
  delete: (postId: string) => api.delete(`/posts/${postId}/`),
  like: (postId: string) => api.post(`/posts/${postId}/like/`),
  unlike: (postId: string) => api.delete(`/posts/${postId}/like/`),
  view: (postId: string) => api.post(`/posts/${postId}/view/`),
  likes: (postId: string) => api.get(`/posts/${postId}/likes/`),
  save: (postId: string) => api.post(`/posts/${postId}/save/`),
  unsave: (postId: string) => api.delete(`/posts/${postId}/save/`),
  comments: (postId: string) => api.get(`/posts/${postId}/comments/`),
  addComment: (postId: string, content: string, parentId?: string) =>
    api.post(`/posts/${postId}/comments/`, { content, parent_id: parentId }),
  deleteComment: (postId: string, commentId: string) =>
    api.delete(`/posts/${postId}/comments/${commentId}/`),
  likeComment: (postId: string, commentId: string) =>
    api.post(`/posts/${postId}/comments/${commentId}/like/`),
  userPosts: (userId: string) => api.get(`/posts/user/${userId}/`),
  byHashtag: (tag: string) => api.get(`/posts/hashtag/${tag}/`),
  savedPosts: () => api.get(`/posts/saved/`),
};

// --- Feed ---
export const feedApi = {
  home: () => api.get("/feed/"),
  explore: () => api.get("/feed/explore/"),
};

// --- Users ---
export const usersApi = {
  profile: (username: string) => api.get(`/users/${username}/`),
  byIds: (ids: string[]) => api.get(`/users/by-ids/`, { params: { ids: ids.join(",") } }),
  follow: (username: string) => api.post(`/users/${username}/follow/`),
  unfollow: (username: string) => api.delete(`/users/${username}/unfollow/`),
  isFollowing: (username: string) => api.get(`/users/${username}/is-following/`),
  followers: (username: string) => api.get(`/users/${username}/followers/`),
  following: (username: string) => api.get(`/users/${username}/following/`),
  followingIds: () => api.get(`/users/me/following-ids/`),
  suggestions: () => api.get(`/users/suggestions/`),
  updateMe: (data: { bio?: string; website?: string; gender?: string; show_account_suggestions?: boolean; profile_img?: string; is_private?: boolean }) =>
    api.patch(`/users/me/`, data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post(`/auth/password/change/`, { old_password: oldPassword, new_password: newPassword }),
  pendingFollowRequests: () => api.get(`/users/me/follow-requests/`),
  approveFollowRequest: (username: string) => api.post(`/users/${username}/follow-request/approve/`),
  rejectFollowRequest: (username: string) => api.delete(`/users/${username}/follow-request/reject/`),
};

// --- Stories ---
export const storiesApi = {
  create: (data: { media_url: string; media_type: string }) =>
    api.post("/stories/", data),
  userStories: (userId: string) => api.get(`/stories/user/${userId}/`),
  byUsers: (ids: string[]) => api.get(`/stories/by-users/`, { params: { ids: ids.join(",") } }),
  view: (storyId: string) => api.post(`/stories/${storyId}/view/`),
};

// --- DM ---
export const dmApi = {
  conversations: () => api.get("/dm/"),
  start: (partnerId: string) => api.post("/dm/start/", { partner_id: partnerId }),
  messages: (conversationId: string) =>
    api.get(`/dm/${conversationId}/messages/`),
  send: (conversationId: string, content: string) =>
    api.post(`/dm/${conversationId}/messages/send/`, { content, message_type: "text" }),
  markRead: (conversationId: string) =>
    api.post(`/dm/${conversationId}/read/`),
};

// --- Notifications ---
export const notificationsApi = {
  list: () => api.get("/notifications/"),
  unreadCount: () => api.get("/notifications/unread/"),
  markAllRead: () => api.post("/notifications/read-all/"),
  markRead: (notificationId: string) => api.post(`/notifications/${notificationId}/read/`),
  delete: (notificationId: string) => api.delete(`/notifications/${notificationId}/`),
};

// --- Stories ---
export const storiesExtApi = {
  viewers: (storyId: string) => api.get(`/stories/${storyId}/viewers/`),
};

// --- Media ---
export const mediaApi = {
  upload: (formData: FormData, onProgress?: (percent: number) => void) =>
    api.post("/media/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180000, // 3分（大容量動画対応）
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }),
  get: (mediaId: string) => api.get(`/media/${mediaId}/`),
};

// --- Search ---
export const searchApi = {
  search: (q: string) => api.get("/search/", { params: { q } }),
};
