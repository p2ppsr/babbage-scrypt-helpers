import { SmartContract } from 'scrypt-ts'
import {
    createAction,
    CreateActionResult,
    CreateActionOutput,
    getTransactionOutputs,
    GetTransactionOutputResult,
} from '@babbage/sdk-ts'

/**
 * Verify a variable is not null or undefined.
 * If the variable is null or undefined, this function will throw an error.
 *
 * @param {T | null | undefined} v - Variable to be verified
 * @returns {T} - Returns the variable if it is neither null nor undefined.
 * @throws {Error} - Throws an error if the truthy value could not be verified.
 */
const verifyTruthy = <T>(v: T | null | undefined): T => {
    if (v == null) {
        throw new Error('A bad thing has happened.')
    }
    return v
}

/**
 * Deploy an instance of a smart contract.
 *
 * @param {SmartContract} instance - Instance of a SmartContract to be deployed.
 * @param {number} satoshis - The amount of satoshis to attach to the contract's output.
 * @param {string} description - Description about what the action does.
 * @param {string} basket - Optional. The associated basket to use for the action.
 * @param {string} metadata - Optional. Custom metadata to be added to the customInstructions field of the output
 * @returns {Promise<CreateActionResult>} - Promise resolving the action result.
 */
export const deployContract = async (
    instance: SmartContract,
    satoshis: number,
    description: string,
    basket?: string,
    metadata?: string
): Promise<CreateActionResult> => {
    return await createAction({
        description,
        outputs: [
            {
                script: instance.lockingScript.toHex(),
                satoshis,
                basket,
                customInstructions: metadata,
            },
        ],
    })
}

interface ListResult<T extends SmartContract>
    extends GetTransactionOutputResult {
    contract: T
}

/**
 * List all instances of a specific smart contract in the basket.
 *
 * @param {string} basket - The basket name where the contracts are expected.
 * @param {(lockingScript: string) => T} contractHydrator - Function that hydrates the contract from a locking script.
 * @returns {Promise<ListResult<T>[]>} - Promise resolving an array of list results with the hydrated contracts.
 */
export const listContracts = async <T extends SmartContract>(
    basket: string,
    contractHydrator: (lockingScript: string) => T
): Promise<ListResult<T>[]> => {
    const outputs = await getTransactionOutputs({
        basket,
        spendable: true,
        includeEnvelope: true,
        includeCustomInstructions: true,
    })
    const contracts: ListResult<T>[] = []
    for (let i = 0; i < outputs.length; i++) {
        contracts.push({
            ...outputs[i],
            contract: contractHydrator(outputs[i].outputScript),
        })
    }
    return contracts
}

/**
 * Redeem a smart contract.
 *
 * @param {ListResult<SmartContract>} listResult - The contract that need to be redeemed, obtained by listing the smart contracts.
 * @param {(self: SmartContract) => void} redeemTransformer - Function that modifies the contract to a state that can be redeemed.
 * @param {string} description - Description about what the action does.
 * @param {number} customLockTime - Optional. The locktime to set on the redeeming transaction.
 * @param {CreateActionOutput[]} outputs - Optional. Additional outputs that should be added to the transaction.
 * @returns {Promise<CreateActionResult>} - Promise resolving the action result.
 */
export const redeemContract = async (
    listResult: ListResult<SmartContract>,
    redeemTransformer: (self: SmartContract) => void,
    description: string,
    customLockTime?: number,
    outputs?: CreateActionOutput[]
): Promise<CreateActionResult> => {
    return await createAction({
        inputs: {
            [listResult.txid]: {
                ...verifyTruthy(listResult.envelope),
                outputsToRedeem: [
                    {
                        index: listResult.vout,
                        unlockingScript: await listResult.contract
                            .getUnlockingScript(redeemTransformer)
                            .toHex(),
                    },
                ],
            },
        },
        description,
        lockTime: customLockTime,
        outputs,
    })
}
