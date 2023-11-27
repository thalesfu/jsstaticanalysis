import crypto from "crypto";

function sha512Base64Encode(text: string): string {
    const hash = crypto.createHash('sha512');
    hash.update(text);
    return hash.digest('base64');
}