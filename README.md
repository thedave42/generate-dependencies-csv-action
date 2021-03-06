# generate-dependencies-csv-action

This action generates a csv file that contains a list of the depenencies detected in the specified repo.

## Inputs

### `repo-token`

The GITHUB_TOKEN secret.  Will default to the GITHUB_TOKEN for the repository the workflow is run from.  Not required.

### `repo-name`

The name of the repo to list dependencies from.  Will default to the repository the workflow is run from.  Not required.


## Example usage

    - name: Generate dependencies action
      uses: thedave42/generate-dependencies-csv-action@v1.0