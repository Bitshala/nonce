/**
 * Pagination envelope used by every server-side list endpoint.
 *
 * The backend's class versions (apps/backend/src/common/dto.ts) carry
 * class-validator decorators and must stay classes for the global
 * ValidationPipe; they declare `implements` against these interfaces.
 */
export interface PaginatedQuery {
  pageSize: number;
  page: number;
}

export interface PaginatedData<TData> {
  totalRecords: number;
  records: TData[];
}
