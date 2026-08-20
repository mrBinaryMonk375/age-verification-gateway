// Age Verification Gateway - API Common Types
// SPDX-License-Identifier: Apache-2.0

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { AgeGatePrivateState, Contract, Witnesses } from '../../contract/src/index';

/** Unique identifier key used by Midnight private state storage providers */
export const ageGatePrivateStateKey = 'ageGatePrivateState';
export type PrivateStateId = typeof ageGatePrivateStateKey;

/** Contract type binding for the Age Gate Compact smart contract */
export type AgeGateContract = Contract<AgeGatePrivateState, Witnesses<AgeGatePrivateState>>;

/** Circuit identifiers callable on the Age Gate smart contract */
export type AgeGateCircuitKeys = Exclude<keyof AgeGateContract['impureCircuits'], number | symbol>;

/** Midnight SDK provider bundle for Age Gate proof generation and indexer queries */
export type AgeGateProviders = MidnightProviders<AgeGateCircuitKeys, PrivateStateId, AgeGatePrivateState>;

/** Live on-chain reference to a deployed Age Gate contract instance */
export type DeployedAgeGateContract = FoundContract<AgeGateContract>;

/**
 * Public ledger state model projected from the Midnight indexer.
 */
export type AgeGateDerivedState = {
  /** Total count of age verification proofs verified by the contract */
  readonly verificationCount: bigint;
  /** Boolean outcome of the most recent verification evaluation */
  readonly lastResult: boolean;
  /** Enforced minimum age requirement policy (e.g. 18n, 21n) */
  readonly minimumAge: bigint;
  /** Initialization and deployment status flag */
  readonly initialized: boolean;
};

