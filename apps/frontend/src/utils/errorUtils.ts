import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

export const getAxiosRequestHostname = (
  config: AxiosRequestConfig | undefined
) => {
  const url = config?.url;
  return url ? new URL(url).origin : undefined;
};

export const { isAxiosError } = axios;

export const isNetworkError = (error: AxiosError) =>
  error.message?.includes('Network Error') || !error.response;

export const extractErrorMessage = (error: unknown): string => {
  let errorMessage = 'An error occurred';

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const responseError = error as { response?: { data?: { message?: string; errorId?: string } } };
    if (responseError.response?.data?.message) {
      errorMessage = responseError.response.data.message;
      if (responseError.response.data.errorId) {
        errorMessage += ` (Error ID: ${responseError.response.data.errorId})`;
      }
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return errorMessage;
};