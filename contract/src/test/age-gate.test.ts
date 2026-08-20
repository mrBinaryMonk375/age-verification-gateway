// Age Verification Gateway - Contract Tests
// SPDX-License-Identifier: Apache-2.0

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  type Ledger,
  ledger,
} from '../managed/age-gate/contract/index.js';
import { type AgeGatePrivateState, witnesses } from '../witnesses.js';
import { describe, it, expect } from 'vitest';

/**
 * Simulator for testing the Age Gate contract without a running network.
 */
class AgeGateSimulator {
  readonly contract: Contract<AgeGatePrivateState>;
  circuitContext: CircuitContext<AgeGatePrivateState>;

  constructor(birthYear: bigint, minimumAge: bigint = 18n) {
    this.contract = new Contract<AgeGatePrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        createConstructorContext({ birthYear }, '0'.repeat(64)),
        minimumAge,
      );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  verifyAge(currentYear: bigint): Ledger {
    // impureCircuits returns { context, result } — we want .context to update state
    this.circuitContext = this.contract.impureCircuits.verifyAge(
      this.circuitContext,
      currentYear,
    ).context;
    return this.getLedger();
  }

  resetLastResult(): Ledger {
    this.circuitContext = this.contract.impureCircuits.resetLastResult(
      this.circuitContext,
    ).context;
    return this.getLedger();
  }
}

describe('Age Gate Contract', () => {
  it('initializes with correct public state', () => {
    const sim = new AgeGateSimulator(1990n, 18n);
    const state = sim.getLedger();

    expect(state.initialized).toBe(true);
    expect(state.minimumAge).toBe(18n);
    expect(state.lastResult).toBe(false);
    expect(state.verificationCount).toBe(0n);
  });

  it('passes age verification for a user who meets the minimum age', () => {
    // User born 1990, current year 2025, minimum age 18 => age = 35 >= 18
    const sim = new AgeGateSimulator(1990n, 18n);
    const state = sim.verifyAge(2025n);

    expect(state.lastResult).toBe(true);
    expect(state.verificationCount).toBe(1n);
  });

  it('rejects age verification for an underage user', () => {
    // User born 2015, current year 2025, minimum age 18 => age = 10 < 18
    const sim = new AgeGateSimulator(2015n, 18n);

    expect(() => sim.verifyAge(2025n)).toThrow();
  });

  it('increments verificationCount on each successful verification', () => {
    const sim = new AgeGateSimulator(1980n, 21n);

    sim.verifyAge(2025n);
    sim.verifyAge(2025n);
    const state = sim.verifyAge(2025n);

    expect(state.verificationCount).toBe(3n);
  });

  it('does not disclose birth year - only boolean result is in ledger state', () => {
    const sim = new AgeGateSimulator(1995n, 18n);
    const stateBefore = sim.getLedger();

    // Ledger state has no birth year field - only public values
    expect('birthYear' in stateBefore).toBe(false);
    expect('verificationCount' in stateBefore).toBe(true);
    expect('lastResult' in stateBefore).toBe(true);
    expect('minimumAge' in stateBefore).toBe(true);

    sim.verifyAge(2025n);
    const stateAfter = sim.getLedger();

    // After verification, still no birth year in ledger
    expect('birthYear' in stateAfter).toBe(false);
    expect(stateAfter.lastResult).toBe(true);
  });

  it('can reset last result to false', () => {
    const sim = new AgeGateSimulator(1990n, 18n);
    sim.verifyAge(2025n);
    expect(sim.getLedger().lastResult).toBe(true);

    sim.resetLastResult();
    expect(sim.getLedger().lastResult).toBe(false);
  });

  it('works with minimum age 21 (e.g. alcohol restriction)', () => {
    // User born 2004, year 2025 => age = 21 >= 21
    const sim = new AgeGateSimulator(2004n, 21n);
    const state = sim.verifyAge(2025n);

    expect(state.lastResult).toBe(true);
  });

  it('fails for user who is exactly 1 year under minimum age', () => {
    // User born 2008, current year 2025, minimum age 18 => age = 17 < 18
    const sim = new AgeGateSimulator(2008n, 18n);

    expect(() => sim.verifyAge(2025n)).toThrow();
  });

  it('supports COPPA threshold of 13 for teen digital platforms', () => {
    // User born 2012, current year 2025 => age = 13 >= 13
    const sim = new AgeGateSimulator(2012n, 13n);
    const state = sim.verifyAge(2025n);

    expect(state.lastResult).toBe(true);
    expect(state.minimumAge).toBe(13n);
  });

  it('verifies exact threshold boundary when user turns required age this year', () => {
    // User born 2007, current year 2025 => age = 18 >= 18
    const sim = new AgeGateSimulator(2007n, 18n);
    const state = sim.verifyAge(2025n);

    expect(state.lastResult).toBe(true);
  });
});

