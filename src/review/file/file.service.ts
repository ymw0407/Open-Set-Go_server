import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

@Injectable()
export class FileService {
  pr = async (
    githubAccessToken: string,
    owner: string,
    repo: string,
    content: string,
  ): Promise<string> => {
    const octokit = new Octokit({ auth: githubAccessToken });
    const files: file[] = [
      { path: '.github/pull_request_template.md', content },
    ];
    return await this.createPR(
      octokit,
      owner,
      repo,
      `Open-Set-Go/Pull-Request_template/${Date.now()}`,
      files,
      'Pull-Request Template generated by Open-Set-Go 🚀',
    );
  };

  issue = async (
    githubAccessToken: string,
    owner: string,
    repo: string,
    issueFiles: issueFile[],
  ): Promise<string> => {
    const octokit = new Octokit({ auth: githubAccessToken });
    const files: file[] = [];

    // parsing issueFiles to files
    for await (const issueFile of issueFiles) {
      files.push({
        path: `.github/ISSUE_TEMPLATE/${issueFile.category}.yml`,
        content: issueFile.content,
      });
    }

    return await this.createPR(
      octokit,
      owner,
      repo,
      `Open-Set-Go/Issue/${Date.now()}`,
      files,
      'Issue Template generated by Open-Set-Go 🚀',
    );
  };

  contributing = async (
    githubAccessToken: string,
    owner: string,
    repo: string,
    content: string,
  ): Promise<string> => {
    const octokit = new Octokit({ auth: githubAccessToken });
    const files: file[] = [{ path: 'CONTRIBUTING.md', content }];
    return await this.createPR(
      octokit,
      owner,
      repo,
      `Open-Set-Go/CONTRIBUTING/${Date.now()}`,
      files,
      'CONTRIBUTING.md generated by Open-Set-Go 🚀',
    );
  };

  readme = async (
    githubAccessToken: string,
    owner: string,
    repo: string,
    content: string,
  ): Promise<string> => {
    const octokit = new Octokit({ auth: githubAccessToken });
    const files: file[] = [{ path: 'README.md', content }];
    return await this.createPR(
      octokit,
      owner,
      repo,
      `Open-Set-Go/README/${Date.now()}`,
      files,
      'README.md generated by Open-Set-Go 🚀',
    );
  };

  createPR = async (
    octokit: Octokit,
    owner: string,
    repo: string,
    newBranchName: string,
    files: file[],
    message: string,
  ): Promise<string> => {
    const repoData = await octokit.repos.get({ owner, repo });
    const baseBranchName = repoData.data.default_branch;

    // Get baseBranch
    const baseBranch = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: baseBranchName,
    });

    // create newBranch from baseBranch
    const newBranch = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha: baseBranch.data.commit.sha,
    });

    // createTree from newBranch based on newBranch's tree
    const newTree = await octokit.git.createTree({
      owner,
      repo,
      base_tree: newBranch.data.object.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        content: file.content,
      })),
    });

    // create new commit based on newTree
    const newCommit = await octokit.git.createCommit({
      owner,
      repo,
      message,
      author: {
        name: 'Open-Set-Go',
        email: 'opensetgo.oss@gmail.com',
      },
      tree: newTree.data.sha,
      parents: [newBranch.data.object.sha],
    });

    // push commits to newBranch
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${newBranchName}`,
      sha: newCommit.data.sha,
    });

    // create Pull Request
    const pullRequest = await octokit.pulls.create({
      owner,
      repo,
      title: message,
      body: '<p align="center"><a href="https://www.open-set-go.com" target="blank"><img src="https://github.com/AgainIoT/Open-Set-Go/raw/main/.github/images/Open-Set-Go.png" width="200" alt="Open-Set-Go Logo" /></a></p>\n\nThis Pull-Request generated by [Open-Set-Go](https://www.open-set-go.com) 🚀\n_For more information, visit our [site](https://www.open-set-go.com) & [docs](https://docs.open-set-go.com)_',
      head: newBranchName,
      base: baseBranchName,
      maintainer_can_modify: true,
    });

    return pullRequest.data.html_url;
  };
}

type file = { path: string; content: string };
export type issueFile = { category: string; content: string };
