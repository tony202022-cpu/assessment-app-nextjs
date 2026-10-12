# Credit accounting invariant

`companies.package_size` is the authoritative allocation and
`companies.credits_balance` is the authoritative remaining balance. Used credits
are derived as `package_size - credits_balance`.

Manual allocation adjustments preserve historical consumption:

- **Add Credits N** increases both `package_size` and `credits_balance` by N.
- **Remove Credits N** decreases both fields by N and is allowed only when N is
  no greater than the current `credits_balance`.
- N must be a positive integer. The operation must reject invalid current state,
  integer overflow or underflow, a negative resulting balance, or a resulting
  `package_size` below `credits_balance`.
- Removing all unused allocation may result in both values being zero. It never
  reinterprets or erases consumption already recorded in `credit_transactions`.

Because each adjustment changes allocation and remaining balance by the same
amount, `package_size - credits_balance` is unchanged. Assessment consumption
continues to reduce only `credits_balance` through
`start_assessment_with_credit`; that function is intentionally unchanged.
