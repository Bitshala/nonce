import type { WeekContent } from '../types/instructions';

export const lnWeeks: WeekContent[] = [
  {
    week: 1,
    title: "Introduction to Lightning Network",
    assignmentLink: "https://classroom.github.com/a/UtmQhOi5",
    content: `
## Reading Material

1. [Mastering the Lightning Network - Introduction](https://github.com/lnbook/lnbook/blob/develop/01_introduction.asciidoc)
2. [Mastering the Lightning Network - Getting Started](https://github.com/lnbook/lnbook/blob/develop/02_getting_started.asciidoc)
3. [History of Lightning Network - Christian Decker](https://btctranscripts.com/chaincode-residency/2018-10-22-christian-decker-history-of-lightning)
4. [Lightning = Bitcoin - Christian Decker](https://btctranscripts.com/chaincode-residency/2018-10-22-christian-decker-lightning-bitcoin)

## Activity

Download and Install any Lightning wallet of your choice e.g. Aqua, Phoenix.
    `,
    gdQuestions: [
      "Explain the basic technical concepts involved in the Lightning Network.",
      "How do we achieve Trust in Decentralized Networks?",
      "Give an example of the Fairness Protocol in action which we are familiar with.",
      "What are the Security Primitives Building Blocks required for a Fairness Protocol?",
      "Explain Bitcoin Proof of Work (PoW) consensus algorithm as a Fairness Protocol.",
      "What are the motivations for the Lightning Network?",
      "Why was Segwit an important upgrade to the base layer for Lightning?",
      "What is a Lightning Network Node?",
      "What are the various components involved in a Lightning Wallet?",
      "Explain various ways to categorize a Lightning Wallet."
    ],
    bonusQuestions: [
      "What is a Payment Channel in the Lightning Network, and how does it enable off-chain transactions between two parties?",
      "What are the key differences between on-chain Bitcoin transactions and off-chain Lightning transactions in terms of speed, cost, and scalability?"
    ]
  },
  {
    week: 2,
    title: "Payment Channels and Lightning Network Operations",
    content: `
## Reading Material

1. [How Lightning Network Works](https://github.com/lnbook/lnbook/blob/develop/03_how_ln_works.asciidoc)
2. [Understanding Payment Channels](https://blog.chainside.net/understanding-payment-channels-4ab018be79d4)
3. [BOLT Protocol](https://github.com/lightning/bolts/tree/master)
4. [Node Client](https://github.com/lnbook/lnbook/blob/develop/04_node_client.asciidoc)
    `,
    gdQuestions: [
      "What Is a Payment Channel? What are the various components required to make a Payment channel?",
      "What are the limitations of a Payment channel?",
      "What are the various ways of closing a Payment channel?",
      "What is a Lightning Network Invoice, and what information does it contain for a payment to be made?",
      "Briefly explain P2P Gossip protocol, Pathfinding, Routing and Payment Forwarding Algorithm as they aid in delivering a payment over the Lightning Network.",
      "Explain Peer-to-Peer Communication Encryption Framework used in the Lightning Network.",
      "Compare Lightning Network to the Bitcoin Network. Highlight the dissimilarities.",
      "List the commonality between Bitcoin and Lightning Network.",
      "What is the difference between c-lightning, LND and eclair? Explain the mostly used use cases of each one.",
      "Why is a unidirectional channel easy to implement?"
    ],
    bonusQuestions: [
      "What is the purpose of channel capacity, and how does it affect the ability to send and receive payments in a Lightning channel?",
      "How do routing nodes in the Lightning Network earn fees? List some common reasons for payment failure?"
    ]
  },
  {
    week: 3,
    title: "Node Operations and Lightning Architecture",
    content: `
## Reading Material

1. [Node Operations](https://github.com/lnbook/lnbook/blob/develop/05_node_operations.asciidoc)
2. [Lightning Architecture](https://github.com/lnbook/lnbook/blob/develop/06_lightning_architecture.asciidoc)
    `,
    gdQuestions: [
      "What security consideration should be considered while running the ln node?",
      "Why are channel backups needed in ln nodes? Describe most used channel backup methods as of now.",
      "Why is swapping needed in ln nodes? Explain difference between on-chain, off-chain and submarine swaps",
      "Why is rebalancing needed after opening the channel? explain any of the methodologies for channel rebalancing.",
      "What are different layers of ln networks?",
      "What factors should be considered before opening a Lightning channel with a peer?",
      "What is node uptime? Why is it important for a Lightning node operator?",
      "What does \"inbound liquidity\" mean for a Lightning node? Why do we need to manage it actively?",
      "What are the main components of LN architecture?",
      "What is below-dust payment? What are the risks of forwarding below-dust payments?"
    ],
    bonusQuestions: [
      "How does closing a channel (cooperative or force-close) differ operationally from simply leaving channels open?",
      "What trade-offs arise from using Lightning, rather than relying solely on the base layer?"
    ]
  },
  {
    week: 4,
    title: "Payment Channels and Routing with HTLCs",
    content: `
## Reading Material

1. [Payment Channels](https://github.com/lnbook/lnbook/blob/develop/07_payment_channels.asciidoc)
2. [Routing HTLCs](https://github.com/lnbook/lnbook/blob/develop/08_routing_htlcs.asciidoc)
3. [Bitcoin Transactions and Script Formats](https://github.com/lightning/bolts/blob/master/03-transactions.md)
4. [HTLC Overview - Elle Mouton](https://ellemouton.com/posts/htlc/)
5. [Hash Time Locked Contract (HTLC)](https://bitcoinops.org/en/topics/htlc/)
6. [Point Time Locked Contracts (PTLCs)](https://bitcoinops.org/en/topics/ptlc/)
7. [Payment Channels](https://blog.chainside.net/understanding-payment-channels-4ab018be79d4)
    `,
    gdQuestions: [
      "How are the issues of \"Locked\" and \"Un-Spendable\" Bitcoin on Lightning channels being addressed?",
      "Explain mechanism to secure the payment channel. How does it address the Worry about theft or stuck funds?",
      "What is Fairness Protocol, its properties and utility in the Lightning system?",
      "What is HTLC and how does HTLC achieve the fairness goal of atomicity and trustless operation?",
      "Explain how HTLC can be used to route a payment across a path made of multiple payment channels?",
      "How to prevent the theft of HTLCs?",
      "What is PTLC protocol and how does it compare with HTLC?",
      "What are the challenges an LN Node may face while routing a payment?",
      "What is a Lightning Network Watchtower, and how does it help protect users who are temporarily offline?",
      "What is meant by \"channel capacity,\" and why does it limit the amount of funds that can be sent or received over a payment channel?"
    ],
    bonusQuestions: [
      "Why must both parties regularly update and sign new commitment transactions when a Lightning channel balance changes?",
      "What is the purpose of time-locks in Lightning transactions, and how do they help resolve payment failures or disputes?"
    ]
  },
  {
    week: 5,
    title: "Channel Operations and Onion Routing",
    content: `
## Reading Material

1. [Channel Operations](https://github.com/lnbook/lnbook/blob/develop/09_channel_operation.asciidoc)
2. [Onion Routing](https://github.com/lnbook/lnbook/blob/develop/10_onion_routing.asciidoc)
3. [Lightning Routing](https://chaincode.gitbook.io/seminars/lightning-protocol-development/lightning-routing)
4. [BOLT Onion Routing](https://github.com/lightning/bolts/blob/master/04-onion-routing.md)
    `,
    gdQuestions: [
      "What is the difference between Local payment vs Routed payment on LN?",
      "Explain the payment forwarding mechanism on LN. How are HTLCs committed and updated for the same?",
      "How would the LN system react to an Error or Expiry of an HTLC?",
      "Provide a brief about the history of the Onion Routing and LN's Onion Routing mechanism SPHINX.",
      "Explain the Onion Routing of HTLCs in LN.",
      "Explain the various Keys and generation mechanisms involved in the Onion Routing.",
      "Explain the Onion routing replay protection and detection mechanism.",
      "Explain the Error Handling mechanism of Onion routing. What kinds of routing failures are there and are some more severe than others?",
      "How to handle the Stuck Payment issue in the Lightning Network?",
      "Is the Lightning routing problem NP-hard?"
    ],
    bonusQuestions: [
      "How can a griefing attack affect routing nodes and what are possible countermeasures?",
      "What is the negative impact of a routing failure? How can just-in-time routing help with routing payments?"
    ]
  },
  {
    week: 6,
    title: "Gossip Protocol and Path Finding",
    content: `
## Reading Material

1. [Gossip Channel](https://github.com/lnbook/lnbook/blob/develop/11_gossip_channel_graph.asciidoc)
2. [Gossip Network - Builder's Guide](https://docs.lightning.engineering/the-lightning-network/the-gossip-network)
3. [Path Finding](https://github.com/lnbook/lnbook/blob/develop/12_path_finding.asciidoc)
4. [Payment Pathfinding - Youtube Video](https://www.youtube.com/watch?v=p8toOF-imk4)
5. [Multi Path Payments](https://lightning.engineering/posts/2020-05-07-mpp/)
6. [BOLT #7](https://github.com/lightning/bolts/blob/master/07-routing-gossip.md)
    `,
    gdQuestions: [
      "Explain the utility of Gossip protocol in the Lightning Network?",
      "What is a Channel Graph and what is the utility of the same? How are they created and maintained?",
      "Explain in detail how a newly booted node will do peer discovery?",
      "Explain various Gossip protocol messages and how they are being verified, authenticated and propagated across the Lightning Network?",
      "Why is pathfinding not part of the BOLT specification?",
      "Explain briefly how the LN network selects the best possible routing path?",
      "Why channel balance is not announced while constructing the lightning path? How to solve the pathfinding problem in the face of uncertainty of balances?",
      "Explain briefly about various pathfinding algorithms and provide an example, emphasizing the trial-and-error nature of payment delivery.",
      "What is MPP? How does it work? What problems does it solve for path finding?",
      "What information about channels and nodes is included in Lightning Network gossip announcements, and why is it limited to public data only?"
    ],
    bonusQuestions: [
      "What is the purpose of routing fees in the Lightning Network, and how do intermediate nodes decide whether to forward a payment?",
      "Why does the Lightning Network require secure peer-to-peer encrypted communication between nodes, and what risks does it prevent?"
    ]
  },
  {
    week: 7,
    title: "Wire Protocol and Encrypted Transport",
    content: `
## Reading Material

1. [Wire Protocol](https://github.com/lnbook/lnbook/blob/develop/13_wire_protocol.asciidoc)
2. [BOLT Message Structure](https://github.com/lightning/bolts/blob/master/01-messaging.md#lightning-message-format)
3. [Features](https://github.com/lightning/bolts/blob/master/09-features.md)
4. [Encrypted Transport](https://github.com/lnbook/lnbook/blob/develop/14_encrypted_transport.asciidoc)
5. [Base and Transport Layers of LN](https://btctranscripts.com/chaincode-residency/2019-06-24-fabrice-drouin-base-and-transport-layers-of-lightning-network)
    `,
    gdQuestions: [
      "What is the Wire Protocol within the Messaging Layer in the Lightning protocol suit?",
      "Explain the utility and the high-level schema of the Wire Protocol.",
      "What is Protobuf and how does it support the Forward and Backward Compatibility in the evolution of the Lightning Protocol?",
      "What is Type-Length-Value (TLV) Format and how does it support the Forward and Backward Compatibility in the evolution of the Lightning Protocol?",
      "What are the Feature Bits and how do they support the Protocol Extensibility?",
      "What are different Upgrade mechanisms possible for the Lightning Network?",
      "What are the reasons TLS is not used by the Lightning Network?",
      "Explain the Noise Protocol Framework used by the Lightning Network.",
      "Explain the encryption and decryption mechanism of Lightning messages.",
      "Why is backward compatibility important when upgrading the Lightning protocol, and how does it protect existing nodes from being disconnected?"
    ],
    bonusQuestions: [
      "What are canonical and non-canonical encodings? Why non-canonical encodings are not used in lightning?",
      "What is the role of message framing (type identifiers and structured fields) in ensuring that Lightning nodes correctly interpret incoming messages?"
    ]
  },
  {
    week: 8,
    title: "Payment Requests, Security and Privacy",
    content: `
## Reading Material

1. [Payment Requests](https://github.com/lnbook/lnbook/blob/develop/15_payment_requests.asciidoc)
2. [Security and Privacy in LN](https://github.com/lnbook/lnbook/blob/develop/16_security_privacy_ln.asciidoc)
3. [BOLT Protocol](https://github.com/lightning/bolts/tree/master)
4. [BOLT #11 - Invoice Protocol for Lightning Payments](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)
5. [Conclusion](https://github.com/lnbook/lnbook/blob/develop/17_conclusion.asciidoc)
6. [BOLT #12 - Offer Encoding](https://github.com/lightning/bolts/blob/master/12-offer-encoding.md)
    `,
    gdQuestions: [
      "What are the necessary pieces of data required to be communicated for a Lightning payment?",
      "Compare the Lightning Payment Requests vs Bitcoin Addresses. Can we use a Lightning payment request more than once?",
      "What is privacy and how to evaluate it in a Lightning Network? Is Lightning private?",
      "What is the difference between the Lightning Network and Bitcoin in terms of Privacy? Does Lightning Network improve upon the privacy of the Bitcoin system?",
      "What are the important issues related to the security and privacy of the Lightning Network? Explain various possible Attacks on the Lightning Network. E.g. Observing, Linking, Probing, DoS, Jamming, Lockup etc.",
      "What is Cross-Layer De-Anonymization in the Lightning system?",
      "Explain various Practical advice for Users to protect their Privacy.",
      "How innovating on the Lightning Network is different from innovating on Bitcoin?",
      "Explain various levels of innovations happening on Lightning Network.",
      "Provide examples of innovations in Bitcoin that are motivated by the use cases in the Lightning Network."
    ],
    bonusQuestions: [
      "Explain the emergence of various Lightning Applications (LApps).",
      "What is a jamming attack in Lightning, and how does it affect channel availability and payment delivery?"
    ]
  }
];
