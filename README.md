
# Distributed Source Control System(Brancher)

This project implements a distributed source control system inspired by Git. I named it Brancher. It supports essential version control operations such as initializing a repository, staging and committing files, viewing commit history, creating branches, merging branches and performing diffs between them. Additionally, it allows the user to clone a repository and ignore files from being tracked.


## Features

Initialize a repository: Create a new repository in the current directory with a .brancher subdirectory for storing the repository data.

Stage files (git add): Add files to the staging area to prepare for commit.

Commit changes: Commit staged changes with a message and store them in the repository.

View commit history: Display the commit log, showing each commit's hash, timestamp, and message with the ability to navigate through the commit tree.

Branching: Create new branches and switch between branches.

Merging: Merge branches and display the diff between them, highlighting conflicting changes.

Diffing: View the differences between two branches, showing added, removed and modified lines.

Cloning: Clone a repository to a specified destination directory.

Ignore files: Exclude specific files from being tracked by the repository.


## Installation
Clone the repository and navigate to the project directory:
git clone (repository-url)
cd (project-directory)

Install dependencies:
npm install


## Usage
### Initialize a New Repository
To initialize a new repository in the current directory:
./Brancher.mjs init

### Add a File to the Staging Area
To stage a file for commit:
./Brancher.mjs add (file)

### Commit Changes
To commit staged changes with a message:
./Brancher.mjs commit "commit message"

### View Commit History
To view the commit history:
./Brancher.mjs log

### Show Commit Details
To view the details of a specific commit by its hash:
./Brancher.mjs show (commitHash)

### Create a New Branch
To create a new branch:
./Brancher.mjs branch (branchName)

### Switch Branches
To switch to an existing branch:
./Brancher.mjs switch (branchName)

### Merge Branches
To merge a branch into the current branch:
./Brancher.mjs merge (branchName)

### Diff Between Branches
To view the diff between the current branch and another branch:
./Brancher.mjs diff (branchName)

### Clone a Repository
To clone the repository to a specified destination:
./Brancher.mjs clone (destination)




## Design
### Initialization (init)
The repository is initialized in a .brancher subdirectory. Essential files like HEAD, refs and index are created if they do not exist, setting up the repository structure.

### Staging and Committing (add and commit)
Files are staged by reading their content, hashing them and storing the hashed data in the objects directory. Each commit contains metadata such as the timestamp, message, list of changed files and a reference to the parent commit.

### Commit History and Log (log and show)
Commits are linked in a chain and the history can be traversed by following parent commit references. The log command displays the commit hash, timestamp and commit message. The show command displays detailed information for a specific commit including the list of changed files.

### Branching and Merging (branch, switch, and merge)
Branches are created by storing a reference to the current commit. Switching branches updates the HEAD to point to the new branch. Merging checks if there are differences between branches and displays the diff but conflict resolution is not handled.

### Diffing (diff)
The diff command compares the content of files in the current branch and another branch highlighting additions, deletions and modifications.

### Cloning (clone)
The clone command copies the entire repository, including its objects and references, to a new directory.


## License
This project is licensed under the MIT License - see the LICENSE file for details.