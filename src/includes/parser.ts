import {Readable} from "stream";
import {EOL} from "os";
import {ParseInfo, ParseResult} from "../types";
import {readFile} from "fs/promises";
import {ParserIO} from "./parserIO";
import {ParserContent} from "./parserContent";
import {ParserLog} from "./parserLog";

class Parser {
    static fs = ParserIO;
    static content = ParserContent;
    static log = ParserLog;

    // Default regular expressions
    // Index of result start of index = 1
    static REG_EXP_NAME = /^\s*?([A-Z0-9_]+)[;,]?$/;                                        // NAME -> [1: NAME]
    static REG_EXP_NAME_VALUE = /([A-Z0-9_]+)\s*\([^)]*\)/;                                 // NAME(VALUE, ...) -> [1: NAME, 2: VALUE]
    static REG_EXP_NAME_COMMENT = /([A-Z0-9_]+)\s*\((['"])(.*?)(?<!\\)\2/;                  // NAME("COMMENT", ...) -> [1: NAME, ..., 3: COMMENT]
    static REG_EXP_NAME_VALUE_COMMENT = /([A-Z0-9_]+)\s*\((.+),\s*(['"])(.*?)(?<!\\)\3/;    // NAME(VALUE, "COMMENT", ...) -> [1: NAME, 2: VALUE, ..., 4: COMMENT]
    static REG_EXP_NAME_COMMENT_VALUE = /([A-Z0-9_]+)\s*\((['"])(.*?)(?<!\\)\2,\s*(.+)/;    // NAME("COMMENT", VALUE, ...) -> [1: NAME, 2: COMMENT, ..., 4: VALUE]

    /**
     * Parse files specified by the parseInfos
     * @param parseInfos config of parsing files
     * @param destPath destination path
     * @param getEnumsFunc custom function for parse enum from the file
     */
    static async parseEnums(
        parseInfos: ParseInfo[],
        destPath: string,
        getEnumsFunc?: typeof Parser.getEnums,
    ) {
        for (const info of parseInfos) {
            const foundFilePath = await Parser.fs.findFilePath(info.srcFileName, info.srcDirectory);
            if (!foundFilePath) {
                throw new Error(`File ${info.srcFileName} is not found`);
            }
            const parsedFileContent: string = (await readFile(foundFilePath)).toString();

            // Парсится java файл и генерируется стринг с enum'ом
            const valueEnum: string = await (getEnumsFunc ?? Parser.getEnums)(
                parsedFileContent,
                info.parseFunc
            );

            const fileContent: string = Parser.content.createFileContent(
                info.enumName,
                valueEnum,
                Parser.content.createCommentContent(info.comment),
                ''
            );

            await Parser.fs.writeFile(info.enumName, destPath, fileContent);
            Parser.log.successGeneration(info.enumName);
        }
    }

    /**
     * Parse files with descriptions of enums specified by the parseInfos
     * @param parseInfos config of parsing files
     * @param destPath destination path
     * @param getEnumsFunc custom function for parse enum from the file
     */
    static async parseEnumsWithDescription(
        parseInfos: ParseInfo[],
        destPath: string,
        getEnumsFunc?: typeof Parser.getEnumsWithDescription,
    ) {
        for (const info of parseInfos) {
            const foundFilePath = await Parser.fs.findFilePath(info.srcFileName, info.srcDirectory);
            if (!foundFilePath) {
                throw new Error(`File ${info.srcFileName} is not found`);
            }
            const parsedFileContent: string = (await readFile(foundFilePath)).toString();

            // Парсится java файл и генерируется стринг с enum'ом
            const enums: [string, string] = await (getEnumsFunc ?? Parser.getEnumsWithDescription)(
                parsedFileContent,
                info.parseFunc
            );
            const valueEnum: string = enums[0];
            const descriptionEnum: string = enums[1];

            const fileContent: string = Parser.content.createFileContent(
                info.enumName,
                valueEnum,
                Parser.content.createCommentContent(info.comment),
                Parser.content.createDescriptionContent(info.descriptionEnumName, descriptionEnum)
            );

            await Parser.fs.writeFile(info.enumName, destPath, fileContent);
            Parser.log.successGeneration(info.enumName);
        }
    }

    /**
     * Parse NAME -> [1: NAME]
     */
    static parseName(line: string): ParseResult | null {
        const regArr: RegExpMatchArray = line.match(Parser.REG_EXP_NAME);
        return !regArr ? null : {
            name: regArr[1],
            value: regArr[1],
        };
    }

    /**
     * Parse NAME(VALUE) -> [1: NAME, 2: VALUE]
     */
    static parseNameValue(line: string): ParseResult | null {
        const regArr: RegExpMatchArray = line.match(Parser.REG_EXP_NAME_VALUE);
        return !regArr ? null : {
            name: regArr[1],
            value: regArr[1],
        };
    }

    /**
     * Parse NAME("COMMENT") -> [1: NAME, ..., 3: COMMENT]
     */
    static parseNameComment(line: string): ParseResult | null {
        const regArr: RegExpMatchArray = line.match(Parser.REG_EXP_NAME_COMMENT);
        return !regArr ? null : {
            name: regArr[1],
            value: regArr[1],
            comment: regArr[3],
        };
    }

    /**
     * Parse NAME(VALUE, "COMMENT") -> [1: NAME, 2: VALUE, ..., 4: COMMENT]
     */
    static parseNameValueComment(line: string): ParseResult | null {
        const regArr: RegExpMatchArray = line.match(Parser.REG_EXP_NAME_VALUE_COMMENT);
        return !regArr ? null : {
            name: regArr[1],
            value: regArr[1],
            ...(regArr[4] && {comment: regArr[4]})
        };
    }

    /**
     * Parse NAME("COMMENT", VALUE, ...) -> [1: NAME, 2: COMMENT, ..., 4: VALUE]
     */
    static parseNameCommentValue(line: string): ParseResult | null {
        const regArr: RegExpMatchArray = line.match(Parser.REG_EXP_NAME_COMMENT_VALUE);
        return !regArr ? null : {
            name: regArr[1],
            value: regArr[1],
            ...(regArr[3] && {comment: regArr[3]})
        };
    }

    /**
     * Generate index.ts
     */
    static async generateIndex(
        parseInfos: ParseInfo[],
        extraEnums: string[],
        destPath: string,
    ) {
        let fileContent: string = `
/**
 * IMPORTANT NOTE!
 * This file is generated automatically
 * Any changes will be overwritten
 */
`;
        for (const info of parseInfos) {
            fileContent += `export * from './${info.enumName}';${EOL}`;
        }
        extraEnums.forEach(enumName => fileContent += `export * from './${enumName}';${EOL}`);

        await Parser.fs.writeFile('index', destPath, fileContent);
        Parser.log.successGeneration('[index.ts]');
    }

    /**
     * Split file content into lines, regardless of the OS they were saved in
     */
    static splitByEOL(content: string, ignoreEmptyLines: boolean = true): string[] {
        const arr: string[] = (content || '').split(/\r\n|\r|\n/);
        return ignoreEmptyLines
            ? arr.filter(line => line !== '')
            : arr;
    }

    /**
     * Extract enums from the file content
     */
    private static async getEnums(
        fileContent: string,
        parseFunc: ParseInfo['parseFunc']
    ): Promise<string> {
        return new Promise(resolve => {
            const readable: Readable = Readable.from(Parser.splitByEOL(fileContent));

            const lines: Array<string[]> = [];
            let hasComments: boolean = false;
            readable.on('data', (line: string) => {
                const res: ParseResult = parseFunc(line);
                if (res) {
                    lines.push([`    ${res.name} = '${res.value}',`, res.comment]);
                    if (res.comment) {
                        hasComments = true;
                    }
                }
            });

            readable.on('close', async () => {
                if (hasComments) {
                    // Align the comment
                    let maxLen: number = Math.max(...lines.map((v: string[]) => v[0].length));
                    maxLen = Math.ceil(maxLen / 4 + 1) * 4;     // +1 to extra spaces
                    const spacesStr: string = ' '.repeat(maxLen);
                    resolve(
                        lines.map((v: string[]) => (v[0] + spacesStr).slice(0, maxLen) + (v[1] ? `// ${v[1]}` : '')).join(EOL)
                    );
                } else {
                    resolve(
                        lines.map((v: string[]) => v[0]).join(EOL)
                    );
                }
            });
        });
    }

    /**
     * Extract enums with descriptions from the file content
     */
    private static async getEnumsWithDescription(
        fileContent: string,
        parseFunc: ParseInfo['parseFunc']
    ): Promise<[string, string]> {
        return new Promise(resolve => {
            const readable: Readable = Readable.from(Parser.splitByEOL(fileContent));

            const lines: [string, string][] = [];
            const descriptionLines: string[] = [];
            readable.on('data', (line: string) => {
                const res: ParseResult = parseFunc(line);
                if (res) {
                    lines.push([`    ${res.value} = '${res.value}',`, res.comment]);
                    descriptionLines.push(`    ${res.value} = '${res.comment}',`);
                }
            });

            readable.on('close', async () => {
                // Находим максимальную длину строки, чтобы выровнять комментарии
                let maxLen: number = Math.max(...lines.map((v: [string, string]) => v[0].length));
                maxLen = Math.ceil(maxLen / 4 + 1) * 4;     // +1 to extra spaces
                const spacesStr: string = ' '.repeat(maxLen);
                resolve([
                    // Выравниваем комментарии
                    lines.map((v: [string, string]) => `${(v[0] + spacesStr).slice(0, maxLen)}// ${v[1]}`).join(EOL),
                    descriptionLines.join(EOL)
                ]);
            });
        });
    }
}

export {Parser};
