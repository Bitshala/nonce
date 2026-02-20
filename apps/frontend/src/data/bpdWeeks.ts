import type { WeekContent } from '../types/instructions';

export const bpdWeeks: WeekContent[] = [
  {
    week: 1,
    title: "Bitcoin Protocol Development Cohort",
    content: "## Reading Material\n- [Welcome to the Bitcoin Protocol Development Seminar](https://chaincode.gitbook.io/seminars/bitcoin-protocol-development/welcome-to-the-bitcoin-protocol)",
    gdQuestions: [
      "Why did Satoshi put so much stress on the irreversibility of transactions?",
      "What proposed role do SPV nodes play in the Bitcoin ecosystem?",
      "What do you think might happen if Satoshi returned to Bitcoin development?",
      "How have show-stopping bugs or disruptions to the network been handled in the past?",
      "In your opinion, what did Satoshi \"invent\" that was truly new?",
      "What is a Sybil Attack, and how has it been solved in the past before Bitcoin? How does Proof of Work enable Sybil resistance in the Bitcoin network?",
      "Explain the \"fair exchange problem\" in distributed economic systems. How does Bitcoin address it? Provide real-world examples of fair exchange solutions within the Bitcoin ecosystem.",
      "According to the authors of \"Bitcoin's Academic Pedigree,\" what are the reasons for the academic community initially overlooking Bitcoin? In your opinion, has academia embraced Bitcoin research over the years?",
      "In the context of Bitcoin development, how would you judge the merits or value of a good project/experiment?",
      "Why did Bitcoin's creator remain anonymous? Can you recall legal action against cryptographic research before Bitcoin? Why have states historically viewed cryptography with hostility?",
      "What is Block Subsidy? When will the block subsidy go to zero? How will the miners sustain themselves once the Block Subsidy reaches zero?",
      "Define the differences between a full node, a pruned node, and an SPV node?",
      "What are the incentives to run a full node? What role does a full node play in decentralised network security? What would happen if the full node count in the network drastically reduced?",
      "What is a mempool? What is it useful for? Are the mempools of all nodes exactly the same? If not, why not? What would happen if the mempools diverge massively among the nodes?",
      "What are checkpoints in the blockchain? What are they used for?"
    ],
    bonusQuestions: [
      "The white paper, in section 4, mentions that \"Proof-of-work is essentially One-CPU-one-vote\". What are the three functions that this \"CPU\" performs? Reflect on what Satoshi's CPU has evolved into today.",
      "The white paper defines bitcoin as \"a chain of digital signatures\". The inherent assumption is that signatures are unforgeable. Does this assumption hold today?",
      "Suppose global hashpower drops by 50% overnight, what happens to block times before the next adjustment, and what happens after the adjustment?",
      { question: "Explain why the plot (average time taken to produce a bitcoin block in a day) is 'noisy'.", image: "/images/bpd/question4.png" },
      { question: "Assume that you are a merchant accepting Bitcoin. The table below shows the probability of reversing a transaction given the number of confirmations and attacker's hash rate (as a % of network's hash rate). What is the number of confirmations you would be comfortable with?", image: "/images/bpd/question5.png" },
      "Define what must stay on L1 versus what can move to L2 without eroding Bitcoin's key security properties. Where is the bright line, if any?"
    ],
    assignmentLinks: {
      1: "https://classroom.github.com/a/dSwyPQx8",
    }
  },
  {
    week: 2,
    title: "SEGWIT",
    content: "## Reading Material\n- [SEGWIT](https://chaincode.gitbook.io/seminars/bitcoin-protocol-development/segwit)",
    gdQuestions: [
      "What is the SegWit upgrade? Why was it called SegWit? Is a non-SegWit node considered a full node?",
      "What is the difference between a hard and soft fork? Which one is preferable for protocol upgrades and why? What is BIP9 Signalling?",
      "Why is Segwit a softfork? How does a non-Segwit node handle verification of a Segwit transaction?",
      "What is the difference between wrapped SegWit and native SegWit addresses? Why are wrapped Segwit addresses needed?",
      "Describe ECDSA Malleability. Give a few concrete examples of how an ECDSA signature can be modified without invalidating it.",
      "Why do second-layer protocols (like Lightning) require transaction malleability to be fixed? How did we fix it?",
      "What is the Quadratic Sighash problem? How does Segwit fix this?",
      "What rationale behind using a 4 MB max block size limit in Segwit Upgrade? What was the limit before? In your opinion, was increasing the limit a good idea?",
      "How does a blockheader commit to Segwit witness data of the transactions? Where do other parts of the transaction data get committed in the blockheader?",
      "What is a Virtual Byte(VB)? What is Weight Unit(WU)? What's the relation between them? How do weights vary between a segwit and a non-segwit transaction of similar inputs and outputs?",
      "Why was the Segwit upgrade controversial? What was BIP148 (UASF)? Why was it deployed? What was the effect of deploying the UASF?",
      "How does SegWit affect the initial block download (IBD)?",
      "What is ASIC Boost? Describe the two variants of it, Covert and Overt ASIC Boost. What was Segwit's effect on ASIC Boost?",
      "Describe the BIP9 Softfork activation process. How do miners signal for activation? Why do we need a super majority of miner signalling before activation?",
      "What are some major requirements and design goals while designing the address format? How was Bech32 improved over previous formats?",
      "What is the Bech32 mutability issue? How is it fixed for Taproot addresses?"
    ],
    assignmentLinks: {
      1: "https://classroom.github.com/a/IV07G3s9",
    }
  },
  {
    week: 3,
    title: "Mining and Network Block Propagation",
    content: "## Reading Material\n- [Mining and Network Block Propagation](https://chaincode.gitbook.io/seminars/bitcoin-protocol-development/mining-network-prop)",
    gdQuestions: [
      "Why would some miners use parts of the version field as a nonce? What other parts of the transaction can miners mutate to increase the nonce space? What effect does this have on the network?",
      "How do P2Pools work? What are their advantages and disadvantages? Name some of the real-life P2Pools in the Bitcoin ecosystem.",
      "What is the maximum allowed deviation for a block's timestamp, and how is it validated? Could variations in timestamps be exploited to compromise the network?",
      "What is the Difficulty Adjustment Algorithm (DAA)? Can Bitcoin work without it? Identify some known DAA exploits used against other low-Proof-of-Work (PoW) blockchains. Explain why Bitcoin is immune to these specific attacks.",
      "What are ASICs? How did Bitcoin mining occur before the advent of ASICs? When and by which company was the first ASIC publicly released? Do you believe ASIC-resistant blockchains (which restrict mining to only GPUs or CPUs) are a good or bad idea, and why?",
      "What are the mempool eviction limits for low-fee transactions? If a wallet's transaction is evicted from the mempool, what action should the wallet take? How would the wallet even become aware of the eviction? What mechanisms are available for increasing transaction fees after an initial broadcast? Provide examples illustrating when one mechanism would be preferred over another.",
      "What are Mempool Policies? How do they differ from Consensus Rules? How do mempool policies affect the behavior of the Bitcoin network as a whole? In Distributed Networks, is it better to have homogeneous or divergent mempool policies? Briefly describe the pros and cons of both. How can you change mempool policies for your node? Name some major policies and their default values for Bitcoin Core nodes.",
      "Describe the major network parameters of the Bitcoin Peer-to-Peer (P2P) network that directly influence the mining process. Briefly describe some significant protocol developments over the last decade that have aimed to improve these specific parameters.",
      "What major factors influence P2P block propagation time? What are the consequences of excessively high block propagation time? Is a 10-minute block interval too slow for Bitcoin? What has been the natural reorg rate on the Bitcoin mainnet in the last six months? What mechanism do miners use to mitigate block propagation latencies, and does its use cause network centralization?",
      "Greg Maxwell mentioned that miners could be hesitant to connect with one another directly, even though it would speed up block propagation. Why? What are the current R&Ds going on to decrease block propagation latency in the Bitcoin Network? Why is this important for decentralisation of the network?",
      "What is StratumV2? What problem does it solve? What are some examples of currently running decentralised mining pools? What is solo mining? What's your current probability of winning block reward via solo mining with a Bitaxe miner? How many miners won the block reward in solo mining in the last 2 years?",
      "What are Compact Block Relays? Why are they useful? How do they differ from Compact Block Filters (BIP157/158)? What is the current number of nodes serving BIP157 Compact Block Filters in the Bitcoin P2P network? What are the 5 most dominant service flags on the current Bitcoin P2P network? How did you find this data?",
      "What are Eclipse Attacks? What would an attacker gain by eclipsing a node? How would an attacker perform this on a target node? What mechanisms do Bitcoin nodes have to resist targeted eclipse attacks? Describe the BGP Hijack attack. Can Bitcoin be attacked via this currently? What are the current R&Ds for mitigating BGP on Bitcoin?"
    ],
    assignmentLinks: {
      1: "https://classroom.github.com/a/ogEHBuaR",
    }
  }
];
