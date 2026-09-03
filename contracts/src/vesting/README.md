# Vesting

## Invariants

What must hold for vesting at all times:

- Must never owe more than what is owned by the contract `totalVesting <= token.balanceOf(vesting)`
- The sum of - for each schedule - the differences between the total amount $FVC and the amount of $FVC already released must equal the total amount of FVC that is owned by the contract
- For every schedule, the total amount of FVC must be greater than the amount released
- For every schedule, the amount vesting must be greater than the amount released


## Glossary
|Term|Definition|
---
|`totalVesting`||
---
|`token.balanceOf(vesting)`||
---
|`released`|total amount of $FVC released to a beneficiary from a single vesting schedule|
---
|Beneficiary|The wallet that is eligible to release vested $FVC corresponding with their wallet address|
