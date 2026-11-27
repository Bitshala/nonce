use std::fs;

use tempfile::tempdir;
use uuid::Uuid;
use week_05_persistence::*;

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
        outputs: vec![output(5_000, "miner", TxStatus::Unspent)],
    }
}

fn spend_tx(txid: &str, previous_txid: &str, value: u64, recipient: &str) -> Transaction {
    Transaction {
        txid: txid.to_string(),
        inputs: vec![input(previous_txid, 0)],
        outputs: vec![
            output(value, recipient, TxStatus::Unspent),
            output(100, "change", TxStatus::Spent),
        ],
    }
}

fn merkle_for(transactions: &[Transaction]) -> String {
    let mut level: Vec<String> = transactions
        .iter()
        .map(|transaction| sha256::digest(transaction.hash_material()))
        .collect();
    while level.len() > 1 {
        let mut next = Vec::new();
        for pair in level.chunks(2) {
            let left = &pair[0];
            let right = if pair.len() == 2 { &pair[1] } else { &pair[0] };
            next.push(sha256::digest(format!("{left}{right}")));
        }
        level = next;
    }
    level[0].clone()
}

fn block(block_hash: &str, previous_hash: &str, height: u64, txs: Vec<Transaction>) -> Block {
    let merkle_root = merkle_for(&txs);
    Block {
        header: BlockHeader {
            block_hash: block_hash.to_string(),
            previous_block_hash: previous_hash.to_string(),
            merkle_root,
            timestamp: 1_700_000_000 + height,
            nonce: height + 10,
        },
        transactions: txs,
        height,
        network: Network::Regtest,
    }
}

fn sample_chain() -> Blockchain {
    let genesis = block("genesis", "0", 0, vec![coinbase_tx()]);
    let next = block(
        "block-1",
        "genesis",
        1,
        vec![spend_tx("tx1", "coinbase", 1_200, "alice")],
    );
    Blockchain {
        network: Network::Regtest,
        blocks: vec![genesis, next],
    }
}

#[test]
fn tx_input_new_copies_fields() {
    let input = TxInput::new("abc", 2);
    assert_eq!(input.previous_txid, "abc");
    assert_eq!(input.previous_vout, 2);
}

#[test]
fn tx_output_new_generates_uuid_and_copies_fields() {
    let output = TxOutput::new(1_000, "alice", TxStatus::Unspent);
    assert_eq!(output.value_sats, 1_000);
    assert_ne!(output.unique_id, Uuid::nil());
    assert_eq!(output.recipient, "alice");
    assert_eq!(output.status, TxStatus::Unspent);
}

#[test]
fn tx_output_validate_rejects_zero_value() {
    assert_eq!(
        output(0, "alice", TxStatus::Unspent).validate(),
        Err(BtcLibError::ZeroValueOutput)
    );
}

#[test]
fn transaction_detects_coinbase_shape() {
    assert!(coinbase_tx().is_coinbase());
    assert!(!spend_tx("tx1", "coinbase", 1_000, "alice").is_coinbase());
}

#[test]
fn transaction_validate_rejects_empty_txid() {
    let transaction = Transaction {
        txid: String::new(),
        inputs: vec![input("prev", 0)],
        outputs: vec![output(1, "alice", TxStatus::Unspent)],
    };
    assert_eq!(transaction.validate(), Err(BtcLibError::EmptyTxId));
}

#[test]
fn transaction_validate_rejects_missing_inputs_for_regular_tx() {
    let transaction = Transaction {
        txid: "tx1".to_string(),
        inputs: vec![],
        outputs: vec![output(1, "alice", TxStatus::Unspent)],
    };
    assert_eq!(transaction.validate(), Err(BtcLibError::MissingInputs));
}

#[test]
fn transaction_validate_rejects_missing_outputs() {
    let transaction = Transaction {
        txid: "tx1".to_string(),
        inputs: vec![input("prev", 0)],
        outputs: vec![],
    };
    assert_eq!(transaction.validate(), Err(BtcLibError::MissingOutputs));
}

#[test]
fn transaction_total_output_value_sums_outputs() {
    assert_eq!(
        spend_tx("tx1", "coinbase", 1_200, "alice").total_output_value(),
        1_300
    );
}

#[test]
fn transaction_counts_unspent_outputs() {
    assert_eq!(
        spend_tx("tx1", "coinbase", 1_200, "alice").unspent_output_count(),
        1
    );
}

#[test]
fn transaction_hash_material_is_stable() {
    assert_eq!(
        spend_tx("tx1", "coinbase", 1_200, "alice").hash_material(),
        "tx:tx1|inputs:coinbase:0;|outputs:1200:alice:unspent;100:change:spent;"
    );
}

#[test]
fn transaction_hash_hex_matches_sha256() {
    let transaction = spend_tx("tx1", "coinbase", 1_200, "alice");
    assert_eq!(
        transaction.hash_hex(),
        sha256::digest(transaction.hash_material())
    );
}

#[test]
fn pair_hash_concatenates_then_hashes() {
    assert_eq!(pair_hash("aa", "bb"), sha256::digest("aabb"));
}

#[test]
fn merkle_root_rejects_empty_transaction_list() {
    assert_eq!(calculate_merkle_root(&[]), Err(BtcLibError::EmptyBlock));
}

#[test]
fn merkle_root_for_single_transaction_is_transaction_hash() {
    let transaction = coinbase_tx();
    assert_eq!(
        calculate_merkle_root(std::slice::from_ref(&transaction)),
        Ok(transaction.hash_hex())
    );
}

#[test]
fn merkle_root_pairs_even_number_of_transactions() {
    let txs = vec![coinbase_tx(), spend_tx("tx1", "coinbase", 1_000, "alice")];
    let expected = sha256::digest(format!("{}{}", txs[0].hash_hex(), txs[1].hash_hex()));
    assert_eq!(calculate_merkle_root(&txs), Ok(expected));
}

#[test]
fn merkle_root_duplicates_last_hash_for_odd_level() {
    let txs = vec![
        coinbase_tx(),
        spend_tx("tx1", "coinbase", 1_000, "alice"),
        spend_tx("tx2", "tx1", 500, "bob"),
    ];
    assert_eq!(calculate_merkle_root(&txs), Ok(merkle_for(&txs)));
}

#[test]
fn validate_merkle_root_accepts_matching_header() {
    let block = block("genesis", "0", 0, vec![coinbase_tx()]);
    assert_eq!(validate_merkle_root(&block), Ok(()));
}

#[test]
fn validate_merkle_root_rejects_mismatch() {
    let mut block = block("genesis", "0", 0, vec![coinbase_tx()]);
    block.header.merkle_root = "wrong".to_string();
    assert_eq!(
        validate_merkle_root(&block),
        Err(BtcLibError::InvalidMerkleRoot)
    );
}

#[test]
fn block_validate_rejects_empty_block() {
    let block = Block {
        transactions: vec![],
        ..block("empty", "0", 0, vec![coinbase_tx()])
    };
    assert_eq!(block.validate(), Err(BtcLibError::EmptyBlock));
}

#[test]
fn block_validate_rejects_duplicate_transaction_ids() {
    let block = block(
        "dup",
        "0",
        0,
        vec![
            spend_tx("tx1", "coinbase", 1_000, "alice"),
            spend_tx("tx1", "coinbase", 2_000, "bob"),
        ],
    );
    assert_eq!(block.validate(), Err(BtcLibError::DuplicateTxId));
}

#[test]
fn block_counts_and_finds_transactions() {
    let block = block(
        "block-1",
        "genesis",
        1,
        vec![coinbase_tx(), spend_tx("tx1", "coinbase", 1_200, "alice")],
    );
    assert_eq!(block.transaction_count(), 2);
    assert_eq!(block.find_transaction("tx1").unwrap().txid, "tx1");
    assert!(block.find_transaction("missing").is_none());
}

#[test]
fn block_total_output_value_sums_transactions() {
    let block = block(
        "block-1",
        "genesis",
        1,
        vec![coinbase_tx(), spend_tx("tx1", "coinbase", 1_200, "alice")],
    );
    assert_eq!(block.total_output_value(), 6_300);
}

#[test]
fn blockchain_new_starts_empty() {
    let chain = Blockchain::new(Network::Regtest);
    assert_eq!(chain.network, Network::Regtest);
    assert_eq!(chain.blocks.len(), 0);
    assert_eq!(chain.height(), 0);
    assert_eq!(chain.tip_hash(), None);
}

#[test]
fn blockchain_from_genesis_validates_and_stores_block() {
    let genesis = block("genesis", "0", 0, vec![coinbase_tx()]);
    let chain = Blockchain::from_genesis(genesis).unwrap();
    assert_eq!(chain.height(), 0);
    assert_eq!(chain.tip_hash(), Some("genesis"));
}

#[test]
fn append_block_accepts_proper_previous_hash_and_height() {
    let genesis = block("genesis", "0", 0, vec![coinbase_tx()]);
    let next = block(
        "block-1",
        "genesis",
        1,
        vec![spend_tx("tx1", "coinbase", 1_000, "alice")],
    );
    let mut chain = Blockchain::from_genesis(genesis).unwrap();
    assert_eq!(chain.append_block(next), Ok(()));
    assert_eq!(chain.height(), 1);
    assert_eq!(chain.tip_hash(), Some("block-1"));
}

#[test]
fn append_block_rejects_wrong_previous_hash() {
    let genesis = block("genesis", "0", 0, vec![coinbase_tx()]);
    let next = block(
        "block-1",
        "wrong",
        1,
        vec![spend_tx("tx1", "coinbase", 1_000, "alice")],
    );
    let mut chain = Blockchain::from_genesis(genesis).unwrap();
    assert_eq!(
        chain.append_block(next),
        Err(BtcLibError::InvalidPreviousHash)
    );
}

#[test]
fn append_block_rejects_height_gap() {
    let genesis = block("genesis", "0", 0, vec![coinbase_tx()]);
    let next = block(
        "block-2",
        "genesis",
        2,
        vec![spend_tx("tx1", "coinbase", 1_000, "alice")],
    );
    let mut chain = Blockchain::from_genesis(genesis).unwrap();
    assert_eq!(
        chain.append_block(next),
        Err(BtcLibError::InvalidPreviousHash)
    );
}

#[test]
fn chain_finds_blocks_and_transactions() {
    let chain = sample_chain();
    assert_eq!(chain.find_block_by_hash("block-1").unwrap().height, 1);
    assert_eq!(chain.find_transaction("tx1").unwrap().txid, "tx1");
    assert!(chain.find_transaction("missing").is_none());
}

#[test]
fn chain_total_transactions_counts_across_blocks() {
    assert_eq!(sample_chain().total_transactions(), 2);
}

#[test]
fn chain_validate_rejects_bad_links() {
    let mut chain = sample_chain();
    chain.blocks[1].header.previous_block_hash = "bad".to_string();
    assert_eq!(chain.validate(), Err(BtcLibError::InvalidPreviousHash));
}

#[test]
fn network_label_returns_lowercase_names() {
    assert_eq!(network_label(Network::Mainnet), "mainnet");
    assert_eq!(network_label(Network::Testnet), "testnet");
    assert_eq!(network_label(Network::Signet), "signet");
    assert_eq!(network_label(Network::Regtest), "regtest");
}

#[test]
fn chain_summary_uses_exact_format() {
    assert_eq!(
        chain_summary(&sample_chain()),
        "network:regtest|height:1|blocks:2|tip:block-1|txs:2"
    );
}

#[test]
fn save_and_load_block_round_trips_json() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("block.json");
    let block = block("genesis", "0", 0, vec![coinbase_tx()]);
    save_block_to_file(&block, &path).unwrap();
    assert_eq!(load_block_from_file(&path).unwrap(), block);
}

#[test]
fn load_block_rejects_malformed_json() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("bad-block.json");
    fs::write(&path, "{not json").unwrap();
    assert!(matches!(
        load_block_from_file(&path),
        Err(BtcLibError::Serialization(_))
    ));
}

#[test]
fn save_and_load_chain_round_trips_json() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("chain.json");
    let chain = sample_chain();
    save_chain_to_file(&chain, &path).unwrap();
    assert_eq!(load_chain_from_file(&path).unwrap(), chain);
}

#[test]
fn load_chain_rejects_invalid_chain_state() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("invalid-chain.json");
    let mut chain = sample_chain();
    chain.blocks[1].height = 9;
    fs::write(&path, serde_json::to_string(&chain).unwrap()).unwrap();
    assert_eq!(
        load_chain_from_file(&path),
        Err(BtcLibError::InvalidPreviousHash)
    );
}
