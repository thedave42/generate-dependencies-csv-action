const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const repoToken = core.getInput('repo-token');
const org = core.getInput('org-name');
const repos = core.getInput('repo-names');

const repoNames = repos.split(',');

const artifact = require('@actions/artifact');
const artifactClient = artifact.create();
const artifactName = `dependency-lists`;
const files = [
  '*'
];
const rootDirectory = '.'; // Also possible to use __dirname
const options = {
  continueOnError: false
};


let { graphql } = require('@octokit/graphql')
graphql = graphql.defaults({
  headers: {
    authorization: `token ${repoToken}`,
    Accept: 'application/vnd.github.hawkgirl-preview+json'
  }
});

DumpDependencies();

async function DumpDependencies() {

  for (const repo of repoNames) {
    //Begin get depencies for one repo
    let pagination = null;
    const query =
      `query ($org: String! $repo: String! $cursor: String){
      repository(owner: $org name: $repo) {
        name
        dependencyGraphManifests(first: 100 after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          
          nodes {
            dependenciesCount
            dependencies {
              nodes {
                packageManager
                packageName
                requirements
                hasDependencies
              }
            }
          }
        }
      }
    }`;

    try {
      const outfile = `./${org}-${repo}-dependency-list.csv`;
      fs.writeFileSync(outfile, "org,repo,ecosystem,packageName,version,hasDependencies\n");
      let hasNextPage = false;
      do {
        const getDepsResult = await graphql({ query, org: org, repo: repo, cursor: pagination });

        hasNextPage = getDepsResult.repository.dependencyGraphManifests.pageInfo.hasNextPage;
        const repoDependencies = getDepsResult.repository.dependencyGraphManifests.nodes;


        for (const repoDependency of repoDependencies) {
          for (const dep of repoDependency.dependencies.nodes) {
            fs.appendFileSync(outfile, `${org},${repo},${dep.packageManager},${dep.packageName},${dep.requirements},${dep.hasDependencies}\n`);
          }
        }

        if (hasNextPage) {
          pagination = getVulnResult.repository.vulnerabilityAlerts.pageInfo.endCursor;
        }
      } while (hasNextPage);
      // End get dependencies for one repo
    } catch (error) {
      console.log('Request failed:', error.request);
      console.log(error.message);
    }
  }
  const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
}
