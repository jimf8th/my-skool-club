# Contributing to My Skool Club

Thank you for considering a contribution. My Skool Club is open source and
welcomes bug fixes, documentation improvements, tests, and focused feature
proposals.

## Getting started

1. Fork the repository.
2. Create a focused feature or fix branch.
3. Follow the local setup instructions in [README.md](README.md).
4. Add or update tests for behavior you change.
5. Open a pull request describing the problem, solution, and verification.

## Before opening a pull request

Run the checks relevant to your change:

```sh
cd backend && mvn test
cd frontend && npm test -- --run
cd mobile && npm test -- --runInBand
```

Do not commit secrets, production data, personal student information, build
outputs, dependency directories, or screen recordings.

## Contact

Questions about contributing can be sent to
[jim.edward@myskoolclub.com](mailto:jim.edward@myskoolclub.com).
