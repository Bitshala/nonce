import type { WeekContent } from '../types/instructions';

export const lbtclWeeks: WeekContent[] = [
  {
    week: 1,
    title: "Bitcoin Fundamentals & Cryptographic Primitives",
    assignmentLinks: {
      3: "https://classroom.github.com/a/oN8k0rIa",
      4: "https://classroom.github.com/a/CM72zb_K",
    },
    content: `
## Reading Material

1. [Chapter 1: Introducing Bitcoin](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/01_0_Introduction.md)
2. [Chapter 2: Setting Up a Bitcoin-Core VPS](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/02_0_Setting_Up_a_Bitcoin-Core_VPS.md)
3. [Chapter 3: Understanding Your Bitcoin Setup](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/03_0_Understanding_Your_Bitcoin_Setup.md)
    `,
    gdQuestions: [
      "What are the cryptographic primitives used in Bitcoin? Give a brief description of each.",
      "What is a blockchain? How does it differ from an array or other common data structures in programming, and in what situations is a blockchain especially useful?",
      "Why does Bitcoin use elliptic-curve cryptography? Which specific curve does it rely on, and what are some alternative curves?",
      "What is a digital signature? Why is it recommended to verify the signature of a downloaded Bitcoin Core binary, and what kinds of attacks are possible with a malicious binary?",
      "Why is it important to run your own Bitcoin node?",
      "What are the differences among Bitcoin's network types—mainnet, testnet, signet, and regtest?",
      "What data is stored in the **blocks** and **chainstate** folders within the Bitcoin data directory?",
      "Which address formats exist in Bitcoin, and what defines a *legacy* address?",
      "What is a SegWit address, and why is it generally preferred over a legacy address?",
      "What is a Bitcoin faucet, and why are faucets provided only for testnet and signet? How can coins be obtained in regtest?",
      "What is a transaction ID (txid)? Which `bitcoin-cli` commands accept a txid as input, and why are txids useful?",
      "What is a *descriptor* in Bitcoin, and what problems does it solve?"
    ],
    bonusQuestions: [
      "What is a hash function? Why are hash functions essential in Bitcoin, and can two different inputs ever produce the same hash output?",
      "What is a 51% attack, and can a miner use 51% of the network hashrate to double-spend UTXOs?",
      "What is a natural blockchain reorganization (reorg), why does it occur, and how do nodes resolve it?",
      "What is RPC? Why does Bitcoin primarily use RPC rather than REST, and when is the REST API appropriate?",
      "What is the UTXO model, and what benefits does it provide compared with an account-based model?"
    ]
  },
  {
    week: 2,
    title: "Transactions, Fees & Advanced Transaction Mechanics",
    assignmentLinks: {
      3: "https://classroom.github.com/a/TgnG1KAK",
      4: "https://classroom.github.com/a/mxaOSEym",
    },
    content: `
## Reading Material

1. [Chapter 4: Sending Bitcoin Transactions](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/04_0_Sending_Bitcoin_Transactions.md)
2. [Chapter 5: Controlling Bitcoin Transactions](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/05_0_Controlling_Bitcoin_Transactions.md)
    `,
    gdQuestions: [
      "What are the components of a transaction? Describe in brief each component and the data they contain.",
      "What is the transaction fee? Why do transactions need to pay fee? How to determine a suitable fee at the time of transaction creation?",
      "What is an unspent transaction output (UTXO)? How does `bitcoind` select UTXOs in case of `sendtoaddress` call?",
      "What does the confirmation of a transaction indicate? Why should we wait for a certain confirmation number on a transaction before spending them?",
      "What is a change address? What happens if we don't put the change address in `createrawtransaction` call?",
      "What is the difference between `createrawtransaction` and `fundrawtransaction` call? When to use one over the other?",
      "What is the difference between a segwit and a normal transaction?",
      "What is sequence number? What are the different ways it can be used to lock transactions?",
      "What is RBF? What is it useful for?",
      "What is CPFP? When to use it instead of RBF? Does RBF change `txid`? If so, why?",
      "What are some practical use cases of CPFP (hint: Lightning anchor outputs in channel opening transactions)",
      "What happens when a transaction being bumped by CPFP also gets fee bumped by RBF at the same time? What happens to the child transaction?"
    ],
    bonusQuestions: [
      "What is the UTXO model? What are the benefits over the Account based model?",
      "What is the minimum amount you can send with bitcoin-cli? Why this minimum limit exists? Can there be transactions violating this limit?",
      "How transactions can be lost from mempool? How to detect such situation? What can be done in that situation?"
    ]
  },
  {
    week: 3,
    title: "Multisig, PSBT & Hardware Wallet Integration",
    assignmentLinks: {
      3: "https://classroom.github.com/a/4thH_A9_",
      4: "https://classroom.github.com/a/ad63KAOn",
    },
    content: `
## Reading Material

1. [Chapter 6: Expanding Bitcoin Transactions with Multisigs](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/06_0_Expanding_Bitcoin_Transactions_Multisigs.md)
2. [Chapter 7: Expanding Bitcoin Transactions with PSBTs](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/07_0_Expanding_Bitcoin_Transactions_PSBTs.md)
    `,
    gdQuestions: [
      "What is a multisig? What are the common script types for multisig addresses?",
      "Why is it important to preserve the order of keys in multisig addresses for address generation? What happens if the order isn't preserved?",
      "What is BIP67 lexicographical ordering?",
      "Does the order of signature matter for signing multisig?",
      "Explain the use of `addmultisigaddress` command. When is it useful over vanilla multisig generation?",
      "What is a PSBT and why is it useful?",
      "What are the different components of PSBT? Can you explain each part and it's use in brief?",
      "What is HWI? What it is useful for?"
    ],
    bonusQuestions: [
      "How are multisig wallets can be safer than single sig wallets? Give some examples of practical applications of multisig.",
      "What is a bare multisig? Why are they not used? How can you broadcast a transaction with bare multisig?",
      "What is PSBTv2? How is it different from PSBTv0? And where did v1 go?"
    ]
  },
  {
    week: 4,
    title: "Bitcoin Script & Transaction Verification",
    assignmentLinks: {
      3: "https://classroom.github.com/a/4A6Gnplj",
      4: "https://classroom.github.com/a/yqzdrthX",
    },
    content: `
## Reading Material

1. [Chapter 8: Expanding Bitcoin Transactions in Other Ways](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/08_0_Expanding_Bitcoin_Transactions_Other.md)
2. [Chapter 9: Introducing Bitcoin Scripts](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/09_0_Introducing_Bitcoin_Scripts.md)
    `,
    gdQuestions: [
      "How are locktime via Unix time and via block height differentiated in the transaction data?",
      "What is a LockTime? Why are locktimes useful?",
      "What is OP_RETURN? How is it useful? What happens in script verification when it encounters an OP_RETURN? What if the value of OP_RETURN is non-zero?",
      "What are `scriptpubkey` and `scriptsig`? How are they used in script verification?",
      "Why is P2PKH needed when we already had P2PK?",
      "Differentiate between segwit and non-segwit script verification.",
      "How is a `scriptpubkey` reduced into an address? Can you recover a `scriptpubkey` from an address?",
      "What are standard and non-standard `scriptpubkeys`? Can you create and submit a transaction with a non-standard `scriptpubkey` to your mempool? [Hint: Create a transaction with an addition script, call testmempoolaccept].",
      "How can you broadcast a non-standard redeem script?"
    ],
    bonusQuestions: [
      "Why can't we create a reverse-locktime in bitcoin? ie, a UTXO that gets locked (unspendable) after a given time.",
      "What are the practical use cases of OP_RETURN?",
      "How can one use the `scriptsig` field to encode random data in the blockchain?"
    ]
  },
  {
    week: 5,
    title: "Advanced Scripts & Time Locks",
    assignmentLinks: {
      3: "https://classroom.github.com/a/fAF7mVe4",
      4: "https://classroom.github.com/a/MinM_C2P",
    },
    content: `
## Reading Material

1. [Chapter 10: Embedding Bitcoin Scripts in P2SH Transactions](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/10_0_Embedding_Bitcoin_Scripts_in_P2SH_Transactions.md)
2. [Chapter 11: Empowering Timelock with Bitcoin Scripts](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/11_0_Empowering_Timelock_with_Bitcoin_Scripts.md)
    `,
    gdQuestions: [
      "Why is P2SH useful when we can have the raw locking script inside the `scriptpubkey`?",
      "What are the limitations imposed by consensus on the size of a `scriptsig`?",
      "Why is the P2SH hash length 20 bytes, whereas the P2WSH script hash is 32 bytes?",
      "Why does the multisig `redeemscript` start with a `0`? Is this a bug? Is there a way to fix it?",
      "How was segwit designed to be backward compatible? How did non-segwit nodes handle segwit transactions?",
      "What are the limitations of `nLockTime`?",
      "What is the difference between relative and absolute time locks?",
      "How are sequence locks set in a transaction? What was the previous (intended) use case of sequence in the transaction?",
      "Briefly describe how CLTV verification works.",
      "Briefly describe how CSV verification works.",
      "What happens when a transaction includes a time lock using both `nLockTime` and `nSequence` values? What is the error in the `testmempoolaccept` RPC when using a transaction like that?"
    ],
    bonusQuestions: [
      "How is the different combination of `nlocktime` and `nsequence` determines different behaviors example, various combinations of locktime and RBF.",
      "What are the practical applications of CLTV and CSV?",
      "How was segwit designed to be backward compatible? How did non-segwit nodes handled segwit transactions?"
    ]
  },
  {
    week: 6,
    title: "Complex Scripts & Real-World Applications",
    content: `
## Reading Material

1. [Chapter 12: Expanding Bitcoin Scripts](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/12_0_Expanding_Bitcoin_Scripts.md)
2. [Chapter 13: Designing Real Bitcoin Scripts](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/13_0_Designing_Real_Bitcoin_Scripts.md)
    `,
    gdQuestions: [
      "How can script conditionals cause transaction malleability?",
      "What are some real-world conditional script examples?",
      "What are some practical examples of OP_SWAP?",
      "What can multisig escrows be useful for?",
      "What are some real-world examples of multisig escrows?",
      "Are there any real-world examples of complex bare scripts?"
    ],
    bonusQuestions: [
      "Which opcodes can access different parts of the transaction data? Name few of them.",
      "Why is Bitcoin Script turing-incomplete? What are the problems of turning-complete smart contracts, in context of decentralised blockchains.",
      "What is the coolest Bitcoin Script application you can imagine, that doesn't exist yet?"
    ]
  }
];
