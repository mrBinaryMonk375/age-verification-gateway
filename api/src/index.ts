// Age Verification Gateway - API
// SPDX-License-Identifier: Apache-2.0

import * as AgeGate from '../../contract/src/managed/age-gate/contract/index.js';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type AgeGateDerivedState,
  type AgeGateProviders,
  type DeployedAgeGateContract,
  ageGatePrivateStateKey,
} from './common-types.js';
import { CompiledAgeGateContractContract } from '../../contract/src/index';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, tap, type Observable } from 'rxjs';
import { createAgeGatePrivateState } from '../../contract/src/witnesses.js';

export * from './common-types.js';

/** An API for a deployed Age Gate contract. */
export interface DeployedAgeGateAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<AgeGateDerivedState>;
  verifyAge: (currentYear: bigint) => Promise<void>;
  resetLastResult: () => Promise<void>;
}

export class AgeGateAPI implements DeployedAgeGateAPI {
  private constructor(
    public readonly deployedContract: DeployedAgeGateContract,
    providers: AgeGateProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => AgeGate.ledger(contractState.data)),
        tap((s) => logger?.trace({ ledgerState: s })),
        map((s) => ({
          verificationCount: s.verificationCount,
          lastResult: s.lastResult,
          minimumAge: s.minimumAge,
          initialized: s.initialized,
        })),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<AgeGateDerivedState>;

  async verifyAge(currentYear: bigint): Promise<void> {
    this.logger?.info({ action: 'verifyAge', currentYear });
    await this.deployedContract.callTx.verifyAge(currentYear);
  }

  async resetLastResult(): Promise<void> {
    this.logger?.info({ action: 'resetLastResult' });
    await this.deployedContract.callTx.resetLastResult();
  }

  static async deploy(
    providers: AgeGateProviders,
    birthYear: bigint,
    minimumAge: bigint,
    logger?: Logger,
  ): Promise<AgeGateAPI> {
    logger?.info('Deploying Age Gate contract...');
    const privateState = createAgeGatePrivateState(birthYear);
    await providers.privateStateProvider.set(ageGatePrivateStateKey, privateState);
    const deployedContract = (await deployContract(providers, {
      privateStateId: ageGatePrivateStateKey,
      contract: CompiledAgeGateContractContract,
      initialPrivateState: privateState,
      args: [minimumAge],
    } as any)) as unknown as DeployedAgeGateContract;
    return new AgeGateAPI(deployedContract, providers, logger);
  }

  static async join(
    providers: AgeGateProviders,
    contractAddress: ContractAddress,
    birthYear: bigint,
    logger?: Logger,
  ): Promise<AgeGateAPI> {
    logger?.info({ action: 'join', contractAddress });
    const privateState = createAgeGatePrivateState(birthYear);
    await providers.privateStateProvider.set(ageGatePrivateStateKey, privateState);
    const deployedContract = (await findDeployedContract(providers, {
      contractAddress,
      privateStateId: ageGatePrivateStateKey,
      contract: CompiledAgeGateContractContract,
      initialPrivateState: privateState,
    } as any)) as unknown as DeployedAgeGateContract;
    return new AgeGateAPI(deployedContract, providers, logger);
  }
}
