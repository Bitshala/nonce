import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export const getAxiosRequestHostname = (
  config: AxiosRequestConfig | undefined
) => {
  const url = config?.url;
  return url ? new URL(url).origin : undefined;
};

export const { isAxiosError } = axios;

export const isNetworkError = (error: AxiosError) =>
  error.message?.includes('Network Error') || !error.response;