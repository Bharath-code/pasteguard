# Accuracy corpus

- `positive.js`: seeded generators, one template per non-pii rule, 50 samples each. Nothing secret-shaped is committed.
- `negative/`: false-positive corpus. Files with `sample` in the name are synthetic (UUIDs, SHAs, lockfile, logs, YAML, base64). `repo-*.txt` are real repo prose and code, rebuilt by `node corpus/build-negative.mjs`; files containing the documented AWS example key and test files are left out.
- Limitation: the FP rate is measured mostly on synthetic data, so it understates what real pasted text will trigger. `npm run gates -w packages/core` prints the synthetic share.
