use week_01_foundations::*;

fn tx(
    txid: &str,
    sender: &str,
    recipient: &str,
    amount_sats: u64,
    confirmed: bool,
) -> MockTransaction {
    MockTransaction {
        txid: txid.to_string(),
        sender: sender.to_string(),
        recipient: recipient.to_string(),
        amount_sats,
        confirmed,
    }
}

fn sample_transactions() -> Vec<MockTransaction> {
    vec![
        tx("tx0", "coinbase", "alice", 5_000, true),
        tx("tx1", "alice", "bob", 1_200, true),
        tx("tx2", "bob", "carol", 300, false),
        tx("tx3", "alice", "dave", 800, true),
        tx("tx4", "dave", "alice", 200, true),
        tx("tx5", "carol", "alice", 700, true),
    ]
}

#[test]
fn genesis_hash_matches_known_hash() {
    assert_eq!(genesis_hash(), GENESIS_HASH);
}

#[test]
fn genesis_hash_has_64_chars() {
    assert_eq!(genesis_hash().len(), 64);
}

#[test]
fn genesis_hash_is_lowercase_hex() {
    assert!(genesis_hash().chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn genesis_timestamp_matches_known_value() {
    assert_eq!(genesis_timestamp(), 1_231_006_505);
}

#[test]
fn genesis_reward_is_50_btc() {
    assert_eq!(genesis_reward_sats(), 5_000_000_000);
}

#[test]
fn genesis_message_mentions_times() {
    assert!(genesis_message().contains("The Times 03/Jan/2009"));
}

#[test]
fn genesis_summary_contains_hash_and_timestamp() {
    let summary = genesis_summary();
    assert!(summary.contains(GENESIS_HASH));
    assert!(summary.contains("1231006505"));
}

#[test]
fn genesis_summary_contains_reward_and_message() {
    let summary = genesis_summary();
    assert!(summary.contains("5000000000"));
    assert!(summary.contains("Chancellor"));
}

#[test]
fn block_subsidy_at_genesis() {
    assert_eq!(block_subsidy(0), 5_000_000_000);
}

#[test]
fn block_subsidy_before_first_halving() {
    assert_eq!(block_subsidy(209_999), 5_000_000_000);
}

#[test]
fn block_subsidy_at_first_halving() {
    assert_eq!(block_subsidy(210_000), 2_500_000_000);
}

#[test]
fn block_subsidy_after_first_halving() {
    assert_eq!(block_subsidy(210_001), 2_500_000_000);
}

#[test]
fn block_subsidy_at_second_halving() {
    assert_eq!(block_subsidy(420_000), 1_250_000_000);
}

#[test]
fn block_subsidy_at_third_halving() {
    assert_eq!(block_subsidy(630_000), 625_000_000);
}

#[test]
fn block_subsidy_after_sixty_four_halvings_is_zero() {
    assert_eq!(block_subsidy(13_440_000), 0);
}

#[test]
fn format_sats_formats_zero() {
    assert_eq!(format_sats(0), "0.00000000 BTC");
}

#[test]
fn format_sats_formats_one_sat() {
    assert_eq!(format_sats(1), "0.00000001 BTC");
}

#[test]
fn format_sats_formats_half_btc() {
    assert_eq!(format_sats(50_000_000), "0.50000000 BTC");
}

#[test]
fn format_sats_formats_one_btc() {
    assert_eq!(format_sats(100_000_000), "1.00000000 BTC");
}

#[test]
fn format_sats_formats_fractional_btc() {
    assert_eq!(format_sats(123_456_789), "1.23456789 BTC");
}

#[test]
fn format_sats_formats_fifty_btc() {
    assert_eq!(format_sats(5_000_000_000), "50.00000000 BTC");
}

#[test]
fn transaction_new_copies_txid() {
    let transaction = MockTransaction::new("tx99", "alice", "bob", 42, true);
    assert_eq!(transaction.txid, "tx99");
}

#[test]
fn transaction_new_copies_sender_and_recipient() {
    let transaction = MockTransaction::new("tx99", "alice", "bob", 42, true);
    assert_eq!(transaction.sender, "alice");
    assert_eq!(transaction.recipient, "bob");
}

#[test]
fn transaction_new_sets_amount() {
    let transaction = MockTransaction::new("tx99", "alice", "bob", 42, true);
    assert_eq!(transaction.amount_sats, 42);
}

#[test]
fn transaction_new_sets_confirmation_flag() {
    let transaction = MockTransaction::new("tx99", "alice", "bob", 42, false);
    assert!(!transaction.confirmed);
}

#[test]
fn count_confirmed_counts_mixed_transactions() {
    assert_eq!(count_confirmed(&sample_transactions()), 5);
}

#[test]
fn count_confirmed_returns_zero_for_empty_slice() {
    assert_eq!(count_confirmed(&[]), 0);
}

#[test]
fn count_confirmed_counts_all_confirmed_transactions() {
    let transactions = vec![
        tx("a", "alice", "bob", 1, true),
        tx("b", "bob", "alice", 2, true),
    ];
    assert_eq!(count_confirmed(&transactions), 2);
}

#[test]
fn count_unconfirmed_counts_mixed_transactions() {
    assert_eq!(count_unconfirmed(&sample_transactions()), 1);
}

#[test]
fn count_unconfirmed_returns_zero_when_all_are_confirmed() {
    let transactions = vec![
        tx("a", "alice", "bob", 1, true),
        tx("b", "bob", "alice", 2, true),
    ];
    assert_eq!(count_unconfirmed(&transactions), 0);
}

#[test]
fn total_amount_sums_all_transactions() {
    assert_eq!(total_amount(&sample_transactions()), 8_200);
}

#[test]
fn total_amount_returns_zero_for_empty_slice() {
    assert_eq!(total_amount(&[]), 0);
}

#[test]
fn total_amount_includes_unconfirmed_transactions() {
    let transactions = vec![
        tx("a", "alice", "bob", 1, false),
        tx("b", "bob", "alice", 2, true),
    ];
    assert_eq!(total_amount(&transactions), 3);
}

#[test]
fn average_amount_rounds_down() {
    assert_eq!(average_amount(&sample_transactions()), 1_366);
}

#[test]
fn average_amount_returns_zero_for_empty_slice() {
    assert_eq!(average_amount(&[]), 0);
}

#[test]
fn filter_by_sender_returns_matching_transactions() {
    let matches = filter_by_sender(&sample_transactions(), "alice");
    assert_eq!(matches.len(), 2);
    assert!(matches
        .iter()
        .all(|transaction| transaction.sender == "alice"));
}

#[test]
fn filter_by_sender_returns_empty_vec_when_missing() {
    assert!(filter_by_sender(&sample_transactions(), "satoshi").is_empty());
}

#[test]
fn filter_by_recipient_returns_matching_transactions() {
    let matches = filter_by_recipient(&sample_transactions(), "alice");
    assert_eq!(matches.len(), 3);
    assert!(matches
        .iter()
        .all(|transaction| transaction.recipient == "alice"));
}

#[test]
fn filter_by_recipient_returns_empty_vec_when_missing() {
    assert!(filter_by_recipient(&sample_transactions(), "satoshi").is_empty());
}

#[test]
fn filter_confirmed_returns_only_confirmed_transactions() {
    let matches = filter_confirmed(&sample_transactions());
    assert_eq!(matches.len(), 5);
    assert!(matches.iter().all(|transaction| transaction.confirmed));
}

#[test]
fn filter_confirmed_keeps_original_order() {
    let ids: Vec<String> = filter_confirmed(&sample_transactions())
        .into_iter()
        .map(|transaction| transaction.txid)
        .collect();
    assert_eq!(ids, vec!["tx0", "tx1", "tx3", "tx4", "tx5"]);
}

#[test]
fn transaction_ids_returns_all_ids_in_order() {
    assert_eq!(
        transaction_ids(&sample_transactions()),
        vec!["tx0", "tx1", "tx2", "tx3", "tx4", "tx5"]
    );
}

#[test]
fn transaction_ids_returns_empty_vec_for_empty_slice() {
    assert!(transaction_ids(&[]).is_empty());
}

#[test]
fn find_transaction_returns_matching_transaction() {
    let transaction = find_transaction(&sample_transactions(), "tx3").unwrap();
    assert_eq!(transaction.sender, "alice");
    assert_eq!(transaction.recipient, "dave");
}

#[test]
fn find_transaction_returns_none_when_missing() {
    assert_eq!(find_transaction(&sample_transactions(), "missing"), None);
}

#[test]
fn amounts_over_returns_amounts_strictly_greater_than_minimum() {
    assert_eq!(
        amounts_over(&sample_transactions(), 700),
        vec![5_000, 1_200, 800]
    );
}

#[test]
fn amounts_over_returns_empty_vec_when_none_match() {
    assert!(amounts_over(&sample_transactions(), 10_000).is_empty());
}

#[test]
fn address_received_total_counts_confirmed_incoming_only() {
    assert_eq!(
        address_received_total(&sample_transactions(), "alice"),
        5_900
    );
}

#[test]
fn address_sent_total_counts_confirmed_outgoing_only() {
    assert_eq!(address_sent_total(&sample_transactions(), "alice"), 2_000);
}

#[test]
fn net_balance_change_is_received_minus_sent() {
    assert_eq!(net_balance_change(&sample_transactions(), "alice"), 3_900);
}

#[test]
fn build_balances_tracks_alice() {
    let balances = build_balances(&sample_transactions());
    assert_eq!(balances.get("alice"), Some(&3_900));
}

#[test]
fn build_balances_tracks_coinbase_as_sender() {
    let balances = build_balances(&sample_transactions());
    assert_eq!(balances.get("coinbase"), Some(&-5_000));
}

#[test]
fn build_balances_ignores_unconfirmed_transactions() {
    let balances = build_balances(&sample_transactions());
    assert_eq!(balances.get("bob"), Some(&1_200));
    assert_eq!(balances.get("carol"), Some(&-700));
}

#[test]
fn build_balances_returns_empty_map_for_empty_slice() {
    assert!(build_balances(&[]).is_empty());
}

#[test]
fn is_coinbase_returns_true_for_coinbase_sender() {
    assert!(is_coinbase(&tx("coinbase", "coinbase", "alice", 50, true)));
}

#[test]
fn is_coinbase_returns_false_for_regular_sender() {
    assert!(!is_coinbase(&tx("regular", "alice", "bob", 50, true)));
}

#[test]
fn classify_amount_labels_dust() {
    assert_eq!(classify_amount(545), "dust");
}

#[test]
fn classify_amount_labels_micro() {
    assert_eq!(classify_amount(10_000), "micro");
}

#[test]
fn classify_amount_labels_standard() {
    assert_eq!(classify_amount(1_000_000), "standard");
}

#[test]
fn classify_amount_labels_large() {
    assert_eq!(classify_amount(100_000_000), "large");
}
