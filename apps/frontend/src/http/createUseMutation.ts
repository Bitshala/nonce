import {
    QueryClient,
    UseMutationOptions,
    UseMutationResult,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FnResolverMetadata, OptionsMetadata } from './queryMutation.types.ts';
import { useAuth } from '../hooks/useAuth.ts';

export interface CustomMutationResult<TPayload = unknown> {
    debouncedMutate: (
        variables: TPayload,
        debounceMs: number,
        callback?: () => void
    ) => void;
}

export type CustomMutationFn<TData = unknown, TVariables = unknown> = (
    variables: TVariables,
    meta: FnResolverMetadata
) => Promise<TData>;

export const createUseMutation = <TData = unknown, TPayload = void>(
    mutationFn: CustomMutationFn<TData, TPayload>,
    options: {
        queryInvalidation?: (arg: {
            variables: TPayload;
            data: TData;
            queryClient: QueryClient;
        }) => Promise<void>;
    } = {}
) : {
    <TContext = unknown, TError = unknown>(
        opts?: UseMutationOptions<TData, TError, TPayload, TContext> & {
            meta?: OptionsMetadata;
            shouldInvalidateQueries?: boolean;
        }
    ): UseMutationResult<TData, TError, TPayload, TContext> &
        CustomMutationResult<TPayload>;
} => {
    const useGenericMutation = <TContext = unknown, TError = unknown>({
        onError,
        onSuccess,
        shouldInvalidateQueries = true,
        ...restOptions
    }: UseMutationOptions<TData, TError, TPayload, TContext> & {
        meta?: OptionsMetadata;
        shouldInvalidateQueries?: boolean;
    } = {}): UseMutationResult<TData, TError, TPayload, TContext> &
        CustomMutationResult<TPayload> => {
        const queryClient = useQueryClient();
        const [searchParams] = useSearchParams();
        const { logout } = useAuth();
        const debounceTimeoutRef = useRef<number | undefined>(undefined);
        const fnResolverMeta: FnResolverMetadata = {
            getSearchParam: (key: string) => searchParams.get(key),
            queryClient,
        };

        const mutation = useMutation<TData, TError, TPayload, TContext>({
            mutationFn: async (payload) => mutationFn(payload, fnResolverMeta),
            onError: async (err, variables, context) => {
                const axiosError = err as AxiosError;

                if (axiosError.response) {
                    if (axiosError.response?.status === 401) {
                        logout();
                    }
                }

                if (onError) {
                    await onError(err, variables, context);
                }
            },
            onSuccess: async (data, variables, context) => {
                if (onSuccess) {
                    onSuccess(data, variables, context);
                }

                const { queryInvalidation } = options;
                if (shouldInvalidateQueries && queryInvalidation) {
                    await queryInvalidation({
                        variables,
                        data,
                        queryClient,
                    });
                }
            },
            ...restOptions,
        });

        const debouncedMutate = useCallback(
            (
                variables: TPayload,
                debounceMs: number,
                callback?: () => void
            ) => {
                if (debounceTimeoutRef.current !== undefined) {
                    clearTimeout(<number>debounceTimeoutRef.current);
                }

                debounceTimeoutRef.current = window.setTimeout(() => {
                    (async () => {
                        await mutation.mutateAsync(variables);
                        callback?.();
                    })();
                }, debounceMs);
            },
            [mutation]
        );

        return {
            ...mutation,
            debouncedMutate,
        };
    };

    return useGenericMutation;
};
