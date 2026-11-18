/** ABI của IntegrityRegistry (sinh từ artifacts sau khi biên dịch). */
export const IntegrityRegistryABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "version",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "enum IntegrityRegistry.Action",
        "name": "action",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "timestamp",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "writer",
        "type": "address"
      }
    ],
    "name": "EvidenceAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "writer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "WriterChanged",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "addWriter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "expectedVersion",
        "type": "uint64"
      },
      {
        "internalType": "enum IntegrityRegistry.Action",
        "name": "action",
        "type": "uint8"
      }
    ],
    "name": "appendEvidence",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      }
    ],
    "name": "exists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllRecordKeys",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      }
    ],
    "name": "getHistory",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "dataHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "version",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "timestamp",
            "type": "uint64"
          },
          {
            "internalType": "enum IntegrityRegistry.Action",
            "name": "action",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "writer",
            "type": "address"
          }
        ],
        "internalType": "struct IntegrityRegistry.Evidence[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      }
    ],
    "name": "getLatestEvidence",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "dataHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "version",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "timestamp",
            "type": "uint64"
          },
          {
            "internalType": "enum IntegrityRegistry.Action",
            "name": "action",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "writer",
            "type": "address"
          }
        ],
        "internalType": "struct IntegrityRegistry.Evidence",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      }
    ],
    "name": "getVersionCount",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWriters",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isWriter",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "removeWriter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
