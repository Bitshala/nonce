use std::io;

use uuid::Uuid;
use week_04_errors_traits::*;

fn input(previous_txid: &str, previous_vout: u32) -> TxInput {
    TxInput {
        previous_txid: previous_txid.to_string(),
        previous_vout,
    }
}

fn output(value_sats: u64, recipient: &str, status: TxStatus) -> TxOutput {
    TxOutput {
        value_sats,
        unique_id: Uuid::from_u128(value_sats as u128 + recipient.len() as u128),
        recipient: recipient.to_string(),
        status,
    }
}

fn coinbase_tx() -> Transaction {
    Transaction {
        txid: "coinbase".to_string(),
        inputs: vec![],
        outputs: vec![output(5_000, "alice", TxStatus::Unspent)],
    }
}

fn spend_tx(txid: &str) -> Transaction {
    Transaction {
        txid: txid.to_string(),
        inputs: vec![input("coinbase", 0)],
        outputs: vec![
            output(1_200, "bob", TxStatus::Unspent),
            output(300, "alice", TxStatus::Spent),
        ],
    }
}

fn header(block_hash: &str) -> BlockHeader {
    BlockHeader {
        block_hash: block_hash.to_string(),
        previous_block_hash: "prev".to_string(),
        merkle_root: "root".to_string(),
        timestamp: 1_700_000_000,
        nonce: 42,
    }
}

fn sample_transactions() -> Vec<Transaction> {
    vec![coinbase_tx(), spend_tx("tx1"), spend_tx("tx2")]
}

fn sample_block() -> Block {
    Block {
        header: header("block-1"),
        transactions: sample_transactions(),
        height: 1,
        network: Network::Regtest,
    }
}

#[test]
fn tx_input_new_copies_fields() {
    let input = TxInput::new("abc", 2);
    assert_eq!(input.previous_txid, "abc");
    assert_eq!(input.previous_vout, 2);
}

#[test]
fn tx_output_new_copies_fields_and_generates_uuid() {
    let output = TxOutput::new(500, "alice", TxStatus::Unspent);
    assert_eq!(output.value_sats, 500);
    assert_ne!(output.unique_id, Uuid::nil());
    assert_eq!(output.recipient, "alice");
    assert_eq!(output.status, TxStatus::Unspent);
}

#[test]
fn tx_output_is_unspent_matches_status() {
    assert!(output(1, "alice", TxStatus::Unspent).is_unspent());
    assert!(!output(1, "alice", TxStatus::Spent).is_unspent());
}

#[test]
fn transaction_total_output_value_sums_outputs() {
    assert_eq!(spend_tx("tx1").total_output_value(), 1_500);
}

#[test]
fn transaction_counts_unspent_outputs() {
    assert_eq!(spend_tx("tx1").unspent_output_count(), 1);
}

#[test]
fn transaction_validate_accepts_coinbase_transaction() {
    assert_eq!(coinbase_tx().validate(), Ok(()));
}

#[test]
fn transaction_validate_accepts_regular_transaction() {
    assert_eq!(spend_tx("tx1").validate(), Ok(()));
}

#[test]
fn transaction_validate_rejects_missing_inputs_for_regular_tx() {
    let transaction = Transaction {
        txid: "regular".to_string(),
        inputs: vec![],
        outputs: vec![output(1, "alice", TxStatus::Unspent)],
    };
    assert_eq!(transaction.validate(), Err(BtcLibError::MissingInputs));
}

#[test]
fn transaction_validate_rejects_zero_value_output() {
    let transaction = Transaction {
        txid: "tx1".to_string(),
        inputs: vec![input("prev", 0)],
        outputs: vec![output(0, "alice", TxStatus::Unspent)],
    };
    assert_eq!(transaction.validate(), Err(BtcLibError::ZeroValueOutput));
}

#[test]
fn transaction_hash_material_uses_inputs_and_outputs() {
    assert_eq!(
        spend_tx("tx1").hash_material(),
        "tx:tx1|inputs:coinbase:0;|outputs:1200:bob:unspent;300:alice:spent;"
    );
}

#[test]
fn transaction_hash_hex_matches_sha256() {
    let transaction = spend_tx("tx1");
    assert_eq!(
        transaction.hash_hex(),
        sha256::digest(transaction.hash_material())
    );
}

#[test]
fn parse_status_trims_and_ignores_case() {
    assert_eq!(parse_status(" UnSpent "), Ok(TxStatus::Unspent));
}

#[test]
fn parse_status_rejects_unknown_status() {
    assert_eq!(parse_status("pending"), Err(BtcLibError::MalformedData));
}

#[test]
fn parse_outpoint_parses_previous_txid_and_vout() {
    assert_eq!(parse_outpoint("abc123:2"), Ok(Some(input("abc123", 2))));
}

#[test]
fn parse_outpoint_allows_coinbase_marker() {
    assert_eq!(parse_outpoint(COINBASE_PREVIOUS_OUTPUT), Ok(None));
}

#[test]
fn parse_outpoint_rejects_non_numeric_vout() {
    assert_eq!(
        parse_outpoint("abc:not-a-number"),
        Err(BtcLibError::MalformedData)
    );
}

#[test]
fn parse_transaction_parses_coinbase_row() {
    let transaction = parse_transaction("coinbase,-,alice,5000,unspent").unwrap();
    assert_eq!(transaction.txid, "coinbase");
    assert!(transaction.inputs.is_empty());
    assert_eq!(transaction.outputs.len(), 1);
    assert_eq!(transaction.outputs[0].recipient, "alice");
}

#[test]
fn parse_transaction_parses_regular_row() {
    let transaction = parse_transaction("tx1,coinbase:0,bob,1200,unspent").unwrap();
    assert_eq!(transaction.txid, "tx1");
    assert_eq!(transaction.inputs, vec![input("coinbase", 0)]);
    assert_eq!(transaction.outputs[0].value_sats, 1_200);
}

#[test]
fn parse_transaction_rejects_wrong_field_count() {
    assert_eq!(
        parse_transaction("tx1,500,unspent"),
        Err(BtcLibError::MalformedData)
    );
}

#[test]
fn parse_transaction_rejects_noncoinbase_without_input() {
    assert_eq!(
        parse_transaction("tx1,-,bob,1200,unspent"),
        Err(BtcLibError::MalformedData)
    );
}

#[test]
fn parse_transaction_rejects_invalid_amount() {
    assert_eq!(
        parse_transaction("tx1,coinbase:0,bob,not-a-number,unspent"),
        Err(BtcLibError::MalformedData)
    );
}

#[test]
fn parse_transaction_rejects_zero_amount() {
    assert_eq!(
        parse_transaction("tx1,coinbase:0,bob,0,unspent"),
        Err(BtcLibError::MalformedData)
    );
}

#[test]
fn parse_transaction_does_not_panic_on_bad_rows() {
    for row in ["", "tx1", "tx1,-,bob,0,spent", "tx1,abc:bad,bob,1,spent"] {
        let result = std::panic::catch_unwind(|| parse_transaction(row));
        assert!(result.is_ok(), "parser panicked for row: {row}");
    }
}

#[test]
fn parse_transactions_parses_many_rows() {
    let transactions = parse_transactions(&[
        "coinbase,-,alice,5000,unspent",
        "tx1,coinbase:0,bob,1200,unspent",
    ])
    .unwrap();
    assert_eq!(transactions.len(), 2);
    assert_eq!(transactions[1].txid, "tx1");
}

#[test]
fn parse_transactions_returns_first_error() {
    assert_eq!(
        parse_transactions(&["coinbase,-,alice,5000,unspent", "broken"]),
        Err(BtcLibError::MalformedData)
    );
}

#[test]
fn valid_transactions_only_filters_bad_rows() {
    let transactions = valid_transactions_only(&[
        "coinbase,-,alice,5000,unspent",
        "broken",
        "tx1,coinbase:0,bob,1200,unspent",
    ]);
    assert_eq!(transactions.len(), 2);
}

#[test]
fn block_transaction_count_counts_transactions() {
    assert_eq!(sample_block().transaction_count(), 3);
}

#[test]
fn block_total_output_value_sums_transactions() {
    assert_eq!(sample_block().total_output_value(), 8_000);
}

#[test]
fn require_transaction_returns_matching_transaction() {
    assert_eq!(
        require_transaction(&sample_transactions(), "tx1")
            .unwrap()
            .txid,
        "tx1"
    );
}

#[test]
fn require_transaction_returns_error_when_missing() {
    assert_eq!(
        require_transaction(&sample_transactions(), "missing"),
        Err(BtcLibError::MissingTransaction)
    );
}

#[test]
fn block_validate_accepts_good_block() {
    assert_eq!(sample_block().validate(), Ok(()));
}

#[test]
fn block_validate_rejects_empty_block() {
    let block = Block {
        transactions: vec![],
        ..sample_block()
    };
    assert_eq!(block.validate(), Err(BtcLibError::EmptyBlock));
}

#[test]
fn block_validate_rejects_duplicate_txids() {
    let block = Block {
        transactions: vec![spend_tx("tx1"), spend_tx("tx1")],
        ..sample_block()
    };
    assert_eq!(block.validate(), Err(BtcLibError::DuplicateTxId));
}

#[test]
fn block_hash_material_uses_header_and_txids() {
    assert_eq!(
        sample_block().hash_material(),
        "block:block-1|prev:prev|height:1|txs:coinbase;tx1;tx2;"
    );
}

#[test]
fn build_block_from_rows_parses_and_validates_block() {
    let block = build_block_from_rows(
        header("block-rows"),
        &[
            "coinbase,-,alice,5000,unspent",
            "tx1,coinbase:0,bob,1200,unspent",
        ],
        2,
        Network::Regtest,
    )
    .unwrap();
    assert_eq!(block.transaction_count(), 2);
}

#[test]
fn hash_all_hashes_transactions() {
    let transactions = [spend_tx("tx1"), spend_tx("tx2")];
    assert_eq!(
        hash_all(&transactions),
        vec![transactions[0].hash_hex(), transactions[1].hash_hex()]
    );
}

#[test]
fn decode_hash_hex_accepts_valid_sha256_hex() {
    let hash = sha256::digest("tx1");
    assert_eq!(decode_hash_hex(&hash).unwrap().len(), 32);
}

#[test]
fn decode_hash_hex_rejects_invalid_hash_hex() {
    assert_eq!(decode_hash_hex("not-a-hash"), Err(BtcLibError::InvalidHash));
}

#[test]
fn summarize_amounts_sums_outputs_by_status() {
    assert_eq!(
        summarize_amounts(&sample_transactions()),
        AmountSummary {
            output_count: 5,
            total_sats: 8_000,
            spent_sats: 600,
            unspent_sats: 7_400,
        }
    );
}

#[test]
fn io_errors_convert_to_btclib_error() {
    let error = io::Error::other("disk full");
    match BtcLibError::from(error) {
        BtcLibError::Io(message) => assert!(message.contains("disk full")),
        other => panic!("expected Io error, got {other:?}"),
    }
}
