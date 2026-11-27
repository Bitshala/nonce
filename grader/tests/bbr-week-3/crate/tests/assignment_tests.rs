use uuid::Uuid;
use week_03_modeling::*;

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

fn sample_block() -> Block {
    Block {
        header: header("block-1"),
        transactions: vec![coinbase_tx(), spend_tx("tx1")],
        height: 1,
        network: Network::Regtest,
    }
}

#[test]
fn tx_input_new_copies_previous_txid() {
    assert_eq!(TxInput::new("abc", 2).previous_txid, "abc");
}

#[test]
fn tx_input_new_copies_previous_vout() {
    assert_eq!(TxInput::new("abc", 2).previous_vout, 2);
}

#[test]
fn tx_output_new_copies_fields() {
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
fn transaction_new_copies_txid() {
    let transaction = Transaction::new(
        "tx1",
        vec![input("prev", 0)],
        vec![output(1, "a", TxStatus::Unspent)],
    );
    assert_eq!(transaction.txid, "tx1");
}

#[test]
fn block_header_new_copies_hash() {
    let header = BlockHeader::new("hash", "prev", "root", 10, 99);
    assert_eq!(header.block_hash, "hash");
    assert_eq!(header.previous_block_hash, "prev");
    assert_eq!(header.merkle_root, "root");
    assert_eq!(header.timestamp, 10);
    assert_eq!(header.nonce, 99);
}

#[test]
fn block_new_copies_height_and_network() {
    let block = Block::new(header("hash"), vec![coinbase_tx()], 7, Network::Signet);
    assert_eq!(block.height, 7);
    assert_eq!(block.network, Network::Signet);
}

#[test]
fn network_magic_returns_mainnet_magic() {
    assert_eq!(network_magic(Network::Mainnet), 0xD9B4BEF9);
}

#[test]
fn network_magic_returns_testnet_magic() {
    assert_eq!(network_magic(Network::Testnet), 0x0709110B);
}

#[test]
fn network_magic_returns_signet_magic() {
    assert_eq!(network_magic(Network::Signet), 0x40CF030A);
}

#[test]
fn network_magic_returns_regtest_magic() {
    assert_eq!(network_magic(Network::Regtest), 0xDAB5BFFA);
}

#[test]
fn network_from_magic_returns_known_network() {
    assert_eq!(network_from_magic(0xD9B4BEF9), Some(Network::Mainnet));
    assert_eq!(network_from_magic(0xDAB5BFFA), Some(Network::Regtest));
}

#[test]
fn network_from_magic_returns_none_for_unknown_magic() {
    assert_eq!(network_from_magic(0xDEADBEEF), None);
}

#[test]
fn transaction_is_coinbase_for_coinbase_txid_without_inputs() {
    assert!(coinbase_tx().is_coinbase());
}

#[test]
fn transaction_is_not_coinbase_when_inputs_exist() {
    assert!(!spend_tx("tx1").is_coinbase());
}

#[test]
fn transaction_total_output_value_sums_outputs() {
    assert_eq!(spend_tx("tx1").total_output_value(), 1_500);
}

#[test]
fn transaction_total_output_value_is_zero_without_outputs() {
    let transaction = Transaction {
        txid: "tx1".to_string(),
        inputs: vec![input("prev", 0)],
        outputs: vec![],
    };
    assert_eq!(transaction.total_output_value(), 0);
}

#[test]
fn transaction_counts_unspent_outputs() {
    assert_eq!(spend_tx("tx1").unspent_output_count(), 1);
}

#[test]
fn transaction_counts_spent_outputs() {
    assert_eq!(spend_tx("tx1").spent_output_count(), 1);
}

#[test]
fn transaction_identifiable_returns_txid() {
    assert_eq!(spend_tx("tx1").id(), "tx1");
}

#[test]
fn transaction_validate_accepts_coinbase_transaction() {
    assert_eq!(coinbase_tx().validate(), Ok(()));
}

#[test]
fn transaction_validate_rejects_empty_txid() {
    let mut transaction = spend_tx("tx1");
    transaction.txid.clear();
    assert_eq!(transaction.validate(), Err(ValidationError::EmptyTxId));
}

#[test]
fn transaction_validate_rejects_missing_inputs_for_regular_tx() {
    let transaction = Transaction {
        txid: "regular".to_string(),
        inputs: vec![],
        outputs: vec![output(1, "alice", TxStatus::Unspent)],
    };
    assert_eq!(transaction.validate(), Err(ValidationError::MissingInputs));
}

#[test]
fn transaction_validate_rejects_missing_outputs() {
    let transaction = Transaction {
        txid: "tx1".to_string(),
        inputs: vec![input("prev", 0)],
        outputs: vec![],
    };
    assert_eq!(transaction.validate(), Err(ValidationError::MissingOutputs));
}

#[test]
fn transaction_validate_rejects_zero_value_output() {
    let transaction = Transaction {
        txid: "tx1".to_string(),
        inputs: vec![input("prev", 0)],
        outputs: vec![output(0, "alice", TxStatus::Unspent)],
    };
    assert_eq!(
        transaction.validate(),
        Err(ValidationError::ZeroValueOutput)
    );
}

#[test]
fn block_transaction_count_counts_transactions() {
    assert_eq!(sample_block().transaction_count(), 2);
}

#[test]
fn block_total_output_value_sums_all_transaction_outputs() {
    assert_eq!(sample_block().total_output_value(), 6_500);
}

#[test]
fn block_coinbase_transaction_returns_first_coinbase() {
    assert_eq!(
        sample_block().coinbase_transaction().unwrap().txid,
        "coinbase"
    );
}

#[test]
fn block_coinbase_transaction_returns_none_without_coinbase() {
    let block = Block {
        transactions: vec![spend_tx("tx1")],
        ..sample_block()
    };
    assert!(block.coinbase_transaction().is_none());
}

#[test]
fn block_find_transaction_returns_matching_transaction() {
    assert_eq!(sample_block().find_transaction("tx1").unwrap().txid, "tx1");
}

#[test]
fn block_find_transaction_returns_none_when_missing() {
    assert!(sample_block().find_transaction("missing").is_none());
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
    assert_eq!(block.validate(), Err(ValidationError::EmptyBlock));
}

#[test]
fn block_validate_rejects_duplicate_transaction_ids() {
    let block = Block {
        transactions: vec![spend_tx("tx1"), spend_tx("tx1")],
        ..sample_block()
    };
    assert_eq!(block.validate(), Err(ValidationError::DuplicateTxId));
}

#[test]
fn block_identifiable_returns_block_hash() {
    assert_eq!(sample_block().id(), "block-1");
}

#[test]
fn count_unspent_outputs_counts_across_transactions() {
    assert_eq!(count_unspent_outputs(&sample_block().transactions), 2);
}

#[test]
fn total_value_for_recipient_sums_matching_outputs() {
    assert_eq!(
        total_value_for_recipient(&sample_block().transactions, "alice"),
        5_300
    );
}

#[test]
fn have_same_id_compares_identifiable_values() {
    assert!(have_same_id(&spend_tx("tx1"), &spend_tx("tx1")));
    assert!(!have_same_id(&spend_tx("tx1"), &spend_tx("tx2")));
}

#[test]
fn collect_ids_collects_trait_object_ids() {
    let items: Vec<Box<dyn Identifiable>> =
        vec![Box::new(spend_tx("tx1")), Box::new(sample_block())];
    assert_eq!(
        collect_ids(&items),
        vec!["tx1".to_string(), "block-1".to_string()]
    );
}
