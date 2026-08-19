// Age Verification Gateway - Witnesses
// SPDX-License-Identifier: Apache-2.0

import { Ledger } from './managed/age-gate/contract/index.js';
import { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

/**
 * The private state for the Age Gate contract.
 * birthYear is kept entirely off-chain - it is the core private datum.
 * It is never written to the ledger, never disclosed in circuit output.
 */
export type AgeGatePrivateState = {
  readonly birthYear: bigint;
};

export const createAgeGatePrivateState = (birthYear: bigint): AgeGatePrivateState => ({
  birthYear,
});

/**
 * Witnesses for the Age Gate contract.
 *
 * localBirthYear() reads the birth year from private state.
 * Called inside the ZK circuit - return value is used to compute age
 * but is NEVER written to the ledger or disclosed to observers.
 */
export const witnesses = {
  localBirthYear: ({
    privateState,
  }: WitnessContext<Ledger, AgeGatePrivateState>): [AgeGatePrivateState, bigint] => [
    privateState,
    privateState.birthYear,
  ],
};
