use week_06_miner::*;

fn input(previous_txid: &str, previous_vout: u32) -> TxInput {
    TxInput {
        previous_txid: previous_txid.to_string(),
        previous_vout,
    }
}

fn output(value_sats: u64, recipient: &str) -> TxOutput {
    TxOutput {
        value_sats,
        recipient: recipient.to_string(),
    }
}

fn coinbase() -> Transaction {
    Transaction {
        txid: "coinbase".to_string(),
        inputs: vec![],
        outputs: vec![output(5_000, "miner")],
    }
}

fn spend_tx(txid: &str, previous_txid: &str, value: u64, recipient: &str) -> Transaction {
    Transaction {
        txid: txid.to_string(),
        inputs: vec![input(previous_txid, 0)],
        outputs: vec![output(value, recipient), output(100, "change")],
    }
}

fn expected_tx_material(transaction: &Transaction) -> String {
    let mut material = format!("tx:{}|inputs:", transaction.txid);
    for input in &transaction.inputs {
        material.push_str(&format!("{}:{};", input.previous_txid, input.previous_vout));
    }
    material.push_str("|outputs:");
    for output in &transaction.outputs {
        material.push_str(&format!("{}:{};", output.value_sats, output.recipient));
    }
    material
}

fn expected_merkle(transactions: &[Transaction]) -> String {
    let mut level: Vec<String> = transactions
        .iter()
        .map(|transaction| sha256::digest(expected_tx_material(transaction)))
        .collect();
    while level.len() > 1 {
        let mut next = Vec::new();
        for pair in level.chunks(2) {
            let right = if pair.len() == 2 { &pair[1] } else { &pair[0] };
            next.push(sha256::digest(format!("{}{}", pair[0], right)));
        }
        level = next;
    }
    level[0].clone()
}

fn candidate() -> CandidateBlock {
    CandidateBlock {
        previous_block_hash: "genesis".to_string(),
        height: 1,
        transactions: vec![coinbase(), spend_tx("tx1", "coinbase", 1_200, "alice")],
        coinbase_recipient: "miner".to_string(),
        reward_sats: 5_000,
        timestamp: 1_700_000_001,
    }
}

fn expected_candidate_material(candidate: &CandidateBlock, nonce: u64) -> String {
    let merkle = expected_merkle(&candidate.transactions);
    let mut material = format!(
        "candidate:{}|height:{}|merkle:{}|time:{}|nonce:{}|txs:",
        candidate.previous_block_hash, candidate.height, merkle, candidate.timestamp, nonce
    );
    for transaction in &candidate.transactions {
        material.push_str(&format!("{};", transaction.txid));
    }
    material
}

fn expected_candidate_hash(candidate: &CandidateBlock, nonce: u64) -> String {
    sha256::digest(expected_candidate_material(candidate, nonce))
}

#[test]
fn tx_input_new_and_outpoint_copy_fields() {
    let input = TxInput::new("abc", 2);
    assert_eq!(input.previous_txid, "abc");
    assert_eq!(input.previous_vout, 2);
    assert_eq!(
        input.outpoint(),
        OutPoint {
            txid: "abc".to_string(),
            vout: 2,
        }
    );
}

#[test]
fn tx_output_new_copies_fields() {
    let output = TxOutput::new(500, "alice");
    assert_eq!(output.value_sats, 500);
    assert_eq!(output.recipient, "alice");
}

#[test]
fn transaction_coinbase_builds_single_output_no_inputs() {
    let tx = Transaction::coinbase("cb-1", "miner", 5_000);
    assert_eq!(tx.txid, "cb-1");
    assert!(tx.inputs.is_empty());
    assert_eq!(tx.outputs, vec![output(5_000, "miner")]);
    assert!(tx.is_coinbase());
}

#[test]
fn transaction_total_output_value_sums_outputs() {
    assert_eq!(
        spend_tx("tx1", "coinbase", 1_200, "alice").total_output_value(),
        1_300
    );
}

#[test]
fn transaction_hash_material_uses_exact_format() {
    assert_eq!(
        spend_tx("tx1", "coinbase", 1_200, "alice").hash_material(),
        "tx:tx1|inputs:coinbase:0;|outputs:1200:alice;100:change;"
    );
}

#[test]
fn transaction_hash_hex_matches_sha256() {
    let tx = spend_tx("tx1", "coinbase", 1_200, "alice");
    assert_eq!(tx.hash_hex(), sha256::digest(expected_tx_material(&tx)));
}

#[test]
fn outpoint_label_uses_txid_colon_vout() {
    assert_eq!(
        outpoint_label(&OutPoint {
            txid: "tx1".to_string(),
            vout: 3,
        }),
        "tx1:3"
    );
}

#[test]
fn utxo_set_new_starts_empty() {
    let set = UtxoSet::new();
    assert!(set.is_empty());
    assert_eq!(set.len(), 0);
}

#[test]
fn insert_output_tracks_outpoint_value_and_recipient() {
    let mut set = UtxoSet::new();
    set.insert_output("tx1", 0, &output(700, "alice")).unwrap();
    let outpoint = OutPoint {
        txid: "tx1".to_string(),
        vout: 0,
    };
    assert_eq!(set.get(&outpoint).unwrap().value_sats, 700);
    assert_eq!(set.get(&outpoint).unwrap().recipient, "alice");
}

#[test]
fn insert_output_rejects_duplicate_outpoint() {
    let mut set = UtxoSet::new();
    set.insert_output("tx1", 0, &output(700, "alice")).unwrap();
    assert_eq!(
        set.insert_output("tx1", 0, &output(800, "bob")),
        Err(MinerError::DuplicateUtxo("tx1:0".to_string()))
    );
}

#[test]
fn spend_input_removes_and_returns_utxo() {
    let mut set = UtxoSet::new();
    set.insert_output("tx1", 0, &output(700, "alice")).unwrap();
    let spent = set.spend_input(&input("tx1", 0)).unwrap();
    assert_eq!(spent.value_sats, 700);
    assert!(set.get(&spent.outpoint).is_none());
}

#[test]
fn spend_input_rejects_missing_utxo() {
    let mut set = UtxoSet::new();
    assert_eq!(
        set.spend_input(&input("missing", 0)),
        Err(MinerError::MissingUtxo("missing:0".to_string()))
    );
}

#[test]
fn apply_coinbase_transaction_inserts_outputs() {
    let mut set = UtxoSet::new();
    set.apply_transaction(&coinbase()).unwrap();
    assert_eq!(set.len(), 1);
    assert_eq!(set.total_for_recipient("miner"), 5_000);
}

#[test]
fn apply_regular_transaction_spends_inputs_and_adds_outputs() {
    let mut set = UtxoSet::new();
    set.apply_transaction(&coinbase()).unwrap();
    set.apply_transaction(&spend_tx("tx1", "coinbase", 1_200, "alice"))
        .unwrap();
    assert_eq!(set.len(), 2);
    assert_eq!(set.total_for_recipient("alice"), 1_200);
    assert_eq!(set.total_for_recipient("miner"), 0);
}

#[test]
fn apply_invalid_transaction_does_not_partially_mutate_set() {
    let mut set = UtxoSet::new();
    set.apply_transaction(&coinbase()).unwrap();
    let before = set.clone();
    let bad = Transaction::new(
        "bad",
        vec![input("coinbase", 0), input("missing", 0)],
        vec![output(1_000, "alice")],
    );
    assert_eq!(
        set.apply_transaction(&bad),
        Err(MinerError::MissingUtxo("missing:0".to_string()))
    );
    assert_eq!(set, before);
}

#[test]
fn apply_block_applies_transactions_in_order() {
    let block = Block {
        header: BlockHeader {
            previous_block_hash: "genesis".to_string(),
            merkle_root: expected_merkle(&[
                coinbase(),
                spend_tx("tx1", "coinbase", 1_200, "alice"),
            ]),
            timestamp: 1,
            nonce: 0,
            difficulty_prefix: String::new(),
        },
        height: 1,
        transactions: vec![coinbase(), spend_tx("tx1", "coinbase", 1_200, "alice")],
    };
    let mut set = UtxoSet::new();
    set.apply_block(&block).unwrap();
    assert_eq!(set.total_for_recipient("alice"), 1_200);
}

#[test]
fn mempool_add_rejects_duplicates_and_orders_transactions() {
    let mut mempool = Mempool::new();
    mempool
        .add_transaction(spend_tx("tx-b", "coinbase", 2_000, "bob"))
        .unwrap();
    mempool
        .add_transaction(spend_tx("tx-a", "coinbase", 1_000, "alice"))
        .unwrap();
    assert_eq!(
        mempool.add_transaction(spend_tx("tx-a", "coinbase", 3_000, "carol")),
        Err(MinerError::DuplicateMempoolTransaction("tx-a".to_string()))
    );
    let ordered: Vec<String> = mempool
        .ordered_transactions()
        .iter()
        .map(|tx| tx.txid.clone())
        .collect();
    assert_eq!(ordered, vec!["tx-a", "tx-b"]);
}

#[test]
fn mempool_remove_and_drain_work_in_deterministic_order() {
    let mut mempool = Mempool::new();
    mempool
        .add_transaction(spend_tx("tx-c", "coinbase", 3_000, "carol"))
        .unwrap();
    mempool
        .add_transaction(spend_tx("tx-a", "coinbase", 1_000, "alice"))
        .unwrap();
    mempool
        .add_transaction(spend_tx("tx-b", "coinbase", 2_000, "bob"))
        .unwrap();
    assert_eq!(mempool.remove_transaction("tx-b").unwrap().txid, "tx-b");
    assert_eq!(
        mempool.remove_transaction("missing"),
        Err(MinerError::TransactionNotFound("missing".to_string()))
    );
    let drained: Vec<String> = mempool
        .drain_for_candidate(1)
        .iter()
        .map(|tx| tx.txid.clone())
        .collect();
    assert_eq!(drained, vec!["tx-a"]);
    assert_eq!(
        mempool
            .ordered_transactions()
            .iter()
            .map(|tx| tx.txid.clone())
            .collect::<Vec<_>>(),
        vec!["tx-c"]
    );
}

#[test]
fn mempool_total_output_value_sums_current_transactions() {
    let mut mempool = Mempool::new();
    mempool
        .add_transaction(spend_tx("tx-a", "coinbase", 1_000, "alice"))
        .unwrap();
    mempool
        .add_transaction(spend_tx("tx-b", "coinbase", 2_000, "bob"))
        .unwrap();
    assert_eq!(mempool.total_output_value(), 3_200);
}

#[test]
fn build_candidate_from_mempool_adds_coinbase_first_and_drains_transactions() {
    let mut mempool = Mempool::new();
    mempool
        .add_transaction(spend_tx("tx-b", "coinbase", 2_000, "bob"))
        .unwrap();
    mempool
        .add_transaction(spend_tx("tx-a", "coinbase", 1_000, "alice"))
        .unwrap();
    let candidate =
        build_candidate_from_mempool(&mut mempool, "prev", 42, "miner", 5_000, 1_700, 1);
    assert_eq!(candidate.previous_block_hash, "prev");
    assert_eq!(candidate.height, 42);
    assert_eq!(
        candidate.transactions[0],
        Transaction::coinbase("coinbase-42", "miner", 5_000)
    );
    assert_eq!(candidate.transactions[1].txid, "tx-a");
    assert_eq!(mempool.ordered_transactions()[0].txid, "tx-b");
}

#[test]
fn hash_meets_difficulty_accepts_empty_prefix() {
    assert_eq!(hash_meets_difficulty("abc", ""), Ok(true));
}

#[test]
fn hash_meets_difficulty_is_case_insensitive_for_hex() {
    assert_eq!(hash_meets_difficulty("0abc", "0A"), Ok(true));
}

#[test]
fn hash_meets_difficulty_rejects_non_hex_prefix() {
    assert_eq!(
        hash_meets_difficulty("abcd", "zz"),
        Err(MinerError::InvalidDifficulty)
    );
}

#[test]
fn merkle_root_rejects_empty_candidates() {
    assert_eq!(calculate_merkle_root(&[]), Err(MinerError::EmptyCandidate));
}

#[test]
fn merkle_root_matches_expected_pairing() {
    let txs = vec![coinbase(), spend_tx("tx1", "coinbase", 1_200, "alice")];
    assert_eq!(calculate_merkle_root(&txs), Ok(expected_merkle(&txs)));
}

#[test]
fn candidate_hash_material_uses_exact_format() {
    let candidate = candidate();
    assert_eq!(
        candidate_hash_material(&candidate, 7),
        Ok(expected_candidate_material(&candidate, 7))
    );
}

#[test]
fn hash_candidate_matches_sha256_of_material() {
    let candidate = candidate();
    assert_eq!(
        hash_candidate(&candidate, 7),
        Ok(expected_candidate_hash(&candidate, 7))
    );
}

#[test]
fn build_candidate_block_sets_header_fields() {
    let candidate = candidate();
    let block = build_candidate_block(&candidate, 9, "00").unwrap();
    assert_eq!(block.height, 1);
    assert_eq!(block.header.previous_block_hash, "genesis");
    assert_eq!(block.header.nonce, 9);
    assert_eq!(block.header.difficulty_prefix, "00");
    assert_eq!(
        block.header.merkle_root,
        expected_merkle(&candidate.transactions)
    );
}

#[test]
fn block_hash_material_uses_exact_format() {
    let candidate = candidate();
    let block = build_candidate_block(&candidate, 9, "00").unwrap();
    assert_eq!(
        block.hash_material(),
        format!(
            "block:genesis|height:1|merkle:{}|time:1700000001|nonce:9|txs:coinbase;tx1;",
            expected_merkle(&candidate.transactions)
        )
    );
}

#[test]
fn split_nonce_ranges_divides_inclusive_range_evenly() {
    assert_eq!(
        split_nonce_ranges(0, 9, 3).unwrap(),
        vec![(0, 3), (4, 6), (7, 9)]
    );
}

#[test]
fn split_nonce_ranges_does_not_return_empty_ranges() {
    assert_eq!(split_nonce_ranges(5, 6, 10).unwrap(), vec![(5, 5), (6, 6)]);
}

#[test]
fn split_nonce_ranges_rejects_zero_workers() {
    assert_eq!(
        split_nonce_ranges(0, 9, 0),
        Err(MinerError::InvalidDifficulty)
    );
}

#[test]
fn mine_range_returns_none_when_no_nonce_matches() {
    let candidate = candidate();
    assert_eq!(mine_range(&candidate, "ffffffff", 0, 3, 0), Ok(None));
}

#[test]
fn mine_range_returns_first_matching_nonce() {
    let candidate = candidate();
    let target_hash = expected_candidate_hash(&candidate, 4);
    let mined = mine_range(&candidate, &target_hash, 0, 6, 2)
        .unwrap()
        .unwrap();
    assert_eq!(mined.nonce, 4);
    assert_eq!(mined.hash, target_hash);
    assert_eq!(mined.worker_id, 2);
    assert_eq!(mined.attempts, 5);
}

#[test]
fn mine_single_threaded_builds_report_for_solution() {
    let candidate = candidate();
    let target_hash = expected_candidate_hash(&candidate, 3);
    let report = mine_single_threaded(
        &candidate,
        &MiningConfig {
            difficulty_prefix: target_hash.clone(),
            start_nonce: 0,
            max_nonce: 5,
            worker_count: 1,
        },
    )
    .unwrap();
    assert_eq!(report.nonce, 3);
    assert_eq!(report.hash, target_hash);
    assert_eq!(report.worker_count, 1);
    assert_eq!(report.block.header.nonce, 3);
}

#[test]
fn mine_single_threaded_returns_no_solution() {
    let candidate = candidate();
    assert_eq!(
        mine_single_threaded(
            &candidate,
            &MiningConfig {
                difficulty_prefix: "ffffffff".to_string(),
                start_nonce: 0,
                max_nonce: 3,
                worker_count: 1,
            },
        ),
        Err(MinerError::NoSolution)
    );
}

#[test]
fn mine_multi_threaded_can_find_solution_across_ranges() {
    let candidate = candidate();
    let target_hash = expected_candidate_hash(&candidate, 8);
    let report = mine_multi_threaded(
        candidate,
        MiningConfig {
            difficulty_prefix: target_hash.clone(),
            start_nonce: 0,
            max_nonce: 10,
            worker_count: 3,
        },
    )
    .unwrap();
    assert_eq!(report.nonce, 8);
    assert_eq!(report.hash, target_hash);
    assert_eq!(report.worker_count, 3);
}

#[test]
fn progress_line_uses_exact_format() {
    let candidate = candidate();
    let block = build_candidate_block(&candidate, 1, "").unwrap();
    let report = MiningReport {
        block,
        nonce: 1,
        hash: "abcd".to_string(),
        attempts: 2,
        worker_count: 4,
    };
    assert_eq!(
        progress_line(&report),
        "workers:4|nonce:1|attempts:2|hash:abcd"
    );
}
