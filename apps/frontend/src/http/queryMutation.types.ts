import { type MutationMeta, QueryClient, type QueryMeta } from '@tanstack/react-query';

type Metadata = MutationMeta & QueryMeta;

export type OptionsMetadata = Metadata

export interface FnResolverMetadata extends QueryMeta {
    getSearchParam: (key: string) => string | null;
    queryClient: QueryClient;
}
