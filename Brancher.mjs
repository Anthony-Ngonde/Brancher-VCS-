import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { diffLines } from 'diff';
import chalk from "chalk"


class Brancher {
    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.brancher');
        this.objectsPath = path.join(this.repoPath, 'objects'); // .brancher/objects
        this.headPath = path.join(this.repoPath, 'HEAD'); // .brancher/HEAD
        this.indexPath = path.join(this.repoPath, 'index'); // .brancher/index
        this.init();
    }

    async init() {
        await fs.mkdir(this.objectsPath, { recursive: true });
        try {
            await fs.writeFile(this.headPath, '', { flag: 'wx' }); // wx: fails if file exists
            await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: 'wx' });
        } catch {
            console.log('Already initialized the .brancher folder');
        }
    }

    hashObject(content) {
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded) {
        const fileData = await fs.readFile(fileToBeAdded, { encoding: 'utf-8' });
        const fileHash = this.hashObject(fileData);
        console.log(fileHash);

        const newFileHashedObjectPath = path.join(this.objectsPath, fileHash);
        await fs.writeFile(newFileHashedObjectPath, fileData);
        await this.updateStagingArea(fileToBeAdded, fileHash);
        console.log(`Added ${fileToBeAdded}`);
    }

    async updateStagingArea(filePath, fileHash) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
        index.push({ path: filePath, hash: fileHash });
        await fs.writeFile(this.indexPath, JSON.stringify(index));
    }

    async commit(message) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
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
        await fs.writeFile(this.headPath, commitHash);
        await fs.writeFile(this.indexPath, JSON.stringify([]));
        console.log(`Commit successfully created: ${commitHash}`);
    }

    async getCurrentHead() {
        try {
            return await fs.readFile(this.headPath, { encoding: 'utf-8' });
        } catch {
            return null;
        }
    }

    async log() {
        let currentCommitHash = await this.getCurrentHead();
        while (currentCommitHash) {
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), { encoding: 'utf-8' }));
            console.log('--------------------\n');
            console.log(`Commit: ${currentCommitHash}\nDate: ${commitData.timeStamp}\n\n${commitData.message}\n\n`);
            currentCommitHash = commitData.parent;
        }
    }

    async showCommitDiff(commitHash) {
        const commitData = JSON.parse(await this.getCommitData(commitHash));
        if (!commitData) {
            console.log('Commit not found');
            return;
        }
        console.log('Changes in the last commit are:');

        for (const file of commitData.files) {
            console.log(`File: ${file.path}`);
            const fileContent = await this.getFileContent(file.hash);
            console.log(fileContent);

            if (commitData.parent) {
                const parentCommitData = JSON.parse(await this.getCommitData(commitData.parent));
                const parentFileContent = await this.getParentFileContent(parentCommitData, file.path);

                if (parentFileContent !== undefined) {
                    console.log('\nDiff:');
                    const diff = diffLines(parentFileContent, fileContent);

                    diff.forEach(part => {
                        if (part.added) {
                            process.stdout.write(chalk.green(part.value));
                        } else if (part.removed) {
                            process.stdout.write(chalk.red(part.value));
                        } else {
                            process.stdout.write(chalk.grey(part.value));
                        }
                    });
                    console.log(); // new line
                } else {
                    console.log('New file in this commit');
                }
            } else {
                console.log('First commit');
            }
        }
    }

    async getParentFileContent(parentCommitData, filePath) {
        const parentFile = parentCommitData.files.find(file => file.path === filePath);
        if (parentFile) {
            return await this.getFileContent(parentFile.hash);
        }
        return undefined;
    }

    async getCommitData(commitHash) {
        const commitPath = path.join(this.objectsPath, commitHash);
        try {
            return await fs.readFile(commitPath, { encoding: 'utf-8' });
        } catch (error) {
            console.log('Failed to read the commit data', error);
            return null;
        }
    }

    async getFileContent(fileHash) {
        const objectPath = path.join(this.objectsPath, fileHash);
        return fs.readFile(objectPath, { encoding: 'utf-8' });
    }
}

(async () => {
    const brancher = new Brancher();
    // Example usage:
    // await brancher.add('sample.txt');
    // await brancher.commit('Third commit');
    // await brancher.log();
    await brancher.showCommitDiff('b535f3fc46973dfdeeb9ad2e024668a795820a23');
})();