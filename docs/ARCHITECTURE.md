# Age Verification Gateway — System Architecture & ZK Pipeline

This document details the high-level system architecture, data isolation boundaries, and the Zero-Knowledge cryptographic verification pipeline of the **Age Verification Gateway (AVG)** on Midnight Network.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                                │
│                                                                        │
│  ┌───────────────────────┐           ┌──────────────────────────────┐  │
│  │   React / Vite UI     │           │  Private State Storage       │  │
│  │  (Inputs: Birth Year) │ ────────> │  (Memory / Local Storage)    │  │
│  └──────────┬────────────┘           └──────────────┬───────────────┘  │
│             │                                       │                  │
│             ▼                                       ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     ZK Prover (Client Side)                      │  │
│  │                                                                  │  │
│  │   Witness: localBirthYear() (PRIVATE, NEVER BROADCAST)          │  │
│  │   Computation: (currentYear - birthYear) >= minimumAge           │  │
│  │   Circuit: verifyAge.zkir                                        │  │
│  │   Output: Boolean Evaluation (disclose(true/false))              │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
                                      │ Cryptographic ZK Proof
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        MIDNIGHT NETWORK                                │
│                                                                        │
│  ┌─────────────────────────┐          ┌─────────────────────────────┐  │
│  │   Midnight Node / RPC   │ ───────> │  On-Chain Compact Verifier  │  │
│  │   (Preprod Testnet)     │          │  (verifyAge.verifier)       │  │
│  └─────────────────────────┘          └──────────────┬──────────────┘  │
│                                                      │                 │
│                                                      ▼                 │
│                                       ┌─────────────────────────────┐  │
│                                       │     Public Ledger State     │  │
│                                       │                             │  │
│                                       │ • verificationCount: uint   │  │
│                                       │ • lastResult: bool          │  │
│                                       │ • minimumAge: uint          │  │
│                                       │ • initialized: bool         │  │
│                                       └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Data Isolation & Privacy Boundary

| Data Element | Layer | Visibility | Security Guarantee |
| :--- | :--- | :--- | :--- |
| **Birth Year** | Client Local State | ❌ Private (User only) | Never leaves browser memory; passed solely to local witness function. |
| **Computed Age** | ZK Circuit Memory | ❌ Hidden | Intermediate calculation within circuit constraints; discarded after proof generation. |
| **Wallet Identity** | Client Wallet | ❌ Decoupled | No user identifier is anchored to individual verification results on-chain. |
| **Proof Validation** | Midnight Consensus | ✅ Public | Observers verify mathematical validity of the proof without seeing inputs. |
| **Pass/Fail Outcome** | Compact Ledger | ✅ Public | Global boolean reflecting latest verification status for downstream authorization. |

---

## 🔄 Lifecycle Execution Sequence

1. **User Interaction**: User inputs their birth year and selects a threshold policy (e.g. `18+`, `21+`).
2. **Private Witness Injection**: The `localBirthYear()` witness retrieves the birth year inside the `WitnessContext`.
3. **ZK Proof Generation**: The client generates a zero-knowledge proof proving compliance with the circuit constraints.
4. **Transaction Dispatch**: The proof, along with public parameters (`currentYear`, `minimumAge`), is dispatched via Midnight Lace Wallet.
5. **On-Chain Verification**: The Midnight validator executes the verifier key against the proof without access to private inputs.
6. **State Transition**: `verificationCount` increments and `lastResult` updates on the public ledger.
