// Age Verification Gateway - Witnesses
// SPDX-License-Identifier: Apache-2.0

import { Ledger } from './managed/age-gate/contract/index.js';
import { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

/**
 * The private state for the Age Gate contract.
 * `birthYear` is kept entirely off-chain — it is the core private datum.
 * It is never written to the ledger, never broadcast over the network,
 * and never disclosed in the zero-knowledge circuit output.
 *
 * @property {bigint} birthYear - User's private year of birth (e.g. 1995n).
 */
export type AgeGatePrivateState = {
  readonly birthYear: bigint;
};

/**
 * Factory function to instantiate an immutable AgeGatePrivateState object.
 *
 * @param {bigint} birthYear - The user's birth year.
 * @returns {AgeGatePrivateState} Immutable private state container.
 */
export const createAgeGatePrivateState = (birthYear: bigint): AgeGatePrivateState => ({
  birthYear,
});

/**
 * Zero-Knowledge Circuit Witnesses for the Age Gate contract.
 *
 * Witnesses provide private data into the ZK proof generation pipeline:
 * - `localBirthYear()` reads the birth year from local private state.
 * - Called strictly inside the ZK prover on the client device.
 * - The return value is used to mathematically evaluate `currentYear - birthYear >= minimumAge`.
 * - Only the resulting boolean evaluation is disclosed to the public ledger.
 */
export const witnesses = {
  /**
   * Retrieves the user's private birth year within the circuit witness context.
   *
   * @param {WitnessContext<Ledger, AgeGatePrivateState>} context - Execution context containing private state.
   * @returns {[AgeGatePrivateState, bigint]} Tuple of unchanged private state and private birth year value.
   */
  localBirthYear: ({
    privateState,
  }: WitnessContext<Ledger, AgeGatePrivateState>): [AgeGatePrivateState, bigint] => [
    privateState,
    privateState.birthYear,
  ],
};

