// Age Verification Gateway - Contract Index
// SPDX-License-Identifier: Apache-2.0

import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export * from './managed/age-gate/contract/index.js';
export * from './witnesses';

import * as CompiledAgeGateContract from './managed/age-gate/contract/index.js';
import * as Witnesses from './witnesses';

export const CompiledAgeGateContractContract = CompiledContract.make<
  CompiledAgeGateContract.Contract<Witnesses.AgeGatePrivateState>
>('AgeGate', CompiledAgeGateContract.Contract<Witnesses.AgeGatePrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./managed/age-gate'),
);
