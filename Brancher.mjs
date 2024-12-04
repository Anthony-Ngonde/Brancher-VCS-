import path from 'path'
import fs from 'fs/promises'

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
}

const brancher = new Brancher();