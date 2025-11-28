import {colorize} from "colorize-node";

class ParserLog {
    /**
     * Output a success string
     * [✓] {message}
     */
    static success(message: string) {
        console.log(`[${colorize.yellow('✓')}] ${colorize.green(message)}`);
    }

    /**
     * Output an ignored string
     * [-] {message}
     */
    static ignored(message: string) {
        console.log(`[${colorize.gray('-')}] ${colorize.yellow(message)}`);
    }

    /**
     * Output a success string after generation an enum
     * [✓] {enumName} has been generated
     */
    static successGeneration(enumName: string) {
        ParserLog.success(`${enumName} has been generated`);
    }

    /**
     * Оutput that the generation ignored
     * [-] Generation of {subject} was ignored
     */
    static ignoreGeneration(subject: string) {
        ParserLog.ignored(`Generation of ${subject} was ignored`);
    }
}

export {ParserLog};
