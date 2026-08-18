import { IsNumber, IsOptional, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { PaginatedData, PaginatedQuery } from '@nonce/shared';

export class PaginatedQueryDto implements PaginatedQuery {
    @IsNumber()
    @Type(() => Number)
    @Max(100)
    pageSize = 10;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page = 0;
}

export class PaginatedDataDto<TData> implements PaginatedData<TData> {
    totalRecords: number;

    records: TData[];

    constructor(obj: PaginatedDataDto<TData>) {
        this.totalRecords = obj.totalRecords;
        this.records = obj.records;
    }
}
