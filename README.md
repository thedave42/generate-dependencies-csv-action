# generate-dependencies-csv-action

This action generates a csv file that contains a list of the depenencies detected in the specified repo.  The csv file will be available as a artifact from the action run.

![image](https://user-images.githubusercontent.com/50186003/110189478-0c6de700-7dd4-11eb-92d7-7a4d5931fb6a.png)

## Inputs

### `repo-token`

The GITHUB_TOKEN secret.  Will default to the GITHUB_TOKEN for the repository the workflow is run from.  Not required.

### `repo-name`

The name of the repo to list dependencies from.  Will default to the repository the workflow is run from.  Not required.


## Example usage

    - name: Generate dependencies action
      uses: thedave42/generate-dependencies-csv-action@v1.0
