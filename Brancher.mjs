import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
// import { timeStamp } from 'console';

class Brancher{

    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.brancher');
        this.objetcsPath = path.join(this.repoPath, 'objects'); // .brancher/objetcs
        this.headPath = path.join(this.repoPath, 'HEAD'); // .brancher/HEAD
        this.indexPath = path.join(this.repoPath, 'index');
        this.init(); // .brancher/index
    }

    async init() {
        await fs.mkdir(this.objetcsPath, {recursive: true});
        try {
            await fs.writeFile(this.headPath, '', {flag: 'wx'});  // wx: open for writing. fails if file exists
            await fs.writeFile(this.indexPath, JSON.stringify([]), {flag: 'wx'});
        } catch(error) {
            console.log("Already initialised the .brancher folder");
        }
    }

    hashObject(content) {
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded) {
        // fileToBeAdded: path/to/file
        const fileData = await fs.readFile(fileToBeAdded, { encoding: 'utf-8' }); // read the file
        const fileHash = this.hashObject(fileData); // hash the file
        console.log(fileHash); 
        const newFileHashedObjetcPath = path.join(this.objetcsPath, fileHash); // .brancher/objects/abc123
        await fs.writeFile(newFileHashedObjetcPath, fileData);
        await this.updateStagingArea(fileToBeAdded, fileHash);
        console.log(`Added ${fileToBeAdded}`);
    }

    async updateStagingArea(filePath, fileHash) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' })); //read the index file
        index.push({ path: filePath, hash: fileHash }); // add the file to the index
        await fs.writeFile(this.indexPath, JSON.stringify(index)); // write the updated index file

    }

    async commit (message) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            timeStamp: new Date().toISOString(),
            message,
            files: index,
            parent: parentCommit
        };

        const commitHash = this.hashObject(JSON.stringify(commitData));
        const commitPath = path.join(this.objetcsPath, commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));
        await fs.writeFile(this.headPath, commitHash); // update the HEAD to point to the new commit
        await fs.writeFile(this.indexPath, JSON.stringify([])); // clear the staging area
        console.log(`Commit successfully created: ${commitHash}`);

    }

    async getCurrentHead() {
        try {
            return await fs.readFile(this.headPath, { encoding: 'utf-8' });
        } catch(error) {
            return null;
        }
            
        
    }
}
(async () => {
    const brancher = new Brancher();
    await brancher.add('sample.txt');
    await brancher.commit('initial commit');
})();
