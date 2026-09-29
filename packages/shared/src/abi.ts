export const IntegrityRegistryABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "EvidenceAdded",
    inputs: [
      { name: "recordKey", type: "bytes32", indexed: true },
      { name: "version", type: "uint64", indexed: true },
      { name: "dataHash", type: "bytes32", indexed: false },
      { name: "actorHash", type: "bytes32", indexed: false },
      { name: "action", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
      { name: "writerAddress", type: "address", indexed: true }
    ],
    anonymous: false
  },
  {
    type: "function",
    name: "appendEvidence",
    inputs: [
      { name: "recordKey", type: "bytes32" },
      { name: "dataHash", type: "bytes32" },
      { name: "actorHash", type: "bytes32" },
      { name: "expectedVersion", type: "uint64" },
      { name: "action", type: "uint8" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "exists",
    inputs: [{ name: "recordKey", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getEvidenceByVersion",
    inputs: [
      { name: "recordKey", type: "bytes32" },
      { name: "version", type: "uint64" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "dataHash", type: "bytes32" },
          { name: "actorHash", type: "bytes32" },
          { name: "version", type: "uint64" },
          { name: "timestamp", type: "uint64" },
          { name: "action", type: "uint8" },
          { name: "writerAddress", type: "address" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getLatestEvidence",
    inputs: [{ name: "recordKey", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "dataHash", type: "bytes32" },
          { name: "actorHash", type: "bytes32" },
          { name: "version", type: "uint64" },
          { name: "timestamp", type: "uint64" },
          { name: "action", type: "uint8" },
          { name: "writerAddress", type: "address" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getAllRecordKeys",
    inputs: [],
    outputs: [{ name: "", type: "bytes32[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getRecordKeyAt",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getRecordKeyCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getVersionCount",
    inputs: [{ name: "recordKey", type: "bytes32" }],
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  }
] as const;
