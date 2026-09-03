import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { getAuthTokenFromStorage } from './authService.ts';
import type {
  AssignmentDetailResponse,
  AssignmentSummaryResponse,
  CIRunDetailResponse,
  CIRunLogResponse,
  CIRunSummaryResponse,
  CreateCommitRequest,
  CreateCommitResponse,
  DraftResponse,
  RepoFileResponse,
  RepoTreeResponse,
  SubmissionResponse,
} from '@nonce/shared';

const COMMON_REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * In-house classroom endpoints, split from apiService because the editor is a
 * distinct surface with its own timeout needs: a commit fans out to a blob
 * request per changed file on the backend, so the default 10s is too tight.
 */
class AssignmentService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });
  }

  private async request<T>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.request<T>(config);
  }

  private getRequestHeaders(): AxiosHeaders {
    const headers = new AxiosHeaders(COMMON_REQUEST_HEADERS);
    const authToken = getAuthTokenFromStorage();
    if (authToken) {
      headers.setAuthorization(`Bearer ${authToken}`);
    }
    return headers;
  }

  // =========================
  // Assignments
  // =========================

  public listMyAssignments = async (): Promise<
    AssignmentSummaryResponse[]
  > => {
    const { data } = await this.request<AssignmentSummaryResponse[]>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/assignments/me',
    });
    return data;
  };

  public getAssignment = async (
    assignmentId: string
  ): Promise<AssignmentDetailResponse> => {
    const { data } = await this.request<AssignmentDetailResponse>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/assignments/${assignmentId}`,
    });
    return data;
  };

  public acceptAssignment = async (
    assignmentId: string
  ): Promise<SubmissionResponse> => {
    const { data } = await this.request<SubmissionResponse>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/assignments/${assignmentId}/accept`,
    });
    return data;
  };

  // =========================
  // Editor
  // =========================

  public getTree = async (
    submissionId: string,
    ref?: string
  ): Promise<RepoTreeResponse> => {
    const { data } = await this.request<RepoTreeResponse>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/submissions/${submissionId}/tree`,
      params: ref ? { ref } : undefined,
    });
    return data;
  };

  public getFile = async (
    submissionId: string,
    path: string,
    ref?: string
  ): Promise<RepoFileResponse> => {
    const { data } = await this.request<RepoFileResponse>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/submissions/${submissionId}/file`,
      params: { path, ...(ref ? { ref } : {}) },
    });
    return data;
  };

  public commit = async (
    submissionId: string,
    body: CreateCommitRequest
  ): Promise<CreateCommitResponse> => {
    const { data } = await this.request<CreateCommitResponse>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/submissions/${submissionId}/commit`,
      data: body,
    });
    return data;
  };

  public saveDraft = async (
    submissionId: string,
    path: string,
    content: string
  ): Promise<DraftResponse> => {
    const { data } = await this.request<DraftResponse>({
      headers: this.getRequestHeaders(),
      method: 'PUT',
      url: `/submissions/${submissionId}/draft`,
      data: { path, content },
    });
    return data;
  };

  public getDraft = async (
    submissionId: string,
    path: string
  ): Promise<DraftResponse | null> => {
    const { data } = await this.request<DraftResponse | null>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/submissions/${submissionId}/draft`,
      params: { path },
    });
    return data;
  };

  // =========================
  // Runs
  // =========================

  public createRun = async (
    submissionId: string,
    commitSha: string
  ): Promise<CIRunDetailResponse> => {
    const { data } = await this.request<CIRunDetailResponse>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/submissions/${submissionId}/runs`,
      data: { commitSha },
    });
    return data;
  };

  public listRuns = async (
    submissionId: string
  ): Promise<CIRunSummaryResponse[]> => {
    const { data } = await this.request<CIRunSummaryResponse[]>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/submissions/${submissionId}/runs`,
    });
    return data;
  };

  public getRun = async (runId: string): Promise<CIRunDetailResponse> => {
    const { data } = await this.request<CIRunDetailResponse>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/runs/${runId}`,
    });
    return data;
  };

  public getRunLogs = async (runId: string): Promise<CIRunLogResponse> => {
    const { data } = await this.request<CIRunLogResponse>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/runs/${runId}/logs`,
    });
    return data;
  };

  /** The export path — students have no GitHub access, so this is how they keep their work. */
  public downloadArchiveUrl = (submissionId: string): string =>
    `${API_BASE_URL}/submissions/${submissionId}/archive`;
}

const assignmentService = new AssignmentService();
export default assignmentService;
