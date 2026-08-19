// Age Verification Gateway - API Common Types
// SPDX-License-Identifier: Apache-2.0

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { AgeGatePrivateState, Contract, Witnesses } from '../../contract/src/index';

export const ageGatePrivateStateKey = 'ageGatePrivateState';
export type PrivateStateId = typeof ageGatePrivateStateKey;

export type AgeGateContract = Contract<AgeGatePrivateState, Witnesses<AgeGatePrivateState>>;

export type AgeGateCircuitKeys = Exclude<keyof AgeGateContract['impureCircuits'], number | symbol>;

export type AgeGateProviders = MidnightProviders<AgeGateCircuitKeys, PrivateStateId, AgeGatePrivateState>;

export type DeployedAgeGateContract = FoundContract<AgeGateContract>;

export type AgeGateDerivedState = {
  readonly verificationCount: bigint;
  readonly lastResult: boolean;
  readonly minimumAge: bigint;
  readonly initialized: boolean;
};
