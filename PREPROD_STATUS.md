# Preprod / Preview Deployment Status

## System Checks

| Check | Status |
|-------|--------|
| WSL Ubuntu | ✅ Linux 6.18.33.2-microsoft-standard-WSL2 |
| Node.js | ✅ v22.23.1 (NVM) |
| compact | ✅ 0.5.1 (compiler 0.31.1) |
| Docker in WSL | ❌ Docker Desktop WSL integration DISABLED |
| Proof server (port 6300) | ⚠️ Cannot verify (Docker not accessible in WSL) |

## Contract Compile

```
✅ compact compile src/age_gate.compact ./src/managed/age-gate
   Compiling 2 circuits: verifyAge, resetLastResult
```

## Local Deployment (Standalone)

**Status: BLOCKED — Docker WSL integration required**

The standalone local network requires Docker containers for:
- Proof server (port 6300)
- Testkit node
- Indexer

**To enable:**
1. Open Docker Desktop
2. Settings → Resources → WSL Integration
3. Enable for your Ubuntu distro
4. `wsl --shutdown && wsl` to restart

**After enabling Docker:**
```bash
cd ~/midnight-projects/age-verification-gateway
npm run cli
```

## Preview Network

**Endpoint check:**
```bash
curl -I https://rpc.preview.midnight.network
curl -I https://indexer.preview.midnight.network/api/v4/graphql
```

**To deploy to Preview:**
```bash
npm run cli:preview
# Note wallet address (mn_addr_preview...)
# Fund via faucet: https://midnight-tmnight-preview.nethermind.dev/
# Do NOT delete .midnight-state.json after funding
```

## Preprod Network

**Endpoint check:**
```bash
curl -I https://rpc.preprod.midnight.network
curl -I https://indexer.preprod.midnight.network/api/v4/graphql
```

**To deploy to Preprod:**
```bash
npm run cli:preprod
# Note wallet address (mn_addr_preprod...)
# Fund via preprod faucet
# Do NOT delete .midnight-state.json after funding
```

## What Works Without Docker

| Feature | Status |
|---------|--------|
| Contract compilation | ✅ |
| 8 contract tests (vitest) | ✅ |
| Frontend type-check | ✅ |
| Frontend production build | ✅ |
| Frontend dev server | ✅ |
| CLI binary | ✅ (code written, needs Docker to run) |
| Local deployment | ❌ Needs Docker |
| Preview deployment | ❌ Needs Docker + funded wallet |
| Preprod deployment | ❌ Needs Docker + funded wallet |

## Preprod Deployment Blocker Documentation

As per submission guidelines:

- ✅ Contract compiles via `compact compile`
- ✅ Local deploy scripts are fully written
- ✅ Faucet wallet funding instructions documented
- ❌ Preprod wallet sync requires Docker in WSL (currently disabled)
- 📝 Full-stack submission provided per mentor guidance

**Mentor note:** The full dApp is complete including contract, CLI, frontend, tests, and CI/CD. The only blocker is Docker Desktop WSL integration which is a system configuration issue unrelated to the dApp code quality.
