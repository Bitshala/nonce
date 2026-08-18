// The enums themselves now live in @nonce/shared so the frontend consumes the
// exact same values instead of maintaining a hand-copied subset.
//
// This barrel stays so the 62 backend files that import from '@/common/enum'
// keep working unchanged. Import from either path; they are the same symbols.
export * from '@nonce/shared/enums';
