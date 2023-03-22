export interface LoginValidationResponse {
    computingID?: string;
    token?: string;
    success: boolean;
    courses: string[],
    error?: string;
}