#!/usr/bin/env node
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { diffLines } from 'diff';
import chalk from 'chalk';
import { Command } from 'commander';

const program = new Command();

class Brancher {
    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.brancher');
        this.objectsPath = path.join(this.repoPath, 'objects'); // .brancher/objects
        this.headPath = path.join(this.repoPath, 'HEAD'); // .brancher/HEAD
        this.indexPath = path.join(this.repoPath, 'index'); // .brancher/index
        this.refsPath = path.join(this.repoPath, 'refs'); // .brancher/refs
        this.init();
    }

    async init() {
        await fs.mkdir(this.objectsPath, { recursive: true });
        await fs.mkdir(this.refsPath, { recursive: true });
        try {
            await fs.writeFile(this.headPath, 'refs/main', { flag: 'wx' });
            await fs.writeFile(path.join(this.refsPath, 'main'), '', { flag: 'wx' });
            await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: 'wx' });
            console.log('Initialized a new repository.');
        } catch {
            console.log('Repository already initialized.');
        }
    }

    hashObject(content) {
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded) {
        const fileData = await fs.readFile(fileToBeAdded, 'utf-8');
        const fileHash = this.hashObject(fileData);

        const newFileHashedObjectPath = path.join(this.objectsPath, fileHash);
        await fs.writeFile(newFileHashedObjectPath, fileData);
        await this.updateStagingArea(fileToBeAdded, fileHash);
        console.log(`Added ${fileToBeAdded}`);
    }

    async updateStagingArea(filePath, fileHash) {
        const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
        index.push({ path: filePath, hash: fileHash });
        await fs.writeFile(this.indexPath, JSON.stringify(index));
    }

    async commit(message) {
        const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            timeStamp: new Date().toISOString(),
            message,
            files: index,
            parent: parentCommit,
        };

        const commitHash = this.hashObject(JSON.stringify(commitData));
        const commitPath = path.join(this.objectsPath, commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));
        await this.updateCurrentBranch(commitHash);
        await fs.writeFile(this.indexPath, JSON.stringify([]));
        console.log(`Commit successfully created: ${commitHash}`);
    }

    async getFileContent(hash) {
        const filePath = path.join(this.objectsPath, hash);
        if (!(await this.exists(filePath))) {
            throw new Error(`File with hash ${hash} does not exist.`);
        }
        return await fs.readFile(filePath, 'utf-8');
    }
    

    async getCurrentHead() {
        const branch = await fs.readFile(this.headPath, 'utf-8');
        return branch ? await fs.readFile(path.join(this.repoPath, branch), 'utf-8') : null;
    }

    async updateCurrentBranch(commitHash) {
        const branch = await fs.readFile(this.headPath, 'utf-8');
        await fs.writeFile(path.join(this.repoPath, branch), commitHash);
    }

    async log() {
        let currentCommitHash = await this.getCurrentHead();
        while (currentCommitHash) {
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), 'utf-8'));
            console.log('--------------------\n');
            console.log(`Commit: ${currentCommitHash}\nDate: ${commitData.timeStamp}\n\n${commitData.message}\n\n`);
            currentCommitHash = commitData.parent;
        }
    }

    async branch(branchName) {
        const currentHead = await this.getCurrentHead();
        const branchPath = path.join(this.refsPath, branchName);
        await fs.writeFile(branchPath, currentHead || '');
        console.log(`Branch ${branchName} created.`);
    }

    async switch(branchName) {
        const branchPath = path.join(this.refsPath, branchName);
        if (!(await this.exists(branchPath))) {
            console.log(`Branch ${branchName} does not exist.`);
            return;
        }
        await fs.writeFile(this.headPath, `refs/${branchName}`);
        console.log(`Switched to branch ${branchName}`);
    }

    async merge(branchName) {
        const targetBranchPath = path.join(this.refsPath, branchName);
        if (!(await this.exists(targetBranchPath))) {
            console.log(`Branch ${branchName} does not exist.`);
            return;
        }

        const targetCommitHash = await fs.readFile(targetBranchPath, 'utf-8');
        const currentCommitHash = await this.getCurrentHead();

        if (!currentCommitHash || !targetCommitHash) {
            console.log('Nothing to merge.');
            return;
        }

        if (currentCommitHash === targetCommitHash) {
            console.log('Branches are already up-to-date.');
            return;
        }

        console.log(`Merged ${branchName} into the current branch.`);
    }

    async diff(branchName) {
        const targetBranchPath = path.join(this.refsPath, branchName);
        if (!(await this.exists(targetBranchPath))) {
            console.log(`Branch ${branchName} does not exist.`);
            return;
        }

        const targetCommitHash = await fs.readFile(targetBranchPath, 'utf-8');
        const currentCommitHash = await this.getCurrentHead();

        if (!currentCommitHash || !targetCommitHash) {
            console.log('Nothing to diff.');
            return;
        }

        const currentCommitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), 'utf-8'));
        const targetCommitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, targetCommitHash), 'utf-8'));

        for (const currentFile of currentCommitData.files) {
            const targetFile = targetCommitData.files.find(file => file.path === currentFile.path);

            if (!targetFile) {
                console.log(`File ${currentFile.path} is new in the current branch.`);
                continue;
            }

            const currentContent = await this.getFileContent(currentFile.hash);
            const targetContent = await this.getFileContent(targetFile.hash);

            console.log(`Diff for file ${currentFile.path}:`);
            const diff = diffLines(targetContent, currentContent);
            diff.forEach(part => {
                if (part.added) process.stdout.write(chalk.green(part.value));
                else if (part.removed) process.stdout.write(chalk.red(part.value));
                else process.stdout.write(part.value);
            });
            console.log();
        }
    }

    async clone(destination) {
        await fs.mkdir(destination, { recursive: true });
        await fs.cp(this.repoPath, destination, { recursive: true });
        console.log(`Cloned repository to ${destination}`);
    }

    async exists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

program.command('init').action(async () => {
    const brancher = new Brancher();
});

program.command('add <file>').action(async file => {
    const brancher = new Brancher();
    await brancher.add(file);
});

program.command('commit <message>').action(async message => {
    const brancher = new Brancher();
    await brancher.commit(message);
});

program.command('log').action(async () => {
    const brancher = new Brancher();
    await brancher.log();
});

program.command('show <commitHash>').action(async commitHash => {
    const brancher = new Brancher();
    try {
        const commitPath = path.join(brancher.objectsPath, commitHash);
        if (!(await brancher.exists(commitPath))) {
            console.log(`Commit ${commitHash} does not exist.`);
            return;
        }

        const commitData = JSON.parse(await fs.readFile(commitPath, 'utf-8'));
        console.log(`Commit: ${commitHash}`);
        console.log(`Date: ${commitData.timeStamp}`);
        console.log(`Message: ${commitData.message}`);
        console.log('\nChanged Files:');
        commitData.files.forEach(file => {
            console.log(`- ${file.path}`);
        });
    } catch (error) {
        console.error(`Error displaying commit: ${error.message}`);
    }
});

program.command('branch <branchName>').action(async branchName => {
    const brancher = new Brancher();
    await brancher.branch(branchName);
});

program.command('switch <branchName>').action(async branchName => {
    const brancher = new Brancher();
    await brancher.switch(branchName);
});

program.command('merge <branchName>').action(async branchName => {
    const brancher = new Brancher();
    await brancher.merge(branchName);
});

program.command('diff <branchName>').action(async branchName => {
    const brancher = new Brancher();
    await brancher.diff(branchName);
});

program.command('clone <destination>').action(async destination => {
    const brancher = new Brancher();
    await brancher.clone(destination);
});

program.parse(process.argv);
