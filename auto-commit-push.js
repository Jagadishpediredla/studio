const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

async function autoCommitPush() {
  try {
    // Check if there are any changes
    const { stdout: status } = await execPromise('git status --porcelain');
    
    if (status.trim() === '') {
      console.log('No changes to commit.');
      return;
    }
    
    // Add all changes
    await execPromise('git add .');
    console.log('Added all changes.');
    
    // Create commit message with timestamp
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const commitMessage = `Auto commit: Changes pushed at ${timestamp}`;
    
    // Commit changes
    await execPromise(`git commit -m "${commitMessage}"`);
    console.log(`Committed changes: ${commitMessage}`);
    
    // Push to remote repository
    await execPromise('git push origin main');
    console.log('Pushed changes to remote repository.');
    
  } catch (error) {
    console.error('Error during auto commit and push:', error.message);
  }
}

// Run the function
autoCommitPush();