use week_02_ownership::*;

#[test]
fn palindrome_accepts_empty_string() {
    assert!(is_palindrome(""));
}

#[test]
fn palindrome_accepts_single_character() {
    assert!(is_palindrome("x"));
}

#[test]
fn palindrome_accepts_simple_word() {
    assert!(is_palindrome("racecar"));
}

#[test]
fn palindrome_ignores_case() {
    assert!(is_palindrome("RaceCar"));
}

#[test]
fn palindrome_ignores_spaces_and_punctuation() {
    assert!(is_palindrome("A man, a plan, a canal: Panama"));
}

#[test]
fn palindrome_rejects_regular_word() {
    assert!(!is_palindrome("bitcoin"));
}

#[test]
fn palindrome_accepts_numeric_text() {
    assert!(is_palindrome("12 3 21"));
}

#[test]
fn palindrome_accepts_only_separators() {
    assert!(is_palindrome("   ,,,   "));
}

#[test]
fn simple_hash_hashes_empty_string_to_zero() {
    assert_eq!(simple_hash(""), 0);
}

#[test]
fn simple_hash_hashes_one_byte() {
    assert_eq!(simple_hash("a"), 97);
}

#[test]
fn simple_hash_hashes_two_bytes() {
    assert_eq!(simple_hash("ab"), 3_105);
}

#[test]
fn simple_hash_hashes_three_bytes() {
    assert_eq!(simple_hash("abc"), 96_354);
}

#[test]
fn simple_hash_hashes_longer_words() {
    assert_eq!(simple_hash("hello"), 99_162_322);
}

#[test]
fn calculate_fee_returns_difference() {
    assert_eq!(calculate_fee(10_000, 9_000), Some(1_000));
}

#[test]
fn calculate_fee_allows_exact_match() {
    assert_eq!(calculate_fee(10_000, 10_000), Some(0));
}

#[test]
fn calculate_fee_rejects_outputs_larger_than_inputs() {
    assert_eq!(calculate_fee(9_999, 10_000), None);
}

#[test]
fn calculate_fee_handles_zero_input_and_output() {
    assert_eq!(calculate_fee(0, 0), Some(0));
}

#[test]
fn calculate_fee_handles_large_values() {
    assert_eq!(calculate_fee(50_000_000, 49_999_001), Some(999));
}

#[test]
fn fee_rate_rounds_up() {
    assert_eq!(fee_rate(251, 100), Some(3));
}

#[test]
fn fee_rate_returns_exact_rate_when_divisible() {
    assert_eq!(fee_rate(250, 125), Some(2));
}

#[test]
fn fee_rate_rejects_zero_vbytes() {
    assert_eq!(fee_rate(10, 0), None);
}

#[test]
fn select_longer_returns_left_when_left_is_longer() {
    assert_eq!(select_longer("bitcoin", "rust"), "bitcoin");
}

#[test]
fn select_longer_returns_right_when_right_is_longer() {
    assert_eq!(select_longer("node", "transaction"), "transaction");
}

#[test]
fn select_longer_returns_left_when_lengths_are_equal() {
    assert_eq!(select_longer("hash", "node"), "hash");
}

#[test]
fn first_word_returns_first_slice() {
    assert_eq!(first_word("bitcoin node"), "bitcoin");
}

#[test]
fn first_word_skips_leading_whitespace() {
    assert_eq!(first_word("   mempool transaction"), "mempool");
}

#[test]
fn first_word_returns_empty_slice_for_empty_input() {
    assert_eq!(first_word(""), "");
}

#[test]
fn last_word_returns_last_slice() {
    assert_eq!(last_word("bitcoin node"), "node");
}

#[test]
fn last_word_ignores_trailing_whitespace() {
    assert_eq!(last_word("block header   "), "header");
}

#[test]
fn last_word_returns_empty_slice_for_empty_input() {
    assert_eq!(last_word(""), "");
}

#[test]
fn trim_prefix_removes_matching_prefix() {
    assert_eq!(trim_prefix("txid_123", "txid_"), "123");
}

#[test]
fn trim_prefix_returns_original_when_prefix_is_missing() {
    assert_eq!(trim_prefix("block_123", "txid_"), "block_123");
}

#[test]
fn trim_prefix_handles_empty_prefix() {
    assert_eq!(trim_prefix("txid_123", ""), "txid_123");
}

#[test]
fn parse_sats_parses_plain_number() {
    assert_eq!(parse_sats("5000"), Some(5_000));
}

#[test]
fn parse_sats_trims_whitespace() {
    assert_eq!(parse_sats("  42  "), Some(42));
}

#[test]
fn parse_sats_returns_none_for_empty_input() {
    assert_eq!(parse_sats("   "), None);
}

#[test]
fn parse_sats_returns_none_for_negative_input() {
    assert_eq!(parse_sats("-1"), None);
}

#[test]
fn parse_sats_returns_none_for_words() {
    assert_eq!(parse_sats("five"), None);
}

#[test]
fn split_once_colon_splits_key_and_value() {
    assert_eq!(
        split_once_colon("height:840000"),
        Some(("height", "840000"))
    );
}

#[test]
fn split_once_colon_trims_both_sides() {
    assert_eq!(
        split_once_colon(" txid : abc123 "),
        Some(("txid", "abc123"))
    );
}

#[test]
fn split_once_colon_returns_none_without_colon() {
    assert_eq!(split_once_colon("missing"), None);
}

#[test]
fn join_txids_joins_with_commas() {
    assert_eq!(join_txids(&["a", "b", "c"]), "a,b,c");
}

#[test]
fn join_txids_returns_empty_string_for_empty_slice() {
    assert_eq!(join_txids(&[]), "");
}

#[test]
fn normalize_label_trims_and_lowercases() {
    assert_eq!(normalize_label("  Main Wallet  "), "main-wallet");
}

#[test]
fn normalize_label_collapses_multiple_spaces() {
    assert_eq!(
        normalize_label("Cold   Storage Wallet"),
        "cold-storage-wallet"
    );
}

#[test]
fn normalize_label_preserves_non_space_characters() {
    assert_eq!(normalize_label("Node-01"), "node-01");
}

#[test]
fn contains_txid_finds_existing_value() {
    let txids = vec!["a".to_string(), "b".to_string()];
    assert!(contains_txid(&txids, "b"));
}

#[test]
fn contains_txid_returns_false_for_missing_value() {
    let txids = vec!["a".to_string(), "b".to_string()];
    assert!(!contains_txid(&txids, "c"));
}

#[test]
fn duplicate_with_suffix_allocates_new_string() {
    assert_eq!(duplicate_with_suffix("txid", "_copy"), "txid_copy");
}

#[test]
fn total_byte_len_sums_string_lengths() {
    assert_eq!(total_byte_len(&["abc", "de", ""]), 5);
}

#[test]
fn borrowed_or_default_returns_value_when_present() {
    assert_eq!(borrowed_or_default(Some("txid"), "fallback"), "txid");
}

#[test]
fn borrowed_or_default_returns_default_when_missing() {
    assert_eq!(borrowed_or_default(None, "fallback"), "fallback");
}

#[test]
fn lookup_amount_returns_matching_amount() {
    let pairs = [("alice", 10), ("bob", 20)];
    assert_eq!(lookup_amount(&pairs, "bob"), Some(20));
}

#[test]
fn lookup_amount_returns_none_for_missing_key() {
    let pairs = [("alice", 10), ("bob", 20)];
    assert_eq!(lookup_amount(&pairs, "carol"), None);
}

#[test]
fn parse_outpoint_parses_txid_and_vout() {
    assert_eq!(
        parse_outpoint("abc123:2"),
        Some(ParsedOutpoint {
            txid: "abc123",
            vout: 2
        })
    );
}

#[test]
fn parse_outpoint_trims_fields() {
    assert_eq!(
        parse_outpoint(" abc123 : 7 "),
        Some(ParsedOutpoint {
            txid: "abc123",
            vout: 7
        })
    );
}

#[test]
fn parse_outpoint_rejects_missing_colon() {
    assert_eq!(parse_outpoint("abc123"), None);
}

#[test]
fn parse_outpoint_rejects_empty_txid() {
    assert_eq!(parse_outpoint(":0"), None);
}

#[test]
fn parse_outpoint_rejects_non_numeric_vout() {
    assert_eq!(parse_outpoint("abc123:not-a-number"), None);
}
