import {
    type PlaceholderDataFunction,
    type QueryFunction,
    type QueryKey,
    type QueryObserverOptions,
    type UseQueryResult,
    useQuery,
} from '@tanstack/react-query';
import isEqual from 'fast-deep-equal';
import { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { queryClient } from './queryClient.ts';
import type { FnResolverMetadata, OptionsMetadata } from './queryMutation.types.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { isAxiosError } from 'axios';

export interface CustomQueryResult {
    resetQuery: () => Promise<void>;
    isLoading: boolean;
    isDataChanged: boolean;
}

export type UseGenericQuery<
    TQueryFnData,
    TPayload,
    TData = TQueryFnData,
    TError = unknown
> = (
    payload: TPayload,
    options?: Omit<
        QueryObserverOptions<TQueryFnData, TError, TData>,
        'queryKey' | 'queryFn' | 'meta'
    > & {
        onDataChanged?: (
            newData: TData | undefined,
            oldData: TData | undefined
        ) => void;
        meta?: OptionsMetadata;
    }
) => UseQueryResult<TData, TError> & CustomQueryResult;

export const createUseQuery = <TQueryFnData, TPayload = unknown>(
    keyResolver: [TPayload] extends void
        ? () => QueryKey
        : (payload: TPayload) => QueryKey,
    fnResolver: [TPayload] extends void
        ? () => QueryFunction<TQueryFnData, QueryKey>
        : (payload: TPayload) => QueryFunction<TQueryFnData, QueryKey>,
    basePlaceholderData?:
        | TQueryFnData
        | PlaceholderDataFunction<TQueryFnData, unknown, TQueryFnData, QueryKey>
        | undefined
): {
    (payload: TPayload, options?: {
        onError?: (error: unknown) => void;
        onDataChanged?: (
            newData: TQueryFnData | undefined,
            oldData: TQueryFnData | undefined
        ) => void;
        meta?: OptionsMetadata;
    } & Omit<
        QueryObserverOptions<TQueryFnData, unknown, TQueryFnData>,
        'queryKey' | 'queryFn' | 'meta'
    >): UseQueryResult<TQueryFnData, unknown> & CustomQueryResult;
    queryKey: typeof keyResolver;
    invalidate: (...args: Parameters<typeof keyResolver>) => Promise<void>;
} => {
    const useGenericQuery = <
        TData extends TQueryFnData = TQueryFnData,
        TError = unknown
    >(
        payload: TPayload,
        {
            onError,
            onDataChanged,
            placeholderData,
            ...restOptions
        }: Omit<
            QueryObserverOptions<TQueryFnData, TError, TData>,
            'queryKey' | 'queryFn' | 'meta'
        > & {
            onError?: (error: TError) => void;
            onDataChanged?: (
                newData: TData | undefined,
                oldData: TData | undefined
            ) => void;
            meta?: OptionsMetadata;
        } = {}
    ): UseQueryResult<TData, TError> & CustomQueryResult => {
        const location = useLocation();
        const [searchParams] = useSearchParams();
        const { logout } = useAuth();
        const queryCacheKey = keyResolver(payload);
        const queryMetadata: FnResolverMetadata = {
            getSearchParam: (key: string) => searchParams.get(key),
            queryClient,
        };
        const previousDataRef = useRef<TData>(undefined);

        const query = useQuery<TQueryFnData, TError, TData, QueryKey>({
            queryKey: queryCacheKey,
            queryFn: async (context) =>
                fnResolver(payload)({
                    ...context,
                    meta: {
                        ...context.meta,
                        ...queryMetadata,
                    },
                }),
            meta: {
                ...queryMetadata,
                ...(restOptions.meta ?? {}),
            },
            ...restOptions,
            placeholderData:
                placeholderData ||
                (basePlaceholderData as Parameters<
                    typeof useQuery<TQueryFnData, TError, TData, QueryKey>
                >[0]['placeholderData']),
        });

        // Error handling effect
        useEffect(() => {
            if (query.error) {
                const axiosError = query.error;
                if (!isAxiosError(axiosError)) {
                    throw new Error('Error is not an AxiosError');
                }
                if (axiosError.response?.status === 401) {
                    logout();
                }

                onError?.(query.error);
            }
        }, [query.error, location.pathname, logout, onError]);

        useEffect(() => {
            const currentData = query.data;
            if (onDataChanged && previousDataRef.current && currentData) {
                const dataHasChanged = !isEqual(
                    previousDataRef.current,
                    currentData
                );

                if (dataHasChanged) {
                    onDataChanged(currentData, previousDataRef.current);
                }
            }

            previousDataRef.current = currentData;
        }, [query.data, onDataChanged]);

        const isQueryLoading = query.fetchStatus !== 'idle' && query.isLoading;

        return {
            ...query,
            isLoading: isQueryLoading,
            data:
                typeof restOptions.enabled === 'undefined' ||
                !!restOptions.enabled
                    ? query.data
                    : undefined,
            resetQuery: () =>
                queryClient.resetQueries({ queryKey: queryCacheKey }),
        } as UseQueryResult<TData, TError> & CustomQueryResult;
    };

    useGenericQuery.queryKey = keyResolver;
    useGenericQuery.invalidate = (...args: Parameters<typeof keyResolver>) =>
        queryClient.invalidateQueries({
            queryKey: keyResolver(...args),
            exact: true,
        });

    return useGenericQuery;
};
