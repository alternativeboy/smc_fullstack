export interface User {
  id: string;
  email: string;
  displayName: string;
}

// openapi AuthResponse (refresh token is NOT here — it's the httpOnly cookie).
export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}
