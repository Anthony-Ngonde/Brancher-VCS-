import path from 'path'

class Brancher{

    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.brancher');
    }
}