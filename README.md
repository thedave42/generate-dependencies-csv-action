# generate-dependencies-csv-action

This action generates a csv file that contains a list of the depenencies, their version, and their license info for the dependencies detected by GitHub's Dependency Graph in each of the specified repos.  The csv file or files will be attached as an artifact to the action run at its conclusion.

![image](https://user-images.githubusercontent.com/50186003/110385625-06664900-8014-11eb-8f38-eda7789a797b.png)

The Action will query the GitHub GraphQL API for the manifest information detected by Depedency Graph.  The csv file contains the following information:

- packageName: The name of the package in the canonical form used by the package manager.
- packageVersion: The dependency version requirements.
- packageEcosystem: The dependency package manager. (e.g. npm, Maven, etc.)
- manifestOwner: The org/repo that contains the detected dependencies manifest.
- manifestFilename: The name of the manifest file that contains the dependency.
- packageLicenseName: The license full name specified by https://spdx.org/licenses.
- packageLicenseId: Short identifier specified by https://spdx.org/licenses.
- packgeLicenseUrl: URL to the license on https://choosealicense.com.
- packageHasDependencies: Indicates whether this package also has dependencies. (boolean)

## Inputs

### `repo-token`

REQUIRED: The GITHUB_TOKEN secret. Make sure this token has rights to all the repos you want to catalog.

### `repo-names`

REQUIRED: A comma separated list of repository names to catalog.

### `org-name`

The name of the owner/organization that contains the repositories (defaults to current repository owner).

### `depth`

The depth of transitive dependencies to report on.  Defaults to 0,  which will not include transitives (i.e. it will only list packages from manifests found in the repo).  Higher numbers will include transitive dependencies by including the manifests from the included packages' repos as well, but can significantly increase scan time.



## Example usage

    - name: Generate dependencies action
      uses: thedave42/generate-dependencies-csv-action@v5
      with:
        repo-token: ${{ secrets.YOUR_TOKEN }}
        org-name: thedave42
        repo-names: repo1,repo2,repo3
