# Troubleshooting & Developer Operations Guide

This guide covers common development scenarios, environment configurations, and resolution steps when working with the **Age Verification Gateway** on Midnight Network.

---

## 🛠️ Common Scenarios

### 1. Midnight Lace Wallet "Syncing" or Disconnected
* **Issue**: The Lace wallet extension shows a continuous "syncing" banner or fails to connect.
* **Resolution**:
  - Verify that the Lace wallet extension is configured to the **Midnight Preprod Testnet**.
  - If the wallet connection times out, the web UI automatically enables **Demo Verification Mode**, allowing complete circuit evaluation in-browser without network interruptions.

### 2. Proof Server Connection (Port 6300)
* **Issue**: `ECONNREFUSED` on `http://localhost:6300` during CLI operations.
* **Resolution**:
  - The Midnight proof server container generates ZK proofs locally. Ensure Docker Desktop is running with WSL 2 integration enabled.
  - Launch the proof server container with: `docker compose -f bboard-cli/proof-server.yml up -d`

### 3. Contract Compilation with Compact
* **Issue**: `compact: command not found` on Windows native prompt.
* **Resolution**:
  - Compact is a Linux/WSL binary. Use WSL 2 Ubuntu or the automated GitHub Actions CI workflow to compile `.compact` source files into `src/managed/`.

---

## 📋 Environment Configuration Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `VITE_NETWORK` | `undeployed` / `preprod` | Network target configuration |
| `VITE_CONTRACT_ADDRESS` | *(Hex address)* | Deployed Midnight Compact contract address |
| `VITE_PROOF_SERVER_URL` | `http://localhost:6300` | Local or remote ZK proof generation server |
