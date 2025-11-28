class ParserContent {
    /**
     * Generate general file content
     */
    static createFileContent(enumName: string, enumContent: string, commentContent: string, descriptionContent: string): string {
        return `
/**
 * IMPORTANT NOTE!
 * This file is generated automatically
 * Any changes will be overwritten
 */
 
${commentContent}

export enum ${enumName} {
${enumContent}
}

${descriptionContent}
`;
    }

    /**
     * Generate comment content
     */
    static createCommentContent(comment: string): string {
        return !comment
            ? ''
            : `
/**
 * ${comment}
 */`;
    }

    /**
     * Generate description content
     */
    static createDescriptionContent(descriptionName: string, content: string): string {
        return !descriptionName
            ? ''
            : `
export enum ${descriptionName} {
${content}
}`;
    }
}

export {ParserContent};
