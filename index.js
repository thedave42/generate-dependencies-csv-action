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

    core.setCommandEcho(true);

    core.setOutput('repo', repoName);

    console.log('repo name is', repoName);

} catch (error) {
    core.setFailed(error.message);
}
