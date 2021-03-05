import { resolve as resolvePath } from "path";
import { readdirSync } from "fs";
import { QuestionTree, AnswerMap } from "./types";
import chalk from "chalk";

const _outputDirQuestion: QuestionTree = {
    name: "outputPath",
    prompt: "Where should we create the config files for this network? Please\n" +
 "choose either an empty directory, or a path to a new directory that does\n" +
    "not yet exist. Default: ./quorum-test-network",
    transformerValidator: (rawInput: string, answers: AnswerMap) => {
        // TODO: add some more checks to make sure that the path is valid
        if (rawInput) {
            answers.outputPath = rawInput;
        } else {
            answers.outputPath = "./quorum-test-network";
        }

        try {
            const files = readdirSync(resolvePath(answers.outputPath));
            if (files.length > 0) {
                console.log(chalk.red(
                    `Whoops! It appears that the directory that you've chosen, ${answers.outputPath as string}\n` +
                    `already contains some files. Please clear the directory before continuing, or choose\n` +
                    `a different one.\n`
                ));
                return _outputDirQuestion;
            }
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (err.code as string === "ENOENT") {
                return undefined;
            } else {
                console.log(chalk.red(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    `Whoops! There was an error when checking your output directory (${err.code as string}). Please\n` +
                    `choose a different one before proceeding.\n`
                ));
                return _outputDirQuestion;
            }
        }

        // this is a no-op, but it makes the TS compiler happy :-/
        return undefined;
    }
};

const _elkQuestion: QuestionTree = {
    name: "elk",
    prompt: "Do you wish to enable support for logging with ELK (Elasticsearch, Logstash & Kibana)? [y/N]",
};
// have to add this below the definition because of the self reference..
_elkQuestion.transformerValidator = _getYesNoValidator(_elkQuestion, _outputDirQuestion, "n");

const _privacyQuestion: QuestionTree = {
    name: "privacy",
    prompt: "Do you wish to enable support for private transactions? [Y/n]",
};
// have to add this below the definition because of the self reference..
_privacyQuestion.transformerValidator = _getYesNoValidator(_privacyQuestion, _elkQuestion, "y");


const _orchestrateQuestion: QuestionTree = {
    name: "orchestrate",
    prompt: "Do you want to try out Codefi Orchestrate? Note: choosing yes will direct you to a login/registration page. [Y/n]",

    transformerValidator: (rawInput: string, answers: AnswerMap) => {
        const normalizedInput = rawInput.toLowerCase();

        if (!normalizedInput) {
            answers.orchestrate = true;
            return _outputDirQuestion;
        } else if (normalizedInput === "y" || normalizedInput === "n") {
            answers.orchestrate = normalizedInput === "y";
            if (answers.orchestrate) {
                return _outputDirQuestion;
            } else {
                return _privacyQuestion;
            }
        } else {
            console.log(chalk.red("Sorry, but I didn't understand your answer. Please select Y or N,\n" +
                "or just hit enter if you want the default.\n"));
            return _orchestrateQuestion;
        }
    }
};

const _nodePermissionsQuestion: QuestionTree = {
    name: "enable_node_permissions",
    prompt: "Do you wish to use file based node level permissions ? [Y/n], Default: [Y]",
};
// have to add this below the definition because of the self reference..
_nodePermissionsQuestion.transformerValidator = _getYesNoValidator(_nodePermissionsQuestion, _orchestrateQuestion, "y");

const _p2pDiscoveryQuestion: QuestionTree = {
    name: "enable_p2p_discovery",
    prompt: "Do you wish to use p2p discovery ? [Y/n], Default: [Y]",
};
// have to add this below the definition because of the self reference..
_p2pDiscoveryQuestion.transformerValidator = _getYesNoValidator(_p2pDiscoveryQuestion, _nodePermissionsQuestion, "y");

const _bootNodeQuestion: QuestionTree = {
    name: "enable_boot_nodes",
    prompt: "Do you wish to use boot nodes ? [Y/n], Default: [Y]",
};
// have to add this below the definition because of the self reference..
_bootNodeQuestion.transformerValidator = _getYesNoValidator(_bootNodeQuestion, _orchestrateQuestion, "y", _p2pDiscoveryQuestion);

const _staticNodeQuestion: QuestionTree = {
    name: "enable_static_nodes",
    prompt: "Do you wish to use static nodes ? [Y/n], Default: [n]",
};
// have to add this below the definition because of the self reference..
_staticNodeQuestion.transformerValidator = _getYesNoValidator(_staticNodeQuestion, _bootNodeQuestion, "n", _orchestrateQuestion);

const bannerText = String.raw`
              ___
             / _ \   _   _    ___    _ __   _   _   _ __ ___
            | | | | | | | |  / _ \  | '__| | | | | | '_ ' _ \
            | |_| | | |_| | | (_) | | |    | |_| | | | | | | |
             \__\_\  \__,_|  \___/  |_|     \__,_| |_| |_| |_|
     
        ____                          _
       |  _ \    ___  __   __   ___  | |   ___    _ __     ___   _ __
       | | | |  / _ \ \ \ / /  / _ \ | |  / _ \  | '_ \   / _ \ | '__|
       | |_| | |  __/  \ V /  |  __/ | | | (_) | | |_) | |  __/ | |
       |____/   \___|   \_/    \___| |_|  \___/  | .__/   \___| |_|
                                                 |_|
       ___            _          _            _                    _
      / _ \   _   _  (_)   ___  | | __  ___  | |_    __ _   _ __  | |_
     | | | | | | | | | |  / __| | |/ / / __| | __|  / _' | | '__| | __|
     | |_| | | |_| | | | | (__  |   <  \__ \ | |_  | (_| | | |    | |_ 
      \__\_\  \__,_| |_|  \___| |_|\_\ |___/  \__|  \__,_| |_|     \__|
`;

const leadInText = `
\nWelcome to the Quorum Developer Quickstart utility. This tool can be used
to rapidly generate local Quorum blockchain networks for development purposes
using tools like GoQuorum, Besu, and Codefi Orchestrate.

To get started, be sure that you have both Docker and Docker Compose
installed, then answer the following questions.\n\n`;

export const rootQuestion: QuestionTree = {
    name: "clientType",
    prompt: `${bannerText}${leadInText}Which Ethereum client would you like to run? Default: [1]`,
    options: [
        // TODO: fix these to the correct names
        { label: "Hyperledger Besu", value: "besu", nextQuestion: _staticNodeQuestion, default: true },
        { label: "GoQuorum", value: "gquorum", nextQuestion: _orchestrateQuestion }
    ]
};

function _getYesNoValidator(question: QuestionTree, yesQuestion?: QuestionTree, defaultResponse?: "y" | "n", noQuestion?: QuestionTree) {
    return (rawInput: string, answers: AnswerMap) => {
        const normalizedInput = rawInput.toLowerCase();

        if (defaultResponse && !normalizedInput) {
            answers[question.name] = defaultResponse === "y";
        } else if (normalizedInput === "y" || normalizedInput === "n") {
            answers[question.name] = normalizedInput === "y";
        } else {
            console.log(chalk.red("Sorry, but I didn't understand your answer. Please select Y or N,\n" +
                "or just hit enter if you want the default.\n"));
            return question;
        }
        return answers[question.name] ? yesQuestion : undefined == noQuestion ? yesQuestion : noQuestion;
    };
}
