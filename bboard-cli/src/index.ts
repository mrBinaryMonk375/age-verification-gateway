// Age Verification Gateway - CLI Index
// SPDX-License-Identifier: Apache-2.0

import readline from 'node:readline';
import { AgeGateAPI } from '../../api/src/index.js';
import { createLogger } from './logger-utils.js';
import { type Config, StandaloneConfig, PreviewRemoteConfig, PreprodRemoteConfig } from './config.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
  const args = process.argv.slice(2);
  const networkArg = args.find((a) => a.startsWith('--network='))?.split('=')[1] ?? 'standalone';

  let config: Config;
  if (networkArg === 'preprod') {
    config = new PreprodRemoteConfig();
  } else if (networkArg === 'preview') {
    config = new PreviewRemoteConfig();
  } else {
    config = new StandaloneConfig();
  }

  const logger = await createLogger(config.logDir);

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       Age Verification Gateway - CLI         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\nNetwork: ${networkArg}`);

  const env = config.getEnvironment(logger as any);
  const providers = await (env as any).setup();

  let api: AgeGateAPI | null = null;

  // Deploy or join contract
  const contractAddressEnv = process.env.AGE_GATE_CONTRACT_ADDRESS;
  const birthYearInput = await question('\nEnter your birth year (private - never sent to chain): ');
  const birthYear = BigInt(parseInt(birthYearInput, 10));

  if (!birthYearInput || isNaN(Number(birthYearInput))) {
    console.error('Invalid birth year');
    process.exit(1);
  }

  if (contractAddressEnv) {
    console.log(`\nJoining existing contract at: ${contractAddressEnv}`);
    api = await AgeGateAPI.join(providers as any, contractAddressEnv as any, birthYear, logger);
  } else {
    const minAgeInput = await question('Minimum age to enforce (18 or 21): ');
    const minimumAge = BigInt(parseInt(minAgeInput, 10) || 18);
    console.log('\nDeploying Age Gate contract...');
    api = await AgeGateAPI.deploy(providers as any, birthYear, minimumAge, logger);
    console.log(`\nContract deployed at: ${api.deployedContractAddress}`);
    console.log('Export this address to AGE_GATE_CONTRACT_ADDRESS to reuse.\n');
  }

  // Subscribe to public state
  api.state$.subscribe((state) => {
    console.log('\n📊 Public Ledger State:');
    console.log(`   Verification Count : ${state.verificationCount}`);
    console.log(`   Last Result        : ${state.lastResult ? '✅ PASS' : '❌ FAIL / Not yet verified'}`);
    console.log(`   Minimum Age        : ${state.minimumAge}`);
    console.log(`   Initialized        : ${state.initialized}`);
  });

  // Interactive menu
  while (true) {
    console.log('\n─── Menu ─────────────────────────────────────');
    console.log('  1. Verify my age (private circuit)');
    console.log('  2. Reset last result');
    console.log('  3. Exit');
    const choice = await question('Choose: ');

    if (choice.trim() === '1') {
      const currentYear = BigInt(new Date().getFullYear());
      console.log(`\nSubmitting ZK proof for current year ${currentYear}...`);
      console.log('(Your birth year stays private — only the proof is submitted)');
      try {
        await api.verifyAge(currentYear);
        console.log('\n✅ Age verification PASSED!');
      } catch (err: any) {
        if (err.message?.includes('Age requirement not met')) {
          console.log('\n❌ Age verification FAILED — does not meet minimum age requirement.');
        } else {
          console.error('\n❌ Error:', err.message);
        }
      }
    } else if (choice.trim() === '2') {
      await api.resetLastResult();
      console.log('\nLast result reset.');
    } else if (choice.trim() === '3') {
      break;
    }
  }

  rl.close();
  process.exit(0);
}

export async function run(_config?: any, _testEnv?: any, _logger?: any): Promise<void> {
  await main();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
