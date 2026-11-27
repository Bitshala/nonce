use week_08_wallet_integration::*;

fn utxo(txid: &str, vout: u32, value_sats: u64, owner: &str) -> WalletUtxo {
    WalletUtxo {
        outpoint: OutPoint {
            txid: txid.to_string(),
            vout,
        },
        value_sats,
        owner: owner.to_string(),
        confirmations: 6,
    }
}

fn unconfirmed_utxo(txid: &str, value_sats: u64, owner: &str) -> WalletUtxo {
    WalletUtxo {
        outpoint: OutPoint {
            txid: txid.to_string(),
            vout: 0,
        },
        value_sats,
        owner: owner.to_string(),
        confirmations: 0,
    }
}

fn wallet_with_funds() -> Wallet {
    let mut wallet = Wallet::new("alice");
    wallet.import_utxo(utxo("a", 0, 1_000, "alice"));
    wallet.import_utxo(utxo("b", 1, 2_000, "alice"));
    wallet.import_utxo(utxo("c", 0, 5_000, "alice"));
    wallet.import_utxo(utxo("other", 0, 9_000, "bob"));
    wallet.import_utxo(unconfirmed_utxo("pending", 900, "alice"));
    wallet
}

fn expected_wallet_txid(
    owner: &str,
    recipient: &str,
    amount_sats: u64,
    fee_sats: u64,
    inputs: &[WalletUtxo],
) -> String {
    let mut material =
        format!("wallet-tx:{owner}|to:{recipient}|amount:{amount_sats}|fee:{fee_sats}|inputs:");
    for input in inputs {
        material.push_str(&format!("{}:{};", input.outpoint.txid, input.outpoint.vout));
    }
    sha256::digest(material)
}

#[test]
fn outpoint_new_and_label_use_expected_format() {
    let outpoint = OutPoint::new("tx1", 2);
    assert_eq!(outpoint.txid, "tx1");
    assert_eq!(outpoint.vout, 2);
    assert_eq!(outpoint.label(), "tx1:2");
}

#[test]
fn tx_input_and_output_constructors_copy_fields() {
    assert_eq!(
        TxInput::new("tx1", 0),
        TxInput {
            previous_output: OutPoint::new("tx1", 0),
        }
    );
    assert_eq!(
        TxOutput::new(700, "bob"),
        TxOutput {
            value_sats: 700,
            recipient: "bob".to_string(),
        }
    );
}

#[test]
fn transaction_new_and_total_output_value_work() {
    let tx = Transaction::new(
        "tx1",
        vec![TxInput::new("a", 0)],
        vec![TxOutput::new(700, "bob"), TxOutput::new(200, "alice")],
        100,
    );
    assert_eq!(tx.txid, "tx1");
    assert_eq!(tx.total_output_value(), 900);
    assert!(tx.pays_owner("alice"));
    assert!(!tx.pays_owner("carol"));
}

#[test]
fn wallet_utxo_new_copies_fields() {
    let utxo = WalletUtxo::new("tx1", 3, 1_500, "alice", 2);
    assert_eq!(utxo.outpoint.label(), "tx1:3");
    assert_eq!(utxo.value_sats, 1_500);
    assert_eq!(utxo.owner, "alice");
    assert_eq!(utxo.confirmations, 2);
}

#[test]
fn wallet_new_starts_empty() {
    let wallet = Wallet::new("alice");
    assert_eq!(wallet.owner, "alice");
    assert!(wallet.utxos.is_empty());
    assert!(wallet.pending.is_empty());
    assert!(wallet.history.is_empty());
}

#[test]
fn wallet_import_utxo_indexes_by_outpoint() {
    let mut wallet = Wallet::new("alice");
    wallet.import_utxo(utxo("a", 0, 1_000, "alice"));
    assert_eq!(wallet.utxos[&OutPoint::new("a", 0)].value_sats, 1_000);
}

#[test]
fn confirmed_balance_ignores_other_owners_and_unconfirmed() {
    assert_eq!(wallet_with_funds().confirmed_balance(), 8_000);
}

#[test]
fn available_utxos_returns_owned_confirmed_in_order() {
    let available = wallet_with_funds().available_utxos();
    let labels: Vec<String> = available.iter().map(|utxo| utxo.outpoint.label()).collect();
    assert_eq!(labels, vec!["a:0", "b:1", "c:0"]);
}

#[test]
fn select_utxos_picks_until_amount_plus_fee_is_covered() {
    let selected = wallet_with_funds().select_utxos(2_500, 200).unwrap();
    let labels: Vec<String> = selected.iter().map(|utxo| utxo.outpoint.label()).collect();
    assert_eq!(labels, vec!["a:0", "b:1"]);
}

#[test]
fn select_utxos_rejects_zero_amount() {
    assert_eq!(
        wallet_with_funds().select_utxos(0, 10),
        Err(WalletError::InvalidAmount)
    );
}

#[test]
fn select_utxos_rejects_insufficient_funds() {
    assert_eq!(
        wallet_with_funds().select_utxos(20_000, 10),
        Err(WalletError::InsufficientFunds)
    );
}

#[test]
fn derive_wallet_txid_uses_exact_material() {
    let selected = wallet_with_funds().select_utxos(2_500, 200).unwrap();
    assert_eq!(
        derive_wallet_txid("alice", "bob", 2_500, 200, &selected),
        expected_wallet_txid("alice", "bob", 2_500, 200, &selected)
    );
}

#[test]
fn build_transaction_creates_recipient_and_change_outputs() {
    let wallet = wallet_with_funds();
    let tx = wallet.build_transaction("bob", 2_500, 200).unwrap();
    let selected = wallet.select_utxos(2_500, 200).unwrap();
    assert_eq!(
        tx.txid,
        expected_wallet_txid("alice", "bob", 2_500, 200, &selected)
    );
    assert_eq!(tx.inputs.len(), 2);
    assert_eq!(
        tx.outputs,
        vec![TxOutput::new(2_500, "bob"), TxOutput::new(300, "alice")]
    );
    assert_eq!(tx.fee_sats, 200);
}

#[test]
fn build_transaction_omits_zero_change_output() {
    let wallet = wallet_with_funds();
    let tx = wallet.build_transaction("bob", 2_800, 200).unwrap();
    assert_eq!(tx.outputs, vec![TxOutput::new(2_800, "bob")]);
}

#[test]
fn build_transaction_rejects_empty_recipient() {
    assert_eq!(
        wallet_with_funds().build_transaction("", 100, 1),
        Err(WalletError::InvalidAmount)
    );
}

#[test]
fn record_pending_removes_spent_utxos_and_updates_history() {
    let mut wallet = wallet_with_funds();
    let tx = wallet.build_transaction("bob", 2_500, 200).unwrap();
    wallet.record_pending(tx.clone()).unwrap();
    assert!(!wallet.utxos.contains_key(&OutPoint::new("a", 0)));
    assert!(!wallet.utxos.contains_key(&OutPoint::new("b", 1)));
    assert_eq!(wallet.pending, vec![tx.clone()]);
    assert_eq!(wallet.history, vec![tx]);
}

#[test]
fn record_pending_missing_utxo_does_not_mutate_wallet() {
    let mut wallet = wallet_with_funds();
    let before = wallet.clone();
    let tx = Transaction::new(
        "bad",
        vec![TxInput::new("missing", 0)],
        vec![TxOutput::new(100, "bob")],
        1,
    );
    assert_eq!(
        wallet.record_pending(tx),
        Err(WalletError::MissingUtxo("missing:0".to_string()))
    );
    assert_eq!(wallet, before);
}

#[test]
fn apply_confirmed_transaction_imports_outputs_to_owner() {
    let mut wallet = Wallet::new("alice");
    let tx = Transaction::new(
        "tx1",
        vec![],
        vec![TxOutput::new(700, "alice"), TxOutput::new(300, "bob")],
        10,
    );
    wallet.apply_confirmed_transaction(tx.clone());
    assert_eq!(wallet.confirmed_balance(), 700);
    assert!(wallet.pending.is_empty());
    assert_eq!(wallet.history, vec![tx]);
}

#[test]
fn apply_confirmed_transaction_removes_matching_pending_tx() {
    let mut wallet = wallet_with_funds();
    let tx = wallet.build_transaction("bob", 2_500, 200).unwrap();
    wallet.record_pending(tx.clone()).unwrap();
    wallet.apply_confirmed_transaction(tx.clone());
    assert!(wallet.pending.is_empty());
}

#[test]
fn pending_incoming_balance_sums_outputs_to_owner() {
    let mut wallet = Wallet::new("alice");
    wallet.pending.push(Transaction::new(
        "p1",
        vec![],
        vec![TxOutput::new(100, "alice"), TxOutput::new(50, "bob")],
        1,
    ));
    assert_eq!(wallet.pending_incoming_balance(), 100);
}

#[test]
fn history_lines_use_exact_format() {
    let mut wallet = Wallet::new("alice");
    wallet.history.push(Transaction::new(
        "tx1",
        vec![],
        vec![TxOutput::new(100, "alice"), TxOutput::new(50, "bob")],
        2,
    ));
    assert_eq!(wallet.history_lines(), vec!["tx1|outputs:150|fee:2"]);
}

#[test]
fn event_log_records_and_filters_events() {
    let mut log = EventLog::new();
    log.record("submit", "sending tx1");
    log.record("accepted", "tx1");
    assert!(log.contains_kind("submit"));
    assert!(!log.contains_kind("sync"));
    assert_eq!(
        log.messages(),
        vec!["sending tx1".to_string(), "tx1".to_string()]
    );
}

#[test]
fn fee_rate_rejects_zero_vbytes() {
    assert_eq!(
        fee_rate_sats_per_vbyte(100, 0),
        Err(WalletError::InvalidAmount)
    );
}

#[test]
fn fee_rate_calculates_sats_per_vbyte() {
    assert_eq!(fee_rate_sats_per_vbyte(250, 100).unwrap(), 2.5);
}

#[test]
fn estimate_transaction_vbytes_uses_assignment_formula() {
    assert_eq!(estimate_transaction_vbytes(2, 2), 208);
    assert_eq!(estimate_transaction_vbytes(0, 1), 41);
}

#[test]
fn estimate_fee_sats_multiplies_vbytes_by_rate() {
    assert_eq!(estimate_fee_sats(2, 2, 3), 624);
}

#[test]
fn parse_wallet_command_accepts_simple_commands() {
    assert_eq!(parse_wallet_command("balance"), Ok(WalletCommand::Balance));
    assert_eq!(parse_wallet_command("history"), Ok(WalletCommand::History));
    assert_eq!(parse_wallet_command("sync"), Ok(WalletCommand::Sync));
}

#[test]
fn parse_wallet_command_accepts_send_command() {
    assert_eq!(
        parse_wallet_command("send bob 2500 200"),
        Ok(WalletCommand::Send {
            recipient: "bob".to_string(),
            amount_sats: 2_500,
            fee_sats: 200,
        })
    );
}

#[test]
fn parse_wallet_command_rejects_bad_send_shapes() {
    assert_eq!(
        parse_wallet_command("send bob 0 200"),
        Err(WalletError::InvalidAmount)
    );
    assert_eq!(
        parse_wallet_command("send bob not-a-number 200"),
        Err(WalletError::MalformedData)
    );
    assert_eq!(
        parse_wallet_command("send bob 100 1 extra"),
        Err(WalletError::MalformedData)
    );
}

#[test]
fn wallet_command_label_uses_exact_format() {
    assert_eq!(wallet_command_label(&WalletCommand::Balance), "balance");
    assert_eq!(
        wallet_command_label(&WalletCommand::Send {
            recipient: "bob".to_string(),
            amount_sats: 2_500,
            fee_sats: 200,
        }),
        "send:bob:2500:200"
    );
}

#[tokio::test]
async fn node_client_submit_accepts_transaction() {
    let mut client = NodeClient::new(1, "tip");
    let tx = Transaction::new("tx1", vec![], vec![TxOutput::new(100, "alice")], 1);
    assert_eq!(client.submit_transaction(tx.clone()).await.unwrap(), "tx1");
    assert_eq!(client.accepted_transactions, vec![tx.clone()]);
    assert_eq!(client.history, vec![tx]);
}

#[tokio::test]
async fn node_client_submit_can_reject_next_transaction() {
    let mut client = NodeClient::new(1, "tip");
    client.reject_next = Some("mempool full".to_string());
    let tx = Transaction::new("tx1", vec![], vec![TxOutput::new(100, "alice")], 1);
    assert_eq!(
        client.submit_transaction(tx).await,
        Err(WalletError::NodeRejected("mempool full".to_string()))
    );
    assert!(client.accepted_transactions.is_empty());
}

#[tokio::test]
async fn node_client_status_returns_height_and_tip() {
    let client = NodeClient::new(7, "tip-7");
    assert_eq!(
        client.status().await.unwrap(),
        NodeStatus {
            height: 7,
            tip_hash: "tip-7".to_string(),
        }
    );
}

#[tokio::test]
async fn node_client_wallet_history_filters_by_owner_outputs() {
    let mut client = NodeClient::new(1, "tip");
    client.history.push(Transaction::new(
        "a",
        vec![],
        vec![TxOutput::new(100, "alice")],
        1,
    ));
    client.history.push(Transaction::new(
        "b",
        vec![],
        vec![TxOutput::new(100, "bob")],
        1,
    ));
    assert_eq!(client.wallet_history("alice").await.unwrap().len(), 1);
}

#[tokio::test]
async fn submit_wallet_transaction_success_records_pending_and_logs() {
    let mut wallet = wallet_with_funds();
    let mut client = NodeClient::new(1, "tip");
    let mut log = EventLog::new();
    let tx = wallet.build_transaction("bob", 2_500, 200).unwrap();
    let txid = submit_wallet_transaction(&mut wallet, &mut client, tx.clone(), &mut log)
        .await
        .unwrap();
    assert_eq!(txid, tx.txid);
    assert_eq!(wallet.pending, vec![tx]);
    assert!(log.contains_kind("submit"));
    assert!(log.contains_kind("accepted"));
}

#[tokio::test]
async fn submit_wallet_transaction_failure_does_not_remove_utxos() {
    let mut wallet = wallet_with_funds();
    let before = wallet.clone();
    let mut client = NodeClient::new(1, "tip");
    client.reject_next = Some("policy".to_string());
    let mut log = EventLog::new();
    let tx = wallet.build_transaction("bob", 2_500, 200).unwrap();
    assert_eq!(
        submit_wallet_transaction(&mut wallet, &mut client, tx, &mut log).await,
        Err(WalletError::NodeRejected("policy".to_string()))
    );
    assert_eq!(wallet, before);
    assert!(log.contains_kind("rejected"));
}

#[tokio::test]
async fn sync_wallet_from_node_applies_history_and_logs_status() {
    let mut wallet = Wallet::new("alice");
    let mut client = NodeClient::new(2, "tip-2");
    client.history.push(Transaction::new(
        "incoming",
        vec![],
        vec![TxOutput::new(900, "alice")],
        1,
    ));
    let mut log = EventLog::new();
    let status = sync_wallet_from_node(&mut wallet, &client, &mut log)
        .await
        .unwrap();
    assert_eq!(status.height, 2);
    assert_eq!(wallet.confirmed_balance(), 900);
    assert!(log.contains_kind("sync"));
}

#[tokio::test]
async fn build_send_and_submit_runs_full_flow() {
    let mut wallet = wallet_with_funds();
    let mut client = NodeClient::new(1, "tip");
    let mut log = EventLog::new();
    let txid = build_send_and_submit(&mut wallet, &mut client, "bob", 2_500, 200, &mut log)
        .await
        .unwrap();
    assert_eq!(client.accepted_transactions[0].txid, txid);
    assert_eq!(wallet.pending.len(), 1);
}

#[test]
fn wallet_summary_uses_exact_format() {
    let mut wallet = Wallet::new("alice");
    wallet.import_utxo(utxo("a", 0, 1_000, "alice"));
    wallet.pending.push(Transaction::new(
        "p",
        vec![],
        vec![TxOutput::new(50, "alice")],
        1,
    ));
    wallet.history.push(Transaction::new(
        "h",
        vec![],
        vec![TxOutput::new(100, "alice")],
        1,
    ));
    assert_eq!(
        wallet_summary(&wallet),
        "owner:alice|confirmed:1000|pending_in:50|pending_txs:1|history:1"
    );
}
