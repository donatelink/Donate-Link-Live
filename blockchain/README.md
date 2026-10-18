# DonateLink — Smart Contracts

`DonationRegistry.sol` puts DonateLink's core claim on-chain: a donation record
nobody — not the NGO, not DonateLink — can alter after the fact.

## What the contract does

- `donate(ngoWallet, ngoId, cause)` — payable. Records the donation, emits
  `DonationRecorded`, and forwards **100%** of the value to the NGO's wallet in the
  same transaction. The contract takes no fee and never holds a balance.
- `recordStage(id, stage, proofHash)` — anchors a lifecycle stage (1–5) and the
  hash of its proof file. Stages can only move **forward**, so the proof trail
  cannot be rewritten. Restricted to authorised updaters.
- `ngoId` stores the NGO's Supabase uuid, which is what links an on-chain record
  back to a row in the app.

## Network

Polygon **Amoy** testnet (chainId 80002). Amoy POL has no monetary value — free
from https://faucet.polygon.technology

## Setup

```
npm install
cp .env.example .env      # then fill DEPLOYER_PRIVATE_KEY
```

Use a **throwaway wallet** that only ever holds testnet POL. `.env` is gitignored;
never commit a private key.

## Commands

```
npm run compile       # compile the contract
npm test              # 16 tests, local Hardhat network
npm run deploy:amoy   # deploy to Polygon Amoy
```

`deploy:amoy` writes the ABI and deployed address to
`../utils/contract/DonationRegistry.json` and prints the value to set as
`NEXT_PUBLIC_DONATION_CONTRACT_ADDRESS` in `.env.local` and on Vercel.

## Design notes

- **No custody.** Value in, value out, one transaction. This sidesteps the legal
  and security weight of holding donor funds, and there is no balance to steal.
- **Record before transfer.** State is written before the external call
  (checks-effects-interactions), so a failed transfer reverts the whole thing —
  no orphan record, no lost funds.
- **The app mirrors, the chain proves.** Supabase stays the working database;
  the chain is the independently verifiable audit trail. A donor can check
  PolygonScan without trusting our server.
