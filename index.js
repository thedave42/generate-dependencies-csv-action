const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const repoToken = core.getInput('repo-token');
const org_name = core.getInput('org-name');
const repos = core.getInput('repo-names');

const repoNames = repos.split(',');

const artifact = require('@actions/artifact');
const artifactClient = artifact.create();
const artifactName = `dependency-lists`;
let files = [];
let fileLines = [];
let pagination = null;
let checkedRepos = [];
let indent = [];
let firstIndent = false;
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

const findDeps = async (org, repo) => {
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
				filename
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
	let hasNextPage = false;
	do {
		console.log(`${indent.join('')}${org}/${repo}: Finding dependencies...`);
		//console.log(checkedRepos);

		if (checkedRepos.find(check => check.org == org && check.name == repo) != undefined) { // We've already checked this repo
			console.log(`${indent.join('')}${org}/${repo}: Already checked.`)
			return;
		}

		let getDepsResult = null;
		try {
			getDepsResult = await graphql({ query, org: org, repo: repo, cursor: pagination });
		}
		catch (e) {
			console.log(`${indent.join('')}${org}/${repo}: GraphQL query failed: ${e.message}`);
			//console.log(e);
			return;
		}

		checkedRepos.push({
			"org": org,
			"name": repo
		});

		//console.log('getDepsResult');
		//console.log(getDepsResult);

		hasNextPage = getDepsResult.repository.dependencyGraphManifests.pageInfo.hasNextPage;
		const repoDependencies = getDepsResult.repository.dependencyGraphManifests.nodes;

		//console.log('hasNextPage');
		//console.log(hasNextPage);

		for (const repoDependency of repoDependencies) {
			//console.log('repoDependency');
			//console.log(repoDependency);
			console.log(`${indent.join('')}${org}/${repo}: ${repoDependency.dependenciesCount} dependencies found in ${repoDependency.filename}.`)
			for (const dep of repoDependency.dependencies.nodes) {
				console.log(`${indent.join('')}${org}/${repo}: Adding ${dep.packageName}`);
				fileLines.push(`${org},${repo},${dep.packageManager},${dep.packageName},${dep.requirements},${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.name : ''},${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.spdxId : ''},${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.url : ''},${dep.hasDependencies}\n`);
				if (dep.hasDependencies && dep.repository != undefined) {
					try {
						console.log(`${indent.join('')}${org}/${repo}: ${dep.packageName} also has dependencies.  Looking up ${dep.repository.owner.login}/${dep.repository.name}...`);
						(firstIndent) ? indent.unshift('|___ ') : indent.unshift('');
						firstIndent = false;
						await findDeps(dep.repository.owner.login, dep.repository.name);
						//indent.shift();
					}
					catch (e) {
						console.log(`${indent.join('')}${org}/${repo}: Recusion request failed: ${e.message}`);
						console.log(e);
						//indent.shift();
					}
				}
			}
		}

		if (hasNextPage) {
			console.log('nextpage');
			pagination = getDepsResult.repository.dependencyGraphManifests.pageInfo.endCursor;
		}

	} while (hasNextPage);
}



DumpDependencies();

async function DumpDependencies() {
	for (const repo of repoNames) {
		//Begin get depencies for one repo
		firstIndent = true;
		indent = [];
		try {
			const outfile = `./${org_name}-${repo}-dependency-list.csv`;
			console.log(`${indent.join('')}${org_name}/${repo}: Saving dependencies to ${outfile}...`);
			checkedRepos = [];
			files.push(outfile);
			fileLines = ["org,repo,ecosystem,packageName,version,license name,license id,license url,hasDependencies"];
			await findDeps(org_name, repo);
			fs.writeFileSync(outfile, fileLines.join('\n'));
			console.log(`Saved ${outfile}`);
			// End get dependencies for one repo
		} catch (error) {
			console.log(`${indent.join('')}${org_name}/${repo}: Request failed:`, error.message);
			//console.log(error.message);
			//console.log(error);
		}
	}
	const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
}
