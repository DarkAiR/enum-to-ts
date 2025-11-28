# enum-to-ts

> This project was written to simplify the synchronization of enumerations within a single repository with code in different programming languages.

## Installation

```sh
npm install --save-dev @darkair/enum-to-ts
```

## Usage

The examples below are for a case where the backend is written in Java, and the TypeScript frontend needs to maintain synchronicity of the values used.

### Simple example

```ts
import {ParseInfo, Parser} from "@darkair/enum-to-ts";

// Regular expression to parse Java enums like
// ID_ASC(Sort.by(Sort.Direction.ASC, "id")),
const regExp: RegExp = /^\s*(\w+)\(\s*Sort\.by\(\s*Sort\.Direction\.(ASC|DESC),\s*/;

const parseInfos: ParseInfo[] = [
    {
        parseFileName: 'FirstSort.java',        // Java file name
        enumName: 'Sort1Enum',                  // TS file name (without extension)
        regExp,                                 // RegExp to parse Java file
    },
    {
        parseFileName: 'SecondSort.java',
        enumName: 'Sort2Enum',
        regExp,
    }
];

async function generateEnum(): Promise<boolean> {
    try {
        // Parse of enums by config
        await Parser.parseEnums(
            parseInfos,
            "../src/main/java/path/to/head/directory",  // relative path to start folder to recursive find of the source file
            `${__dirname}/../../src/enums/sort`,        // relative path to destination folder
        );

        // Generate an index file if necessary
        await Parser.generateIndex(
            parseInfos,
            [
                'NotGeneratedSortEnum'                  // Array of extra enums not generated automatically
            ],
            `${__dirname}/../../src/enums/sort`,        // relative path to destination folder
        );
    } catch (err: Error) {
        // error handling
        return false;
    }
    return true;
}
```

### Extended example

```ts
// Regular expression to parse Java enums like
// VALUE("description", ...) => [VALUE, ("description", ...)] 
const regExp: RegExp = /([A-Z0-9_]+)\((['"])(.*?)\2,/;

const parseInfos: ParseInfo[] = [
    {
        parseFileName: 'SomeEnum.java',         // Java file name
        enumName: 'SomeEnum',                   // TS file name (without extension)
        comment: 'This is some enums',          // Comment to put before TS enum
        regExp,                                 // RegExp to parse Java file
    }
];

async function generateEnum(): Promise<boolean> {
    try {
        await Parser.parseEnums(
            parseInfos,
            "../src/main/java/path/to/head/directory",  // relative path to start folder to recursive find of the source file
            `${__dirname}/../../src/enums`,             // relative path to destination folder
            getEnums                                    // custom function to parse enum
        );
    } catch (err: Error) {
        // error handling
        return false;
    }
    return true;
}

/**
 * This custom function is generate enum with aligned comment for every values
 * Comments are parsed from the Java file by the main regular expression
 */
async function getEnums(fileContent: string, regExp: RegExp): Promise<string> {
    return new Promise(resolve => {
        const readable: Readable = Readable.from(Parser.fs.splitByEOL(fileContent));

        const lines: Array<string[]> = [];
        readable.on('data', (line: string) => {
            if (regExp.test(line)) {
                const regArr: RegExpExecArray = regExp.exec(line);
                lines.push([`    ${regArr[1]} = '${regArr[1]}',`, regArr[3]]);      // regArr[3] - is a comment
            }
        });

        readable.on('close', async () => {
            // Находим максимальную длину строки, чтобы выровнять комментарии
            const maxLen: number = Math.max(...lines.map((v: string[]) => v[0].length));
            const spacesStr: string = ' '.repeat(maxLen);
            resolve(
                // Aligning comments
                lines.map(
                    (v: string[]) => `${(v[0] + spacesStr).slice(0, maxLen)} // ${v[1]}`
                ).join(EOL),
            );
        });
    });
}
```

## Documentation

### interface ParseInfo

```ts
export interface ParseInfo {
    parseFileName: string;                              // File to parsing
    regExp: RegExp;                                     // Main regular expression
    comment?: string;                                   // Comment to enum (optional)
    enumName: string;                                   // Name of the main enum for the frontend
    descriptionEnumName?: string;                       // Name of the description class for the frontend (optional)
    parseDescriptionFunc?: (src: string) => string[];   // Function for custom parsing if it needs (optional)
}
```


### Parser.parseEnums

Parse files specified by the parseInfos.

```ts
static async parseEnums(
    parseInfos: ParseInfo[],
    srcPath: string,
    destPath: string,
    getEnumsFunc?: typeof Parser.getEnums
);
```
#### Options
| Parameter | Description                                                                                  |
|-------|----------------------------------------------------------------------------------------------|
|parseInfos| config array of parsing files                                                                |
|srcPath| relative path to start folder to recursive find of the source file                           |
|destPath| relative path to destination folder                                                          |
|getEnumsFunc| custom function for parse enum from the file<br/>`async getEnums(parsedFileContent, regExp)` |


### Parser.parseEnumsWithDescription

Parse files with descriptions of enums specified by the parseInfos.

```ts
static async parseEnumsWithDescription(
    parseInfos: ParseInfo[],
    srcPath: string,
    destPath: string,
    getEnumsFunc?: typeof Parser.getEnumsWithDescription,
);
```
#### Options
| Parameter | Description                                                                                  |
|-------|----------------------------------------------------------------------------------------------|
|parseInfos| config array of parsing files                                                                |
|srcPath| relative path to start folder to recursive find of the source file                           |
|destPath| relative path to destination folder                                                          |
|getEnumsFunc| custom function for parse enum from the file<br/>`async getEnums(parsedFileContent, regExp)` |


### Parser.generateIndex

Generate index.ts.

```ts
static async generateIndex(
    parseInfos: ParseInfo[],
    extraEnums: string[],
    destPath: string,
);
```
#### Options
| Parameter | Description                                                                                  |
|-------|----------------------------------------------------------------------------------------------|
|parseInfos| config array of parsing files                                                                |
|extraEnums| enumerations that are not generated but exist in the same folder                             |
|destPath| relative path to destination folder                                                          |

### Parser.splitByEOL

Split file content into lines, regardless of the OS they were saved in

```ts
static splitByEOL(
    content: string,
    ignoreEmptyLines: boolean = true
): string[];
```

### Parser.content.createFileContent

Generate general file content

```ts
static createFileContent(
    enumName: string,
    enumContent: string,
    commentContent: string,
    descriptionContent: string
): string;
```

#### Options
| Parameter | Description                                                                                        |
|-------|----------------------------------------------------------------------------------------------------|
|enumName| enum name                                                                                          |
|enumContent| string with concatenated enum content like<br/>```VALUE1 = "VALUE1",```<br/>```VALUE2 = "VALUE2``` |
|commentContent| correct multiline comment content like<br/>```/* comment */```                                     |
|descriptionContent| full content of description enum<br/>```enum DescEnum { ... }```                                      |

### Parser.content.createCommentContent

Generate comment content

```ts
static createCommentContent(
    comment: string
): string;
```

### Parser.content.createDescriptionContent

Generate description content

```ts
static createDescriptionContent(
    descriptionName: string,
    content: string
): string;
```

### Parser.fs.findFilePath

Recursively find the path to a file in a specified directory

```ts
static async findFilePath(
    parseFileName: string,      // MyEnum.java
    srcPath: string             // relative path to source file
): Promise<string | null>;
```

### Parser.fs.findFilePath

Write file

```ts
static async writeFile(
    enunName: string,           // MyEnum
    destDir: string,            // `${__dirname}/../../src/enums`
    fileContent: string
): void;
```

### Parser.log.success

Output a success string.
Format: [✓] {message}

```ts
static success(
    message: string
);
```

### Parser.log.ignored

Output an ignored string.
Format: [-] {message}

```ts
static ignored(
    message: string
);
```

### Parser.log.successGeneration

Output a success string after generation an enum.
Format: [✓] {enumName} has been generated

```ts
static successGeneration(
    enumName: string
);
```

### Parser.log.ignoreGeneration

Оutput that the generation ignored.
Format: [-] Generation of {subject} was ignored

```ts
static ignoreGeneration(
    subject: string
);
```

## Example of custom generation

A complete example of custom parsing and enumeration generation

```ts
for (const info: ParseInfo of parseInfos) {
    const foundFilePath = await Parser.fs.findFilePath(info.parseFileName, "../src/main/java/ru/my/path");
    if (!foundFilePath) {
        throw new Error(`File ${info.parseFileName} is not found`);
    }
    const parsedFileContent: string = (await readFile(foundFilePath)).toString();

    const enums: [string, string] = await getMyEnums(
        parsedFileContent,
        info.regExp
    );
    const enumContent: string = enums[0];               // 'VALUE1 = "VALUE1",\nVALUE2 = "VALUE2",'
    const descriptionEnumContent: string = enums[1];    // 'DESC1 = "desc 1",\nDESC2 = "desc 2",'


    const fileContent: string = Parser.content.createFileContent(
        info.enumName,
        enumContent,
        Parser.content.createCommentContent(info.comment),
        Parser.content.createDescriptionContent(info.descriptionEnumName, descriptionEnumContent)
    );

    await Parser.fs.writeFile(info.enumName, `${__dirname}/../../src/enums`, fileContent);
    Parser.log.successGeneration(info.enumName);
}
```

#### Output
```ts
/**
 * comment
 */

enum MyEnum {
    VALUE1 = "VALUE1",
    VALUE2 = "VALUE2",
}

enum DescEnum {
    DESC1 = "desc 1",
    DESC2 = "desc 2",
}
```
