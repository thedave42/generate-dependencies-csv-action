const core = require('@actions/core');
const github = require('@actions/github');

const graphql = github.graphql;
graphql = graphql.defaults({
  headers: {
    authorization: `token ${repoToken}`,
    Accept: 'application/vnd.github.hawkgirl-preview+json'
  }
})

try {
  // `who-to-greet` input defined in action metadata file
  const repoToken = core.getInput('repo-token');
  const repoName = core.getInput('repo-name');
  
  //console.log(`repoName is ${repoName}`);
  core.setOutput("repo", 'Test data');
  // Get the JSON webhook payload for the event that triggered the workflow
  //const payload = JSON.stringify(github.context.payload, undefined, 2)
  //console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
