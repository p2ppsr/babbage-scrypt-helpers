# babbage-scrypt-helpers

Tools for deploying sCrypt contracts with Babbage SDK

The code is hosted [on GitHub](https://github.com/p2ppsr/babbage-scrypt-helpers) and the package is available [through NPM](https://www.npmjs.com/package/babbage-scrypt-helpers).

## Installation

    npm i babbage-scrypt-helpers

## Example Usage

```js
import { deployContract, listContracts, redeemContract } from 'babbage-scrypt-helpers'
import Demo from './src/contracts/Demo.ts'
import { sha256, byteString } from 'scrypt-ts'

// Compile and deploy the Demo contract
await Demo.compile()
const instance = new Demo(sha256(toByteString('hello world', true)))
const deployTX = await deployContract(
    instance, // Contract instance
    1000, // Number of satoshis
    'Deploy a smart contract', // Description
    'tests' // Basket where you want to keep the deployed UTXO
)
console.log('deployed', deployTX.txid)

// List the basket and provide a hydrator to transform the locking script into a contract
const contracts = await listContracts('tests', (lockingScript: string) => {
    return Demo.fromLockingScript(lockingScript) as Demo
})
console.log('listed', contracts)

// Redeem a contract
const redeemTX = await redeemContract(
    contracts[0], // Contract instance to redeem
    // A function that takes the contract and you call a public method to redeem it
    (self: SmartContract): void => {
        (self as Demo).unlock(toByteString('hello world', true))
    },
    'redeem a smart contract' // A description
)
console.log('REDEEMED!!', redeemTX.txid)
```

## API

<!--#region ts2md-api-merged-here-->

Links: [API](#api), [Variables](#variables)

### Variables

| |
| --- |
| [deployContract](#variable-deploycontract) |
| [listContracts](#variable-listcontracts) |
| [redeemContract](#variable-redeemcontract) |

Links: [API](#api), [Variables](#variables)

---

#### Variable: deployContract

```ts
deployContract = async (instance: SmartContract, satoshis: number, description: string, basket?: string, metadata?: string): Promise<CreateActionResult> => {
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
    });
}
```

Links: [API](#api), [Variables](#variables)

---
#### Variable: listContracts

```ts
listContracts = async <T extends SmartContract>(basket: string, contractHydrator: (lockingScript: string) => T): Promise<ListResult<T>[]> => {
    const outputs = await getTransactionOutputs({
        basket,
        spendable: true,
        includeEnvelope: true,
        includeCustomInstructions: true,
    });
    const contracts: ListResult<T>[] = [];
    for (let i = 0; i < outputs.length; i++) {
        contracts.push({
            ...outputs[i],
            contract: contractHydrator(outputs[i].outputScript),
        });
    }
    return contracts;
}
```

Links: [API](#api), [Variables](#variables)

---
#### Variable: redeemContract

```ts
redeemContract = async (listResult: ListResult<SmartContract>, redeemTransformer: (self: SmartContract) => void, description: string, customLockTime?: number, outputs?: CreateActionOutput[]): Promise<CreateActionResult> => {
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
    });
}
```

Links: [API](#api), [Variables](#variables)

---

<!--#endregion ts2md-api-merged-here-->

## License

The license for the code in this repository is the Open BSV License.
