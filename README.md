# generate-dependencies-csv-action

This action generates a csv file that contains a list of the depenencies detected for each of the specified repos.

## Inputs

### `repo-token`

REQUIRED: The GITHUB_TOKEN secret. Make sure this token has rights to all the repos you want to catalog.

### `org-name`

The name of the owner/organization that contains the repositories (defaults to current repository owner)

### `repo-names`

REQUIRED: A comma separated list of repository names to catalog.


## Example usage

    - name: Generate dependencies action
      uses: thedave42/generate-dependencies-csv-action@v2
      with:
        repo-token: ${{ secrets.YOUR_TOKEN }}
        org-name: thedave42
        repo-names: repo1,repo2,repo3