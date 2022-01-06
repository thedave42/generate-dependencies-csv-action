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
let files = [];
let fileLines = [];
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

const findDeps = async (query, org, repo, outfile, fileLines) => {
	let pagination = null;
	let hasNextPage = false;
	do {
		const getDepsResult = await graphql({ query, org: org, repo: repo, cursor: pagination });

		hasNextPage = getDepsResult.repository.dependencyGraphManifests.pageInfo.hasNextPage;
		const repoDependencies = getDepsResult.repository.dependencyGraphManifests.nodes;

		console.log(`Finding dependencies for ${org}/${repo}...`);

		for (const repoDependency of repoDependencies) {
			for (const dep of repoDependency.dependencies.nodes) {
				fileLines.push(`${org},${repo},${dep.packageManager},${dep.packageName},${dep.requirements},${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.name : ''},${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.spdxId : ''},${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.url : ''},${dep.hasDependencies}\n`);
				if (dep.hasDependencies && dep.repository != undefined) {
					await findDeps(query, dep.repository.owner.login, dep.repository.name, pagination, outfile, fileLines);
				}
			}
		}

		if (hasNextPage) {
			pagination = getDepsResult.repository.dependencyGraphManifests.pageInfo.endCursor;
		}
	} while (hasNextPage);
}



DumpDependencies();

async function DumpDependencies() {

	for (const repo of repoNames) {
		//Begin get depencies for one repo
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
							repository {
								name
								owner {
									login
								}
								licenseInfo {
									name
									spdxId
									url
								}
							}
						}
						}
					}
					}
				}
    		}`
			;

		try {
			const outfile = `./${org}-${repo}-dependency-list.csv`;
			files.push(outfile);
			fileLines = ["org,repo,ecosystem,packageName,version,license name,license id,license url,hasDependencies"];
			await findDeps(query, org, repo, outfile, fileLines);
			fs.writeFileSync(outfile, fileLines.join('\n'));
			console.log(`Saved ${outfile}`);
			// End get dependencies for one repo
		} catch (error) {
			console.log('Request failed:', error.request);
			console.log(error.message);
			console.log(JSON.stringify(error, 2, 4));
		}
	}
	const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
}
