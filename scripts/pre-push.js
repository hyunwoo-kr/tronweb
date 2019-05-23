const {execSync, spawn} = require('child_process')
const path = require('path')
const fs = require('fs')
const resultFile = path.resolve(__dirname, '../pre-push-result')

if (!process.env.SKIPPREPUSH) {

    const chalk = require('chalk')

    const branch = execSync('git name-rev --name-only HEAD').toString().split('\n')[0];
    let unpushed;

    try {
        unpushed = execSync(`git log origin/${branch}..${branch} --name-status`).toString().split('\n');
    } catch (ex) {
        // the branch hasn't ever been pushed
        unpushed = execSync(`git log HEAD...origin --name-status`).toString().split('\n');
    }

    let errors = false


    const build = spawn('yarn', ['build'])

    build.stdout.on('data', function (data) {
        process.stdout.write(data.toString())
    })

    build.stderr.on('data', function (data) {
        process.stdout.write(data.toString())
    })

    build.on('exit', function (code) {
        const test = spawn('yarn', ['test'])

        test.stdout.on('data', function (data) {
            process.stdout.write(data.toString())
        })

        test.stderr.on('data', function (data) {
            errors = true
            console.log('stderr: ' + data.toString())
        })

        test.on('exit', function (code) {
            if (errors) {
                console.log(chalk.red('Tests have failed. Please verify tests are passing before pushing'));
                process.exit(1);
            }
            if (fs.existsSync(resultFile)) {
                fs.unlinkSync(resultFile)
                execSync('git add -A && git commit --amend --no-edit && git pull --rebase')
            }
            process.exit(0);
        })
    })

} else {
    console.log('echo "Test skipped" >> ' + resultFile)
    fs.writeFileSync(resultFile, 'Test skipped.')
    execSync('git add -A && git commit --amend --no-edit && git pull --rebase')
    process.exit(0);
}
