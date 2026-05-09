# Table of Contents 📃

- [Standard commit message](#standard-commit-message-📦)
- [Before making a PR](#before-making-a-pr)


## Standard commit message 📦

This project is using the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) standard. Please follow these steps to ensure your commit messages are standardized:

- Commit messages should have this format:
  `<type>[optional scope]: <description>`
- Type must be one of the following:
  - **build**: Changes that affect the build system or external dependencies
  - **ci**: Changes to our CI configuration files and scripts
  - **docs**: Documentation only changes
  - **feat**: A new feature
  - **fix**: A bug fix
  - **perf**: A code change that improves performance
  - **chore**: A code change that neither fixes a bug nor adds a feature
  - **refactor**: A code change that improves code quality or makes it easier to maintain
  - **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
  - **test**: Adding missing tests or correcting existing tests
- Scope should be specified: `ui` or `api` or `global`.
- Description should be concise and in present imperative tense as mentioned [here](https://git.kernel.org/pub/scm/git/git.git/tree/Documentation/SubmittingPatches?h=v2.36.1#n181).
- Example1: `feat[ui]: add dark-mode`
- Example2: `feat[ui,api]: add searching courses functionality`

## Before making a PR

[Guide for making a PR](https://www.digitalocean.com/community/tutorials/how-to-create-a-pull-request-on-github)
