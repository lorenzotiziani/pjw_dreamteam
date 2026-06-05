// models/api-response.model.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}