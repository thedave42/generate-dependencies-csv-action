const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const repoToken = core.getInput('repo-token');
const org_name = core.getInput('org-name');
const repos = core.getInput('repo-names');
const trans_depth = parseInt(core.getInput('depth'));

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
let depth = 0;
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
			return;
		}

		checkedRepos.push({
			"org": org,
			"name": repo
		});

		hasNextPage = getDepsResult.repository.dependencyGraphManifests.pageInfo.hasNextPage;
		const repoDependencies = getDepsResult.repository.dependencyGraphManifests.nodes;

		for (const repoDependency of repoDependencies) {
			console.log(`${indent.join('')}${org}/${repo}: ${repoDependency.dependenciesCount} dependencies found in ${repoDependency.filename}.`)
			for (const dep of repoDependency.dependencies.nodes) {
				console.log(`${indent.join('')}${org}/${repo} [${depth}]: Adding ${dep.packageName}`);
				fileLines.push(`${dep.packageName}\t${dep.requirements}\t${dep.packageManager}\t${repoDependency.filename}\t${org}/${repo}\t${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.name : ''}\t${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.spdxId : ''}\t${(dep.repository != undefined && dep.repository.licenseInfo != undefined) ? dep.repository.licenseInfo.url : ''}\t${dep.hasDependencies}`);
				if (dep.hasDependencies && dep.repository != undefined && depth < trans_depth) {
					try {
						console.log(`${indent.join('')}${org}/${repo}: ${dep.packageName} also has dependencies.  Looking up ${dep.repository.owner.login}/${dep.repository.name}...`);
						if (firstIndent) {
							indent.unshift(`|__[${depth}]: `);
						}
						else {
							//indent.shift();
							indent.unshift(`  `);
							indent.pop();
							indent.push(`|__[${depth}]: `);
						}
						depth++;
						firstIndent = false;
						await findDeps(dep.repository.owner.login, dep.repository.name);
						indent.shift();
						depth--;
					}
					catch (e) {
						console.log(`${indent.join('')}${org}/${repo}: Recusion request failed: ${e.message}`);
						console.log(e);
						depth--;
						indent.shift();
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
	console.log(`############################################# header-row-fix ######################################################`)
	for (const repo of repoNames) {
		//Begin get depencies for one repo
		firstIndent = true;
		indent = [];
		depth = 0;
		try {
			const outfile = `./${org_name}-${repo}-dependency-list.csv`;
			console.log(`${indent.join('')}${org_name}/${repo}: Saving dependencies to ${outfile}...`);
			checkedRepos = [];
			files.push(outfile);
			fileLines = [];
			headerRow = "packageName\tpackageVersion\tpackageEcosystem\tmanifestFilename\tmanifestOwner\tpackageLicenseName\tpackageLicenseId\tpackgeLicenseUrl\tpackageHasDependencies";
			await findDeps(org_name, repo);
			let sorted = fileLines.sort((a, b) => {
				let packageA = a.split('\t')[4]; // manifest
				let packageB = b.split('\t')[4];

				if (packageA > packageB) {
					return 1;
				}
				else if (packageA < packageB) {
					return -1;
				}
				else {
					return 0;
				}
				});

			fs.writeFileSync(outfile, [headerRow, ...sorted].join('\n'));
			console.log(`${indent.join('')}${org_name}/${repo}: ${fileLines.length-2} items saved to ${outfile}`);
			// End get dependencies for one repo
		} catch (error) {
			console.log(`${indent.join('')}${org_name}/${repo}: Request failed:`, error.message);
		}
	}
	const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
}
