import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'

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
        // One step missing: Add the file to staging area
        console.log(`Added ${fileToBeAdded}`);
    }
}

const brancher = new Brancher();
brancher.add('sample.txt')