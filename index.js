#!/usr/bin/env node

import chalk from "chalk";
import inquirer from "inquirer";
import gradient from 'gradient-string';
import chalkAnimation from 'chalk-animation';
import figlet from "figlet";
import { createSpinner } from "nanospinner";
import { readdir, readFileSync } from 'fs';

let workingFilesArray = [];
let filetypesArray = [];
let validationsArray = [];
let filepath = '';
let filedata = '';
let succesfulTests = 0;
let testNo = 0;
let testCount = 0;
let successfulFileCheck = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function welcome() {
    const welcome = chalkAnimation.pulse(
        figlet.textSync("NACHA IAT CHECK 3000")
    );

    await sleep(5000);
    console.log(`${chalk.bgBlue('Which type of file do you want to check?')}`);
}

async function askForFileType() {
    const answers = await inquirer.prompt([
        {
            type: "list",
            name: "fileType",
            message: "What type of file do you want to check?",
            choices: filetypesArray
        }]);

    const choosen_type = chalk.bgGreen(answers.fileType);
    if (answers.fileType === 'Exit') {
        return handleAnswer(false, ``);
    } else {
        if (answers.fileType === 'NACHA') {
            return handleAnswer(answers.fileType === 'NACHA', `Ok, let\'s check ${choosen_type} files!`);
        } else {
            return handleAnswer(false, `Sorry, we don't support ${choosen_type} files yet!`);
        }
    }
}

async function askForFilePath() {
    const answers = await inquirer.prompt([
        {
            type: "list",
            name: "filePath",
            message: "Which file do you want to work with?",
            choices: workingFilesArray
        }]);

    filepath = 'files/' + answers.filePath;
    const choosen_file = chalk.bgGreen(answers.filePath);
    return handleAnswer(true, `Ok, let's check ${choosen_file} file!`);
}

async function readContentFile() {
    const spinner = createSpinner('Reading file...\n').start();
    await sleep(250);

    try {
        filedata = readFileSync(filepath, 'utf8');
        spinner.success({ text: 'File read successfully!' });
    } catch (err) {
        console.error(err);
        spinner.error({ text: 'Error reading file!' });
        process.exit(1);
    }

    return handleAnswer(true, `Ok, let's check the file validations!`);
}

async function readValidations() {
    const validations = readFileSync('config/nacha.json', 'utf8');
    const validationsFile = JSON.parse(validations);
    validationsArray = validationsFile.validations;
    if (validationsArray.length > 0) {
        testCount = validationsArray.length;
        return handleAnswer(true, `There are ${testCount} tests to check!`);
    } else {
        await sleep(250);
        return handleAnswer(false, `No tests found!`);
    }    
}

async function executeValidations() {
    for (let i = 0; i < validationsArray.length; i++) {
        const validation = validationsArray[i];
        await checkCoordinate(validation.line, validation.positionStart, validation.length, validation.expectedValue, validation.message);
    }
}

async function checkCoordinate(line, positionStart, length, expectedValue, message) {
    const spinner = createSpinner(`${message}\n`).start();
    await sleep(250);

    testNo++;

    if (filedata.length > 0) {
        const record = filedata.split(/\r?\n/)[line - 1];
        const character = record.substring(positionStart - 1, (positionStart - 1)+ length);
        if (character === expectedValue) {
            spinner.success({ text: `Validation (${testNo}/${testCount}) passed successfully! ✅` });
            succesfulTests++;
        } else {
            successfulFileCheck = false;
            spinner.error({ text: `Validation failed for Value->${character}:Expected->${expectedValue} \nIn line->${line + 1}\nRange->${positionStart + 1}:${positionStart + length + 1}!` });
        }
    } else {
        successfulFileCheck = false;
        spinner.error({ text: 'Empty file!' });
    }
}

async function handleAnswer(isContinue, message) {
    const spinner = createSpinner('Checking...').start();
    await sleep(250);

    if (isContinue) {
        spinner.success({ text: message });
    } else {
        spinner.error({ text: message });
        spinner.error({ text: `Ok shutting down... 💀💀💀 ${chalk.red('Bye!')}` });
        process.exit(0);
    }
}

async function fileCheck() {
    if (successfulFileCheck) {
        await sleep(250);

        figlet(`\nNice job!\n`, (err, data) => {
            console.log(gradient.mind.multiline(data) + '\n');

            console.log(
                chalk.green(
                    `Test completion rate: ${testCount}/${testCount} (100%)`
                )
            );
            process.exit(0);
        });
    } else {
        await sleep(250);

        figlet(`\nOops!\n`, (err, data) => {
            console.log(gradient.morning.multiline(data) + '\n');

            console.log(
                chalk.red(
                    `Test completion rate: ${succesfulTests}/${testCount} (${Math.round((succesfulTests / testCount) * 100)}%)`
                )
            );
            process.exit(0);
        });
    }
}

async function loadFileTypes() {
    const filetypes = readFileSync('config/filetypes.json', 'utf8');
    const filetypesFile = JSON.parse(filetypes);
    filetypesArray = filetypesFile.filetypes;
}

async function loadWorkingFiles() {
    readdir('files/', (err, files) => {
        files.forEach(file => {
            workingFilesArray.push(file);
        });
    });
}


console.clear();

await welcome();

// load config files
await loadFileTypes();

await loadWorkingFiles();

await askForFileType();
await askForFilePath();
await readContentFile();

// file validations
await readValidations();
await executeValidations();

await fileCheck();
